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
  updateLoan,
} from './database/loans'
import {
  createPayment,
  deletePayment,
  getPaymentsByLoanId,
} from './database/payments'
import { createSession, validateSession } from './database/sessions'
import { authenticateUser, createUser, getUserCount } from './database/users'

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
