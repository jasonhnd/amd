'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

import {
  clearConnection,
  getSiteGa4Credentials,
  getSiteGoogleAdsCredentials,
  getSiteMetaAdsCredentials,
  saveConnectionCredentials,
  setOrgSecret,
} from '@/lib/credentials/site'
import { ga4Status, metaAdsStatus, parseXAdsDailyExport } from '@/lib/connectors'
import { googleAdsStatus } from '@/lib/connectors/google-ads'
import { requireSiteAccess } from '@/lib/sites/access'
import { persistXAdsUpload } from '@/lib/x-ads-upload'

async function editorContext(slug: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return requireSiteAccess(slug, userId, 'editor')
}

export async function saveGa4Connection(
  slug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { site } = await editorContext(slug)
    const propertyId = String(formData.get('propertyId') ?? '').trim()
    const serviceAccountJson = String(formData.get('serviceAccountJson') ?? '').trim()
    if (!propertyId || !serviceAccountJson) {
      return { ok: false, error: 'Property ID 与 Service Account JSON 必填' }
    }
    JSON.parse(serviceAccountJson)

    const payload = {
      auth: 'service_account' as const,
      propertyId,
      serviceAccountJson,
    }
    await saveConnectionCredentials({
      siteId: site.id,
      platform: 'ga4',
      accountId: `Property ${propertyId}`,
      payload,
      status: 'connected',
    })

    const credentials = await getSiteGa4Credentials(site.id)
    if (!credentials) {
      return { ok: false, error: '凭证已保存但解析失败，请检查 JSON' }
    }
    const status = await ga4Status(credentials)
    if (!status.ok) {
      await saveConnectionCredentials({
        siteId: site.id,
        platform: 'ga4',
        accountId: `Property ${propertyId}`,
        payload,
        status: 'error',
        lastError: status.error,
      })
      revalidatePath(`/sites/${slug}/connections`)
      return { ok: false, error: status.error ?? 'GA4 测试失败' }
    }

    revalidatePath(`/sites/${slug}/connections`)
    revalidatePath(`/sites/${slug}/dashboard`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '保存失败' }
  }
}

export async function saveGoogleAdsConnection(
  slug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { site } = await editorContext(slug)
    const customerId = String(formData.get('customerId') ?? '').trim()
    const loginCustomerId = String(formData.get('loginCustomerId') ?? '').trim() || undefined
    const serviceAccountJson = String(formData.get('serviceAccountJson') ?? '').trim()
    const developerToken = String(formData.get('developerToken') ?? '').trim() || undefined

    if (!customerId || !serviceAccountJson) {
      return { ok: false, error: 'Customer ID 与 Service Account JSON 必填' }
    }
    JSON.parse(serviceAccountJson)

    if (developerToken) {
      await setOrgSecret(site.orgId, 'google_ads_developer_token', developerToken)
    }

    const payload = {
      auth: 'service_account' as const,
      customerId,
      loginCustomerId,
      serviceAccountJson,
    }
    await saveConnectionCredentials({
      siteId: site.id,
      platform: 'google_ads',
      accountId: customerId,
      payload,
      status: 'connected',
    })

    const credentials = await getSiteGoogleAdsCredentials(site.id, site.orgId)
    if (!credentials) {
      return {
        ok: false,
        error: '凭证已保存但无法组装（检查 Customer ID 或组织 Developer Token）',
      }
    }
    const status = await googleAdsStatus(credentials)
    if (!status.ok) {
      await saveConnectionCredentials({
        siteId: site.id,
        platform: 'google_ads',
        accountId: customerId,
        payload,
        status: 'error',
        lastError: status.error,
      })
      revalidatePath(`/sites/${slug}/connections`)
      return { ok: false, error: status.error ?? 'Google Ads 测试失败' }
    }

    revalidatePath(`/sites/${slug}/connections`)
    revalidatePath(`/sites/${slug}/dashboard`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '保存失败' }
  }
}

export async function saveMetaAdsConnection(
  slug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { site } = await editorContext(slug)
    const accessToken = String(formData.get('accessToken') ?? '').trim()
    const adAccountId =
      String(formData.get('adAccountId') ?? '').trim() || 'act_1497377618536088'
    if (!accessToken) {
      return { ok: false, error: 'Access Token 必填' }
    }

    await saveConnectionCredentials({
      siteId: site.id,
      platform: 'meta_ads',
      accountId: adAccountId,
      payload: { accessToken, adAccountId },
      status: 'connected',
    })

    const credentials = await getSiteMetaAdsCredentials(site.id)
    if (!credentials) {
      return { ok: false, error: '凭证解析失败' }
    }
    const status = await metaAdsStatus(credentials)
    if (!status.ok) {
      await saveConnectionCredentials({
        siteId: site.id,
        platform: 'meta_ads',
        accountId: adAccountId,
        payload: { accessToken, adAccountId },
        status: 'error',
        lastError: status.error,
      })
      revalidatePath(`/sites/${slug}/connections`)
      return { ok: false, error: status.error ?? 'Meta 测试失败' }
    }

    revalidatePath(`/sites/${slug}/connections`)
    revalidatePath(`/sites/${slug}/dashboard`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '保存失败' }
  }
}

export async function disconnectPlatform(
  slug: string,
  platform: 'ga4' | 'google_ads' | 'meta_ads' | 'x_ads'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { site } = await editorContext(slug)
    await clearConnection(site.id, platform)
    revalidatePath(`/sites/${slug}/connections`)
    revalidatePath(`/sites/${slug}/dashboard`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '断开失败' }
  }
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

export async function uploadXAdsForSite(slug: string, formData: FormData): Promise<void> {
  const { site } = await editorContext(slug)
  const file = formData.get('xAdsFile')
  const uploadedAt = new Date().toISOString()

  if (!isUploadFile(file) || file.size === 0) {
    await persistXAdsUpload(site.id, {
      ok: false,
      uploadedAt,
      errors: ['请选择非空的 X Ads .xlsx / .xls / .csv 文件'],
    })
    revalidatePath(`/sites/${slug}/connections`)
    return
  }

  const filename = file.name || 'upload.xlsx'
  const parsed = parseXAdsDailyExport(await file.arrayBuffer(), filename)

  if (parsed.errors.length > 0) {
    await persistXAdsUpload(site.id, {
      ok: false,
      uploadedAt,
      filename,
      errors: parsed.errors,
    })
    revalidatePath(`/sites/${slug}/connections`)
    return
  }

  await persistXAdsUpload(site.id, {
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
  revalidatePath(`/sites/${slug}/connections`)
  revalidatePath(`/sites/${slug}/dashboard`)
}
