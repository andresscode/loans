import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  auth: {
    hasUsers: () => ipcRenderer.invoke('auth:has-users'),
    setup: (data: {
      username: string
      password: string
      displayName: string
    }) => ipcRenderer.invoke('auth:setup', data),
    login: (data: { username: string; password: string }) =>
      ipcRenderer.invoke('auth:login', data),
    validateSession: (data: { token: string }) =>
      ipcRenderer.invoke('auth:validate-session', data),
  },
  loans: {
    create: (data: {
      borrower: { type: 'existing'; id: number } | { type: 'new'; name: string }
      amount: number
      interestRate: number
      paymentFrequency: string
      startDate: string
      dueDate: string
    }) => ipcRenderer.invoke('loans:create', data),
    update: (
      id: number,
      data: {
        amount: number
        interestRate: number
        paymentFrequency: string
        startDate: string
        dueDate: string
      },
    ) => ipcRenderer.invoke('loans:update', { id, ...data }),
    delete: (id: number) => ipcRenderer.invoke('loans:delete', id),
    getAll: (params: { page: number; pageSize: number }) =>
      ipcRenderer.invoke('loans:get-all', params),
    getActive: (params: {
      page: number
      pageSize: number
      sorting: { column: string; direction: 'asc' | 'desc' } | null
      search?: string
    }) => ipcRenderer.invoke('loans:get-active', params),
    getActiveSummary: () => ipcRenderer.invoke('loans:get-active-summary'),
    getDue: (params: {
      page: number
      pageSize: number
      sorting: { column: string; direction: 'asc' | 'desc' } | null
      search?: string
    }) => ipcRenderer.invoke('loans:get-due', params),
    getOverdue: (params: {
      page: number
      pageSize: number
      sorting: { column: string; direction: 'asc' | 'desc' } | null
      search?: string
    }) => ipcRenderer.invoke('loans:get-overdue', params),
    getPaid: (params: {
      page: number
      pageSize: number
      sorting: { column: string; direction: 'asc' | 'desc' } | null
      search?: string
    }) => ipcRenderer.invoke('loans:get-paid', params),
    getWeeklyCollection: (params: {
      page: number
      pageSize: number
      sorting: { column: string; direction: 'asc' | 'desc' } | null
      search?: string
      weekStart: string
    }) => ipcRenderer.invoke('loans:get-weekly-collection', params),
    getWeeklySummary: (params: { weekStart: string; search?: string }) =>
      ipcRenderer.invoke('loans:get-weekly-summary', params),
    searchBorrowers: (query: string) =>
      ipcRenderer.invoke('loans:search-borrowers', query),
    getPayments: (loanId: number) =>
      ipcRenderer.invoke('loans:get-payments', loanId),
    createPayment: (data: {
      loanId: number
      amount: number
      paymentDate: string
    }) => ipcRenderer.invoke('loans:create-payment', data),
    updatePayment: (
      id: number,
      data: { amount?: number; paymentDate?: string },
    ) => ipcRenderer.invoke('loans:update-payment', id, data),
    deletePayment: (id: number) =>
      ipcRenderer.invoke('loans:delete-payment', id),
  },
})
