import { describe, expect, it } from 'vitest'
import {
  buildWeeklyCollection,
  type WeeklyCollectionInput,
} from '@/lib/weekly-collection'

// Weekly loan with cuota = 150_000. Schedule: Jan 8, 15, 22, 29, Feb 5, 12, 19, 26
function weeklyLoan(
  id: number,
  borrowerName: string,
): WeeklyCollectionInput['loan'] {
  return {
    id,
    borrowerId: id,
    borrowerName,
    amount: 1_000_000,
    interestRate: 10,
    paymentFrequency: 'weekly',
    startDate: new Date(2026, 0, 1),
    dueDate: new Date(2026, 2, 1),
  }
}

// Biweekly loan (Jan 1 → Feb 26, 4 payments: Jan 15, 29, Feb 12, 26)
function biweeklyLoan(
  id: number,
  borrowerName: string,
): WeeklyCollectionInput['loan'] {
  return {
    id,
    borrowerId: id,
    borrowerName,
    amount: 1_000_000,
    interestRate: 10,
    paymentFrequency: 'biweekly',
    startDate: new Date(2026, 0, 1),
    dueDate: new Date(2026, 1, 26),
  }
}

describe('buildWeeklyCollection', () => {
  const weekStart = new Date(2026, 0, 5) // Mon Jan 5
  const today = new Date(2026, 0, 9)

  it('includes only loans with an installment in the selected week', () => {
    // Jan 5–11 contains Jan 8 (weekly) but not biweekly's Jan 15
    const inputs: WeeklyCollectionInput[] = [
      { loan: weeklyLoan(1, 'Ana'), payments: [] },
      { loan: biweeklyLoan(2, 'Beto'), payments: [] },
    ]
    const { rows } = buildWeeklyCollection({ inputs, weekStart, today })
    expect(rows.map((r) => r.id)).toEqual([1])
  })

  it('search filter is applied case-insensitively', () => {
    const inputs: WeeklyCollectionInput[] = [
      { loan: weeklyLoan(1, 'Ana Pérez'), payments: [] },
      { loan: weeklyLoan(2, 'Carlos Ruiz'), payments: [] },
    ]
    const { rows } = buildWeeklyCollection({
      inputs,
      weekStart,
      today,
      search: 'ANA',
    })
    expect(rows.map((r) => r.borrowerName)).toEqual(['Ana Pérez'])
  })

  it('summary aggregates expected/collected/paidCount across rows', () => {
    const inputs: WeeklyCollectionInput[] = [
      // paid in full
      {
        loan: weeklyLoan(1, 'Ana'),
        payments: [{ date: new Date(2026, 0, 9), amount: 150_000 }],
      },
      // partial
      {
        loan: weeklyLoan(2, 'Beto'),
        payments: [{ date: new Date(2026, 0, 9), amount: 50_000 }],
      },
      // pending
      { loan: weeklyLoan(3, 'Carla'), payments: [] },
    ]
    const { summary, rows } = buildWeeklyCollection({
      inputs,
      weekStart,
      today,
    })
    expect(rows).toHaveLength(3)
    expect(summary.expected).toBe(450_000) // 3 * 150_000
    expect(summary.collected).toBe(200_000) // 150 + 50
    expect(summary.remaining).toBe(250_000)
    expect(summary.borrowerCount).toBe(3)
    expect(summary.paidCount).toBe(1) // only Ana fully paid
  })

  it('overpaid rows count toward paidCount', () => {
    const inputs: WeeklyCollectionInput[] = [
      {
        loan: weeklyLoan(1, 'Ana'),
        payments: [{ date: new Date(2026, 0, 9), amount: 200_000 }],
      },
    ]
    const { summary, rows } = buildWeeklyCollection({
      inputs,
      weekStart,
      today,
    })
    expect(rows[0].status).toBe('overpaid')
    expect(summary.paidCount).toBe(1)
  })

  it('classifies past/current/future weeks', () => {
    const inputs: WeeklyCollectionInput[] = [
      { loan: weeklyLoan(1, 'Ana'), payments: [] },
    ]
    const today = new Date(2026, 0, 7) // current week is Jan 5–11

    const past = buildWeeklyCollection({
      inputs,
      weekStart: new Date(2025, 11, 29), // week Dec 29 – Jan 4 — but no installment there
      today,
    })
    // No row, but summary should still classify
    expect(past.summary.isPastWeek).toBe(true)
    expect(past.summary.isCurrentWeek).toBe(false)

    const current = buildWeeklyCollection({
      inputs,
      weekStart: new Date(2026, 0, 5),
      today,
    })
    expect(current.summary.isCurrentWeek).toBe(true)
    expect(current.summary.isPastWeek).toBe(false)

    const future = buildWeeklyCollection({
      inputs,
      weekStart: new Date(2026, 0, 12),
      today,
    })
    expect(future.summary.isCurrentWeek).toBe(false)
    expect(future.summary.isPastWeek).toBe(false)
  })

  it('summary reflects the entire week and ignores search', () => {
    const inputs: WeeklyCollectionInput[] = [
      {
        loan: weeklyLoan(1, 'Ana'),
        payments: [{ date: new Date(2026, 0, 9), amount: 150_000 }],
      },
      { loan: weeklyLoan(2, 'Beto'), payments: [] },
    ]
    const { summary, rows } = buildWeeklyCollection({
      inputs,
      weekStart,
      today,
      search: 'Ana',
    })
    // Rows still filtered, but summary aggregates both loans
    expect(rows.map((r) => r.borrowerName)).toEqual(['Ana'])
    expect(summary.borrowerCount).toBe(2)
    expect(summary.expected).toBe(300_000)
    expect(summary.collected).toBe(150_000)
    expect(summary.paidCount).toBe(1)
  })

  describe('carry-over (mora / a favor)', () => {
    // Use today inside week 3 (Jan 19–25) so prior weeks (Jan 5–11, 12–18) carry
    const week3Start = new Date(2026, 0, 19)
    const w3Today = new Date(2026, 0, 21)

    it('clean week → mora=0, aFavor=0, cuota equals scheduled', () => {
      const inputs: WeeklyCollectionInput[] = [
        {
          loan: weeklyLoan(1, 'Ana'),
          // Paid Jan 8 and Jan 15 in full
          payments: [
            { date: new Date(2026, 0, 8), amount: 150_000 },
            { date: new Date(2026, 0, 15), amount: 150_000 },
          ],
        },
      ]
      const { rows } = buildWeeklyCollection({
        inputs,
        weekStart: week3Start,
        today: w3Today,
      })
      expect(rows[0].mora).toBe(0)
      expect(rows[0].aFavor).toBe(0)
      expect(rows[0].cuota).toBe(rows[0].scheduledCuota)
    })

    it('underpaid prior weeks → mora > 0 and cuota increases', () => {
      const inputs: WeeklyCollectionInput[] = [
        {
          loan: weeklyLoan(1, 'Ana'),
          // Only paid 50k against 300k scheduled in prior weeks
          payments: [{ date: new Date(2026, 0, 8), amount: 50_000 }],
        },
      ]
      const { rows } = buildWeeklyCollection({
        inputs,
        weekStart: week3Start,
        today: w3Today,
      })
      const r = rows[0]
      expect(r.mora).toBe(250_000) // 300_000 scheduled - 50_000 paid
      expect(r.aFavor).toBe(0)
      expect(r.cuota).toBe(r.scheduledCuota + 250_000)
    })

    it('overpaid prior weeks → aFavor > 0 and cuota decreases (≥ 0)', () => {
      const inputs: WeeklyCollectionInput[] = [
        {
          loan: weeklyLoan(1, 'Ana'),
          // Paid 500k against 300k scheduled in prior weeks
          payments: [{ date: new Date(2026, 0, 8), amount: 500_000 }],
        },
      ]
      const { rows } = buildWeeklyCollection({
        inputs,
        weekStart: week3Start,
        today: w3Today,
      })
      const r = rows[0]
      expect(r.mora).toBe(0)
      expect(r.aFavor).toBe(200_000)
      // scheduledCuota = 150_000, aFavor = 200_000 ⇒ clamped to 0
      expect(r.cuota).toBe(0)
    })

    it('surfaces lastPaymentId/Amount/Date for the most recent in-week payment', () => {
      const inputs: WeeklyCollectionInput[] = [
        {
          loan: weeklyLoan(1, 'Ana'),
          payments: [
            { id: 11, date: new Date(2026, 0, 6), amount: 50_000 },
            { id: 22, date: new Date(2026, 0, 9), amount: 100_000 },
          ],
        },
      ]
      const { rows } = buildWeeklyCollection({ inputs, weekStart, today })
      expect(rows[0].lastPaymentId).toBe(22)
      expect(rows[0].lastPaymentAmount).toBe(100_000)
      expect(rows[0].lastPaymentDate).toBe('2026-01-09')
    })
  })

  it('weekStart and weekEnd in summary are ISO date strings (Mon and Sun)', () => {
    const inputs: WeeklyCollectionInput[] = []
    const { summary } = buildWeeklyCollection({
      inputs,
      weekStart: new Date(2026, 0, 7), // Wed
      today,
    })
    expect(summary.weekStart).toBe('2026-01-05') // Mon
    expect(summary.weekEnd).toBe('2026-01-11') // Sun
  })
})
