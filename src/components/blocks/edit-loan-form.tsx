import { CalendarIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { es } from 'react-day-picker/locale'
import { z } from 'zod/v4'
import { LoanCalculator } from '@/components/blocks/loan-calculator'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCOP } from '@/lib/loan-calculations'
import { cn } from '@/lib/utils'
import type {
  LoanWithBorrower,
  PaymentFrequency,
  UpdateLoanInput,
} from '@/types'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const editLoanSchema = z
  .object({
    amount: z
      .string()
      .refine((val) => val !== '' && !Number.isNaN(parseFloat(val)), {
        message: 'Ingresa el monto',
      })
      .transform((val) => parseFloat(val))
      .pipe(z.number().gt(0, 'El monto debe ser mayor a 0')),
    interestRate: z
      .string()
      .refine((val) => val !== '' && !Number.isNaN(parseFloat(val)), {
        message: 'Ingresa la tasa de interés',
      })
      .transform((val) => parseFloat(val))
      .pipe(z.number().gte(0, 'La tasa no puede ser negativa')),
    paymentFrequency: z.enum(['weekly', 'biweekly', 'monthly'], {
      error: 'Selecciona una frecuencia',
    }),
    startDate: z.string().min(1, 'Selecciona una fecha de inicio'),
    dueDate: z.string().min(1, 'Selecciona una fecha de vencimiento'),
  })
  .refine(
    (data) => {
      if (data.startDate && data.dueDate) {
        return new Date(data.dueDate) > new Date(data.startDate)
      }
      return true
    },
    {
      message:
        'La fecha de vencimiento debe ser posterior a la fecha de inicio',
      path: ['dueDate'],
    },
  )

type FieldErrors = Partial<
  Record<
    'amount' | 'interestRate' | 'paymentFrequency' | 'startDate' | 'dueDate',
    string
  >
>

type EditLoanFormProps = {
  loan: LoanWithBorrower
  isSubmitting: boolean
  error?: string | null
  onSubmit: (data: UpdateLoanInput) => void
}

export function EditLoanForm({
  loan,
  isSubmitting,
  error,
  onSubmit,
}: EditLoanFormProps) {
  const [amountRaw, setAmountRaw] = useState<number | null>(loan.amount)
  const [interestRateRaw, setInterestRateRaw] = useState(
    String(loan.interestRate),
  )
  const [paymentFrequency, setPaymentFrequency] = useState<string>(
    loan.paymentFrequency,
  )
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(`${loan.startDate}T00:00:00`),
  )
  const [dueDate, setDueDate] = useState<Date | undefined>(
    new Date(`${loan.dueDate}T00:00:00`),
  )
  const [errors, setErrors] = useState<FieldErrors>({})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = {
      amount: amountRaw !== null ? String(amountRaw) : '',
      interestRate: interestRateRaw,
      paymentFrequency: paymentFrequency || undefined,
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      dueDate: dueDate ? dueDate.toISOString().split('T')[0] : '',
    }

    const result = editLoanSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    const parsed = result.data
    onSubmit({
      amount: parsed.amount,
      interestRate: parsed.interestRate,
      paymentFrequency: parsed.paymentFrequency as PaymentFrequency,
      startDate: parsed.startDate,
      dueDate: parsed.dueDate,
    })
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Editar prestamo</DialogTitle>
        <DialogDescription>Prestamo de {loan.borrowerName}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!errors.amount}>
              <FieldLabel htmlFor="amount">Monto</FieldLabel>
              <Input
                id="amount"
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

            <Field data-invalid={!!errors.interestRate}>
              <FieldLabel htmlFor="interestRate">
                Tasa de interes (%)
              </FieldLabel>
              <Input
                id="interestRate"
                name="interestRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={interestRateRaw}
                onChange={(e) => setInterestRateRaw(e.target.value)}
              />
              {errors.interestRate && (
                <FieldError>{errors.interestRate}</FieldError>
              )}
            </Field>
          </div>

          <Field data-invalid={!!errors.paymentFrequency}>
            <FieldLabel>Frecuencia de pago</FieldLabel>
            <Select
              value={paymentFrequency}
              onValueChange={setPaymentFrequency}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar frecuencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quincenal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentFrequency && (
              <FieldError>{errors.paymentFrequency}</FieldError>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!errors.startDate}>
              <FieldLabel>Fecha de inicio</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="size-4" />
                    {startDate
                      ? dateFormatter.format(startDate)
                      : 'Seleccionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && <FieldError>{errors.startDate}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.dueDate}>
              <FieldLabel>Fecha de vencimiento</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="size-4" />
                    {dueDate ? dateFormatter.format(dueDate) : 'Seleccionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    defaultMonth={dueDate}
                    locale={es}
                    disabled={startDate ? { before: startDate } : undefined}
                  />
                </PopoverContent>
              </Popover>
              {errors.dueDate && <FieldError>{errors.dueDate}</FieldError>}
            </Field>
          </div>
        </FieldGroup>

        <LoanCalculator
          amount={amountRaw}
          interestRate={interestRateRaw}
          paymentFrequency={paymentFrequency}
          startDate={startDate}
          dueDate={dueDate}
        />

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm"
          >
            {error}
          </div>
        )}
        <DialogFooter className="mt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
