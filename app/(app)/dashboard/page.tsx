import { TopBar } from '@/components/TopBar'
import { KpiCards } from '@/components/KpiCards'
import { ChannelTable } from '@/components/ChannelTable'
import { Ga4Panel } from '@/components/Ga4Panel'
import { SpendTrendChart } from '@/components/charts/SpendTrendChart'
import { VisitorTrendChart } from '@/components/charts/VisitorTrendChart'
import { CpcChart } from '@/components/charts/CpcChart'
import { ClickShareChart } from '@/components/charts/ClickShareChart'
import { DailyAdvice } from '@/components/DailyAdvice'
import { getAdDashboardSlice } from '@/lib/ad-metrics-service'
import { todayJst } from '@/lib/ad-metrics'
import { KEY_EVENTS } from '@/lib/connectors'
import { getGa4Day } from '@/lib/ga4-service'

/** Live connectors + JST "today" must not be frozen at build time. */
export const dynamic = 'force-dynamic'

const KEY_EVENT_LABELS: Record<(typeof KEY_EVENTS)[number], string> = {
  job_search_start: '开始查询职业',
  job_search_submit: '提交查询',
  result_view: '查看结果',
}

function Panel({
  title,
  hint,
  children,
  className,
}: {
  title?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border bg-[var(--color-panel)] p-6 ${className ?? ''}`}
      style={{ borderRadius: 16, boxShadow: '0 1px 2px rgba(20,20,40,0.03)' }}
    >
      {title ? (
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {hint ? <span className="text-[12px] text-[var(--color-ink-faint)]">{hint}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export default async function DashboardPage() {
  const reportDate = todayJst()
  const [adSlice, ga4Day] = await Promise.all([
    getAdDashboardSlice(reportDate),
    getGa4Day(reportDate),
  ])

  const ga4Props = ga4Day
    ? {
        visitors: ga4Day.visitors,
        sessions: ga4Day.sessions,
        avgEngagementSec: ga4Day.avgEngagementSec,
        keyEvents: KEY_EVENTS.map((key) => ({
          name: key,
          label: KEY_EVENT_LABELS[key],
          value: ga4Day.keyEvents?.[key] ?? 0,
        })),
        organicBySource: Object.entries(ga4Day.organicBySource ?? {})
          .map(([source, value]) => ({ source, value }))
          .sort((a, b) => b.value - a.value),
      }
    : {}

  return (
    <>
      <TopBar date={reportDate} />
      <div className="mx-auto max-w-[1180px] px-8 py-7">
        <div className="flex flex-col gap-6">
          <KpiCards
            totals={adSlice.totals}
            visitors={ga4Props.visitors}
            sessions={ga4Props.sessions}
          />

          <Panel title="渠道表现对比" hint="live connectors · 预算规则超标标黄">
            <ChannelTable channels={adSlice.channels} totals={adSlice.totals} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="💸 近 30 天花费趋势" hint="示例数据 · 尚未接 live 历史">
              <SpendTrendChart />
            </Panel>
            <Panel title="👥 近 30 天访客趋势" hint="示例数据 · 尚未接 GA4 区间">
              <VisitorTrendChart />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1.4fr]">
            <Panel title="CPC 对比" hint="当日 live">
              <CpcChart channels={adSlice.channels} />
            </Panel>
            <Panel title="点击贡献占比" hint="当日 live">
              <ClickShareChart channels={adSlice.channels} />
            </Panel>
            <Panel title="GA4 站内质量">
              <Ga4Panel {...ga4Props} />
            </Panel>
          </div>

          <Panel title="💡 今日运营建议">
            <DailyAdvice channels={adSlice.channels} ga4={ga4Props} />
          </Panel>

          <p className="pt-1 text-center text-[12px] text-[var(--color-ink-faint)]">
            AMD v1 · 渠道 KPI / GA4 按需实时拉取 · 30 天趋势仍为示例
          </p>
        </div>
      </div>
    </>
  )
}
