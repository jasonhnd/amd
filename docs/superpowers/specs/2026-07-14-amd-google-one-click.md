# AMD · Google 选账号连接（GA4 + Ads）· 无 GCP

- 日期：2026-07-14
- 状态：实现中
- 决策：用 **Clerk Google OAuth token**，**不**自建 GCP OAuth 客户端

## 用户路径

1. 用 **Google** 登录 AMD（Clerk）
2. 连接页 → **选择 GA4 / Ads 账号**
3. 勾选 property / customer → 保存
4. 看板用 Clerk 存的 Google access token 拉数

## 管理员一次（Clerk Dashboard，不是 GCP）

Social connections → Google → Scopes 增加：

```
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/adwords
```

用户可能需要断开并重新连接 Google 一次以刷新 scope。

## 组织设置

- Owner：`/sites/[slug]/settings` 填 **Google Ads Developer Token**（Google 政策；仅 Ads 需要）

## 可选遗留

- 自建 GCP OAuth（`/api/connectors/google/*`）仍可保留作兜底，**默认 UI 不依赖**
- 服务账号 JSON 仍在「专家手动」折叠里

## 不做

- 让用户自己建 GCP 项目
- Meta 一键
