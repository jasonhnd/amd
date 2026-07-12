import { channels, channelStatus, ga4, BUDGET_RULES } from '@/lib/mock-data'
import { AlertTriangle, TrendingUp, Info } from 'lucide-react'

type Advice = {
  level: 'warn' | 'ok' | 'info'
  text: string
}

// 按规则从当日数据生成建议（非 AI；AI 版本后续接入）。
function buildAdvice(): Advice[] {
  const items: Advice[] = []

  for (const c of channels) {
    const st = channelStatus(c)
    if (st.level === 'warn') {
      const line = BUDGET_RULES[c.platform].line
      items.push({
        level: 'warn',
        text: `${c.name} 花费 ¥${c.spend.toLocaleString()} 超规则线 ¥${line.toLocaleString()}——${st.assessment}。`,
      })
    }
  }

  const submitRate = ga4.keyEvents[0].value
    ? Math.round((ga4.keyEvents[1].value / ga4.keyEvents[0].value) * 100)
    : 0
  items.push({
    level: 'info',
    text: `站内：${ga4.keyEvents[0].value} 次开始查询、${ga4.keyEvents[1].value} 次提交（提交率 ${submitRate}%），平均停留 ${ga4.avgEngagementSec} 秒。`,
  })

  const organicTop = ga4.organicBySource[0]
  items.push({
    level: 'ok',
    text: `自然流量以 ${organicTop.source}（${organicTop.value}）为主，SEO 资产在积累，维持内容节奏。`,
  })

  return items
}

const ICONS = {
  warn: AlertTriangle,
  ok: TrendingUp,
  info: Info,
} as const

const COLORS = {
  warn: 'var(--color-warn)',
  ok: 'var(--color-ok)',
  info: 'var(--color-accent)',
} as const

export function DailyAdvice() {
  const advice = buildAdvice()

  return (
    <div className="flex flex-col gap-3">
      {advice.map((a, i) => {
        const Icon = ICONS[a.level]
        return (
          <div key={i} className="flex items-start gap-2.5">
            <Icon size={16} className="mt-0.5 shrink-0" style={{ color: COLORS[a.level] }} />
            <p className="text-[13px] leading-relaxed text-[var(--color-ink-soft)]">{a.text}</p>
          </div>
        )
      })}
      <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
        规则生成 · AI 版本（自动运营建议）后续接入
      </p>
    </div>
  )
}
