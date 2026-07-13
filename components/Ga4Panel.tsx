interface Ga4PanelProps {
  visitors?: number
  sessions?: number
  avgEngagementSec?: number
  keyEvents?: { name: string; label: string; value: number }[]
  organicBySource?: { source: string; value: number }[]
}

function fmtDuration(sec: number | undefined) {
  if (sec === undefined) {
    return '-'
  }

  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

function barWidth(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return '0%'
  }

  return `${(value / maxValue) * 100}%`
}

export function Ga4Panel({
  visitors,
  sessions,
  avgEngagementSec,
  keyEvents = [],
  organicBySource = [],
}: Ga4PanelProps) {
  if (visitors === undefined) {
    return (
      <div className="rounded-xl border border-dashed bg-[var(--color-surface)] px-4 py-6 text-center">
        <div className="text-[13px] font-medium text-[var(--color-ink-soft)]">GA4 未配置</div>
        <div className="mt-1 text-[12px] text-[var(--color-ink-faint)]">
          在 Vercel 环境变量设置 GA4_PROPERTY_ID 与 GA4_SERVICE_ACCOUNT_JSON
        </div>
      </div>
    )
  }

  const maxKeyEvent = Math.max(...keyEvents.map((event) => event.value), 0)
  const maxSource = Math.max(...organicBySource.map((source) => source.value), 0)
  const stats = [
    { label: '访客', value: visitors.toLocaleString() },
    { label: 'Sessions', value: (sessions ?? 0).toLocaleString() },
    { label: '平均停留', value: fmtDuration(avgEngagementSec) },
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
            {keyEvents.map((event) => (
              <div key={event.name} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-[13px]">{event.label}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-line-soft)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: barWidth(event.value, maxKeyEvent),
                      background: 'var(--color-ga4)',
                    }}
                  />
                </div>
                <div className="tabular w-8 text-right text-[13px] font-medium">{event.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 text-[13px] font-medium text-[var(--color-ink-soft)]">
            流量结构（按来源）
          </div>
          <div className="flex flex-col gap-2.5">
            {organicBySource.map((source) => (
              <div key={source.source} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-[13px]">{source.source}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-line-soft)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: barWidth(source.value, maxSource),
                      background: 'var(--color-accent)',
                    }}
                  />
                </div>
                <div className="tabular w-8 text-right text-[13px] font-medium">{source.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
