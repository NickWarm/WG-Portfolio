# /showFlow 設計稿

> 📅 建立日期：2026-02-08
> 📋 來源：`check_result_field_verification_gaps.md` 中兩條流程（Bug Fix / Data Flow 驅動）步驟越來越多，需要快速印出流程圖
> 📋 全名：Show Workflow Flow

---

## 問題描述

### 現況痛點

目前有三條工作流程，步驟數量持續增加：

| 流程 | 起頭 Skill | 步驟數 | 問題 |
|------|-----------|--------|------|
| API Data Flow 建立（建立基礎資料） | `/api-flow-architecture` | 4 步（前 2 步 optional） | 是其他兩條流程的前置基礎 |
| Data Flow 驅動修復（主動，QA 開票前） | `/dpf` | 7 步 | 與 Bug Fix 有差異（跳過 /add-pi），容易搞混 |
| Bug Fix（被動，QA 開票後） | `/exportN` | 9 步 | 步驟多，每次要回想順序 |

**痛點**：
- 每次開始工作前要回想「下一步是什麼」
- 三條流程有微妙差異，容易搞混步驟順序
- 流程記錄散落在不同設計稿中，沒有統一入口
- 新 session 的 AI 不知道完整流程，需要人工提醒

### 預期效益

- **一個指令印出完整流程圖**：不用翻設計稿
- **標記當前進度**：知道做到哪了、下一步是什麼
- **三條流程一目了然**：不會搞混

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 否 | 流程類型：`api`、`df`、`bug` | `/showFlow api`、`/showFlow df`、`/showFlow bug` |

### 使用範例

```bash
# 顯示三條流程的總覽
/showFlow

# 只顯示 API Data Flow 建立流程
/showFlow api

# 只顯示 Data Flow 驅動修復流程
/showFlow df

# 只顯示 Bug Fix 流程
/showFlow bug
```

---

## 執行流程圖

```
/showFlow 執行流程
│
├─ 1. 【參數解析】
│   ├─ 無參數 → 顯示三條流程總覽
│   ├─ $1 = api → 只顯示 API Data Flow 建立流程
│   ├─ $1 = df → 只顯示 Data Flow 驅動修復流程
│   └─ $1 = bug → 只顯示 Bug Fix 流程
│
├─ 2. 【偵測當前進度】（從對話上下文）
│   ├─ 搜尋最近執行的 skill 名稱（/exportN、/debugP、/dpf、/reviewDoc...）
│   ├─ 搜尋 proposal 路徑 → 判斷是 Bug Fix 還是 Data Flow 流程
│   │   ├─ 路徑含 debug/potential-fix/ → Data Flow 流程
│   │   └─ 其他 debug/ 路徑 → Bug Fix 流程
│   └─ 找不到上下文 → 不標記進度，只印流程圖
│
└─ 3. 【輸出流程圖】
    ├─ 印出對應的流程圖
    ├─ 標記已完成步驟（✅）和當前步驟（👉）
    └─ 提示下一步指令
```

---

## 輸出格式

### 無參數模式 — 三條流程總覽

```markdown
# 🗺️ 工作流程總覽

## API Data Flow 建立流程（建立基礎資料）

```
(/pull-frontend) → (/build-ui-index) → /api-flow-architecture → /review-api-flow
```

## Data Flow 驅動修復流程（QA 開票前）

```
/dpf → /reviewDoc → /reviewDoc -data
→ /implement → /check-result → /gcommit-push → /fxxxf2e
```

## Bug Fix 流程（QA 開票後）

```
/exportN → /debugP → /add-pi → /reviewDoc → /reviewDoc -data
→ /implement → /check-result → /gcommit-push → /fxxxf2e
```

💡 執行 `/showFlow api`、`/showFlow df` 或 `/showFlow bug` 查看詳細步驟
```

### api 模式 — API Data Flow 建立詳細流程

```markdown
# 🏗️ API Data Flow 建立流程（建立基礎資料）

```
API Data Flow 建立流程
│
├─ 1. /pull-frontend（optional，已拉過可跳過）
│   └─ 拉取 dashboard-nuxt、frontend-nuxt 最新進度
│
├─ 2. /build-ui-index（optional，已建過可跳過）
│   └─ 掃描前端專案，建立 UI-API 索引
│
├─ 3. /api-flow-architecture {apiName}
│   └─ 建立後端 API 結構文件（Entity/DTO/Service/Controller）
│
└─ 4. /review-api-flow {apiName}
    └─ 前後端對齊檢查 → 產出問題清單（❌/⚠️）
```
```

### bug 模式 — Bug Fix 詳細流程

```markdown
# 🐛 Bug Fix 流程（QA 開票後）

```
Bug Fix 標準流程
│
├─ 1. /exportN [Notion 票]
│   └─ 匯出 Notion 票 → 建立 bug spec
│
├─ 2. /debugP {env}
│   └─ 分析 bug spec → 建立 proposal（含 API Data Flow 參照）
│
├─ 3. /add-pi
│   └─ 將 data-flow 已知潛在問題全部納入 proposal
│
├─ 4. /reviewDoc
│   ├─ 一般檢核（v3 自動驗證）
│   ├─ Step 1.7A 程式碼品質檢核（500 防護 + 回傳型別）
│   └─ Step 1.7B Data Flow 交叉檢核（有 data-flow 時）
│
├─ 5. /reviewDoc -data {env}
│   └─ 從 data-flow 推導 cases + 撈 DB 測試資料
│
├─ 6. /implement
│   └─ 依照 proposal 實作修正
│
├─ 7. /check-result {env}
│   └─ 使用 proposal 已準備好的資料驗證
│
├─ 8. /gcommit-push
│   └─ 更新 proposal 並提交 + 更新 scan-meta
│
└─ 9. /fxxxf2e
    └─ 提取前端修改建議 + 罐頭留言（含 Notion 票）
```
```

### df 模式 — Data Flow 驅動修復詳細流程

```markdown
# 🔍 Data Flow 驅動修復流程（QA 開票前主動修復）

```
Data Flow 驅動修復流程
│
├─ 1. /dpf {apiName}
│   └─ 從問題清單生 proposal（不需要 bug spec）
│
├─ 2. /reviewDoc
│   ├─ 一般檢核（v3 自動驗證）
│   └─ ⏭️ 跳過 /add-pi（dpf 已納入所有問題）
│
├─ 3. /reviewDoc -data {env}
│   └─ 從 data-flow 推導 cases + 撈 DB 測試資料
│
├─ 4. /implement
│   └─ 依照 proposal 實作修正
│
├─ 5. /check-result {env}
│   └─ 驗證（帳號從 proposal「驗證建議」取得）
│
├─ 6. /gcommit-push
│   └─ 更新 proposal 並提交 + 更新 scan-meta
│
└─ 7. /fxxxf2e
    └─ 提取前端修改建議 + 罐頭留言（Notion 票 = N/A）
```
```

### 有進度時的標記方式

在對話上下文中偵測到進度時，用 ✅ 和 👉 標記：

```markdown
├─ ✅ 1. /exportN [Notion 票]
│   └─ 匯出 Notion 票 → 建立 bug spec
│
├─ ✅ 2. /debugP dev
│   └─ 分析 bug spec → 建立 proposal
│
├─ ✅ 3. /add-pi
│   └─ 已納入 data-flow 潛在問題
│
├─ 👉 4. /reviewDoc
│   └─ 一般檢核（v3 自動驗證）
│
├─ 5. /reviewDoc -data {env}
│   └─ ...
```

最後提示：
```
📍 當前進度：Step 4 /reviewDoc
▸ 下一步：/reviewDoc
```

---

## 進度偵測邏輯

### 從對話上下文偵測

| 偵測目標 | 搜尋方式 | 判斷 |
|---------|---------|------|
| 流程類型 | proposal 路徑 / 最近執行的 skill | `debug/potential-fix/` → df；其他 `debug/` → bug；無 proposal + 有 /api-flow-architecture 或 /review-api-flow → api |
| 已完成步驟 | 對話中出現的 skill 執行紀錄 | 出現過 → ✅ |
| 當前步驟 | 最後一個已完成步驟的下一步 | → 👉 |

### 偵測優先順序

1. **TaskList**：如果有 Task 追蹤，從 Task 狀態判斷
2. **對話上下文**：搜尋 skill 執行紀錄
3. **找不到**：不標記進度，只印流程圖

---

## 注意事項

1. **純輸出 skill**：不修改任何檔案，不建立任何文件，只印流程圖
2. **不需要 TaskCreate**：執行瞬間完成，不需要進度追蹤
3. **流程圖內容維護**：流程步驟如有變更，需同步更新此設計稿和定義檔
4. **進度偵測是 best effort**：找不到上下文就不標記，不要猜測

---

## 實作狀態

- [x] 設計討論（2026-02-08）
- [x] 設計稿完成（2026-02-08）
- [x] 建立定義檔：`backend-nestjs/.claude/commands/showFlow.md`
- [ ] 測試驗證

---

### 2026-02-09 設計變更：新增 `u` 參數（Update 模式）+ 各 Skill 自動更新進度

#### 問題描述

目前 `/showFlow` 是純輸出 skill，只印流程圖到對話中，不修改任何檔案。但跨 session 時，proposal 檔案本身沒有記錄當前執行到哪個步驟，導致：

1. **新 session 無法得知進度**：conversation compact 或新對話後，之前走到哪一步完全遺失
2. **Proposal 缺乏進度追蹤**：如 Proposal 5 有 5 個修正項目，但沒有流程進度紀錄

#### 設計背景：漸進式 Proposal

參考 Proposal 4 的結構（12 個 issue，同一批處理）：
- 同一天發現的 bug 歸為同一個 Proposal，走同一條流程
- 隔天新發現的 bug 是新的 Proposal，走另一條流程
- 進度表是**每個 Proposal 一份**，記錄這批 issue 整體走到流程的哪一步

#### 設計決策

**兩層機制**：

1. **`/showFlow u {type}`**：初始化器 — 檢查 proposal 置頂有無進度表，沒有就建立骨架
2. **各 Skill 自動更新**：每個 skill 執行完畢時，自動更新 proposal 進度表中自己那一行為 ✅

**核心規則**：
- `/showFlow u` 只負責「建立」進度表，不負責更新
- 進度的更新由各 skill 自己完成（即時、準確）
- 用戶第一次使用時指定流程類型（`debug` 或 `dpf`）
- 進度表放在 proposal 置頂（標題之後、正文之前）

#### 參數格式

| 用法 | 說明 |
|------|------|
| `/showFlow u debug` | 建立 Bug Fix 流程進度表 |
| `/showFlow u dpf` | 建立 Data Flow 驅動流程進度表 |

#### 執行流程圖

```
/showFlow u {type} 執行流程（初始化器）
│
├─ 1. 【定位 Proposal】
│   ├─ 從對話上下文找到當前 proposal 路徑
│   └─ 找不到 → 提示用戶指定
│
├─ 2. 【檢查置頂有無進度表】
│   ├─ 有 → 回報「進度表已存在」，不覆蓋
│   └─ 沒有 → 繼續 Step 3
│
├─ 3. 【建立進度表骨架】
│   ├─ debug → 插入 Bug Fix 流程進度表
│   └─ dpf → 插入 Data Flow 驅動流程進度表
│   └─ 位置：標題行之後、正文之前
│
└─ 4. 【輸出確認】
    ├─ 印出建立的進度表
    └─ 顯示：✅ 進度表已建立於 {proposal 檔名}
```

```
各 Skill 自動更新流程（執行完畢時觸發）
│
├─ 1. 【檢查進度表是否存在】
│   ├─ 不存在 → 跳過更新（不強制）
│   └─ 存在 → 繼續
│
├─ 2. 【更新自己那一行】
│   └─ 將對應步驟的狀態從 ⏸️ 改為 ✅
│
└─ 3. 【更新時間戳】
    └─ 更新「最後更新」行的日期和 skill 名稱
```

#### 寫入格式

插入 proposal 置頂的進度表（Bug Fix 範例）：

```markdown
## 工作流程進度（Bug Fix）

> 最後更新：2026-02-09 by /showFlow u

| # | 步驟 | 狀態 |
|---|------|------|
| 1 | /debugP | ⏸️ |
| 2 | /add-pi | ⏸️ |
| 3 | /reviewDoc | ⏸️ |
| 4 | /reviewDoc -data | ⏸️ |
| 5 | /implement | ⏸️ |
| 6 | /check-result | ⏸️ |
| 7 | /gcommit-push | ⏸️ |
| 8 | /fxxxf2e | ⏸️ |

---
```

各 skill 更新後的範例：

```markdown
## 工作流程進度（Bug Fix）

> 最後更新：2026-02-09 by /reviewDoc

| # | 步驟 | 狀態 |
|---|------|------|
| 1 | /debugP | ✅ |
| 2 | /add-pi | ✅ |
| 3 | /reviewDoc | ✅ |
| 4 | /reviewDoc -data | ⏸️ |
| 5 | /implement | ⏸️ |
| 6 | /check-result | ⏸️ |
| 7 | /gcommit-push | ⏸️ |
| 8 | /fxxxf2e | ⏸️ |

---
```

#### 影響範圍

**需要修改的 Skill（加上「更新進度表」邏輯）**：

| Skill | 對應進度表步驟（Bug Fix / dpf） | 備註 |
|-------|-------------------------------|------|
| /debugP | Bug Fix #1 | Bug Fix 流程起點 |
| /dpf | dpf #1 | dpf 流程起點 |
| /add-pi | Bug Fix #2 | Bug Fix 流程 |
| /reviewDoc | #3 / #2 | 共用 |
| /reviewDoc -data | #4 / #3 | 共用 |
| /implement | #5 / #4 | 共用 |
| /check-result | #6 / #5 | 共用 |
| /gcommit-push | #7 / #6 | 共用 |
| /fxxxf2e | #8 / #7 | 共用 |

#### 共用模組設計：`update-progress.md`

**檔案位置**：`backend-nestjs/.claude/flowcharts/update-progress.md`

**用途**：被各 skill 的定義檔用 `@` 引用，提供統一的進度表更新邏輯

**引用方式**（各 skill 定義檔中）：
```markdown
@.claude/flowcharts/update-progress.md
```

**模組內容規格**：

```
進度表更新模組（update-progress.md）
│
├─ 1. 【定位 Proposal】
│   ├─ 從對話上下文找到當前 proposal 路徑
│   └─ 找不到 → 跳過更新，不報錯
│
├─ 2. 【檢查進度表存在】
│   ├─ 搜尋 proposal 檔案中的「## 工作流程進度」標記
│   ├─ 不存在 → 跳過更新，不報錯
│   └─ 存在 → 繼續
│
├─ 3. 【比對 Skill 名稱】
│   ├─ 從進度表中找到包含當前 skill 名稱的那一行
│   ├─ 找不到對應行 → 跳過（可能是不同流程類型）
│   └─ 找到 → 繼續
│
├─ 4. 【更新狀態】
│   └─ Edit：將該行的 ⏸️ 改為 ✅
│
└─ 5. 【更新時間戳】
    └─ Edit：更新「> 最後更新：」行 → 當前日期 + skill 名稱
```

**各 Skill 引用方式**：

在每個 skill 的定義檔最後一個 Step 之後，加上：

```markdown
### 最終步驟：更新進度表

> 以下邏輯由共用模組處理，詳見 @.claude/flowcharts/update-progress.md

- 自動偵測 proposal 進度表
- 將本 skill 對應的步驟標記為 ✅
- 如果進度表不存在則跳過
```

**Skill ↔ 進度表步驟對應表**：

模組內建對應關係，根據當前執行的 skill 名稱自動匹配：

| Skill 名稱 | 進度表匹配關鍵字 |
|------------|----------------|
| exportN | `/exportN` |
| debugP | `/debugP` |
| dpf | `/dpf` |
| add-pi | `/add-pi` |
| reviewDoc | `/reviewDoc` |
| reviewDoc（帶 -data） | `/reviewDoc -data` |
| implement | `/implement` |
| check-result | `/check-result` |
| gcommit-push | `/gcommit-push` |
| fxxxf2e | `/fxxxf2e` |

> **匹配邏輯**：先嘗試精確匹配（如 `/reviewDoc -data`），再嘗試基礎匹配（如 `/reviewDoc`），避免 `-data` 變體被錯誤匹配。

#### 注意事項

1. **置頂位置**：進度表插在標題行之後、第一個 `## ` 正文區塊之前
2. **不覆蓋**：如果進度表已存在，`/showFlow u` 不會覆蓋重建
3. **不強制**：如果 proposal 沒有進度表，各 skill 跳過更新（不報錯）
4. **純更新狀態**：各 skill 只改自己那行的狀態欄位 + 時間戳，不動其他內容
5. **模組獨立**：`update-progress.md` 放在 `flowcharts/` 目錄，與流程圖同級
6. **定義檔需同步更新**：showFlow 定義檔需透過 `/updateDesign showFlow` 同步
7. **各 skill 定義檔也需更新**：加上 `@.claude/flowcharts/update-progress.md` 引用 + 最終步驟說明，建議逐一用 `/updateDesign` 處理
