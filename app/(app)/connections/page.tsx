import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { isDatabaseConfigured } from '@/lib/db/client'
import { listSitesForUser } from '@/lib/sites/bootstrap'

export const dynamic = 'force-dynamic'

/** Compat: /connections → first site connections */
export default async function ConnectionsRedirectPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  if (!isDatabaseConfigured()) redirect('/sites')
  const sites = await listSitesForUser(userId)
  if (sites[0]) redirect(`/sites/${sites[0].slug}/connections`)
  redirect('/sites')
}
