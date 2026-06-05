# merge-to-deploy 執行流程

```
/merge-to-deploy <ticket-number> 執行流程（backend-nestjs 專用）
│
├─ Phase 0: 【參數檢查 + 決定 merge 來源】
│   ├─ 無 ticket-number → ❌ 中止執行
│   │   └─ 提示：「⚠️ 請提供 Notion 票的數字 ID，例如：/merge-to-deploy 393」
│   └─ 有 ticket-number
│       ├─ git fetch origin
│       ├─ git branch -r --list "origin/ticket/{number}-*"
│       ├─ 找到 → MERGE_SOURCE = origin/ticket/{number}-{slug}
│       └─ 找不到 → ❌ 中止：「ticket/{number}-* branch 不存在」
│
├─ Phase 1: 【Merge to dev】
│   │
│   ├─ 1.1 取得最新遠端分支
│   │   └─ git fetch origin dev
│   │
│   ├─ 1.2 準備 dev worktree（偵測 + 條件處理）
│   │   ├─ 偵測現有 dev worktree
│   │   │   └─ git worktree list | grep '\[dev\]'
│   │   │
│   │   ├─ 無舊 worktree → 正常建立
│   │   │   ├─ WORKTREE_PATH = backend-nestjs-dev-merge
│   │   │   ├─ REUSED = false
│   │   │   └─ git worktree add {WORKTREE_PATH} dev
│   │   │
│   │   └─ 有舊 worktree（OLD_PATH）
│   │       ├─ 比對 commit（HEAD vs origin/dev）
│   │       ├─ commit 一致 → 複用
│   │       │   ├─ WORKTREE_PATH = OLD_PATH
│   │       │   └─ REUSED = true
│   │       └─ commit 不一致 → 移除重建
│   │           ├─ git worktree remove {OLD_PATH} --force
│   │           ├─ WORKTREE_PATH = backend-nestjs-dev-merge
│   │           ├─ REUSED = false
│   │           └─ git worktree add {WORKTREE_PATH} dev
│   │
│   ├─ 1.3 設定 worktree 配置
│   │   └─ setup-worktree-config.sh {WORKTREE_PATH}
│   │
│   ├─ 1.4 執行 merge
│   │   ├─ git -C {WORKTREE_PATH} pull origin dev
│   │   ├─ git -C {WORKTREE_PATH} merge --no-ff {MERGE_SOURCE}
│   │   └─ git -C {WORKTREE_PATH} push origin dev
│   │
│   └─ 1.5 記錄 hash 並條件式清理
│       ├─ git -C {WORKTREE_PATH} rev-parse --short HEAD
│       ├─ REUSED = false → git worktree remove {WORKTREE_PATH} --force
│       └─ REUSED = true  → 保留（非本次建立）
│
└─ Phase 2: 【驗證並輸出】
    ├─ dev 分支已更新並推送
    ├─ worktree 已清理（或複用保留）
    └─ 本地修改檔案未受影響
```

## 專案資訊

| 項目 | 值 |
|------|-----|
| 目標專案 | backend-nestjs |
| 來源分支 | ticket branch（由 `/gcommit-push` 建立） |
| 目標分支 | dev |
| 必填參數 | `<ticket-number>`（Notion 票的數字 ID） |

## 備註

- staging 分支改為手動 merge，不由此 command 自動處理（2026-02-10 決議）
- 如需 merge staging，請手動執行 `/merge-to-staging`
