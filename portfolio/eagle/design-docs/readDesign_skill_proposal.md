# Skill 設計稿出處標註修復提案

> 📅 建立日期：2026-01-24

---

## 設計原則：design-doc 不會被自動讀取

### Claude Code 的自動讀取機制

**會自動讀取**（使用 `@` 前綴）：
```markdown
@/Users/nicholas/Desktop/Projects/.claude/modules/review-proposal-rules.md
```

**不會自動讀取**（純文字路徑）：
```yaml
---
design-doc: prompts/4_diary/debug/proposal/slash/findDoc_skill_proposal.md
---
```

### 結論

- Frontmatter 裡的欄位只是元資料
- Claude Code 只會解析特定欄位（`description`、`argument-hint`、`allowed-tools`）
- 其他欄位（如 `design-doc`）會被忽略，不會觸發自動讀取
- 只有在用戶明確說「讀設計稿」或執行 `/readDesign [skill-name]` 時，AI 才會去解析這個欄位並讀取對應檔案

---

## 問題描述

目前所有 skill 定義檔案都沒有標註其對應的設計稿來源（`_skill_proposal.md`），導致：
- 難以追溯 skill 的設計決策
- 修改 skill 時不知道要同步更新哪份設計稿
- 新人難以理解 skill 的設計背景

## 修改範圍

### 有對應設計稿的 Skills（7 個）

| Skill 檔案 | 對應設計稿 |
|------------|-----------|
| `findDoc.md` | `findDoc_skill_proposal.md` |
| `merge-to-deploy.md` | `merge-to-deploy_skill_proposal.md` |
| `gcommit-push.md` | `gcommit-push_skill_proposal.md` |
| `know-cc-config.md` | `know-cc-config_skill_proposal.md` |
| `reviewDoc.md` | `review_skill_proposal.md` |
| `implement.md` | `implement_skill_proposal.md` |
| `debugP.md` | `debugP_skill_proposal.md` |

### 無對應設計稿的 Skills（4 個）

| Skill 檔案 | 狀態 |
|------------|------|
| `guideArchitecture.md` | 無設計稿 |
| `exportN.md` | 無設計稿 |
| `check-result.md` | 無設計稿 |
| `pull-frontend.md` | 無設計稿 |

### 不需要處理

| Skill 檔案 | 原因 |
|------------|------|
| `guideA.md` | 僅為 `guideArchitecture` 的別名 |

---

## 修改方式

在每個 skill 的 frontmatter 區塊新增 `design-doc` 欄位：

```yaml
---
description: 快速查找 Notion 票討論進度和技術文件
argument-hint: <關鍵字或URL>
design-doc: prompts/4_diary/debug/proposal/slash/findDoc_skill_proposal.md
---
```

### 欄位說明

- **design-doc**：相對於 Projects 目錄的設計稿路徑
- 若無對應設計稿，不加此欄位

---

## 後端修改清單

### 1. findDoc.md

**檔案路徑**: `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/findDoc.md`

**現有 frontmatter**:
```yaml
---
description: 快速查找 Notion 票討論進度和技術文件
argument-hint: <關鍵字或URL>
---
```

**修改為**:
```yaml
---
description: 快速查找 Notion 票討論進度和技術文件
argument-hint: <關鍵字或URL>
design-doc: prompts/4_diary/debug/proposal/slash/findDoc_skill_proposal.md
---
```

---

### 2. merge-to-deploy.md

**檔案路徑**: `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/merge-to-deploy.md`

**現有 frontmatter**:
```yaml
---
description: 【backend-nestjs 專用】將 adminApi 分支合併到 dev 和 staging 並推送到 GitHub
allowed-tools: Bash(git:*), Bash(./.claude/scripts/*:*), Bash(/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/*:*)
---
```

**修改為**:
```yaml
---
description: 【backend-nestjs 專用】將 adminApi 分支合併到 dev 和 staging 並推送到 GitHub
allowed-tools: Bash(git:*), Bash(./.claude/scripts/*:*), Bash(/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/*:*)
design-doc: prompts/4_diary/debug/proposal/slash/merge-to-deploy_skill_proposal.md
---
```

---

### 3. gcommit-push.md

**檔案路徑**: `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/gcommit-push.md`

**現有 frontmatter**:
```yaml
---
description: 完成實作後，更新提案文件並 commit
argument-hint: <proposal-path>
---
```

**修改為**:
```yaml
---
description: 完成實作後，更新提案文件並 commit
argument-hint: <proposal-path>
design-doc: prompts/4_diary/debug/proposal/slash/gcommit-push_skill_proposal.md
---
```

---

### 4. know-cc-config.md

**檔案路徑**: `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/know-cc-config.md`

**現有 frontmatter**:
```yaml
---
description: 讀取 Projects、backend-nestjs、prompts 專案的 Claude Code 配置
---
```

**修改為**:
```yaml
---
description: 讀取 Projects、backend-nestjs、prompts 專案的 Claude Code 配置
design-doc: prompts/4_diary/debug/proposal/slash/know-cc-config_skill_proposal.md
---
```

---

### 5. reviewDoc.md

**檔案路徑**: `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/reviewDoc.md`

**現有 frontmatter**:
```yaml
---
description: 檢核提案文件（預設 normal，之後支援 p=permission, f=file）
argument-hint: [again]
---
```

**修改為**:
```yaml
---
description: 檢核提案文件（預設 normal，之後支援 p=permission, f=file）
argument-hint: [again]
design-doc: prompts/4_diary/debug/proposal/slash/review_skill_proposal.md
---
```

---

### 6. implement.md

**檔案路徑**: `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/implement.md`

**現有 frontmatter**:
```yaml
---
description: 依照提案文件實作程式碼（自動檢核 + build 驗證）
---
```

**修改為**:
```yaml
---
description: 依照提案文件實作程式碼（自動檢核 + build 驗證）
design-doc: prompts/4_diary/debug/proposal/slash/implement_skill_proposal.md
---
```

---

### 7. debugP.md

**檔案路徑**: `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/debugP.md`

**現有 frontmatter**:
```yaml
---
description: Debug ticket（連 db + 分析專案）
argument-hint: <env> <ticket-path>
---
```

**修改為**:
```yaml
---
description: Debug ticket（連 db + 分析專案）
argument-hint: <env> <ticket-path>
design-doc: prompts/4_diary/debug/proposal/slash/debugP_skill_proposal.md
---
```

---

## 驗證方式

修改完成後，執行以下指令確認所有有設計稿的 skill 都有標註：

```bash
# 檢查哪些 skill 有 design-doc 欄位
rg "design-doc:" /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/
```

預期結果：應顯示 7 個檔案

---

## 後續建議

對於目前沒有設計稿的 4 個 skill，可考慮：

1. **補建設計稿**（如果 skill 複雜度高）
2. **在 skill 內加入設計說明區塊**（如果 skill 簡單）

| Skill | 建議 |
|-------|------|
| `guideArchitecture` | 補建設計稿（架構知識載入邏輯複雜） |
| `exportN` | 補建設計稿（Notion 整合邏輯複雜） |
| `check-result` | 內嵌說明即可（流程簡單） |
| `pull-frontend` | 內嵌說明即可（流程簡單） |

---

## Skill 與設計稿比對結果

### ✅ 高度匹配（6 個）

| Skill | 設計稿 | 比對結果 |
|-------|--------|----------|
| **findDoc** | findDoc_skill_proposal.md | ✅ 兩階段搜尋、URL/關鍵字判斷、rg 跳脫處理皆一致 |
| **reviewDoc** | review_skill_proposal.md | ✅ again 參數、複雜 API 判斷、防止過早實作機制皆一致 |
| **gcommit-push** | gcommit-push_skill_proposal.md | ✅ 驗證邏輯、commit message 格式、前端摘要、罐頭留言皆一致 |
| **debug** | debug_skill_proposal.md | ✅ 模組引用、歷史文件驗證、DB 連線規則皆一致 |
| **implement** | implement_skill_proposal.md | ✅ 模組引用、執行環境、任務流程皆一致 |
| **merge-to-deploy** | merge-to-deploy_skill_proposal.md | ✅ Git worktree 流程、setup-worktree-config 調用一致 |

### ⚠️ 部分匹配（1 個）

| Skill | 設計稿 | 差異說明 |
|-------|--------|----------|
| **know-cc-config** | know-cc-config_skill_proposal.md | 設計稿只讀 backend-nestjs 配置，實際 skill 讀取 3 個專案（Projects、backend-nestjs、prompts）。**建議：更新設計稿以反映當前實作** |

### 📋 差異細節

#### merge-to-deploy 差異

| 項目 | 設計稿 | 實際 Skill |
|------|--------|-----------|
| `/continue-merge` (conflict 處理) | 有設計 | ❌ 未實作 |
| 共用 Shell Script 方案 | 有提議 | ❌ 未採用，直接在 skill 列出步驟 |

#### implement 差異

| 項目 | 設計稿 | 實際 Skill |
|------|--------|-----------|
| 雙重檢核步驟 | 有但不明確 | ✅ 明確定義 |
| 更新提案文件步驟 | 無 | ✅ 有實作 |
| 提醒後續步驟 | 無 | ✅ 有實作（/check-result, /gcommit-push）|

#### debug 差異

| 項目 | 設計稿 | 實際 Skill |
|------|--------|-----------|
| frontPage_api 條件判斷 | 無 | ✅ 有實作 |
| 500 錯誤條件判斷 | 有 | ✅ 有實作 |

---

## 新增 Skill：/readDesign

### 目的

提供一個入口讓用戶可以：
1. 了解整體 skill 架構
2. 快速讀取特定 skill 的設計稿

### 配置結構說明

```
/Users/nicholas/Desktop/Projects/          ← Claude Code 啟動目錄
├── .claude/
│   └── commands/ → symlink 到 backend-nestjs/.claude/commands/
│
├── backend-nestjs/
│   └── .claude/commands/                  ← Skill 定義（含 design-doc 欄位）
│       ├── findDoc.md
│       ├── debug.md
│       ├── readDesign.md                  ← 新增
│       └── ...
│
└── prompts/
    └── 4_diary/debug/proposal/slash/      ← 設計稿
        ├── findDoc_skill_proposal.md
        ├── debug_skill_proposal.md
        └── ...
```

### 使用方式

| 指令 | 功能 |
|------|------|
| `/readDesign` | 顯示 skill 設計規則 |
| `/readDesign findDoc` | 讀取 findDoc 的定義檔 + 流程圖，記住設計稿路徑 |
| `/readDesign debug` | 讀取 debug 的定義檔 + 流程圖，記住設計稿路徑 |

### Skill 定義檔

**檔案位置**: `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/readDesign.md`

```markdown
---
description: 查看 skill 設計規則或讀取特定 skill 的設計稿
argument-hint: [skill-name]
design-doc: prompts/4_diary/debug/proposal/slash/readDesign_skill_proposal.md
---

## 參數

- `$1`：可選，skill 名稱（如 findDoc、debug）

## 任務

### 無參數模式

顯示以下 Skill 設計規則：

#### 執行環境
- **Claude Code 啟動目錄**: `/Users/nicholas/Desktop/Projects/`
- AI 執行所有 skill 時都是從 Projects 目錄開始
- 設計 skill 時，路徑規劃必須以此為基準

#### 檔案位置規範
| 類型 | 位置 |
|------|------|
| Skill 定義 | `backend-nestjs/.claude/commands/*.md` |
| 設計稿 | `prompts/4_diary/debug/proposal/slash/*_skill_proposal.md` |
| Symlink | `Projects/.claude/commands/` → `backend-nestjs/.claude/commands/` |

#### 名詞對照
| 名詞 | 說明 | 範例 |
|------|------|------|
| **定義** | skill 本身，AI 執行的檔案 | `findDoc.md` |
| **設計稿** | skill 的設計文件，記錄在 `design-doc` | `findDoc_skill_proposal.md` |

#### 開發流程規範
1. **設計稿優先**：所有 skill 必須先有設計稿，才能開始實作
2. **設計稿命名**：`{skill_name}_skill_proposal.md`
3. **設計稿審核**：設計稿需經過用戶確認後才能實作
4. **design-doc 標註**：實作完成後，在 skill frontmatter 加上 `design-doc` 欄位

#### design-doc 欄位規範

**用途**：標註 skill 對應的設計稿路徑，供 `/readDesign [skill-name]` 查詢

**格式**：
```yaml
---
description: skill 說明
argument-hint: <參數>
design-doc: prompts/4_diary/debug/proposal/slash/{設計稿檔名}
---
```

**設計原則**：
- 使用相對於 Projects 目錄的路徑
- 純文字路徑，不加 `@` 前綴（不會自動讀取）
- AI 只在用戶執行 `/readDesign [skill-name]` 時才讀取設計稿

最後提示：`💡 執行 /readDesign [skill-name] 讀取特定設計稿`

### 有參數模式（$1 = skill-name）

1. 讀取定義檔：`backend-nestjs/.claude/commands/{skill-name}.md`
2. 讀取流程圖：`backend-nestjs/.claude/flowcharts/{skill-name}_flowchart.md`（如存在）
3. 從 frontmatter 提取 `design-doc` 路徑（記住但不讀取）
4. 顯示定義檔結構 + 流程圖內容
5. 有 design-doc → 提示：`📄 設計稿位於：{路徑}`
6. 無 design-doc → 提示：`❌ {skill-name} 沒有對應的設計稿`

> 💡 設計稿不主動讀取。當用戶表達修改意圖時，AI 自動讀取設計稿進入修改流程。
```

### 無參數時的輸出格式

```markdown
# 📐 Skill 設計規則

## 執行環境

- **Claude Code 啟動目錄**: `/Users/nicholas/Desktop/Projects/`
- AI 執行所有 skill 時都是從 Projects 目錄開始
- 設計 skill 時，路徑規劃必須以此為基準

## 檔案位置規範

| 類型 | 位置 | 說明 |
|------|------|------|
| **Skill 定義** | `backend-nestjs/.claude/commands/*.md` | AI 執行的 skill 檔案 |
| **設計稿** | `prompts/4_diary/debug/proposal/slash/*_skill_proposal.md` | skill 的設計文件 |
| **Symlink** | `Projects/.claude/commands/` → `backend-nestjs/.claude/commands/` | 讓 Projects 可以執行 skill |

### 名詞對照

| 名詞 | 說明 | 範例 |
|------|------|------|
| **定義** | skill 本身，AI 會讀取並執行的檔案 | `findDoc.md`, `debug.md` |
| **設計稿** | skill 的設計規劃文件，記錄在 `design-doc` 欄位 | `findDoc_skill_proposal.md` |

## 開發流程規範

1. **設計稿優先**：所有 skill 必須先有設計稿，才能開始實作
2. **設計稿命名**：`{skill_name}_skill_proposal.md`
3. **設計稿審核**：設計稿需經過用戶確認後才能實作
4. **design-doc 標註**：實作完成後，在 skill frontmatter 加上 `design-doc` 欄位

## design-doc 欄位規範

**用途**：標註 skill 對應的設計稿路徑，供 `/readDesign [skill-name]` 查詢

**格式**：
```yaml
design-doc: prompts/4_diary/debug/proposal/slash/{設計稿檔名}
```

**設計原則**：
- 使用相對於 Projects 目錄的路徑
- 純文字路徑，不加 `@` 前綴（不會自動讀取）
- AI 只在用戶執行 `/readDesign [skill-name]` 時才讀取設計稿

💡 執行 `/readDesign [skill-name]` 讀取特定 skill 的設計稿
```

---

## 實作計畫

### Phase 1：為現有 skill 加上 design-doc 欄位

1. 修改 7 個 skill 的 frontmatter（加上 design-doc）
2. 執行驗證指令確認

### Phase 2：建立 /readDesign skill

1. 建立 `readDesign.md`
2. 測試無參數模式
3. 測試有參數模式

---

## 設計更新記錄

### 2026-01-25：加入流程圖要求與設計稿模板

#### 用戶需求與理由

> 假如我們之後要設計一個新的 skill 或是為已有的 skill 增加功能，應該要要求 AI 在討論階段，需要附上文字流程圖。然後這設計被 approve 後，會先紀錄到他的設計稿，包括該設計的文字流程圖。

**核心理由**：
- 討論階段就要有流程圖，讓設計更具體、更容易審核
- Approve 後的設計要完整記錄到設計稿，包含流程圖
- 確保設計決策可追溯

#### 實際修改

**1. 更新 `/readDesign` skill 定義檔**

新增內容：
- 開發流程規範加入「討論階段必須附流程圖」
- 新增「設計稿標準結構」區塊（5 個必要區塊）
- 新增「文字流程圖格式」區塊（有序樹狀格式範例 + 禁止格式）
- 加入模板參考連結

**2. 建立設計稿模板**

**檔案**: `prompts/4_diary/debug/proposal/slash/_skill_proposal_template.md`

**模板結構**:
1. 問題描述
2. 執行流程圖（有序樹狀格式）
3. 參數說明
4. 輸出格式
5. 實作細節
6. Skill 定義檔範例

#### 決策：現有設計稿不需補流程圖

用戶確認：現有設計稿不需要回頭補流程圖，之後新的設計再依循新規範即可。

#### 新的 Skill 設計流程

```
新 Skill 設計流程
│
├─ 1. 【討論階段】
│   ├─ 說明問題與需求
│   └─ AI 必須附上文字流程圖
│
├─ 2. 【審核階段】
│   ├─ 用戶確認設計
│   └─ Approve 後記錄到設計稿
│
├─ 3. 【實作階段】
│   ├─ 依設計稿建立 skill 定義檔
│   └─ 加上 design-doc 欄位
│
└─ 4. 【完成】
    └─ skill 與設計稿雙向連結
```

#### 修改現有 Skill 流程

```
修改現有 Skill 流程
│
├─ 1. 【討論階段】
│   ├─ 說明變更需求
│   └─ AI 提出設計方案（含流程圖）
│
├─ 2. 【審核階段】
│   └─ 用戶確認設計變更
│
├─ 3. 【更新設計稿】 ← 必須先做
│   ├─ 記錄設計決策到 *_skill_proposal.md
│   └─ ⛔ 禁止 commit（設計稿的 commit 只能由 /updateDesign 執行）
│
└─ 4. 【執行 /updateDesign】 ← 統一同步
    ├─ 從未 commit 的設計稿偵測變更
    ├─ 同步更新定義檔 + 流程圖
    └─ 統一 commit 設計稿（Step 8）
```

> ⚠️ **重要**：設計稿（`*_skill_proposal.md`）的 commit 只能由 `/updateDesign` Step 8 執行，禁止在其他時機手動 commit。

---

### 2026-01-25：新增定義檔結構規範

#### 問題發現

檢查 `/debugP` 定義檔是否符合設計規則時，發現：
- 設計稿有流程圖要求
- 但定義檔沒有明確的結構規範
- `/debugP` 只有數字列表，缺少整體架構視圖

#### 討論結論

採用 A+B 組合方案：
- **A（數字列表）**：詳細的執行步驟，AI 容易解析
- **B（樹狀流程圖）**：整體架構一目了然，條件分支清楚

兩者互補，讓 AI：
1. **先看流程圖**：快速理解整體架構、條件分支、優先級
2. **再看任務列表**：知道每一步的具體細節

#### 新增規範

在 readDesign 定義檔中新增「定義檔結構規範」區塊：

```markdown
#### 定義檔結構規範

定義檔建議包含以下區塊（順序）：

1. **Frontmatter** - description、argument-hint、design-doc
2. **模組引用** - `@` 引用需要的模組
3. **參數** - 說明 $1, $2 等參數用途
4. **執行流程** - 樹狀流程圖（整體架構、條件分支）
5. **任務** - 數字列表（詳細執行步驟）

> 💡 **設計經驗**：流程圖讓 AI 一眼看到整體架構，數字列表提供詳細步驟，兩者互補比單獨使用更易理解。
```

#### 實作狀態

- ✅ 更新 readDesign 定義檔（2026-01-25）
- ✅ 更新 readDesign 設計稿（2026-01-25）
- ✅ `/debugP` 已依此規範調整（作為首個範例）

---

### 2026-01-31：流程圖獨立檔案架構

#### 問題發現

隨著 skill 演算法越來越複雜（如 debug、check-result），定義檔出現以下問題：

| Skill | 定義檔行數 | 流程圖佔比 | 問題 |
|-------|-----------|-----------|------|
| debug.md | 245 行 | ~85 行 (35%) | 定義檔過長 |
| check-result.md | 410 行 | ~85 行 (21%) | 維護困難 |

**核心問題**：
- 定義檔過長，AI 載入成本高
- 流程圖與執行步驟混雜，維護時容易改錯
- 修改演算法時要同時更新多處

#### 設計決策

**採用「執行層分離」架構**：

```
Skill 文件架構
│
├─ 【執行層】AI 執行 skill 時載入
│   ├─ 定義檔：commands/{skill}.md
│   │   └─ frontmatter + 模組引用 + 參數 + 任務步驟
│   │
│   └─ 流程圖：flowcharts/{skill}_flowchart.md 【新增】
│       └─ 完整執行流程 + 條件分支 + Task 表格
│
└─ 【設計層】人類參考 / 設計討論
    └─ 設計稿：*_skill_proposal.md
        └─ 問題背景 + 設計決策 + 歷史記錄
        └─ 裡面的流程圖是「提案」，不是執行用的
```

**檔案位置**：流程圖放在獨立的 flowcharts 目錄（避免被識別為 skill）

```
backend-nestjs/.claude/
├─ commands/
│   ├─ debug.md                # 定義檔
│   ├─ check-result.md         # 定義檔
│   ├─ findDoc.md              # 定義檔
│   └─ ...
│
└─ flowcharts/                 # 流程圖目錄
    ├─ debug_flowchart.md      # 流程圖
    ├─ check-result_flowchart.md
    └─ ...
```

**命名規則**：

| 類型 | 命名格式 | 範例 |
|------|----------|------|
| 定義檔 | `{skill}.md` | `debug.md` |
| 流程圖 | `{skill}_flowchart.md` | `debug_flowchart.md` |

**定義檔引用方式**：

```markdown
---
description: Debug ticket（連 db + 分析專案）
design-doc: prompts/.../debugP_skill_proposal.md
---

@.claude/flowcharts/debugP_flowchart.md

@.claude/modules/debug-output-rules.md
...
```

#### 檔案關係表

| 檔案 | 用途 | AI 執行時載入 |
|------|------|--------------|
| `commands/{skill}.md` | 定義檔 | ✅ 必載入 |
| `commands/{skill}_flowchart.md` | 流程圖 | ✅ 透過 @ 引用載入 |
| `*_skill_proposal.md` | 設計稿 | ❌ 只有 /readDesign 時才讀 |

#### /readDesign 更新

新增 `flowchart` 參數支援：

| 指令 | 功能 |
|------|------|
| `/readDesign` | 顯示 skill 設計規則 |
| `/readDesign {skill}` | 讀取設計稿摘要 |
| `/readDesign {skill} flowchart` | 讀取流程圖 【新增】|

#### 適用範圍

- **需要獨立流程圖**：複雜 skill（debug、check-result、implement）
- **不需要獨立流程圖**：簡單 skill（findDoc、guideA、merge-to-deploy）

#### 實作狀態

- ✅ 更新 readDesign 設計稿（2026-01-31）
- ✅ 更新 readDesign 定義檔（2026-01-31）
- ⏳ 建立 debug_flowchart.md（首個範例）
- ⏳ 建立 check-result_flowchart.md

---

### 2026-02-08：修改流程規範補充 commit 時機與 /updateDesign 銜接

#### 問題發現

AI 在修改 skill 設計稿後，經常直接 commit 設計稿，導致 `/updateDesign` 的 Step 1 無法透過 `git status` 偵測到未 commit 的設計稿變更。

**根因**：「修改現有 Skill 流程」只說了「先更新設計稿，再更新定義檔」，但沒有：
1. 明確禁止在 `/updateDesign` 之前 commit 設計稿
2. 說明步驟 4 應該用 `/updateDesign` 來統一同步

**影響**：
- `/updateDesign` Step 1 的「檢查未 commit 設計稿」機制失效
- AI 把設計稿 commit 後，定義檔和流程圖還沒同步，造成三份文件不一致

#### 設計決策

在「修改現有 Skill 流程」加入兩條規則：
1. 步驟 3 更新設計稿後，**禁止 commit**（設計稿的 commit 只能由 `/updateDesign` Step 8 執行）
2. 步驟 4 改為「執行 `/updateDesign` 同步更新定義檔、流程圖，並由 `/updateDesign` 統一 commit 設計稿」

#### 更新後的流程

```
修改現有 Skill 流程
│
├─ 1. 【討論階段】
│   ├─ 說明變更需求
│   └─ AI 提出設計方案（含流程圖）
│
├─ 2. 【審核階段】
│   └─ 用戶確認設計變更
│
├─ 3. 【更新設計稿】 ← 必須先做
│   ├─ 記錄設計決策到 *_skill_proposal.md
│   └─ ⛔ 禁止 commit（設計稿的 commit 只能由 /updateDesign 執行）
│
└─ 4. 【執行 /updateDesign】 ← 統一同步
    ├─ 從未 commit 的設計稿偵測變更
    ├─ 同步更新定義檔 + 流程圖
    └─ 統一 commit 設計稿（Step 8）
```

> ⚠️ **重要**：設計稿（`*_skill_proposal.md`）的 commit 只能由 `/updateDesign` Step 8 執行，禁止在其他時機手動 commit。

#### 需要同步更新的位置

| 位置 | 內容 |
|------|------|
| readDesign 定義檔「修改流程規範」 | 加入 commit 禁止規則 + /updateDesign 銜接 |
| readDesign 設計稿「修改現有 Skill 流程」（本區塊上方） | 同步更新流程圖 |

#### 實作狀態

- [x] 更新 readDesign 設計稿（2026-02-08）
- [ ] 更新 readDesign 定義檔：同步修改流程規範

---

### 2026-02-13：有參數模式改為讀定義檔 + 流程圖，設計稿延遲讀取

#### 問題發現

`/readDesign {skill}` 原本直接讀設計稿並顯示摘要，但實際使用場景是：
1. 用戶先 `/readDesign {skill}` 了解 skill 現況
2. 提出修改需求
3. AI 需要讀設計稿來記錄新設計

**問題**：
- 步驟 1 只需要看定義檔和流程圖，不需要讀設計稿
- 設計稿通常很長（readDesign 的設計稿就有 790+ 行），提前讀取浪費 context
- 設計稿只在「要改 skill」時才需要，不是每次查看都需要

#### 設計決策

**改版前**：

| 指令 | 行為 |
|------|------|
| `/readDesign {skill}` | 讀設計稿 → 顯示摘要 |
| `/readDesign {skill} flowchart` | 讀流程圖 |

**改版後**：

| 指令 | 行為 |
|------|------|
| `/readDesign {skill}` | 讀定義檔 + 流程圖，記住設計稿路徑但不讀 |

- 移除 `flowchart` 子命令（預設就讀流程圖）
- 移除 `$2` 參數
- 設計稿讀取改為「意圖觸發」：用戶表達修改意圖時，AI 自動讀取

#### 設計稿讀取時機

| 時機 | AI 行為 |
|------|---------|
| `/readDesign {skill}` | 讀定義檔 + 流程圖，記住設計稿路徑 |
| 用戶表達修改意圖 | 自動讀設計稿 → 討論 → 記錄新設計到設計稿 |
| `/updateDesign` | 同步定義檔 + 流程圖 + commit 設計稿 |

#### 更新後的流程圖

```
/readDesign {skill} 執行流程（改版）
│
├─ 1. 【讀取定義檔】
│   ├─ 讀取 commands/{skill}.md（完整內容）
│   └─ 從 frontmatter 提取 design-doc 路徑
│
├─ 2. 【讀取流程圖】（如存在）
│   └─ 讀取 flowcharts/{skill}_flowchart.md
│
├─ 3. 【顯示摘要】
│   ├─ 定義檔結構（參數、步驟、模組引用）
│   ├─ 流程圖內容
│   ├─ 有 design-doc → 📄 設計稿位於：{路徑}
│   └─ 無 design-doc → ❌ 無對應設計稿
│
└─ 4. 【後續自動行為】
    └─ 用戶表達修改意圖時 → 自動讀取設計稿 → 進入修改流程
```

#### 需要同步更新的位置

| 位置 | 內容 |
|------|------|
| readDesign 定義檔「有參數模式」 | 改為讀定義檔 + 流程圖，移除 flowchart 子命令 |
| readDesign 流程圖 | 更新查詢模式流程 |
| readDesign 定義檔 frontmatter | argument-hint 移除 [flowchart] |
| readDesign 定義檔「檔案關係」表 | 設計稿說明改為「用戶要修改時 AI 自動讀取」 |
| readDesign 定義檔「design-doc 設計原則」 | 更新讀取時機說明 |

#### 實作狀態

- [x] 更新 readDesign 設計稿（2026-02-13）
- [ ] 更新 readDesign 定義檔
- [ ] 更新 readDesign 流程圖

### 2026-02-13 設計變更：大檔案讀取規則

**問題**：設計稿可能超過 2000 行（review 4938 行、debugP 3759 行、check-result 2385 行），Read 工具預設只讀 2000 行，導致讀取截斷。

**修正**：在「有參數模式」新增大檔案讀取規則：
- 先用 `wc -l` 確認行數
- ≤ 2000 行 → 直接 Read
- \> 2000 行 → 分段 Read（offset + limit=2000）

**影響檔案**：
1. `readDesign.md` - 定義檔「有參數模式」新增規則
2. `readDesign_flowchart.md` - 流程圖 Step 4 新增分段讀取分支
