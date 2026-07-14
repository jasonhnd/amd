'use client'

import { useState, useTransition } from 'react'

type SaveResult = { ok: boolean; error?: string }

export function ConnectionForms({
  platform,
  saveGa4,
  saveGoogle,
  saveMeta,
  disconnect,
  uploadX,
  xUpload,
}: {
  slug: string
  platform: 'ga4' | 'google_ads' | 'meta_ads' | 'x_ads'
  saveGa4: (fd: FormData) => Promise<SaveResult>
  saveGoogle: (fd: FormData) => Promise<SaveResult>
  saveMeta: (fd: FormData) => Promise<SaveResult>
  disconnect: () => Promise<SaveResult>
  uploadX: (fd: FormData) => Promise<void>
  xUpload: { ok: true; filename: string; dayCount: number } | { ok: false; error: string } | null
}) {
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function runSave(action: (fd: FormData) => Promise<SaveResult>, fd: FormData) {
    start(async () => {
      setMsg(null)
      const res = await action(fd)
      setMsg(res.ok ? '已保存并通过测试' : res.error ?? '失败')
    })
  }

  if (platform === 'ga4') {
    return (
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          runSave(saveGa4, new FormData(e.currentTarget))
        }}
      >
        <Field name="propertyId" label="Property ID" placeholder="298707336" required />
        <TextArea
          name="serviceAccountJson"
          label="Service Account JSON"
          placeholder='{"type":"service_account",...}'
          required
        />
        <Actions pending={pending} msg={msg} onDisconnect={() => start(async () => { await disconnect(); setMsg('已断开') })} />
      </form>
    )
  }

  if (platform === 'google_ads') {
    return (
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          runSave(saveGoogle, new FormData(e.currentTarget))
        }}
      >
        <Field name="customerId" label="Customer ID" placeholder="920-316-7221" required />
        <Field name="loginCustomerId" label="Login Customer ID (MCC，可选)" placeholder="656-303-8097" />
        <Field
          name="developerToken"
          label="Developer Token（组织级，首次必填）"
          placeholder="留空则使用已存组织密钥"
        />
        <TextArea name="serviceAccountJson" label="Service Account JSON" required />
        <Actions pending={pending} msg={msg} onDisconnect={() => start(async () => { await disconnect(); setMsg('已断开') })} />
      </form>
    )
  }

  if (platform === 'meta_ads') {
    return (
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          runSave(saveMeta, new FormData(e.currentTarget))
        }}
      >
        <Field name="accessToken" label="Access Token" required />
        <Field name="adAccountId" label="Ad Account ID" placeholder="act_1497377618536088" />
        <Actions pending={pending} msg={msg} onDisconnect={() => start(async () => { await disconnect(); setMsg('已断开') })} />
      </form>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {xUpload?.ok === true && (
        <p className="text-[12px] text-[var(--color-ok)]">
          已上传 {xUpload.filename} · {xUpload.dayCount} 天
        </p>
      )}
      {xUpload?.ok === false && (
        <p className="text-[12px] text-[var(--color-danger)]">{xUpload.error}</p>
      )}
      <form
        action={(fd) => {
          start(async () => {
            await uploadX(fd)
            setMsg('上传完成，请刷新查看状态')
          })
        }}
        className="flex flex-col gap-3"
      >
        <input name="xAdsFile" type="file" accept=".xlsx,.xls,.csv" required className="text-sm" />
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
          style={{ borderRadius: 10 }}
        >
          {pending ? '处理中…' : '上传解析'}
        </button>
      </form>
      {msg ? <p className="text-[12px] text-[var(--color-ink-soft)]">{msg}</p> : null}
    </div>
  )
}

function Field({
  name,
  label,
  placeholder,
  required,
}: {
  name: string
  label: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="text-[13px]">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
      />
    </label>
  )
}

function TextArea({
  name,
  label,
  placeholder,
  required,
}: {
  name: string
  label: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="text-[13px]">
      {label}
      <textarea
        name={name}
        required={required}
        placeholder={placeholder}
        rows={5}
        spellCheck={false}
        className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-[12px]"
      />
    </label>
  )
}

function Actions({
  pending,
  msg,
  onDisconnect,
}: {
  pending: boolean
  msg: string | null
  onDisconnect: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
        style={{ borderRadius: 10 }}
      >
        {pending ? '保存中…' : '保存并测试'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={onDisconnect}
        className="rounded-lg border px-4 py-2 text-sm text-[var(--color-ink-soft)]"
        style={{ borderRadius: 10 }}
      >
        断开
      </button>
      {msg ? <span className="text-[12px] text-[var(--color-ink-soft)]">{msg}</span> : null}
    </div>
  )
}
