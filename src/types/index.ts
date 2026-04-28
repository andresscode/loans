export type ActionResult<T = void> =
  | ({ success: true } & (T extends void ? object : { data: T }))
  | { success: false; error: string }

export type User = {
  id: number
  username: string
  displayName: string
  createdAt: string
  updatedAt: string
}

export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly'

export type Borrower = {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export type Loan = {
  id: number
  borrowerId: number
  amount: number
  interestRate: number
  paymentFrequency: PaymentFrequency
  startDate: string
  dueDate: string
  createdAt: string
  updatedAt: string
}

export type Payment = {
  id: number
  loanId: number
  amount: number
  paymentDate: string
  createdAt: string
  updatedAt: string
}

export type CreateLoanInput = {
  borrower: { type: 'existing'; id: number } | { type: 'new'; name: string }
  amount: number
  interestRate: number
  paymentFrequency: PaymentFrequency
  startDate: string
  dueDate: string
}

export type UpdateLoanInput = {
  amount: number
  interestRate: number
  paymentFrequency: PaymentFrequency
  startDate: string
  dueDate: string
}

export type CreatePaymentInput = {
  loanId: number
  amount: number
  paymentDate: string
}

export type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export type LoanWithBorrower = Loan & { borrowerName: string }

export type SortingParam = { column: string; direction: 'asc' | 'desc' } | null
export type TabQueryParams = {
  page: number
  pageSize: number
  sorting: SortingParam
}

// Tab 1: Activos — all non-fully-paid loans
export type ActiveLoanRow = LoanWithBorrower & {
  totalToRepay: number
  totalPaid: number
  pending: number
  progress: number // 0-100
}

// Tab 2: Por cobrar — loans with payment due this week
export type DueLoanRow = {
  id: number
  borrowerName: string
  currentPaymentAmount: number
  overduePaymentsTotal: number
  totalDue: number
  paymentFrequency: PaymentFrequency
  amount: number
}

// Tab 3: Vencidos — loans with overdue payments
export type OverdueLoanRow = {
  id: number
  borrowerName: string
  overdueCount: number
  overdueTotal: number
  lastPaymentDate: string | null
  amount: number
}

// Tab 4: Pagados — fully paid loans
export type PaidLoanRow = {
  id: number
  borrowerName: string
  amount: number
  totalInterest: number
  totalPaid: number
  startDate: string
  closedDate: string
}

export type LoansApi = {
  create: (data: CreateLoanInput) => Promise<ActionResult<Loan>>
  update: (id: number, data: UpdateLoanInput) => Promise<ActionResult<Loan>>
  delete: (id: number) => Promise<ActionResult>
  getAll: (params: {
    page: number
    pageSize: number
  }) => Promise<PaginatedResult<LoanWithBorrower>>
  getActive: (params: TabQueryParams) => Promise<PaginatedResult<ActiveLoanRow>>
  getDue: (params: TabQueryParams) => Promise<PaginatedResult<DueLoanRow>>
  getOverdue: (
    params: TabQueryParams,
  ) => Promise<PaginatedResult<OverdueLoanRow>>
  getPaid: (params: TabQueryParams) => Promise<PaginatedResult<PaidLoanRow>>
  searchBorrowers: (query: string) => Promise<Borrower[]>
  getPayments: (loanId: number) => Promise<Payment[]>
  createPayment: (data: CreatePaymentInput) => Promise<ActionResult<Payment>>
  deletePayment: (id: number) => Promise<ActionResult>
}

export type AuthApi = {
  hasUsers: () => Promise<boolean>
  setup: (data: {
    username: string
    password: string
    displayName: string
  }) => Promise<ActionResult<User>>
  login: (data: {
    username: string
    password: string
  }) => Promise<ActionResult<{ user: User; token: string }>>
  validateSession: (data: { token: string }) => Promise<ActionResult<User>>
}

declare global {
  interface Window {
    api: { auth: AuthApi; loans: LoansApi }
  }
}
