import 'server-only'

import { revalidateTag, unstable_cache } from 'next/cache'
import { and, eq } from 'drizzle-orm'

import {
  assembleChannelRows,
  metricsForDate,
  sumChannelTotals,
  todayJst,
  type ChannelRow,
  type ChannelTotals,
  type PlatformDayInput,
} from '@/lib/ad-metrics'
import {
  getSiteGoogleAdsCredentials,
  getSiteMetaAdsCredentials,
  getConnectionRow,
} from '@/lib/credentials/site'
import { fetchGoogleAdsDaily } from '@/lib/connectors/google-ads'
import { fetchMetaAdsDaily } from '@/lib/connectors/meta-ads'
import { getDb } from '@/lib/db/client'
import { sites, uploadSnapshots } from '@/lib/db/schema'
import type { DailyMetrics } from '@/lib/connectors/types'

function googleTag(siteId: string) {
  return `google_ads:${siteId}`
}
function metaTag(siteId: string) {
  return `meta_ads:${siteId}`
}
function xTag(siteId: string) {
  return `x_ads:${siteId}`
}

async function googleAdsDayInput(siteId: string, orgId: string, date: string): Promise<PlatformDayInput> {
  const credentials = await getSiteGoogleAdsCredentials(siteId, orgId)
  if (!credentials) {
    return { platform: 'google_ads', configured: false }
  }

  try {
    const cached = unstable_cache(
      async () => fetchGoogleAdsDaily(credentials, { start: date, end: date }),
      ['google-ads-day', siteId, date],
      { revalidate: 3600, tags: [googleTag(siteId)] }
    )
    const rows = await cached()
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

async function metaAdsDayInput(siteId: string, date: string): Promise<PlatformDayInput> {
  const credentials = await getSiteMetaAdsCredentials(siteId)
  if (!credentials) {
    return { platform: 'meta_ads', configured: false }
  }

  try {
    const cached = unstable_cache(
      async () => fetchMetaAdsDaily(credentials, { start: date, end: date }),
      ['meta-ads-day', siteId, date],
      { revalidate: 3600, tags: [metaTag(siteId)] }
    )
    const rows = await cached()
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

async function xAdsDayInput(siteId: string, date: string): Promise<PlatformDayInput> {
  const row = await getConnectionRow(siteId, 'x_ads')
  const db = getDb()
  const snaps = await db
    .select()
    .from(uploadSnapshots)
    .where(
      and(
        eq(uploadSnapshots.siteId, siteId),
        eq(uploadSnapshots.platform, 'x_ads'),
        eq(uploadSnapshots.date, date)
      )
    )
    .limit(1)

  if (snaps[0]) {
    return {
      platform: 'x_ads',
      configured: true,
      metrics: snaps[0].metrics as DailyMetrics,
    }
  }

  // Any upload history means "configured" but no day data
  const any = await db
    .select({ id: uploadSnapshots.id })
    .from(uploadSnapshots)
    .where(and(eq(uploadSnapshots.siteId, siteId), eq(uploadSnapshots.platform, 'x_ads')))
    .limit(1)

  if (any.length > 0 || row?.status === 'connected') {
    return { platform: 'x_ads', configured: true, metrics: null }
  }

  return { platform: 'x_ads', configured: false }
}

export type AdDashboardSlice = {
  date: string
  channels: ChannelRow[]
  totals: ChannelTotals
}

export async function getAdDashboardSlice(
  siteId: string,
  date: string = todayJst()
): Promise<AdDashboardSlice> {
  const db = getDb()
  const siteRows = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1)
  const site = siteRows[0]
  if (!site) {
    return {
      date,
      channels: assembleChannelRows(
        [
          { platform: 'google_ads', configured: false },
          { platform: 'meta_ads', configured: false },
          { platform: 'x_ads', configured: false },
        ],
        date
      ),
      totals: sumChannelTotals([]),
    }
  }

  const [google, meta, x] = await Promise.all([
    googleAdsDayInput(siteId, site.orgId, date),
    metaAdsDayInput(siteId, date),
    xAdsDayInput(siteId, date),
  ])

  const channels = assembleChannelRows([google, meta, x], date)
  return {
    date,
    channels,
    totals: sumChannelTotals(channels),
  }
}

export async function refreshAdMetrics(siteId: string): Promise<void> {
  revalidateTag(googleTag(siteId))
  revalidateTag(metaTag(siteId))
  revalidateTag(xTag(siteId))
}
