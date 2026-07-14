import 'server-only'

import type { MetaAdsCredentials } from '@/lib/meta-ads-config'
import type { DailyMetrics } from './types'

const GRAPH_API_VERSION = 'v25.0'
const META_API_BLOCKED_MESSAGE =
  'Meta Marketing API access blocked. 请在 Meta 后台确认 App Review、系统用户和 ads_read 权限后重试。'

interface MetaAdsError {
  message?: string
  type?: string
  code?: number
  error_subcode?: number
}

interface MetaInsightsRow {
  date_start?: string
  spend?: string
  impressions?: string
  clicks?: string
  cpc?: string
  ctr?: string
  cpm?: string
}

interface MetaInsightsResponse {
  data?: MetaInsightsRow[]
  error?: MetaAdsError
}

function toNumber(value: string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function roundMetric(value: number): number {
  return Number(value.toFixed(6))
}

function isMetaApiBlockedError(error: MetaAdsError | Error | string | undefined): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : error?.message

  if (!message) {
    return false
  }

  const normalized = message.toLowerCase()
  return normalized.includes('api access blocked') || normalized.includes('access blocked')
}

function formatMetaAdsError(error: MetaAdsError | undefined, fallback: string): string {
  if (isMetaApiBlockedError(error)) {
    return META_API_BLOCKED_MESSAGE
  }

  return error?.message ?? fallback
}

function buildInsightsUrl(
  credentials: MetaAdsCredentials,
  range: { start: string; end: string }
): URL {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${credentials.adAccountId}/insights`
  )

  url.searchParams.set('access_token', credentials.accessToken)
  url.searchParams.set('fields', 'date_start,spend,impressions,clicks,cpc,ctr,cpm')
  url.searchParams.set('level', 'account')
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('time_range', JSON.stringify({ since: range.start, until: range.end }))
  url.searchParams.set('limit', '500')

  return url
}

async function requestMetaInsights(
  credentials: MetaAdsCredentials,
  range: { start: string; end: string }
): Promise<MetaInsightsResponse> {
  const response = await fetch(buildInsightsUrl(credentials, range), { cache: 'no-store' })
  const body = (await response.json()) as MetaInsightsResponse

  if (!response.ok || body.error) {
    throw new Error(formatMetaAdsError(body.error, `Meta Marketing API HTTP ${response.status}`))
  }

  return body
}

export function normalizeMetaAds(resp: MetaInsightsResponse): DailyMetrics[] {
  return (resp.data ?? [])
    .filter((row): row is MetaInsightsRow & { date_start: string } => Boolean(row.date_start))
    .map((row) => {
      const spend = toNumber(row.spend)
      const impressions = toNumber(row.impressions)
      const clicks = toNumber(row.clicks)

      return {
        date: row.date_start,
        spend,
        impressions,
        clicks,
        cpc: row.cpc ? toNumber(row.cpc) : clicks ? roundMetric(spend / clicks) : 0,
        ctr: row.ctr ? toNumber(row.ctr) : impressions ? roundMetric((clicks / impressions) * 100) : 0,
        cpm: row.cpm ? toNumber(row.cpm) : impressions ? roundMetric((spend / impressions) * 1000) : 0,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchMetaAdsDaily(
  credentials: MetaAdsCredentials,
  range: { start: string; end: string }
): Promise<DailyMetrics[]> {
  return normalizeMetaAds(await requestMetaInsights(credentials, range))
}

export async function metaAdsStatus(
  credentials: MetaAdsCredentials
): Promise<{ ok: boolean; error?: string }> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    await requestMetaInsights(credentials, { start: today, end: today })

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return {
      ok: false,
      error: isMetaApiBlockedError(message) ? META_API_BLOCKED_MESSAGE : message,
    }
  }
}
