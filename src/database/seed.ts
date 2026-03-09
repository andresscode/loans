import { calculateLoan, generatePaymentSchedule } from '../lib/loan-math'
import { getDb } from './index'

type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly'

type LoanSeed = {
  amount: number
  interestRate: number
  paymentFrequency: PaymentFrequency
  startDate: string
  dueDate: string
  installmentsToPay: number
}

type BorrowerSeed = {
  name: string
  loans: LoanSeed[]
}

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00`)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const ALL = 9999

// All dates relative to today = 2026-03-09
const borrowers: BorrowerSeed[] = [
  // 1. Maria Lopez — paid monthly 6mo + active monthly 6mo, 50% progress, up-to-date
  {
    name: 'Maria Lopez',
    loans: [
      {
        amount: 500000,
        interestRate: 5,
        paymentFrequency: 'monthly',
        startDate: '2025-03-01',
        dueDate: '2025-09-01',
        installmentsToPay: ALL,
      },
      {
        amount: 600000,
        interestRate: 4,
        paymentFrequency: 'monthly',
        startDate: '2025-12-09',
        dueDate: '2026-06-09',
        installmentsToPay: 3,
      },
    ],
  },
  // 2. Carlos Rivera — paid weekly 8wk + active weekly 8wk, just started (nothing due yet)
  {
    name: 'Carlos Rivera',
    loans: [
      {
        amount: 200000,
        interestRate: 3,
        paymentFrequency: 'weekly',
        startDate: '2025-10-01',
        dueDate: '2025-11-26',
        installmentsToPay: ALL,
      },
      {
        amount: 300000,
        interestRate: 3,
        paymentFrequency: 'weekly',
        startDate: '2026-03-05',
        dueDate: '2026-04-30',
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
        startDate: '2025-06-01',
        dueDate: '2025-08-24',
        installmentsToPay: ALL,
      },
      {
        amount: 450000,
        interestRate: 4,
        paymentFrequency: 'biweekly',
        startDate: '2025-12-01',
        dueDate: '2026-03-23',
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
        startDate: '2025-05-01',
        dueDate: '2025-09-01',
        installmentsToPay: ALL,
      },
      {
        amount: 800000,
        interestRate: 5,
        paymentFrequency: 'monthly',
        startDate: '2025-04-09',
        dueDate: '2026-04-09',
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
        startDate: '2025-08-01',
        dueDate: '2025-08-29',
        installmentsToPay: ALL,
      },
      {
        amount: 250000,
        interestRate: 3,
        paymentFrequency: 'weekly',
        startDate: '2026-01-05',
        dueDate: '2026-03-16',
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
        startDate: '2025-12-09',
        dueDate: '2026-06-09',
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
        startDate: '2026-02-09',
        dueDate: '2026-04-06',
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
        startDate: '2025-05-09',
        dueDate: '2026-05-09',
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
        startDate: '2026-03-02',
        dueDate: '2026-05-25',
        installmentsToPay: 0,
      },
    ],
  },
  // 10. Andres Morales — small loan, 1% interest, weekly
  {
    name: 'Andres Morales',
    loans: [
      {
        amount: 50000,
        interestRate: 1,
        paymentFrequency: 'weekly',
        startDate: '2026-01-19',
        dueDate: '2026-03-30',
        installmentsToPay: 7,
      },
    ],
  },
  // 11. Camila Ortiz — large loan, 10% interest, monthly
  {
    name: 'Camila Ortiz',
    loans: [
      {
        amount: 5000000,
        interestRate: 10,
        paymentFrequency: 'monthly',
        startDate: '2025-09-09',
        dueDate: '2026-09-09',
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
        startDate: '2025-12-15',
        dueDate: '2026-03-23',
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
        startDate: '2026-01-19',
        dueDate: '2026-03-30',
        installmentsToPay: 6,
      },
    ],
  },
  // 14. Mateo Diaz — monthly, 0% interest
  {
    name: 'Mateo Diaz',
    loans: [
      {
        amount: 500000,
        interestRate: 0,
        paymentFrequency: 'monthly',
        startDate: '2025-09-09',
        dueDate: '2026-09-09',
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
        startDate: '2025-06-09',
        dueDate: '2026-06-09',
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
        const { lastInsertRowid: loanId } = insertLoan.run(
          borrowerId,
          loan.amount,
          loan.interestRate,
          loan.paymentFrequency,
          loan.startDate,
          loan.dueDate,
        )

        if (loan.installmentsToPay <= 0) continue

        const calc = calculateLoan({
          amount: loan.amount,
          interestRate: loan.interestRate,
          paymentFrequency: loan.paymentFrequency,
          startDate: parseDate(loan.startDate),
          dueDate: parseDate(loan.dueDate),
        })
        if (!calc) continue

        const schedule = generatePaymentSchedule({
          amount: loan.amount,
          interestRate: loan.interestRate,
          paymentFrequency: loan.paymentFrequency,
          startDate: parseDate(loan.startDate),
          dueDate: parseDate(loan.dueDate),
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
