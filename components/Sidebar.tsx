'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PlugZap, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { doSignOut } from '@/app/(app)/actions'

const nav = [
  { href: '/dashboard', label: '看板', icon: LayoutDashboard },
  { href: '/connections', label: '连接', icon: PlugZap },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-[var(--color-panel)] px-4 py-6">
      <div className="flex items-center gap-2.5 px-2">
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
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
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
      </nav>

      <div className="mt-auto border-t pt-4">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-line)] text-xs font-semibold">
            Y
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium">Yaku</div>
            <div className="truncate text-[11px] text-[var(--color-ink-faint)]">556 / Mirai</div>
          </div>
          <form action={doSignOut}>
            <button
              type="submit"
              className="text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
              aria-label="退出"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
