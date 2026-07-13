import { connections, STATUS_META } from '@/lib/connections'
import { getGa4Credentials, isGa4Configured } from '@/lib/ga4-config'
import { Check, AlertTriangle, Plus, Upload } from 'lucide-react'

export default function ConnectionsPage() {
  const ga4Configured = isGa4Configured()
  const ga4Credentials = getGa4Credentials()
  const visibleConnections = connections.map((connection) => {
    if (connection.key !== 'ga4') {
      return connection
    }

    return {
      ...connection,
      accountId: ga4Credentials ? `Property ${ga4Credentials.propertyId}` : 'GA4_PROPERTY_ID 未配置',
      status: ga4Configured ? 'connected' : 'disconnected',
      method: 'Vercel 环境变量',
      note: ga4Configured
        ? 'GA4_PROPERTY_ID 与 GA4_SERVICE_ACCOUNT_JSON 已配置，凭证只在服务端读取'
        : '在 Vercel 环境变量设置 GA4_PROPERTY_ID 与 GA4_SERVICE_ACCOUNT_JSON 后启用',
    } as const
  })

  return (
    <>
      <div className="flex items-center gap-3 border-b bg-[var(--color-panel)] px-8 py-4">
        <h1 className="text-lg font-semibold tracking-tight">连接</h1>
        <span className="text-[13px] text-[var(--color-ink-faint)]">
          把账号 ID 和只读权限接进来，AMD 就能拉数据
        </span>
      </div>

      <div className="mx-auto max-w-[900px] px-8 py-7">
        <div className="grid gap-4">
          {visibleConnections.map((c) => {
            const meta = STATUS_META[c.status]
            return (
              <div
                key={c.key}
                className="rounded-2xl border bg-[var(--color-panel)] p-5"
                style={{ borderRadius: 16, boxShadow: '0 1px 2px rgba(20,20,40,0.03)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold text-white"
                      style={{ background: c.accent, borderRadius: 12 }}
                    >
                      {c.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold tracking-tight">{c.name}</span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ borderRadius: 999, background: meta.soft, color: meta.color }}
                        >
                          {c.status === 'connected' ? <Check size={11} /> : null}
                          {c.status === 'error' ? <AlertTriangle size={11} /> : null}
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 text-[13px] text-[var(--color-ink-soft)]">{c.desc}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--color-ink-faint)]">
                        <span className="tabular">{c.accountId}</span>
                        <span className="text-[var(--color-line)]">·</span>
                        <span>{c.method}</span>
                      </div>
                      {c.note ? (
                        <div
                          className="mt-2.5 rounded-lg px-2.5 py-1.5 text-[12px]"
                          style={{
                            borderRadius: 8,
                            background: c.status === 'error' ? 'var(--color-danger-soft)' : 'var(--color-line-soft)',
                            color: c.status === 'error' ? 'var(--color-danger)' : 'var(--color-ink-soft)',
                          }}
                        >
                          {c.note}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {c.key === 'ga4' ? (
                      <div
                        className="rounded-lg border px-3 py-1.5 text-[13px] font-medium text-[var(--color-ink-soft)]"
                        style={{ borderRadius: 10 }}
                      >
                        Vercel Env
                      </div>
                    ) : null}
                    {c.key !== 'ga4' && (c.key === 'x_ads' || c.status === 'error') ? (
                      <button
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line-soft)]"
                        style={{ borderRadius: 10 }}
                      >
                        <Upload size={14} />
                        上传 xlsx
                      </button>
                    ) : null}
                    {c.key !== 'ga4' && c.status === 'connected' ? (
                      <button
                        className="rounded-lg border px-3 py-1.5 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line-soft)]"
                        style={{ borderRadius: 10 }}
                      >
                        断开
                      </button>
                    ) : null}
                    {c.key !== 'ga4' && c.status !== 'connected' ? (
                      <button
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                        style={{ background: 'var(--color-accent)', borderRadius: 10 }}
                      >
                        <Plus size={14} />
                        连接
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-6 text-center text-[12px] text-[var(--color-ink-faint)]">
          GA4 凭证由 Vercel 环境变量提供；其他平台仍为占位状态
        </p>
      </div>
    </>
  )
}
