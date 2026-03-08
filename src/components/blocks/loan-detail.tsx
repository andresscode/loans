import { CalendarIcon, Loader2Icon, PlusIcon, TrashIcon } from 'lucide-react'
import { useCallback, useEffect, useReducer, useState } from 'react'
import { es } from 'react-day-picker/locale'
import { z } from 'zod/v4'
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
import { Calendar } from '@/components/ui/calendar'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { loansService } from '@/services/loans'
import type { LoanWithBorrower, Payment } from '@/types'

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

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'decimal',
  maximumFractionDigits: 0,
})

function formatCOP(value: number | null): string {
  if (value === null || value === 0) return ''
  return copFormatter.format(value)
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const paymentSchema = z.object({
  amount: z
    .string()
    .refine((val) => val !== '' && !Number.isNaN(parseFloat(val)), {
      message: 'Ingresa el monto',
    })
    .transform((val) => parseFloat(val))
    .pipe(z.number().gt(0, 'El monto debe ser mayor a 0')),
  paymentDate: z.string().min(1, 'Selecciona una fecha'),
})

type PaymentFieldErrors = Partial<Record<'amount' | 'paymentDate', string>>

type LoanDetailProps = {
  loan: LoanWithBorrower
  onPaymentChange?: () => void
}

export function LoanDetail({ loan, onPaymentChange }: LoanDetailProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [refreshToken, refresh] = useReducer((x: number) => x + 1, 0)
  const [showForm, setShowForm] = useState(false)
  const [amountRaw, setAmountRaw] = useState<number | null>(null)
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined)
  const [errors, setErrors] = useState<PaymentFieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchPayments = useCallback(async () => {
    void refreshToken
    const result = await loansService.getPayments(loan.id)
    setPayments(result)
  }, [loan.id, refreshToken])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = {
      amount: amountRaw !== null ? String(amountRaw) : '',
      paymentDate: paymentDate ? paymentDate.toISOString().split('T')[0] : '',
    }

    const result = paymentSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: PaymentFieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof PaymentFieldErrors
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      setIsSubmitting(false)
      return
    }

    setErrors({})
    const createResult = await loansService.createPayment({
      loanId: loan.id,
      amount: result.data.amount,
      paymentDate: result.data.paymentDate,
    })

    if (createResult.success) {
      setAmountRaw(null)
      setPaymentDate(undefined)
      setShowForm(false)
      refresh()
      onPaymentChange?.()
    }
    setIsSubmitting(false)
  }

  async function handleDelete() {
    if (!deletingPayment) return
    setIsDeleting(true)
    const result = await loansService.deletePayment(deletingPayment.id)
    if (result.success) {
      refresh()
      onPaymentChange?.()
    }
    setIsDeleting(false)
    setDeletingPayment(null)
  }

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{loan.borrowerName}</DialogTitle>
      </DialogHeader>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Monto</p>
          <p className="font-medium text-sm">{formatCurrency(loan.amount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Tasa de interes</p>
          <p className="font-medium text-sm">{loan.interestRate}%</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Frecuencia</p>
          <p className="font-medium text-sm">
            {frequencyLabels[loan.paymentFrequency] ?? loan.paymentFrequency}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Fecha de inicio</p>
          <p className="font-medium text-sm">{formatDate(loan.startDate)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Fecha de vencimiento</p>
          <p className="font-medium text-sm">{formatDate(loan.dueDate)}</p>
        </div>
      </div>

      <Separator />

      {/* Payments section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Pagos</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
          >
            <PlusIcon />
            Nuevo pago
          </Button>
        </div>

        {/* Inline payment form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border bg-muted/30 p-3"
          >
            <FieldGroup>
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                <Field data-invalid={!!errors.amount}>
                  <FieldLabel htmlFor="payment-amount">Monto</FieldLabel>
                  <Input
                    id="payment-amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatCOP(amountRaw)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '')
                      setAmountRaw(digits ? parseInt(digits, 10) : null)
                    }}
                  />
                  {errors.amount && <FieldError>{errors.amount}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.paymentDate}>
                  <FieldLabel>Fecha</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !paymentDate && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="size-4" />
                        {paymentDate
                          ? dateFormatter.format(paymentDate)
                          : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={setPaymentDate}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.paymentDate && (
                    <FieldError>{errors.paymentDate}</FieldError>
                  )}
                </Field>

                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2Icon className="size-4 animate-spin" />
                  )}
                  Guardar
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}

        {/* Payments table or empty state */}
        {payments.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No hay pagos registrados
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="tabular-nums">
                      {formatDate(payment.paymentDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingPayment(payment)}
                      >
                        <TrashIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete payment confirmation */}
      <AlertDialog
        open={deletingPayment !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingPayment(null)
        }}
      >
        {deletingPayment && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar pago</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion no se puede deshacer. Se eliminará el pago por{' '}
                {formatCurrency(deletingPayment.amount)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </DialogContent>
  )
}
