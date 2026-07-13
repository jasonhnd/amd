import 'server-only'

import { z } from 'zod'

export interface Ga4Credentials {
  propertyId: string
  clientEmail: string
  privateKey: string
  projectId: string
}

const serviceAccountSchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
  project_id: z.string().min(1),
})

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined
}

export function getGa4Credentials(): Ga4Credentials | null {
  const propertyId = optionalEnv('GA4_PROPERTY_ID')
  const rawServiceAccount = optionalEnv('GA4_SERVICE_ACCOUNT_JSON')

  if (!propertyId || !rawServiceAccount) {
    return null
  }

  try {
    const serviceAccount = serviceAccountSchema.parse(JSON.parse(rawServiceAccount))
    return {
      propertyId,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
      projectId: serviceAccount.project_id,
    }
  } catch {
    return null
  }
}

export function isGa4Configured(): boolean {
  return getGa4Credentials() !== null
}
