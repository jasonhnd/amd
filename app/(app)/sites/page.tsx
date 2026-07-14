import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { isEncryptionConfigured } from '@/lib/crypto'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listSitesForUser } from '@/lib/sites/bootstrap'
import { createSiteAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function SitesPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const dbOk = isDatabaseConfigured()
  const encOk = isEncryptionConfigured()
  const sites = dbOk ? await listSitesForUser(userId) : []

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-xl font-semibold tracking-tight">站点</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        每个网站独立连接凭证与看板，分开治理。
      </p>

      {(!dbOk || !encOk) && (
        <div className="mt-6 rounded-2xl border border-dashed bg-[var(--color-panel)] p-5 text-sm">
          <div className="font-medium">基础设施未就绪</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--color-ink-soft)]">
            {!dbOk && (
              <li>
                缺少 <code className="text-xs">DATABASE_URL</code>（Neon Postgres）
              </li>
            )}
            {!encOk && (
              <li>
                缺少有效 <code className="text-xs">APP_ENCRYPTION_KEY</code>
                （32 字节 base64）
              </li>
            )}
          </ul>
          <p className="mt-3 text-[12px] text-[var(--color-ink-faint)]">
            配置后重新部署即可。业务凭证请在各站点「连接」页填写，不要写 Vercel 业务 env。
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {sites.map((s) => (
          <Link
            key={s.id}
            href={`/sites/${s.slug}/dashboard`}
            className="rounded-2xl border bg-[var(--color-panel)] px-5 py-4 transition hover:border-[var(--color-accent)]"
            style={{ borderRadius: 16 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-[12px] text-[var(--color-ink-faint)]">
                  {s.slug}
                  {s.domain ? ` · ${s.domain}` : ''} · {s.role}
                </div>
              </div>
              <span className="text-[13px] text-[var(--color-accent)]">打开 →</span>
            </div>
          </Link>
        ))}
        {dbOk && sites.length === 0 && (
          <p className="text-sm text-[var(--color-ink-soft)]">
            暂无站点权限。若组织已存在，请联系 Owner 将你加入成员。
          </p>
        )}
      </div>

      {dbOk && encOk && (
        <section className="mt-10 rounded-2xl border bg-[var(--color-panel)] p-6" style={{ borderRadius: 16 }}>
          <h2 className="text-[15px] font-semibold">新建站点</h2>
          <form action={createSiteAction} className="mt-4 flex flex-col gap-3">
            <label className="text-[13px]">
              名称
              <input
                name="name"
                required
                placeholder="Mirai Shigoto"
                className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
              />
            </label>
            <label className="text-[13px]">
              Slug（URL）
              <input
                name="slug"
                required
                placeholder="mirai-shigoto"
                pattern="[a-z0-9-]+"
                className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
              />
            </label>
            <label className="text-[13px]">
              域名（可选）
              <input
                name="domain"
                placeholder="example.com"
                className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
              style={{ borderRadius: 10 }}
            >
              创建
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
