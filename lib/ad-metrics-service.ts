import 'server-only'

import { revalidateTag, unstable_cache } from 'next/cache'

import {
  assembleChannelRows,
  metricsForDate,
  sumChannelTotals,
  todayJst,
  type ChannelRow,
  type ChannelTotals,
  type PlatformDayInput,
} from '@/lib/ad-metrics'
import { fetchGoogleAdsDaily } from '@/lib/connectors/google-ads'
import { fetchMetaAdsDaily } from '@/lib/connectors/meta-ads'
import { getGoogleAdsCredentials } from '@/lib/google-ads-config'
import { getMetaAdsCredentials } from '@/lib/meta-ads-config'
import { getXAdsLastUpload } from '@/lib/x-ads-upload'
import type { DailyMetrics } from '@/lib/connectors/types'

const GOOGLE_ADS_CACHE_TAG = 'google_ads'
const META_ADS_CACHE_TAG = 'meta_ads'

const cachedGoogleAdsRange = unstable_cache(
  async (start: string, end: string): Promise<DailyMetrics[]> => {
    const credentials = getGoogleAdsCredentials()
    if (!credentials) {
      return []
    }
    return fetchGoogleAdsDaily(credentials, { start, end })
  },
  ['google-ads-range'],
  { revalidate: 3600, tags: [GOOGLE_ADS_CACHE_TAG] }
)

const cachedMetaAdsRange = unstable_cache(
  async (start: string, end: string): Promise<DailyMetrics[]> => {
    const credentials = getMetaAdsCredentials()
    if (!credentials) {
      return []
    }
    return fetchMetaAdsDaily(credentials, { start, end })
  },
  ['meta-ads-range'],
  { revalidate: 3600, tags: [META_ADS_CACHE_TAG] }
)

async function googleAdsDayInput(date: string): Promise<PlatformDayInput> {
  const credentials = getGoogleAdsCredentials()
  if (!credentials) {
    return { platform: 'google_ads', configured: false }
  }

  try {
    const rows = await cachedGoogleAdsRange(date, date)
    return {
      platform: 'google_ads',
      configured: true,
      metrics: metricsForDate(rows, date),
    }
  } catch (error) {
    return {
      platform: 'google_ads',
      configured: true,
      error: error instanceof Error ? error.message : 'Google Ads fetch failed',
    }
  }
}

async function metaAdsDayInput(date: string): Promise<PlatformDayInput> {
  const credentials = getMetaAdsCredentials()
  if (!credentials) {
    return { platform: 'meta_ads', configured: false }
  }

  try {
    const rows = await cachedMetaAdsRange(date, date)
    return {
      platform: 'meta_ads',
      configured: true,
      metrics: metricsForDate(rows, date),
    }
  } catch (error) {
    return {
      platform: 'meta_ads',
      configured: true,
      error: error instanceof Error ? error.message : 'Meta Ads fetch failed',
    }
  }
}

async function xAdsDayInput(date: string): Promise<PlatformDayInput> {
  const upload = await getXAdsLastUpload()

  if (!upload) {
    return { platform: 'x_ads', configured: false }
  }

  if (!upload.ok) {
    return {
      platform: 'x_ads',
      configured: true,
      error: upload.errors.join('; ') || 'X Ads upload invalid',
    }
  }

  return {
    platform: 'x_ads',
    configured: true,
    metrics: metricsForDate(upload.metrics, date),
  }
}

export type AdDashboardSlice = {
  date: string
  channels: ChannelRow[]
  totals: ChannelTotals
}

/**
 * Assemble channel table + spend KPIs for a day from live connectors.
 * Unconfigured platforms become honest empty rows (no mock yen).
 */
export async function getAdDashboardSlice(
  date: string = todayJst()
): Promise<AdDashboardSlice> {
  const [google, meta, x] = await Promise.all([
    googleAdsDayInput(date),
    metaAdsDayInput(date),
    xAdsDayInput(date),
  ])

  const channels = assembleChannelRows([google, meta, x], date)
  return {
    date,
    channels,
    totals: sumChannelTotals(channels),
  }
}

export async function refreshAdMetrics(): Promise<void> {
  revalidateTag(GOOGLE_ADS_CACHE_TAG)
  revalidateTag(META_ADS_CACHE_TAG)
}
