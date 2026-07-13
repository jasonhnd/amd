# AMD 项目交接 Prompt

> 把这份文件（或下面「Prompt」段）交给新的 agent 会话，即可无缝接手 AMD 的开发。
> 更新时间：2026-07-13。含密钥的地方只写「在哪里」，不写值。

---

## Prompt（可直接粘给新会话）

你接手 **AMD（AI Marketing Dashboard）** 项目。请先读 `docs/HANDOFF.md`（本文件）、`docs/superpowers/specs/*`、`docs/superpowers/plans/*` 了解全貌，再继续。遵守下面的工作方式，不要推倒重来。

### 1. 这是什么
把 **556 / Mirai Shigoto**（mirai-shigoto.com，日本职场 AI 职业风险自查工具）的「四平台广告日报」（X Ads / Google Ads / Meta Ads / GA4）产品化成一个**登录后连自己账号权限、实时拉数、统一展示的活看板**。定位：自用/单团队、单一共享工作区，非多租户 SaaS。参考旧报告结构：https://reports-ecru-nu.vercel.app/

### 2. 仓库与技术栈
- 仓库：`github.com/jasonhnd/amd`（main 分支，`gh` 已登录 jasonhnd）
- 本地：`/Users/ms23m2/AgenticCoder/AMD`
- Next.js **15.5.20** App Router · TypeScript · Tailwind v4 · Recharts · pnpm · Vitest
- 部署：Vercel 项目 `amd`（scope `zkscio`，`vercel` CLI 已登录 jasonhnd）

### 3. 线上地址
- **主域名：https://amd.omakaseai.io**（自定义域，已绑 + SSL）
- 备用：https://amd-ivory.vercel.app（同一项目）
- 自定义域做法：Cloudflare zone `omakaseai.io`，A 记录 `amd → 76.76.21.21`，**DNS only（灰云，未代理）**。Vercel 已验证并签发 SSL。

### 4. 认证：Clerk（已替换 Auth.js）
- 用 **Clerk**（`@clerk/nextjs`）。当前是**开发实例**（`pk_test`）。
- Vercel 生产环境变量已配：`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`、`CLERK_SECRET_KEY`、`NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`、`NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`。旧的 `AUTH_SECRET`/`AMD_USERS` 已删除。
- ⚠️ **关键坑**：中间件文件必须叫 `middleware.ts`，**不能叫 `proxy.ts`**——`proxy.ts` 是 Next 16 约定，Next 15.5.20 不识别，会导致全站不设防（`middleware-manifest.json` 为空）。已在 `docs/superpowers/specs/2026-07-13-amd-clerk-oauth.md` §2/§4.2 记录。
- 登录页：`app/sign-in/[[...sign-in]]/page.tsx`（Clerk `<SignIn/>`）。Sidebar 用 `<UserButton/>`。`app/layout.tsx` 包 `<ClerkProvider>`。
- Google 社交登录：需在 [Clerk Dashboard](https://dashboard.clerk.com) → Social Connections 开启（未确认是否已开）。
- 说明：dev 实例用 curl 访问受保护路由会 404（`x-clerk-auth-reason: dev-browser-missing`），**真实浏览器正常**（307 握手 → /sign-in）。验证要用带 `Sec-Fetch-Dest: document` 的请求或真浏览器。

### 5. 数据 / GA4
- 连接器框架在 `lib/connectors/`；**GA4 已实现**（`lib/connectors/ga4.ts`，服务账号从环境变量读），归一化有单测。
- GA4 实时拉取：`lib/ga4-service.ts`（`unstable_cache`，revalidate 3600，tag `ga4`），看板 GA4 面板读 `getGa4Day`。
- **现状：GA4 环境变量尚未配置** → 看板 GA4 面板显示「GA4 未配置」空态。配好 `GA4_PROPERTY_ID=298707336` + `GA4_SERVICE_ACCOUNT_JSON=<服务账号JSON>`（Vercel 生产环境变量）即上线真实数据。用户需先建 GA4 服务账号（见 §8）。
- **其余面板仍是示例数据**（`lib/mock-data.ts`）：渠道对比表、花费/访客趋势、CPC、点击占比、今日运营建议。Google Ads / Meta / X 连接器**尚未实现**。

### 6. 存储与计费决策（Option B）
无数据库、全 Vercel、凭证放环境变量、零外部账单。用户明确要求不产生 Vercel 之外的账单。以后要接 X Ads 手动上传 / 跨平台历史时，再加 Vercel Marketplace 的 Neon Postgres（仍并入 Vercel 账单）。

### 7. 工作方式（务必遵守）
- **用 LoopCoder 开发**：doc-first → GitHub issue → code（worker）→ 独立评审 → 人工合并 → 部署。**一定要留痕**（issue / PR / commit 可追溯）。
- loopcoder 二进制在 PATH；配置 `.delivery.yml`：worker=**codex**，verifier=**claude**，gate=**human-merge**，base=main，本地门 `pnpm build` + `pnpm test`。
- 流程：写设计文档 → 合并到 main → `gh issue create` → `loopcoder dispatch/dispatch-wave` → `loopcoder loopreview`（claude 评审）→ 本地 worktree 装依赖跑 build/test 复验 → **等用户点头**再 `gh pr merge`。
- Conductor 每轮结束前要 `loopcoder attest --role conductor ...`；report 块只留本地、不进仓库产物。
- 语言：**跟用户用中文**。用户偏行动、少空谈；决策点用 AskUserQuestion 给选项。

### 8. 待办 / 下一步
1. **接 GA4 真实数据**（就差凭证）：用户去 Google Cloud 建服务账号、启用 Analytics Data API、把服务账号邮箱加为 GA4 property `298707336` 的「查看者」、下载 JSON。然后配 Vercel `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON` → 部署 → GA4 面板变真实。
2. **确认/开启 Clerk 的 Google 社交登录**。
3. **Google Ads / Meta Ads / X Ads 连接器**（后续阶段，目前 mock）。按 GA4 的 connector 模式复制；X Ads 走手动上传 xlsx 兜底、Meta 有 API-blocked 兜底。规划见 spec。
4. 可选：AI「今日运营建议」（v1 暂缓，规则版已在）、Vercel Cron 每日预拉、告警/异常检测层（竞品调研得出的差异化点）。
5. 可选：Clerk 换**生产实例**（`pk_live`，需自己的 Google OAuth 凭证 + 域名配置）用于正式对外。

### 9. 常见坑（务必带着走）
- Next 15.5.20 用 `middleware.ts`（非 `proxy.ts`）——见 §4。
- pnpm 11 的设置在 `pnpm-workspace.yaml`（`verifyDepsBeforeRun: false`、`strictDepBuilds: false`）；本机 ECC 环境每次 `pnpm install` 会往它塞 `allowBuilds:` 占位噪音，**提交前要清掉**。
- pre-push 钩子会跑 build+test；`--no-verify` 被禁止（另一个钩子拦），要让检查真过。
- `loopcoder verify-local` 在临时 worktree 里无 node_modules，会报 `missing-tool`（needs-human）——复验请另开 worktree、`pnpm install` 后跑 `./node_modules/.bin/next build` 和 `vitest run`。
- Cloudflare 那条 A 记录保持**灰云（proxied=false）**，别开橙云，避免和 Vercel SSL 冲突。
- `tsconfig.tsbuildinfo` 已 gitignore；交接 md（`*交接*.md`）不进仓库。
- 部署命令：`vercel deploy --prod --yes`；环境变量 `printf '%s' VALUE | vercel env add NAME production`。

### 10. 参考账号 ID（来自 556 交接文档，非密钥）
GA4 property `298707336` · Google Ads 客户 `920-316-7221` / MCC `656-303-8097` · Meta 广告账号 `act_1497377618536088` · Meta Pixel `1476745404149398` · X Ads `18ce55vi8hm`。真实密钥/token 只在 Vercel 环境变量与各平台后台，**不在仓库**。

### 11. 已完成里程碑（git 可查）
- 可视化原型（mock 看板）
- GA4 真实数据阶段 PR #5–#8（登录、GA4 连接器、缓存拉数+看板、连接页状态）
- Clerk OAuth 迁移 PR #10（替换 Auth.js）
- 自定义域名 `amd.omakaseai.io`

---

## 附：本地/账号前置
- `gh` 登录 jasonhnd；`vercel` 登录 jasonhnd（scope zkscio）；`loopcoder` 在 PATH。
- Clerk 账号：用户自己的（dev 实例 `tolerant-skylark-66.clerk.accounts.dev`）。
- Cloudflare：zone `omakaseai.io`（id `d93725b37b0a4968377639131644b7c7`）；DNS 编辑用用户提供的 API token（**已建议用户轮换**，不在仓库保存）。
