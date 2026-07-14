import type { DailyMetrics } from '@/lib/connectors/types'

export type AdPlatform = 'google_ads' | 'meta_ads' | 'x_ads'

export type ChannelAvailability = 'live' | 'no_data' | 'not_configured' | 'error'

export type ChannelRow = {
  platform: AdPlatform
  name: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  availability: ChannelAvailability
  error?: string
}

export type ChannelStatus = 'ok' | 'warn' | 'idle'

export type ChannelTotals = {
  spendToday: number
  clicksToday: number
  impressionsToday: number
  /** Number of platforms with live day metrics */
  liveCount: number
}

export const AD_PLATFORM_ORDER: readonly AdPlatform[] = [
  'google_ads',
  'meta_ads',
  'x_ads',
] as const

export const AD_PLATFORM_NAMES: Record<AdPlatform, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  x_ads: 'X Ads',
}

/** Budget warn lines (JPY). Design §7 / mock-data rules. */
export const BUDGET_RULES: Record<AdPlatform, { daily: number; line: number }> = {
  google_ads: { daily: 1000, line: 2000 },
  meta_ads: { daily: 1000, line: 1750 },
  x_ads: { daily: 1000, line: 2000 },
}

export type PlatformDayInput = {
  platform: AdPlatform
  configured: boolean
  metrics?: DailyMetrics | null
  error?: string
}

/**
 * Build one channel row from connector day output.
 * Unconfigured / error / empty → no fabricated spend (zeros + availability flag).
 */
export function buildChannelRow(input: PlatformDayInput, _date: string): ChannelRow {
  const name = AD_PLATFORM_NAMES[input.platform]

  if (!input.configured) {
    return {
      platform: input.platform,
      name,
      ...zeroNums(),
      availability: 'not_configured',
    }
  }

  if (input.error) {
    return {
      platform: input.platform,
      name,
      ...zeroNums(),
      availability: 'error',
      error: input.error,
    }
  }

  const metrics = input.metrics
  if (!metrics) {
    return {
      platform: input.platform,
      name,
      ...zeroNums(),
      availability: 'no_data',
    }
  }

  const spend = metrics.spend ?? 0
  const impressions = metrics.impressions ?? 0
  const clicks = metrics.clicks ?? 0
  const ctr =
    metrics.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0)
  const cpc = metrics.cpc ?? (clicks > 0 ? spend / clicks : 0)
  const cpm = metrics.cpm ?? (impressions > 0 ? (spend / impressions) * 1000 : 0)

  return {
    platform: input.platform,
    name,
    spend,
    impressions,
    clicks,
    ctr,
    cpc,
    cpm,
    availability: 'live',
  }
}

function zeroNums(): Pick<
  ChannelRow,
  'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'cpm'
> {
  return {
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
  }
}

/** Assemble three platform rows in stable order. */
export function assembleChannelRows(
  inputs: PlatformDayInput[],
  date: string
): ChannelRow[] {
  const byPlatform = new Map(inputs.map((i) => [i.platform, i]))

  return AD_PLATFORM_ORDER.map((platform) => {
    const input = byPlatform.get(platform) ?? {
      platform,
      configured: false,
      metrics: null,
    }
    return buildChannelRow(input, date)
  })
}

export function sumChannelTotals(rows: ChannelRow[]): ChannelTotals {
  const live = rows.filter((r) => r.availability === 'live')
  return {
    spendToday: live.reduce((s, r) => s + r.spend, 0),
    clicksToday: live.reduce((s, r) => s + r.clicks, 0),
    impressionsToday: live.reduce((s, r) => s + r.impressions, 0),
    liveCount: live.length,
  }
}

export function channelStatus(row: ChannelRow): {
  level: ChannelStatus
  label: string
  assessment: string
} {
  if (row.availability === 'not_configured') {
    return { level: 'idle', label: '未配置', assessment: '在连接页配置凭证或上传' }
  }
  if (row.availability === 'error') {
    return {
      level: 'warn',
      label: '错误',
      assessment: row.error ?? '拉取失败',
    }
  }
  if (row.availability === 'no_data') {
    return { level: 'idle', label: '无数据', assessment: '当日暂无指标' }
  }

  const rule = BUDGET_RULES[row.platform]
  if (row.spend > rule.line) {
    return {
      level: 'warn',
      label: `超规则线 ¥${rule.line.toLocaleString()}`,
      assessment:
        row.platform === 'google_ads' ? '先查 Search Terms，勿先加预算' : '检查素材与受众',
    }
  }
  if (row.cpc > 80) {
    return { level: 'warn', label: 'CPC 偏高', assessment: '检查搜索词与匹配类型' }
  }
  return { level: 'ok', label: '正常', assessment: '维持观察' }
}

/** Prefer live rows only for share/CPC charts; empty array when nothing live. */
export function liveChannelRows(rows: ChannelRow[]): ChannelRow[] {
  return rows.filter((r) => r.availability === 'live')
}

export function metricsForDate(
  metrics: DailyMetrics[] | undefined,
  date: string
): DailyMetrics | null {
  if (!metrics?.length) {
    return null
  }
  return metrics.find((m) => m.date === date) ?? null
}

/** Report date in Asia/Tokyo (YYYY-MM-DD). */
export function todayJst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
