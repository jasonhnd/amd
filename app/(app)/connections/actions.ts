'use server'

import { redirect } from 'next/navigation'

/** Legacy — use `/sites/[slug]/connections` actions. */
export async function testGa4(): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: '请在站点连接页配置 GA4' }
}

export async function testMetaAds(): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: '请在站点连接页配置 Meta' }
}

export async function uploadXAds(): Promise<void> {
  redirect('/sites')
}
