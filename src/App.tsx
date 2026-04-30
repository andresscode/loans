import './global.css'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
import { TooltipProvider } from './components/ui/tooltip'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <TooltipProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </HashRouter>
  )
}
