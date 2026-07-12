import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMD · AI Marketing Dashboard',
  description: '统一营销看板 — 广告 + 流量',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
