'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

import { getOrgSecret, setOrgSecret } from '@/lib/credentials/site'
import { requireSiteAccess } from '@/lib/sites/access'

export async function saveOrgDeveloperToken(
  slug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { userId } = await auth()
    if (!userId) return { ok: false, error: 'Unauthorized' }
    const { site } = await requireSiteAccess(slug, userId, 'owner')
    const token = String(formData.get('developerToken') ?? '').trim()
    if (!token) return { ok: false, error: 'Token 不能为空' }
    await setOrgSecret(site.orgId, 'google_ads_developer_token', token)
    revalidatePath(`/sites/${slug}/settings`)
    revalidatePath(`/sites/${slug}/connections`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '保存失败' }
  }
}

export async function hasOrgDeveloperToken(orgId: string): Promise<boolean> {
  const v = await getOrgSecret(orgId, 'google_ads_developer_token')
  return Boolean(v)
}
