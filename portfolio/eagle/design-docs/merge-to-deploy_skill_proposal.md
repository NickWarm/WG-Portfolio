# Claude Code Slash Command 提案：Git Worktree Merge 工作流程

## 📋 提案概要

| 項目 | 內容 |
|------|------|
| 提案日期 | 2026-01-03 |
| 更新日期 | 2026-01-03 |
| 目標 | 將 git worktree merge 操作從複製貼上改為 Claude Code Slash Command |
| 優先級 | 高（高頻使用場景） |
| **類型** | **Slash Command**（非 Skill） |
| **目標專案** | **backend-nestjs 專用**（不影響其他專案） |
| **來源分支** | **adminApi**（固定，非動態） |
| **工作目錄** | 可從 Projects 目錄執行，使用 `git -C` 指向 backend-nestjs |

---

## 📖 為什麼是 Slash Command 而不是 Skill？

Claude Code 有兩種擴展方式，適用場景不同：

| 特性 | Skill | Slash Command |
|------|-------|---------------|
| **觸發方式** | 自動（Claude 判斷用戶意圖） | 手動（用戶輸入 `/command`） |
| **目錄位置** | `.claude/skills/skill-name/SKILL.md` | `.claude/commands/command.md` |
| **適用場景** | AI 主動識別需求、知識庫 | 高頻操作、固定流程、用戶明確知道要執行什麼 |

**本提案選擇 Slash Command 的理由**：

1. **手動觸發** - 開發告一段落才執行 merge，不是每次都需要
2. **明確意圖** - 用戶知道「現在要 merge 到 dev/staging」
3. **固定流程** - 每次執行的步驟相同，適合命令化
4. **高頻使用** - 輸入 `/merge-to-deploy` 比貼長 prompt 快

---

## 🎯 問題描述

### 現狀
每次要將 `adminApi` 分支合併到 `dev` 和 `staging` 時，需要複製貼上以下 prompt：

```
請幫我用 git worktree 進入 dev branch，然後把 adminApi merge 進 dev github，接著退出 git worktree dev

然後一樣

請幫我用 git worktree 進入 staging branch，然後把 adminApi merge 進 staging，然後推上 github，接著退出 git worktree staging

以上操作注意都是 git worktree 不要改到本地修改的檔案
```

### 痛點
1. **重複性高** - 每次開發到一定進度都需要執行
2. **容易出錯** - 手動複製貼上可能遺漏細節
3. **不夠直覺** - 長 prompt 不如簡短命令易用

---

## 🚀 解決方案：Claude Code Slash Command

### 方案 A：單一 Slash Command 同時處理 dev + staging

**Command 名稱**：`/merge-to-deploy`

**觸發方式**：
```
/merge-to-deploy
```

**執行流程**：
```
用戶輸入 /merge-to-deploy
         ↓
    確認當前分支（adminApi）
         ↓
    檢查本地是否有未提交修改（警告但不阻止）
         ↓
    ┌────────────────────────────────────┐
    │  Phase 1: Merge to dev             │
    │  1. git worktree add ... dev       │
    │  2. setup-worktree-config.sh       │
    │  3. git pull origin dev            │
    │  4. git merge adminApi         │
    │  5. git push origin dev            │
    │  6. git worktree remove --force    │
    └────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────┐
    │  Phase 2: Merge to staging         │
    │  1. git worktree add ... staging   │
    │  2. setup-worktree-config.sh       │
    │  3. git pull origin staging        │
    │  4. git merge adminApi         │
    │  5. git push origin staging        │
    │  6. git worktree remove --force    │
    └────────────────────────────────────┘
         ↓
    輸出結果摘要
```

---

### 方案 B：分開的 Slash Command（更靈活）

| Command | 功能 |
|---------|------|
| `/merge-to-dev` | 只合併到 dev |
| `/merge-to-staging` | 只合併到 staging |
| `/merge-to-deploy` | 同時執行兩者 |

**優點**：可以只推 dev 測試，確認沒問題再推 staging

---

## 🔄 母子 Slash Command 架構設計（討論中）

### 需求
- 大部分情況：dev + staging 一起推
- 偶爾需要：只推 dev 或只推 staging
- 希望：母 command 能調用子 command，避免重複維護

### 架構設計
```
/merge-to-deploy（母 command）
    ├── 調用 /merge-to-dev 的邏輯
    └── 調用 /merge-to-staging 的邏輯

/merge-to-dev（子 command）- 獨立可執行
/merge-to-staging（子 command）- 獨立可執行
```

### 實作方式比較

#### 方式 B：Command 引用語法（待驗證）

**概念**：母 command 透過特殊語法調用子 command
```markdown
## 執行流程
1. 執行 {{command:merge-to-dev}}
2. 執行 {{command:merge-to-staging}}
```

**優點**：
- 邏輯不重複，維護單一來源
- Command 層級清晰

**缺點**：
- 需確認 Claude Code 是否支持此語法
- 可能需要特殊處理錯誤傳遞

**適用情境**：Claude Code 原生支持 command 互相調用

---

#### 方式 C：共用 Shell Script

**概念**：邏輯集中在 shell script，command 只是入口

**檔案結構**：
```
.claude/
├── scripts/
│   └── merge-to-branch.sh    # 通用腳本，接受分支參數
└── commands/
    ├── merge-to-deploy.md    # 調用 script dev + staging
    ├── merge-to-dev.md       # 調用 script dev
    └── merge-to-staging.md   # 調用 script staging
```

**merge-to-branch.sh 設計**：
```bash
#!/bin/bash
TARGET_BRANCH=$1
SOURCE_BRANCH=$(git branch --show-current)
WORKTREE_PATH="/Users/nicholas/Desktop/Projects/backend-nestjs-${TARGET_BRANCH}-merge"

# 1. Fetch
git fetch origin $TARGET_BRANCH

# 2. Create worktree
git worktree add $WORKTREE_PATH $TARGET_BRANCH

# 3. Setup config
./.claude/scripts/setup-worktree-config.sh $WORKTREE_PATH

# 4. Merge
cd $WORKTREE_PATH
git pull origin $TARGET_BRANCH
git merge $SOURCE_BRANCH -m "Merge $SOURCE_BRANCH into $TARGET_BRANCH"

# 5. Push
git push origin $TARGET_BRANCH

# 6. Cleanup
cd -
git worktree remove $WORKTREE_PATH --force
```

**Command 調用**：
```markdown
# /merge-to-deploy
執行：
1. ./.claude/scripts/merge-to-branch.sh dev
2. ./.claude/scripts/merge-to-branch.sh staging

# /merge-to-dev
執行：./.claude/scripts/merge-to-branch.sh dev

# /merge-to-staging
執行：./.claude/scripts/merge-to-branch.sh staging
```

**優點**：
- 邏輯 100% 集中在一個 script
- 不依賴 Claude Code 特殊語法
- 可獨立測試 script
- 錯誤處理更容易控制

**缺點**：
- 需要維護額外的 shell script
- Script 錯誤訊息可能較難讀

**適用情境**：需要穩定可靠、不依賴 Claude Code 特殊功能

---

### 討論結論

**採用方式 C：共用 Shell Script**

| 方式 | 推薦度 | 理由 |
|------|--------|------|
| B：Command 引用 | ⭐⭐ | 需驗證是否支持，風險較高 |
| C：共用 Script | ⭐⭐⭐ | **採用** - 穩定可靠、不依賴特殊語法 |

**決策理由**：
1. Script 可獨立測試，不依賴 Claude Code 特殊語法
2. 錯誤處理集中，維護單一來源
3. Command 負責入口 + 結果呈現，Script 負責執行邏輯
4. 分工清晰，各司其職

---

## 🔧 Conflict 處理 Slash Command

### 基本資訊
- **Command 名稱**：`/continue-merge`
- **觸發時機**：merge 遇到 conflict 中斷後，用戶解決完 conflict 執行

### 執行流程
```
執行 /merge-to-deploy
         ↓
    dev merge 成功 ✅
         ↓
    staging merge 遇到 conflict ❌
         ↓
    中斷，顯示衝突資訊
    記錄狀態到 .claude/merge-state.json
         ↓
    用戶手動解決 conflict
         ↓
    執行 /continue-merge
         ↓
    讀取 merge-state.json
    從中斷點繼續（commit + push staging）
```

### 進階版設計（討論中）

#### 功能 1：智能分析 Conflict 原因

當 conflict 發生時，AI 主動分析：

```markdown
## ⚠️ Merge Conflict 發生

### 衝突檔案
- src/api/adminApi/customer/customer.service.ts

### 衝突類型分析
| 類型 | 說明 |
|------|------|
| 同區塊修改 | adminApi 和 staging 都修改了 findAll 方法 |

### 變更比較
**adminApi 版本（你的修改）**：
```typescript
// 新增了 isBuyer 篩選邏輯
if (query.isBuyer) {
  qb.andWhere('customer.isBuyer = :isBuyer', { isBuyer: true });
}
```

**staging 版本（遠端修改）**：
```typescript
// 新增了 keyword 搜尋邏輯
if (query.keyword) {
  qb.andWhere('customer.name ILIKE :keyword', { keyword: `%${query.keyword}%` });
}
```

### 建議解法
這兩個修改是**獨立功能**，應該**合併保留兩者**：
```typescript
// 合併兩者
if (query.isBuyer) {
  qb.andWhere('customer.isBuyer = :isBuyer', { isBuyer: true });
}
if (query.keyword) {
  qb.andWhere('customer.name ILIKE :keyword', { keyword: `%${query.keyword}%` });
}
```
```

#### 功能 2：分類建議策略

根據衝突類型提供不同策略：

| 衝突類型 | 建議策略 |
|----------|----------|
| 同區塊獨立功能 | 合併保留兩者 |
| 同行不同邏輯 | 需人工判斷優先級 |
| 格式/重構衝突 | 通常採用較新版本 |
| 刪除 vs 修改 | 確認功能是否還需要 |

#### ~~功能 3：自動修復建議~~（不採用）

~~對於簡單衝突，提供一鍵修復~~

**決策**：不採用自動修復，理由：
- 自動套用有誤判風險
- 保留人工判斷更安全

### Conflict 處理決策

**採用 L2：分析 + 通知 AI 手動處理**

```
Conflict 發生
     ↓
AI 分析衝突類型、比較兩邊程式碼
     ↓
輸出分析報告 + 建議解法
     ↓
用戶決定如何解決
     ↓
用戶解決後執行 /continue-merge
```

**優點**：
- AI 負責分析（省時）
- 人負責決策（安全）
- 兼顧效率與可靠性

### 狀態檔案設計

`.claude/merge-state.json`：
```json
{
  "status": "conflict",
  "source_branch": "adminApi",
  "target_branch": "staging",
  "completed_targets": ["dev"],
  "pending_targets": ["staging"],
  "worktree_path": "/Users/nicholas/Desktop/Projects/backend-nestjs-staging-merge",
  "conflict_files": [
    "src/api/adminApi/customer/customer.service.ts"
  ],
  "timestamp": "2026-01-03T10:30:00Z"
}
```

---

## 📁 Slash Command 實作檔案

### 檔案位置
```
/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/
├── merge-to-deploy.md      # 主要 command
├── merge-to-dev.md         # 可選：單獨 merge to dev
└── merge-to-staging.md     # 可選：單獨 merge to staging
```

### merge-to-deploy.md 內容

```markdown
# Git Worktree Merge to Deploy (backend-nestjs 專用)

⚠️ **此 command 僅影響 backend-nestjs 專案**

將 backend-nestjs 的 adminApi 分支合併到 dev 和 staging 並推送到 GitHub。
使用 git worktree 確保不影響本地任何修改。

## 專案資訊
- **目標專案**: `/Users/nicholas/Desktop/Projects/backend-nestjs`
- **來源分支**: `adminApi`（功能開發主分支）
- **目標分支**: `dev` 和 `staging`

## 執行步驟

### Phase 1: Merge to dev

1. 取得最新遠端分支
   ```bash
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs fetch origin dev staging
   ```

2. 建立 dev worktree
   ```bash
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree add /Users/nicholas/Desktop/Projects/backend-nestjs-dev-merge dev
   ```

3. 設定 worktree 配置
   ```bash
   /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/setup-worktree-config.sh /Users/nicholas/Desktop/Projects/backend-nestjs-dev-merge
   ```

4. 在 worktree 中執行 merge
   ```bash
   cd /Users/nicholas/Desktop/Projects/backend-nestjs-dev-merge
   git pull origin dev
   git merge adminApi -m "Merge adminApi into dev"
   git push origin dev
   ```

5. 清理 worktree
   ```bash
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree remove /Users/nicholas/Desktop/Projects/backend-nestjs-dev-merge --force
   ```

### Phase 2: Merge to staging

1. 建立 staging worktree
   ```bash
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree add /Users/nicholas/Desktop/Projects/backend-nestjs-staging-merge staging
   ```

2. 設定 worktree 配置
   ```bash
   /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/setup-worktree-config.sh /Users/nicholas/Desktop/Projects/backend-nestjs-staging-merge
   ```

3. 在 worktree 中執行 merge
   ```bash
   cd /Users/nicholas/Desktop/Projects/backend-nestjs-staging-merge
   git pull origin staging
   git merge adminApi -m "Merge adminApi into staging"
   git push origin staging
   ```

4. 清理 worktree
   ```bash
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree remove /Users/nicholas/Desktop/Projects/backend-nestjs-staging-merge --force
   ```

## 完成後驗證

- [ ] dev 分支已更新並推送
- [ ] staging 分支已更新並推送
- [ ] 所有 worktree 已清理
- [ ] 本地修改檔案未受影響

## 輸出格式

```
✅ Merge to Deploy 完成

| 目標分支 | 狀態 | Commit |
|----------|------|--------|
| dev      | ✅   | [commit hash] |
| staging  | ✅   | [commit hash] |

本地修改檔案：未受影響
```
```

---

## 🪝 替代方案討論：使用 Hook 自動觸發

### 場景：adminApi 分支 commit 時自動執行

**Hook 類型**：PostToolUse（監聽 git commit）

**設計**：
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "pattern": "git commit",
        "branch": "adminApi",
        "action": "prompt_merge_to_deploy"
      }
    ]
  }
}
```

**行為**：
```
用戶在 adminApi 執行 git commit
         ↓
    Hook 觸發
         ↓
    顯示提示：「是否要同步到 dev/staging？」
         ├── Yes → 執行 merge-to-deploy
         └── No  → 跳過
```

### 優缺點比較

| 方式 | 優點 | 缺點 |
|------|------|------|
| **Slash Command（手動觸發）** | 完全控制、不干擾開發流程 | 需要記得執行 |
| **Hook（自動觸發）** | 不會忘記同步 | 可能造成干擾、頻繁提示 |
| **Hook + 確認提示** | 平衡兩者 | 每次 commit 都會詢問 |

### 建議

**推薦使用 Slash Command（手動觸發）**，理由：

1. **開發節奏** - 不是每個 commit 都需要同步到 dev/staging
2. **批次處理** - 通常是完成一個功能後才同步
3. **避免干擾** - 自動觸發會打斷開發流程
4. **明確意圖** - 用戶主動執行更符合實際需求

### Hook 方案決策

| 項目 | 決策 | 理由 |
|------|------|------|
| 自動觸發 Hook | ❌ 不採用 | 會干擾開發流程 |
| 確認提示 | ❌ 不需要 | 用戶需要時就是直接執行 |
| 提醒型 Hook | ❌ 不採用 | 暫不需要 |

---

## 🔗 啟動目錄與 Command 掃描問題

### 問題說明

Claude Code **只掃描啟動目錄的 `.claude/commands/`**，不會遞迴掃描子目錄。

| 項目 | 路徑 |
|------|------|
| 啟動目錄 | `/Users/nicholas/Desktop/Projects` |
| Command 定義位置 | `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/` |

→ Claude Code 在 Projects 啟動時，**找不到** backend-nestjs 裡的 commands

### 解決方案比較

| 方案 | 做法 | 優缺點 |
|------|------|--------|
| **A：Symlink（採用）** | 在 Projects 建立連結指向 backend-nestjs | 單一來源、兩邊都能用 |
| B：移動位置 | 把 commands 放到 `Projects/.claude/commands/` | 不在專案內，不便版控 |
| C：換啟動目錄 | 直接在 backend-nestjs 啟動 Claude Code | 改變使用習慣 |

### 採用方案 A：Symlink

**決策理由**：
1. Command 檔案保留在 `backend-nestjs/.claude/commands/`，便於版控
2. 透過 symlink 讓 Projects 目錄也能存取
3. 不需改變啟動習慣

**設定指令**：
```bash
cd /Users/nicholas/Desktop/Projects
mkdir -p .claude
ln -s ../backend-nestjs/.claude/commands .claude/commands
```

**注意事項**：
- 新增或修改 slash command 後，需**重啟 Claude Code** 才會生效
- Symlink 只需設定一次

---

## 📝 實作步驟

### Step 0: 設定 Symlink（讓 Projects 目錄能找到 commands）

```bash
cd /Users/nicholas/Desktop/Projects
mkdir -p .claude
ln -s ../backend-nestjs/.claude/commands .claude/commands
```

### Step 1: 建立 Command 檔案

```bash
mkdir -p /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands
touch /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/merge-to-deploy.md
```

### Step 2: 撰寫 Command 內容

將上述 `merge-to-deploy.md` 內容寫入檔案

### Step 3: 測試 Command

```
/merge-to-deploy
```

### Step 4: 可選 - 新增分開的 Command

如果需要更細緻的控制，新增：
- `/merge-to-dev`
- `/merge-to-staging`

---

## ✅ 驗收標準

- [ ] 輸入 `/merge-to-deploy` 可正確執行
- [ ] 自動取得當前分支名稱
- [ ] 正確執行 worktree 操作
- [ ] 本地修改不受影響
- [ ] 輸出清晰的執行結果

---

## 📊 預期效益

| 指標 | 改善前 | 改善後 |
|------|--------|--------|
| 操作時間 | 複製貼上 + 等待 | 輸入命令 + 等待 |
| 錯誤率 | 可能遺漏細節 | 標準化流程 |
| 使用體驗 | 繁瑣 | 簡潔直覺 |

---

## 🔄 後續擴展

1. **參數化**：支援指定來源分支 `/merge-to-deploy --from feature-x`
2. **選擇性推送**：`/merge-to-deploy --only dev`
3. **乾跑模式**：`/merge-to-deploy --dry-run`
4. **整合 CI/CD**：推送後自動觸發部署流程驗證

---

## 📋 決策總結

| 項目 | 決策 |
|------|------|
| **觸發方式** | Slash Command（手動觸發） |
| **母子架構** | 方式 C：共用 Shell Script |
| **啟動目錄問題** | 方案 A：Symlink（從 Projects 連結到 backend-nestjs） |
| **確認提示** | 不需要 |
| **提醒型 Hook** | 不採用 |
| **Conflict 處理** | L2：AI 分析 + 人工處理 |
| **自動修復** | 不採用 |
| **staging 策略** | 手動 merge（不自動），2026-02-10 決議 |

---

## 🗂️ 最終檔案結構

```
.claude/
├── scripts/
│   └── merge-to-branch.sh       # 通用 merge 腳本（核心邏輯）
├── commands/
│   ├── merge-to-deploy.md       # 母 command：dev + staging
│   ├── merge-to-dev.md          # 子 command：只 dev
│   ├── merge-to-staging.md      # 子 command：只 staging
│   └── continue-merge.md        # conflict 後繼續
└── merge-state.json             # conflict 狀態記錄（動態產生）
```

---

**提案狀態**：討論完成，待實作

---

## 🔄 設計變更記錄

### 2026-02-10 設計變更：移除 staging 自動 merge，改為手動

**問題描述**：
- 決議 staging 分支改為手動 merge，不再由 `/merge-to-deploy` 自動處理
- 原因：staging 環境需要更謹慎的控制，手動 merge 可確保部署時機由人決定

**設計決策**：
- `/merge-to-deploy` 僅自動 merge 到 `dev`，不再包含 staging
- 移除 Phase 2（Merge to staging）的自動流程
- 保留 `/merge-to-staging` 子 command 供需要時手動執行（但不由母 command 調用）

**修改內容**：

1. **定義檔 `merge-to-deploy.md`**：
   - 移除 Phase 2: Merge to staging
   - 目標分支從「dev 和 staging」改為僅「dev」
   - 輸出格式只顯示 dev 結果

2. **流程圖 `merge-to-deploy_flowchart.md`**：
   - 移除 Phase 2 節點
   - 更新流程為單一 Phase

3. **決策總結更新**：
   - 新增「staging 策略」：手動 merge（不自動）

**影響範圍**：
- `/merge-to-deploy`：僅 merge dev
- `/merge-to-staging`：獨立手動執行（不受影響）
- `/merge-to-dev`：不受影響

### 2026-02-21 設計變更：Dev Worktree 衝突自動處理

**問題描述**：
- 建立 dev worktree 時，如果已有舊的 dev worktree 存在（如 `backend-nestjs-dev-read`），`git worktree add` 會報錯 `fatal: 'dev' is already checked out`
- 目前需要手動確認移除舊 worktree，中斷自動化流程

**設計決策**：
- 在 Step 2（建立 dev worktree）前插入自動偵測邏輯
- 根據舊 worktree 的 commit 與 remote dev 的 commit 比對結果，自動決定複用或重建
- 引入兩個追蹤變數：`WORKTREE_PATH`（實際路徑）、`REUSED`（是否複用）

**修改內容**：

1. **定義檔 `merge-to-deploy.md`**：
   - Step 2 改為「準備 dev worktree」，包含偵測 + 條件處理
   - Step 3~4 的路徑從硬編碼改為使用 `WORKTREE_PATH`
   - Step 5 清理邏輯改為條件式：`REUSED=false` 時才移除

2. **流程圖 `merge-to-deploy_flowchart.md`**：
   - 1.2 從「建立 dev worktree」改為「準備 dev worktree」
   - 新增偵測分支：無舊 worktree / commit 一致（複用）/ commit 不一致（重建）
   - 1.5 清理改為條件式

3. **新流程圖（Step 2 展開）**：

```
Step 2: 準備 dev worktree
│
├─ 2.0 偵測現有 dev worktree
│   └─ git worktree list | grep '\[dev\]'
│
├─ 無舊 worktree
│   ├─ WORKTREE_PATH = backend-nestjs-dev-merge
│   ├─ REUSED = false
│   └─ git worktree add {WORKTREE_PATH} dev
│
└─ 有舊 worktree（取得路徑 OLD_PATH）
    ├─ 比對 commit
    │   ├─ git -C {OLD_PATH} rev-parse HEAD
    │   └─ git rev-parse origin/dev（Step 1 已 fetch）
    │
    ├─ commit 一致 → 複用
    │   ├─ WORKTREE_PATH = OLD_PATH
    │   └─ REUSED = true
    │
    └─ commit 不一致 → 移除重建
        ├─ git worktree remove {OLD_PATH} --force
        ├─ WORKTREE_PATH = backend-nestjs-dev-merge
        ├─ REUSED = false
        └─ git worktree add {WORKTREE_PATH} dev
```

```
Step 5: 記錄 hash 並清理（條件式）
│
├─ git -C {WORKTREE_PATH} rev-parse --short HEAD
│
├─ REUSED = false → git worktree remove {WORKTREE_PATH} --force
└─ REUSED = true  → 保留（非本次建立，不移除）
```

**判斷邏輯表**：

| 情境 | 動作 | WORKTREE_PATH | REUSED | 結尾清理 |
|------|------|---------------|--------|----------|
| 無舊 worktree | 正常建立 | backend-nestjs-dev-merge | false | 移除 |
| 有舊 worktree，commit = remote | 複用 | 舊路徑（如 backend-nestjs-dev-read）| true | 保留 |
| 有舊 worktree，commit ≠ remote | 移除 + 重建 | backend-nestjs-dev-merge | false | 移除 |

**影響範圍**：
- `/merge-to-deploy`：Step 2 和 Step 5 邏輯變更
- `/merge-to-staging`：可考慮同步套用相同邏輯（未來）
- `/merge-to-dev`：可考慮同步套用相同邏輯（未來）

---

### 2026-03-10 設計變更：改為 merge ticket branch 到 dev（per-ticket branch 支援）

**需求背景**：

同事希望每張 Notion 票獨立一個 git branch，merge 進 dev 後 branch 保留在 GitHub。`/gcommit-push` 已負責建立/更新 ticket branch（cherry-pick），`/merge-to-deploy` 改為 merge 該 ticket branch 到 dev。

**設計決策**：

- merge-to-deploy 新增必要參數 `<ticket-number>`（Notion unique_id）
- 有 ticket-number → merge `ticket/{number}-*` branch 到 dev
- 無 ticket-number → 中止執行，提示用戶提供 ID

**參數變更**：

```
# 現有
/merge-to-deploy

# 新增（ticket-number 必填）
/merge-to-deploy <ticket-number>
```

**修改內容**：

#### 新增 Phase 0：參數檢查 + 決定 merge 來源

```
Phase 0: 參數檢查 + 決定 merge 來源
│
├─ 無 ticket-number
│   └─ ❌ 中止執行
│       └─ 提示：「⚠️ 請提供 Notion 票的數字 ID，例如：/merge-to-deploy 393」
│
└─ 有 ticket-number
    ├─ git branch -r --list "origin/ticket/{number}-*"
    ├─ 找到 → MERGE_SOURCE = origin/ticket/{number}-{slug}
    └─ 找不到 → 報錯：「ticket/{number}-* branch 不存在，請先執行 /gcommit-push」
```

#### Phase 1 修改：merge 來源改為 MERGE_SOURCE

```
# 現有
git -C {WORKTREE_PATH} merge --no-ff adminApi -m "Merge adminApi into dev"

# 改為
git -C {WORKTREE_PATH} merge --no-ff {MERGE_SOURCE} -m "Merge {MERGE_SOURCE} into dev"
```

#### 輸出格式變更

```
✅ Merge to Deploy 完成

| 目標分支 | 來源分支 | 狀態 | Commit |
|----------|----------|------|--------|
| dev      | ticket/393-informationSheet-print-fix | ✅ | abc1234 |

本地修改檔案：未受影響
🎫 Branch ticket/393-informationSheet-print-fix 已保留在 GitHub
```

**相容性影響**：

| 現有步驟 | 影響 | 說明 |
|---------|------|------|
| **新 Phase 0（參數檢查）** | ✅ 新增 | 無 ID 時中止，有 ID 時找 ticket branch |
| Phase 1 Step 1（fetch） | ⚠️ 小改 | 額外 fetch ticket branch |
| Phase 1 Step 2（worktree） | ❌ 無影響 | dev worktree 邏輯不變 |
| Phase 1 Step 3（config） | ❌ 無影響 | worktree 配置不變 |
| Phase 1 Step 4（merge） | ✅ 修改 | merge 來源改為 origin/{MERGE_SOURCE} |
| Phase 1 Step 5（清理） | ❌ 無影響 | worktree 清理邏輯不變 |

**實作狀態**：

- [x] 設計討論（2026-03-10）
- [x] 記錄到設計稿（2026-03-10）
- [ ] 更新 `merge-to-deploy.md` 定義檔
- [ ] 更新 `merge-to-deploy_flowchart.md` 流程圖
