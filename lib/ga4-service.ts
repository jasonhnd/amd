import 'server-only'

import { revalidateTag, unstable_cache } from 'next/cache'

import { fetchGa4Daily, type DailyMetrics } from '@/lib/connectors'
import { getSiteGa4Credentials } from '@/lib/credentials/site'

function ga4CacheTag(siteId: string) {
  return `ga4:${siteId}`
}

export async function getGa4Range(
  siteId: string,
  start: string,
  end: string
): Promise<DailyMetrics[]> {
  const cached = unstable_cache(
    async (): Promise<DailyMetrics[]> => {
      const credentials = await getSiteGa4Credentials(siteId)
      if (!credentials) {
        return []
      }
      return fetchGa4Daily(credentials, { start, end })
    },
    ['ga4-range', siteId, start, end],
    { revalidate: 3600, tags: [ga4CacheTag(siteId)] }
  )
  return cached()
}

export async function getGa4Day(
  siteId: string,
  date: string
): Promise<DailyMetrics | null> {
  const rows = await getGa4Range(siteId, date, date)
  return rows[0] ?? null
}

export async function refreshGa4(siteId: string): Promise<void> {
  revalidateTag(ga4CacheTag(siteId))
}
