import { Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod/v4'
import {
  BorrowerCombobox,
  type BorrowerSelection,
} from '@/components/blocks/borrower-combobox'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateLoanInput, PaymentFrequency } from '@/types'

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
      .transform((val) => parseFloat(val))
      .pipe(z.number().gt(0, 'El monto debe ser mayor a 0')),
    interestRate: z
      .string()
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
  onSubmit: (data: CreateLoanInput) => void
}

export function LoanForm({ isSubmitting, onSubmit }: LoanFormProps) {
  const [borrower, setBorrower] = useState<BorrowerSelection | null>(null)
  const [paymentFrequency, setPaymentFrequency] = useState<string>('')
  const [errors, setErrors] = useState<FieldErrors>({})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = {
      borrower,
      amount: (form.elements.namedItem('amount') as HTMLInputElement).value,
      interestRate: (
        form.elements.namedItem('interestRate') as HTMLInputElement
      ).value,
      paymentFrequency: paymentFrequency || undefined,
      startDate: (form.elements.namedItem('startDate') as HTMLInputElement)
        .value,
      dueDate: (form.elements.namedItem('dueDate') as HTMLInputElement).value,
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
                name="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
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
              <FieldLabel htmlFor="startDate">Fecha de inicio</FieldLabel>
              <Input id="startDate" name="startDate" type="date" />
              {errors.startDate && <FieldError>{errors.startDate}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.dueDate}>
              <FieldLabel htmlFor="dueDate">Fecha de vencimiento</FieldLabel>
              <Input id="dueDate" name="dueDate" type="date" />
              {errors.dueDate && <FieldError>{errors.dueDate}</FieldError>}
            </Field>
          </div>
        </FieldGroup>

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
