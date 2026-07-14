# AMD 项目交接 Prompt

> 把这份文件（或下面「Prompt」段）交给新的 agent 会话，即可无缝接手 AMD 的开发。
> 更新时间：2026-07-14。含密钥的地方只写「在哪里」，不写值。

---

## Prompt（可直接粘给新会话）

你接手 **AMD（AI Marketing Dashboard）** 项目。请先读 `docs/HANDOFF.md`（本文件）、`docs/superpowers/specs/*`、`docs/superpowers/plans/*` 了解全貌，再继续。遵守下面的工作方式，不要推倒重来。

### 1. 这是什么
把 **556 / Mirai Shigoto**（mirai-shigoto.com，日本职场 AI 职业风险自查工具）的「四平台广告日报」（X Ads / Google Ads / Meta Ads / GA4）产品化成一个**登录后连自己账号权限、实时拉数、统一展示的活看板**。定位：自用/单团队、单一共享工作区，非多租户 SaaS。参考旧报告结构：https://reports-ecru-nu.vercel.app/

### 2. 仓库与技术栈
- 仓库：`github.com/jasonhnd/amd`（main 分支，`gh` 已登录 jasonhnd）
- 本地：`/Users/ms23m2/AgenticCoder/AMD`
- Next.js **15.5.20** App Router · TypeScript · Tailwind v4 · Recharts · pnpm · Vitest · `xlsx`（X Ads 上传解析）
- 部署：Vercel 项目 `amd`（scope `zkscio`，`vercel` CLI 已登录 jasonhnd）
- **main HEAD（2026-07-14）**：`4a985a0` — 四平台连接器代码均已在 main

### 3. 线上地址
- **主域名：https://amd.omakaseai.io**（自定义域，已绑 + SSL）
- 备用：https://amd-ivory.vercel.app（同一项目）
- 自定义域做法：Cloudflare zone `omakaseai.io`，A 记录 `amd → 76.76.21.21`，**DNS only（灰云，未代理）**。Vercel 已验证并签发 SSL。

### 4. 认证：Clerk（已替换 Auth.js）
- 用 **Clerk**（`@clerk/nextjs`）。当前是**开发实例**（`pk_test`）。
- Vercel 生产环境变量已配：`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`、`CLERK_SECRET_KEY`、`NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`、`NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`。旧的 `AUTH_SECRET`/`AMD_USERS` 已删除。
- ⚠️ **关键坑**：中间件文件必须叫 `middleware.ts`，**不能叫 `proxy.ts`**——`proxy.ts` 是 Next 16 约定，Next 15.5.20 不识别，会导致全站不设防（`middleware-manifest.json` 为空）。已在 `docs/superpowers/specs/2026-07-13-amd-clerk-oauth.md` §2/§4.2 记录。
- 登录页：`app/sign-in/[[...sign-in]]/page.tsx`（Clerk `<SignIn/>`）。Sidebar 用 `<UserButton/>`。`app/layout.tsx` 包 `<ClerkProvider>`。
- Google 社交登录：需在 [Clerk Dashboard](https://dashboard.clerk.com) → Social Connections 开启（未确认是否已开，issue #12）。
- 说明：dev 实例用 curl 访问受保护路由会 404（`x-clerk-auth-reason: dev-browser-missing`），**真实浏览器正常**（307 握手 → /sign-in）。验证要用带 `Sec-Fetch-Dest: document` 的请求或真浏览器。

### 5. 数据 / 连接器（四个平台代码均已落地）
连接器框架在 `lib/connectors/`；统一类型见 `lib/connectors/types.ts`。连接页：`app/(app)/connections/page.tsx`（状态实时读 env / 上传态）。

| 平台 | 代码 | 凭证方式（Option B） | 状态 |
|------|------|----------------------|------|
| **GA4** | `lib/connectors/ga4.ts` + `lib/ga4-service.ts`（`unstable_cache` 1h，tag `ga4`） | `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON` | 代码就绪；**Vercel 尚未配凭证** → 看板「GA4 未配置」 |
| **Google Ads** | `lib/connectors/google-ads.ts`（GAQL 日花费/展示/点击 → CPC/CTR/CPM） | `GOOGLE_ADS_DEVELOPER_TOKEN`、`GOOGLE_ADS_CUSTOMER_ID`、可选 `GOOGLE_ADS_LOGIN_CUSTOMER_ID`、`GOOGLE_ADS_SERVICE_ACCOUNT_JSON` | 连接器+连接页状态已合入（PR #19 / #13） |
| **Meta Ads** | `lib/connectors/meta-ads.ts`（Marketing API insights；API blocked 时安全空态） | `META_ACCESS_TOKEN`、可选 `META_AD_ACCOUNT_ID`（默认 `act_1497377618536088`） | 已合入 main `efbcf00`（#14；PR #18 因 GitHub merge 抖动改本地 FF） |
| **X Ads** | `lib/connectors/x-ads.ts` + `lib/x-ads-upload.ts`（xlsx/csv 解析；**进程内内存**存最近一次上传，非 DB） | 无 API key；连接页手动上传 | 已合入 main `4a985a0`（#15；PR #17 本地 FF） |

- **看板仍主要用 mock**（`lib/mock-data.ts`）：渠道对比表、花费/访客趋势、CPC、点击占比、今日运营建议**尚未**接上述真实连接器。下一步是 issue **#16**：dashboard channel table + spend KPIs from live ad connectors。
- 环境变量入口：`lib/env.ts`（server-only）。单测：`pnpm test` 当前 **19** 通过（ga4 / google-ads / meta-ads / x-ads / config）。

### 6. 存储与计费决策（Option B）
无数据库、全 Vercel、凭证放环境变量、零外部账单。用户明确要求不产生 Vercel 之外的账单。X Ads v1 上传结果仅在**当前服务实例内存**（`globalThis` store + cache tag `x_ads`），多实例/冷启动会丢——跨平台历史要持久化时再加 Vercel Marketplace 的 Neon Postgres（仍并入 Vercel 账单）。

### 7. 工作方式（务必遵守）
- **用 LoopCoder 开发**：doc-first → GitHub issue → code（worker）→ 独立评审 → 人工合并 → 部署。**一定要留痕**（issue / PR / commit 可追溯）。
- loopcoder 二进制在 PATH；配置 `.delivery.yml`：worker=**codex**，verifier=**claude**，gate=**human-merge**，base=main，本地门 `pnpm build` + `pnpm test`。
- 流程：写设计文档 → 合并到 main → `gh issue create` → `loopcoder dispatch/dispatch-wave` → `loopcoder loopreview`（claude 评审）→ 本地 worktree 装依赖跑 build/test 复验 → **等用户点头**再 `gh pr merge`。
- **并行 wave 注意**：多连接器会同时改 `lib/connectors/index.ts`、`app/(app)/connections/page.tsx`、`lib/env.ts` → 易冲突。优先**串行 merge**，或 rebase 时**保留全部平台分支**（不要用 theirs/ours 整文件覆盖）。
- Conductor 每轮结束前要 `loopcoder attest --role conductor ...`；report 块只留本地、不进仓库产物。
- 语言：**跟用户用中文**。用户偏行动、少空谈；决策点用 AskUserQuestion 给选项。

### 8. 待办 / 下一步（按优先级）
1. **多站点 + 站内凭证**（设计 `docs/superpowers/specs/2026-07-14-amd-multi-site-connections.md`）
   - #21 地基 · #22 连接表单 · #23 看板 site 化 · #24 成员 UI
   - 基础设施 env：`DATABASE_URL`（Neon）+ `APP_ENCRYPTION_KEY`（32B base64）+ Clerk
   - **业务凭证不再走 Vercel env**，在 `/sites/[slug]/connections` 填写
2. ~~#16 看板 live KPI~~ 已合入；随后迁到 site 路径
3. ~~#12 Clerk Google~~ 已验证关闭
4. #11 改为：在站内连接页填 GA4（不再配 Vercel GA4_*）
5. 可选：AI 运营建议、Cron、Clerk `pk_live`

### 9. 常见坑（务必带着走）
- Next 15.5.20 用 `middleware.ts`（非 `proxy.ts`）——见 §4。
- pnpm 11 的设置在 `pnpm-workspace.yaml`（`verifyDepsBeforeRun: false`、`strictDepBuilds: false`）；本机 ECC 环境每次 `pnpm install` 会往它塞 `allowBuilds:` 占位噪音，**提交前要清掉**。
- pre-push 钩子会跑 build+test；`--no-verify` 被禁止（另一个钩子拦），要让检查真过。
- `loopcoder verify-local` 在临时 worktree 里无 node_modules，会报 `missing-tool`（needs-human）——复验请另开 worktree、`pnpm install` 后跑 `./node_modules/.bin/next build` 和 `vitest run`。
- Cloudflare 那条 A 记录保持**灰云（proxied=false）**，别开橙云，避免和 Vercel SSL 冲突。
- `tsconfig.tsbuildinfo` 已 gitignore；交接 md（`*交接*.md`）不进仓库。
- 部署命令：`vercel deploy --prod --yes`；环境变量 `printf '%s' VALUE | vercel env add NAME production`。
- GitHub `gh pr merge` 偶发「MERGEABLE 随后失败 / 变 CLOSED 未合」——以 `git log origin/main` 为准；必要时本地 FF + `git push origin main`。

### 10. 参考账号 ID（来自 556 交接文档，非密钥）
GA4 property `298707336` · Google Ads 客户 `920-316-7221` / MCC `656-303-8097` · Meta 广告账号 `act_1497377618536088` · Meta Pixel `1476745404149398` · X Ads `18ce55vi8hm`。真实密钥/token 只在 Vercel 环境变量与各平台后台，**不在仓库**。

### 11. 已完成里程碑（git 可查）
- 可视化原型（mock 看板）
- GA4 真实数据阶段 PR #5–#8（登录、GA4 连接器、缓存拉数+看板、连接页状态）
- Clerk OAuth 迁移 PR #10（替换 Auth.js）
- 自定义域名 `amd.omakaseai.io`
- **广告连接器 wave（2026-07-14）**
  - #13 / PR #19 Google Ads → main
  - #14 Meta Ads → main `efbcf00`
  - #15 X Ads 手动 xlsx → main `4a985a0`
  - 单测 19 绿；`pnpm build` 绿

### 12. 本次会话遗留上下文
- 并行 loopcoder wave `amd-ads-wave-20260713T230340Z`：worker 写出代码，但 harness 因 codex metadata parse（`missing model, token usage`）失败；由 conductor salvage 开 PR。
- 三 PR 共享文件冲突 → 串行：先 #19，再 Meta rebase 保留 Google+Meta，再 X rebase 保留 Google+Meta+X。
- 打开 issue 仅剩：**#11**（GA4 凭证）、**#12**（Clerk Google）、**#16**（看板接 live KPI）。

---

## 附：本地/账号前置
- `gh` 登录 jasonhnd；`vercel` 登录 jasonhnd（scope zkscio）；`loopcoder` 在 PATH。
- Clerk 账号：用户自己的（dev 实例 `tolerant-skylark-66.clerk.accounts.dev`）。
- Cloudflare：zone `omakaseai.io`（id `d93725b37b0a4968377639131644b7c7`）；DNS 编辑用用户提供的 API token（**已建议用户轮换**，不在仓库保存）。
