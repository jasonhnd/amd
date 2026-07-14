import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const credentials = {
  accessToken: 'test-token',
  adAccountId: 'act_1497377618536088',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('normalizeMetaAds', () => {
  it('normalizes daily insights rows into DailyMetrics', async () => {
    const { normalizeMetaAds } = await import('./meta-ads')

    const out = normalizeMetaAds({
      data: [
        {
          date_start: '2026-07-12',
          spend: '1236.50',
          impressions: '18900',
          clicks: '142',
          cpc: '8.707746',
          ctr: '0.751323',
          cpm: '65.42328',
        },
      ],
    })

    expect(out).toEqual([
      {
        date: '2026-07-12',
        spend: 1236.5,
        impressions: 18900,
        clicks: 142,
        cpc: 8.707746,
        ctr: 0.751323,
        cpm: 65.42328,
      },
    ])
  })

  it('computes CPC, CTR, and CPM when Meta omits derived metrics', async () => {
    const { normalizeMetaAds } = await import('./meta-ads')

    const out = normalizeMetaAds({
      data: [
        {
          date_start: '2026-07-12',
          spend: '100',
          impressions: '10000',
          clicks: '25',
        },
      ],
    })

    expect(out[0]).toMatchObject({
      cpc: 4,
      ctr: 0.25,
      cpm: 10,
    })
  })
})

describe('fetchMetaAdsDaily', () => {
  it('requests daily account insights and normalizes the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              date_start: '2026-07-11',
              spend: '50',
              impressions: '5000',
              clicks: '10',
              cpc: '5',
              ctr: '0.2',
              cpm: '10',
            },
          ],
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)
    const { fetchMetaAdsDaily } = await import('./meta-ads')

    const out = await fetchMetaAdsDaily(credentials, {
      start: '2026-07-11',
      end: '2026-07-12',
    })
    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]))

    expect(out[0]).toMatchObject({ date: '2026-07-11', spend: 50, impressions: 5000 })
    expect(requestedUrl.pathname).toBe('/v25.0/act_1497377618536088/insights')
    expect(requestedUrl.searchParams.get('time_increment')).toBe('1')
    expect(requestedUrl.searchParams.get('fields')).toContain('spend')
    expect(requestedUrl.searchParams.get('access_token')).toBe('test-token')
  })
})

describe('metaAdsStatus', () => {
  it('returns a UI-safe error when Meta API access is blocked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: '(#200) API access blocked',
              type: 'OAuthException',
              code: 200,
            },
          }),
          { status: 400 }
        )
      )
    )
    const { metaAdsStatus } = await import('./meta-ads')

    const status = await metaAdsStatus(credentials)

    expect(status.ok).toBe(false)
    expect(status.error).toContain('Meta Marketing API access blocked')
    expect(status.error).toContain('ads_read')
  })
})
