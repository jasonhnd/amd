import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { getDb, isDatabaseConfigured } from '@/lib/db/client'
import { siteMembers } from '@/lib/db/schema'
import { requireSiteAccess } from '@/lib/sites/access'

export const dynamic = 'force-dynamic'

export default async function SiteSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  if (!isDatabaseConfigured()) redirect('/sites')

  const { site, role } = await requireSiteAccess(slug, userId, 'viewer')
  const db = getDb()
  const members = await db.select().from(siteMembers).where(eq(siteMembers.siteId, site.id))

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="text-xl font-semibold">设置 · {site.name}</h1>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between border-b py-2">
          <dt className="text-[var(--color-ink-faint)]">Slug</dt>
          <dd className="font-medium">{site.slug}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt className="text-[var(--color-ink-faint)]">域名</dt>
          <dd className="font-medium">{site.domain ?? '—'}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt className="text-[var(--color-ink-faint)]">时区</dt>
          <dd className="font-medium">{site.timezone}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt className="text-[var(--color-ink-faint)]">你的角色</dt>
          <dd className="font-medium">{role}</dd>
        </div>
      </dl>

      <h2 className="mt-10 text-[15px] font-semibold">成员</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {members.map((m) => (
          <li
            key={m.clerkUserId}
            className="flex justify-between rounded-lg border px-3 py-2"
            style={{ borderRadius: 10 }}
          >
            <span className="font-mono text-[12px]">{m.clerkUserId}</span>
            <span className="text-[var(--color-ink-soft)]">{m.role}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-[var(--color-ink-faint)]">
        成员邀请 UI 见 issue #24；目前首登用户 bootstrap 为 owner，可用数据库直接插入 site_members。
      </p>
    </div>
  )
}
