import 'server-only'

import { BetaAnalyticsDataClient } from '@google-analytics/data'

import type { Ga4Credentials } from '@/lib/ga4-config'
import { KEY_EVENTS, type DailyMetrics } from './types'

interface Ga4Row {
  dimensionValues?: { value?: string | null }[] | null
  metricValues?: { value?: string | null }[] | null
}

interface Ga4Response {
  rows?: Ga4Row[] | null
}

interface DateAccumulator {
  metric: DailyMetrics
  engagementWeightedTotal: number
  engagementWeight: number
}

function toNumber(value: string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatGa4Date(raw: string | null | undefined): string | null {
  if (!raw || !/^\d{8}$/.test(raw)) {
    return null
  }

  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

export function normalizeGa4(resp: Ga4Response): DailyMetrics[] {
  const byDate = new Map<string, DateAccumulator>()

  for (const row of resp.rows ?? []) {
    const date = formatGa4Date(row.dimensionValues?.[0]?.value)
    if (!date) {
      continue
    }

    const channel = row.dimensionValues?.[1]?.value || 'Unknown'
    const activeUsers = toNumber(row.metricValues?.[0]?.value)
    const sessions = toNumber(row.metricValues?.[1]?.value)
    const avgEngagement = toNumber(row.metricValues?.[2]?.value)
    const accumulator =
      byDate.get(date) ??
      ({
        metric: { date, visitors: 0, sessions: 0, organicBySource: {} },
        engagementWeightedTotal: 0,
        engagementWeight: 0,
      } satisfies DateAccumulator)

    accumulator.metric.visitors = (accumulator.metric.visitors ?? 0) + activeUsers
    accumulator.metric.sessions = (accumulator.metric.sessions ?? 0) + sessions
    accumulator.metric.organicBySource = accumulator.metric.organicBySource ?? {}
    accumulator.metric.organicBySource[channel] =
      (accumulator.metric.organicBySource[channel] ?? 0) + activeUsers

    if (avgEngagement > 0) {
      const weight = sessions || activeUsers || 1
      accumulator.engagementWeightedTotal += avgEngagement * weight
      accumulator.engagementWeight += weight
    }

    byDate.set(date, accumulator)
  }

  return [...byDate.values()]
    .map(({ metric, engagementWeightedTotal, engagementWeight }) => ({
      ...metric,
      ...(engagementWeight > 0
        ? { avgEngagementSec: Math.round(engagementWeightedTotal / engagementWeight) }
        : {}),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function mergeKeyEvents(base: DailyMetrics[], resp: Ga4Response): DailyMetrics[] {
  const byDate = new Map<string, DailyMetrics>(
    base.map((day) => [
      day.date,
      {
        ...day,
        keyEvents: { ...(day.keyEvents ?? {}) },
        organicBySource: day.organicBySource ? { ...day.organicBySource } : undefined,
      },
    ])
  )

  for (const row of resp.rows ?? []) {
    const date = formatGa4Date(row.dimensionValues?.[0]?.value)
    const eventName = row.dimensionValues?.[1]?.value
    if (!date || !eventName) {
      continue
    }

    const count = toNumber(row.metricValues?.[0]?.value)
    const day = byDate.get(date) ?? { date, keyEvents: {} }
    day.keyEvents = day.keyEvents ?? {}
    day.keyEvents[eventName] = (day.keyEvents[eventName] ?? 0) + count
    byDate.set(date, day)
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

async function runReportOauth(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>
): Promise<Ga4Response> {
  const resp = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`GA4 runReport failed (${resp.status}): ${text.slice(0, 200)}`)
  }
  return (await resp.json()) as Ga4Response
}

function createGa4Client(credentials: Extract<Ga4Credentials, { mode: 'service_account' }>) {
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey,
    },
    projectId: credentials.projectId,
  })
}

export async function fetchGa4Daily(
  credentials: Ga4Credentials,
  range: { start: string; end: string }
): Promise<DailyMetrics[]> {
  const trafficBody = {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'averageSessionDuration' },
    ],
  }
  const eventsBody = {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'date' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: [...KEY_EVENTS] },
      },
    },
  }

  if (credentials.mode === 'oauth') {
    const traffic = await runReportOauth(
      credentials.accessToken,
      credentials.propertyId,
      trafficBody
    )
    const events = await runReportOauth(
      credentials.accessToken,
      credentials.propertyId,
      eventsBody
    )
    return mergeKeyEvents(normalizeGa4(traffic), events)
  }

  const ga4 = createGa4Client(credentials)
  const property = `properties/${credentials.propertyId}`
  const [traffic] = await ga4.runReport({ property, ...trafficBody })
  const [events] = await ga4.runReport({ property, ...eventsBody })
  return mergeKeyEvents(normalizeGa4(traffic), events)
}

export async function ga4Status(
  credentials: Ga4Credentials
): Promise<{ ok: boolean; error?: string }> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    await fetchGa4Daily(credentials, { start: today, end: today })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown error',
    }
  }
}
