'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { visitorTrend } from '@/lib/mock-data'

const series = [
  { key: 'Referral', color: 'var(--color-ink-faint)' },
  { key: 'Organic Social', color: 'var(--color-ga4)' },
  { key: 'Direct', color: 'var(--color-accent)' },
  { key: 'Organic Search', color: 'var(--color-ok)' },
]

export function VisitorTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={visitorTrend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
          width={40}
        />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: '1px solid var(--color-line)', fontSize: 12 }}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stackId="1"
            stroke={s.color}
            strokeWidth={1.5}
            fillOpacity={0.18}
            fill={s.color}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
