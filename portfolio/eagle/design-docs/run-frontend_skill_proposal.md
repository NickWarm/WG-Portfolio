# run-frontend 設計稿

> 📅 建立日期：2026-03-04

---

## 問題描述

在 debug 前端問題時，需要在本地跑起前端專案來塞 debug log 驗證。目前流程繁瑣：

- 手動 `pnpm install`、處理 corepack 簽名問題
- 前端 dev server 是長跑的，Claude Code 無法直接執行（會阻塞）
- 需要手動切 branch、改 `.env`、啟動 server、測完再還原

預期效益：封裝成 skill，一鍵啟動/停止，自動處理 branch 切換和環境還原。

---

## 執行流程圖

```
/run-frontend 執行流程
│
├─ 1. 【參數解析】
│   ├─ start <project> → 進入啟動流程
│   │   ├─ dashboard → dashboard-nuxt（port 5777）
│   │   └─ frontend → frontend-nuxt（port 3000）
│   └─ stop → 進入停止流程
│
├─ 2. 【start 流程】
│   ├─ 2.1 前置檢查
│   │   ├─ 檢查 port 是否已被佔用
│   │   └─ 檢查主專案有無未 commit 的改動
│   │       ├─ 有 → 提示用戶先處理，中止
│   │       └─ 沒有 → 繼續
│   ├─ 2.2 切 branch
│   │   ├─ 記錄當前 branch
│   │   ├─ git checkout dev && git pull
│   │   └─ git checkout -b debug/frontend-{MMDD}
│   ├─ 2.3 環境準備
│   │   ├─ 備份並修改前端 .env.development
│   │   │   ├─ dashboard → apps/web-ele/.env.development
│   │   │   └─ frontend → .env.development（根目錄）
│   │   └─ 檢查 node_modules（沒有就 pnpm install）
│   └─ 2.4 啟動 dev server（run_in_background: true）
│       └─ 輸出啟動資訊（URL、branch、原 branch）
│
└─ 3. 【stop 流程】
    ├─ 3.1 停止 dev server（lsof -ti:{port} | xargs kill）
    ├─ 3.2 還原前端 .env.development（從 .bak）
    ├─ 3.3 處理 branch
    │   ├─ 詢問：是否推 branch 到 GitHub？
    │   │   ├─ 是 → git add . && git commit && git push
    │   │   └─ 否 → 跳過
    │   ├─ 切回原 branch（git checkout dev）
    │   └─ 詢問：是否刪除 debug branch？
    │       ├─ 是 → git branch -D debug/frontend-{MMDD}
    │       └─ 否 → 保留
    └─ 3.4 輸出結果（已停止、已切回 dev）
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 是 | 操作：start 或 stop | `start` |
| `$2` | start 時必要 | 前端專案：dashboard 或 frontend | `dashboard` |

---

## 輸出格式

### start 成功時

```markdown
✅ 前端已啟動

| 項目 | 值 |
|------|-----|
| 專案 | dashboard-nuxt |
| URL | http://localhost:5566 |
| Branch | debug/frontend-0304 |
| 原 Branch | dev |
| API 指向 | http://localhost:3001/api/v1 |
```

### stop 成功時

```markdown
✅ 前端已停止

| 項目 | 值 |
|------|-----|
| 已切回 | dev |
| Branch 推送 | ✅ / ⏭️ 跳過 |
| Branch 刪除 | ✅ / ⏭️ 保留 |
```

### 失敗時

```
❌ Port 5566 已被佔用，請先關閉佔用的 process
❌ 主專案有未 commit 的改動，請先處理
```

---

## 實作細節

### 專案對應表

| 參數 | 專案路徑 | .env.development 位置 | Dev 指令 | Port |
|------|----------|----------------------|----------|------|
| dashboard | `/Users/nicholas/Desktop/Projects/dashboard-nuxt` | `apps/web-ele/.env.development` | `pnpm dev:ele --port 5777` | 5777 |
| frontend | `/Users/nicholas/Desktop/Projects/frontend-nuxt` | `.env.development`（根目錄） | `pnpm dev --port 3000` | 3000 |

### 需要執行的指令

```bash
# 環境變數（解決 corepack 簽名問題）
export COREPACK_INTEGRITY_KEYS=0

# 檢查 port
lsof -ti:5777  # dashboard
lsof -ti:3000  # frontend

# 切 branch
git checkout dev && git pull origin dev
git checkout -b debug/frontend-{MMDD}

# 備份 & 修改前端 .env
# dashboard: apps/web-ele/.env.development
# frontend: .env.development（根目錄）
cp {env_path} {env_path}.bak
sed -i '' 's|^VITE_GLOB_API_URL=.*|VITE_GLOB_API_URL=http://localhost:3001/api/v1|' {env_path}

# 啟動（背景執行）
# dashboard
COREPACK_INTEGRITY_KEYS=0 pnpm dev:ele --port 5777
# frontend
COREPACK_INTEGRITY_KEYS=0 pnpm dev --port 3000

# 停止
lsof -ti:{port} | xargs kill

# 還原前端 .env
mv {env_path}.bak {env_path}

# 切回 dev
git checkout dev
```

### .env.development 修改方式

只改 `VITE_GLOB_API_URL` 這一行，其他不動：

```bash
# 原始值（可能是以下任一）
VITE_GLOB_API_URL=https://api-dev.<COMPANY_DOMAIN>/api/v1
# VITE_GLOB_API_URL=https://api-staging.<COMPANY_DOMAIN>/api/v1
# VITE_GLOB_API_URL=http://localhost:3001/api/v1

# 改為
VITE_GLOB_API_URL=http://localhost:3001/api/v1
```

### 注意事項

- start 前確保主專案沒有未 commit 的改動（避免切 branch 時衝突）
- `.env.development` 會被修改，stop 時從 `.bak` 還原
- `.env.development` 路徑因專案而異：dashboard 在 `apps/web-ele/` 下，frontend 在根目錄
- Port 使用後端 CORS 白名單已有的 port（dashboard=5777, frontend=3000），不需要改後端設定
- `COREPACK_INTEGRITY_KEYS=0` 是必要的環境變數，否則 pnpm 會報簽名錯誤
- 一次只跑一個前端專案
- 使用頻率低，只在需要前端 debug 時才啟動

---

## Skill 定義檔

**檔案位置**: `backend-nestjs/.claude/commands/run-frontend.md`

```markdown
---
description: 啟動/停止前端 dev server（本地 debug 用）
argument-hint: start dashboard | start frontend | stop
design-doc: prompts/4_diary/debug/proposal/slash/run-frontend_skill_proposal.md
---

@.claude/flowcharts/run-frontend_flowchart.md

## 參數

- `$1`：操作（start | stop）
- `$2`：前端專案（dashboard | frontend），start 時必要

## 任務

[依流程圖執行]
```
