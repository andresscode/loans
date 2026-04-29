import type {
  ActionResult,
  ActiveLoanRow,
  ActiveLoansSummary,
  Borrower,
  CreateLoanInput,
  CreatePaymentInput,
  DueLoanRow,
  Loan,
  LoanWithBorrower,
  OverdueLoanRow,
  PaginatedResult,
  PaidLoanRow,
  Payment,
  TabQueryParams,
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

  async getActive(
    params: TabQueryParams,
  ): Promise<PaginatedResult<ActiveLoanRow>> {
    return window.api.loans.getActive(params)
  },

  async getActiveSummary(): Promise<ActiveLoansSummary> {
    return window.api.loans.getActiveSummary()
  },

  async getDue(params: TabQueryParams): Promise<PaginatedResult<DueLoanRow>> {
    return window.api.loans.getDue(params)
  },

  async getOverdue(
    params: TabQueryParams,
  ): Promise<PaginatedResult<OverdueLoanRow>> {
    return window.api.loans.getOverdue(params)
  },

  async getPaid(params: TabQueryParams): Promise<PaginatedResult<PaidLoanRow>> {
    return window.api.loans.getPaid(params)
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
