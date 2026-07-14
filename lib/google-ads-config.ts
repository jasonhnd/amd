import 'server-only'

import { z } from 'zod'

export interface GoogleAdsCredentials {
  developerToken: string
  customerId: string
  loginCustomerId?: string
  clientEmail: string
  privateKey: string
  projectId: string
  tokenUri: string
}

const serviceAccountSchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
  project_id: z.string().min(1),
  token_uri: z.string().url().optional(),
})

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined
}

function normalizeCustomerId(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const id = value.replace(/\D/g, '')
  return /^\d{10}$/.test(id) ? id : null
}

export function getGoogleAdsCredentials(): GoogleAdsCredentials | null {
  const developerToken = optionalEnv('GOOGLE_ADS_DEVELOPER_TOKEN')
  const customerId = normalizeCustomerId(optionalEnv('GOOGLE_ADS_CUSTOMER_ID'))
  const loginCustomerId = normalizeCustomerId(optionalEnv('GOOGLE_ADS_LOGIN_CUSTOMER_ID')) ?? undefined
  const rawServiceAccount = optionalEnv('GOOGLE_ADS_SERVICE_ACCOUNT_JSON')

  if (!developerToken || !customerId || !rawServiceAccount) {
    return null
  }

  try {
    const serviceAccount = serviceAccountSchema.parse(JSON.parse(rawServiceAccount))
    return {
      developerToken,
      customerId,
      loginCustomerId,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
      projectId: serviceAccount.project_id,
      tokenUri: serviceAccount.token_uri ?? 'https://oauth2.googleapis.com/token',
    }
  } catch {
    return null
  }
}

export function isGoogleAdsConfigured(): boolean {
  return getGoogleAdsCredentials() !== null
}
