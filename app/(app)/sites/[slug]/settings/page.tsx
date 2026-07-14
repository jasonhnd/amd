import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { getOrgSecret } from '@/lib/credentials/site'
import { getDb, isDatabaseConfigured } from '@/lib/db/client'
import { siteMembers } from '@/lib/db/schema'
import { roleAtLeast, requireSiteAccess } from '@/lib/sites/access'
import { saveOrgDeveloperToken } from './actions'
import { DeveloperTokenForm } from './DeveloperTokenForm'

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
  const hasDevToken = Boolean(await getOrgSecret(site.orgId, 'google_ads_developer_token'))
  const isOwner = roleAtLeast(role, 'owner')

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

      <section className="mt-10 rounded-2xl border bg-[var(--color-panel)] p-5" style={{ borderRadius: 16 }}>
        <h2 className="text-[15px] font-semibold">Google Ads Developer Token</h2>
        <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
          组织级，全站点共用。从 Google Ads API Center 复制，只填一次。有了它，「一键连接」才能列出
          Ads 客户。
        </p>
        <p className="mt-2 text-[13px]">
          状态：{' '}
          <span className={hasDevToken ? 'text-[var(--color-ok)]' : 'text-[var(--color-warn)]'}>
            {hasDevToken ? '已配置' : '未配置'}
          </span>
        </p>
        {isOwner ? (
          <DeveloperTokenForm
            save={saveOrgDeveloperToken.bind(null, slug)}
            hasToken={hasDevToken}
          />
        ) : (
          <p className="mt-2 text-[12px] text-[var(--color-ink-faint)]">仅 Owner 可修改。</p>
        )}
      </section>

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
    </div>
  )
}
