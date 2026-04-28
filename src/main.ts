import * as path from 'node:path'
import { app, BrowserWindow, ipcMain } from 'electron'
import {
  createBorrower,
  getBorrowerById,
  searchBorrowersByName,
} from './database/borrowers'
import { closeDatabase, getDb, initDatabase } from './database/index'
import {
  createLoan,
  deleteLoan,
  getAllLoansWithBorrowers,
  getAllLoansWithPaymentSummary,
  updateLoan,
} from './database/loans'
import {
  createPayment,
  deletePayment,
  getPaymentsByLoanId,
} from './database/payments'
import { seedDatabase } from './database/seed'
import { createSession, validateSession } from './database/sessions'
import { authenticateUser, createUser, getUserCount } from './database/users'
import { analyzeLoan } from './lib/loan-math'
import type {
  ActiveLoanRow,
  DueLoanRow,
  OverdueLoanRow,
  PaidLoanRow,
  PaymentFrequency,
  SortingParam,
  TabQueryParams,
} from './types'

function toUser(row: {
  id: number
  username: string
  display_name: string
  created_at: string
}) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
  }
}

function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

function registerIpcHandlers() {
  ipcMain.handle('auth:has-users', () => {
    return getUserCount() > 0
  })

  ipcMain.handle(
    'auth:setup',
    (
      _event,
      data: { username: string; password: string; displayName: string },
    ) => {
      try {
        if (getUserCount() > 0) {
          return { success: false, error: 'Ya existe un usuario configurado' }
        }
        const row = createUser(data.username, data.password, data.displayName)
        return { success: true, data: toUser(row) }
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          'code' in err &&
          err.code === 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          return { success: false, error: 'El nombre de usuario ya existe' }
        }
        return { success: false, error: 'Error al crear el usuario' }
      }
    },
  )

  ipcMain.handle(
    'auth:login',
    (_event, data: { username: string; password: string }) => {
      const row = authenticateUser(data.username, data.password)
      if (!row) {
        return { success: false, error: 'Usuario o contraseña incorrectos' }
      }
      const token = createSession(row.id)
      return { success: true, data: { user: toUser(row), token } }
    },
  )

  ipcMain.handle('auth:validate-session', (_event, data: { token: string }) => {
    const row = validateSession(data.token)
    if (!row) {
      return { success: false, error: 'Sesión inválida o expirada' }
    }
    return {
      success: true,
      data: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        createdAt: row.created_at,
      },
    }
  })

  ipcMain.handle(
    'loans:get-all',
    (_event, params: { page: number; pageSize: number }) => {
      const { rows, total } = getAllLoansWithBorrowers(
        params.page,
        params.pageSize,
      )
      return {
        data: rows.map((row) => ({
          id: row.id,
          borrowerId: row.borrower_id,
          amount: row.amount,
          interestRate: row.interest_rate,
          paymentFrequency: row.payment_frequency,
          startDate: row.start_date,
          dueDate: row.due_date,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          borrowerName: row.borrower_name,
        })),
        total,
        page: params.page,
        pageSize: params.pageSize,
      }
    },
  )

  ipcMain.handle('loans:search-borrowers', (_event, query: string) => {
    const rows = searchBorrowersByName(query)
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  })

  ipcMain.handle(
    'loans:create',
    (
      _event,
      data: {
        borrower:
          | { type: 'existing'; id: number }
          | { type: 'new'; name: string }
        amount: number
        interestRate: number
        paymentFrequency: string
        startDate: string
        dueDate: string
      },
    ) => {
      try {
        const db = getDb()
        const result = db.transaction(() => {
          let borrowerId: number

          if (data.borrower.type === 'existing') {
            const borrower = getBorrowerById(data.borrower.id)
            if (!borrower) {
              throw new Error('El prestatario no existe')
            }
            borrowerId = borrower.id
          } else {
            const borrower = createBorrower(data.borrower.name)
            borrowerId = borrower.id
          }

          const loan = createLoan({
            borrowerId,
            amount: data.amount,
            interestRate: data.interestRate,
            paymentFrequency: data.paymentFrequency,
            startDate: data.startDate,
            dueDate: data.dueDate,
          })

          return {
            id: loan.id,
            borrowerId: loan.borrower_id,
            amount: loan.amount,
            interestRate: loan.interest_rate,
            paymentFrequency: loan.payment_frequency,
            startDate: loan.start_date,
            dueDate: loan.due_date,
            createdAt: loan.created_at,
            updatedAt: loan.updated_at,
          }
        })()

        return { success: true, data: result }
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          'code' in err &&
          (err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          return {
            success: false,
            error: 'Ya existe un prestatario con ese nombre',
          }
        }
        if (err instanceof Error) {
          return { success: false, error: err.message }
        }
        return { success: false, error: 'Error al crear el préstamo' }
      }
    },
  )

  ipcMain.handle(
    'loans:update',
    (
      _event,
      data: {
        id: number
        amount: number
        interestRate: number
        paymentFrequency: string
        startDate: string
        dueDate: string
      },
    ) => {
      try {
        const row = updateLoan(data.id, {
          amount: data.amount,
          interestRate: data.interestRate,
          paymentFrequency: data.paymentFrequency,
          startDate: data.startDate,
          dueDate: data.dueDate,
        })
        if (!row) {
          return { success: false, error: 'El préstamo no existe' }
        }
        return {
          success: true,
          data: {
            id: row.id,
            borrowerId: row.borrower_id,
            amount: row.amount,
            interestRate: row.interest_rate,
            paymentFrequency: row.payment_frequency,
            startDate: row.start_date,
            dueDate: row.due_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          },
        }
      } catch {
        return { success: false, error: 'Error al actualizar el préstamo' }
      }
    },
  )

  ipcMain.handle('loans:delete', (_event, id: number) => {
    try {
      const deleted = deleteLoan(id)
      if (!deleted) {
        return { success: false, error: 'El préstamo no existe' }
      }
      return { success: true }
    } catch {
      return { success: false, error: 'Error al eliminar el préstamo' }
    }
  })

  ipcMain.handle('loans:get-payments', (_event, loanId: number) => {
    const rows = getPaymentsByLoanId(loanId)
    return rows.map((row) => ({
      id: row.id,
      loanId: row.loan_id,
      amount: row.amount,
      paymentDate: row.payment_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  })

  ipcMain.handle(
    'loans:create-payment',
    (_event, data: { loanId: number; amount: number; paymentDate: string }) => {
      try {
        const row = createPayment(data)
        return {
          success: true,
          data: {
            id: row.id,
            loanId: row.loan_id,
            amount: row.amount,
            paymentDate: row.payment_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          },
        }
      } catch {
        return { success: false, error: 'Error al crear el pago' }
      }
    },
  )

  ipcMain.handle('loans:delete-payment', (_event, id: number) => {
    try {
      const deleted = deletePayment(id)
      if (!deleted) {
        return { success: false, error: 'El pago no existe' }
      }
      return { success: true }
    } catch {
      return { success: false, error: 'Error al eliminar el pago' }
    }
  })

  // Helper to sort and paginate
  function sortBy<T>(arr: T[], column: string, direction: 'asc' | 'desc'): T[] {
    return [...arr].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[column]
      const bVal = (b as Record<string, unknown>)[column]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
  }

  function paginate<T>(
    arr: T[],
    params: TabQueryParams,
    defaultSort: { column: string; direction: 'asc' | 'desc' },
  ) {
    const sorting: SortingParam = params.sorting ?? defaultSort
    const sorted = sortBy(arr, sorting.column, sorting.direction)
    const start = (params.page - 1) * params.pageSize
    return {
      data: sorted.slice(start, start + params.pageSize),
      total: arr.length,
      page: params.page,
      pageSize: params.pageSize,
    }
  }

  function analyzeAllLoans() {
    const rows = getAllLoansWithPaymentSummary()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return rows
      .map((row) => {
        const analysis = analyzeLoan({
          amount: row.amount,
          interestRate: row.interest_rate,
          paymentFrequency: row.payment_frequency as PaymentFrequency,
          startDate: parseLocalDate(row.start_date),
          dueDate: parseLocalDate(row.due_date),
          totalPaid: row.total_paid,
          today,
        })
        return analysis ? { row, analysis } : null
      })
      .filter((x) => x !== null)
  }

  ipcMain.handle('loans:get-active', (_event, params: TabQueryParams) => {
    const all = analyzeAllLoans()
    const active: ActiveLoanRow[] = all
      .filter(({ analysis }) => !analysis.isFullyPaid)
      .map(({ row, analysis }) => ({
        id: row.id,
        borrowerId: row.borrower_id,
        amount: row.amount,
        interestRate: row.interest_rate,
        paymentFrequency: row.payment_frequency as PaymentFrequency,
        startDate: row.start_date,
        dueDate: row.due_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        borrowerName: row.borrower_name,
        totalToRepay: analysis.totalToRepay,
        totalPaid: analysis.totalPaid,
        pending: Math.max(0, analysis.totalToRepay - analysis.totalPaid),
        progress: analysis.progress,
      }))
    return paginate(active, params, { column: 'createdAt', direction: 'desc' })
  })

  ipcMain.handle('loans:get-due', (_event, params: TabQueryParams) => {
    const all = analyzeAllLoans()
    const due: DueLoanRow[] = all
      .filter(({ analysis }) => analysis.isDueThisWeek && !analysis.isFullyPaid)
      .map(({ row, analysis }) => ({
        id: row.id,
        borrowerName: row.borrower_name,
        currentPaymentAmount: analysis.currentPaymentAmount,
        overduePaymentsTotal: analysis.overdueTotal,
        totalDue: analysis.currentPaymentAmount + analysis.overdueTotal,
        paymentFrequency: row.payment_frequency as PaymentFrequency,
        amount: row.amount,
      }))
    return paginate(due, params, { column: 'totalDue', direction: 'desc' })
  })

  ipcMain.handle('loans:get-overdue', (_event, params: TabQueryParams) => {
    const all = analyzeAllLoans()
    const overdue: OverdueLoanRow[] = all
      .filter(
        ({ analysis }) => analysis.overdueCount > 0 && !analysis.isFullyPaid,
      )
      .map(({ row, analysis }) => ({
        id: row.id,
        borrowerName: row.borrower_name,
        overdueCount: analysis.overdueCount,
        overdueTotal: analysis.overdueTotal,
        lastPaymentDate: row.last_payment_date,
        amount: row.amount,
      }))
    return paginate(overdue, params, {
      column: 'overdueTotal',
      direction: 'desc',
    })
  })

  ipcMain.handle('loans:get-paid', (_event, params: TabQueryParams) => {
    const all = analyzeAllLoans()
    const paid: PaidLoanRow[] = all
      .filter(({ analysis }) => analysis.isFullyPaid)
      .map(({ row, analysis }) => ({
        id: row.id,
        borrowerName: row.borrower_name,
        amount: row.amount,
        totalInterest: analysis.totalToRepay - row.amount,
        totalPaid: analysis.totalPaid,
        startDate: row.start_date,
        closedDate: row.last_payment_date ?? row.due_date,
      }))
    return paginate(paid, params, { column: 'closedDate', direction: 'desc' })
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  initDatabase()
  // DEV ONLY: seed test data — remove when no longer testing
  if (!app.isPackaged) {
    seedDatabase()
  }
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('quit', () => {
  closeDatabase()
})
