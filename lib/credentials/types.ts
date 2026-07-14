export type Ga4CredentialPayload =
  | {
      /** Use Clerk Google OAuth token of connectedByUserId at fetch time — no GCP client. */
      auth: 'clerk'
      propertyId: string
      connectedByUserId: string
    }
  | {
      auth: 'oauth'
      propertyId: string
      refreshToken: string
    }
  | {
      auth: 'service_account'
      propertyId: string
      serviceAccountJson: string
    }

export type GoogleAdsCredentialPayload =
  | {
      auth: 'clerk'
      customerId: string
      loginCustomerId?: string
      connectedByUserId: string
      developerToken?: string
    }
  | {
      auth: 'oauth'
      customerId: string
      loginCustomerId?: string
      refreshToken: string
      developerToken?: string
    }
  | {
      auth: 'service_account'
      customerId: string
      loginCustomerId?: string
      serviceAccountJson: string
      developerToken?: string
    }

export type MetaAdsCredentialPayload = {
  accessToken: string
  adAccountId: string
}
