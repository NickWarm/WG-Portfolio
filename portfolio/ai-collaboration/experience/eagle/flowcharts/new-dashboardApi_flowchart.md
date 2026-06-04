# /new-adminApi 執行流程

```
/new-adminApi 執行流程
│
├─ 1. 【前置檢查】
│   ├─ git fetch origin adminApi dev
│   │   ├─ fetch adminApi 失敗（remote 不存在）→ 跳過 Step 3
│   │   └─ fetch 成功 → 繼續
│   └─ git log origin/adminApi --oneline --not origin/dev
│       ├─ 有未合併 commit → 顯示清單，中止執行
│       └─ 無未合併 commit → 繼續
│
├─ 2. 【暫存主 workspace 修改】
│   ├─ cd backend-nestjs（確保在主 workspace）
│   ├─ git status 檢查是否有未 commit 修改
│   ├─ 有修改 → git stash push -m "new-adminApi: 暫存修改"，記錄 STASHED=true
│   ├─ 無修改 → 記錄 STASHED=false
│   └─ git checkout --detach HEAD（釋放 adminApi branch 供 Step 5 刪除）
│
├─ 3. 【刪除 remote adminApi】（Step 1 fetch 失敗時跳過）
│   └─ git push origin --delete adminApi
│
├─ 4. 【更新 dev worktree】
│   ├─ cd backend-nestjs-dev-read
│   ├─ 確認在 dev branch（不是就 checkout dev）
│   └─ git pull origin dev
│
├─ 5. 【重建本地 adminApi】（在 dev worktree 中執行）
│   ├─ git branch -D adminApi（刪除舊的本地 branch，不存在則忽略）
│   └─ git checkout -b adminApi（從最新 dev 切出）
│
├─ 6. 【切回 dev worktree】
│   └─ git checkout dev（釋放 adminApi 給主 workspace 使用）
│
├─ 7. 【主 workspace 切到新 adminApi】
│   ├─ cd backend-nestjs
│   └─ git checkout adminApi
│
└─ 8. 【恢復暫存修改】
    ├─ STASHED=true → git stash pop
    └─ STASHED=false → 跳過
```
