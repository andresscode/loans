import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export function HomePage() {
  const { user, logout } = useAuth()

  const welcomeMessage = user ? `Hello, ${user.displayName}!` : 'Home'

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4">
      <h1 className="font-bold text-4xl">{welcomeMessage}</h1>
      <Button variant="outline" onClick={logout}>
        Cerrar sesión
      </Button>
    </div>
  )
}
