/** Meta Ads credential shape used by connectors (payloads live in DB). */

export const DEFAULT_META_AD_ACCOUNT_ID = 'act_1497377618536088'

export interface MetaAdsCredentials {
  accessToken: string
  adAccountId: string
}
