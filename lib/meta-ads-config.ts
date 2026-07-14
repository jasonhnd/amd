import 'server-only'

import { env } from './env'

export const DEFAULT_META_AD_ACCOUNT_ID = 'act_1497377618536088'

export interface MetaAdsCredentials {
  accessToken: string
  adAccountId: string
}

export function getMetaAdsCredentials(): MetaAdsCredentials | null {
  const accessToken = env.META_ACCESS_TOKEN()
  if (!accessToken) {
    return null
  }

  return {
    accessToken,
    adAccountId: env.META_AD_ACCOUNT_ID() ?? DEFAULT_META_AD_ACCOUNT_ID,
  }
}

export function isMetaAdsConfigured(): boolean {
  return getMetaAdsCredentials() !== null
}
