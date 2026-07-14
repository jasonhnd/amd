'use client'

import { useClerk } from '@clerk/nextjs'

export function ReauthGoogleButton({ returnPath }: { returnPath: string }) {
  const clerk = useClerk()

  return (
    <button
      type="button"
      className="rounded-lg bg-[#1a73e8] px-5 py-2.5 text-sm font-medium text-white"
      style={{ borderRadius: 10 }}
      onClick={async () => {
        // Open Clerk account UI so user can reconnect Google with new scopes
        clerk.openUserProfile({
          appearance: undefined,
        })
        // Also stash return path
        try {
          sessionStorage.setItem('amd_google_return', returnPath)
        } catch {
          /* ignore */
        }
      }}
    >
      打开账户 · 重新连接 Google
    </button>
  )
}
