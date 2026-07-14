'use client'

import { useState, useTransition } from 'react'

export function DeveloperTokenForm({
  save,
  hasToken,
}: {
  save: (fd: FormData) => Promise<{ ok: boolean; error?: string }>
  hasToken: boolean
}) {
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <form
      className="mt-4 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        start(async () => {
          const res = await save(fd)
          setMsg(res.ok ? '已保存' : res.error ?? '失败')
        })
      }}
    >
      <input
        name="developerToken"
        type="password"
        required
        placeholder={hasToken ? '输入新 token 以覆盖' : '粘贴 Developer Token'}
        autoComplete="off"
        className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
        style={{ borderRadius: 10 }}
      >
        {pending ? '保存中…' : '保存 Token'}
      </button>
      {msg ? <p className="text-[12px] text-[var(--color-ink-soft)]">{msg}</p> : null}
    </form>
  )
}
