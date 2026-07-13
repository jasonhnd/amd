# AMD · Clerk OAuth 迁移设计文档

- 日期：2026-07-13
- 目标：把 AMD 的认证从 Auth.js（env-var 用户名单）**替换为 Clerk**，获得 OAuth/社交登录（Google 等）、托管登录 UI 和用户管理后台。
- 仓库：github.com/jasonhnd/amd（Next.js 15 App Router，无 `src/`，部署 Vercel）

## 1. 决策与权衡（已确认）

- 用户选择 **Clerk**（Option A）。已知代价：Clerk 是 **Vercel 之外的第三方服务/账号**，与"全在 Vercel、不加外部账单"的原约束相悖；但 Clerk 免费档（1 万月活内）对自用团队为 **$0**。用户已接受。
- Clerk **替换** Auth.js（不与 Auth.js 并存）。社交登录（Google）在 Clerk 后台开启，代码零额外配置即出现在登录组件里。

## 2. 采用 Clerk 最新约定（来自用户提供的官方 quickstart，规范性要求）

- 安装 `@clerk/nextjs@latest`。
- 中间件文件名用 **`middleware.ts`**（项目根，非 `src/`），内容 `clerkMiddleware()` 来自 `@clerk/nextjs/server`。
  - **实测修正（2026-07-13）**：用户提供的 Clerk quickstart 写的是 `proxy.ts`，但那是 **Next.js 16** 的新约定。本项目在 **Next.js 15.5.20**——`proxy.ts` **不会被识别为中间件**（`middleware-manifest.json` 为空、`sortedMiddleware: []`、路由保护不加载）。因此本阶段用 `middleware.ts`。升级到 Next 16 后可改回 `proxy.ts`。
- matcher 必须包含 `'/__clerk/:path*'`（Clerk 自动代理路径）。
- `<ClerkProvider>` 放在 `app/layout.tsx` 的 `<body>` 内。
- 组件只从 `@clerk/nextjs` 或 `@clerk/nextjs/server` 导入。
- 用 `auth()`（来自 `@clerk/nextjs/server`，async/await）。
- 用 `<Show when="signed-in">` / `<Show when="signed-out">`（**不要**用已弃用的 `<SignedIn>`/`<SignedOut>`）。
- **禁止**：`authMiddleware()`、pages router、`_app.tsx`、`withAuth`、旧 `currentUser` 导入、旧 env 命名。

## 3. 要删除的 Auth.js 资产

- `auth.ts`
- `middleware.ts`（Auth.js 版内容整体替换为 Clerk 的 `clerkMiddleware()`，见 §4.2）
- `app/api/auth/[...nextauth]/route.ts`（连同空目录）
- `app/(app)/actions.ts`（`doSignOut` server action）
- `lib/users.ts` 与 `lib/users.test.ts`
- `scripts/hash-users.ts`
- 依赖：卸载 `next-auth`、`bcryptjs`、`@types/bcryptjs`
- `lib/env.ts`：删除 `AUTH_SECRET()`、`AMD_USERS()` 两个访问器，**保留** `GA4_PROPERTY_ID()`、`GA4_SERVICE_ACCOUNT_JSON()`（GA4 连接器仍需）。

## 4. 要新增/修改的内容

### 4.1 依赖
- `pnpm add @clerk/nextjs`
- `pnpm remove next-auth bcryptjs` + 移除 devDep `@types/bcryptjs`

### 4.2 `middleware.ts`（项目根，新建；Next 15.5.20 用此名，非 `proxy.ts`）
全站需登录：除登录页与 Clerk 内部路径外，一律 `auth.protect()`。

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/__clerk(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
```

### 4.3 `app/layout.tsx`（修改）
`<ClerkProvider>` 包在 `<body>` 内，保留现有 `lang="zh-CN"` 与 metadata。

```tsx
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMD · AI Marketing Dashboard',
  description: '统一营销看板 — 广告 + 流量',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  )
}
```

### 4.4 登录页：从 `/login` 迁到 Clerk 约定 `/sign-in`
- 删除现有 `app/login/page.tsx`。
- 新建 `app/sign-in/[[...sign-in]]/page.tsx`，用 Clerk `<SignIn />`，外面保留 AMD 的居中卡片视觉与 logo。社交登录（Google）由 Clerk 后台开启后自动出现在该组件中。

```tsx
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
```

### 4.5 Sidebar 登出 → Clerk `<UserButton />`（修改 `components/Sidebar.tsx`）
- 删除 `import { doSignOut } from '@/app/(app)/actions'` 与那个 `<form action={doSignOut}>`。
- 用户区改用 `<UserButton />`（Clerk）显示头像 + 内置登出菜单。保留左侧 “Yaku / 556 · Mirai” 文案可选：可用 `<UserButton showName />` 或保留静态文案 + 头像按钮。最小实现：

```tsx
import { UserButton } from '@clerk/nextjs'
// ...在原登出按钮位置：
<UserButton />
```

Sidebar 仍是 client 组件（`'use client'`），Clerk 组件在客户端渲染，兼容。

## 5. 环境变量

- 移除：`AUTH_SECRET`、`AMD_USERS`（Vercel 上也删）。
- 新增：
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`
- 保留：`GA4_PROPERTY_ID`、`GA4_SERVICE_ACCOUNT_JSON`（GA4 阶段不受影响）。

## 6. 验收标准

- 未登录访问 `/dashboard` → 重定向到 `/sign-in`（Clerk 保护生效）。
- `/sign-in` 渲染 Clerk `<SignIn />`（含 Google 社交登录按钮，前提是后台开启）。
- 登录后可进 `/dashboard`、`/connections`；Sidebar 显示 `<UserButton />`，可登出。
- 代码中不再有 `next-auth`、`bcryptjs`、`AMD_USERS`、`AUTH_SECRET` 引用；无 Auth.js 残留文件。
- GA4 相关代码与 `lib/env.ts` 的 GA4 访问器不受影响。
- `pnpm build` 通过（无 key 时构建应通过；key 仅运行时需要）。`pnpm test` 通过（删除 users.test 后，仍保留 ga4 测试）。

## 7. 人工步骤（凭证门）

用户在 [dashboard.clerk.com](https://dashboard.clerk.com) 建 application、开启 Google 社交登录，取得两个 key。合并后在 Vercel 配 §5 环境变量、删除旧的 `AUTH_SECRET`/`AMD_USERS`，再部署。Clerk 后台需把生产域名 `amd-ivory.vercel.app` 加入允许来源（Clerk 通常自动处理，必要时手动加）。

## 8. 非目标

- 不做组织/多团队（Clerk Organizations）——单一共享工作区即可。
- 不改 GA4/看板/连接页数据逻辑。
- 不保留 Auth.js 作为回退。
