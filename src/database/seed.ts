import { addMonths } from 'date-fns'
import { calculateLoan, generatePaymentSchedule } from '../lib/loan-math'
import { getDb } from './index'

type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly'

type Offset = { months?: number; weeks?: number; days?: number }

type LoanSeed = {
  amount: number
  interestRate: number
  paymentFrequency: PaymentFrequency
  startOffset: Offset
  dueOffset: Offset
  installmentsToPay: number
}

type BorrowerSeed = {
  name: string
  loans: LoanSeed[]
}

function todayAnchor(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function applyOffset(base: Date, o: Offset): Date {
  let d = base
  if (o.months) d = addMonths(d, o.months)
  const extraDays = (o.weeks ?? 0) * 7 + (o.days ?? 0)
  if (extraDays) {
    d = new Date(d)
    d.setDate(d.getDate() + extraDays)
  }
  return d
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const ALL = 9999

// Scenarios are defined relative to today so re-seeding always lands on the
// intended mix of active / overdue / due-this-week / paid loans.
const borrowers: BorrowerSeed[] = [
  // 1. Maria Lopez — paid monthly 6mo + active monthly 6mo, 50% progress, up-to-date
  {
    name: 'Maria Lopez',
    loans: [
      {
        amount: 500000,
        interestRate: 5,
        paymentFrequency: 'monthly',
        startOffset: { months: -12 },
        dueOffset: { months: -6 },
        installmentsToPay: ALL,
      },
      {
        amount: 600000,
        interestRate: 4,
        paymentFrequency: 'monthly',
        startOffset: { months: -3 },
        dueOffset: { months: 3 },
        installmentsToPay: 3,
      },
    ],
  },
  // 2. Carlos Rivera — paid weekly 8wk + active weekly 8wk, no payments yet
  {
    name: 'Carlos Rivera',
    loans: [
      {
        amount: 200000,
        interestRate: 3,
        paymentFrequency: 'weekly',
        startOffset: { weeks: -16 },
        dueOffset: { weeks: -8 },
        installmentsToPay: ALL,
      },
      {
        amount: 300000,
        interestRate: 3,
        paymentFrequency: 'weekly',
        startOffset: { days: -4 },
        dueOffset: { days: 52 },
        installmentsToPay: 0,
      },
    ],
  },
  // 3. Ana Martinez — paid biweekly 6 periods + active biweekly 8 periods, 2 overdue
  {
    name: 'Ana Martinez',
    loans: [
      {
        amount: 400000,
        interestRate: 4,
        paymentFrequency: 'biweekly',
        startOffset: { weeks: -32 },
        dueOffset: { weeks: -20 },
        installmentsToPay: ALL,
      },
      {
        amount: 450000,
        interestRate: 4,
        paymentFrequency: 'biweekly',
        startOffset: { weeks: -14 },
        dueOffset: { weeks: 2 },
        installmentsToPay: 5,
      },
    ],
  },
  // 4. Juan Garcia — paid monthly 4mo + active monthly 12mo, due this week + 1 overdue
  {
    name: 'Juan Garcia',
    loans: [
      {
        amount: 300000,
        interestRate: 5,
        paymentFrequency: 'monthly',
        startOffset: { months: -14 },
        dueOffset: { months: -10 },
        installmentsToPay: ALL,
      },
      {
        amount: 800000,
        interestRate: 5,
        paymentFrequency: 'monthly',
        startOffset: { months: -11 },
        dueOffset: { months: 1 },
        installmentsToPay: 10,
      },
    ],
  },
  // 5. Laura Sanchez — paid weekly 4wk + active weekly 10wk, due this week, up-to-date
  {
    name: 'Laura Sanchez',
    loans: [
      {
        amount: 100000,
        interestRate: 3,
        paymentFrequency: 'weekly',
        startOffset: { weeks: -20 },
        dueOffset: { weeks: -16 },
        installmentsToPay: ALL,
      },
      {
        amount: 250000,
        interestRate: 3,
        paymentFrequency: 'weekly',
        startOffset: { weeks: -9 },
        dueOffset: { days: 7 },
        installmentsToPay: 9,
      },
    ],
  },
  // 6. Pedro Hernandez — overdue 3 missed, 0 payments, monthly
  {
    name: 'Pedro Hernandez',
    loans: [
      {
        amount: 700000,
        interestRate: 5,
        paymentFrequency: 'monthly',
        startOffset: { months: -3 },
        dueOffset: { months: 3 },
        installmentsToPay: 0,
      },
    ],
  },
  // 7. Sofia Torres — 1 overdue + due this week, weekly
  {
    name: 'Sofia Torres',
    loans: [
      {
        amount: 200000,
        interestRate: 3,
        paymentFrequency: 'weekly',
        startOffset: { weeks: -4 },
        dueOffset: { weeks: 4 },
        installmentsToPay: 3,
      },
    ],
  },
  // 8. Diego Ramirez — up-to-date, >80% progress, monthly
  {
    name: 'Diego Ramirez',
    loans: [
      {
        amount: 1000000,
        interestRate: 5,
        paymentFrequency: 'monthly',
        startOffset: { months: -10 },
        dueOffset: { months: 2 },
        installmentsToPay: 10,
      },
    ],
  },
  // 9. Valentina Cruz — just started, first payment not due yet, biweekly
  {
    name: 'Valentina Cruz',
    loans: [
      {
        amount: 350000,
        interestRate: 4,
        paymentFrequency: 'biweekly',
        startOffset: { days: -7 },
        dueOffset: { weeks: 11 },
        installmentsToPay: 0,
      },
    ],
  },
  // 10. Andres Morales — small loan, 1% interest, weekly, up-to-date
  {
    name: 'Andres Morales',
    loans: [
      {
        amount: 50000,
        interestRate: 1,
        paymentFrequency: 'weekly',
        startOffset: { weeks: -7 },
        dueOffset: { weeks: 3 },
        installmentsToPay: 7,
      },
    ],
  },
  // 11. Camila Ortiz — large loan, 10% interest, monthly, up-to-date
  {
    name: 'Camila Ortiz',
    loans: [
      {
        amount: 5000000,
        interestRate: 10,
        paymentFrequency: 'monthly',
        startOffset: { months: -6 },
        dueOffset: { months: 6 },
        installmentsToPay: 6,
      },
    ],
  },
  // 12. Felipe Vargas — biweekly, overdue, partial payment
  {
    name: 'Felipe Vargas',
    loans: [
      {
        amount: 400000,
        interestRate: 4,
        paymentFrequency: 'biweekly',
        startOffset: { weeks: -12 },
        dueOffset: { weeks: 2 },
        installmentsToPay: 4,
      },
    ],
  },
  // 13. Isabella Reyes — weekly, exactly 1 overdue
  {
    name: 'Isabella Reyes',
    loans: [
      {
        amount: 300000,
        interestRate: 3,
        paymentFrequency: 'weekly',
        startOffset: { weeks: -7 },
        dueOffset: { weeks: 3 },
        installmentsToPay: 6,
      },
    ],
  },
  // 14. Mateo Diaz — monthly, 0% interest, up-to-date
  {
    name: 'Mateo Diaz',
    loans: [
      {
        amount: 500000,
        interestRate: 0,
        paymentFrequency: 'monthly',
        startOffset: { months: -6 },
        dueOffset: { months: 6 },
        installmentsToPay: 6,
      },
    ],
  },
  // 15. Lucia Gutierrez — due this week, completely up-to-date, monthly
  {
    name: 'Lucia Gutierrez',
    loans: [
      {
        amount: 800000,
        interestRate: 5,
        paymentFrequency: 'monthly',
        startOffset: { months: -9 },
        dueOffset: { months: 3 },
        installmentsToPay: 9,
      },
    ],
  },
]

export function seedDatabase(): void {
  const db = getDb()
  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM borrowers')
    .get() as { count: number }
  if (count > 0) return

  const anchor = todayAnchor()

  const insertBorrower = db.prepare('INSERT INTO borrowers (name) VALUES (?)')
  const insertLoan = db.prepare(
    'INSERT INTO loans (borrower_id, amount, interest_rate, payment_frequency, start_date, due_date) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const insertPayment = db.prepare(
    'INSERT INTO payments (loan_id, amount, payment_date) VALUES (?, ?, ?)',
  )

  db.transaction(() => {
    for (const borrower of borrowers) {
      const { lastInsertRowid: borrowerId } = insertBorrower.run(borrower.name)

      for (const loan of borrower.loans) {
        const startDate = applyOffset(anchor, loan.startOffset)
        const dueDate = applyOffset(anchor, loan.dueOffset)

        const { lastInsertRowid: loanId } = insertLoan.run(
          borrowerId,
          loan.amount,
          loan.interestRate,
          loan.paymentFrequency,
          formatDate(startDate),
          formatDate(dueDate),
        )

        if (loan.installmentsToPay <= 0) continue

        const calc = calculateLoan({
          amount: loan.amount,
          interestRate: loan.interestRate,
          paymentFrequency: loan.paymentFrequency,
          startDate,
          dueDate,
        })
        if (!calc) continue

        const schedule = generatePaymentSchedule({
          amount: loan.amount,
          interestRate: loan.interestRate,
          paymentFrequency: loan.paymentFrequency,
          startDate,
          dueDate,
        })
        if (!schedule) continue

        const n = Math.min(loan.installmentsToPay, calc.numberOfPayments)
        for (let i = 0; i < n; i++) {
          insertPayment.run(
            loanId,
            calc.amountPerPayment,
            formatDate(schedule[i].date),
          )
        }
      }
    }
  })()
}
