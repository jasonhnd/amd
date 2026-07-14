import 'server-only'

import { unstable_cache } from 'next/cache'

import type { DailyMetrics } from '@/lib/connectors'

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

interface XAdsUploadStore {
  lastUpload: XAdsUploadState | null
}

const globalStore = globalThis as typeof globalThis & {
  __amdXAdsUploadStore?: XAdsUploadStore
}

function getStore(): XAdsUploadStore {
  globalStore.__amdXAdsUploadStore ??= { lastUpload: null }
  return globalStore.__amdXAdsUploadStore
}

export function saveXAdsUpload(state: XAdsUploadState): void {
  getStore().lastUpload = state
}

function readXAdsUpload(): XAdsUploadState | null {
  return getStore().lastUpload
}

export const getXAdsLastUpload = unstable_cache(
  async (): Promise<XAdsUploadState | null> => readXAdsUpload(),
  ['x-ads-last-upload'],
  { revalidate: 3600, tags: [X_ADS_CACHE_TAG] }
)
