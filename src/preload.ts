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
    searchBorrowers: (query: string) =>
      ipcRenderer.invoke('loans:search-borrowers', query),
  },
})
