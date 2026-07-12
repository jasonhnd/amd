'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { spendTrend } from '@/lib/mock-data'

const series = [
  { key: 'x_ads', name: 'X Ads', color: 'var(--color-x)' },
  { key: 'meta_ads', name: 'Meta Ads', color: 'var(--color-meta)' },
  { key: 'google_ads', name: 'Google Ads', color: 'var(--color-google)' },
]

export function SpendTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={spendTrend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }}
          tickLine={false}
          axisLine={false}
          interval={5}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            border: '1px solid var(--color-line)',
            fontSize: 12,
          }}
          formatter={(v: number, n) => [`¥${v.toLocaleString()}`, n]}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stackId="1"
            stroke={s.color}
            strokeWidth={1.5}
            fill={`url(#g-${s.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
