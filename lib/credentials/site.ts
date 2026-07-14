import 'server-only'

import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { decryptJson, encryptJson } from '@/lib/crypto'
import { getDb } from '@/lib/db/client'
import { connections, orgSecrets, type ConnectionPlatform } from '@/lib/db/schema'
import type { Ga4Credentials } from '@/lib/ga4-config'
import type { GoogleAdsCredentials } from '@/lib/google-ads-config'
import { DEFAULT_META_AD_ACCOUNT_ID, type MetaAdsCredentials } from '@/lib/meta-ads-config'
import { refreshAccessToken } from '@/lib/google-oauth'
import type {
  Ga4CredentialPayload,
  GoogleAdsCredentialPayload,
  MetaAdsCredentialPayload,
} from './types'

const serviceAccountSchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
  project_id: z.string().min(1),
  token_uri: z.string().url().optional(),
})

function normalizeCustomerId(value: string | undefined): string | null {
  if (!value) return null
  const id = value.replace(/\D/g, '')
  return /^\d{10}$/.test(id) ? id : null
}

export async function getConnectionRow(siteId: string, platform: ConnectionPlatform) {
  const db = getDb()
  const rows = await db
    .select()
    .from(connections)
    .where(and(eq(connections.siteId, siteId), eq(connections.platform, platform)))
    .limit(1)
  return rows[0] ?? null
}

export async function saveConnectionCredentials(input: {
  siteId: string
  platform: ConnectionPlatform
  accountId: string
  payload: unknown
  status?: 'connected' | 'error' | 'disconnected'
  lastError?: string | null
}): Promise<void> {
  const db = getDb()
  const enc = encryptJson(input.payload)
  const existing = await getConnectionRow(input.siteId, input.platform)
  if (existing) {
    await db
      .update(connections)
      .set({
        accountId: input.accountId,
        credentialsEnc: enc,
        status: input.status ?? 'connected',
        lastError: input.lastError ?? null,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, existing.id))
    return
  }
  await db.insert(connections).values({
    siteId: input.siteId,
    platform: input.platform,
    accountId: input.accountId,
    credentialsEnc: enc,
    status: input.status ?? 'connected',
    lastError: input.lastError ?? null,
  })
}

export async function clearConnection(siteId: string, platform: ConnectionPlatform): Promise<void> {
  const db = getDb()
  const existing = await getConnectionRow(siteId, platform)
  if (!existing) return
  await db
    .update(connections)
    .set({
      credentialsEnc: null,
      accountId: null,
      status: 'disconnected',
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(connections.id, existing.id))
}

export async function getOrgSecret(orgId: string, key: string): Promise<string | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(orgSecrets)
    .where(and(eq(orgSecrets.orgId, orgId), eq(orgSecrets.key, key)))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return decryptJson<string>(row.valueEnc)
}

export async function setOrgSecret(orgId: string, key: string, value: string): Promise<void> {
  const db = getDb()
  const valueEnc = encryptJson(value)
  const existing = await db
    .select()
    .from(orgSecrets)
    .where(and(eq(orgSecrets.orgId, orgId), eq(orgSecrets.key, key)))
    .limit(1)
  if (existing[0]) {
    await db
      .update(orgSecrets)
      .set({ valueEnc, updatedAt: new Date() })
      .where(and(eq(orgSecrets.orgId, orgId), eq(orgSecrets.key, key)))
    return
  }
  await db.insert(orgSecrets).values({ orgId, key, valueEnc })
}

export async function getSiteGa4Credentials(siteId: string): Promise<Ga4Credentials | null> {
  const row = await getConnectionRow(siteId, 'ga4')
  if (!row?.credentialsEnc || row.status === 'disconnected') return null
  try {
    const payload = decryptJson<Ga4CredentialPayload>(row.credentialsEnc)
    if (payload.auth === 'oauth') {
      const accessToken = await refreshAccessToken(payload.refreshToken)
      return {
        mode: 'oauth',
        propertyId: payload.propertyId,
        accessToken,
      }
    }
    const sa = serviceAccountSchema.parse(JSON.parse(payload.serviceAccountJson))
    return {
      mode: 'service_account',
      propertyId: payload.propertyId,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
      projectId: sa.project_id,
    }
  } catch {
    return null
  }
}

export async function getSiteGoogleAdsCredentials(
  siteId: string,
  orgId: string
): Promise<GoogleAdsCredentials | null> {
  const row = await getConnectionRow(siteId, 'google_ads')
  if (!row?.credentialsEnc || row.status === 'disconnected') return null
  try {
    const payload = decryptJson<GoogleAdsCredentialPayload>(row.credentialsEnc)
    const customerId = normalizeCustomerId(payload.customerId)
    if (!customerId) return null
    const developerToken =
      payload.developerToken ||
      (await getOrgSecret(orgId, 'google_ads_developer_token')) ||
      null
    if (!developerToken) return null

    if (payload.auth === 'oauth') {
      const accessToken = await refreshAccessToken(payload.refreshToken)
      return {
        mode: 'oauth',
        developerToken,
        customerId,
        loginCustomerId: normalizeCustomerId(payload.loginCustomerId) ?? undefined,
        accessToken,
      }
    }

    const sa = serviceAccountSchema.parse(JSON.parse(payload.serviceAccountJson))
    return {
      mode: 'service_account',
      developerToken,
      customerId,
      loginCustomerId: normalizeCustomerId(payload.loginCustomerId) ?? undefined,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
      projectId: sa.project_id,
      tokenUri: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
    }
  } catch {
    return null
  }
}

export async function getSiteMetaAdsCredentials(
  siteId: string
): Promise<MetaAdsCredentials | null> {
  const row = await getConnectionRow(siteId, 'meta_ads')
  if (!row?.credentialsEnc || row.status === 'disconnected') return null
  try {
    const payload = decryptJson<MetaAdsCredentialPayload>(row.credentialsEnc)
    if (!payload.accessToken) return null
    return {
      accessToken: payload.accessToken,
      adAccountId: payload.adAccountId || DEFAULT_META_AD_ACCOUNT_ID,
    }
  } catch {
    return null
  }
}

export async function listConnectionStatuses(siteId: string) {
  const db = getDb()
  return db.select().from(connections).where(eq(connections.siteId, siteId))
}
