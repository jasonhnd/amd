import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getOrgSecret } from '@/lib/credentials/site'
import {
  decodePendingCookie,
  listGa4Properties,
  listGoogleAdsCustomers,
  refreshAccessToken,
} from '@/lib/google-oauth'
import { requireSiteAccess } from '@/lib/sites/access'
import { bindGoogleAccountsAction } from './actions'

export const dynamic = 'force-dynamic'

const COOKIE = 'amd_google_oauth_pending'

export default async function GooglePickPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { site } = await requireSiteAccess(slug, userId, 'editor')
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) {
    redirect(`/sites/${slug}/connections?err=google_session`)
  }

  let pending
  try {
    pending = decodePendingCookie(raw)
  } catch {
    redirect(`/sites/${slug}/connections?err=google_session`)
  }

  if (pending.siteId !== site.id || pending.clerkUserId !== userId) {
    redirect(`/sites/${slug}/connections?err=google_mismatch`)
  }

  const accessToken = await refreshAccessToken(pending.refreshToken)
  const properties = await listGa4Properties(accessToken)

  const developerToken = await getOrgSecret(site.orgId, 'google_ads_developer_token')
  let customers: { customerId: string }[] = []
  let adsError: string | null = null
  if (developerToken) {
    try {
      customers = await listGoogleAdsCustomers(accessToken, developerToken)
    } catch (e) {
      adsError = e instanceof Error ? e.message : '无法列出 Google Ads 账户'
    }
  } else {
    adsError = '尚未配置组织 Developer Token — 请先在「设置」中填写（只需一次）'
  }

  return (
    <div className="mx-auto max-w-xl px-8 py-10">
      <h1 className="text-xl font-semibold">选择要连接的账号</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        Google 已授权。勾选本站点要用的 GA4 与 Google Ads 账户后保存。
      </p>

      <form action={bindGoogleAccountsAction.bind(null, slug)} className="mt-8 flex flex-col gap-6">
        <section className="rounded-2xl border bg-[var(--color-panel)] p-5" style={{ borderRadius: 16 }}>
          <h2 className="text-[15px] font-semibold">GA4 属性</h2>
          {properties.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-ink-faint)]">未找到可访问的 GA4 属性</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {properties.map((p) => (
                <label
                  key={p.propertyId}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <input type="radio" name="ga4PropertyId" value={p.propertyId} className="mt-1" />
                  <span>
                    <span className="font-medium">{p.displayName}</span>
                    <span className="block text-[12px] text-[var(--color-ink-faint)]">
                      {p.propertyId}
                      {p.accountName ? ` · ${p.accountName}` : ''}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-[var(--color-panel)] p-5" style={{ borderRadius: 16 }}>
          <h2 className="text-[15px] font-semibold">Google Ads 客户</h2>
          {adsError ? (
            <p className="mt-2 text-sm text-[var(--color-warn)]">{adsError}</p>
          ) : customers.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-ink-faint)]">未找到可访问的 Ads 客户</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {customers.map((c) => (
                <label
                  key={c.customerId}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <input type="radio" name="adsCustomerId" value={c.customerId} />
                  <span className="font-mono text-[13px]">{c.customerId}</span>
                </label>
              ))}
              <label className="mt-2 text-[13px]">
                Login Customer ID（MCC，可选）
                <input
                  name="loginCustomerId"
                  placeholder="6563038097"
                  className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
                />
              </label>
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white"
            style={{ borderRadius: 10 }}
          >
            保存连接
          </button>
          <Link
            href={`/sites/${slug}/connections`}
            className="rounded-lg border px-5 py-2.5 text-sm text-[var(--color-ink-soft)]"
            style={{ borderRadius: 10 }}
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  )
}
