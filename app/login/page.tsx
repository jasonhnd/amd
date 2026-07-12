import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div
        className="w-full max-w-sm rounded-2xl border bg-[var(--color-panel)] p-8"
        style={{ borderRadius: 18, boxShadow: '0 8px 30px rgba(20,20,40,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--color-accent)', borderRadius: 12 }}
          >
            A
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">AMD</div>
            <div className="text-[11px] text-[var(--color-ink-faint)]">AI Marketing Dashboard</div>
          </div>
        </div>

        <h1 className="mt-7 text-xl font-semibold tracking-tight">登录</h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">团队账号登录，查看 556 营销看板</p>

        <div className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--color-ink-soft)]">邮箱</span>
            <input
              type="email"
              placeholder="you@team.com"
              className="rounded-lg border bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              style={{ borderRadius: 10 }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--color-ink-soft)]">密码</span>
            <input
              type="password"
              placeholder="••••••••"
              className="rounded-lg border bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              style={{ borderRadius: 10 }}
            />
          </label>

          <Link
            href="/dashboard"
            className="mt-2 rounded-lg py-2.5 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)', borderRadius: 10 }}
          >
            进入看板
          </Link>
        </div>

        <p className="mt-5 text-center text-[11px] text-[var(--color-ink-faint)]">
          原型演示 · 未接真实认证
        </p>
      </div>
    </div>
  )
}
