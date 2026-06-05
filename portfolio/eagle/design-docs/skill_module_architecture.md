# Claude Code Skill + 模組架構說明

## 建立日期
2026-01-11

## 概述

本文件說明如何在 Claude Code 中使用 **Skill + 模組** 的架構，實現 prompt 的模組化與重複使用。

---

## 核心概念

### Skill 是什麼？

Skill 本質上是一個**預先包裝好的 Prompt**，存放在 `.claude/commands/` 目錄下。

```
用戶輸入: /skill-name
          ↓
Claude Code 讀取: .claude/commands/skill-name.md
          ↓
把檔案內容當作 prompt 注入對話
          ↓
AI 收到 prompt，開始執行
```

### 模組是什麼？

模組是**可重複使用的 prompt 片段**，透過 `@` 語法被 Skill 引用。

---

## `@` 語法說明

在 Claude Code 中，`@` 是**檔案引用**語法：

```markdown
@/path/to/file.md
```

當 AI 看到這個語法，會**自動讀取該檔案內容**並當作 prompt 的一部分處理。

### 範例

```markdown
請閱讀以下配置檔案：
- @/Users/nicholas/Desktop/Projects/backend-nestjs/CLAUDE.md
- @/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/settings.json
```

AI 會自動讀取這兩個檔案的內容。

---

## 檔案結構設計

### 建議的目錄結構

```
.claude/
├── commands/              ← Skill 檔案（用戶入口）
│   ├── debug-db.md
│   ├── debug-api.md
│   └── debug-full.md
│
└── modules/               ← 模組檔案（可重複使用的片段）
    ├── db-connect.md
    ├── get-token.md
    ├── api-test.md
    └── db-repl.md
```

### 命名規範

| 類型 | 位置 | 命名建議 |
|------|------|----------|
| Skill | `.claude/commands/` | `功能名稱.md`，如 `debug-db.md` |
| 模組 | `.claude/modules/` | `模組名稱.md`，如 `db-connect.md` |

---

## Skill 組織方式：子目錄命名空間

### 排序限制

⚠️ **重要**：Claude Code **沒有提供 Skill 排序機制**。

Frontmatter 不支援 `order`、`priority`、`sort` 等欄位。Skill 列表的順序由檔案系統決定（通常是字母順序）。

### 官方支援的組織方式：子目錄分組

當 Skill 數量增加時，使用**子目錄**來分類管理：

```
.claude/commands/
├── debug/                        ← 子目錄：debug 類
│   ├── db.md                     → /db (project:debug)
│   ├── api.md                    → /api (project:debug)
│   └── full.md                   → /full (project:debug)
│
├── review/                       ← 子目錄：review 類
│   ├── proposal.md               → /proposal (project:review)
│   ├── pr.md                     → /pr (project:review)
│   └── code.md                   → /code (project:review)
│
├── deploy/                       ← 子目錄：deploy 類
│   └── merge.md                  → /merge (project:deploy)
│
└── know-cc-config.md             → /know-cc-config (project)
```

### 子目錄的效果

| 特性 | 說明 |
|------|------|
| **命令名稱不變** | `/db` 不會變成 `/debug-db` |
| **描述顯示分類** | 會顯示 `(project:debug)` 標籤 |
| **允許同名命令** | `debug/test.md` 和 `review/test.md` 可以並存 |
| **輸入時可區分** | 輸入 `/test` 時會看到兩個選項，各自標註來源 |

### 建議的分類方式

```
.claude/commands/
├── debug/          # Debug 相關（DB 連線、Token、API 測試）
├── review/         # 審核相關（提案審核、PR Review、程式碼審核）
├── deploy/         # 部署相關（合併分支、發布）
├── dev/            # 開發相關（API 開發、測試）
└── config/         # 配置相關（讀取配置、同步設定）
```

### 完整範例：debug 子目錄

```
.claude/
├── commands/
│   └── debug/
│       ├── db.md           # /db (project:debug) - 連接 DB debug
│       ├── api.md          # /api (project:debug) - 取 Token + 打 API
│       └── full.md         # /full (project:debug) - 完整 debug 流程
│
└── modules/
    ├── db-connect.md
    ├── get-token.md
    ├── api-test.md
    └── db-repl.md
```

**使用方式**：

```
你：/db
AI：（執行 debug/db.md，顯示 project:debug 標籤）

你：/api
AI：（執行 debug/api.md，顯示 project:debug 標籤）
```

### 個人命令 vs 專案命令

```
~/.claude/commands/           ← 個人命令（所有專案可用）
├── my-util.md
└── personal/
    └── notes.md

/project/.claude/commands/    ← 專案命令（僅此專案可用）
├── debug/
│   └── db.md
└── review/
    └── proposal.md
```

**優先順序**：專案命令 > 個人命令（同名時專案版本優先）

---

## Skill 檔案格式

### 基本結構

```markdown
---
description: 簡短描述（會顯示在 skill 列表）
allowed-tools: 允許的工具（可選）
---

# Skill 標題

主要內容...
```

### Frontmatter 欄位說明

| 欄位 | 必填 | 說明 |
|------|------|------|
| `description` | 建議 | 簡短描述，幫助記憶用途 |
| `allowed-tools` | 可選 | 限制此 skill 可用的工具 |

### 範例：簡單型 Skill

```markdown
---
description: 讀取專案配置
---

請閱讀以下配置檔案並提供重點摘要：
- @/path/to/CLAUDE.md
- @/path/to/settings.json
```

### 範例：步驟型 Skill

```markdown
---
description: 合併分支到 dev 和 staging
allowed-tools: Bash(git:*)
---

# Merge to Deploy

## 執行步驟

### Phase 1: Merge to dev
1. 取得最新遠端分支
   ```bash
   git fetch origin dev
   ```
2. 建立 worktree 並執行 merge
   ...
```

---

## 模組檔案格式

模組檔案是純 Markdown，不需要 frontmatter。

### 範例：`db-connect.md`

```markdown
## 資料庫連線

### 切換到 Staging DB

```bash
./scripts/db-tunnel.sh staging all
```

### 切換到 Dev DB

```bash
./scripts/db-tunnel.sh dev all
```

### 切回 Local DB

```bash
./scripts/db-tunnel.sh local
```
```

### 範例：`get-token.md`

```markdown
## 取得 Dashboard Token

### 使用腳本取得 Token

```bash
# 本地環境
./.claude/scripts/get-token.sh local

# Staging 環境
./.claude/scripts/get-token.sh staging

# Dev 環境
./.claude/scripts/get-token.sh dev
```

Token 會自動儲存到 `/tmp/dashboard_token.txt`
```

---

## 組合模組的方式

### 方式一：直接引用

```markdown
---
description: 連接 DB debug
---

# Debug DB 流程

@.claude/modules/db-connect.md

@.claude/modules/db-repl.md
```

### 方式二：加上章節標題

```markdown
---
description: 完整 debug 流程
---

# 完整 Debug 流程

## Step 1: 連接資料庫
@.claude/modules/db-connect.md

## Step 2: 取得 Token
@.claude/modules/get-token.md

## Step 3: 測試 API
@.claude/modules/api-test.md
```

### 方式三：加上額外說明

```markdown
---
description: Debug API 流程
---

# Debug API

請依照以下步驟執行，每完成一步請回報狀態。

## Step 1: 取得 Token
@.claude/modules/get-token.md

確認 Token 已儲存後，繼續下一步。

## Step 2: 測試 API
@.claude/modules/api-test.md

請測試 `/estate-listings` 端點並回報結果。
```

---

## 組合範例

### 視覺化架構

```
模組層（可重複使用）
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ db-connect  │ │ get-token   │ │ api-test    │ │ db-repl     │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
       │              │               │               │
       └──────────────┼───────────────┼───────────────┘
                      │               │
Skill 層（組合入口）    │               │
┌─────────────────────┴───────────────┴─────────────────────┐
│  /debug-db     = db-connect + db-repl                     │
│  /debug-api    = get-token + api-test                     │
│  /debug-full   = db-connect + get-token + api-test + repl │
└───────────────────────────────────────────────────────────┘
```

### 實際組合範例

| Skill | 組合的模組 | 用途 |
|-------|-----------|------|
| `/debug-db` | db-connect + db-repl | 只需要查 DB |
| `/debug-api` | get-token + api-test | 只需要打 API |
| `/debug-full` | 全部四個模組 | 完整 debug 流程 |

---

## 進階應用：人工介入審核流程

### 使用場景

許多工作流程需要「人工介入審核」，例如：

```
流程 A：研究 → 寫提案文件
         ↓
流程 B：檢查文件 → 報告哪邊要改
         ↓
    [等待用戶確認] ← 人工介入點
         ↓
      用戶說 OK
         ↓
    AI 更新文件
         ↓
    回到流程 B（循環檢查）
```

### 核心問題：如何讓 AI「等待確認」？

Claude Code 的對話本身就是互動式的。AI 回覆後，自然會停下來等待用戶的下一個輸入。

因此，「等待確認」**不需要特別的技術機制**，只需要在 **prompt 中明確指示 AI 的行為**。

### 實現方式：在 Skill 中加入暫停指示

```markdown
## 檢查完成後的行為

請列出所有需要修改的項目，格式如下：

| # | 問題 | 建議修改 |
|---|------|----------|
| 1 | ...  | ...      |

⚠️ **重要：報告完畢後，請等待用戶確認。**
- 不要自行修改文件
- 等用戶說「OK」或「請修改」後再執行
- 如果用戶有異議，根據反饋調整建議
```

### 設計方案：拆成獨立 Skill + 重複執行

將流程拆成兩個獨立的 Skill，由用戶手動控制執行節奏：

```
/proposal-write    → 執行流程 A（研究 + 寫提案）
/proposal-review   → 執行流程 B（檢查 + 報告 + 等待確認）
```

**實際使用流程**：

```
你：/proposal-write
AI：（研究 + 寫完提案）

你：/proposal-review
AI：（檢查 + 報告問題，等待確認）

你：OK，改第 1、3 項
AI：（修改完成）

你：/proposal-review        ← 重複執行檢查
AI：（再次檢查 + 報告）

你：OK，改第 2 項
AI：（修改完成）

你：/proposal-review        ← 再次執行
AI：檢查完成，沒有問題了 ✅
```

### 架構設計

```
模組層
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  research   │ │   write     │ │   check     │ │   report    │
│  研究模組   │ │  撰寫模組   │ │  檢查模組   │ │  報告模組   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
       │              │               │               │
       └──────┬───────┘               └───────┬───────┘
              │                               │
Skill 層      │                               │
┌─────────────┴─────────────┐   ┌─────────────┴─────────────┐
│    /proposal-write        │   │    /proposal-review       │
│    = research + write     │   │    = check + report       │
│                           │   │    + 等待確認指示         │
└───────────────────────────┘   └───────────────────────────┘
```

### 範例：`/proposal-review` Skill

```markdown
---
description: 檢查提案文件並報告需要修改的項目
---

# 提案審核

## Step 1: 檢查文件
@.claude/modules/check-proposal.md

## Step 2: 報告問題
@.claude/modules/report-format.md

## Step 3: ⏸️ 等待用戶確認

請列出所有需要修改的項目後，**停止並等待用戶指示**：

| 用戶回應 | AI 行為 |
|----------|---------|
| 「OK」或「請修改」 | 執行修改 |
| 「不用改第 X 項」 | 跳過該項，執行其他修改 |
| 「重新檢查」 | 不修改，重新執行檢查 |
| 「完成」 | 結束審核流程 |

⚠️ **絕對不要自行決定修改，必須等待用戶確認。**
```

### 模組可進一步細分

如果有不同類型的提案，檢查模組可以再細分：

```
modules/
├── check-api.md        # API 相關的檢查規則
├── check-refactor.md   # 重構相關的檢查規則
├── check-bugfix.md     # Bug 修復的檢查規則
└── report-format.md    # 統一的報告格式

commands/
├── review-api.md       = check-api + report-format + 等待確認
├── review-refactor.md  = check-refactor + report-format + 等待確認
└── review-bugfix.md    = check-bugfix + report-format + 等待確認
```

### 這種設計的優點

| 優點 | 說明 |
|------|------|
| **模組重用** | check、report 模組可以用在不同的 review skill |
| **流程清晰** | 一個 skill 做一件事，用戶完全掌控節奏 |
| **人工把關** | AI 不會自作主張，每次修改都經過確認 |
| **彈性循環** | 想檢查幾次就執行幾次 `/proposal-review` |
| **不需複雜機制** | 沒有自動循環 Hook，單純靠用戶決定 |

### 與自動化循環的差異

```
❌ 自動化循環（Skill 無法做到）
/review-loop → 檢查 → 修改 → 自動再檢查 → 修改 → ... → 完成

✅ 手動控制循環（Skill 可以做到）
/review → 檢查 → 報告 → [等用戶]
                            ↓
                    用戶：OK，修改
                            ↓
/review → 再次檢查 → 報告 → [等用戶]
                            ↓
                    用戶：完成
```

如果需要完全自動化的循環，則需要使用 **Agent SDK**。

---

## Skill vs Agent 比較

| 功能 | Skill + 模組 | Agent SDK |
|------|--------------|-----------|
| 組合步驟 | ✅ 用 `@` 引用 | ✅ 程式碼控制 |
| 條件判斷 | ❌ 無法 | ✅ if/else |
| 循環執行 | ❌ 無法 | ✅ loop |
| 動態參數 | ⚠️ 有限（$ARGUMENTS） | ✅ 完全控制 |
| 複雜度 | 低（只是 markdown） | 高（需要寫程式） |
| 適用場景 | 固定流程的快捷操作 | 複雜邏輯、動態決策 |

### 何時用 Skill + 模組？

- 步驟是固定的、線性的
- 不需要條件判斷
- 只是想省去重複貼 prompt 的麻煩

### 何時用 Agent？

- 需要根據結果決定下一步
- 需要循環執行直到成功
- 需要複雜的錯誤處理

---

## 使用限制

### `@` 語法的限制

1. **無法動態決定路徑**：路徑必須是寫死的
2. **無法條件引用**：不能「如果 A 則引用 X，否則引用 Y」
3. **順序是固定的**：無法根據執行結果改變順序

### Skill 間無法互相調用

```
❌ 不支援
Skill A 執行中 → 調用 Skill B → 返回 Skill A
```

Skill 之間沒有原生的調用機制，只能透過模組來共享內容。

---

## 最佳實踐

### 1. 模組保持單一職責

```
✅ 好的設計
├── db-connect.md     # 只負責 DB 連線
├── get-token.md      # 只負責取 Token
└── api-test.md       # 只負責測試 API

❌ 不好的設計
├── db-and-token.md   # 混合太多功能
└── everything.md     # 全部塞一起
```

### 2. 模組可以獨立使用

每個模組應該是完整的，即使不透過 Skill 也能直接讓 AI 讀取使用。

### 3. Skill 負責組合與流程說明

Skill 的價值在於：
- 決定使用哪些模組
- 定義執行順序
- 加上流程說明和額外指示

### 4. 善用 description

```markdown
---
description: 連接 Staging/Dev DB 進行資料查詢（不含 API 測試）
---
```

好的 description 幫助你快速記起這個 skill 是做什麼的。

---

## 相關檔案

- 現有 Skill 範例：
  - `/backend-nestjs/.claude/commands/merge-to-deploy.md`
  - `/backend-nestjs/.claude/commands/know-cc-config.md`
- Debug 教學文件：
  - `/prompts/4_diary/debug/curl_get_dashboard_token.md`

---

## 參考資料

- Claude Code 官方文件
- `/prompts/4_diary/debug/proposal/slash folder/slash-command-subcommands-研究筆記.md`
