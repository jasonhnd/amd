import type { Connector } from './types'
import type { Ga4Credentials } from '@/lib/ga4-config'
import { fetchGa4Daily, ga4Status } from './ga4'

export * from './types'
export { fetchGa4Daily, ga4Status, mergeKeyEvents, normalizeGa4 } from './ga4'

export const connectors = {
  ga4: {
    platform: 'ga4',
    fetchDaily: fetchGa4Daily,
    status: ga4Status,
  } satisfies Connector<Ga4Credentials>,
}
