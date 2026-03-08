import type { ActionResult, Borrower, CreateLoanInput, Loan } from '@/types'

export const loansService = {
  async create(data: CreateLoanInput): Promise<ActionResult<Loan>> {
    return window.api.loans.create(data)
  },

  async searchBorrowers(query: string): Promise<Borrower[]> {
    return window.api.loans.searchBorrowers(query)
  },
}
