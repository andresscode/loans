import type { ActionResult, User } from '@/types'

const TOKEN_KEY = 'loans-app-session-token'

export const authService = {
  async hasUsers(): Promise<boolean> {
    return window.api.auth.hasUsers()
  },

  async setup(
    username: string,
    password: string,
    displayName: string,
  ): Promise<ActionResult<User>> {
    return window.api.auth.setup({ username, password, displayName })
  },

  async login(
    username: string,
    password: string,
  ): Promise<ActionResult<{ user: User; token: string }>> {
    return window.api.auth.login({ username, password })
  },

  async validateSession(): Promise<ActionResult<User>> {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      return { success: false, error: 'No hay sesión guardada' }
    }
    return window.api.auth.validateSession({ token })
  },

  saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  },
}
