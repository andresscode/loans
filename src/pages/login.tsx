import { useState } from 'react'
import { useNavigate } from 'react-router'
import { LoginForm } from '@/components/blocks/login-form'
import { useAuth } from '@/contexts/auth-context'

export function LoginPage() {
  const { login, setup, isFirstLaunch } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(username: string, password: string) {
    setError(null)
    const result = await login(username, password)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
  }

  async function handleSetup(
    username: string,
    password: string,
    displayName: string,
  ) {
    setError(null)
    const result = await setup(username, password, displayName)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}
        <LoginForm
          mode={isFirstLaunch ? 'setup' : 'login'}
          onLogin={handleLogin}
          onSetup={handleSetup}
        />
      </div>
    </div>
  )
}
