import * as XLSX from 'xlsx'

import type { DailyMetrics } from './types'

export const X_ADS_ACCOUNT_ID = '18ce55vi8hm'

export interface XAdsParseResult {
  metrics: DailyMetrics[]
  errors: string[]
}

type CellValue = string | number | boolean | Date | null | undefined

interface ColumnIndexes {
  date: number
  spend: number
  impressions: number
  clicks: number
}

const REQUIRED_COLUMNS = ['date', 'spend', 'impressions', 'clicks'] as const

function toBuffer(input: ArrayBuffer | Uint8Array): Buffer {
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input)
  }

  return Buffer.from(input.buffer, input.byteOffset, input.byteLength)
}

function normalizeHeader(value: CellValue): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()./%:]+/g, '')
}

function headerMatches(kind: keyof ColumnIndexes, value: CellValue): boolean {
  const header = normalizeHeader(value)
  if (!header) {
    return false
  }

  if (kind === 'date') {
    return ['date', 'day', 'daily', 'timeperiod', '日付', '日期', '年月日'].includes(header)
  }

  if (kind === 'spend') {
    return (
      ['spend', 'amountspent', 'cost', 'costs', 'totalcost', '広告費', '費用', '支出'].includes(
        header
      ) || header.includes('spend')
    )
  }

  if (kind === 'impressions') {
    return (
      ['impressions', 'impr', 'imps', '表示回数', '曝光'].includes(header) ||
      header.includes('impression')
    )
  }

  return (
    ['clicks', 'click', 'linkclicks', 'クリック', '点击'].includes(header) ||
    header.endsWith('clicks')
  )
}

function findColumn(row: CellValue[], kind: keyof ColumnIndexes): number {
  return row.findIndex((cell) => headerMatches(kind, cell))
}

function findHeader(rows: CellValue[][]): { index: number; columns: ColumnIndexes } | null {
  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const row = rows[index] ?? []
    const columns = {
      date: findColumn(row, 'date'),
      spend: findColumn(row, 'spend'),
      impressions: findColumn(row, 'impressions'),
      clicks: findColumn(row, 'clicks'),
    }

    if (REQUIRED_COLUMNS.every((key) => columns[key] >= 0)) {
      return { index, columns }
    }
  }

  return null
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDateParts(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  return `${year}-${pad2(month)}-${pad2(day)}`
}

function parseDateValue(value: CellValue): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return formatDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    return parsed ? formatDateParts(parsed.y, parsed.m, parsed.d) : null
  }

  const raw = String(value ?? '').trim()
  if (!raw) {
    return null
  }

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) {
    return formatDateParts(Number(compact[1]), Number(compact[2]), Number(compact[3]))
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const parsed = XLSX.SSF.parse_date_code(Number(raw))
    if (parsed) {
      return formatDateParts(parsed.y, parsed.m, parsed.d)
    }
  }

  const yearFirst = raw.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/)
  if (yearFirst) {
    return formatDateParts(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]))
  }

  const monthFirst = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (monthFirst) {
    const year = Number(monthFirst[3].length === 2 ? `20${monthFirst[3]}` : monthFirst[3])
    return formatDateParts(year, Number(monthFirst[1]), Number(monthFirst[2]))
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.valueOf())) {
    return formatDateParts(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate())
  }

  return null
}

function parseMetricValue(value: CellValue): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const raw = String(value ?? '').trim()
  if (!raw || raw === '-') {
    return null
  }

  const negative = raw.startsWith('(') && raw.endsWith(')')
  const cleaned = raw.replace(/[(),¥$€£,\s%]/g, '')
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return negative ? -parsed : parsed
}

function isBlankRow(row: CellValue[]): boolean {
  return row.every((cell) => String(cell ?? '').trim() === '')
}

function isTotalsRow(value: CellValue): boolean {
  return /^(total|totals|合計|総計)$/i.test(String(value ?? '').trim())
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits))
}

export function parseXAdsDailyExport(
  input: ArrayBuffer | Uint8Array,
  filename = 'upload.xlsx'
): XAdsParseResult {
  try {
    const workbook = XLSX.read(toBuffer(input), {
      type: 'buffer',
      cellDates: true,
      raw: false,
    })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return { metrics: [], errors: [`${filename}: no sheets found`] }
    }

    const rows = XLSX.utils.sheet_to_json<CellValue[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
    })
    const header = findHeader(rows)
    if (!header) {
      return {
        metrics: [],
        errors: [
          `${filename}: missing required daily columns: Date, Spend, Impressions, Clicks`,
        ],
      }
    }

    const errors: string[] = []
    const byDate = new Map<string, Required<Pick<DailyMetrics, 'date' | 'spend' | 'impressions' | 'clicks'>>>()

    for (let index = header.index + 1; index < rows.length; index += 1) {
      const row = rows[index] ?? []
      if (isBlankRow(row) || isTotalsRow(row[header.columns.date])) {
        continue
      }

      const rowNumber = index + 1
      const date = parseDateValue(row[header.columns.date])
      const spend = parseMetricValue(row[header.columns.spend])
      const impressions = parseMetricValue(row[header.columns.impressions])
      const clicks = parseMetricValue(row[header.columns.clicks])

      if (!date) {
        errors.push(`Row ${rowNumber}: invalid or missing date`)
        continue
      }

      if (spend === null || impressions === null || clicks === null) {
        errors.push(`Row ${rowNumber}: spend, impressions, and clicks must be numeric`)
        continue
      }

      const current = byDate.get(date) ?? { date, spend: 0, impressions: 0, clicks: 0 }
      current.spend += spend
      current.impressions += impressions
      current.clicks += clicks
      byDate.set(date, current)
    }

    const metrics = [...byDate.values()]
      .map((day) => ({
        date: day.date,
        spend: round(day.spend, 2),
        impressions: day.impressions,
        clicks: day.clicks,
        ...(day.impressions > 0 ? { ctr: round(day.clicks / day.impressions, 4) } : {}),
        ...(day.clicks > 0 ? { cpc: round(day.spend / day.clicks, 2) } : {}),
        ...(day.impressions > 0 ? { cpm: round((day.spend / day.impressions) * 1000, 2) } : {}),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (metrics.length === 0 && errors.length === 0) {
      errors.push(`${filename}: no daily metric rows found`)
    }

    return { metrics, errors }
  } catch (error) {
    return {
      metrics: [],
      errors: [error instanceof Error ? `${filename}: ${error.message}` : `${filename}: invalid file`],
    }
  }
}
