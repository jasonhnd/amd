import 'server-only'

import { revalidateTag } from 'next/cache'
import { and, eq, sql } from 'drizzle-orm'

import type { DailyMetrics } from '@/lib/connectors'
import { getDb } from '@/lib/db/client'
import { connections, uploadSnapshots } from '@/lib/db/schema'
import { saveConnectionCredentials } from '@/lib/credentials/site'

export const X_ADS_CACHE_TAG = 'x_ads'

export type XAdsUploadState =
  | {
      ok: true
      uploadedAt: string
      filename: string
      metrics: DailyMetrics[]
      totals: {
        spend: number
        impressions: number
        clicks: number
      }
    }
  | {
      ok: false
      uploadedAt: string
      filename?: string
      errors: string[]
    }

export async function persistXAdsUpload(
  siteId: string,
  state: XAdsUploadState
): Promise<void> {
  const db = getDb()

  if (!state.ok) {
    await saveConnectionCredentials({
      siteId,
      platform: 'x_ads',
      accountId: 'upload',
      payload: { lastError: state.errors },
      status: 'error',
      lastError: state.errors[0] ?? 'parse failed',
    })
    revalidateTag(`${X_ADS_CACHE_TAG}:${siteId}`)
    return
  }

  for (const m of state.metrics) {
    await db
      .insert(uploadSnapshots)
      .values({
        siteId,
        platform: 'x_ads',
        date: m.date,
        metrics: m,
        filename: state.filename,
        uploadedAt: new Date(state.uploadedAt),
      })
      .onConflictDoUpdate({
        target: [uploadSnapshots.siteId, uploadSnapshots.platform, uploadSnapshots.date],
        set: {
          metrics: m,
          filename: state.filename,
          uploadedAt: new Date(state.uploadedAt),
        },
      })
  }

  await saveConnectionCredentials({
    siteId,
    platform: 'x_ads',
    accountId: state.filename,
    payload: {
      filename: state.filename,
      uploadedAt: state.uploadedAt,
      dayCount: state.metrics.length,
    },
    status: 'connected',
  })

  revalidateTag(`${X_ADS_CACHE_TAG}:${siteId}`)
}

export async function getXAdsLastUpload(siteId: string): Promise<XAdsUploadState | null> {
  const db = getDb()
  const row = await db
    .select()
    .from(connections)
    .where(and(eq(connections.siteId, siteId), eq(connections.platform, 'x_ads')))
    .limit(1)

  const conn = row[0]
  if (!conn || conn.status === 'disconnected') {
    return null
  }

  if (conn.status === 'error') {
    return {
      ok: false,
      uploadedAt: conn.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      errors: [conn.lastError ?? 'upload error'],
    }
  }

  const snaps = await db
    .select()
    .from(uploadSnapshots)
    .where(and(eq(uploadSnapshots.siteId, siteId), eq(uploadSnapshots.platform, 'x_ads')))
    .orderBy(sql`${uploadSnapshots.date} desc`)
    .limit(90)

  if (snaps.length === 0) {
    return null
  }

  const metrics = snaps.map((s) => s.metrics as DailyMetrics)
  const totals = metrics.reduce(
    (acc, m) => ({
      spend: acc.spend + (m.spend ?? 0),
      impressions: acc.impressions + (m.impressions ?? 0),
      clicks: acc.clicks + (m.clicks ?? 0),
    }),
    { spend: 0, impressions: 0, clicks: 0 }
  )

  return {
    ok: true,
    uploadedAt: snaps[0].uploadedAt.toISOString(),
    filename: snaps[0].filename ?? conn.accountId ?? 'upload',
    metrics,
    totals,
  }
}
