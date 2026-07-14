/** GA4 credential shape used by connectors (payloads live in DB). */

export interface Ga4Credentials {
  propertyId: string
  clientEmail: string
  privateKey: string
  projectId: string
}
