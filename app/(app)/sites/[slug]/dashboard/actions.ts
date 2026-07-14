'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

import { refreshAdMetrics } from '@/lib/ad-metrics-service'
import { refreshGa4 } from '@/lib/ga4-service'
import { requireSiteAccess } from '@/lib/sites/access'

export async function refreshSiteDataAction(slug: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) return
  const { site } = await requireSiteAccess(slug, userId, 'viewer')
  await Promise.all([refreshGa4(site.id), refreshAdMetrics(site.id)])
  revalidatePath(`/sites/${slug}/dashboard`)
}
