import { describe, expect, it } from 'vitest'
import {
  assembleChannelRows,
  buildChannelRow,
  channelStatus,
  liveChannelRows,
  metricsForDate,
  sumChannelTotals,
  todayJst,
  type PlatformDayInput,
} from './ad-metrics'

describe('buildChannelRow', () => {
  it('marks not_configured without fabricating spend', () => {
    const row = buildChannelRow(
      { platform: 'google_ads', configured: false },
      '2026-07-11'
    )
    expect(row.availability).toBe('not_configured')
    expect(row.spend).toBe(0)
    expect(row.clicks).toBe(0)
    expect(row.name).toBe('Google Ads')
  })

  it('marks error with zero metrics', () => {
    const row = buildChannelRow(
      {
        platform: 'meta_ads',
        configured: true,
        error: 'API access blocked',
      },
      '2026-07-11'
    )
    expect(row.availability).toBe('error')
    expect(row.spend).toBe(0)
    expect(row.error).toBe('API access blocked')
  })

  it('marks no_data when configured but empty', () => {
    const row = buildChannelRow(
      { platform: 'x_ads', configured: true, metrics: null },
      '2026-07-11'
    )
    expect(row.availability).toBe('no_data')
    expect(row.spend).toBe(0)
  })

  it('maps live metrics and derives missing rates', () => {
    const row = buildChannelRow(
      {
        platform: 'google_ads',
        configured: true,
        metrics: {
          date: '2026-07-11',
          spend: 2180,
          impressions: 4210,
          clicks: 63,
        },
      },
      '2026-07-11'
    )
    expect(row.availability).toBe('live')
    expect(row.spend).toBe(2180)
    expect(row.ctr).toBeCloseTo((63 / 4210) * 100, 5)
    expect(row.cpc).toBeCloseTo(2180 / 63, 5)
    expect(row.cpm).toBeCloseTo((2180 / 4210) * 1000, 5)
  })
})

describe('assembleChannelRows + totals + status', () => {
  const inputs: PlatformDayInput[] = [
    {
      platform: 'google_ads',
      configured: true,
      metrics: {
        date: '2026-07-11',
        spend: 2180,
        impressions: 4210,
        clicks: 63,
        ctr: 1.5,
        cpc: 34.6,
        cpm: 517.8,
      },
    },
    {
      platform: 'meta_ads',
      configured: true,
      metrics: {
        date: '2026-07-11',
        spend: 1236,
        impressions: 18900,
        clicks: 142,
        ctr: 0.75,
        cpc: 8.7,
        cpm: 65.4,
      },
    },
    {
      platform: 'x_ads',
      configured: false,
    },
  ]

  it('returns stable platform order and honest empty x row', () => {
    const rows = assembleChannelRows(inputs, '2026-07-11')
    expect(rows.map((r) => r.platform)).toEqual([
      'google_ads',
      'meta_ads',
      'x_ads',
    ])
    expect(rows[2].availability).toBe('not_configured')
  })

  it('sums only live platforms for spend KPIs', () => {
    const rows = assembleChannelRows(inputs, '2026-07-11')
    const totals = sumChannelTotals(rows)
    expect(totals.liveCount).toBe(2)
    expect(totals.spendToday).toBe(2180 + 1236)
    expect(totals.clicksToday).toBe(63 + 142)
    expect(totals.impressionsToday).toBe(4210 + 18900)
  })

  it('budget warn for Google over ¥2000 line', () => {
    const rows = assembleChannelRows(inputs, '2026-07-11')
    const st = channelStatus(rows[0])
    expect(st.level).toBe('warn')
    expect(st.label).toMatch(/2,?000/)
  })

  it('ok status for Meta under line', () => {
    const rows = assembleChannelRows(inputs, '2026-07-11')
    expect(channelStatus(rows[1]).level).toBe('ok')
  })

  it('idle for not_configured', () => {
    const rows = assembleChannelRows(inputs, '2026-07-11')
    expect(channelStatus(rows[2])).toMatchObject({
      level: 'idle',
      label: '未配置',
    })
  })

  it('liveChannelRows drops non-live', () => {
    const rows = assembleChannelRows(inputs, '2026-07-11')
    expect(liveChannelRows(rows)).toHaveLength(2)
  })
})

describe('metricsForDate', () => {
  it('picks matching day', () => {
    const m = metricsForDate(
      [
        { date: '2026-07-10', spend: 1 },
        { date: '2026-07-11', spend: 2 },
      ],
      '2026-07-11'
    )
    expect(m?.spend).toBe(2)
  })

  it('returns null when missing', () => {
    expect(metricsForDate([{ date: '2026-07-10', spend: 1 }], '2026-07-11')).toBeNull()
    expect(metricsForDate(undefined, '2026-07-11')).toBeNull()
  })
})

describe('todayJst', () => {
  it('formats YYYY-MM-DD in Tokyo', () => {
    // 2026-07-11 15:00 UTC = 2026-07-12 00:00 JST
    const d = new Date('2026-07-11T15:00:00.000Z')
    expect(todayJst(d)).toBe('2026-07-12')
  })
})
