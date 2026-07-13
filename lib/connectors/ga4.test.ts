import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('normalizeGa4', () => {
  it('sums activeUsers per date and records channel breakdown', async () => {
    const { normalizeGa4 } = await import('./ga4')
    const resp = {
      rows: [
        {
          dimensionValues: [{ value: '20260711' }, { value: 'Organic Search' }],
          metricValues: [{ value: '96' }, { value: '110' }, { value: '80' }],
        },
        {
          dimensionValues: [{ value: '20260711' }, { value: 'Direct' }],
          metricValues: [{ value: '47' }, { value: '52' }, { value: '70' }],
        },
        {
          dimensionValues: [{ value: '20260712' }, { value: 'Organic Search' }],
          metricValues: [{ value: '12' }, { value: '14' }, { value: '61' }],
        },
      ],
    }

    const out = normalizeGa4(resp)

    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({
      date: '2026-07-11',
      visitors: 143,
      sessions: 162,
      organicBySource: { 'Organic Search': 96, Direct: 47 },
    })
    expect(out[1]).toMatchObject({
      date: '2026-07-12',
      visitors: 12,
      sessions: 14,
      organicBySource: { 'Organic Search': 12 },
    })
  })

  it('adds duplicate channel rows onto the same date and channel', async () => {
    const { normalizeGa4 } = await import('./ga4')
    const out = normalizeGa4({
      rows: [
        {
          dimensionValues: [{ value: '20260711' }, { value: 'Organic Search' }],
          metricValues: [{ value: '30' }, { value: '35' }],
        },
        {
          dimensionValues: [{ value: '20260711' }, { value: 'Organic Search' }],
          metricValues: [{ value: '12' }, { value: '15' }],
        },
      ],
    })

    expect(out[0]).toMatchObject({
      date: '2026-07-11',
      visitors: 42,
      sessions: 50,
      organicBySource: { 'Organic Search': 42 },
    })
  })
})

describe('mergeKeyEvents', () => {
  it('merges key events onto matching dates', async () => {
    const { mergeKeyEvents } = await import('./ga4')
    const base = [{ date: '2026-07-11', visitors: 143, keyEvents: {} }]
    const resp = {
      rows: [
        {
          dimensionValues: [{ value: '20260711' }, { value: 'job_search_start' }],
          metricValues: [{ value: '58' }],
        },
      ],
    }

    const out = mergeKeyEvents(base, resp)

    expect(out[0].keyEvents?.job_search_start).toBe(58)
  })

  it('sums repeated key event rows', async () => {
    const { mergeKeyEvents } = await import('./ga4')
    const out = mergeKeyEvents([{ date: '2026-07-11', visitors: 143 }], {
      rows: [
        {
          dimensionValues: [{ value: '20260711' }, { value: 'result_view' }],
          metricValues: [{ value: '20' }],
        },
        {
          dimensionValues: [{ value: '20260711' }, { value: 'result_view' }],
          metricValues: [{ value: '13' }],
        },
      ],
    })

    expect(out[0].keyEvents?.result_view).toBe(33)
  })
})
