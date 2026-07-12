import { ga4 } from '@/lib/mock-data'

export function Ga4Panel() {
  const maxSource = Math.max(...ga4.organicBySource.map((s) => s.value))

  return (
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
  )
}
