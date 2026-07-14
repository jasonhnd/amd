'use server'

import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { saveConnectionCredentials } from '@/lib/credentials/site'
import { decodePendingCookie } from '@/lib/google-oauth'
import { requireSiteAccess } from '@/lib/sites/access'

const COOKIE = 'amd_google_oauth_pending'

export async function bindGoogleAccountsAction(slug: string, formData: FormData): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  const { site } = await requireSiteAccess(slug, userId, 'editor')

  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) {
    redirect(`/sites/${slug}/connections?err=google_session`)
  }

  const pending = decodePendingCookie(raw)
  if (pending.siteId !== site.id || pending.clerkUserId !== userId) {
    redirect(`/sites/${slug}/connections?err=google_mismatch`)
  }

  const ga4PropertyId = String(formData.get('ga4PropertyId') ?? '').trim()
  const adsCustomerId = String(formData.get('adsCustomerId') ?? '').trim()
  const loginCustomerId = String(formData.get('loginCustomerId') ?? '').trim() || undefined

  if (!ga4PropertyId && !adsCustomerId) {
    redirect(`/sites/${slug}/connections/google/pick?err=nothing_selected`)
  }

  if (ga4PropertyId) {
    await saveConnectionCredentials({
      siteId: site.id,
      platform: 'ga4',
      accountId: `Property ${ga4PropertyId}`,
      payload: {
        auth: 'oauth',
        propertyId: ga4PropertyId,
        refreshToken: pending.refreshToken,
      },
      status: 'connected',
    })
  }

  if (adsCustomerId) {
    await saveConnectionCredentials({
      siteId: site.id,
      platform: 'google_ads',
      accountId: adsCustomerId,
      payload: {
        auth: 'oauth',
        customerId: adsCustomerId,
        loginCustomerId,
        refreshToken: pending.refreshToken,
      },
      status: 'connected',
    })
  }

  jar.delete(COOKIE)
  redirect(`/sites/${slug}/connections?google=ok`)
}
