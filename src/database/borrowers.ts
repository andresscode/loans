import { getDb } from './index'

type BorrowerRow = {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export function createBorrower(name: string): BorrowerRow {
  const result = getDb()
    .prepare('INSERT INTO borrowers (name) VALUES (?)')
    .run(name)
  return {
    id: result.lastInsertRowid as number,
    name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export function getBorrowerById(id: number): BorrowerRow | undefined {
  return getDb().prepare('SELECT * FROM borrowers WHERE id = ?').get(id) as
    | BorrowerRow
    | undefined
}

export function getAllBorrowers(): BorrowerRow[] {
  return getDb()
    .prepare('SELECT * FROM borrowers ORDER BY name')
    .all() as BorrowerRow[]
}

export function updateBorrower(
  id: number,
  name: string,
): BorrowerRow | undefined {
  getDb()
    .prepare(
      "UPDATE borrowers SET name = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(name, id)
  return getBorrowerById(id)
}

export function deleteBorrower(id: number): boolean {
  const result = getDb().prepare('DELETE FROM borrowers WHERE id = ?').run(id)
  return result.changes > 0
}
