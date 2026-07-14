import type { Connector } from './types'
import type { Ga4Credentials } from '@/lib/ga4-config'
import type { GoogleAdsCredentials } from '@/lib/google-ads-config'
import { fetchGa4Daily, ga4Status } from './ga4'
import { fetchGoogleAdsDaily, googleAdsStatus } from './google-ads'

export * from './types'
export { fetchGa4Daily, ga4Status, mergeKeyEvents, normalizeGa4 } from './ga4'
export {
  fetchGoogleAdsDaily,
  googleAdsStatus,
  normalizeGoogleAds,
  type GoogleAdsApiClient,
} from './google-ads'

export const connectors = {
  ga4: {
    platform: 'ga4',
    fetchDaily: fetchGa4Daily,
    status: ga4Status,
  } satisfies Connector<Ga4Credentials>,
  google_ads: {
    platform: 'google_ads',
    fetchDaily: fetchGoogleAdsDaily,
    status: googleAdsStatus,
  } satisfies Connector<GoogleAdsCredentials>,
}
