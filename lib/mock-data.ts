// 示例数据（原型 / 趋势图占位用）。量级参考 reports-ecru-nu 的 2026-07-11 日报。
// 渠道表 / KPI / CPC·点击占比 已改走 live connectors（lib/ad-metrics*）。
// 全部为确定性数值，避免 SSR/客户端水合不一致。

export const REPORT_DATE = '2026-07-11'

// Re-export budget rules + status for any leftover consumers.
export {
  BUDGET_RULES,
  channelStatus,
  type AdPlatform as Platform,
  type ChannelRow,
  type ChannelStatus,
} from './ad-metrics'

// 30 天趋势（确定性生成）— #16 有意保留 mock，避免半接历史序列
const DAYS = 30
function seededSeries(base: number, amp: number, phase: number): number[] {
  return Array.from({ length: DAYS }, (_, i) => {
    const wave = Math.sin((i / DAYS) * Math.PI * 2 + phase)
    const drift = (i / DAYS) * amp * 0.4
    return Math.max(0, Math.round(base + wave * amp + drift))
  })
}

const dates = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date('2026-06-12T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + i)
  return d.toISOString().slice(5, 10) // MM-DD
})

const googleSpend = seededSeries(1600, 500, 0.4)
const metaSpend = seededSeries(1100, 300, 1.2)
const xSpend = seededSeries(600, 200, 2.1)

export const spendTrend = dates.map((date, i) => ({
  date,
  google_ads: googleSpend[i],
  meta_ads: metaSpend[i],
  x_ads: xSpend[i],
  total: googleSpend[i] + metaSpend[i] + xSpend[i],
}))

const organicSearch = seededSeries(85, 25, 0.2)
const direct = seededSeries(40, 12, 1.0)
const organicSocial = seededSeries(18, 8, 2.4)
const referral = seededSeries(10, 5, 3.1)

export const visitorTrend = dates.map((date, i) => ({
  date,
  'Organic Search': organicSearch[i],
  Direct: direct[i],
  'Organic Social': organicSocial[i],
  Referral: referral[i],
}))

export const PLATFORM_COLORS: Record<string, string> = {
  google_ads: 'var(--color-google)',
  meta_ads: 'var(--color-meta)',
  x_ads: 'var(--color-x)',
  'Organic Search': 'var(--color-ok)',
  Direct: 'var(--color-accent)',
  'Organic Social': 'var(--color-ga4)',
  Referral: 'var(--color-ink-faint)',
}
