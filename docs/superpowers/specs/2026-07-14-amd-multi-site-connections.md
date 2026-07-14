# AMD · 多站点治理 + 站内凭证（替代 Vercel env）

- 日期：2026-07-14
- 状态：**已确认，开工**
- 仓库：github.com/jasonhnd/amd
- 取代：Option B 业务凭证走 Vercel env；**不**做全自动 OAuth

## 1. 目标

1. **凭证站内填写**：GA4 / Google Ads / Meta / X 在 Connections 页粘贴或上传，**不**写入 Vercel 业务 env。
2. **多站点分开治理**：每个网站（Site）独立连接、看板、上传与成员权限。
3. 保留现有 connector 实现与 Clerk 登录；演进而非推倒。

## 2. 已确认决策

| ID | 决策 |
|----|------|
| D1 | DB = **Vercel Marketplace Neon Postgres** + Drizzle |
| D2 | 隔离粒度 = **Site**；先 **1 个 Organization** |
| D3 | Google Ads Developer Token = **组织默认（S2）** + Site 填 customer / SA |
| D4 | 建 Site 权限 = org Owner；首批用 seed / 首登 bootstrap |
| D5 | 现有 556 → 首站 slug **`mirai-shigoto`** |
| D6 | Phase 2 后**删除**业务侧对 `GA4_*` / `GOOGLE_ADS_*` / `META_*` env 的依赖 |

### 仍放 Vercel env（仅基础设施）

- `DATABASE_URL`
- `APP_ENCRYPTION_KEY`（32-byte base64，AES-256-GCM）
- Clerk 现有四项

## 3. 领域模型

```
organizations
  id uuid pk
  name text
  created_at

sites
  id uuid pk
  org_id → organizations
  slug text unique          -- mirai-shigoto
  name text
  domain text null
  timezone text default 'Asia/Tokyo'
  created_at

site_members
  site_id → sites
  clerk_user_id text
  role enum('owner','editor','viewer')
  pk (site_id, clerk_user_id)

org_secrets
  org_id → organizations
  key text                  -- e.g. google_ads_developer_token
  value_enc text            -- AES blob
  pk (org_id, key)

connections
  id uuid pk
  site_id → sites
  platform enum('ga4','google_ads','meta_ads','x_ads')
  account_id text null      -- display: property / customer / act_
  credentials_enc text null -- AES blob JSON payload
  status enum('connected','error','disconnected')
  last_synced_at timestamptz null
  last_error text null
  updated_at
  unique(site_id, platform)

upload_snapshots
  id uuid pk
  site_id → sites
  platform enum(...)        -- primarily x_ads
  date date
  metrics jsonb
  filename text null
  uploaded_at timestamptz
  unique(site_id, platform, date)
```

### 凭证 payload（加密前 JSON）

- **ga4**: `{ propertyId, serviceAccountJson }`
- **google_ads**: `{ customerId, loginCustomerId?, serviceAccountJson }`（developer token 优先 org_secrets）
- **meta_ads**: `{ accessToken, adAccountId }`
- **x_ads**: 无长期 token；指标走 `upload_snapshots`

## 4. 角色

| 角色 | 看板 | 连接读写 | 成员/建站 |
|------|------|----------|-----------|
| owner | ✓ | ✓ | ✓（本 org 内） |
| editor | ✓ | ✓ | ✗ |
| viewer | ✓ | 只看状态，无密钥 | ✗ |

## 5. 路由

```
/sites                              列表 + 新建
/sites/[slug]/dashboard            看板
/sites/[slug]/connections          连接表单
/sites/[slug]/settings             成员 / 域名 / 时区
/                                   → /sites 或默认 site dashboard
/dashboard                          → 307 到默认 site（兼容）
```

Sidebar：Site 切换器 + 看板 / 连接 / 设置。

## 6. 安全

- 仅 server action 接收密钥；AES-256-GCM（`APP_ENCRYPTION_KEY`）。
- UI 不回显完整密钥；可显示 account_id / 「已配置」。
- 所有读写校验 `site_members`。
- 日志禁止打印 credentials。
- 「测试连接」返回 `{ ok, error? }` 仅。

## 7. 与现有代码

| 模块 | 动作 |
|------|------|
| `lib/connectors/*` | 保留，credentials 对象注入 |
| `*-config.ts` env 读取 | 改为 `lib/credentials/site.ts` 从 DB 解密 |
| `ad-metrics-service` / `ga4-service` | 增加 `siteId` |
| X 内存 store | 改为 `upload_snapshots` 按 site |
| mock 30 天趋势 | 暂保留 |

## 8. 阶段

1. **P1 地基**：Neon/Drizzle schema、AES、sites 列表、bootstrap 首站、切换壳  
2. **P2 连接写路径**：四平台表单、加密保存、测试连接、读路径切 DB  
3. **P3 看板 site 化**：dashboard/KPI 全挂 siteId；X 上传落库  
4. **P4 治理**：建站、成员角色、Viewer 屏蔽密钥区、org_secrets Developer Token  

## 9. 验收（整体）

- [ ] 无业务 Vercel env 时，站内填 GA4 即可看数  
- [ ] Site A 凭证不可被 Site B 读到  
- [ ] Viewer 无法提交连接表单  
- [ ] `pnpm test` + `pnpm build` 绿  
- [ ] 密钥不进 git / 客户端 bundle  

## 10. 明确不做

- Google/Meta 全自动 OAuth  
- 公开注册 / 计费  
- 跨 Site 集团大盘（可后做）  
- X Ads API 直连  
