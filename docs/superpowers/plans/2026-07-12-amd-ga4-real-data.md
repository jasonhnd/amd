# AMD GA4 Real-Data Phase Implementation Plan (Option B · No-DB, all-Vercel)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn AMD from a mock-data prototype into a real, logged-in app that pulls live GA4 data through a reusable connector and shows it on the dashboard — with **zero database and zero external bill** (everything in Vercel: env vars + serverless + Next.js caching).

**Architecture:** Next.js App Router. Auth.js (Credentials, JWT) gates the site; the small user list lives in a single env var (`AMD_USERS`). The GA4 service-account JSON + property ID live in Vercel env vars (Vercel already stores env encrypted). A `Connector` interface is implemented for GA4 (`@google-analytics/data`); the dashboard fetches live GA4 metrics on the server, wrapped in Next.js caching (`unstable_cache`, revalidate hourly), with a manual refresh that revalidates the tag. No Postgres, no Drizzle, no custom crypto in this phase. Other platforms keep mock/placeholder states.

**Tech Stack:** Next.js 15, TypeScript, Auth.js v5 (`next-auth`), `bcryptjs` (pure-JS password hashing), `@google-analytics/data`, `zod`, Vitest.

## Global Constraints

- Single shared workspace (556 data). No public signup; users come from `AMD_USERS` env. Data is shared.
- All platform API calls run server-side only. No credential ever reaches the client bundle.
- Credentials live in Vercel env vars only — never in git, client, or logs. No custom encryption needed (Vercel env is the secret store).
- `next build` must stay green (pre-push hook runs it). Do not commit any real service-account JSON. Test the connector against a mocked client only.
- GA4 default property: `298707336`. Key Events: `job_search_start`, `job_search_submit`, `result_view`.
- Env vars: `AUTH_SECRET`, `AMD_USERS` (JSON), `GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_JSON`.
- No database, no Drizzle, no `report_snapshots` in this phase (deferred to the future DB phase for X-upload / cross-platform history).

---

## File Structure

- `lib/env.ts` — validated env access.
- `lib/users.ts` — parse `AMD_USERS`, `findUser(email)`.
- `auth.ts` — Auth.js config (Credentials, JWT).
- `middleware.ts` — route protection.
- `app/api/auth/[...nextauth]/route.ts` — Auth.js handlers.
- `app/login/page.tsx` — real login form (replace mock link).
- `components/Sidebar.tsx` — real sign-out.
- `scripts/hash-users.ts` — helper to generate the `AMD_USERS` JSON from email/name/password.
- `lib/connectors/types.ts` — `Connector`, `DailyMetrics`, `Platform`.
- `lib/connectors/ga4.ts` — GA4 connector (service account from env).
- `lib/connectors/index.ts` — registry.
- `lib/ga4-config.ts` — read GA4 property/credentials from env; `isGa4Configured()`.
- `lib/ga4-service.ts` — cached live fetch (`getGa4Today`, `getGa4Range`) + `refreshGa4()`.
- `app/(app)/dashboard/page.tsx` — read real GA4 section.
- `app/(app)/dashboard/actions.ts` — refresh action (revalidateTag).
- `components/Ga4Panel.tsx` — accept props + empty state.
- `app/(app)/connections/page.tsx` — read-only status (configured / not) + test.
- Test files under `**/*.test.ts` (Vitest).

---

## Task 1: Env accessor, user list, and Auth.js login

**Files:**
- Create: `lib/env.ts`, `lib/users.ts`, `lib/users.test.ts`, `auth.ts`, `middleware.ts`, `app/api/auth/[...nextauth]/route.ts`, `scripts/hash-users.ts`
- Modify: `app/login/page.tsx`, `components/Sidebar.tsx`, `package.json`

**Interfaces:**
- Produces: `env` accessor; `type AmdUser = { email: string; name: string; passwordHash: string }`; `findUser(email: string): AmdUser | undefined`; `auth()`, `signIn`, `signOut` from `auth.ts`.

- [ ] **Step 1: Add dependencies**

```bash
pnpm add next-auth@beta bcryptjs zod
pnpm add -D vitest @types/bcryptjs
```

- [ ] **Step 2: Create env accessor** — `lib/env.ts`

```ts
import 'server-only'

function opt(name: string): string | undefined {
  return process.env[name] || undefined
}
function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export const env = {
  AUTH_SECRET: () => required('AUTH_SECRET'),
  AMD_USERS: () => process.env.AMD_USERS ?? '[]',
  GA4_PROPERTY_ID: () => opt('GA4_PROPERTY_ID'),
  GA4_SERVICE_ACCOUNT_JSON: () => opt('GA4_SERVICE_ACCOUNT_JSON'),
}
```

- [ ] **Step 3: Write the failing test** — `lib/users.test.ts`

```ts
import { describe, it, expect } from 'vitest'

describe('findUser', () => {
  it('finds a user case-insensitively from AMD_USERS', async () => {
    process.env.AMD_USERS = JSON.stringify([
      { email: 'yaku@team.com', name: 'Yaku', passwordHash: 'h1' },
    ])
    const { findUser } = await import('./users')
    expect(findUser('YAKU@team.com')?.name).toBe('Yaku')
    expect(findUser('nobody@team.com')).toBeUndefined()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test lib/users.test.ts`
Expected: FAIL — cannot find module './users'.

- [ ] **Step 5: Implement** — `lib/users.ts`

```ts
import { z } from 'zod'
import { env } from './env'

const userSchema = z.object({ email: z.string().email(), name: z.string(), passwordHash: z.string() })
export type AmdUser = z.infer<typeof userSchema>

export function findUser(email: string): AmdUser | undefined {
  const list = z.array(userSchema).catch([]).parse(JSON.parse(env.AMD_USERS()))
  const target = email.trim().toLowerCase()
  return list.find((u) => u.email.toLowerCase() === target)
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test lib/users.test.ts`
Expected: PASS.

- [ ] **Step 7: Create Auth.js config** — `auth.ts`

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { findUser } from '@/lib/users'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '')
        const password = String(creds?.password ?? '')
        const user = findUser(email)
        if (!user) return null
        if (!(await bcrypt.compare(password, user.passwordHash))) return null
        return { id: user.email, email: user.email, name: user.name }
      },
    }),
  ],
})
```

- [ ] **Step 8: Route handler** — `app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 9: Middleware** — `middleware.ts`

```ts
import { auth } from '@/auth'

export default auth((req) => {
  const { pathname } = req.nextUrl
  if (!req.auth && !pathname.startsWith('/login') && !pathname.startsWith('/api/auth')) {
    return Response.redirect(new URL('/login', req.nextUrl.origin))
  }
})

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

- [ ] **Step 10: Real login form** — `app/login/page.tsx`

Add a top-of-file server action and wrap the existing inputs in `<form action={login}>`; turn "进入看板" into `<button type="submit">`. Keep styling.

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

- [ ] **Step 11: Real sign-out** — `components/Sidebar.tsx`

Replace the logout `<Link>` with `<form action={doSignOut}>` where a server action calls `signOut({ redirectTo: '/login' })`. (Put the action in a tiny `app/(app)/actions.ts` `'use server'` file and import it, since Sidebar is a client component and cannot declare inline server actions.)

- [ ] **Step 12: Hash-users helper** — `scripts/hash-users.ts`

```ts
import bcrypt from 'bcryptjs'

// Usage: node --experimental-strip-types scripts/hash-users.ts 'yaku@team.com|Yaku|pw1' 'jason@team.com|Jason|pw2'
const users = process.argv.slice(2).map((arg) => {
  const [email, name, password] = arg.split('|')
  return { email, name, passwordHash: bcrypt.hashSync(password, 10) }
})
console.log(JSON.stringify(users))
```

Add `"test": "vitest run"` to package.json scripts.

- [ ] **Step 13: Verify build**

Run: `pnpm build`
Expected: compiles; `/login`, `/api/auth/[...nextauth]` present.

- [ ] **Step 14: Commit**

```bash
git add lib/env.ts lib/users.ts lib/users.test.ts auth.ts middleware.ts app/api/auth app/login/page.tsx app/(app)/actions.ts components/Sidebar.tsx scripts/hash-users.ts package.json pnpm-lock.yaml
git commit -m "feat: env-based auth (AMD_USERS), login, middleware guard"
```

---

## Task 2: Connector types + GA4 connector (service account from env)

**Files:**
- Create: `lib/connectors/types.ts`, `lib/connectors/ga4.ts`, `lib/connectors/ga4.test.ts`, `lib/connectors/index.ts`, `lib/ga4-config.ts`

**Interfaces:**
- Produces:
  - `type Platform = 'ga4' | 'google_ads' | 'meta_ads' | 'x_ads'`
  - `interface DailyMetrics { date: string; spend?: number; impressions?: number; clicks?: number; ctr?: number; cpc?: number; cpm?: number; visitors?: number; sessions?: number; avgEngagementSec?: number; keyEvents?: Record<string, number>; organicBySource?: Record<string, number> }`
  - `interface Ga4Credentials { propertyId: string; clientEmail: string; privateKey: string; projectId: string }`
  - `normalizeGa4(resp): DailyMetrics[]`, `mergeKeyEvents(base, resp): DailyMetrics[]`
  - `fetchGa4Daily(cred, range): Promise<DailyMetrics[]>`, `ga4Status(cred): Promise<{ ok; error? }>`
  - `getGa4Credentials(): Ga4Credentials | null`, `isGa4Configured(): boolean`

- [ ] **Step 1: Types** — `lib/connectors/types.ts`

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

export const KEY_EVENTS = ['job_search_start', 'job_search_submit', 'result_view'] as const
```

- [ ] **Step 2: Config accessor** — `lib/ga4-config.ts`

```ts
import 'server-only'
import { z } from 'zod'
import { env } from '@/lib/env'

export interface Ga4Credentials {
  propertyId: string
  clientEmail: string
  privateKey: string
  projectId: string
}

const saSchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
  project_id: z.string().min(1),
})

export function getGa4Credentials(): Ga4Credentials | null {
  const propertyId = env.GA4_PROPERTY_ID()
  const raw = env.GA4_SERVICE_ACCOUNT_JSON()
  if (!propertyId || !raw) return null
  try {
    const sa = saSchema.parse(JSON.parse(raw))
    return { propertyId, clientEmail: sa.client_email, privateKey: sa.private_key, projectId: sa.project_id }
  } catch {
    return null
  }
}

export function isGa4Configured(): boolean {
  return getGa4Credentials() !== null
}
```

- [ ] **Step 3: Write the failing test** — `lib/connectors/ga4.test.ts`

```ts
import { describe, it, expect } from 'vitest'

describe('ga4 normalize', () => {
  it('sums activeUsers per date and records channel breakdown', async () => {
    const { normalizeGa4 } = await import('./ga4')
    const resp = {
      rows: [
        { dimensionValues: [{ value: '20260711' }, { value: 'Organic Search' }], metricValues: [{ value: '96' }, { value: '110' }, { value: '80' }] },
        { dimensionValues: [{ value: '20260711' }, { value: 'Direct' }], metricValues: [{ value: '47' }, { value: '52' }, { value: '70' }] },
      ],
    }
    const out = normalizeGa4(resp as any)
    const day = out.find((d) => d.date === '2026-07-11')!
    expect(day.visitors).toBe(143)
    expect(day.organicBySource).toEqual({ 'Organic Search': 96, Direct: 47 })
  })

  it('merges key events onto matching dates', async () => {
    const { mergeKeyEvents } = await import('./ga4')
    const base = [{ date: '2026-07-11', visitors: 143, keyEvents: {} as Record<string, number> }]
    const resp = {
      rows: [
        { dimensionValues: [{ value: '20260711' }, { value: 'job_search_start' }], metricValues: [{ value: '58' }] },
      ],
    }
    const out = mergeKeyEvents(base as any, resp as any)
    expect(out[0].keyEvents!['job_search_start']).toBe(58)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test lib/connectors/ga4.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement** — `lib/connectors/ga4.ts`

```ts
import 'server-only'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import type { Ga4Credentials } from '@/lib/ga4-config'
import type { DailyMetrics } from './types'
import { KEY_EVENTS } from './types'

interface Row { dimensionValues?: { value?: string | null }[]; metricValues?: { value?: string | null }[] }
interface Resp { rows?: Row[] }

function ymd(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

export function normalizeGa4(resp: Resp): DailyMetrics[] {
  const byDate = new Map<string, DailyMetrics>()
  for (const row of resp.rows ?? []) {
    const rawDate = row.dimensionValues?.[0]?.value ?? ''
    if (!rawDate) continue
    const channel = row.dimensionValues?.[1]?.value ?? 'Unknown'
    const users = Number(row.metricValues?.[0]?.value ?? 0)
    const sessions = Number(row.metricValues?.[1]?.value ?? 0)
    const date = ymd(rawDate)
    const d = byDate.get(date) ?? { date, visitors: 0, sessions: 0, organicBySource: {} }
    d.visitors = (d.visitors ?? 0) + users
    d.sessions = (d.sessions ?? 0) + sessions
    d.organicBySource![channel] = (d.organicBySource![channel] ?? 0) + users
    byDate.set(date, d)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function mergeKeyEvents(base: DailyMetrics[], resp: Resp): DailyMetrics[] {
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

function client(cred: Ga4Credentials): BetaAnalyticsDataClient {
  return new BetaAnalyticsDataClient({
    credentials: { client_email: cred.clientEmail, private_key: cred.privateKey },
    projectId: cred.projectId,
  })
}

export async function fetchGa4Daily(cred: Ga4Credentials, range: { start: string; end: string }): Promise<DailyMetrics[]> {
  const c = client(cred)
  const property = `properties/${cred.propertyId}`
  const [traffic] = await c.runReport({
    property,
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }],
  })
  const [events] = await c.runReport({
    property,
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'date' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: [...KEY_EVENTS] } } },
  })
  return mergeKeyEvents(normalizeGa4(traffic as Resp), events as Resp)
}

export async function ga4Status(cred: Ga4Credentials): Promise<{ ok: boolean; error?: string }> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    await client(cred).runReport({
      property: `properties/${cred.propertyId}`,
      dateRanges: [{ startDate: today, endDate: today }],
      metrics: [{ name: 'activeUsers' }],
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' }
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test lib/connectors/ga4.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Registry** — `lib/connectors/index.ts`

```ts
export * from './types'
export { fetchGa4Daily, ga4Status, normalizeGa4, mergeKeyEvents } from './ga4'
```

- [ ] **Step 8: Commit**

```bash
git add lib/connectors lib/ga4-config.ts
git commit -m "feat: GA4 connector (service account from env) + normalization tests"
```

---

## Task 3: Cached GA4 service + dashboard reads real GA4 + refresh

**Files:**
- Create: `lib/ga4-service.ts`, `app/(app)/dashboard/actions.ts`
- Modify: `components/Ga4Panel.tsx`, `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getGa4Credentials`, `isGa4Configured` (Task 2); `fetchGa4Daily`; `DailyMetrics`.
- Produces: `getGa4Range(start, end): Promise<DailyMetrics[]>` (cached), `getGa4Day(date): Promise<DailyMetrics | null>`, `refreshGa4(): Promise<void>` (revalidates the GA4 cache tag).

- [ ] **Step 1: Cached service** — `lib/ga4-service.ts`

```ts
import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { getGa4Credentials } from '@/lib/ga4-config'
import { fetchGa4Daily, type DailyMetrics } from '@/lib/connectors'

const TAG = 'ga4'

const cachedRange = unstable_cache(
  async (start: string, end: string): Promise<DailyMetrics[]> => {
    const cred = getGa4Credentials()
    if (!cred) return []
    return fetchGa4Daily(cred, { start, end })
  },
  ['ga4-range'],
  { revalidate: 3600, tags: [TAG] }
)

export async function getGa4Range(start: string, end: string): Promise<DailyMetrics[]> {
  return cachedRange(start, end)
}

export async function getGa4Day(date: string): Promise<DailyMetrics | null> {
  const rows = await cachedRange(date, date)
  return rows[0] ?? null
}

export async function refreshGa4(): Promise<void> {
  revalidateTag(TAG)
}
```

- [ ] **Step 2: Refresh action** — `app/(app)/dashboard/actions.ts`

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { refreshGa4 } from '@/lib/ga4-service'

export async function refreshGa4Action(): Promise<void> {
  await refreshGa4()
  revalidatePath('/dashboard')
}
```

- [ ] **Step 3: Make `Ga4Panel` prop-driven with empty state** — `components/Ga4Panel.tsx`

Change to accept typed props: `{ visitors?: number; sessions?: number; avgEngagementSec?: number; keyEvents?: { name: string; label: string; value: number }[]; organicBySource?: { source: string; value: number }[] }`. If `visitors === undefined`, render an empty state: `GA4 未配置 · 在 Vercel 环境变量设置 GA4_PROPERTY_ID 与 GA4_SERVICE_ACCOUNT_JSON`. Otherwise render the existing stat row (访客/Sessions/平均停留) + Key Events bars + 流量结构 bars using the props. Keep styling.

- [ ] **Step 4: Dashboard reads real GA4** — `app/(app)/dashboard/page.tsx`

For the GA4 panel only:

```tsx
import { getGa4Day } from '@/lib/ga4-service'
import { KEY_EVENTS } from '@/lib/connectors'

const KEY_EVENT_LABELS: Record<string, string> = {
  job_search_start: '开始查询职业',
  job_search_submit: '提交查询',
  result_view: '查看结果',
}
// inside the async component:
const ga4Day = await getGa4Day(REPORT_DATE)
const ga4Props = ga4Day
  ? {
      visitors: ga4Day.visitors,
      sessions: ga4Day.sessions,
      avgEngagementSec: ga4Day.avgEngagementSec,
      keyEvents: KEY_EVENTS.map((k) => ({ name: k, label: KEY_EVENT_LABELS[k], value: ga4Day.keyEvents?.[k] ?? 0 })),
      organicBySource: Object.entries(ga4Day.organicBySource ?? {})
        .map(([source, value]) => ({ source, value }))
        .sort((a, b) => b.value - a.value),
    }
  : {}
```

Pass `{...ga4Props}` to `<Ga4Panel />`. Make the page a Server Component (`export default async function`). Leave channel table / spend trend / visitor trend / advice on mock data for now (Google/Meta/X land in later phases) — add a `// TODO(next phase): real Google/Meta/X` comment. Keep the "示例数据·原型" badge but change GA4 panel to reflect real/empty state.

- [ ] **Step 5: Wire refresh button** — `components/TopBar.tsx`

Wrap the refresh button in a `<form action={refreshGa4Action}>` (import the action) so clicking revalidates GA4. Keep the spin animation on submit via `useFormStatus` (optional) — minimal change is fine.

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: compiles.

- [ ] **Step 7: Commit**

```bash
git add lib/ga4-service.ts app/(app)/dashboard components/Ga4Panel.tsx components/TopBar.tsx
git commit -m "feat: cached live GA4 fetch + dashboard reads real GA4 + refresh"
```

---

## Task 4: Connections page → GA4 status (read-only) + deploy

**Files:**
- Modify: `app/(app)/connections/page.tsx`
- Create: `app/(app)/connections/actions.ts` (test-connection action)

**Interfaces:**
- Consumes: `isGa4Configured`, `getGa4Credentials` (Task 2); `ga4Status` (Task 2).

- [ ] **Step 1: Test-connection action** — `app/(app)/connections/actions.ts`

```ts
'use server'

import { getGa4Credentials } from '@/lib/ga4-config'
import { ga4Status } from '@/lib/connectors'

export async function testGa4(): Promise<{ ok: boolean; error?: string }> {
  const cred = getGa4Credentials()
  if (!cred) return { ok: false, error: '未配置 GA4 环境变量' }
  return ga4Status(cred)
}
```

- [ ] **Step 2: Update connections page** — `app/(app)/connections/page.tsx`

Make it a Server Component. For the GA4 card, derive status from `isGa4Configured()` → badge "已连接" (configured) or "未连接". Show the env-var setup hint (`GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_JSON` set in Vercel) instead of an in-app paste form. Keep Google/Meta/X cards as placeholders. Keep styling. (A "测试连接" button calling `testGa4` is optional/nice-to-have.)

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/connections
git commit -m "feat: connections page shows GA4 env-config status"
```

- [ ] **Step 5: Set Vercel env vars**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # AUTH_SECRET value
node --experimental-strip-types scripts/hash-users.ts 'yaku@team.com|Yaku|<pw1>' 'jason@team.com|Jason|<pw2>'   # AMD_USERS value
```

Then, for `production` (and `preview`/`development` as needed):

```bash
vercel env add AUTH_SECRET production
vercel env add AMD_USERS production
vercel env add GA4_PROPERTY_ID production        # 298707336
vercel env add GA4_SERVICE_ACCOUNT_JSON production   # paste the full service-account JSON (one line)
```

- [ ] **Step 6: Deploy**

Run: `git push origin main` then `vercel deploy --prod --yes`
Expected: production deploy succeeds.

- [ ] **Step 7: Verify end to end**

- Visit `/dashboard` unauthenticated → redirected to `/login`.
- Log in with a seeded user → dashboard loads.
- If GA4 env is set: GA4 panel shows real visitors / key events / organic sources; `/connections` shows GA4 "已连接".
- If not set yet: GA4 panel shows the "未配置" empty state; other panels still show mock.
- Click refresh → GA4 panel re-fetches.

---

## Self-Review Notes

- **Spec coverage (Option B, §2b):** env-var credentials ✓ Task 2; multi-account login from `AMD_USERS` ✓ Task 1; GA4 connector live fetch ✓ Task 2; Next.js caching + dashboard real read + refresh ✓ Task 3; connections status ✓ Task 4; all-Vercel deploy, no DB, no external bill ✓ Task 4. AES crypto, Postgres, Drizzle, snapshots explicitly deferred to the future DB phase.
- **Out of scope (next phases):** Google Ads / Meta / X connectors, X manual upload (needs a store), cross-platform history, Vercel Cron pre-pull, AI recommendations, E2E Playwright.
- **Type consistency:** `DailyMetrics` single source in `types.ts`; `Ga4Credentials` single source in `ga4-config.ts`; `fetchGa4Daily(cred, range)` / `ga4Status(cred)` signatures consistent across Tasks 2–4.
- **Known follow-ups:** eslint not configured (pre-push skips lint); `unstable_cache` revalidate=3600 chosen to keep GA4 API calls low — refresh button forces revalidate.
