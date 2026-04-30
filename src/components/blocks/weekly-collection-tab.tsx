import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  ReceiptIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatLocalDate } from '@/lib/utils'
import { loansService } from '@/services/loans'
import type {
  SortingParam,
  WeeklyCollectionRow,
  WeeklyCollectionSummary,
  WeeklyStatus,
} from '@/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { AmountCell } from './amount-cell'
import { BorrowerCell } from './borrower-cell'
import type { DashboardCardIconColor } from './dashboard-card'

const statusVariant: Record<
  WeeklyStatus,
  { label: string; className: string }
> = {
  paid: {
    label: 'Pagado',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  partial: {
    label: 'Parcial',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  overpaid: {
    label: 'Pagado +',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  },
  pending: {
    label: 'Pendiente',
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  overdue: {
    label: 'Vencido',
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  },
}

function StatusCell({ row }: { row: WeeklyCollectionRow }) {
  const variant = statusVariant[row.status]
  return <Badge className={variant.className}>{variant.label}</Badge>
}

function toSortingParam(sorting: SortingState): SortingParam {
  if (sorting.length === 0) return null
  return { column: sorting[0].id, direction: sorting[0].desc ? 'desc' : 'asc' }
}

export function useWeeklyCollectionData({
  weekStart,
  search,
  page,
  pageSize,
  sorting,
  refreshToken,
}: {
  weekStart: Date
  search: string
  page: number
  pageSize: number
  sorting: SortingState
  refreshToken: number
}) {
  const [rows, setRows] = useState<WeeklyCollectionRow[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<WeeklyCollectionSummary | null>(null)

  const weekIso = formatLocalDate(weekStart)
  const sortingParam = toSortingParam(sorting)

  const fetchRows = useCallback(async () => {
    const list = await loansService.getWeeklyCollection({
      page,
      pageSize,
      sorting: sortingParam,
      search: search || undefined,
      weekStart: weekIso,
    })
    setRows(list.data)
    setTotal(list.total)
  }, [page, pageSize, search, weekIso, sortingParam])

  const fetchSummary = useCallback(async () => {
    const sum = await loansService.getWeeklySummary({ weekStart: weekIso })
    setSummary(sum)
  }, [weekIso])

  useEffect(() => {
    void refreshToken
    fetchRows().catch((err) =>
      console.error('weekly-collection rows fetch failed', err),
    )
  }, [fetchRows, refreshToken])

  useEffect(() => {
    void refreshToken
    fetchSummary().catch((err) =>
      console.error('weekly-collection summary fetch failed', err),
    )
  }, [fetchSummary, refreshToken])

  return { rows, total, summary }
}

const paidStatuses: WeeklyStatus[] = ['paid', 'partial', 'overpaid']

export function makeWeeklyCollectionColumns({
  onRegisterPayment,
  onView,
}: {
  onRegisterPayment: (row: WeeklyCollectionRow) => void
  onView: (id: number, borrowerName: string) => void
}): ColumnDef<WeeklyCollectionRow, unknown>[] {
  return [
    {
      accessorKey: 'borrowerName',
      header: 'Deudor',
      enableSorting: true,
      cell: ({ row }) => <BorrowerCell name={row.original.borrowerName} />,
    },
    {
      accessorKey: 'cuota',
      header: 'Total a cobrar',
      enableSorting: true,
      cell: ({ row }) => {
        const r = row.original
        const details: Array<{
          label: string
          value: number
          color: DashboardCardIconColor
        }> = [{ label: 'Cuota', value: r.scheduledCuota, color: 'blue' }]
        if (r.mora > 0) {
          details.push({ label: 'Mora', value: r.mora, color: 'red' })
        }
        if (r.aFavor > 0) {
          details.push({ label: 'A favor', value: -r.aFavor, color: 'green' })
        }
        return <AmountCell headline={r.cuota} details={details} />
      },
    },
    {
      accessorKey: 'paidThisWeek',
      header: 'Total pagado',
      enableSorting: true,
      cell: ({ row }) => {
        const r = row.original
        const pctRaw = r.cuota > 0 ? (r.paidThisWeek / r.cuota) * 100 : 0
        const isOver = pctRaw > 100
        return (
          <AmountCell
            headline={r.paidThisWeek}
            progressValue={Math.min(100, pctRaw)}
            progressTone={isOver ? 'over' : 'default'}
            progressText={`${Math.round(pctRaw)}% recaudado`}
          />
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      enableSorting: true,
      cell: ({ row }) => <StatusCell row={row.original} />,
    },
    {
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        const isPaid = paidStatuses.includes(r.status)
        return (
          <div
            role="toolbar"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {isPaid ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Acciones del pago"
                  >
                    <EllipsisVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => onView(r.id, r.borrowerName)}
                  >
                    <EyeIcon />
                    Ver
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onRegisterPayment(r)}>
                    <PencilIcon />
                    Editar pago
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Registrar pago"
                    onClick={() => onRegisterPayment(r)}
                  >
                    <ReceiptIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Registar pago</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      },
    },
  ]
}
