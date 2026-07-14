/** Google Ads credential shape used by connectors (payloads live in DB). */

export interface GoogleAdsCredentials {
  developerToken: string
  customerId: string
  loginCustomerId?: string
  clientEmail: string
  privateKey: string
  projectId: string
  tokenUri: string
}
