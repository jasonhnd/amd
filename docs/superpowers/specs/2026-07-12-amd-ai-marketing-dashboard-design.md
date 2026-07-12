# AMD · AI Marketing Dashboard — 设计文档 (v1)

- 日期：2026-07-12
- 仓库：https://github.com/jasonhnd/amd
- 项目：AMD（AI Marketing Dashboard），556 / Mirai Shigoto 营销看板的产品化
- 参考：现有旧报告 https://reports-ecru-nu.vercel.app/ （本地 DuckDB 管道生成的按日静态报告）

## 1. 目标与定位

把交接文档里那套"四平台广告日报"（X Ads / Google Ads / Meta Ads / GA4）从**本地管道生成的死页面**，升级成一个**登录后连接自己账号权限、serverless 实时拉数、统一展示的活看板**。

一句话：**用户把账号 ID 和只读权限接进来，就能看一个统一的广告 + 流量看板。**

### 与旧报告的本质区别
| | 旧报告 (reports-ecru-nu) | AMD |
|---|---|---|
| 数据 | 本地 DuckDB 管道跑完推上去 | serverless 直连各平台 API 实时拉 |
| 接入 | 无，硬编码本地凭证 | 站内连接页，加密存云端 |
| 访问 | 公开 URL | 登录后可见 |
| 形态 | 一天一页静态 | 活看板，可选日期 |

## 2. 范围（v1 决策）

| 维度 | 决策 |
|---|---|
| 形态 | 自用 / 单团队，**单一共享工作区**（556 数据），非多租户 SaaS |
| 数据来源 | 网站 serverless 后端**直连四平台 API** 拉取 |
| 平台 | GA4 / Google Ads / Meta Ads / X Ads —— **统一 connector 框架，四平台 v1 全接** |
| 凭证接入 | 站内 "Connections" 页接入（OAuth / 粘贴 token），**AES-256-GCM 加密后存 Postgres** |
| 站点门禁 | **多个独立登录账号**，共享同一套数据；用户由管理员 seed，不做公开注册 |
| AI 运营建议 | **v1 不做**，架构预留接口槽，后续再接 LLM |

### 明确不做（YAGNI）
- 不做多租户 / 数据隔离 / 公开注册
- 不做计费、团队管理、权限分级
- 不做 AI 运营建议（仅预留槽）
- X Ads 不做 API 直连（v1 走手动上传）

## 3. 技术栈

- **Next.js 15（App Router）+ TypeScript**，部署 Vercel。所有平台 API 调用在 server 端，token 绝不进浏览器 bundle。
- **Auth.js (NextAuth v5)**：Credentials provider（邮箱 + 密码，argon2 哈希），JWT session（不建 session 表）。
- **Vercel Postgres (Neon) + Drizzle ORM**。
- **Tailwind CSS + shadcn/ui**（界面），**Recharts**（图表）。
- **加密**：AES-256-GCM，密钥来自 `APP_ENCRYPTION_KEY`（32 字节 base64 环境变量），存 `iv + authTag + ciphertext`。
- **xlsx 解析**：SheetJS（X Ads 手动上传、Meta 兜底上传）。

## 4. 数据模型（Drizzle）

```
users
  id            uuid pk
  email         text unique
  passwordHash  text
  name          text
  createdAt     timestamptz

connections
  id            uuid pk
  platform      enum('ga4','google_ads','meta_ads','x_ads')
  label         text
  accountId     text          -- propertyId / customerId / act_id / ads account id
  credentials   text          -- 加密 blob（OAuth token 或 API token）
  status        enum('connected','error','disconnected')
  lastSyncedAt  timestamptz
  lastError     text
  createdAt     timestamptz
  updatedAt     timestamptz

report_snapshots            -- 拉数缓存 + X/Meta 手动上传数据
  id            uuid pk
  platform      enum(...)
  date          date
  metrics       jsonb        -- 归一化后的日指标
  source        enum('api','upload')
  fetchedAt     timestamptz
  unique(platform, date)
```

单一工作区，`connections` / `report_snapshots` 不需要 orgId。

## 5. Connector 框架（核心）

统一接口，四平台各实现一个：

```ts
type Platform = 'ga4' | 'google_ads' | 'meta_ads' | 'x_ads'

interface DailyMetrics {
  date: string
  spend?: number          // JPY
  impressions?: number
  clicks?: number
  ctr?: number
  cpc?: number
  cpm?: number
  visitors?: number       // GA4
  keyEvents?: Record<string, number>  // GA4: job_search_start/submit/result_view
  organicBySource?: Record<string, number> // GA4
}

interface Connector {
  platform: Platform
  getStatus(conn: Connection): Promise<Status>
  fetchDaily(conn: Connection, range: DateRange): Promise<DailyMetrics[]>
  getAuthUrl?(): string                    // OAuth 平台
  handleCallback?(code: string): Promise<Creds>
}
```

### 各平台实现
- **GA4Connector**：Google Analytics Data API `runReport`。指标：访客 / sessions / Key Events（`job_search_start`、`job_search_submit`、`result_view`）/ 自然流量分渠道。**授权方式：Google 服务账号（Service Account JSON 密钥，在连接页粘贴，AES-256-GCM 加密入库）**——自用单团队场景比 OAuth 更简单、无 token 刷新。默认 property `298707336`。Google Ads 后续可复用同一 GCP 项目。
- **GoogleAdsConnector**：Google Ads API（GAQL）。复用 Google OAuth + developer token（MCC `656-303-8097`），客户 ID `920-316-7221`。指标：花费 / 展示 / 点击 / CPC / 转化。
- **MetaAdsConnector**：Marketing API，账号 `act_1497377618536088`。指标：花费 / 展示 / 点击 / CPC。**兜底**：API 返回 `API access blocked` → `status=error` + 提示，并允许在连接页手动上传 xlsx（写入 `report_snapshots.source='upload'`）。
- **XAdsConnector**：**手动上传 Daily xlsx**（Edge 导出的按日报表），SheetJS 解析 → 归一化 → `report_snapshots`。API 直连 v1 不做。

## 6. 认证与安全

- 全站走 Auth.js 登录中间件，未登录一律重定向到 `/login`。
- 用户由管理员 seed（脚本 / 一次性 admin 页），无公开注册。
- token 加密存储；OAuth secret、developer token、加密密钥全部在 Vercel 环境变量。
- 前端不接触任何平台凭证，所有拉数在 server action / route handler。
- 交接 md（含账号 ID）**不进仓库**：`.gitignore` 排除 `*交接*.md`。

### 需要的环境变量
```
DATABASE_URL                       # Vercel Postgres
AUTH_SECRET
APP_ENCRYPTION_KEY                 # 32-byte base64，加解密所有平台凭证
GOOGLE_ADS_DEVELOPER_TOKEN         # Google Ads 阶段用
META_ACCESS_TOKEN                  # Meta 阶段用（或 system user token）
```

平台凭证本身（GA4 服务账号 JSON、Meta token 等）不放环境变量，而是在连接页录入、加密后存 `connections.credentials`。

## 7. 看板 UI（对齐旧报告结构）

页面 `/dashboard`：
1. 顶部：`📊 AMD` 标题 + **日期选择器**（日报历史）+ 手动刷新按钮。
2. **广告总计（四平台）**：当日总花费 + 累计，KPI 行。
3. **渠道对比表**（中心）：渠道 / 花费 / 展示 / 点击 / 点击率 / CPC / CPM / 花费占比 / 点击占比 / **状态 / 评估**。预算规则超标在"状态"列标黄（Google > ¥2000、Meta > ¥1750）。
4. **趋势图**：`近30天花费趋势（JPY）` + `近30天访客趋势（按来源）`（Recharts）。
5. **对比小图**：`CPC 对比` + `点击贡献占比`。
6. **GA4 站点质量**：访客、Key Events、流量结构。
7. 页脚：`AMD v1 · 实时拉取`。

页面 `/connections`：四平台列表，每个显示状态徽章 / account ID / 连接·断开按钮；Google 平台走 OAuth，Meta 走 OAuth 或 token，X 显示 xlsx 上传组件，Meta 兜底也有上传入口。

（`今日运营建议` 区块：v1 预留位置，显示占位，不接 LLM。）

## 8. 数据刷新策略

- 看板加载时按需拉：先查 `report_snapshots`（按 `platform+date` 缓存），命中直接用，未命中或点"刷新"才打 API 并回写缓存。
- **Vercel Cron**：每日预拉昨天数据写入 `report_snapshots`，让早上打开即有数据。
- 预算规则阈值 / Key Events 名称集中放 `config/`（可改）。

## 9. 测试策略

- **单测**：各 connector（mock 平台 API 响应）、加密往返、xlsx 解析、预算规则判定、指标归一化。
- **集成**：连接 → 加密存 → 拉数 → 归一化 全流程（mock provider）。
- **E2E (Playwright)**：登录、看板渲染、连接页交互（连接状态、X 上传）。
- 重点覆盖业务逻辑（connector / 加密 / 归一化 / 规则），目标核心逻辑 80%+。

## 10. 部署

- Vercel 项目关联 `jasonhnd/amd` 仓库。
- 配置 Vercel Postgres、全部环境变量、Google/Meta OAuth 回调 URI（`https://<domain>/api/auth/callback/...` 与 connector 回调）。
- Vercel Cron 配 `vercel.json`。

## 11. 实现顺序（单 spec 内分阶段）

1. **基础设施**：Next.js 脚手架、Tailwind/shadcn、Auth.js 多账号 + seed、Postgres/Drizzle schema、加密工具、app 壳 + 登录页。
2. **Connector 框架 + 连接页 UI**（状态、连接/断开）。
3. **GA4 端到端**（OAuth → 拉数 → 归一化 → 看板 GA4 区）——样板连接器。
4. **Google Ads** connector + 渠道对比表接入。
5. **Meta Ads** connector + blocked 兜底 + 上传。
6. **X Ads** 手动上传 + 解析 + 表格接入。
7. **趋势图 / CPC·点击占比图 / 预算高亮 / 刷新 / Vercel Cron**。
8. **部署 Vercel**：Postgres、环境变量、OAuth 回调、Cron。

## 12. 风险与兜底

| 风险 | 兜底 |
|---|---|
| Meta API `API access blocked` | 手动 xlsx 上传路径 |
| X Ads API 受限 | v1 仅手动上传 |
| Google Ads OAuth `invalid_grant` | 连接页显示 error + 重新授权入口 |
| serverless 无法跑浏览器导出 | X/Meta 走上传兜底，不依赖浏览器自动化 |
| 凭证泄露 | 加密存储 + 全站登录 + 前端零凭证 |
