'use client'

import { Calendar, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function TopBar({ date }: { date: string }) {
  const [spinning, setSpinning] = useState(false)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[var(--color-panel)] px-8 py-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">📊 广告日报</h1>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{
            background: 'var(--color-warn-soft)',
            color: 'var(--color-warn)',
            borderRadius: 999,
          }}
        >
          示例数据 · 原型
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 rounded-lg border bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line-soft)]"
          style={{ borderRadius: 10 }}
        >
          <Calendar size={15} />
          <span className="tabular">{date}</span>
        </button>
        <button
          onClick={() => {
            setSpinning(true)
            setTimeout(() => setSpinning(false), 900)
          }}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-accent)', borderRadius: 10 }}
        >
          <RefreshCw size={15} className={spinning ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>
    </div>
  )
}
