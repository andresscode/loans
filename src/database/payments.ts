import { getDb } from './index'

type PaymentRow = {
  id: number
  loan_id: number
  amount: number
  payment_date: string
  created_at: string
  updated_at: string
}

export function createPayment(data: {
  loanId: number
  amount: number
  paymentDate: string
}): PaymentRow {
  const result = getDb()
    .prepare(
      'INSERT INTO payments (loan_id, amount, payment_date) VALUES (?, ?, ?)',
    )
    .run(data.loanId, data.amount, data.paymentDate)
  return {
    id: result.lastInsertRowid as number,
    loan_id: data.loanId,
    amount: data.amount,
    payment_date: data.paymentDate,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export function getPaymentById(id: number): PaymentRow | undefined {
  return getDb().prepare('SELECT * FROM payments WHERE id = ?').get(id) as
    | PaymentRow
    | undefined
}

export function getPaymentsByLoanId(loanId: number): PaymentRow[] {
  return getDb()
    .prepare(
      'SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date DESC',
    )
    .all(loanId) as PaymentRow[]
}

export function getAllPayments(): PaymentRow[] {
  return getDb()
    .prepare('SELECT * FROM payments ORDER BY payment_date ASC')
    .all() as PaymentRow[]
}

export function updatePayment(
  id: number,
  data: {
    amount?: number
    paymentDate?: string
  },
): PaymentRow | undefined {
  const payment = getPaymentById(id)
  if (!payment) return undefined

  getDb()
    .prepare(
      "UPDATE payments SET amount = ?, payment_date = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(
      data.amount ?? payment.amount,
      data.paymentDate ?? payment.payment_date,
      id,
    )
  return getPaymentById(id)
}

export function deletePayment(id: number): boolean {
  const result = getDb().prepare('DELETE FROM payments WHERE id = ?').run(id)
  return result.changes > 0
}
