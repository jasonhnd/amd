'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

import { getGa4Credentials } from '@/lib/ga4-config'
import { getMetaAdsCredentials } from '@/lib/meta-ads-config'
import { ga4Status, metaAdsStatus, parseXAdsDailyExport } from '@/lib/connectors'
import { saveXAdsUpload, X_ADS_CACHE_TAG } from '@/lib/x-ads-upload'

export async function testGa4(): Promise<{ ok: boolean; error?: string }> {
  const credentials = getGa4Credentials()
  if (!credentials) {
    return { ok: false, error: '未配置 GA4 环境变量' }
  }

  return ga4Status(credentials)
}

export async function testMetaAds(): Promise<{ ok: boolean; error?: string }> {
  const credentials = getMetaAdsCredentials()
  if (!credentials) {
    return { ok: false, error: '未配置 META_ACCESS_TOKEN' }
  }

  return metaAdsStatus(credentials)
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'name' in value &&
    'size' in value
  )
}

export async function uploadXAds(formData: FormData): Promise<void> {
  const file = formData.get('xAdsFile')
  const uploadedAt = new Date().toISOString()

  if (!isUploadFile(file) || file.size === 0) {
    saveXAdsUpload({
      ok: false,
      uploadedAt,
      errors: ['Choose a non-empty X Ads .xlsx, .xls, or .csv file.'],
    })
    revalidateTag(X_ADS_CACHE_TAG)
    revalidatePath('/connections')
    redirect('/connections')
  }

  const filename = file.name || 'upload.xlsx'
  const parsed = parseXAdsDailyExport(await file.arrayBuffer(), filename)

  if (parsed.errors.length > 0) {
    saveXAdsUpload({
      ok: false,
      uploadedAt,
      filename,
      errors: parsed.errors,
    })
    revalidateTag(X_ADS_CACHE_TAG)
    revalidatePath('/connections')
    redirect('/connections')
  }

  saveXAdsUpload({
    ok: true,
    uploadedAt,
    filename,
    metrics: parsed.metrics,
    totals: parsed.metrics.reduce(
      (totals, day) => ({
        spend: totals.spend + (day.spend ?? 0),
        impressions: totals.impressions + (day.impressions ?? 0),
        clicks: totals.clicks + (day.clicks ?? 0),
      }),
      { spend: 0, impressions: 0, clicks: 0 }
    ),
  })
  revalidateTag(X_ADS_CACHE_TAG)
  revalidatePath('/connections')
  redirect('/connections')
}
