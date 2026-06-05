---
description: 啟動/停止前端 dev server（本地 debug 用）
argument-hint: start dashboard | start frontend | stop
design-doc: prompts/4_diary/debug/proposal/slash/run-frontend_skill_proposal.md
---

@.claude/flowcharts/run-frontend_flowchart.md

## 參數

- `$1`：操作（start | stop）
- `$2`：前端專案（dashboard | frontend），start 時必要

## 執行流程

```
/run-frontend
├─ start <project> → Step 1~4
└─ stop → Step 5~6
```

## 任務

### Step 0：建立 Task 追蹤

```
TaskCreate 列表（start 模式）：
| # | Subject | activeForm | blockedBy |
|---|---------|------------|-----------|
| 1 | 解析參數並判斷操作 | 解析參數 | — |
| 2 | 執行前置檢查 | 檢查 port 和 git 狀態 | Task 1 |
| 3 | 切 debug branch | 切換到 debug branch | Task 2 |
| 4 | 準備環境並啟動 dev server | 準備環境並啟動 dev server | Task 3 |

TaskCreate 列表（stop 模式）：
| # | Subject | activeForm | blockedBy |
|---|---------|------------|-----------|
| 5 | 停止 dev server | 停止 dev server | — |
| 6 | 還原環境並處理 branch | 還原環境並處理 branch | Task 5 |
```

### Step 1：解析參數並判斷操作

1. 解析 `$1`：
   - `start` → 繼續解析 `$2`
   - `stop` → 跳到 Step 5
   - 其他 → 提示用法：`/run-frontend start dashboard | start frontend | stop`

2. 解析 `$2`（start 時）：
   - `dashboard` → 專案路徑 `/Users/nicholas/Desktop/Projects/dashboard-nuxt`，port `5777`，指令 `pnpm dev:ele --port 5777`
   - `frontend` → 專案路徑 `/Users/nicholas/Desktop/Projects/frontend-nuxt`，port `3000`，指令 `pnpm dev --port 3000`
   - 其他/缺少 → 提示：`請指定專案：dashboard 或 frontend`

### Step 2：執行前置檢查

1. **檢查 port**：
   ```bash
   lsof -ti:{port}
   ```
   - 有輸出 → `❌ Port {port} 已被佔用，請先關閉佔用的 process`，中止
   - 無輸出 → 繼續

2. **檢查 git 狀態**：
   ```bash
   cd {專案路徑} && git status --porcelain
   ```
   - 有輸出 → `❌ 主專案有未 commit 的改動，請先處理`，中止
   - 無輸出 → 繼續

### Step 3：切 debug branch

```bash
cd {專案路徑}

# 記錄當前 branch
ORIGINAL_BRANCH=$(git branch --show-current)

# 切到 dev 並拉最新
git checkout dev && git pull origin dev

# 建立 debug branch（MMDD 用當天日期）
git checkout -b debug/frontend-{MMDD}
```

輸出：`📌 已從 dev 切出 debug/frontend-{MMDD}（原 branch：{ORIGINAL_BRANCH}）`

### Step 4：準備環境並啟動 dev server

1. **備份並修改前端 .env.development**：
   ```bash
   cd {專案路徑}
   # dashboard: apps/web-ele/.env.development
   # frontend: .env.development（根目錄）
   cp {env_path} {env_path}.bak
   sed -i '' 's|^VITE_GLOB_API_URL=.*|VITE_GLOB_API_URL=http://localhost:3001/api/v1|' {env_path}
   ```

2. **檢查 node_modules**：
   ```bash
   ls {專案路徑}/node_modules/ 2>/dev/null
   ```
   - 不存在 → 執行 `cd {專案路徑} && COREPACK_INTEGRITY_KEYS=0 pnpm install`
   - 存在 → 跳過

3. **背景啟動 dev server**：
   ```bash
   cd {專案路徑} && COREPACK_INTEGRITY_KEYS=0 {dev指令}
   ```
   使用 `run_in_background: true`

4. **輸出啟動資訊**：
   ```
   ✅ 前端已啟動

   | 項目 | 值 |
   |------|-----|
   | 專案 | {專案名稱} |
   | URL | http://localhost:{port} |
   | Branch | debug/frontend-{MMDD} |
   | 原 Branch | {ORIGINAL_BRANCH} |
   | API 指向 | http://localhost:3001/api/v1 |
   ```

### Step 5：停止 dev server

1. **判斷正在跑的前端**：
   ```bash
   # 依序檢查兩個 port
   lsof -ti:5777  # dashboard
   lsof -ti:3000  # frontend
   ```
   - 找到佔用的 port → 確定專案和路徑
   - 都沒有 → `❌ 沒有正在執行的前端 dev server`，中止

2. **停止 process**：
   ```bash
   lsof -ti:{port} | xargs kill
   ```

3. 輸出：`🛑 已停止 {專案名稱} dev server（port {port}）`

### Step 6：還原環境並處理 branch

1. **還原前端 .env.development**：
   ```bash
   cd {專案路徑}
   mv {env_path}.bak {env_path}
   ```

2. **詢問是否推 branch 到 GitHub**（AskUserQuestion）：
   - 是 →
     ```bash
     git add .
     git commit -m "debug: frontend debug log for {MMDD}"
     git push origin debug/frontend-{MMDD}
     ```
   - 否 → 跳過

3. **切回 dev**：
   ```bash
   git checkout dev
   ```

4. **詢問是否刪除 debug branch**（AskUserQuestion）：
   - 是 → `git branch -D debug/frontend-{MMDD}`
   - 否 → 保留

5. **輸出結果**：
   ```
   ✅ 前端已停止

   | 項目 | 值 |
   |------|-----|
   | 已切回 | dev |
   | Branch 推送 | ✅ / ⏭️ 跳過 |
   | Branch 刪除 | ✅ / ⏭️ 保留 |
   ```
