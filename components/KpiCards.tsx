import { totals, ga4 } from '@/lib/mock-data'
import { Coins, MousePointerClick, Users, Wallet } from 'lucide-react'

const kpis = [
  {
    label: '今日总花费',
    value: `¥${totals.spendToday.toLocaleString()}`,
    sub: '三平台合计',
    icon: Coins,
    accent: 'var(--color-accent)',
  },
  {
    label: '累计花费',
    value: `¥${totals.spendCumulative.toLocaleString()}`,
    sub: '活动至今',
    icon: Wallet,
    accent: 'var(--color-ink)',
  },
  {
    label: '今日访客',
    value: ga4.visitors.toLocaleString(),
    sub: `${ga4.sessions} sessions`,
    icon: Users,
    accent: 'var(--color-ga4)',
  },
  {
    label: '今日点击',
    value: totals.clicksToday.toLocaleString(),
    sub: `${totals.impressionsToday.toLocaleString()} 展示`,
    icon: MousePointerClick,
    accent: 'var(--color-ok)',
  },
]

export function KpiCards() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map(({ label, value, sub, icon: Icon, accent }) => (
        <div
          key={label}
          className="rounded-2xl border bg-[var(--color-panel)] p-5"
          style={{ borderRadius: 16, boxShadow: '0 1px 2px rgba(20,20,40,0.03)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--color-ink-soft)]">{label}</span>
            <Icon size={16} style={{ color: accent }} />
          </div>
          <div className="tabular mt-3 text-2xl font-semibold tracking-tight" style={{ color: accent }}>
            {value}
          </div>
          <div className="mt-1 text-[12px] text-[var(--color-ink-faint)]">{sub}</div>
        </div>
      ))}
    </div>
  )
}
