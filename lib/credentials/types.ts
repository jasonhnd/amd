export type Ga4CredentialPayload =
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
