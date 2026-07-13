import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6">
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
        <SignIn />
      </div>
    </div>
  )
}
