import { getDb } from './index'

type LoanRow = {
  id: number
  borrower_id: number
  amount: number
  interest_rate: number
  payment_frequency: string
  start_date: string
  due_date: string
  created_at: string
  updated_at: string
}

export function createLoan(data: {
  borrowerId: number
  amount: number
  interestRate: number
  paymentFrequency: string
  startDate: string
  dueDate: string
}): LoanRow {
  const result = getDb()
    .prepare(
      'INSERT INTO loans (borrower_id, amount, interest_rate, payment_frequency, start_date, due_date) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(
      data.borrowerId,
      data.amount,
      data.interestRate,
      data.paymentFrequency,
      data.startDate,
      data.dueDate,
    )
  return {
    id: result.lastInsertRowid as number,
    borrower_id: data.borrowerId,
    amount: data.amount,
    interest_rate: data.interestRate,
    payment_frequency: data.paymentFrequency,
    start_date: data.startDate,
    due_date: data.dueDate,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export function getLoanById(id: number): LoanRow | undefined {
  return getDb().prepare('SELECT * FROM loans WHERE id = ?').get(id) as
    | LoanRow
    | undefined
}

export function getLoansByBorrowerId(borrowerId: number): LoanRow[] {
  return getDb()
    .prepare(
      'SELECT * FROM loans WHERE borrower_id = ? ORDER BY created_at DESC',
    )
    .all(borrowerId) as LoanRow[]
}

export function getAllLoans(): LoanRow[] {
  return getDb()
    .prepare('SELECT * FROM loans ORDER BY created_at DESC')
    .all() as LoanRow[]
}

export function updateLoan(
  id: number,
  data: {
    amount?: number
    interestRate?: number
    paymentFrequency?: string
    startDate?: string
    dueDate?: string
  },
): LoanRow | undefined {
  const loan = getLoanById(id)
  if (!loan) return undefined

  getDb()
    .prepare(
      "UPDATE loans SET amount = ?, interest_rate = ?, payment_frequency = ?, start_date = ?, due_date = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(
      data.amount ?? loan.amount,
      data.interestRate ?? loan.interest_rate,
      data.paymentFrequency ?? loan.payment_frequency,
      data.startDate ?? loan.start_date,
      data.dueDate ?? loan.due_date,
      id,
    )
  return getLoanById(id)
}

export function deleteLoan(id: number): boolean {
  const result = getDb().prepare('DELETE FROM loans WHERE id = ?').run(id)
  return result.changes > 0
}
