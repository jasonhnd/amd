import 'server-only'

import { revalidateTag, unstable_cache } from 'next/cache'

import { fetchGa4Daily, type DailyMetrics } from '@/lib/connectors'
import { getGa4Credentials } from '@/lib/ga4-config'

const GA4_CACHE_TAG = 'ga4'

const cachedGa4Range = unstable_cache(
  async (start: string, end: string): Promise<DailyMetrics[]> => {
    const credentials = getGa4Credentials()
    if (!credentials) {
      return []
    }

    return fetchGa4Daily(credentials, { start, end })
  },
  ['ga4-range'],
  { revalidate: 3600, tags: [GA4_CACHE_TAG] }
)

export async function getGa4Range(start: string, end: string): Promise<DailyMetrics[]> {
  return cachedGa4Range(start, end)
}

export async function getGa4Day(date: string): Promise<DailyMetrics | null> {
  const rows = await getGa4Range(date, date)
  return rows[0] ?? null
}

export async function refreshGa4(): Promise<void> {
  revalidateTag(GA4_CACHE_TAG)
}
