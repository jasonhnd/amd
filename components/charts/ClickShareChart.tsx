'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { channels } from '@/lib/mock-data'

const data = channels.map((c) => ({
  name: c.name,
  value: c.clicks,
  color: `var(--color-${c.platform.replace('_ads', '')})`,
}))

export function ClickShareChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={2}
          stroke="var(--color-panel)"
          strokeWidth={2}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 10, border: '1px solid var(--color-line)', fontSize: 12 }}
          formatter={(v: number, n) => [`${v} 点击`, n]}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
