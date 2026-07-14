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
 * Never throws — missing Google link / Bad Request → null.
 */
export async function getClerkGoogleAccessToken(
  clerkUserId: string
): Promise<ClerkGoogleToken | null> {
  if (!clerkUserId) {
    return null
  }

  try {
    const client = await clerkClient()
    // Prefer short provider id; fall back to legacy oauth_google if needed.
    let res
    try {
      res = await client.users.getUserOauthAccessToken(clerkUserId, 'google')
    } catch {
      res = await client.users.getUserOauthAccessToken(clerkUserId, 'oauth_google')
    }
    const row = res.data?.[0]
    if (!row?.token) {
      return null
    }
    return {
      accessToken: row.token,
      scopes: row.scopes ?? [],
    }
  } catch {
    // Clerk returns 400 Bad Request when the user has no Google external account.
    return null
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
