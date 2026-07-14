import 'server-only'

import { createSign } from 'node:crypto'

import type { GoogleAdsCredentials } from '@/lib/google-ads-config'
import type { DailyMetrics } from './types'

const GOOGLE_ADS_API_VERSION = 'v24'
const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords'

interface GoogleAdsMetricRow {
  segments?: { date?: string | null } | null
  metrics?: {
    costMicros?: string | number | null
    impressions?: string | number | null
    clicks?: string | number | null
    ctr?: string | number | null
    averageCpc?: string | number | null
    averageCpm?: string | number | null
  } | null
}

interface GoogleAdsSearchResponse {
  results?: GoogleAdsMetricRow[] | null
  nextPageToken?: string | null
}

export interface GoogleAdsApiClient {
  search(query: string): Promise<GoogleAdsSearchResponse>
}

function base64Url(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function microsToCurrency(value: string | number | null | undefined): number {
  return toNumber(value) / 1_000_000
}

async function getAccessToken(credentials: GoogleAdsCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claimSet = base64Url(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: GOOGLE_ADS_SCOPE,
      aud: credentials.tokenUri,
      exp: now + 3600,
      iat: now,
    })
  )
  const unsignedJwt = `${header}.${claimSet}`
  const signature = createSign('RSA-SHA256').update(unsignedJwt).sign(credentials.privateKey, 'base64')
  const assertion = `${unsignedJwt}.${signature
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')}`

  const resp = await fetch(credentials.tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!resp.ok) {
    throw new Error(`Google Ads auth failed (${resp.status})`)
  }

  const token = (await resp.json()) as { access_token?: string }
  if (!token.access_token) {
    throw new Error('Google Ads auth failed: missing access token')
  }

  return token.access_token
}

function createGoogleAdsClient(credentials: GoogleAdsCredentials): GoogleAdsApiClient {
  return {
    async search(query: string): Promise<GoogleAdsSearchResponse> {
      const accessToken = await getAccessToken(credentials)
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'developer-token': credentials.developerToken,
      }

      if (credentials.loginCustomerId) {
        headers['login-customer-id'] = credentials.loginCustomerId
      }

      const results: GoogleAdsMetricRow[] = []
      let pageToken: string | undefined

      do {
        const resp = await fetch(
          `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${credentials.customerId}/googleAds:search`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query,
              ...(pageToken ? { pageToken } : {}),
            }),
          }
        )

        if (!resp.ok) {
          throw new Error(`Google Ads search failed (${resp.status})`)
        }

        const page = (await resp.json()) as GoogleAdsSearchResponse
        results.push(...(page.results ?? []))
        pageToken = page.nextPageToken ?? undefined
      } while (pageToken)

      return { results }
    },
  }
}

export function normalizeGoogleAds(resp: GoogleAdsSearchResponse): DailyMetrics[] {
  const byDate = new Map<string, DailyMetrics>()

  for (const row of resp.results ?? []) {
    const date = row.segments?.date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue
    }

    const metrics = row.metrics ?? {}
    const day = byDate.get(date) ?? {
      date,
      spend: 0,
      impressions: 0,
      clicks: 0,
    }

    day.spend = (day.spend ?? 0) + microsToCurrency(metrics.costMicros)
    day.impressions = (day.impressions ?? 0) + toNumber(metrics.impressions)
    day.clicks = (day.clicks ?? 0) + toNumber(metrics.clicks)
    byDate.set(date, day)
  }

  return [...byDate.values()]
    .map((day) => {
      const spend = day.spend ?? 0
      const impressions = day.impressions ?? 0
      const clicks = day.clicks ?? 0

      return {
        ...day,
        spend: Math.round(spend * 100) / 100,
        ctr: impressions ? (clicks / impressions) * 100 : 0,
        cpc: clicks ? spend / clicks : 0,
        cpm: impressions ? (spend / impressions) * 1000 : 0,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchGoogleAdsDaily(
  credentials: GoogleAdsCredentials,
  range: { start: string; end: string },
  client: GoogleAdsApiClient = createGoogleAdsClient(credentials)
): Promise<DailyMetrics[]> {
  const query = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks
    FROM customer
    WHERE segments.date BETWEEN '${range.start}' AND '${range.end}'
    ORDER BY segments.date
  `

  return normalizeGoogleAds(await client.search(query))
}

export async function googleAdsStatus(
  credentials: GoogleAdsCredentials,
  client: GoogleAdsApiClient = createGoogleAdsClient(credentials)
): Promise<{ ok: boolean; error?: string }> {
  try {
    await client.search('SELECT customer.id FROM customer LIMIT 1')
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown error',
    }
  }
}
