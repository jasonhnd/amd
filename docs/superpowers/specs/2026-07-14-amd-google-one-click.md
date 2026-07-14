# AMD · Google 一键连接（GA4 + Ads）

- 日期：2026-07-14
- 状态：实现中
- 决策：方案 **B**（含 A）— 一键 OAuth 选账号；Developer Token 组织级一次

## 用户路径

1. 连接页点 **用 Google 连接 GA4 + Ads**
2. Google 同意屏幕
3. 选 GA4 property +（可选）Ads customer → 保存
4. 看板自动用 OAuth refresh token 拉数

## 基础设施 env（非业务密钥）

| 变量 | 用途 |
|------|------|
| `GOOGLE_OAUTH_CLIENT_ID` | GCP OAuth Web client |
| `GOOGLE_OAUTH_CLIENT_SECRET` | 同上 |
| 回调 URL | `{origin}/api/connectors/google/callback` |

## 组织设置

- Owner 在 `/sites/[slug]/settings` 填 **Google Ads Developer Token**（一次）

## 不做

- Meta 一键（仍可选手动 token）
- X 仍上传
