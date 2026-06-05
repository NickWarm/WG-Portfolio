---
description: 【backend-nestjs 專用】將 ticket branch 合併到 dev 並推送到 GitHub
argument-hint: <ticket-number>
allowed-tools: Bash(git:*), Bash(./.claude/scripts/*:*), Bash(/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/*:*)
design-doc: prompts/4_diary/debug/proposal/slash/merge-to-deploy_skill_proposal.md
---

@.claude/flowcharts/merge-to-deploy_flowchart.md

# Git Worktree Merge to Deploy (backend-nestjs 專用)

⚠️ **此 command 僅影響 backend-nestjs 專案**

將 backend-nestjs 的 ticket branch 合併到 dev 並推送到 GitHub。
使用 git worktree 確保不影響本地任何修改。

> ⚠️ staging 分支改為手動 merge，不由此 command 自動處理（2026-02-10 決議）。如需 merge staging，請手動執行 `/merge-to-staging`。

## 專案資訊
- **目標專案**: `/Users/nicholas/Desktop/Projects/backend-nestjs`
- **來源分支**: ticket branch（由 `/gcommit-push` 建立）
- **目標分支**: `dev`

## 參數

- `<ticket-number>`：**必填**，Notion 票的數字 ID（如 `393`）

## 執行步驟

### Phase 0: 參數檢查 + 決定 merge 來源

1. 檢查是否提供 ticket-number（$1）
   - **無 ticket-number** → 中止執行，顯示：
     ```
     ⚠️ 請提供 Notion 票的數字 ID
     用法：/merge-to-deploy 393
     ```
   - **有 ticket-number** → 繼續

2. 從遠端尋找 ticket branch
   ```bash
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs fetch origin
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs branch -r --list "origin/ticket/{number}-*"
   ```
   - **找到** → `MERGE_SOURCE` = 找到的 branch（如 `origin/ticket/393-informationSheet-print-fix`）
   - **找不到** → 中止執行，顯示：
     ```
     ❌ ticket/{number}-* branch 不存在，請先執行 /gcommit-push
     ```

### Phase 1: Merge to dev

1. 取得最新遠端分支
   ```bash
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs fetch origin dev
   ```

2. 準備 dev worktree（偵測 + 條件處理）

   偵測是否已有 dev worktree 存在：
   ```bash
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree list | grep '\[dev\]'
   ```

   | 情境 | 動作 | WORKTREE_PATH | REUSED |
   |------|------|---------------|--------|
   | 無舊 worktree | `git worktree add .../backend-nestjs-dev-merge dev` | `.../backend-nestjs-dev-merge` | false |
   | 有舊 worktree，commit = origin/dev | 直接複用 | 舊路徑（如 `.../backend-nestjs-dev-read`） | true |
   | 有舊 worktree，commit ≠ origin/dev | `git worktree remove --force` + `git worktree add` | `.../backend-nestjs-dev-merge` | false |

   **比對 commit 的方法**（有舊 worktree 時執行）：
   ```bash
   git -C {OLD_PATH} rev-parse HEAD
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs rev-parse origin/dev
   ```

   > AI 記住 `WORKTREE_PATH` 和 `REUSED` 的值，後續步驟使用

3. 設定 worktree 配置
   ```bash
   /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/setup-worktree-config.sh {WORKTREE_PATH}
   ```

4. 在 worktree 中執行 merge（使用 git -C 避免 cd 導致目錄問題）
   ```bash
   git -C {WORKTREE_PATH} pull origin dev
   git -C {WORKTREE_PATH} merge --no-ff {MERGE_SOURCE} -m "Merge {MERGE_SOURCE} into dev"
   git -C {WORKTREE_PATH} push origin dev
   ```

5. 取得 commit hash 並條件式清理 worktree
   ```bash
   git -C {WORKTREE_PATH} rev-parse --short HEAD
   ```
   > AI 請記住上面 rev-parse 輸出的 commit hash，用於最終報告

   - **REUSED = false**：移除 worktree
     ```bash
     git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree remove {WORKTREE_PATH} --force
     ```
   - **REUSED = true**：保留 worktree（非本次建立，不移除）

## 完成後驗證

- [ ] dev 分支已更新並推送
- [ ] worktree 已清理（REUSED=false）或保留（REUSED=true）
- [ ] 本地修改檔案未受影響

## 輸出格式

完成後請輸出：

```
✅ Merge to Deploy 完成

| 目標分支 | 來源分支 | 狀態 | Commit |
|----------|----------|------|--------|
| dev      | ticket/{number}-{slug} | ✅ | [commit hash] |

本地修改檔案：未受影響
🎫 Branch ticket/{number}-{slug} 已保留在 GitHub

> staging 需手動執行 /merge-to-staging
```
