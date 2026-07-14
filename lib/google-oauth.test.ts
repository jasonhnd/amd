import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/crypto', () => ({
  encryptJson: (v: unknown) => JSON.stringify(v),
  decryptJson: <T,>(s: string) => JSON.parse(s) as T,
}))

import { signOAuthState, verifyOAuthState } from './google-oauth'

describe('OAuth state', () => {
  const prevEnc = process.env.APP_ENCRYPTION_KEY
  const prevId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const prevSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

  afterEach(() => {
    process.env.APP_ENCRYPTION_KEY = prevEnc
    process.env.GOOGLE_OAUTH_CLIENT_ID = prevId
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = prevSecret
  })

  it('round-trips signed state', () => {
    process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64')
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'cid'
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'sec'
    const payload = {
      siteSlug: 'mirai-shigoto',
      siteId: 'sid',
      orgId: 'oid',
      clerkUserId: 'user_1',
      nonce: 'n1',
      exp: Date.now() + 60_000,
    }
    const state = signOAuthState(payload)
    expect(verifyOAuthState(state)).toMatchObject({
      siteSlug: 'mirai-shigoto',
      clerkUserId: 'user_1',
    })
  })

  it('rejects tampered state', () => {
    process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64')
    const state = signOAuthState({
      siteSlug: 'a',
      siteId: 's',
      orgId: 'o',
      clerkUserId: 'u',
      nonce: 'n',
      exp: Date.now() + 60_000,
    })
    expect(() => verifyOAuthState(state + 'x')).toThrow()
  })
})
