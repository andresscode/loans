import { describe, expect, it } from 'vitest'
import { calculateLoan, formatCOP, type LoanCalculation } from '@/lib/loan-math'

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
      // 4 weekly payments, 5% rate per period
      // totalInterest = 1_000_000 * 0.05 * 4 = 200_000
      const result = calcOrFail({
        ...base,
        paymentFrequency: 'weekly',
        startDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-29'),
      })
      expect(result.totalInterest).toBe(200_000)
      expect(result.totalToRepay).toBe(1_200_000)
      expect(result.amountPerPayment).toBe(300_000)
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
