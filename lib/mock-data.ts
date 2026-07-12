// 示例数据（原型用）。量级参考 reports-ecru-nu 的 2026-07-11 日报。
// 全部为确定性数值，避免 SSR/客户端水合不一致。

export const REPORT_DATE = '2026-07-11'

export type Platform = 'google_ads' | 'meta_ads' | 'x_ads'

export type ChannelRow = {
  platform: Platform
  name: string
  spend: number // JPY
  impressions: number
  clicks: number
  ctr: number // %
  cpc: number // JPY
  cpm: number // JPY
  // 状态由预算规则推导
}

export const BUDGET_RULES: Record<Platform, { daily: number; line: number }> = {
  google_ads: { daily: 1000, line: 2000 },
  meta_ads: { daily: 1000, line: 1750 },
  x_ads: { daily: 1000, line: 2000 },
}

// 今日各渠道（Google 特意超线以演示标黄）
export const channels: ChannelRow[] = [
  {
    platform: 'google_ads',
    name: 'Google Ads',
    spend: 2180,
    impressions: 4210,
    clicks: 63,
    ctr: 1.5,
    cpc: 34.6,
    cpm: 517.8,
  },
  {
    platform: 'meta_ads',
    name: 'Meta Ads',
    spend: 1236,
    impressions: 18900,
    clicks: 142,
    ctr: 0.75,
    cpc: 8.7,
    cpm: 65.4,
  },
  {
    platform: 'x_ads',
    name: 'X Ads',
    spend: 614,
    impressions: 9800,
    clicks: 88,
    ctr: 0.9,
    cpc: 7.0,
    cpm: 62.7,
  },
]

export type ChannelStatus = 'ok' | 'warn'

export function channelStatus(row: ChannelRow): {
  level: ChannelStatus
  label: string
  assessment: string
} {
  const rule = BUDGET_RULES[row.platform]
  if (row.spend > rule.line) {
    return {
      level: 'warn',
      label: `超规则线 ¥${rule.line.toLocaleString()}`,
      assessment: row.platform === 'google_ads' ? '先查 Search Terms，勿先加预算' : '检查素材与受众',
    }
  }
  if (row.cpc > 80) {
    return { level: 'warn', label: 'CPC 偏高', assessment: '检查搜索词与匹配类型' }
  }
  return { level: 'ok', label: '正常', assessment: '维持观察' }
}

export const totals = {
  spendToday: channels.reduce((s, c) => s + c.spend, 0),
  spendCumulative: 86420,
  clicksToday: channels.reduce((s, c) => s + c.clicks, 0),
  impressionsToday: channels.reduce((s, c) => s + c.impressions, 0),
}

// GA4 站点质量
export const ga4 = {
  visitors: 214,
  sessions: 246,
  avgEngagementSec: 78,
  keyEvents: [
    { name: 'job_search_start', label: '开始查询职业', value: 58 },
    { name: 'job_search_submit', label: '提交查询', value: 41 },
    { name: 'result_view', label: '查看结果', value: 33 },
  ],
  organicBySource: [
    { source: 'Organic Search', value: 96 },
    { source: 'Direct', value: 47 },
    { source: 'Organic Social', value: 21 },
    { source: 'Referral', value: 12 },
  ],
}

// 30 天趋势（确定性生成）
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
