import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.resetModules()
})

function serviceAccountJson() {
  return JSON.stringify({
    client_email: 'ads@example.iam.gserviceaccount.com',
    private_key: 'private-key',
    project_id: 'amd',
  })
}

describe('getGoogleAdsCredentials', () => {
  it('reads service-account Google Ads credentials from env and normalizes IDs', async () => {
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'developer-token'
    process.env.GOOGLE_ADS_CUSTOMER_ID = '920-316-7221'
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = '656-303-8097'
    process.env.GOOGLE_ADS_SERVICE_ACCOUNT_JSON = serviceAccountJson()

    const { getGoogleAdsCredentials, isGoogleAdsConfigured } = await import('./google-ads-config')

    expect(getGoogleAdsCredentials()).toMatchObject({
      developerToken: 'developer-token',
      customerId: '9203167221',
      loginCustomerId: '6563038097',
      clientEmail: 'ads@example.iam.gserviceaccount.com',
      privateKey: 'private-key',
      projectId: 'amd',
      tokenUri: 'https://oauth2.googleapis.com/token',
    })
    expect(isGoogleAdsConfigured()).toBe(true)
  })

  it('returns null when required env values are missing or invalid', async () => {
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'developer-token'
    process.env.GOOGLE_ADS_CUSTOMER_ID = 'not-a-customer-id'
    process.env.GOOGLE_ADS_SERVICE_ACCOUNT_JSON = serviceAccountJson()

    const { getGoogleAdsCredentials, isGoogleAdsConfigured } = await import('./google-ads-config')

    expect(getGoogleAdsCredentials()).toBeNull()
    expect(isGoogleAdsConfigured()).toBe(false)
  })
})
