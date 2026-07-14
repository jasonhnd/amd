import type { ChannelTotals } from '@/lib/ad-metrics'
import { Coins, MousePointerClick, Users, Wallet } from 'lucide-react'

export function KpiCards({
  totals,
  visitors,
  sessions,
}: {
  totals: ChannelTotals
  visitors?: number
  sessions?: number
}) {
  const hasLiveAds = totals.liveCount > 0
  const hasGa4 = visitors !== undefined

  const kpis = [
    {
      label: '今日总花费',
      value: hasLiveAds ? `¥${totals.spendToday.toLocaleString()}` : '—',
      sub: hasLiveAds
        ? `${totals.liveCount} 个平台有数据`
        : '广告平台未配置或无当日数据',
      icon: Coins,
      accent: 'var(--color-accent)',
    },
    {
      label: '累计花费',
      value: '—',
      sub: '历史快照未启用（无 DB）',
      icon: Wallet,
      accent: 'var(--color-ink)',
    },
    {
      label: '今日访客',
      value: hasGa4 ? visitors.toLocaleString() : '—',
      sub: hasGa4 ? `${sessions ?? 0} sessions` : 'GA4 未配置',
      icon: Users,
      accent: 'var(--color-ga4)',
    },
    {
      label: '今日点击',
      value: hasLiveAds ? totals.clicksToday.toLocaleString() : '—',
      sub: hasLiveAds
        ? `${totals.impressionsToday.toLocaleString()} 展示`
        : '广告平台未配置或无当日数据',
      icon: MousePointerClick,
      accent: 'var(--color-ok)',
    },
  ]

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
          <div
            className="tabular mt-3 text-2xl font-semibold tracking-tight"
            style={{ color: accent }}
          >
            {value}
          </div>
          <div className="mt-1 text-[12px] text-[var(--color-ink-faint)]">{sub}</div>
        </div>
      ))}
    </div>
  )
}
