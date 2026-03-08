import type {
  ActionResult,
  Borrower,
  CreateLoanInput,
  CreatePaymentInput,
  Loan,
  LoanWithBorrower,
  PaginatedResult,
  Payment,
  UpdateLoanInput,
} from '@/types'

export const loansService = {
  async create(data: CreateLoanInput): Promise<ActionResult<Loan>> {
    return window.api.loans.create(data)
  },

  async update(id: number, data: UpdateLoanInput): Promise<ActionResult<Loan>> {
    return window.api.loans.update(id, data)
  },

  async delete(id: number): Promise<ActionResult> {
    return window.api.loans.delete(id)
  },

  async getAll(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<LoanWithBorrower>> {
    return window.api.loans.getAll({ page, pageSize })
  },

  async searchBorrowers(query: string): Promise<Borrower[]> {
    return window.api.loans.searchBorrowers(query)
  },

  async getPayments(loanId: number): Promise<Payment[]> {
    return window.api.loans.getPayments(loanId)
  },

  async createPayment(
    data: CreatePaymentInput,
  ): Promise<ActionResult<Payment>> {
    return window.api.loans.createPayment(data)
  },

  async deletePayment(id: number): Promise<ActionResult> {
    return window.api.loans.deletePayment(id)
  },
}
