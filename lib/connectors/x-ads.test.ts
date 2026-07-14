import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parseXAdsDailyExport } from './x-ads'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

describe('parseXAdsDailyExport', () => {
  it('parses a daily CSV export and aggregates duplicate dates', async () => {
    const buffer = await readFile(join(fixturesDir, 'x-ads-daily-valid.csv'))
    const result = parseXAdsDailyExport(buffer, 'x-ads-daily-valid.csv')

    expect(result.errors).toEqual([])
    expect(result.metrics).toHaveLength(2)
    expect(result.metrics[0]).toMatchObject({
      date: '2026-07-11',
      spend: 200.5,
      impressions: 1500,
      clicks: 60,
      ctr: 0.04,
      cpc: 3.34,
      cpm: 133.67,
    })
    expect(result.metrics[1]).toMatchObject({
      date: '2026-07-12',
      spend: 210.25,
      impressions: 2000,
      clicks: 100,
    })
  })

  it('parses a daily XLSX export fixture', async () => {
    const buffer = await readFile(join(fixturesDir, 'x-ads-daily-valid.xlsx'))
    const result = parseXAdsDailyExport(buffer, 'x-ads-daily-valid.xlsx')

    expect(result.errors).toEqual([])
    expect(result.metrics.map((day) => day.date)).toEqual(['2026-07-11', '2026-07-12'])
    expect(result.metrics.reduce((sum, day) => sum + (day.spend ?? 0), 0)).toBe(410.75)
    expect(result.metrics.reduce((sum, day) => sum + (day.impressions ?? 0), 0)).toBe(3500)
    expect(result.metrics.reduce((sum, day) => sum + (day.clicks ?? 0), 0)).toBe(160)
  })

  it('returns a clear validation error for an invalid file', async () => {
    const buffer = await readFile(join(fixturesDir, 'x-ads-daily-invalid.csv'))
    const result = parseXAdsDailyExport(buffer, 'x-ads-daily-invalid.csv')

    expect(result.metrics).toEqual([])
    expect(result.errors).toEqual([
      'x-ads-daily-invalid.csv: missing required daily columns: Date, Spend, Impressions, Clicks',
    ])
  })
})
