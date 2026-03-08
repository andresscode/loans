# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mis Prestamos** is a loan management desktop app built with Electron + React + Vite. UI text is in Spanish.

## Commands

- `pnpm dev` — Start dev server (compiles Electron main/preload, launches Vite + Electron concurrently)
- `pnpm build` — Production build (TypeScript compile + Vite build)
- `pnpm check` — Type-check renderer code (`tsc --noEmit`)

## Architecture

**Two TypeScript configs:**
- `tsconfig.node.json` — Compiles Electron main process files (`src/main.ts`, `src/preload.ts`) to `dist-electron/` as CommonJS
- `tsconfig.json` — Renderer (React) code in `src/`, bundled by Vite

**Renderer (React) structure:**
- `src/renderer.tsx` — Entry point, mounts `<App />`
- `src/App.tsx` — HashRouter with auth-protected routes
- `src/pages/` — Route pages (login, home)
- `src/contexts/` — React contexts (auth)
- `src/services/` — Business logic (auth service)
- `src/types/index.ts` — Shared types (e.g., `ActionResult<T>` discriminated union)
- `src/components/ui/` — shadcn/ui components (radix-nova style)
- `src/components/blocks/` — Composite components (login form)

**Electron main process:**
- `src/main.ts` — Creates BrowserWindow, loads Vite dev server or built files
- `src/preload.ts` — Exposes version info via `contextBridge`

## Database

- **SQLite** via `better-sqlite3` (synchronous), stored at `app.getPath('userData')/mis-prestamos.db`
- Schema defined inline in `src/database/index.ts` using `CREATE TABLE IF NOT EXISTS`
- Pragmas: WAL mode, foreign keys ON
- Query pattern: `getDb().prepare(sql).run/get/all()` with parameterized queries
- Each domain gets its own file in `src/database/` (e.g., `users.ts`, `borrowers.ts`, `loans.ts`, `payments.ts`)
- No ORM, no migrations — schema created on app startup

## Key Conventions

- **Path alias:** `@/` maps to `src/` (configured in both tsconfig.json and vite.config.ts)
- **UI components:** shadcn/ui v4 with radix-nova style, Tailwind CSS v4, lucide-react icons
- **Package manager:** pnpm only. NEVER use npm, npx, or yarn.
- **ActionResult pattern:** Services return `ActionResult<T>` — a discriminated union of `{ success: true, data: T }` or `{ success: false, error: string }`
