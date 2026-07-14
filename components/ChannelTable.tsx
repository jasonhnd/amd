import {
  channelStatus,
  type ChannelRow,
  type ChannelTotals,
} from '@/lib/ad-metrics'

function pct(part: number, whole: number) {
  return whole ? `${((part / whole) * 100).toFixed(1)}%` : '—'
}

function metricCell(row: ChannelRow, formatted: string) {
  if (row.availability !== 'live') {
    return '—'
  }
  return formatted
}

export function ChannelTable({
  channels,
  totals,
}: {
  channels: ChannelRow[]
  totals: ChannelTotals
}) {
  const clickTotal = totals.clicksToday

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b text-left text-[12px] font-medium text-[var(--color-ink-faint)]">
            <th className="py-2.5 pr-4 font-medium">渠道</th>
            <th className="px-3 py-2.5 text-right font-medium">花费</th>
            <th className="px-3 py-2.5 text-right font-medium">展示</th>
            <th className="px-3 py-2.5 text-right font-medium">点击</th>
            <th className="px-3 py-2.5 text-right font-medium">点击率</th>
            <th className="px-3 py-2.5 text-right font-medium">CPC</th>
            <th className="px-3 py-2.5 text-right font-medium">CPM</th>
            <th className="px-3 py-2.5 text-right font-medium">花费占比</th>
            <th className="px-3 py-2.5 text-right font-medium">点击占比</th>
            <th className="px-3 py-2.5 font-medium">状态</th>
            <th className="py-2.5 pl-3 font-medium">评估</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {channels.map((c) => {
            const st = channelStatus(c)
            const statusBg =
              st.level === 'warn'
                ? 'var(--color-warn-soft)'
                : st.level === 'ok'
                  ? 'var(--color-ok-soft)'
                  : 'var(--color-line-soft)'
            const statusColor =
              st.level === 'warn'
                ? 'var(--color-warn)'
                : st.level === 'ok'
                  ? 'var(--color-ok)'
                  : 'var(--color-ink-faint)'

            return (
              <tr key={c.platform} className="border-b border-[var(--color-line-soft)]">
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        background: `var(--color-${c.platform.replace('_ads', '')})`,
                      }}
                    />
                    {c.name}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {metricCell(c, `¥${c.spend.toLocaleString()}`)}
                </td>
                <td className="px-3 py-3 text-right">
                  {metricCell(c, c.impressions.toLocaleString())}
                </td>
                <td className="px-3 py-3 text-right">{metricCell(c, String(c.clicks))}</td>
                <td className="px-3 py-3 text-right">
                  {metricCell(c, `${c.ctr.toFixed(2)}%`)}
                </td>
                <td className="px-3 py-3 text-right">
                  {metricCell(c, `¥${c.cpc.toFixed(1)}`)}
                </td>
                <td className="px-3 py-3 text-right">
                  {metricCell(c, `¥${c.cpm.toFixed(0)}`)}
                </td>
                <td className="px-3 py-3 text-right">
                  {c.availability === 'live' ? pct(c.spend, totals.spendToday) : '—'}
                </td>
                <td className="px-3 py-3 text-right">
                  {c.availability === 'live' ? pct(c.clicks, clickTotal) : '—'}
                </td>
                <td className="px-3 py-3">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
                    style={{
                      borderRadius: 999,
                      background: statusBg,
                      color: statusColor,
                    }}
                  >
                    {st.label}
                  </span>
                </td>
                <td className="py-3 pl-3 text-[12px] text-[var(--color-ink-soft)]">
                  {st.assessment}
                </td>
              </tr>
            )
          })}
          <tr className="font-semibold">
            <td className="py-3 pr-4">合计</td>
            <td className="px-3 py-3 text-right">
              {totals.liveCount > 0 ? `¥${totals.spendToday.toLocaleString()}` : '—'}
            </td>
            <td className="px-3 py-3 text-right">
              {totals.liveCount > 0 ? totals.impressionsToday.toLocaleString() : '—'}
            </td>
            <td className="px-3 py-3 text-right">
              {totals.liveCount > 0 ? clickTotal : '—'}
            </td>
            <td colSpan={7} />
          </tr>
        </tbody>
      </table>
    </div>
  )
}
