import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  getClerkGoogleAccessToken,
  hasAdwordsScope,
  hasAnalyticsScope,
} from '@/lib/clerk-google'
import { getOrgSecret } from '@/lib/credentials/site'
import { listGa4Properties, listGoogleAdsCustomers } from '@/lib/google-oauth'
import { requireSiteAccess } from '@/lib/sites/access'
import { bindGoogleAccountsAction } from './actions'
import { ReauthGoogleButton } from './ReauthGoogleButton'

export const dynamic = 'force-dynamic'

export default async function GooglePickPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  await requireSiteAccess(slug, userId, 'editor')
  const { site } = await requireSiteAccess(slug, userId, 'editor')

  const token = await getClerkGoogleAccessToken(userId)

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-8 py-10">
        <h1 className="text-xl font-semibold">需要 Google 登录权限</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          请用 <strong>Google 账号</strong>登录 AMD（侧栏账户），并在 Clerk 的 Google
          连接里打开 Analytics 权限。无需你们自己的 GCP 项目。
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--color-ink-soft)]">
          <li>Clerk Dashboard → Social connections → Google</li>
          <li>
            在 Scopes 中加入：
            <code className="block mt-1 text-[11px] break-all">
              https://www.googleapis.com/auth/analytics.readonly
              https://www.googleapis.com/auth/adwords
            </code>
          </li>
          <li>保存后，点下方重新授权，再回到本页</li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <ReauthGoogleButton returnPath={`/sites/${slug}/connections/google/pick`} />
          <Link
            href={`/sites/${slug}/connections`}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderRadius: 10 }}
          >
            返回
          </Link>
        </div>
      </div>
    )
  }

  const needAnalytics = !hasAnalyticsScope(token.scopes)
  // adwords optional if scopes empty (Clerk sometimes omits scope list)
  const scopesUnknown = token.scopes.length === 0

  let properties: Awaited<ReturnType<typeof listGa4Properties>> = []
  let propertiesError: string | null = null
  try {
    properties = await listGa4Properties(token.accessToken)
  } catch (e) {
    propertiesError = e instanceof Error ? e.message : '无法列出 GA4'
  }

  const developerToken = await getOrgSecret(site.orgId, 'google_ads_developer_token')
  let customers: { customerId: string }[] = []
  let adsError: string | null = null
  if (!developerToken) {
    adsError = '尚未在「设置」填写组织 Developer Token（只填一次；仅 Ads 需要，纯 GA4 可跳过）'
  } else if (!scopesUnknown && !hasAdwordsScope(token.scopes)) {
    adsError = '当前 Google 授权未包含 Ads 权限，请重新授权'
  } else {
    try {
      customers = await listGoogleAdsCustomers(token.accessToken, developerToken)
    } catch (e) {
      adsError = e instanceof Error ? e.message : '无法列出 Google Ads 账户'
    }
  }

  if (propertiesError && properties.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-8 py-10">
        <h1 className="text-xl font-semibold">Google 权限不足</h1>
        <p className="mt-2 text-sm text-[var(--color-warn)]">{propertiesError}</p>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          {needAnalytics || scopesUnknown
            ? '请在 Clerk → Google 连接中添加 analytics.readonly 范围后重新授权。'
            : '请确认该 Google 账号能访问目标 GA4 属性。'}
        </p>
        <div className="mt-6 flex gap-3">
          <ReauthGoogleButton returnPath={`/sites/${slug}/connections/google/pick`} />
          <Link href={`/sites/${slug}/connections`} className="rounded-lg border px-4 py-2 text-sm">
            返回
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-8 py-10">
      <h1 className="text-xl font-semibold">选择要连接的账号</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        使用你登录 AMD 的 Google 账号（经 Clerk，无需 GCP）。勾选后保存即可。
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
