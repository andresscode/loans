import type {
  PaymentFrequency,
  WeeklyCollectionRow,
  WeeklyCollectionSummary,
} from '../types'
import { analyzeWeeklyCollection, getWeekWindow } from './loan-math'

export type WeeklyCollectionInput = {
  loan: {
    id: number
    borrowerId: number
    borrowerName: string
    amount: number
    interestRate: number
    paymentFrequency: PaymentFrequency
    startDate: Date
    dueDate: Date
  }
  payments: { id?: number; date: Date; amount: number }[]
}

export type WeeklyCollectionResult = {
  rows: WeeklyCollectionRow[]
  summary: WeeklyCollectionSummary
}

function classifyWeek(
  weekEnd: Date,
  today: Date,
): { isPastWeek: boolean; isCurrentWeek: boolean } {
  const { start: currentStart, end: currentEnd } = getWeekWindow(today)
  const isCurrentWeek = weekEnd >= currentStart && weekEnd <= currentEnd
  const isPastWeek = weekEnd < currentStart
  return { isPastWeek, isCurrentWeek }
}

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function buildWeeklyCollection(params: {
  inputs: WeeklyCollectionInput[]
  weekStart: Date
  today: Date
  search?: string
}): WeeklyCollectionResult {
  const { inputs, weekStart, today, search } = params

  const { start, end } = getWeekWindow(weekStart)
  const { isPastWeek, isCurrentWeek } = classifyWeek(end, today)

  const rows: WeeklyCollectionRow[] = []
  for (const { loan, payments } of inputs) {
    const analysis = analyzeWeeklyCollection({
      amount: loan.amount,
      interestRate: loan.interestRate,
      paymentFrequency: loan.paymentFrequency,
      startDate: loan.startDate,
      dueDate: loan.dueDate,
      payments,
      weekStart,
      today,
    })
    if (!analysis || !analysis.isDueInWeek) continue

    const paymentsInWeek = payments
      .filter((p) => p.date >= start && p.date <= end)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
    const last = paymentsInWeek[0]

    rows.push({
      id: loan.id,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      cuota: analysis.cuota,
      scheduledCuota: analysis.scheduledCuota,
      mora: analysis.mora,
      aFavor: analysis.aFavor,
      paidThisWeek: analysis.paidThisWeek,
      status: analysis.status,
      amount: loan.amount,
      paymentFrequency: loan.paymentFrequency,
      lastPaymentId: last?.id ?? null,
      lastPaymentAmount: last?.amount ?? null,
      lastPaymentDate: last ? toIsoDate(last.date) : null,
    })
  }

  let expected = 0
  let collected = 0
  let paidCount = 0
  for (const r of rows) {
    expected += r.cuota
    collected += r.paidThisWeek
    if (r.status === 'paid' || r.status === 'overpaid') paidCount++
  }

  const filtered = search
    ? rows.filter((r) =>
        r.borrowerName.toLowerCase().includes(search.toLowerCase()),
      )
    : rows

  const summary: WeeklyCollectionSummary = {
    weekStart: toIsoDate(start),
    weekEnd: toIsoDate(end),
    isPastWeek,
    isCurrentWeek,
    expected,
    collected,
    remaining: Math.max(0, expected - collected),
    borrowerCount: rows.length,
    paidCount,
  }

  return { rows: filtered, summary }
}
