import { ga4 } from '@/lib/mock-data'

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

export function Ga4Panel() {
  const maxSource = Math.max(...ga4.organicBySource.map((s) => s.value))
  const stats = [
    { label: '访客', value: ga4.visitors.toLocaleString() },
    { label: 'Sessions', value: ga4.sessions.toLocaleString() },
    { label: '平均停留', value: fmtDuration(ga4.avgEngagementSec) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border bg-[var(--color-surface)] px-3 py-2.5"
            style={{ borderRadius: 12 }}
          >
            <div className="text-[11px] text-[var(--color-ink-faint)]">{s.label}</div>
            <div className="tabular mt-0.5 text-base font-semibold tracking-tight">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-3 text-[13px] font-medium text-[var(--color-ink-soft)]">Key Events</div>
        <div className="flex flex-col gap-2.5">
          {ga4.keyEvents.map((e) => (
            <div key={e.name} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-[13px]">{e.label}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-line-soft)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(e.value / ga4.keyEvents[0].value) * 100}%`,
                    background: 'var(--color-ga4)',
                  }}
                />
              </div>
              <div className="tabular w-8 text-right text-[13px] font-medium">{e.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 text-[13px] font-medium text-[var(--color-ink-soft)]">
          流量结构（按来源）
        </div>
        <div className="flex flex-col gap-2.5">
          {ga4.organicBySource.map((s) => (
            <div key={s.source} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-[13px]">{s.source}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-line-soft)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(s.value / maxSource) * 100}%`, background: 'var(--color-accent)' }}
                />
              </div>
              <div className="tabular w-8 text-right text-[13px] font-medium">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}
