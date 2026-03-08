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

export type LoansApi = {
  create: (data: CreateLoanInput) => Promise<ActionResult<Loan>>
  searchBorrowers: (query: string) => Promise<Borrower[]>
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
