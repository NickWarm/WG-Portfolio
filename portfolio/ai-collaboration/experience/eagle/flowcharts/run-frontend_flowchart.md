# /run-frontend 執行流程

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
│   │   ├─ 檢查 port 是否已被佔用（lsof -ti:{port}）
│   │   │   └─ 已佔用 → 提示用戶，中止
│   │   └─ 檢查主專案有無未 commit 的改動（git status --porcelain）
│   │       ├─ 有 → 提示用戶先處理，中止
│   │       └─ 沒有 → 繼續
│   ├─ 2.2 切 branch
│   │   ├─ 記錄當前 branch（git branch --show-current）
│   │   ├─ git checkout dev && git pull origin dev
│   │   └─ git checkout -b debug/frontend-{MMDD}
│   ├─ 2.3 環境準備
│   │   ├─ 備份並修改前端 .env.development
│   │   │   ├─ dashboard → apps/web-ele/.env.development
│   │   │   └─ frontend → .env.development（根目錄）
│   │   └─ 檢查 node_modules（沒有就 pnpm install）
│   └─ 2.4 啟動 dev server（run_in_background: true）
│       ├─ dashboard → COREPACK_INTEGRITY_KEYS=0 pnpm dev:ele --port 5566
│       ├─ frontend → COREPACK_INTEGRITY_KEYS=0 pnpm dev --port 5577
│       └─ 輸出啟動資訊
│
└─ 3. 【stop 流程】
    ├─ 3.1 停止 dev server（lsof -ti:{port} | xargs kill）
    ├─ 3.2 還原前端 .env.development（從 .bak）
    ├─ 3.3 處理 branch
    │   ├─ 詢問：是否推 branch 到 GitHub？（AskUserQuestion）
    │   │   ├─ 是 → git add . && git commit && git push origin debug/frontend-{MMDD}
    │   │   └─ 否 → 跳過
    │   ├─ 切回 dev（git checkout dev）
    │   └─ 詢問：是否刪除 debug branch？（AskUserQuestion）
    │       ├─ 是 → git branch -D debug/frontend-{MMDD}
    │       └─ 否 → 保留
    └─ 3.4 輸出結果
```

## 專案對應表

| 參數 | 專案路徑 | .env.development 位置 | Dev 指令 | Port |
|------|----------|----------------------|----------|------|
| dashboard | `/Users/nicholas/Desktop/Projects/dashboard-nuxt` | `apps/web-ele/.env.development` | `pnpm dev:ele --port 5777` | 5777 |
| frontend | `/Users/nicholas/Desktop/Projects/frontend-nuxt` | `.env.development`（根目錄） | `pnpm dev --port 3000` | 3000 |

## .env.development 修改規則

只改 `VITE_GLOB_API_URL` 這一行，使用 sed 替換：

```bash
# 備份（注意路徑因專案而異）
# dashboard: apps/web-ele/.env.development
# frontend: .env.development
cp {env_path} {env_path}.bak

# 替換
sed -i '' 's|^VITE_GLOB_API_URL=.*|VITE_GLOB_API_URL=http://localhost:3001/api/v1|' {env_path}
```

## Step 0：建立 Task 追蹤

```
TaskCreate 列表：
| # | Subject | activeForm | blockedBy |
|---|---------|------------|-----------|
| 1 | 解析參數並判斷操作 | 解析參數 | — |
| 2 | 執行前置檢查 | 檢查 port 和 git 狀態 | Task 1 |
| 3 | 切 debug branch | 切換到 debug branch | Task 2 |
| 4 | 準備環境並啟動 dev server | 準備環境並啟動 dev server | Task 3 |
| 5 | 停止 dev server | 停止 dev server | — |
| 6 | 還原環境並處理 branch | 還原環境並處理 branch | Task 5 |
```
