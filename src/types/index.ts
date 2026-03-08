export type ActionResult<T = void> =
  | ({ success: true } & (T extends void ? object : { data: T }))
  | { success: false; error: string }

export type User = {
  id: number
  username: string
  displayName: string
  createdAt: string
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
    api: { auth: AuthApi }
  }
}
