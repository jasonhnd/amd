export type Platform = 'ga4' | 'google_ads' | 'meta_ads' | 'x_ads'

export interface DailyMetrics {
  date: string
  spend?: number
  impressions?: number
  clicks?: number
  ctr?: number
  cpc?: number
  cpm?: number
  visitors?: number
  sessions?: number
  avgEngagementSec?: number
  keyEvents?: Record<string, number>
  organicBySource?: Record<string, number>
}

export interface Connector<Credentials> {
  platform: Platform
  fetchDaily(
    credentials: Credentials,
    range: { start: string; end: string }
  ): Promise<DailyMetrics[]>
  status(credentials: Credentials): Promise<{ ok: boolean; error?: string }>
}

export const KEY_EVENTS = ['job_search_start', 'job_search_submit', 'result_view'] as const
