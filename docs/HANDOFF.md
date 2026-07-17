# AMD 项目交接 Prompt

> 把这份文件（或下面「Prompt」段）交给新的 agent 会话，即可无缝接手 AMD 的开发。  
> 更新时间：**2026-07-15**。含密钥的地方只写「在哪里」，不写值。

---

## Prompt（可直接粘给新会话）

你接手 **AMD（AI Marketing Dashboard）** 项目。请先读 `docs/HANDOFF.md`（本文件）、`docs/superpowers/specs/*` 了解全貌，再继续。遵守下面的工作方式，不要推倒重来。

### 1. 这是什么
把 **556 / Mirai Shigoto**（mirai-shigoto.com，日本职场 AI 职业风险自查工具）的「四平台广告日报」（X Ads / Google Ads / Meta Ads / GA4）产品化成一个**登录后接账号、拉数、统一展示的活看板**。

- 定位：自用/单团队运营台；**已升级为多站点（Site）治理**，非公开多租户 SaaS。  
- 参考旧报告：https://reports-ecru-nu.vercel.app/  
- 跟用户用**中文**；偏行动；决策给选项。

### 2. 仓库与技术栈
- 仓库：`github.com/jasonhnd/amd`（main，`gh` 已登录 jasonhnd）
- 本地：`/Users/ms23m2/AgenticCoder/AMD`
- Next.js **15.5.20** App Router · TypeScript · Tailwind v4 · Recharts · pnpm · Vitest · Drizzle · Neon · `xlsx`
- 部署：Vercel 项目 `amd`（scope **`zkscio`**，`vercel` CLI 已登录 jasonhnd）
- **main HEAD（2026-07-15）**：`9a42888` — multi-site + 加密凭证 + Google 连接尝试 + Clerk token 崩溃修复

### 3. 线上地址
- **主域名：https://amd.omakaseai.io**
- 备用：https://amd-ivory.vercel.app
- Cloudflare zone `omakaseai.io`，A `amd → 76.76.21.21`，**DNS only（灰云）**

### 4. 认证：Clerk
- `@clerk/nextjs`，当前 **开发实例**（`pk_test`，instance 名类似 `tolerant-skylark-66`）
- Vercel 已配：`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`、`CLERK_SECRET_KEY`、`NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`、`NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`（注：redirect 仍写 dashboard，实际入口已迁 `/sites`）
- 中间件必须 **`middleware.ts`**，不能 `proxy.ts`（Next 15.5.20）
- Google **登录**已开（#12 已关）；Clerk 账号 mildreins@gmail.com 可用 `clerk` CLI（已 link 应用 AMD）
- ⚠️ **已验证结论（重要，勿再走弯路）**：
  - Clerk **共享 Google SSO 只用于登录身份**（openid/email/profile）
  - **官方 Google social 文档没有「Dashboard 加 Analytics/Ads scopes」**；用户 Dashboard 也看不到该选项——这是正常的
  - `clerk config` schema 的 `connection_oauth_google` **无 scopes 字段**；CLI 无法加 `analytics.readonly` / `adwords`
  - 实测用户 `approved_scopes` 仅 identity；`getUserOauthAccessToken` 曾 `invalid_client` / 无 Google 外连时 400
  - **不要再承诺「用 Clerk 登录 token 直接读 GA4/Ads API」** 除非自备 GCP OAuth 客户端（custom credentials）
  - #27：`getClerkGoogleAccessToken` 必须 catch，禁止抛错打爆页面

### 5. 数据架构（当前）
- **Neon Postgres**（Vercel Marketplace 资源 `amd-db`，free）+ Drizzle
- 凭证：**站内连接页填写 → AES-256-GCM 加密存 DB**（`APP_ENCRYPTION_KEY`）
- **不要**把业务凭证（GA4 JSON、Meta token 等）写回 Vercel env
- 基础设施 env（Vercel production）：`DATABASE_URL`（及 Neon 一堆）、`APP_ENCRYPTION_KEY`、Clerk 四项
- 连接器：`lib/connectors/*`（ga4 / google-ads / meta-ads / x-ads）仍可用
- 读路径：`lib/credentials/site.ts`（支持 `service_account` / `oauth` / `clerk` 三种 payload；**clerk 路径目前不可靠**）
- X 上传：按 site 落 `upload_snapshots`
- 看板 KPI：`lib/ad-metrics*.ts`，按 `siteId` 组装；30 天趋势仍 mock
- 路由：
  - `/sites` 列表/新建
  - `/sites/[slug]/dashboard|connections|settings`
  - `/dashboard`、`/connections` 重定向到默认 site
  - 首登 bootstrap site slug：**`mirai-shigoto`**

### 6. 产品决策史（避免重做）
1. 原设计：OAuth + Postgres 加密凭证  
2. Option B：无 DB、凭证 Vercel env（GA4 阶段）  
3. 用户改口：**不要 Vercel 业务 env，站内填写；多站点分开治理** → #25 multi-site + Neon  
4. 用户要更简单：想「点一下 Google 就连上」→ #26 Clerk/Google 一键  
5. **查文档后否决**：共享 Clerk Google **不能**当 GA4 API 凭证来源；用户也确认 Dashboard 无 scopes 选项  
6. **待用户拍板数据接入方式**（见 §8）

### 7. 工作方式
- LoopCoder 风格：doc-first → issue → 代码 → 评审 → **人工合并** → 部署；留痕  
- `.delivery.yml`：worker=codex，verifier=claude，gate=human-merge；门禁 `pnpm build` + `pnpm test`  
- 禁止 `--no-verify`；`pnpm install` 可能污染 `pnpm-workspace.yaml` 的 `allowBuilds` → 提交前清掉  
- 部署：`vercel deploy --prod --yes --scope zkscio`  
- `gh pr merge` 偶发假失败 → 以 `git log origin/main` 为准  
- 本地技能：`npx skills add clerk/skills` 已装到 `.agents/skills/`（可能未提交 git）

### 8. 下一步（优先级 · 需用户确认）
**核心未决：真实数据怎么进看板？** 给用户二选一（或组合），不要再推「Clerk 共享 token 读 GA4」：

| 选项 | 做法 | 代价 |
|------|------|------|
| **A. 服务账号** | 连接页填 Property ID + SA JSON；GA4 Viewer | 一次 GCP 操作，之后最稳 |
| **B. 上传报表** | 类似 X，导出 CSV/xlsx 上传 | 最省 GCP，非实时 API |
| **C. 自备 Google OAuth 客户端** | Production 文档要求的 custom credentials + scopes | 完整 OAuth UX，但必须 GCP |

其他打开 issue：
- **#11** ops：GA4 真数（文案仍写 Vercel env，**已过时**，应改成站内凭证）
- **#24** 成员邀请 UI（settings 目前只列表）
- 可选：Clerk `pk_live` / production instance、`clerk deploy`、修正 sign-in fallback → `/sites`

### 9. 常见坑
- `middleware.ts` not `proxy.ts`
- Clerk sensitive env **不能** `vercel env pull` 出明文；用 `clerk env pull`（需 `clerk auth login` + link）
- `getUserOauthAccessToken`：无 Google 外连 → 400；必须 try/catch
- Neon schema：`pnpm db:push`（需 `DATABASE_URL`）
- Cloudflare A 记录保持灰云
- pre-push 跑 build+test

### 10. 账号 ID（非密钥）
GA4 `298707336` · Google Ads `920-316-7221` / MCC `656-303-8097` · Meta `act_1497377618536088` · Pixel `1476745404149398` · X Ads `18ce55vi8hm`

### 11. 里程碑（git）
- 原型 mock → GA4 PR #5–#8 → Clerk #10 → 域名  
- 四连接器 #13–#15 → 看板 live KPI #16 / PR #20  
- 多站点+加密凭证 #25 · Neon `amd-db`  
- Google 一键尝试 #26 · Clerk token 崩溃修复 #27  
- Clerk CLI：已 login + link 应用 `AMD`（`app_3GRVK7PmoYpT63ydCjW6SfvO72p`）

### 12. 本会话遗留
- 用户明确：**看不懂复杂 OAuth 叙事**；要简单路径  
- 用户未最终选择 A/B/C 数据接入  
- 生产应可登录、看 `/sites`、连接页不因 Clerk token 500  
- **看板真数仍未接通**（无有效 GA4/Ads 凭证或上传）

---

## 附：本地/账号前置
- `gh` jasonhnd；`vercel` jasonhnd / scope zkscio；`clerk` CLI 已装（PATH 可能在 hermes node）  
- Clerk Dashboard：AMD app · development instance  
- 密钥只在 Vercel / Clerk / 本地 `.env.local`（gitignore），**不进仓库**
