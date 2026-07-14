'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PlugZap, Globe2, Settings } from 'lucide-react'
import clsx from 'clsx'

export function Sidebar({
  sites = [],
  currentSlug,
}: {
  sites?: { slug: string; name: string }[]
  currentSlug?: string
}) {
  const pathname = usePathname()
  const base = currentSlug ? `/sites/${currentSlug}` : null

  const nav = base
    ? [
        { href: `${base}/dashboard`, label: '看板', icon: LayoutDashboard },
        { href: `${base}/connections`, label: '连接', icon: PlugZap },
        { href: `${base}/settings`, label: '设置', icon: Settings },
      ]
    : [{ href: '/sites', label: '站点', icon: Globe2 }]

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-[var(--color-panel)] px-4 py-6">
      <Link href="/sites" className="flex items-center gap-2.5 px-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: 'var(--color-accent)', borderRadius: 12 }}
        >
          A
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">AMD</div>
          <div className="text-[11px] text-[var(--color-ink-faint)]">Marketing Dashboard</div>
        </div>
      </Link>

      {sites.length > 0 ? (
        <div className="mt-6 px-2">
          <label className="text-[11px] font-medium text-[var(--color-ink-faint)]">当前站点</label>
          <select
            className="mt-1 w-full rounded-lg border bg-transparent px-2 py-2 text-[13px]"
            value={currentSlug ?? ''}
            onChange={(e) => {
              const slug = e.target.value
              if (slug) window.location.href = `/sites/${slug}/dashboard`
            }}
          >
            {sites.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <nav className="mt-6 flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                  : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]'
              )}
              style={{ borderRadius: 10 }}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          )
        })}
        {base ? (
          <Link
            href="/sites"
            className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-ink-faint)] hover:bg-[var(--color-line-soft)]"
            style={{ borderRadius: 10 }}
          >
            <Globe2 size={17} />
            全部站点
          </Link>
        ) : null}
      </nav>

      <div className="mt-auto border-t pt-4">
        <div className="flex items-center gap-2.5 px-2">
          <UserButton />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium">账户</div>
            <div className="truncate text-[11px] text-[var(--color-ink-faint)]">Clerk</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
