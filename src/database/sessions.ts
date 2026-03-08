import crypto from 'node:crypto'
import { getDb } from './index'

const SESSION_DURATION_DAYS = 30

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  getDb()
    .prepare(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
    )
    .run(userId, token, expiresAt.toISOString())

  return token
}

type SessionRow = {
  user_id: number
  username: string
  display_name: string
  created_at: string
}

export function validateSession(token: string): SessionRow | null {
  const row = getDb()
    .prepare(`
    SELECT s.user_id, u.username, u.display_name, u.created_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `)
    .get(token) as SessionRow | undefined

  return row ?? null
}
