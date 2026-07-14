import type { SiteRole } from '@/lib/db/schema'

const ROLE_RANK: Record<SiteRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
}

export function roleAtLeast(role: SiteRole, minimum: SiteRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

export { ROLE_RANK }
