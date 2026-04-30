import { describe, expect, it } from 'vitest'
import {
  analyzeLoan,
  analyzeWeeklyCollection,
  calculateLoan,
  formatCOP,
  generatePaymentSchedule,
  getWeekWindow,
  type LoanAnalysis,
  type LoanCalculation,
  type ScheduledPayment,
  type WeeklyCollectionAnalysis,
} from '@/lib/loan-math'

function calcOrFail(
  params: Parameters<typeof calculateLoan>[0],
): LoanCalculation {
  const result = calculateLoan(params)
  expect(result).not.toBeNull()
  return result as LoanCalculation
}

describe('formatCOP', () => {
  it('returns empty string for null', () => {
    expect(formatCOP(null)).toBe('')
  })

  it('returns empty string for 0', () => {
    expect(formatCOP(0)).toBe('')
  })

  it('formats positive numbers with Colombian locale separators', () => {
    const result = formatCOP(1_000_000)
    // es-CO uses period as thousands separator
    expect(result).toMatch(/1[\s.]000[\s.]000/)
  })

  it('formats small numbers', () => {
    expect(formatCOP(500)).toBe('500')
  })
})

describe('calculateLoan', () => {
  const base = {
    amount: 1_000_000,
    interestRate: 5,
    paymentFrequency: 'monthly' as const,
    startDate: new Date('2026-01-01'),
    dueDate: new Date('2026-07-01'),
  }

  describe('guards', () => {
    it('returns null for amount <= 0', () => {
      expect(calculateLoan({ ...base, amount: 0 })).toBeNull()
      expect(calculateLoan({ ...base, amount: -100 })).toBeNull()
    })

    it('returns null for negative interest rate', () => {
      expect(calculateLoan({ ...base, interestRate: -1 })).toBeNull()
    })

    it('returns null when dueDate <= startDate', () => {
      expect(
        calculateLoan({ ...base, dueDate: new Date('2026-01-01') }),
      ).toBeNull()
      expect(
        calculateLoan({ ...base, dueDate: new Date('2025-12-31') }),
      ).toBeNull()
    })

    it('returns null when number of payments is 0', () => {
      // Weekly with only 3 days difference → floor(3/7) = 0
      expect(
        calculateLoan({
          ...base,
          paymentFrequency: 'weekly',
          startDate: new Date('2026-01-01'),
          dueDate: new Date('2026-01-04'),
        }),
      ).toBeNull()
    })
  })

  describe('weekly', () => {
    it('calculates correct number of payments', () => {
      // 28 days → 4 weekly payments
      const result = calcOrFail({
        ...base,
        paymentFrequency: 'weekly',
        startDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-29'),
      })
      expect(result.numberOfPayments).toBe(4)
    })

    it('floors partial weeks', () => {
      // 20 days → floor(20/7) = 2
      const result = calcOrFail({
        ...base,
        paymentFrequency: 'weekly',
        startDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-21'),
      })
      expect(result.numberOfPayments).toBe(2)
    })

    it('calculates correct interest and totals', () => {
      // Weekly over 2 months at 10% monthly
      // totalInterest = 1_000_000 * 0.10 * 2 = 200_000
      // 8 weekly payments → amountPerPayment = 1_200_000 / 8 = 150_000
      const result = calcOrFail({
        ...base,
        paymentFrequency: 'weekly',
        interestRate: 10,
        startDate: new Date('2026-01-01'),
        dueDate: new Date('2026-03-01'),
      })
      expect(result.numberOfPayments).toBe(8)
      expect(result.totalInterest).toBe(200_000)
      expect(result.totalToRepay).toBe(1_200_000)
      expect(result.amountPerPayment).toBe(150_000)
    })
  })

  describe('biweekly', () => {
    it('calculates correct number of payments', () => {
      // 56 days → floor(56/14) = 4
      const result = calcOrFail({
        ...base,
        paymentFrequency: 'biweekly',
        startDate: new Date('2026-01-01'),
        dueDate: new Date('2026-02-26'),
      })
      expect(result.numberOfPayments).toBe(4)
    })

    it('floors partial biweeks', () => {
      // 30 days → floor(30/14) = 2
      const result = calcOrFail({
        ...base,
        paymentFrequency: 'biweekly',
        startDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-31'),
      })
      expect(result.numberOfPayments).toBe(2)
    })
  })

  describe('monthly', () => {
    it('calculates correct number of payments', () => {
      const result = calcOrFail(base)
      // Jan to Jul = 6 months
      expect(result.numberOfPayments).toBe(6)
    })

    it('handles cross-year boundary', () => {
      const result = calcOrFail({
        ...base,
        startDate: new Date('2025-10-01'),
        dueDate: new Date('2026-03-01'),
      })
      // Oct to Mar = 5 months
      expect(result.numberOfPayments).toBe(5)
    })

    it('calculates correct totals for monthly', () => {
      // 6 monthly payments at 5%
      // totalInterest = 1_000_000 * 0.05 * 6 = 300_000
      const result = calcOrFail(base)
      expect(result.totalInterest).toBe(300_000)
      expect(result.totalToRepay).toBe(1_300_000)
    })
  })

  describe('zero interest', () => {
    it('has zero total interest', () => {
      const result = calcOrFail({ ...base, interestRate: 0 })
      expect(result.totalInterest).toBe(0)
    })

    it('totalToRepay equals amount', () => {
      const result = calcOrFail({ ...base, interestRate: 0 })
      expect(result.totalToRepay).toBe(base.amount)
    })
  })

  describe('math invariants', () => {
    const cases = [
      { ...base },
      {
        ...base,
        paymentFrequency: 'weekly' as const,
        dueDate: new Date('2026-01-29'),
      },
      {
        ...base,
        paymentFrequency: 'biweekly' as const,
        dueDate: new Date('2026-02-26'),
      },
      { ...base, interestRate: 0 },
      { ...base, interestRate: 10 },
    ]

    for (const params of cases) {
      it(`totalToRepay === amount + totalInterest (${params.paymentFrequency}, rate=${params.interestRate}%)`, () => {
        const result = calcOrFail(params)
        expect(result.totalToRepay).toBe(params.amount + result.totalInterest)
      })

      it(`amountPerPayment === totalToRepay / numberOfPayments (${params.paymentFrequency}, rate=${params.interestRate}%)`, () => {
        const result = calcOrFail(params)
        expect(result.amountPerPayment).toBe(
          result.totalToRepay / result.numberOfPayments,
        )
      })
    }
  })
})

// --- helpers for new tests ---

function scheduleOrFail(
  params: Parameters<typeof generatePaymentSchedule>[0],
): ScheduledPayment[] {
  const result = generatePaymentSchedule(params)
  expect(result).not.toBeNull()
  return result as ScheduledPayment[]
}

function analyzeOrFail(
  params: Parameters<typeof analyzeLoan>[0],
): LoanAnalysis {
  const result = analyzeLoan(params)
  expect(result).not.toBeNull()
  return result as LoanAnalysis
}

describe('generatePaymentSchedule', () => {
  const base = {
    amount: 1_000_000,
    interestRate: 5,
    paymentFrequency: 'monthly' as const,
    startDate: new Date('2026-01-01'),
    dueDate: new Date('2026-07-01'),
  }

  it('returns null for invalid params', () => {
    expect(generatePaymentSchedule({ ...base, amount: 0 })).toBeNull()
  })

  it('weekly: generates correct count and 7-day intervals', () => {
    // 28 days → 4 weekly payments
    const schedule = scheduleOrFail({
      ...base,
      paymentFrequency: 'weekly',
      startDate: new Date('2026-01-01'),
      dueDate: new Date('2026-01-29'),
    })
    expect(schedule).toHaveLength(4)
    // First payment is startDate + 7 days
    expect(schedule[0].date).toEqual(new Date('2026-01-08'))
    expect(schedule[1].date).toEqual(new Date('2026-01-15'))
    expect(schedule[2].date).toEqual(new Date('2026-01-22'))
    expect(schedule[3].date).toEqual(new Date('2026-01-29'))
  })

  it('biweekly: generates correct count and 14-day intervals', () => {
    // 56 days → 4 biweekly payments
    const schedule = scheduleOrFail({
      ...base,
      paymentFrequency: 'biweekly',
      startDate: new Date('2026-01-01'),
      dueDate: new Date('2026-02-26'),
    })
    expect(schedule).toHaveLength(4)
    expect(schedule[0].date).toEqual(new Date('2026-01-15'))
    expect(schedule[1].date).toEqual(new Date('2026-01-29'))
    expect(schedule[2].date).toEqual(new Date('2026-02-12'))
    expect(schedule[3].date).toEqual(new Date('2026-02-26'))
  })

  it('monthly: generates correct count using addMonths', () => {
    // Jan to Jul = 6 monthly payments
    const schedule = scheduleOrFail(base)
    expect(schedule).toHaveLength(6)
    expect(schedule[0].date).toEqual(new Date('2026-02-01'))
    expect(schedule[1].date).toEqual(new Date('2026-03-01'))
    expect(schedule[5].date).toEqual(new Date('2026-07-01'))
  })

  it('each payment has the correct amountPerPayment', () => {
    const schedule = scheduleOrFail(base)
    const calc = calcOrFail(base)
    for (const payment of schedule) {
      expect(payment.amount).toBe(calc.amountPerPayment)
    }
  })
})

describe('analyzeLoan', () => {
  // Weekly loan: start Jan 1, due Mar 1 → 2 months, 8 weekly payments
  // totalInterest = 1_000_000 * 0.10 * 2 = 200_000
  // amountPerPayment = 1_200_000 / 8 = 150_000
  // Payment dates: Jan 8, 15, 22, 29, Feb 5, 12, 19, 26
  const weeklyBase = {
    amount: 1_000_000,
    interestRate: 10,
    paymentFrequency: 'weekly' as const,
    startDate: new Date('2026-01-01'),
    dueDate: new Date('2026-03-01'),
  }

  it('returns null for invalid loan params', () => {
    expect(
      analyzeLoan({
        ...weeklyBase,
        amount: 0,
        totalPaid: 0,
        today: new Date('2026-01-10'),
      }),
    ).toBeNull()
  })

  it('fully paid loan', () => {
    const result = analyzeOrFail({
      ...weeklyBase,
      totalPaid: 1_200_000, // exactly totalToRepay
      today: new Date('2026-03-02'),
    })
    expect(result.isFullyPaid).toBe(true)
    expect(result.progress).toBe(100)
    expect(result.overdueCount).toBe(0)
    expect(result.overdueTotal).toBe(0)
  })

  it('overpayment caps progress at 100', () => {
    const result = analyzeOrFail({
      ...weeklyBase,
      totalPaid: 2_000_000, // more than totalToRepay
      today: new Date('2026-03-02'),
    })
    expect(result.isFullyPaid).toBe(true)
    expect(result.progress).toBe(100)
  })

  it('no payments made with installments due', () => {
    // Today is Jan 16 → 2 payments should have been made (Jan 8, Jan 15)
    const result = analyzeOrFail({
      ...weeklyBase,
      totalPaid: 0,
      today: new Date('2026-01-16'),
    })
    expect(result.isFullyPaid).toBe(false)
    expect(result.overdueCount).toBe(2)
    expect(result.overdueTotal).toBe(300_000) // 2 * 150_000
    expect(result.progress).toBe(0)
  })

  it('partial payments reflect the gap', () => {
    // Today is Jan 16 → 2 payments expected
    // Paid 1 installment worth (150_000)
    const result = analyzeOrFail({
      ...weeklyBase,
      totalPaid: 150_000,
      today: new Date('2026-01-16'),
    })
    expect(result.overdueCount).toBe(1) // expected 2, paid 1
    expect(result.overdueTotal).toBe(150_000) // 2*150k - 150k
  })

  it('nothing due yet when today is before first payment', () => {
    // Today is Jan 5 → no payments due yet (first is Jan 8)
    const result = analyzeOrFail({
      ...weeklyBase,
      totalPaid: 0,
      today: new Date('2026-01-05'),
    })
    expect(result.overdueCount).toBe(0)
    expect(result.overdueTotal).toBe(0)
    expect(result.isFullyPaid).toBe(false)
  })

  it('isDueThisWeek is true when payment falls in current Mon-Sun week', () => {
    // Today is Wed Jan 7 → week is Mon Jan 5 – Sun Jan 11
    // First payment is Jan 8 (Thursday) → falls in this week
    const result = analyzeOrFail({
      ...weeklyBase,
      totalPaid: 0,
      today: new Date('2026-01-07'),
    })
    expect(result.isDueThisWeek).toBe(true)
    expect(result.currentPaymentAmount).toBe(150_000)
  })

  it('isDueThisWeek is false when no payment falls in current week', () => {
    // Today is Mon Jan 12 → week is Mon Jan 12 – Sun Jan 18
    // Payments: Jan 8, Jan 15 → Jan 15 is in this week!
    // So let's use today = Sat Jan 3 → week is Mon Dec 29 – Sun Jan 4
    // No payment falls in that range (first is Jan 8)
    const result = analyzeOrFail({
      ...weeklyBase,
      totalPaid: 0,
      today: new Date('2026-01-03'),
    })
    expect(result.isDueThisWeek).toBe(false)
    expect(result.currentPaymentAmount).toBe(0)
  })

  it('progress reflects correct percentage', () => {
    // totalToRepay = 1_200_000, paid 600_000 → 50%
    const result = analyzeOrFail({
      ...weeklyBase,
      totalPaid: 600_000,
      today: new Date('2026-01-30'),
    })
    expect(result.progress).toBe(50)
  })

  it('works with monthly frequency', () => {
    // Monthly: Jan 1 to Jul 1 → 6 payments, amountPerPayment = 1_300_000/6
    // Payment dates: Feb 1, Mar 1, Apr 1, May 1, Jun 1, Jul 1
    // Today = Mar 15 → 2 payments due (Feb 1, Mar 1)
    const monthlyBase = {
      amount: 1_000_000,
      interestRate: 5,
      paymentFrequency: 'monthly' as const,
      startDate: new Date('2026-01-01'),
      dueDate: new Date('2026-07-01'),
    }
    const amountPerPayment = 1_300_000 / 6

    const result = analyzeOrFail({
      ...monthlyBase,
      totalPaid: amountPerPayment, // paid 1 of 2 expected
      today: new Date('2026-03-15'),
    })
    expect(result.overdueCount).toBe(1)
    expect(result.overdueTotal).toBeCloseTo(amountPerPayment, 0)
  })
})

describe('getWeekWindow', () => {
  it('Wednesday → Mon 00:00 to Sun 23:59:59.999', () => {
    const wed = new Date('2026-01-07T15:30:00')
    const { start, end } = getWeekWindow(wed)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(0)
    expect(start.getDate()).toBe(5) // Mon Jan 5
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getDate()).toBe(11) // Sun Jan 11
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
    expect(end.getMilliseconds()).toBe(999)
  })

  it('Monday is its own week start', () => {
    const mon = new Date('2026-01-05T08:00:00')
    const { start } = getWeekWindow(mon)
    expect(start.getDate()).toBe(5)
  })

  it('Sunday → previous Monday (handles day===0 edge)', () => {
    const sun = new Date('2026-01-11T20:00:00')
    const { start, end } = getWeekWindow(sun)
    expect(start.getDate()).toBe(5) // Mon Jan 5
    expect(end.getDate()).toBe(11) // Sun Jan 11
  })
})

function weeklyOrFail(
  params: Parameters<typeof analyzeWeeklyCollection>[0],
): WeeklyCollectionAnalysis {
  const result = analyzeWeeklyCollection(params)
  expect(result).not.toBeNull()
  return result as WeeklyCollectionAnalysis
}

describe('analyzeWeeklyCollection', () => {
  // Use local-time Date constructors (year, monthIndex, day) to avoid TZ shifts.
  // Weekly loan: Jan 1 → Mar 1 (8 weekly payments, cuota = 150_000)
  // generatePaymentSchedule adds 7 days to startDate via ms, so installments
  // are at startDate + n*7 days local time.
  // Schedule: Jan 8, 15, 22, 29, Feb 5, 12, 19, 26 (all local)
  const weeklyBase = {
    amount: 1_000_000,
    interestRate: 10,
    paymentFrequency: 'weekly' as const,
    startDate: new Date(2026, 0, 1),
    dueDate: new Date(2026, 2, 1),
  }

  it('weekly loan, full payment in selected week → status=paid', () => {
    // Week of Mon Jan 5 – Sun Jan 11 contains the Jan 8 installment
    const weekStart = new Date(2026, 0, 5)
    const result = weeklyOrFail({
      ...weeklyBase,
      payments: [{ date: new Date(2026, 0, 9), amount: 150_000 }],
      weekStart,
      today: new Date(2026, 0, 9),
    })
    expect(result.isDueInWeek).toBe(true)
    expect(result.cuota).toBe(150_000)
    expect(result.paidThisWeek).toBe(150_000)
    expect(result.status).toBe('paid')
  })

  it('weekly loan, partial payment → status=partial', () => {
    const result = weeklyOrFail({
      ...weeklyBase,
      payments: [{ date: new Date(2026, 0, 9), amount: 50_000 }],
      weekStart: new Date(2026, 0, 5),
      today: new Date(2026, 0, 9),
    })
    expect(result.status).toBe('partial')
    expect(result.paidThisWeek).toBe(50_000)
  })

  it('weekly loan, over-payment → status=overpaid', () => {
    const result = weeklyOrFail({
      ...weeklyBase,
      payments: [{ date: new Date(2026, 0, 9), amount: 200_000 }],
      weekStart: new Date(2026, 0, 5),
      today: new Date(2026, 0, 9),
    })
    expect(result.status).toBe('overpaid')
    expect(result.paidThisWeek).toBe(200_000)
  })

  it('weekly loan, no payment in current week → status=pending', () => {
    const today = new Date(2026, 0, 7) // Wed of Jan 5–11
    const result = weeklyOrFail({
      ...weeklyBase,
      payments: [],
      weekStart: today,
      today,
    })
    expect(result.status).toBe('pending')
  })

  it('weekly loan, no payment in past week → status=overdue', () => {
    // Selected week is Jan 5–11 (past), today is Jan 20
    const result = weeklyOrFail({
      ...weeklyBase,
      payments: [],
      weekStart: new Date(2026, 0, 5),
      today: new Date(2026, 0, 20),
    })
    expect(result.status).toBe('overdue')
  })

  it('biweekly loan, week with no scheduled installment → isDueInWeek=false, cuota=0', () => {
    // Biweekly: Jan 1 → Feb 26 (4 payments: Jan 15, 29, Feb 12, 26)
    // Week of Jan 5–11 has no scheduled installment
    const biweeklyBase = {
      ...weeklyBase,
      paymentFrequency: 'biweekly' as const,
      dueDate: new Date(2026, 1, 26),
    }
    const result = weeklyOrFail({
      ...biweeklyBase,
      payments: [],
      weekStart: new Date(2026, 0, 5),
      today: new Date(2026, 0, 7),
    })
    expect(result.isDueInWeek).toBe(false)
    expect(result.cuota).toBe(0)
  })

  it('monthly loan, week with installment → isDueInWeek=true with monthly cuota', () => {
    // Monthly Jan 1 → Jul 1 (6 payments: Feb 1, Mar 1, Apr 1, May 1, Jun 1, Jul 1)
    // Feb 1 2026 is a Sunday → week of Mon Jan 26 – Sun Feb 1
    const monthlyBase = {
      amount: 1_000_000,
      interestRate: 5,
      paymentFrequency: 'monthly' as const,
      startDate: new Date(2026, 0, 1),
      dueDate: new Date(2026, 6, 1),
    }
    const expectedCuota = 1_300_000 / 6
    const result = weeklyOrFail({
      ...monthlyBase,
      payments: [],
      weekStart: new Date(2026, 0, 26),
      today: new Date(2026, 0, 26),
    })
    expect(result.isDueInWeek).toBe(true)
    expect(result.cuota).toBeCloseTo(expectedCuota, 5)
  })

  it('payments outside the week are ignored in paidThisWeek', () => {
    const result = weeklyOrFail({
      ...weeklyBase,
      payments: [
        { date: new Date(2026, 0, 12), amount: 500_000 }, // after week of Jan 5–11
        { date: new Date(2026, 0, 9), amount: 150_000 }, // in week
      ],
      weekStart: new Date(2026, 0, 5),
      today: new Date(2026, 0, 9),
    })
    // No prior scheduled installments and no prior payments → no carry
    expect(result.paidThisWeek).toBe(150_000)
    expect(result.status).toBe('paid')
  })

  it('returns null for invalid loan params', () => {
    const result = analyzeWeeklyCollection({
      ...weeklyBase,
      amount: 0,
      payments: [],
      weekStart: new Date(2026, 0, 5),
      today: new Date(2026, 0, 5),
    })
    expect(result).toBeNull()
  })
})
