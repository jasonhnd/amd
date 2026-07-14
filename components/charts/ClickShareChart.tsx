'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ChannelRow } from '@/lib/ad-metrics'

export function ClickShareChart({ channels }: { channels: ChannelRow[] }) {
  const live = channels.filter((c) => c.availability === 'live')
  const data = live.map((c) => ({
    name: c.name,
    value: c.clicks,
    color: `var(--color-${c.platform.replace('_ads', '')})`,
  }))

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-[180px] items-center justify-center text-[12px] text-[var(--color-ink-faint)]">
        暂无 live 点击占比
      </div>
    )
  }

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
