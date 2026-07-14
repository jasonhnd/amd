import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { isDatabaseConfigured } from '@/lib/db/client'
import { listSitesForUser } from '@/lib/sites/bootstrap'

export const dynamic = 'force-dynamic'

/** Compat: /dashboard → first site or /sites */
export default async function DashboardRedirectPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (!isDatabaseConfigured()) {
    redirect('/sites')
  }

  const sites = await listSitesForUser(userId)
  if (sites[0]) {
    redirect(`/sites/${sites[0].slug}/dashboard`)
  }
  redirect('/sites')
}
