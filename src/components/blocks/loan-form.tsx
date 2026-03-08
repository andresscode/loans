import { CalendarIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { es } from 'react-day-picker/locale'
import { z } from 'zod/v4'
import {
  BorrowerCombobox,
  type BorrowerSelection,
} from '@/components/blocks/borrower-combobox'
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
import { cn } from '@/lib/utils'
import type { CreateLoanInput, PaymentFrequency } from '@/types'

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

const loanFormSchema = z
  .object({
    borrower: z
      .object({
        type: z.enum(['existing', 'new']),
        id: z.number().optional(),
        name: z.string().optional(),
      })
      .nullable()
      .refine((val) => val !== null, { message: 'Selecciona un prestatario' }),
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
    | 'borrower'
    | 'amount'
    | 'interestRate'
    | 'paymentFrequency'
    | 'startDate'
    | 'dueDate',
    string
  >
>

type LoanFormProps = {
  isSubmitting: boolean
  error?: string | null
  onSubmit: (data: CreateLoanInput) => void
}

export function LoanForm({ isSubmitting, error, onSubmit }: LoanFormProps) {
  const [borrower, setBorrower] = useState<BorrowerSelection | null>(null)
  const [amountRaw, setAmountRaw] = useState<number | null>(null)
  const [paymentFrequency, setPaymentFrequency] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [errors, setErrors] = useState<FieldErrors>({})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = {
      borrower,
      amount: amountRaw !== null ? String(amountRaw) : '',
      interestRate: (
        form.elements.namedItem('interestRate') as HTMLInputElement
      ).value,
      paymentFrequency: paymentFrequency || undefined,
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      dueDate: dueDate ? dueDate.toISOString().split('T')[0] : '',
    }

    const result = loanFormSchema.safeParse(formData)

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
    const parsedBorrower = parsed.borrower
    const borrowerInput: CreateLoanInput['borrower'] =
      parsedBorrower.type === 'existing'
        ? { type: 'existing', id: parsedBorrower.id as number }
        : { type: 'new', name: parsedBorrower.name as string }

    onSubmit({
      borrower: borrowerInput,
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
        <DialogTitle>Nuevo prestamo</DialogTitle>
        <DialogDescription>
          Completa los datos para registrar un nuevo prestamo.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field data-invalid={!!errors.borrower}>
            <FieldLabel>Prestatario</FieldLabel>
            <BorrowerCombobox value={borrower} onChange={setBorrower} />
            {errors.borrower && <FieldError>{errors.borrower}</FieldError>}
          </Field>

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
                    locale={es}
                    disabled={startDate ? { before: startDate } : undefined}
                  />
                </PopoverContent>
              </Popover>
              {errors.dueDate && <FieldError>{errors.dueDate}</FieldError>}
            </Field>
          </div>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
            {isSubmitting ? 'Creando...' : 'Crear prestamo'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
