export type LoanCalculation = {
  numberOfPayments: number
  totalInterest: number
  totalToRepay: number
  amountPerPayment: number
}

export const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'decimal',
  maximumFractionDigits: 0,
})

export function formatCOP(value: number | null): string {
  if (value === null || value === 0) return ''
  return copFormatter.format(value)
}

function countMonths(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  )
}

export function calculateLoan(params: {
  amount: number
  interestRate: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: Date
  dueDate: Date
}): LoanCalculation | null {
  const { amount, interestRate, paymentFrequency, startDate, dueDate } = params

  if (amount <= 0) return null
  if (interestRate < 0) return null
  if (dueDate <= startDate) return null

  const diffInDays = Math.floor(
    (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  let numberOfPayments: number
  if (paymentFrequency === 'weekly') {
    numberOfPayments = Math.floor(diffInDays / 7)
  } else if (paymentFrequency === 'biweekly') {
    numberOfPayments = Math.floor(diffInDays / 14)
  } else {
    numberOfPayments = countMonths(startDate, dueDate)
  }

  if (numberOfPayments <= 0) return null

  const totalInterest = amount * (interestRate / 100) * numberOfPayments
  const totalToRepay = amount + totalInterest
  const amountPerPayment = totalToRepay / numberOfPayments

  return { numberOfPayments, totalInterest, totalToRepay, amountPerPayment }
}
