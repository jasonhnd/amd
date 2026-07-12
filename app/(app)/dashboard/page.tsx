import { TopBar } from '@/components/TopBar'
import { KpiCards } from '@/components/KpiCards'
import { ChannelTable } from '@/components/ChannelTable'
import { Ga4Panel } from '@/components/Ga4Panel'
import { SpendTrendChart } from '@/components/charts/SpendTrendChart'
import { VisitorTrendChart } from '@/components/charts/VisitorTrendChart'
import { CpcChart } from '@/components/charts/CpcChart'
import { ClickShareChart } from '@/components/charts/ClickShareChart'
import { DailyAdvice } from '@/components/DailyAdvice'
import { REPORT_DATE } from '@/lib/mock-data'

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

export default function DashboardPage() {
  return (
    <>
      <TopBar date={REPORT_DATE} />
      <div className="mx-auto max-w-[1180px] px-8 py-7">
        <div className="flex flex-col gap-6">
          <KpiCards />

          <Panel title="渠道表现对比" hint="花费 / 展示 / 点击 / CPC · 预算规则超标标黄">
            <ChannelTable />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="💸 近 30 天花费趋势" hint="JPY">
              <SpendTrendChart />
            </Panel>
            <Panel title="👥 近 30 天访客趋势" hint="按来源">
              <VisitorTrendChart />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1.4fr]">
            <Panel title="CPC 对比">
              <CpcChart />
            </Panel>
            <Panel title="点击贡献占比">
              <ClickShareChart />
            </Panel>
            <Panel title="GA4 站内质量">
              <Ga4Panel />
            </Panel>
          </div>

          <Panel title="💡 今日运营建议">
            <DailyAdvice />
          </Panel>

          <p className="pt-1 text-center text-[12px] text-[var(--color-ink-faint)]">
            AMD v1 原型 · 示例数据 · 接入真实 API 后为实时数据
          </p>
        </div>
      </div>
    </>
  )
}
