# new-dashboardApi 設計稿

> 📅 建立日期：2026-02-12

---

## 問題描述

每次 adminApi 的功能都 merge 進 dev 後，需要重建一個乾淨的 adminApi branch 作為下一輪開發的起點。

- **現況痛點**：手動執行多個 git 指令（fetch、檢查未合併 commit、刪 remote branch、pull dev、刪舊 branch、建新 branch、切換 workspace），步驟多且容易遺漏
- **預期效益**：一鍵完成重建流程，自動處理 stash/pop 保護未 commit 的修改

---

## 執行流程圖

```
/new-dashboardApi 執行流程
│
├─ 1. 【前置檢查】
│   ├─ git fetch origin adminApi dev
│   └─ git log origin/adminApi --oneline --not origin/dev
│       ├─ 有未合併 commit → 顯示清單，中止執行
│       └─ 無未合併 commit → 繼續
│
├─ 2. 【暫存主 workspace 修改】
│   ├─ git status 檢查是否有未 commit 修改
│   ├─ 有修改 → git stash push -m "new-dashboardApi: 暫存修改"
│   ├─ 無修改 → 跳過 stash，記錄 STASHED=false
│   └─ git checkout --detach HEAD（釋放 adminApi branch 供 Step 5 刪除）
│
├─ 3. 【刪除 remote adminApi】
│   └─ git push origin --delete adminApi
│
├─ 4. 【更新 dev worktree】
│   ├─ cd backend-nestjs-dev-read
│   ├─ 確認在 dev branch（不是就 checkout dev）
│   └─ git pull origin dev
│
├─ 5. 【重建本地 adminApi】
│   ├─ git branch -D adminApi（刪除舊的，不存在則忽略）
│   └─ git checkout -b adminApi（從 dev 切出新的）
│
├─ 6. 【切回 dev worktree】
│   └─ git checkout dev（讓 worktree 回到 dev）
│
├─ 7. 【主 workspace 切到新 adminApi】
│   ├─ cd backend-nestjs
│   └─ git checkout adminApi
│
└─ 8. 【恢復暫存修改】
    ├─ STASHED=true → git stash pop
    └─ STASHED=false → 跳過
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| 無 | - | 此 skill 不需要參數 | `/new-dashboardApi` |

---

## 輸出格式

### 成功時

```markdown
✅ adminApi 重建完成

| 步驟 | 狀態 |
|------|------|
| 前置檢查 | ✅ 所有 commit 已在 dev |
| Stash | ✅ 已暫存 / ⏭️ 無需暫存 |
| 刪除 remote | ✅ 已刪除 |
| 更新 dev worktree | ✅ 已更新 |
| 重建 adminApi | ✅ 已從 dev 切出 |
| 主 workspace 切換 | ✅ 已在 adminApi |
| Stash pop | ✅ 已恢復 / ⏭️ 無需恢復 |
```

### 失敗時（有未合併 commit）

```markdown
❌ adminApi 還有 commit 未合併到 dev，無法重建

未合併的 commit：
- abc1234 feat: some feature
- def5678 fix: some fix

請先執行 /merge-to-deploy 將這些 commit 合併到 dev
```

---

## 實作細節

### 前提條件

- 主 workspace 在 `backend-nestjs/`，當前 branch 為 `adminApi`
- Dev worktree 在 `backend-nestjs-dev-read/`，branch 為 `dev`

### 需要執行的指令

```bash
# Step 1: 前置檢查
git fetch origin adminApi dev
git log origin/adminApi --oneline --not origin/dev

# Step 2: 暫存
git stash push -m "new-dashboardApi: 暫存修改"
git checkout --detach HEAD

# Step 3: 刪除 remote
git push origin --delete adminApi

# Step 4: 更新 dev worktree
cd /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
git checkout dev  # 如果不在 dev
git pull origin dev

# Step 5: 重建 adminApi
git branch -D adminApi
git checkout -b adminApi

# Step 6: 切回 dev
git checkout dev

# Step 7: 主 workspace 切換
cd /Users/nicholas/Desktop/Projects/backend-nestjs
git checkout adminApi

# Step 8: 恢復
git stash pop
```

### 注意事項

- Step 1 的 fetch 可能遇到 remote 沒有 adminApi 的情況（首次使用或已被刪除），此時跳過 fetch adminApi，只 fetch dev，並跳過 Step 3
- Step 2 的 detach HEAD 是為了釋放 adminApi branch，否則 Step 5 的 `git branch -D` 會失敗（branch 被主 workspace checkout 佔住）
- Step 5 在 dev worktree 裡執行，因為 worktree 已在最新 dev 上
- Step 6 必須在 Step 7 之前，否則主 workspace 無法 checkout adminApi（被 worktree 佔住）
- Step 2 的 stash 在主 workspace（backend-nestjs）執行，不是在 worktree
