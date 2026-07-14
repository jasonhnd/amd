import {
  BUDGET_RULES,
  channelStatus,
  type ChannelRow,
} from '@/lib/ad-metrics'
import { AlertTriangle, TrendingUp, Info } from 'lucide-react'

type Advice = {
  level: 'warn' | 'ok' | 'info'
  text: string
}

export type DailyAdviceGa4 = {
  visitors?: number
  sessions?: number
  avgEngagementSec?: number
  keyEvents?: { name: string; label: string; value: number }[]
  organicBySource?: { source: string; value: number }[]
}

// 按规则从当日数据生成建议（非 AI；AI 版本后续接入）。
function buildAdvice(channels: ChannelRow[], ga4: DailyAdviceGa4): Advice[] {
  const items: Advice[] = []

  for (const c of channels) {
    const st = channelStatus(c)
    if (c.availability === 'live' && st.level === 'warn') {
      const line = BUDGET_RULES[c.platform].line
      items.push({
        level: 'warn',
        text: `${c.name} 花费 ¥${c.spend.toLocaleString()} 超规则线 ¥${line.toLocaleString()}——${st.assessment}。`,
      })
    } else if (c.availability === 'error') {
      items.push({
        level: 'warn',
        text: `${c.name} 拉取失败：${c.error ?? '未知错误'}。`,
      })
    } else if (c.availability === 'not_configured') {
      items.push({
        level: 'info',
        text: `${c.name} 尚未配置，连接页完成后会显示真实花费。`,
      })
    }
  }

  const keyEvents = ga4.keyEvents ?? []
  const start = keyEvents.find((k) => k.name === 'job_search_start')?.value
  const submit = keyEvents.find((k) => k.name === 'job_search_submit')?.value
  if (start !== undefined && submit !== undefined) {
    const submitRate = start ? Math.round((submit / start) * 100) : 0
    items.push({
      level: 'info',
      text: `站内：${start} 次开始查询、${submit} 次提交（提交率 ${submitRate}%）${
        ga4.avgEngagementSec !== undefined
          ? `，平均停留 ${ga4.avgEngagementSec} 秒`
          : ''
      }。`,
    })
  } else if (ga4.visitors === undefined) {
    items.push({
      level: 'info',
      text: 'GA4 未配置，站内质量建议暂不可用。',
    })
  }

  const organicTop = ga4.organicBySource?.[0]
  if (organicTop) {
    items.push({
      level: 'ok',
      text: `自然流量以 ${organicTop.source}（${organicTop.value}）为主，SEO 资产在积累，维持内容节奏。`,
    })
  }

  if (items.length === 0) {
    items.push({
      level: 'info',
      text: '暂无运营建议：等待广告或 GA4 数据接入。',
    })
  }

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

export function DailyAdvice({
  channels,
  ga4 = {},
}: {
  channels: ChannelRow[]
  ga4?: DailyAdviceGa4
}) {
  const advice = buildAdvice(channels, ga4)

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
