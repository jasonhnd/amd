'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { saveConnectionCredentials } from '@/lib/credentials/site'
import { requireSiteAccess } from '@/lib/sites/access'

export async function bindGoogleAccountsAction(slug: string, formData: FormData): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  const { site } = await requireSiteAccess(slug, userId, 'editor')

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
        auth: 'clerk',
        propertyId: ga4PropertyId,
        connectedByUserId: userId,
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
        auth: 'clerk',
        customerId: adsCustomerId,
        loginCustomerId,
        connectedByUserId: userId,
      },
      status: 'connected',
    })
  }

  redirect(`/sites/${slug}/connections?google=ok`)
}
