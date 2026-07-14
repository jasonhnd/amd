export type Ga4CredentialPayload = {
  propertyId: string
  /** Full service account JSON string */
  serviceAccountJson: string
}

export type GoogleAdsCredentialPayload = {
  customerId: string
  loginCustomerId?: string
  serviceAccountJson: string
  /** Optional per-site override; prefer org_secrets */
  developerToken?: string
}

export type MetaAdsCredentialPayload = {
  accessToken: string
  adAccountId: string
}

export type PlatformCredentialPayload =
  | Ga4CredentialPayload
  | GoogleAdsCredentialPayload
  | MetaAdsCredentialPayload
