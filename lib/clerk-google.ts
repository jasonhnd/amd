import 'server-only'

import { clerkClient } from '@clerk/nextjs/server'

/** Scopes needed for GA4 + Google Ads (configure once in Clerk → Google social connection). */
export const GOOGLE_DATA_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/adwords',
] as const

export type ClerkGoogleToken = {
  accessToken: string
  scopes: string[]
}

/**
 * Read the signed-in user's Google OAuth access token from Clerk.
 * Requires the user to have signed in with Google, and Clerk Dashboard
 * Google provider to include analytics/adwords scopes (no GCP project of ours).
 */
export async function getClerkGoogleAccessToken(
  clerkUserId: string
): Promise<ClerkGoogleToken | null> {
  const client = await clerkClient()
  const res = await client.users.getUserOauthAccessToken(clerkUserId, 'google')
  const row = res.data?.[0]
  if (!row?.token) {
    return null
  }
  return {
    accessToken: row.token,
    scopes: row.scopes ?? [],
  }
}

export function hasAnalyticsScope(scopes: string[]): boolean {
  return scopes.some(
    (s) =>
      s.includes('analytics.readonly') ||
      s.includes('analytics') ||
      s === 'https://www.googleapis.com/auth/analytics.readonly'
  )
}

export function hasAdwordsScope(scopes: string[]): boolean {
  return scopes.some(
    (s) => s.includes('adwords') || s === 'https://www.googleapis.com/auth/adwords'
  )
}
