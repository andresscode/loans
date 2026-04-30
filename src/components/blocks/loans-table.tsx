import type { ColumnDef, SortingState, Updater } from '@tanstack/react-table'
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useReducer, useState } from 'react'
import {
  DataTable,
  DataTableColumnsMenu,
  useDataTable,
} from '@/components/blocks/data-table'
import { EditLoanForm } from '@/components/blocks/edit-loan-form'
import { LoanDetail } from '@/components/blocks/loan-detail'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import { Dialog } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatLocalDate, parseLocalDate } from '@/lib/utils'
import { loansService } from '@/services/loans'
import type {
  ActiveLoanRow,
  ActiveLoansSummary,
  LoanWithBorrower,
  OverdueLoanRow,
  PaidLoanRow,
  SortingParam,
  UpdateLoanInput,
  WeeklyCollectionRow,
} from '@/types'
import { ActiveLoansSummaryCards } from './active-loans-summary'
import { AmountCell } from './amount-cell'
import { BorrowerCell } from './borrower-cell'
import { ExpandableSearch } from './expandable-search'
import { RegisterPaymentDialog } from './register-payment-dialog'
import { WeeklyCollectionSummaryCards } from './weekly-collection-summary'
import {
  makeWeeklyCollectionColumns,
  useWeeklyCollectionData,
} from './weekly-collection-tab'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parseLocalDate(dateStr))
}

function toSortingParam(sorting: SortingState): SortingParam {
  if (sorting.length === 0) return null
  return { column: sorting[0].id, direction: sorting[0].desc ? 'desc' : 'asc' }
}

// --- Week helpers ---

function getCurrentWeekMonday(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d
}

function shiftWeek(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function formatShortDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

function formatWeekRangeShort(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  return `${formatShortDate(monday)} - ${formatShortDate(sunday)}`
}

function WeekNavigator({
  weekStart,
  onChange,
  showLabel,
}: {
  weekStart: Date
  onChange: (d: Date) => void
  showLabel: boolean
}) {
  const isCurrent =
    formatLocalDate(weekStart) === formatLocalDate(getCurrentWeekMonday())
  return (
    <ButtonGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onChange(getCurrentWeekMonday())}
            disabled={isCurrent}
            aria-label="Volver a la semana actual"
          >
            <CalendarDaysIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isCurrent ? 'Estás en la semana actual' : 'Volver a hoy'}
        </TooltipContent>
      </Tooltip>
      {showLabel && (
        <ButtonGroupText className="tabular-nums">
          {formatWeekRangeShort(weekStart)}
        </ButtonGroupText>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onChange(shiftWeek(weekStart, -1))}
            aria-label="Semana anterior"
          >
            <ChevronLeftIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Semana anterior</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onChange(shiftWeek(weekStart, 1))}
            aria-label="Semana siguiente"
          >
            <ChevronRightIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Semana siguiente</TooltipContent>
      </Tooltip>
    </ButtonGroup>
  )
}

// --- Column definitions ---

const activeColumns: ColumnDef<ActiveLoanRow, unknown>[] = [
  {
    accessorKey: 'borrowerName',
    header: 'Deudor',
    enableSorting: true,
    cell: ({ row }) => <BorrowerCell name={row.original.borrowerName} />,
  },
  {
    accessorKey: 'amount',
    header: 'Monto total',
    enableSorting: true,
    cell: ({ row }) => (
      <AmountCell
        headline={row.original.totalToRepay}
        details={[
          { label: 'Capital', value: row.original.amount, color: 'blue' },
          {
            label: 'Interés',
            value: row.original.totalToRepay - row.original.amount,
            color: 'green',
          },
        ]}
      />
    ),
  },
  {
    accessorKey: 'pending',
    header: 'Saldo pendiente',
    enableSorting: true,
    cell: ({ row }) => (
      <AmountCell
        headline={row.original.pending}
        progressValue={row.original.progress}
        progressText={`${Math.round(row.original.progress)}% pagado`}
      />
    ),
  },
]

const overdueColumns: ColumnDef<OverdueLoanRow, unknown>[] = [
  { accessorKey: 'borrowerName', header: 'Prestatario', enableSorting: true },
  {
    accessorKey: 'overdueCount',
    header: 'Cuotas vencidas',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-medium text-destructive tabular-nums">
        {row.original.overdueCount}
      </span>
    ),
  },
  {
    accessorKey: 'overdueTotal',
    header: 'Total vencido',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-medium text-destructive tabular-nums">
        {formatCurrency(row.original.overdueTotal)}
      </span>
    ),
  },
  {
    accessorKey: 'lastPaymentDate',
    header: 'Ultima fecha de pago',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.lastPaymentDate
          ? formatDate(row.original.lastPaymentDate)
          : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Monto del prestamo',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.amount)}
      </span>
    ),
  },
]

const paidColumns: ColumnDef<PaidLoanRow, unknown>[] = [
  { accessorKey: 'borrowerName', header: 'Prestatario', enableSorting: true },
  {
    accessorKey: 'amount',
    header: 'Capital',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.amount)}
      </span>
    ),
  },
  {
    accessorKey: 'totalInterest',
    header: 'Interes ganado',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.totalInterest)}
      </span>
    ),
  },
  {
    accessorKey: 'totalPaid',
    header: 'Total pagado',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatCurrency(row.original.totalPaid)}
      </span>
    ),
  },
  {
    accessorKey: 'startDate',
    header: 'Fecha de inicio',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="tabular-nums">{formatDate(row.original.startDate)}</span>
    ),
  },
  {
    accessorKey: 'closedDate',
    header: 'Fecha de cierre',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatDate(row.original.closedDate)}
      </span>
    ),
  },
]

// --- Actions column factory ---

function makeActionsColumn<T extends { id: number }>(options: {
  onView: (row: T) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
}): ColumnDef<T, unknown> {
  return {
    id: 'actions',
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => (
      <div
        role="toolbar"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => options.onView(row.original)}>
              <EyeIcon />
              Ver
            </DropdownMenuItem>
            {options.onEdit && (
              <DropdownMenuItem onSelect={() => options.onEdit?.(row.original)}>
                <PencilIcon />
                Editar
              </DropdownMenuItem>
            )}
            {options.onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => options.onDelete?.(row.original)}
                >
                  <TrashIcon />
                  Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  }
}

// --- Tab state hook ---

type TabState<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  sorting: SortingState
}

function useTabData<T>(
  fetcher: (params: {
    page: number
    pageSize: number
    sorting: SortingParam
    search?: string
  }) => Promise<{ data: T[]; total: number; page: number; pageSize: number }>,
  refreshToken: number,
) {
  const [state, setState] = useState<TabState<T> & { search: string }>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 10,
    sorting: [],
    search: '',
  })
  const [, forceRefresh] = useReducer((x: number) => x + 1, 0)

  const fetchData = useCallback(async () => {
    const result = await fetcher({
      page: state.page,
      pageSize: state.pageSize,
      sorting: toSortingParam(state.sorting),
      search: state.search || undefined,
    })
    setState((prev) => ({
      ...prev,
      data: result.data,
      total: result.total,
    }))
  }, [fetcher, state.page, state.pageSize, state.sorting, state.search])

  useEffect(() => {
    void refreshToken
    void forceRefresh
    fetchData()
  }, [fetchData, refreshToken])

  return {
    ...state,
    setPage: (page: number) => setState((prev) => ({ ...prev, page })),
    setPageSize: (pageSize: number) =>
      setState((prev) => ({ ...prev, pageSize, page: 1 })),
    setSorting: (updater: Updater<SortingState>) =>
      setState((prev) => ({
        ...prev,
        sorting:
          typeof updater === 'function' ? updater(prev.sorting) : updater,
      })),
    setSearch: (search: string) =>
      setState((prev) => ({ ...prev, search, page: 1 })),
    refresh: forceRefresh,
  }
}

// --- Main component ---

type LoansTableProps = {
  onEdit: (id: number, data: UpdateLoanInput) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
  onPaymentChange?: () => void
  refreshToken: number
  toolbarActions?: ReactNode
}

type TabKey = 'active' | 'due' | 'overdue' | 'paid'

export function LoansTable({
  onEdit,
  onDelete,
  onPaymentChange,
  refreshToken,
  toolbarActions,
}: LoansTableProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('active')
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<LoanWithBorrower | null>(
    null,
  )
  const [editingLoan, setEditingLoan] = useState<ActiveLoanRow | null>(null)
  const [deletingLoan, setDeletingLoan] = useState<ActiveLoanRow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const active = useTabData<ActiveLoanRow>(loansService.getActive, refreshToken)
  const [activeSummary, setActiveSummary] = useState<ActiveLoansSummary | null>(
    null,
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshToken is the trigger
  useEffect(() => {
    loansService
      .getActiveSummary()
      .then(setActiveSummary)
      .catch((err) => console.error('getActiveSummary failed', err))
  }, [refreshToken])
  const overdue = useTabData<OverdueLoanRow>(
    loansService.getOverdue,
    refreshToken,
  )
  const paid = useTabData<PaidLoanRow>(loansService.getPaid, refreshToken)

  // Lifted Por cobrar state
  const [weekStart, setWeekStart] = useState<Date>(() => getCurrentWeekMonday())
  const [dueSearch, setDueSearch] = useState('')
  const [duePage, setDuePage] = useState(1)
  const [duePageSize, setDuePageSize] = useState(10)
  const [dueSorting, setDueSorting] = useState<SortingState>([])
  const [paymentTarget, setPaymentTarget] =
    useState<WeeklyCollectionRow | null>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const due = useWeeklyCollectionData({
    weekStart,
    search: dueSearch,
    page: duePage,
    pageSize: duePageSize,
    sorting: dueSorting,
    refreshToken,
  })

  // When a row is clicked, build a LoanWithBorrower for the detail dialog
  function handleViewActive(row: ActiveLoanRow) {
    setSelectedLoan({
      id: row.id,
      borrowerId: row.borrowerId,
      amount: row.amount,
      interestRate: row.interestRate,
      paymentFrequency: row.paymentFrequency,
      startDate: row.startDate,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      borrowerName: row.borrowerName,
    })
  }

  function handleViewById(id: number, _borrowerName: string) {
    setSelectedLoanId(id)
    setSelectedLoan(null)
    loansService.getAll(1, 1000).then((result) => {
      const loan = result.data.find((l) => l.id === id)
      if (loan) {
        setSelectedLoan(loan)
      }
    })
  }

  async function handleEdit(data: UpdateLoanInput) {
    if (!editingLoan) return
    setIsSubmitting(true)
    setEditError(null)
    try {
      const success = await onEdit(editingLoan.id, data)
      if (success) {
        setEditingLoan(null)
      } else {
        setEditError('Error al actualizar el prestamo')
      }
    } catch {
      setEditError('Error inesperado al actualizar el prestamo')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingLoan) return
    setIsSubmitting(true)
    try {
      await onDelete(deletingLoan.id)
    } finally {
      setIsSubmitting(false)
      setDeletingLoan(null)
    }
  }

  const handlePaymentChange = useCallback(() => {
    onPaymentChange?.()
  }, [onPaymentChange])

  // Build columns with actions
  const activeColumnsWithActions = [
    ...activeColumns,
    makeActionsColumn<ActiveLoanRow>({
      onView: handleViewActive,
      onEdit: (row) => {
        setEditError(null)
        setEditingLoan(row)
      },
      onDelete: (row) => setDeletingLoan(row),
    }),
  ]

  const overdueColumnsWithActions = [
    ...overdueColumns,
    makeActionsColumn<OverdueLoanRow>({
      onView: (row) => handleViewById(row.id, row.borrowerName),
    }),
  ]

  const paidColumnsWithActions = [
    ...paidColumns,
    makeActionsColumn<PaidLoanRow>({
      onView: (row) => handleViewById(row.id, row.borrowerName),
    }),
  ]

  const activeTable = useDataTable({
    data: active.data,
    columns: activeColumnsWithActions,
    total: active.total,
    sorting: active.sorting,
    onSortingChange: active.setSorting,
  })
  const overdueTable = useDataTable({
    data: overdue.data,
    columns: overdueColumnsWithActions,
    total: overdue.total,
    sorting: overdue.sorting,
    onSortingChange: overdue.setSorting,
  })
  const paidTable = useDataTable({
    data: paid.data,
    columns: paidColumnsWithActions,
    total: paid.total,
    sorting: paid.sorting,
    onSortingChange: paid.setSorting,
  })
  const dueColumns = makeWeeklyCollectionColumns({
    onRegisterPayment: setPaymentTarget,
    onView: handleViewById,
  })
  const dueTable = useDataTable({
    data: due.rows,
    columns: dueColumns,
    total: due.total,
    sorting: dueSorting,
    onSortingChange: setDueSorting,
  })

  // biome-ignore lint/suspicious/noExplicitAny: ColumnsMenu only reads column metadata, so TData doesn't matter at this site.
  type AnyTable = ReturnType<typeof useDataTable<any>>
  const tablesByTab: Record<TabKey, AnyTable> = {
    active: activeTable,
    due: dueTable,
    overdue: overdueTable,
    paid: paidTable,
  }

  // Search wiring per tab
  const searchValueByTab: Record<TabKey, string> = {
    active: active.search,
    due: dueSearch,
    overdue: overdue.search,
    paid: paid.search,
  }
  const setSearchByTab: Record<TabKey, (v: string) => void> = {
    active: active.setSearch,
    due: (v) => {
      setDueSearch(v)
      setDuePage(1)
    },
    overdue: overdue.setSearch,
    paid: paid.setSearch,
  }

  const currentTable = tablesByTab[activeTab]

  return (
    <div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabKey)}
      >
        <div className="my-4 flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="active">
              Préstamos
              {active.total > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-primary text-xs tabular-nums">
                  {active.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="due">
              Por cobrar
              {due.total > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-primary text-xs tabular-nums">
                  {due.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Vencidos
              {overdue.total > 0 && (
                <span className="ml-1 rounded-full bg-destructive/10 px-1.5 text-destructive text-xs tabular-nums">
                  {overdue.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="paid">
              Pagados
              {paid.total > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-primary text-xs tabular-nums">
                  {paid.total}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {activeTab === 'due' && (
              <WeekNavigator
                weekStart={weekStart}
                onChange={setWeekStart}
                showLabel={!searchExpanded}
              />
            )}
            <ExpandableSearch
              value={searchValueByTab[activeTab]}
              onChange={setSearchByTab[activeTab]}
              placeholder="Buscar deudor..."
              onExpandedChange={setSearchExpanded}
            />
            <DataTableColumnsMenu table={currentTable} />
            {toolbarActions}
          </div>
        </div>

        <TabsContent value="active">
          <ActiveLoansSummaryCards summary={activeSummary} />
          <div className="mt-4">
            <DataTable
              table={activeTable}
              page={active.page}
              pageSize={active.pageSize}
              total={active.total}
              onPageChange={active.setPage}
              onPageSizeChange={active.setPageSize}
              onRowClick={handleViewActive}
            />
          </div>
        </TabsContent>

        <TabsContent value="due">
          <WeeklyCollectionSummaryCards summary={due.summary} />
          <div className="mt-4">
            <DataTable
              table={dueTable}
              page={duePage}
              pageSize={duePageSize}
              total={due.total}
              onPageChange={setDuePage}
              onPageSizeChange={(s) => {
                setDuePageSize(s)
                setDuePage(1)
              }}
              onRowClick={(row) => handleViewById(row.id, row.borrowerName)}
            />
          </div>
        </TabsContent>

        <TabsContent value="overdue">
          <DataTable
            table={overdueTable}
            page={overdue.page}
            pageSize={overdue.pageSize}
            total={overdue.total}
            onPageChange={overdue.setPage}
            onPageSizeChange={overdue.setPageSize}
            onRowClick={(row) => handleViewById(row.id, row.borrowerName)}
          />
        </TabsContent>

        <TabsContent value="paid">
          <DataTable
            table={paidTable}
            page={paid.page}
            pageSize={paid.pageSize}
            total={paid.total}
            onPageChange={paid.setPage}
            onPageSizeChange={paid.setPageSize}
            onRowClick={(row) => handleViewById(row.id, row.borrowerName)}
          />
        </TabsContent>
      </Tabs>

      {paymentTarget && (
        <RegisterPaymentDialog
          row={paymentTarget}
          weekStart={weekStart}
          onClose={() => setPaymentTarget(null)}
          onSuccess={() => {
            setPaymentTarget(null)
            handlePaymentChange()
          }}
        />
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editingLoan !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingLoan(null)
            setEditError(null)
          }
        }}
      >
        {editingLoan && (
          <EditLoanForm
            loan={editingLoan}
            isSubmitting={isSubmitting}
            error={editError}
            onSubmit={handleEdit}
          />
        )}
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={selectedLoan !== null || selectedLoanId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLoan(null)
            setSelectedLoanId(null)
          }
        }}
      >
        {selectedLoan && (
          <LoanDetail
            loan={selectedLoan}
            onPaymentChange={handlePaymentChange}
          />
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deletingLoan !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLoan(null)
        }}
      >
        {deletingLoan && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar prestamo</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion no se puede deshacer. Se eliminará el prestamo de{' '}
                {deletingLoan.borrowerName} por{' '}
                {formatCurrency(deletingLoan.amount)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isSubmitting}
                onClick={handleDelete}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  )
}
