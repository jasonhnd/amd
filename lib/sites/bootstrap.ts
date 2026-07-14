import 'server-only'

import { eq } from 'drizzle-orm'

import { getDb, isDatabaseConfigured } from '@/lib/db/client'
import { organizations, siteMembers, sites, type Site, type SiteRole } from '@/lib/db/schema'

export type UserSite = {
  id: string
  slug: string
  name: string
  domain: string | null
  role: SiteRole
}

const DEFAULT_ORG_NAME = 'AMD Workspace'
const DEFAULT_SITE_SLUG = 'mirai-shigoto'
const DEFAULT_SITE_NAME = 'Mirai Shigoto'
const DEFAULT_SITE_DOMAIN = 'mirai-shigoto.com'

/**
 * List sites for user. If DB is empty (no orgs), bootstrap default org + mirai-shigoto
 * and make this user owner.
 */
export async function listSitesForUser(clerkUserId: string): Promise<UserSite[]> {
  if (!isDatabaseConfigured()) {
    return []
  }

  const db = getDb()

  const existing = await db
    .select({
      id: sites.id,
      slug: sites.slug,
      name: sites.name,
      domain: sites.domain,
      role: siteMembers.role,
    })
    .from(siteMembers)
    .innerJoin(sites, eq(siteMembers.siteId, sites.id))
    .where(eq(siteMembers.clerkUserId, clerkUserId))

  if (existing.length > 0) {
    return existing.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      domain: r.domain,
      role: r.role as SiteRole,
    }))
  }

  const orgCount = await db.select({ id: organizations.id }).from(organizations).limit(1)
  if (orgCount.length > 0) {
    // Org already exists; do not auto-join strangers.
    return []
  }

  const [org] = await db
    .insert(organizations)
    .values({ name: DEFAULT_ORG_NAME })
    .returning()

  const [site] = await db
    .insert(sites)
    .values({
      orgId: org.id,
      slug: DEFAULT_SITE_SLUG,
      name: DEFAULT_SITE_NAME,
      domain: DEFAULT_SITE_DOMAIN,
      timezone: 'Asia/Tokyo',
    })
    .returning()

  await db.insert(siteMembers).values({
    siteId: site.id,
    clerkUserId,
    role: 'owner',
  })

  // Seed disconnected connection rows for UI
  const { connections } = await import('@/lib/db/schema')
  await db.insert(connections).values(
    (['ga4', 'google_ads', 'meta_ads', 'x_ads'] as const).map((platform) => ({
      siteId: site.id,
      platform,
      status: 'disconnected' as const,
    }))
  )

  return [
    {
      id: site.id,
      slug: site.slug,
      name: site.name,
      domain: site.domain,
      role: 'owner',
    },
  ]
}

export async function createSite(input: {
  clerkUserId: string
  name: string
  slug: string
  domain?: string
}): Promise<Site> {
  const db = getDb()
  const slug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) {
    throw new Error('Invalid slug')
  }

  // Prefer existing org of this user as owner
  const owned = await db
    .select({ orgId: sites.orgId })
    .from(siteMembers)
    .innerJoin(sites, eq(siteMembers.siteId, sites.id))
    .where(eq(siteMembers.clerkUserId, input.clerkUserId))
    .limit(1)

  let orgId = owned[0]?.orgId
  if (!orgId) {
    const orgs = await db.select().from(organizations).limit(1)
    if (orgs[0]) {
      orgId = orgs[0].id
    } else {
      const [org] = await db
        .insert(organizations)
        .values({ name: DEFAULT_ORG_NAME })
        .returning()
      orgId = org.id
    }
  }

  const [site] = await db
    .insert(sites)
    .values({
      orgId,
      slug,
      name: input.name.trim(),
      domain: input.domain?.trim() || null,
      timezone: 'Asia/Tokyo',
    })
    .returning()

  await db.insert(siteMembers).values({
    siteId: site.id,
    clerkUserId: input.clerkUserId,
    role: 'owner',
  })

  const { connections } = await import('@/lib/db/schema')
  await db.insert(connections).values(
    (['ga4', 'google_ads', 'meta_ads', 'x_ads'] as const).map((platform) => ({
      siteId: site.id,
      platform,
      status: 'disconnected' as const,
    }))
  )

  return site
}
