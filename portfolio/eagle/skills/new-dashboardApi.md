---
description: 重建乾淨的 adminApi branch（從最新 dev 切出）
design-doc: prompts/4_diary/debug/proposal/slash/new-dashboardApi_skill_proposal.md
---

@.claude/flowcharts/new-dashboardApi_flowchart.md

## 任務

### Step 0: 建立 Task 追蹤

使用 TaskCreate 建立以下 Task：

| # | Subject | activeForm |
|---|---------|------------|
| 1 | Step 1: 前置檢查 | 執行前置檢查 |
| 2 | Step 2: 暫存主 workspace 修改 | 暫存主 workspace 修改 |
| 3 | Step 3: 刪除 remote adminApi | 刪除 remote adminApi |
| 4 | Step 4: 更新 dev worktree | 更新 dev worktree |
| 5 | Step 5: 重建本地 adminApi | 重建本地 adminApi |
| 6 | Step 6: 切回 dev worktree | 切回 dev worktree |
| 7 | Step 7: 主 workspace 切到新 adminApi | 切換主 workspace |
| 8 | Step 8: 恢復暫存修改 | 恢復暫存修改 |

### Step 1: 前置檢查

1. 在主 workspace 執行 fetch：
   ```bash
   cd /Users/nicholas/Desktop/Projects/backend-nestjs
   git fetch origin adminApi dev
   ```
   - 如果 fetch `adminApi` 失敗（remote 不存在），記錄 `REMOTE_EXISTS=false`，跳過後續的 Step 3
   - 如果成功，記錄 `REMOTE_EXISTS=true`

2. 檢查未合併 commit（僅 `REMOTE_EXISTS=true` 時）：
   ```bash
   git log origin/adminApi --oneline --not origin/dev
   ```
   - 有輸出 → 顯示未合併 commit 清單，中止執行，提示用戶先執行 `/merge-to-deploy`
   - 無輸出 → 繼續

### Step 2: 暫存主 workspace 修改

1. 確保在主 workspace：
   ```bash
   cd /Users/nicholas/Desktop/Projects/backend-nestjs
   ```

2. 檢查是否有未 commit 的修改：
   ```bash
   git status --porcelain
   ```
   - 有輸出 → 執行 `git stash push -m "new-dashboardApi: 暫存修改"`，記錄 `STASHED=true`
   - 無輸出 → 記錄 `STASHED=false`

3. Detach HEAD 釋放 adminApi branch（供 Step 5 刪除用）：
   ```bash
   git checkout --detach HEAD
   ```

### Step 3: 刪除 remote adminApi

> `REMOTE_EXISTS=false` 時跳過此步驟

```bash
git push origin --delete adminApi
```

### Step 4: 更新 dev worktree

```bash
cd /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
```

1. 確認當前 branch：
   ```bash
   git branch --show-current
   ```
   - 不是 `dev` → `git checkout dev`

2. 拉取最新：
   ```bash
   git pull origin dev
   ```

### Step 5: 重建本地 adminApi

在 dev worktree 中執行（承接 Step 4 的目錄）：

```bash
git branch -D adminApi
git checkout -b adminApi
```

- `git branch -D` 失敗（本地不存在）→ 忽略錯誤，繼續 checkout -b

### Step 6: 切回 dev worktree

```bash
git checkout dev
```

### Step 7: 主 workspace 切到新 adminApi

```bash
cd /Users/nicholas/Desktop/Projects/backend-nestjs
git checkout adminApi
```

### Step 8: 恢復暫存修改

- `STASHED=true` → `git stash pop`
- `STASHED=false` → 跳過

### 完成報告

```markdown
✅ adminApi 重建完成

| 步驟 | 狀態 |
|------|------|
| 前置檢查 | ✅ 所有 commit 已在 dev |
| Stash | ✅ 已暫存 / ⏭️ 無需暫存 |
| 刪除 remote | ✅ 已刪除 / ⏭️ remote 不存在 |
| 更新 dev worktree | ✅ 已更新 |
| 重建 adminApi | ✅ 已從 dev 切出 |
| 主 workspace 切換 | ✅ 已在 adminApi |
| Stash pop | ✅ 已恢復 / ⏭️ 無需恢復 |
```
