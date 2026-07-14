/** Google Ads credential shape used by connectors (payloads live in DB). */

export type GoogleAdsCredentials =
  | {
      mode: 'oauth'
      developerToken: string
      customerId: string
      loginCustomerId?: string
      accessToken: string
    }
  | {
      mode: 'service_account'
      developerToken: string
      customerId: string
      loginCustomerId?: string
      clientEmail: string
      privateKey: string
      projectId: string
      tokenUri: string
    }
