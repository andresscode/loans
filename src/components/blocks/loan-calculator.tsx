import { CalculatorIcon } from 'lucide-react'
import { useMemo } from 'react'
import { calculateLoan, copFormatter } from '@/lib/loan-math'

type LoanCalculatorProps = {
  amount: number | null
  interestRate: string
  paymentFrequency: string
  startDate: Date | undefined
  dueDate: Date | undefined
}

export function LoanCalculator({
  amount,
  interestRate,
  paymentFrequency,
  startDate,
  dueDate,
}: LoanCalculatorProps) {
  const result = useMemo(() => {
    if (!amount || amount <= 0) return null
    const rate = parseFloat(interestRate)
    if (Number.isNaN(rate)) return null
    if (
      paymentFrequency !== 'weekly' &&
      paymentFrequency !== 'biweekly' &&
      paymentFrequency !== 'monthly'
    )
      return null
    if (!startDate || !dueDate) return null

    return calculateLoan({
      amount,
      interestRate: rate,
      paymentFrequency,
      startDate,
      dueDate,
    })
  }, [amount, interestRate, paymentFrequency, startDate, dueDate])

  return (
    <div
      className={`mt-4 rounded-lg bg-muted/50 p-4 ring-1 ring-foreground/5 transition-opacity ${result ? 'opacity-100' : 'opacity-60'}`}
    >
      <div className="mb-3 flex items-center gap-2 text-muted-foreground text-sm">
        <CalculatorIcon className="size-4" />
        <span className="font-medium">Resumen del préstamo</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-muted-foreground text-xs">Cuotas</p>
          <p className="font-semibold text-lg">
            {result ? (
              result.numberOfPayments
            ) : (
              <span className="text-muted-foreground/50">&mdash;</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Valor cuota</p>
          <p className="font-semibold text-lg">
            {result ? (
              `$${copFormatter.format(Math.round(result.amountPerPayment))}`
            ) : (
              <span className="text-muted-foreground/50">&mdash;</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Total a pagar</p>
          <p className="font-semibold text-lg">
            {result ? (
              `$${copFormatter.format(Math.round(result.totalToRepay))}`
            ) : (
              <span className="text-muted-foreground/50">&mdash;</span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {result && result.totalInterest > 0 ? (
              <>
                Interés: $
                {copFormatter.format(Math.round(result.totalInterest))}
              </>
            ) : (
              <span className="text-muted-foreground/50">Interés: —</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
