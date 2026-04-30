import { CalendarIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { es } from 'react-day-picker/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { formatCOP } from '@/lib/loan-math'
import { cn, formatLocalDate, parseLocalDate } from '@/lib/utils'
import { loansService } from '@/services/loans'
import type { WeeklyCollectionRow } from '@/types'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function getWeekEnd(weekStart: Date): Date {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function clampToWeek(d: Date, weekStart: Date, weekEnd: Date): Date {
  if (d < weekStart) return weekStart
  if (d > weekEnd) return weekEnd
  return d
}

type Props = {
  row: WeeklyCollectionRow
  weekStart: Date
  onClose: () => void
  onSuccess: () => void
}

export function RegisterPaymentDialog({
  row,
  weekStart,
  onClose,
  onSuccess,
}: Props) {
  const weekEnd = getWeekEnd(weekStart)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const defaultDate = clampToWeek(today, weekStart, weekEnd)

  const isEdit = row.lastPaymentId !== null
  const initialAmount = isEdit
    ? String(Math.round(row.lastPaymentAmount ?? 0))
    : String(Math.round(row.cuota))
  const initialDate =
    isEdit && row.lastPaymentDate
      ? clampToWeek(parseLocalDate(row.lastPaymentDate), weekStart, weekEnd)
      : defaultDate

  const [amountRaw, setAmountRaw] = useState(initialAmount)
  const [date, setDate] = useState<Date>(initialDate)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldError(null)

    const amount = Number(amountRaw.replace(/[^\d]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) {
      setFieldError('Ingresa un monto mayor a cero')
      return
    }
    if (date < weekStart || date > weekEnd) {
      setFieldError('La fecha debe estar dentro de la semana seleccionada')
      return
    }

    setIsSubmitting(true)
    try {
      const result =
        isEdit && row.lastPaymentId !== null
          ? await loansService.updatePayment(row.lastPaymentId, {
              amount,
              paymentDate: formatLocalDate(date),
            })
          : await loansService.createPayment({
              loanId: row.id,
              amount,
              paymentDate: formatLocalDate(date),
            })
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error)
      }
    } catch {
      setError(
        isEdit
          ? 'Error inesperado al actualizar el pago'
          : 'Error inesperado al registrar el pago',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar pago' : 'Registrar pago'}</DialogTitle>
          <DialogDescription>
            {row.borrowerName} — Total a cobrar: {formatCOP(row.cuota)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!fieldError}>
              <FieldLabel htmlFor="amount">Monto</FieldLabel>
              <Input
                id="amount"
                inputMode="numeric"
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                placeholder="0"
              />
              <p className="text-muted-foreground text-xs">
                Cuota esperada: {formatCOP(row.cuota)}. Puedes registrar un
                monto distinto.
              </p>
            </Field>
            <Field>
              <FieldLabel>Fecha del pago</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal')}
                  >
                    <CalendarIcon className="size-4" />
                    {dateFormatter.format(date)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    locale={es}
                    disabled={{ before: weekStart, after: weekEnd }}
                    defaultMonth={weekStart}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-muted-foreground text-xs">
                Sólo se permite dentro de la semana seleccionada (
                {dateFormatter.format(weekStart)} —{' '}
                {dateFormatter.format(weekEnd)}).
              </p>
            </Field>
            {fieldError && <FieldError>{fieldError}</FieldError>}
          </FieldGroup>
          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm"
            >
              {error}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
              {isSubmitting
                ? 'Guardando...'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
