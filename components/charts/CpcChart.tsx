'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { channels } from '@/lib/mock-data'

const data = channels.map((c) => ({ name: c.name, cpc: c.cpc, color: `var(--color-${c.platform.replace('_ads', '')})` }))

export function CpcChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--color-ink-soft)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v) => `¥${v}`}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-line-soft)' }}
          contentStyle={{ borderRadius: 10, border: '1px solid var(--color-line)', fontSize: 12 }}
          formatter={(v: number) => [`¥${v}`, 'CPC']}
        />
        <Bar dataKey="cpc" radius={[6, 6, 0, 0]} maxBarSize={54}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
