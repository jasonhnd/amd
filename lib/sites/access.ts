import 'server-only'

import { and, eq } from 'drizzle-orm'

import { getDb } from '@/lib/db/client'
import { siteMembers, sites, type Site, type SiteRole } from '@/lib/db/schema'
import { roleAtLeast } from '@/lib/sites/roles'

export { roleAtLeast }

export async function getSiteBySlug(slug: string): Promise<Site | null> {
  const db = getDb()
  const rows = await db.select().from(sites).where(eq(sites.slug, slug)).limit(1)
  return rows[0] ?? null
}

export async function getMembership(
  siteId: string,
  clerkUserId: string
): Promise<{ role: SiteRole } | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(siteMembers)
    .where(and(eq(siteMembers.siteId, siteId), eq(siteMembers.clerkUserId, clerkUserId)))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return { role: row.role as SiteRole }
}

export async function requireSiteAccess(
  slug: string,
  clerkUserId: string,
  minimum: SiteRole = 'viewer'
): Promise<{ site: Site; role: SiteRole }> {
  const site = await getSiteBySlug(slug)
  if (!site) {
    throw new Error('Site not found')
  }
  const membership = await getMembership(site.id, clerkUserId)
  if (!membership || !roleAtLeast(membership.role, minimum)) {
    throw new Error('Forbidden')
  }
  return { site, role: membership.role }
}
