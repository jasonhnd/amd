import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const credentials = {
  mode: 'service_account' as const,
  developerToken: 'developer-token',
  customerId: '9203167221',
  loginCustomerId: '6563038097',
  clientEmail: 'ads@example.iam.gserviceaccount.com',
  privateKey: 'private-key',
  projectId: 'amd',
  tokenUri: 'https://oauth2.googleapis.com/token',
}

describe('normalizeGoogleAds', () => {
  it('sums spend, impressions, and clicks by date', async () => {
    const { normalizeGoogleAds } = await import('./google-ads')
    const out = normalizeGoogleAds({
      results: [
        {
          segments: { date: '2026-07-11' },
          metrics: { costMicros: '120000000', impressions: '1000', clicks: '40' },
        },
        {
          segments: { date: '2026-07-11' },
          metrics: { costMicros: '30000000', impressions: '500', clicks: '10' },
        },
        {
          segments: { date: '2026-07-12' },
          metrics: { costMicros: '7500000', impressions: '250', clicks: '5' },
        },
      ],
    })

    expect(out).toEqual([
      {
        date: '2026-07-11',
        spend: 150,
        impressions: 1500,
        clicks: 50,
        ctr: 3.3333333333333335,
        cpc: 3,
        cpm: 100,
      },
      {
        date: '2026-07-12',
        spend: 7.5,
        impressions: 250,
        clicks: 5,
        ctr: 2,
        cpc: 1.5,
        cpm: 30,
      },
    ])
  })

  it('skips rows without a valid ISO date', async () => {
    const { normalizeGoogleAds } = await import('./google-ads')
    const out = normalizeGoogleAds({
      results: [
        {
          segments: { date: '20260711' },
          metrics: { costMicros: '1000000', impressions: '10', clicks: '1' },
        },
        {
          metrics: { costMicros: '1000000', impressions: '10', clicks: '1' },
        },
      ],
    })

    expect(out).toEqual([])
  })
})

describe('fetchGoogleAdsDaily', () => {
  it('runs a GAQL daily metrics query through the injected client', async () => {
    const { fetchGoogleAdsDaily } = await import('./google-ads')
    const search = vi.fn().mockResolvedValue({
      results: [
        {
          segments: { date: '2026-07-11' },
          metrics: { costMicros: '2180000000', impressions: '4210', clicks: '63' },
        },
      ],
    })

    const out = await fetchGoogleAdsDaily(
      credentials,
      { start: '2026-07-11', end: '2026-07-12' },
      { search }
    )

    expect(search).toHaveBeenCalledTimes(1)
    expect(search.mock.calls[0][0]).toContain("WHERE segments.date BETWEEN '2026-07-11' AND '2026-07-12'")
    expect(search.mock.calls[0][0]).toContain('metrics.cost_micros')
    expect(out[0]).toMatchObject({
      date: '2026-07-11',
      spend: 2180,
      impressions: 4210,
      clicks: 63,
    })
  })
})

describe('googleAdsStatus', () => {
  it('probes the customer with the injected client', async () => {
    const { googleAdsStatus } = await import('./google-ads')
    const search = vi.fn().mockResolvedValue({ results: [] })

    await expect(googleAdsStatus(credentials, { search })).resolves.toEqual({ ok: true })
    expect(search).toHaveBeenCalledWith('SELECT customer.id FROM customer LIMIT 1')
  })

  it('returns an error status when the probe fails', async () => {
    const { googleAdsStatus } = await import('./google-ads')
    const search = vi.fn().mockRejectedValue(new Error('permission denied'))

    await expect(googleAdsStatus(credentials, { search })).resolves.toEqual({
      ok: false,
      error: 'permission denied',
    })
  })
})
