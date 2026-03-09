import { addMonths } from 'date-fns'

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

export type ScheduledPayment = { date: Date; amount: number }

export function generatePaymentSchedule(params: {
  amount: number
  interestRate: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: Date
  dueDate: Date
}): ScheduledPayment[] | null {
  const calc = calculateLoan(params)
  if (!calc) return null

  const schedule: ScheduledPayment[] = []
  const { numberOfPayments, amountPerPayment } = calc
  const { paymentFrequency, startDate } = params

  for (let i = 1; i <= numberOfPayments; i++) {
    let date: Date
    if (paymentFrequency === 'weekly') {
      date = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000)
    } else if (paymentFrequency === 'biweekly') {
      date = new Date(startDate.getTime() + i * 14 * 24 * 60 * 60 * 1000)
    } else {
      date = addMonths(startDate, i)
    }
    schedule.push({ date, amount: amountPerPayment })
  }

  return schedule
}

export type LoanAnalysis = {
  totalToRepay: number
  totalPaid: number
  amountPerPayment: number
  progress: number
  isFullyPaid: boolean
  isDueThisWeek: boolean
  currentPaymentAmount: number
  overdueCount: number
  overdueTotal: number
}

export function analyzeLoan(params: {
  amount: number
  interestRate: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: Date
  dueDate: Date
  totalPaid: number
  today: Date
}): LoanAnalysis | null {
  const {
    amount,
    interestRate,
    paymentFrequency,
    startDate,
    dueDate,
    totalPaid,
    today,
  } = params

  const calc = calculateLoan({
    amount,
    interestRate,
    paymentFrequency,
    startDate,
    dueDate,
  })
  if (!calc) return null

  const schedule = generatePaymentSchedule({
    amount,
    interestRate,
    paymentFrequency,
    startDate,
    dueDate,
  })
  if (!schedule) return null

  const { totalToRepay, amountPerPayment } = calc

  const isFullyPaid = totalPaid >= totalToRepay
  const progress = Math.min(100, (totalPaid / totalToRepay) * 100)

  // How many installments should be paid by today
  const expectedInstallments = schedule.filter((p) => p.date <= today).length
  const paidInstallments = Math.floor(totalPaid / amountPerPayment)

  const overdueCount = Math.max(0, expectedInstallments - paidInstallments)
  const overdueTotal = Math.max(
    0,
    expectedInstallments * amountPerPayment - totalPaid,
  )

  // Check if any scheduled payment falls in the current Mon–Sun week
  const todayDay = today.getDay()
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const isDueThisWeek = schedule.some(
    (p) => p.date >= monday && p.date <= sunday,
  )
  const currentPaymentAmount = isDueThisWeek ? amountPerPayment : 0

  return {
    totalToRepay,
    totalPaid,
    amountPerPayment,
    progress,
    isFullyPaid,
    isDueThisWeek,
    currentPaymentAmount,
    overdueCount,
    overdueTotal,
  }
}
