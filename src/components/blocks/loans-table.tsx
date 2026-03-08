import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react'
import { useState } from 'react'
import { EditLoanForm } from '@/components/blocks/edit-loan-form'
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
import { Dialog } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { LoanWithBorrower, UpdateLoanInput } from '@/types'

const frequencyLabels: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

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
  }).format(new Date(dateStr))
}

type LoansTableProps = {
  loans: LoanWithBorrower[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onEdit: (id: number, data: UpdateLoanInput) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

export function LoansTable({
  loans,
  total,
  page,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
}: LoansTableProps) {
  const totalPages = Math.ceil(total / pageSize)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const [editingLoan, setEditingLoan] = useState<LoanWithBorrower | null>(null)
  const [deletingLoan, setDeletingLoan] = useState<LoanWithBorrower | null>(
    null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">
          No hay prestamos registrados
        </p>
        <p className="mt-1 text-muted-foreground/60 text-xs">
          Crea tu primer prestamo para comenzar
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Prestatario</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Tasa de interes</TableHead>
              <TableHead>Frecuencia</TableHead>
              <TableHead>Fecha de inicio</TableHead>
              <TableHead>Fecha de vencimiento</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">
                  {loan.borrowerName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(loan.amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {loan.interestRate}%
                </TableCell>
                <TableCell>
                  {frequencyLabels[loan.paymentFrequency] ??
                    loan.paymentFrequency}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(loan.startDate)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(loan.dueDate)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <EllipsisVerticalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditError(null)
                          setEditingLoan(loan)
                        }}
                      >
                        <PencilIcon />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeletingLoan(loan)}
                      >
                        <TrashIcon />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs tabular-nums">
          Mostrando {from}–{to} de {total}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

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
