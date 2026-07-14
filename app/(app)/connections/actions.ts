'use server'

import { getGa4Credentials } from '@/lib/ga4-config'
import { getMetaAdsCredentials } from '@/lib/meta-ads-config'
import { ga4Status, metaAdsStatus } from '@/lib/connectors'

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
