import bcrypt from 'bcryptjs';
import { getDb } from './index';

type UserRow = {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
};

export function getUserCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return row.count;
}

export function createUser(username: string, password: string, displayName: string): UserRow {
  const passwordHash = bcrypt.hashSync(password, 10);
  const stmt = getDb().prepare(
    'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)'
  );
  const result = stmt.run(username, passwordHash, displayName);
  return {
    id: result.lastInsertRowid as number,
    username,
    display_name: displayName,
    created_at: new Date().toISOString(),
  };
}

export function authenticateUser(username: string, password: string): UserRow | null {
  const row = getDb().prepare(
    'SELECT id, username, password_hash, display_name, created_at FROM users WHERE username = ?'
  ).get(username) as (UserRow & { password_hash: string }) | undefined;

  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;

  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    created_at: row.created_at,
  };
}
