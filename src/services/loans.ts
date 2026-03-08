import type {
  ActionResult,
  Borrower,
  CreateLoanInput,
  Loan,
  LoanWithBorrower,
  PaginatedResult,
} from '@/types'

export const loansService = {
  async create(data: CreateLoanInput): Promise<ActionResult<Loan>> {
    return window.api.loans.create(data)
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
}
