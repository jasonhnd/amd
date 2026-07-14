import { auth } from '@clerk/nextjs/server'

import { SidebarWithPath } from '@/components/SidebarWithPath'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listSitesForUser } from '@/lib/sites/bootstrap'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  let sites: { slug: string; name: string }[] = []
  if (userId && isDatabaseConfigured()) {
    try {
      const list = await listSitesForUser(userId)
      sites = list.map((s) => ({ slug: s.slug, name: s.name }))
    } catch {
      sites = []
    }
  }

  return (
    <div className="flex min-h-screen">
      <SidebarWithPath sites={sites} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
