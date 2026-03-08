import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { LoanWithBorrower } from '@/types'

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
}

export function LoansTable({
  loans,
  total,
  page,
  pageSize,
  onPageChange,
}: LoansTableProps) {
  const totalPages = Math.ceil(total / pageSize)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

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
    </div>
  )
}
