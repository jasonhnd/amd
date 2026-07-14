import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { encryptJson, decryptJson } from '@/lib/crypto'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/adwords',
  'openid',
  'email',
].join(' ')

export type GoogleOAuthPending = {
  siteSlug: string
  siteId: string
  orgId: string
  clerkUserId: string
  refreshToken: string
  exp: number
}

function clientId(): string {
  const v = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!v) throw new Error('GOOGLE_OAUTH_CLIENT_ID 未配置')
  return v
}

function clientSecret(): string {
  const v = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!v) throw new Error('GOOGLE_OAUTH_CLIENT_SECRET 未配置')
  return v
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET)
}

export function googleOAuthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/connectors/google/callback`
}

export function buildGoogleAuthUrl(input: {
  origin: string
  state: string
}): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: googleOAuthRedirectUri(input.origin),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: input.state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

/** Signed state: base64url(payload).sig */
export function signOAuthState(payload: {
  siteSlug: string
  siteId: string
  orgId: string
  clerkUserId: string
  nonce: string
  exp: number
}): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const secret = process.env.APP_ENCRYPTION_KEY || clientSecret()
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyOAuthState(state: string): {
  siteSlug: string
  siteId: string
  orgId: string
  clerkUserId: string
  nonce: string
  exp: number
} {
  const [body, sig] = state.split('.')
  if (!body || !sig) throw new Error('Invalid OAuth state')
  const secret = process.env.APP_ENCRYPTION_KEY || clientSecret()
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid OAuth state signature')
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
    siteSlug: string
    siteId: string
    orgId: string
    clerkUserId: string
    nonce: string
    exp: number
  }
  if (Date.now() > payload.exp) {
    throw new Error('OAuth state expired')
  }
  return payload
}

export async function exchangeCodeForTokens(
  code: string,
  origin: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: googleOAuthRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Google token exchange failed (${resp.status}): ${text.slice(0, 200)}`)
  }
  const json = (await resp.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }
  if (!json.access_token) {
    throw new Error('Google token exchange missing access_token')
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Google token refresh failed (${resp.status}): ${text.slice(0, 200)}`)
  }
  const json = (await resp.json()) as { access_token?: string }
  if (!json.access_token) {
    throw new Error('Google token refresh missing access_token')
  }
  return json.access_token
}

export function encodePendingCookie(pending: GoogleOAuthPending): string {
  return encryptJson(pending)
}

export function decodePendingCookie(value: string): GoogleOAuthPending {
  const pending = decryptJson<GoogleOAuthPending>(value)
  if (Date.now() > pending.exp) {
    throw new Error('Google OAuth session expired — please connect again')
  }
  return pending
}

export type Ga4PropertyOption = {
  propertyId: string
  displayName: string
  accountName?: string
}

export type GoogleAdsCustomerOption = {
  customerId: string
  descriptiveName?: string
}

/** List GA4 properties the user can access. */
export async function listGa4Properties(accessToken: string): Promise<Ga4PropertyOption[]> {
  const out: Ga4PropertyOption[] = []
  let pageToken: string | undefined

  do {
    const url = new URL('https://analyticsadmin.googleapis.com/v1beta/accountSummaries')
    url.searchParams.set('pageSize', '200')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`List GA4 properties failed (${resp.status}): ${text.slice(0, 200)}`)
    }
    const json = (await resp.json()) as {
      accountSummaries?: Array<{
        displayName?: string
        propertySummaries?: Array<{ property?: string; displayName?: string }>
      }>
      nextPageToken?: string
    }

    for (const account of json.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        const raw = prop.property ?? ''
        const propertyId = raw.replace(/^properties\//, '')
        if (!propertyId) continue
        out.push({
          propertyId,
          displayName: prop.displayName || propertyId,
          accountName: account.displayName,
        })
      }
    }
    pageToken = json.nextPageToken
  } while (pageToken)

  return out
}

/** List accessible Google Ads customer IDs (requires developer token). */
export async function listGoogleAdsCustomers(
  accessToken: string,
  developerToken: string
): Promise<GoogleAdsCustomerOption[]> {
  const resp = await fetch(
    'https://googleads.googleapis.com/v24/customers:listAccessibleCustomers',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    }
  )
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`List Google Ads customers failed (${resp.status}): ${text.slice(0, 240)}`)
  }
  const json = (await resp.json()) as { resourceNames?: string[] }
  return (json.resourceNames ?? []).map((name) => {
    const customerId = name.replace(/^customers\//, '').replace(/\D/g, '')
    return { customerId }
  })
}
