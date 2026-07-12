# AMD GA4 Real-Data Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn AMD from a mock-data prototype into a real app that logs users in, connects a live GA4 property via an encrypted service-account key, pulls real GA4 data through a reusable connector, and shows it on the dashboard — deployed on Vercel.

**Architecture:** Next.js App Router. Auth.js (Credentials, JWT) gates the whole site with seeded users. Postgres (Vercel/Neon) via Drizzle holds `users`, `connections`, `report_snapshots`. Platform credentials are pasted in the Connections page, AES-256-GCM–encrypted, and stored in `connections.credentials`. A `Connector` interface is implemented first for GA4 (`@google-analytics/data` + service account); the dashboard reads normalized daily metrics from `report_snapshots`, refreshing from the connector on demand. Other platforms keep mock/placeholder states until their connectors land in later phases.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM + `postgres` (postgres.js), Auth.js v5 (`next-auth`), `bcryptjs` (pure-JS hashing, no native build), `@google-analytics/data`, `zod`, Node `crypto` (built-in AES-256-GCM), Vitest for unit tests.

## Global Constraints

- Single shared workspace (556 data). No public signup; users are seeded. Data is shared across users.
- All platform API calls run server-side only. No credential or token ever reaches the client bundle.
- Credentials stored encrypted at rest (AES-256-GCM) in `connections.credentials`; never in env, git, or logs.
- Encryption key from `APP_ENCRYPTION_KEY` (base64, 32 bytes). DB from `DATABASE_URL`. Auth from `AUTH_SECRET`.
- The handoff markdown stays out of git (`.gitignore` already excludes `*交接*.md`).
- Package scripts run through pnpm; `next build` must stay green (pre-push hook runs it).
- GA4 default property: `298707336`. Key Events: `job_search_start`, `job_search_submit`, `result_view`.
- Do not commit any real service-account JSON. Test connectors against mocked clients only.

---

## File Structure

- `drizzle.config.ts` — Drizzle Kit config (schema path, DB url).
- `db/schema.ts` — tables: `users`, `connections`, `reportSnapshots`; enums; inferred types.
- `db/index.ts` — postgres.js client + Drizzle instance (server-only).
- `lib/crypto.ts` — `encrypt()` / `decrypt()` (AES-256-GCM).
- `lib/env.ts` — validated env access (zod).
- `auth.ts` — Auth.js config (Credentials provider, JWT, callbacks).
- `middleware.ts` — route protection.
- `app/api/auth/[...nextauth]/route.ts` — Auth.js handlers.
- `app/login/page.tsx` — real login form (replaces mock link).
- `scripts/seed.ts` — seed users.
- `lib/connectors/types.ts` — `Connector`, `DailyMetrics`, `Platform`, `ConnStatus`.
- `lib/connectors/ga4.ts` — GA4 connector (service account + Data API).
- `lib/connectors/index.ts` — registry mapping platform → connector.
- `lib/connections-repo.ts` — DB access for connections (get/list/upsert/updateStatus).
- `lib/report-service.ts` — snapshot cache read/upsert + refresh orchestration.
- `app/(app)/connections/page.tsx` — real data + save action wiring.
- `app/(app)/connections/actions.ts` — server actions: save GA4 credential, refresh.
- `app/(app)/dashboard/page.tsx` — read real GA4 section from `report-service`.
- `components/Ga4Panel.tsx` — accept props instead of importing mock.
- Test files under `**/*.test.ts` (Vitest).

---

## Task 1: Database schema, client, and Drizzle setup

**Files:**
- Create: `db/schema.ts`, `db/index.ts`, `drizzle.config.ts`
- Modify: `package.json` (deps + scripts)
- Modify: `lib/env.ts` (create)

**Interfaces:**
- Produces: `db` (Drizzle instance), tables `users`, `connections`, `reportSnapshots`, and inferred types `User`, `Connection`, `NewConnection`, `ReportSnapshot`. Platform enum values: `'ga4' | 'google_ads' | 'meta_ads' | 'x_ads'`. Status enum: `'connected' | 'error' | 'disconnected'`.

- [ ] **Step 1: Add dependencies**

```bash
pnpm add drizzle-orm postgres zod bcryptjs next-auth@beta @google-analytics/data
pnpm add -D drizzle-kit vitest @types/bcryptjs
```

- [ ] **Step 2: Create env accessor** — `lib/env.ts`

```ts
import 'server-only'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export const env = {
  DATABASE_URL: () => required('DATABASE_URL'),
  APP_ENCRYPTION_KEY: () => required('APP_ENCRYPTION_KEY'),
  AUTH_SECRET: () => required('AUTH_SECRET'),
}
```

- [ ] **Step 3: Create schema** — `db/schema.ts`

```ts
import { pgTable, pgEnum, uuid, text, timestamp, jsonb, date, unique } from 'drizzle-orm/pg-core'

export const platformEnum = pgEnum('platform', ['ga4', 'google_ads', 'meta_ads', 'x_ads'])
export const connStatusEnum = pgEnum('conn_status', ['connected', 'error', 'disconnected'])
export const snapshotSourceEnum = pgEnum('snapshot_source', ['api', 'upload'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const connections = pgTable('connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  platform: platformEnum('platform').notNull().unique(),
  label: text('label').notNull(),
  accountId: text('account_id'),
  credentials: text('credentials'), // AES-256-GCM encrypted blob
  status: connStatusEnum('status').notNull().default('disconnected'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const reportSnapshots = pgTable(
  'report_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    platform: platformEnum('platform').notNull(),
    date: date('date').notNull(),
    metrics: jsonb('metrics').notNull(),
    source: snapshotSourceEnum('source').notNull().default('api'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ uniqPlatformDate: unique().on(t.platform, t.date) })
)

export type User = typeof users.$inferSelect
export type Connection = typeof connections.$inferSelect
export type NewConnection = typeof connections.$inferInsert
export type ReportSnapshot = typeof reportSnapshots.$inferSelect
```

- [ ] **Step 4: Create DB client** — `db/index.ts`

```ts
import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/lib/env'
import * as schema from './schema'

const client = postgres(env.DATABASE_URL(), { prepare: false })
export const db = drizzle(client, { schema })
export * from './schema'
```

- [ ] **Step 5: Create Drizzle config** — `drizzle.config.ts`

```ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
} satisfies Config
```

- [ ] **Step 6: Add scripts to package.json**

Add to `scripts`: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:seed": "node --experimental-strip-types scripts/seed.ts"`, `"test": "vitest run"`.

- [ ] **Step 7: Generate the migration**

Run: `pnpm db:generate`
Expected: creates `db/migrations/0000_*.sql` with the three tables and enums.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml db/ drizzle.config.ts lib/env.ts
git commit -m "feat: add drizzle schema, db client, env accessor"
```

---

## Task 2: AES-256-GCM encryption utility

**Files:**
- Create: `lib/crypto.ts`, `lib/crypto.test.ts`

**Interfaces:**
- Produces: `encrypt(plaintext: string): string` and `decrypt(blob: string): string`. Blob format: base64 of `iv(12) || authTag(16) || ciphertext`. Key read from `APP_ENCRYPTION_KEY` (base64, must decode to 32 bytes).

- [ ] **Step 1: Write the failing test** — `lib/crypto.test.ts`

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'node:crypto'

beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('crypto', () => {
  it('round-trips plaintext', async () => {
    const { encrypt, decrypt } = await import('./crypto')
    const secret = '{"type":"service_account","private_key":"abc"}'
    const blob = encrypt(secret)
    expect(blob).not.toContain('service_account')
    expect(decrypt(blob)).toBe(secret)
  })

  it('produces different ciphertext each call (random IV)', async () => {
    const { encrypt } = await import('./crypto')
    expect(encrypt('same')).not.toBe(encrypt('same'))
  })

  it('throws on tampered blob', async () => {
    const { encrypt, decrypt } = await import('./crypto')
    const blob = encrypt('data')
    const tampered = Buffer.from(blob, 'base64')
    tampered[tampered.length - 1] ^= 0xff
    expect(() => decrypt(tampered.toString('base64'))).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/crypto.test.ts`
Expected: FAIL — cannot find module './crypto'.

- [ ] **Step 3: Write implementation** — `lib/crypto.ts`

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const IV_LEN = 12
const TAG_LEN = 16

function key(): Buffer {
  const k = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? '', 'base64')
  if (k.length !== 32) throw new Error('APP_ENCRYPTION_KEY must decode to 32 bytes')
  return k
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decrypt(blob: string): string {
  const buf = Buffer.from(blob, 'base64')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/crypto.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/crypto.ts lib/crypto.test.ts
git commit -m "feat: add AES-256-GCM credential encryption"
```

---

## Task 3: Auth.js login, middleware, and user seeding

**Files:**
- Create: `auth.ts`, `middleware.ts`, `app/api/auth/[...nextauth]/route.ts`, `scripts/seed.ts`
- Modify: `app/login/page.tsx` (real form), `components/Sidebar.tsx` (real sign-out)

**Interfaces:**
- Consumes: `db`, `users` (Task 1); `bcryptjs`.
- Produces: `auth()` (session getter), `signIn`, `signOut` from `auth.ts`. Middleware redirects unauthenticated requests to `/login`.

- [ ] **Step 1: Create Auth.js config** — `auth.ts`

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, users } from '@/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '').toLowerCase()
        const password = String(creds?.password ?? '')
        if (!email || !password) return null
        const [user] = await db.select().from(users).where(eq(users.email, email))
        if (!user) return null
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
})
```

- [ ] **Step 2: Create route handler** — `app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 3: Create middleware** — `middleware.ts`

```ts
import { auth } from '@/auth'

export default auth((req) => {
  const isLogin = req.nextUrl.pathname.startsWith('/login')
  const isAuthApi = req.nextUrl.pathname.startsWith('/api/auth')
  if (!req.auth && !isLogin && !isAuthApi) {
    const url = new URL('/login', req.nextUrl.origin)
    return Response.redirect(url)
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Replace login page with a real form** — `app/login/page.tsx`

Replace the `<Link href="/dashboard">` with a `<form action={...}>` that calls a server action invoking `signIn('credentials', { email, password, redirectTo: '/dashboard' })`. Keep the existing visual styling. Add an inline server action at top of file:

```tsx
import { signIn } from '@/auth'

async function login(formData: FormData) {
  'use server'
  await signIn('credentials', {
    email: String(formData.get('email')),
    password: String(formData.get('password')),
    redirectTo: '/dashboard',
  })
}
```

Wire `<form action={login}>` around the email/password inputs, and change the "进入看板" link into `<button type="submit">`.

- [ ] **Step 5: Create seed script** — `scripts/seed.ts`

```ts
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db, users } from '../db'

const seedUsers = [
  { email: 'yaku@team.com', name: 'Yaku', password: process.env.SEED_PW_YAKU ?? 'change-me-1' },
  { email: 'jason@team.com', name: 'Jason', password: process.env.SEED_PW_JASON ?? 'change-me-2' },
]

for (const u of seedUsers) {
  const passwordHash = await bcrypt.hash(u.password, 10)
  await db
    .insert(users)
    .values({ email: u.email, name: u.name, passwordHash })
    .onConflictDoUpdate({ target: users.email, set: { passwordHash, name: u.name } })
  console.log(`seeded ${u.email}`)
}
process.exit(0)
```

- [ ] **Step 6: Update sidebar sign-out** — `components/Sidebar.tsx`

Replace the `<Link href="/login">` logout with a form calling a `signOut` server action:

```tsx
// in a server action file or inline where allowed
import { signOut } from '@/auth'
async function doSignOut() { 'use server'; await signOut({ redirectTo: '/login' }) }
```

Render `<form action={doSignOut}><button type="submit" aria-label="退出"><LogOut size={16} /></button></form>`.

- [ ] **Step 7: Verify build**

Run: `pnpm build`
Expected: compiles; `/login` and `/api/auth/[...nextauth]` routes present.

- [ ] **Step 8: Commit**

```bash
git add auth.ts middleware.ts app/api/auth scripts/seed.ts app/login/page.tsx components/Sidebar.tsx
git commit -m "feat: Auth.js credentials login, middleware guard, user seeding"
```

---

## Task 4: Connector types + GA4 connector

**Files:**
- Create: `lib/connectors/types.ts`, `lib/connectors/ga4.ts`, `lib/connectors/ga4.test.ts`, `lib/connectors/index.ts`

**Interfaces:**
- Consumes: `decrypt` (Task 2), `@google-analytics/data`.
- Produces:
  - `type Platform = 'ga4' | 'google_ads' | 'meta_ads' | 'x_ads'`
  - `interface DailyMetrics { date: string; spend?: number; impressions?: number; clicks?: number; ctr?: number; cpc?: number; cpm?: number; visitors?: number; sessions?: number; avgEngagementSec?: number; keyEvents?: Record<string, number>; organicBySource?: Record<string, number> }`
  - `interface Connector { platform: Platform; fetchDaily(cfg: ConnectorConfig, range: { start: string; end: string }): Promise<DailyMetrics[]>; getStatus(cfg: ConnectorConfig): Promise<{ ok: boolean; error?: string }> }`
  - `interface ConnectorConfig { accountId: string | null; credentials: string | null }` (credentials = encrypted blob)
  - `ga4Connector: Connector`
  - `getConnector(platform: Platform): Connector | null`

- [ ] **Step 1: Create types** — `lib/connectors/types.ts`

```ts
export type Platform = 'ga4' | 'google_ads' | 'meta_ads' | 'x_ads'

export interface DailyMetrics {
  date: string
  spend?: number
  impressions?: number
  clicks?: number
  ctr?: number
  cpc?: number
  cpm?: number
  visitors?: number
  sessions?: number
  avgEngagementSec?: number
  keyEvents?: Record<string, number>
  organicBySource?: Record<string, number>
}

export interface ConnectorConfig {
  accountId: string | null
  credentials: string | null // encrypted blob
}

export interface Connector {
  platform: Platform
  fetchDaily(cfg: ConnectorConfig, range: { start: string; end: string }): Promise<DailyMetrics[]>
  getStatus(cfg: ConnectorConfig): Promise<{ ok: boolean; error?: string }>
}

export const KEY_EVENTS = ['job_search_start', 'job_search_submit', 'result_view'] as const
```

- [ ] **Step 2: Write the failing test** — `lib/connectors/ga4.test.ts`

The GA4 client is injected so we can mock it. Test the normalization of a fake `runReport` response into `DailyMetrics`.

```ts
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { randomBytes } from 'node:crypto'

beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('ga4 normalize', () => {
  it('maps a runReport response into DailyMetrics per date', async () => {
    const { normalizeGa4 } = await import('./ga4')
    const resp = {
      rows: [
        {
          dimensionValues: [{ value: '20260711' }, { value: 'Organic Search' }],
          metricValues: [{ value: '96' }, { value: '110' }, { value: '90' }],
        },
        {
          dimensionValues: [{ value: '20260711' }, { value: 'Direct' }],
          metricValues: [{ value: '47' }, { value: '52' }, { value: '80' }],
        },
      ],
    }
    const out = normalizeGa4(resp as any)
    const day = out.find((d) => d.date === '2026-07-11')!
    expect(day.visitors).toBe(143) // 96 + 47 (activeUsers summed)
    expect(day.organicBySource).toEqual({ 'Organic Search': 96, Direct: 47 })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test lib/connectors/ga4.test.ts`
Expected: FAIL — `normalizeGa4` not exported.

- [ ] **Step 4: Implement GA4 connector** — `lib/connectors/ga4.ts`

```ts
import 'server-only'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { decrypt } from '@/lib/crypto'
import type { Connector, ConnectorConfig, DailyMetrics } from './types'
import { KEY_EVENTS } from './types'

interface Ga4Row {
  dimensionValues?: { value?: string | null }[]
  metricValues?: { value?: string | null }[]
}
interface Ga4Response {
  rows?: Ga4Row[]
}

function ymd(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

// dimensions: [date, sessionSource/Medium channel]; metrics: [activeUsers, sessions, avgEngagement]
export function normalizeGa4(resp: Ga4Response): DailyMetrics[] {
  const byDate = new Map<string, DailyMetrics>()
  for (const row of resp.rows ?? []) {
    const rawDate = row.dimensionValues?.[0]?.value ?? ''
    const channel = row.dimensionValues?.[1]?.value ?? 'Unknown'
    const users = Number(row.metricValues?.[0]?.value ?? 0)
    const sessions = Number(row.metricValues?.[1]?.value ?? 0)
    if (!rawDate) continue
    const date = ymd(rawDate)
    const d = byDate.get(date) ?? { date, visitors: 0, sessions: 0, organicBySource: {} }
    d.visitors = (d.visitors ?? 0) + users
    d.sessions = (d.sessions ?? 0) + sessions
    d.organicBySource![channel] = (d.organicBySource![channel] ?? 0) + users
    byDate.set(date, d)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function client(cfg: ConnectorConfig): BetaAnalyticsDataClient {
  if (!cfg.credentials) throw new Error('GA4 not connected')
  const sa = JSON.parse(decrypt(cfg.credentials))
  return new BetaAnalyticsDataClient({
    credentials: { client_email: sa.client_email, private_key: sa.private_key },
    projectId: sa.project_id,
  })
}

async function runTraffic(cfg: ConnectorConfig, range: { start: string; end: string }) {
  const [resp] = await client(cfg).runReport({
    property: `properties/${cfg.accountId}`,
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }],
  })
  return resp as Ga4Response
}

async function runKeyEvents(cfg: ConnectorConfig, range: { start: string; end: string }) {
  const [resp] = await client(cfg).runReport({
    property: `properties/${cfg.accountId}`,
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'date' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: [...KEY_EVENTS] },
      },
    },
  })
  return resp as Ga4Response
}

function mergeKeyEvents(base: DailyMetrics[], resp: Ga4Response): DailyMetrics[] {
  const map = new Map(base.map((d) => [d.date, d]))
  for (const row of resp.rows ?? []) {
    const date = ymd(row.dimensionValues?.[0]?.value ?? '')
    const name = row.dimensionValues?.[1]?.value ?? ''
    const count = Number(row.metricValues?.[0]?.value ?? 0)
    const d = map.get(date) ?? { date, keyEvents: {} }
    d.keyEvents = d.keyEvents ?? {}
    d.keyEvents[name] = (d.keyEvents[name] ?? 0) + count
    map.set(date, d)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export const ga4Connector: Connector = {
  platform: 'ga4',
  async fetchDaily(cfg, range) {
    const traffic = normalizeGa4(await runTraffic(cfg, range))
    return mergeKeyEvents(traffic, await runKeyEvents(cfg, range))
  },
  async getStatus(cfg) {
    try {
      if (!cfg.credentials || !cfg.accountId) return { ok: false, error: 'not configured' }
      const today = new Date().toISOString().slice(0, 10)
      await runTraffic(cfg, { start: today, end: today })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'unknown error' }
    }
  },
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test lib/connectors/ga4.test.ts`
Expected: PASS.

- [ ] **Step 6: Create registry** — `lib/connectors/index.ts`

```ts
import type { Connector, Platform } from './types'
import { ga4Connector } from './ga4'

const registry: Partial<Record<Platform, Connector>> = {
  ga4: ga4Connector,
}

export function getConnector(platform: Platform): Connector | null {
  return registry[platform] ?? null
}
export * from './types'
```

- [ ] **Step 7: Commit**

```bash
git add lib/connectors
git commit -m "feat: connector interface + GA4 connector (service account)"
```

---

## Task 5: Connections repo + save/refresh actions + real Connections page

**Files:**
- Create: `lib/connections-repo.ts`, `app/(app)/connections/actions.ts`
- Modify: `app/(app)/connections/page.tsx`

**Interfaces:**
- Consumes: `db`, `connections` (Task 1); `encrypt` (Task 2); `getConnector` (Task 4).
- Produces:
  - `listConnections(): Promise<Connection[]>`
  - `getConnection(platform): Promise<Connection | undefined>`
  - `saveGa4Credential(propertyId: string, serviceAccountJson: string): Promise<void>` (server action) — validates JSON, encrypts, upserts row with status via `getStatus`.

- [ ] **Step 1: Create repo** — `lib/connections-repo.ts`

```ts
import 'server-only'
import { eq } from 'drizzle-orm'
import { db, connections, type Connection } from '@/db'
import type { Platform } from '@/lib/connectors'

export async function listConnections(): Promise<Connection[]> {
  return db.select().from(connections)
}

export async function getConnection(platform: Platform): Promise<Connection | undefined> {
  const [row] = await db.select().from(connections).where(eq(connections.platform, platform))
  return row
}

export async function upsertConnection(row: {
  platform: Platform
  label: string
  accountId: string | null
  credentials: string | null
  status: 'connected' | 'error' | 'disconnected'
  lastError: string | null
}): Promise<void> {
  await db
    .insert(connections)
    .values({ ...row, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: connections.platform,
      set: { ...row, updatedAt: new Date() },
    })
}
```

- [ ] **Step 2: Create actions** — `app/(app)/connections/actions.ts`

```ts
'use server'

import { z } from 'zod'
import { encrypt } from '@/lib/crypto'
import { getConnector } from '@/lib/connectors'
import { upsertConnection } from '@/lib/connections-repo'
import { revalidatePath } from 'next/cache'

const saJsonSchema = z.object({
  type: z.literal('service_account'),
  client_email: z.string().email(),
  private_key: z.string().min(1),
  project_id: z.string().min(1),
})

export async function saveGa4Credential(formData: FormData): Promise<void> {
  const propertyId = String(formData.get('propertyId') ?? '').trim()
  const raw = String(formData.get('serviceAccountJson') ?? '').trim()
  if (!propertyId) throw new Error('请填写 GA4 Property ID')

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('服务账号 JSON 格式无效')
  }
  const sa = saJsonSchema.parse(parsed)

  const credentials = encrypt(JSON.stringify(sa))
  const connector = getConnector('ga4')!
  const status = await connector.getStatus({ accountId: propertyId, credentials })

  await upsertConnection({
    platform: 'ga4',
    label: 'GA4',
    accountId: propertyId,
    credentials,
    status: status.ok ? 'connected' : 'error',
    lastError: status.ok ? null : (status.error ?? 'unknown error'),
  })
  revalidatePath('/connections')
  revalidatePath('/dashboard')
}
```

- [ ] **Step 3: Wire the Connections page to real data** — `app/(app)/connections/page.tsx`

Replace the static `connections` import with `await listConnections()`. Keep the four cards, but derive each card's status/accountId from the DB rows (falling back to `disconnected` when a platform has no row). For the GA4 card, render a small form (property ID input + textarea for the SA JSON + submit) that calls `saveGa4Credential`. Keep the other three platforms as visual placeholders (their save actions come in later phases). Preserve existing styling and status badges.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: compiles.

- [ ] **Step 5: Commit**

```bash
git add lib/connections-repo.ts app/(app)/connections
git commit -m "feat: connections repo + GA4 credential save action + real connections page"
```

---

## Task 6: Report service (snapshot cache + refresh) and dashboard reads real GA4

**Files:**
- Create: `lib/report-service.ts`, `app/(app)/dashboard/actions.ts`
- Modify: `app/(app)/dashboard/page.tsx`, `components/Ga4Panel.tsx`

**Interfaces:**
- Consumes: `db`, `reportSnapshots` (Task 1); `getConnector`, `getConnection` (Tasks 4–5); `DailyMetrics`.
- Produces:
  - `getDailyMetrics(platform, date): Promise<DailyMetrics | null>` — reads snapshot cache.
  - `getRange(platform, start, end): Promise<DailyMetrics[]>`
  - `refreshPlatform(platform, range): Promise<void>` — calls connector, upserts snapshots.

- [ ] **Step 1: Create report service** — `lib/report-service.ts`

```ts
import 'server-only'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db, reportSnapshots } from '@/db'
import { getConnection } from '@/lib/connections-repo'
import { getConnector, type DailyMetrics, type Platform } from '@/lib/connectors'

export async function getRange(platform: Platform, start: string, end: string): Promise<DailyMetrics[]> {
  const rows = await db
    .select()
    .from(reportSnapshots)
    .where(and(eq(reportSnapshots.platform, platform), gte(reportSnapshots.date, start), lte(reportSnapshots.date, end)))
  return rows.map((r) => r.metrics as DailyMetrics).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getDailyMetrics(platform: Platform, date: string): Promise<DailyMetrics | null> {
  const rows = await getRange(platform, date, date)
  return rows[0] ?? null
}

export async function refreshPlatform(platform: Platform, range: { start: string; end: string }): Promise<void> {
  const conn = await getConnection(platform)
  const connector = getConnector(platform)
  if (!conn || !connector) return
  const daily = await connector.fetchDaily({ accountId: conn.accountId, credentials: conn.credentials }, range)
  for (const m of daily) {
    await db
      .insert(reportSnapshots)
      .values({ platform, date: m.date, metrics: m, source: 'api' })
      .onConflictDoUpdate({
        target: [reportSnapshots.platform, reportSnapshots.date],
        set: { metrics: m, fetchedAt: new Date(), source: 'api' },
      })
  }
}
```

- [ ] **Step 2: Create dashboard refresh action** — `app/(app)/dashboard/actions.ts`

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { refreshPlatform } from '@/lib/report-service'

export async function refreshGa4(): Promise<void> {
  const end = new Date().toISOString().slice(0, 10)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 29)
  const start = startDate.toISOString().slice(0, 10)
  await refreshPlatform('ga4', { start, end })
  revalidatePath('/dashboard')
}
```

- [ ] **Step 3: Make `Ga4Panel` accept props** — `components/Ga4Panel.tsx`

Change the component to accept `{ visitors, sessions, avgEngagementSec, keyEvents, organicBySource }` as props (typed) instead of importing the mock `ga4`. Add a graceful empty state: if `visitors` is undefined, render "GA4 未连接 · 前往连接页" text. Keep the existing bar/stat markup for the connected case.

- [ ] **Step 4: Read real GA4 in the dashboard** — `app/(app)/dashboard/page.tsx`

For the GA4 section only: `const ga4Today = await getDailyMetrics('ga4', REPORT_DATE)`. Map it to `Ga4Panel` props (key events array built from `KEY_EVENTS` with labels, organicBySource entries sorted desc). If null, pass undefined so the panel shows the empty state. Wire the TopBar refresh button (or a form) to `refreshGa4`. Leave channel table / spend / visitor-trend on mock for now (those are Google/Meta/X, later phases) — annotate with a comment.

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: compiles.

- [ ] **Step 6: Commit**

```bash
git add lib/report-service.ts app/(app)/dashboard components/Ga4Panel.tsx
git commit -m "feat: report snapshot service + dashboard reads real GA4 data"
```

---

## Task 7: Provision Postgres, set env, migrate, seed, deploy, verify

**Files:**
- Modify: `.env.local` (local, gitignored), Vercel project env
- Create: `db/migrations/*` already generated in Task 1

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Provision Vercel Postgres**

Create a Vercel Postgres (Neon) store and link it to the `amd` project (Vercel dashboard → Storage → Create → Postgres → connect to `amd`). This injects `DATABASE_URL` (and related) into the project env. Pull locally:

Run: `vercel env pull .env.local`
Expected: `.env.local` now contains `DATABASE_URL`.

- [ ] **Step 2: Generate and set the app secrets**

```bash
node -e "console.log('APP_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

Add both to `.env.local`, and add them to Vercel:

```bash
vercel env add APP_ENCRYPTION_KEY production
vercel env add AUTH_SECRET production
```

(Also add to `preview`/`development` as needed.)

- [ ] **Step 3: Run the migration against the DB**

Run: `pnpm db:migrate`
Expected: tables `users`, `connections`, `report_snapshots` created.

- [ ] **Step 4: Seed users**

```bash
SEED_PW_YAKU='<pick>' SEED_PW_JASON='<pick>' pnpm db:seed
```

Expected: prints `seeded yaku@team.com` / `seeded jason@team.com`.

- [ ] **Step 5: Deploy**

Run: `vercel deploy --prod --yes`
Expected: production deploy succeeds; `https://amd-ivory.vercel.app` served.

- [ ] **Step 6: Verify end to end**

- Visit `/dashboard` unauthenticated → redirected to `/login`.
- Log in with a seeded user → dashboard loads.
- Go to `/connections`, paste the GA4 property ID (`298707336`) + service-account JSON → card flips to "已连接" (or shows the API error).
- Back on `/dashboard`, click refresh → GA4 panel shows real visitors / key events / organic sources.

- [ ] **Step 7: Commit any config**

```bash
git add vercel.json package.json
git commit -m "chore: deploy config for GA4 real-data phase"
```

---

## Self-Review Notes

- **Spec coverage:** Auth (multi-account, seeded) ✓ Task 3; DB model (users/connections/report_snapshots) ✓ Task 1; encryption ✓ Task 2; connector framework + GA4 ✓ Task 4; connections page encrypted save ✓ Task 5; snapshot cache + dashboard real read ✓ Task 6; deploy/env ✓ Task 7. Google Ads / Meta / X connectors, Vercel Cron pre-pull, and AI recommendations are explicitly out of this phase (later plans).
- **Out of scope (next phases):** GoogleAdsConnector, MetaAdsConnector (+ upload fallback), XAdsConnector (upload), channel-table/spend/visitor-trend real data, Vercel Cron daily pre-pull, E2E Playwright tests.
- **Type consistency:** `Connector.fetchDaily(cfg, range)` and `getStatus(cfg)` signatures match across Tasks 4–6; `DailyMetrics` shape is the single source in `lib/connectors/types.ts`; `Platform` union identical everywhere.
- **Known follow-ups:** `next lint`/eslint not configured (pre-push skips it); add eslint-config-next in a later chore. `getStatus` calls the live API on save — acceptable (one call), documented.
