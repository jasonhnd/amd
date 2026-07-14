/** GA4 credential shape used by connectors (payloads live in DB). */

export type Ga4Credentials =
  | {
      mode: 'oauth'
      propertyId: string
      accessToken: string
    }
  | {
      mode: 'service_account'
      propertyId: string
      clientEmail: string
      privateKey: string
      projectId: string
    }
