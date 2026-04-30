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

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function monthsBetween(start: Date, end: Date): number {
  let wholeMonths = 0
  while (addMonths(start, wholeMonths + 1) <= end) {
    wholeMonths++
  }
  const anchor = addMonths(start, wholeMonths)
  const remainderDays =
    (end.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24)
  return wholeMonths + Math.max(0, remainderDays) / 30
}

export function calculateLoan(params: {
  amount: number
  interestRate: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: Date
  dueDate: Date
}): LoanCalculation | null {
  const { amount, interestRate, paymentFrequency } = params
  const startDate = stripTime(params.startDate)
  const dueDate = stripTime(params.dueDate)

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

  const loanMonths = monthsBetween(startDate, dueDate)
  const totalInterest = amount * (interestRate / 100) * loanMonths
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

// Returns Monday 00:00:00.000 → Sunday 23:59:59.999 around the given date.
export function getWeekWindow(date: Date): { start: Date; end: Date } {
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + mondayOffset)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export type WeeklyStatus =
  | 'paid'
  | 'partial'
  | 'overpaid'
  | 'pending'
  | 'overdue'

export type WeeklyCollectionAnalysis = {
  isDueInWeek: boolean
  scheduledCuota: number
  mora: number
  aFavor: number
  cuota: number
  paidThisWeek: number
  status: WeeklyStatus
  weekStart: Date
  weekEnd: Date
}

export function analyzeWeeklyCollection<
  P extends { date: Date; amount: number },
>(params: {
  amount: number
  interestRate: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: Date
  dueDate: Date
  payments: P[]
  weekStart: Date
  today: Date
}): WeeklyCollectionAnalysis | null {
  const { payments, weekStart, today } = params

  const schedule = generatePaymentSchedule({
    amount: params.amount,
    interestRate: params.interestRate,
    paymentFrequency: params.paymentFrequency,
    startDate: params.startDate,
    dueDate: params.dueDate,
  })
  if (!schedule) return null

  const { start, end } = getWeekWindow(weekStart)

  const installmentsInWeek = schedule.filter(
    (p) => p.date >= start && p.date <= end,
  )
  const scheduledCuota = installmentsInWeek.reduce(
    (sum, p) => sum + p.amount,
    0,
  )
  const isDueInWeek = installmentsInWeek.length > 0

  const priorScheduled = schedule
    .filter((p) => p.date < start)
    .reduce((sum, p) => sum + p.amount, 0)
  const priorPaid = payments
    .filter((p) => p.date < start)
    .reduce((sum, p) => sum + p.amount, 0)
  const carry = priorScheduled - priorPaid
  const mora = Math.max(0, carry)
  const aFavor = Math.max(0, -carry)
  const cuota = Math.max(0, scheduledCuota + carry)

  const paidThisWeek = payments
    .filter((p) => p.date >= start && p.date <= end)
    .reduce((sum, p) => sum + p.amount, 0)

  const { start: currentWeekStart } = getWeekWindow(today)
  const isPastWeek = end < currentWeekStart

  let status: WeeklyStatus
  if (paidThisWeek === 0) {
    status = isPastWeek ? 'overdue' : 'pending'
  } else if (paidThisWeek < cuota) {
    status = 'partial'
  } else if (paidThisWeek === cuota) {
    status = 'paid'
  } else {
    status = 'overpaid'
  }

  return {
    isDueInWeek,
    scheduledCuota,
    mora,
    aFavor,
    cuota,
    paidThisWeek,
    status,
    weekStart: start,
    weekEnd: end,
  }
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

  const { start: monday, end: sunday } = getWeekWindow(today)

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
