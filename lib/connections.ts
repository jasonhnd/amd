// 连接页示例状态（原型用）

export type ConnStatus = 'connected' | 'error' | 'disconnected'

export type Connection = {
  key: string
  name: string
  desc: string
  accountId: string
  status: ConnStatus
  method: string // 接入方式
  note?: string
  accent: string
}

export const connections: Connection[] = [
  {
    key: 'ga4',
    name: 'GA4',
    desc: '网站流量、访客、Key Events、自然流量',
    accountId: 'Property 298707336',
    status: 'connected',
    method: 'Google OAuth',
    accent: 'var(--color-ga4)',
  },
  {
    key: 'google_ads',
    name: 'Google Ads',
    desc: '花费、展示、点击、CPC、转化',
    accountId: '920-316-7221',
    status: 'connected',
    method: 'Google OAuth · Developer Token',
    accent: 'var(--color-google)',
  },
  {
    key: 'meta_ads',
    name: 'Meta Ads',
    desc: 'IG / FB 花费与点击表现',
    accountId: 'act_1497377618536088',
    status: 'error',
    method: 'Marketing API',
    note: 'API access blocked — 可手动上传 xlsx 兜底',
    accent: 'var(--color-meta)',
  },
  {
    key: 'x_ads',
    name: 'X Ads',
    desc: 'X 广告花费、展示、点击',
    accountId: '18ce55vi8hm',
    status: 'disconnected',
    method: '手动上传 Daily xlsx',
    note: 'v1 走上传兜底，API 直连后续接',
    accent: 'var(--color-x)',
  },
]

export const STATUS_META: Record<ConnStatus, { label: string; color: string; soft: string }> = {
  connected: { label: '已连接', color: 'var(--color-ok)', soft: 'var(--color-ok-soft)' },
  error: { label: '异常', color: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
  disconnected: { label: '未连接', color: 'var(--color-ink-faint)', soft: 'var(--color-line-soft)' },
}
