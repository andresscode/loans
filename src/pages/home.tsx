import { LogOutIcon, PlusIcon } from 'lucide-react'
import { useCallback, useEffect, useReducer, useState } from 'react'
import { LoanForm } from '@/components/blocks/loan-form'
import { LoansTable } from '@/components/blocks/loans-table'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'
import { loansService } from '@/services/loans'
import type {
  CreateLoanInput,
  LoanWithBorrower,
  UpdateLoanInput,
} from '@/types'

export function HomePage() {
  const { user, logout } = useAuth()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loans, setLoans] = useState<LoanWithBorrower[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [refreshToken, refresh] = useReducer((x: number) => x + 1, 0)
  const pageSize = 10

  const fetchLoans = useCallback(async () => {
    void refreshToken
    const result = await loansService.getAll(page, pageSize)
    setLoans(result.data)
    setTotal(result.total)
  }, [page, refreshToken])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  async function handleCreateLoan(data: CreateLoanInput) {
    setIsSubmitting(true)
    setFormError(null)
    try {
      const result = await loansService.create(data)
      if (result.success) {
        setDialogOpen(false)
        setPage(1)
        refresh()
      } else {
        setFormError(result.error)
      }
    } catch {
      setFormError('Error inesperado al crear el prestamo. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEditLoan(
    id: number,
    data: UpdateLoanInput,
  ): Promise<boolean> {
    const result = await loansService.update(id, data)
    if (result.success) {
      refresh()
      return true
    }
    return false
  }

  async function handleDeleteLoan(id: number): Promise<boolean> {
    const result = await loansService.delete(id)
    if (result.success) {
      refresh()
      return true
    }
    return false
  }

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-semibold text-base tracking-tight">
              Bienvenido, {user?.displayName}
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOutIcon />
            Cerrar sesion
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-6">
        {/* Subheader */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold text-lg tracking-tight">Prestamos</h2>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) setFormError(null)
            }}
          >
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <PlusIcon />
              Nuevo prestamo
            </Button>
            {dialogOpen && (
              <LoanForm
                isSubmitting={isSubmitting}
                error={formError}
                onSubmit={handleCreateLoan}
              />
            )}
          </Dialog>
        </div>

        {/* Loans Table */}
        <LoansTable
          loans={loans}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onEdit={handleEditLoan}
          onDelete={handleDeleteLoan}
        />
      </main>
    </div>
  )
}
