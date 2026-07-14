import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { STATUS_META } from '@/lib/connections'
import { listConnectionStatuses } from '@/lib/credentials/site'
import { isDatabaseConfigured } from '@/lib/db/client'
import { roleAtLeast, requireSiteAccess } from '@/lib/sites/access'
import { getXAdsLastUpload } from '@/lib/x-ads-upload'
import {
  disconnectPlatform,
  saveGa4Connection,
  saveGoogleAdsConnection,
  saveMetaAdsConnection,
  uploadXAdsForSite,
} from './actions'
import { ConnectionForms } from './ConnectionForms'

export const dynamic = 'force-dynamic'

const PLATFORM_META = [
  {
    key: 'ga4' as const,
    name: 'GA4',
    desc: '网站流量、访客、Key Events',
    accent: 'var(--color-ga4)',
  },
  {
    key: 'google_ads' as const,
    name: 'Google Ads',
    desc: '花费、展示、点击、CPC',
    accent: 'var(--color-google)',
  },
  {
    key: 'meta_ads' as const,
    name: 'Meta Ads',
    desc: 'IG / FB 花费与点击',
    accent: 'var(--color-meta)',
  },
  {
    key: 'x_ads' as const,
    name: 'X Ads',
    desc: '手动上传 Daily xlsx/csv',
    accent: 'var(--color-x)',
  },
]

export default async function SiteConnectionsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  if (!isDatabaseConfigured()) redirect('/sites')

  const { site, role } = await requireSiteAccess(slug, userId, 'viewer')
  const canEdit = roleAtLeast(role, 'editor')
  const rows = await listConnectionStatuses(site.id)
  const byPlatform = Object.fromEntries(rows.map((r) => [r.platform, r]))
  const xUpload = await getXAdsLastUpload(site.id)

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-xl font-semibold tracking-tight">连接 · {site.name}</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        在站内填写凭证（加密存库）。不要写入 Vercel 业务环境变量。
        {!canEdit && ' 当前为只读角色。'}
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {PLATFORM_META.map((p) => {
          const row = byPlatform[p.key]
          const status = (row?.status as keyof typeof STATUS_META) || 'disconnected'
          const meta = STATUS_META[status] ?? STATUS_META.disconnected
          return (
            <section
              key={p.key}
              className="rounded-2xl border bg-[var(--color-panel)] p-6"
              style={{ borderRadius: 16 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: p.accent }}
                  />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[12px] text-[var(--color-ink-faint)]">{p.desc}</div>
                    {row?.accountId ? (
                      <div className="mt-1 text-[12px] text-[var(--color-ink-soft)]">
                        {row.accountId}
                      </div>
                    ) : null}
                    {row?.lastError ? (
                      <div className="mt-1 text-[12px] text-[var(--color-danger)]">
                        {row.lastError}
                      </div>
                    ) : null}
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{ background: meta.soft, color: meta.color, borderRadius: 999 }}
                >
                  {meta.label}
                </span>
              </div>

              {canEdit ? (
                <ConnectionForms
                  slug={slug}
                  platform={p.key}
                  saveGa4={saveGa4Connection.bind(null, slug)}
                  saveGoogle={saveGoogleAdsConnection.bind(null, slug)}
                  saveMeta={saveMetaAdsConnection.bind(null, slug)}
                  disconnect={disconnectPlatform.bind(null, slug, p.key)}
                  uploadX={uploadXAdsForSite.bind(null, slug)}
                  xUpload={
                    p.key === 'x_ads'
                      ? xUpload
                        ? xUpload.ok
                          ? {
                              ok: true as const,
                              filename: xUpload.filename,
                              dayCount: xUpload.metrics.length,
                            }
                          : { ok: false as const, error: xUpload.errors[0] }
                        : null
                      : null
                  }
                />
              ) : (
                <p className="mt-4 text-[12px] text-[var(--color-ink-faint)]">
                  Viewer 无法编辑凭证。
                </p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
