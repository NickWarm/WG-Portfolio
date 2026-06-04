# read-data-flow Skill 設計稿

> 📅 建立日期：2026-02-09

---

## 問題描述

### 現況痛點

1. **手動貼路徑**：要讀 data flow 文件需手動貼完整絕對路徑
2. **大檔案分段**：data flow 文件通常超過 25,000 tokens，需手動分段讀取
3. **問題散落各處**：每個檔案的問題清單在文件末尾，需逐一翻閱才能掌握全貌
4. **無法快速比較**：多個模組的問題無法一目了然地跨檔案比較

### 預期效益

1. **一條指令讀取**：傳入模組名稱或絕對路徑即可自動讀取 + 分段處理
2. **自動提取問題**：自動解析「問題清單」區塊，按嚴重度分類
3. **跨模組彙整**：多檔案時自動彙整跨模組問題統計

---

## 執行流程圖

```
/read-data-flow 執行流程
│
├─ 1. 【參數解析】
│   ├─ 無參數 → 列出映射表所有可用模組，提示用戶選擇
│   └─ 有參數 → 逐一判斷每個參數
│       ├─ 以 / 開頭 → 絕對路徑模式，直接使用
│       └─ 否則 → 模組名稱模式
│           └─ 查映射表
│               ├─ 找到 → 使用對應路徑
│               └─ 找不到 → 報錯，列出所有可用模組名稱
│
├─ 2. 【檔案驗證】
│   ├─ 逐一檢查解析後的路徑是否存在
│   ├─ 全部存在 → 繼續
│   └─ 有不存在的 → 列出映射表所有可用模組
│
├─ 3. 【讀取檔案】
│   ├─ 單檔 → 直接分段讀取（offset/limit）
│   └─ 多檔 → 並行使用 Task agent 分段讀取
│       └─ 每個 agent 負責完整讀取一個檔案
│
├─ 4. 【問題摘要】
│   ├─ 4.1 提取每個檔案的基本資訊（Module、API 目錄、前端專案）
│   ├─ 4.2 提取「問題清單」區塊（## 問題清單）
│   ├─ 4.3 按嚴重度分類：❌ 嚴重 → ⚠️ 注意 → ℹ️ 備註
│   └─ 4.4 彙整跨檔案統計
│
└─ 5. 【輸出結果】
    ├─ 檔案基本資訊表
    ├─ 問題統計表（嚴重度 × 模組）
    ├─ ❌ 嚴重問題詳細列表
    ├─ ⚠️ 注意事項詳細列表
    └─ ℹ️ 設計備註（摺疊或簡述）
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$ARGUMENTS` | 是 | 一或多個模組名稱或絕對路徑（空格分隔） | 見下方 |

### 參數判斷邏輯

| 參數格式 | 判斷 | 行為 |
|---------|------|------|
| 以 `/` 開頭 | 絕對路徑 | 直接使用該路徑 |
| 不以 `/` 開頭 | 模組名稱 | 查映射表直接定位（不用 Glob 搜尋） |

### 模組名稱 → 檔案路徑映射表

| 模組名稱 | 檔案路徑 |
|----------|----------|
| `edm` | `prompts/6_api_data_flow/adminApi/edm-data-flow.md` |
| `edmTemplate` | `prompts/6_api_data_flow/adminApi/edmTemplate-data-flow.md` |
| `transcript` | `prompts/6_api_data_flow/adminApi/transcript-data-flow.md` |
| `transcriptChange` | `prompts/6_api_data_flow/adminApi/transcriptChange-data-flow.md` |
| `caseStudy` | `prompts/6_api_data_flow/adminApi/caseStudy-data-flow.md` |
| `propertySurvey` | `prompts/6_api_data_flow/adminApi/propertySurvey-data-flow.md` |
| `propertyOwner` | `prompts/6_api_data_flow/adminApi/propertyOwner-data-flow.md` |

> 新增模組時，需同步更新定義檔和設計稿中的映射表。

### 使用範例

```bash
# 模組名稱模式（推薦）
/read-data-flow transcript
/read-data-flow edm edmTemplate

# 絕對路徑模式
/read-data-flow /Users/nicholas/Desktop/Projects/prompts/6_api_data_flow/adminApi/edm-data-flow.md

# 混用
/read-data-flow transcript /Users/nicholas/Desktop/Projects/prompts/6_api_data_flow/adminApi/edm-data-flow.md
```

---

## 輸出格式

### 成功時

```markdown
# 📊 Data Flow 摘要

## 檔案資訊
| 檔案 | Module | API 目錄 | 前端專案 |
|------|--------|---------|---------|
| edm-data-flow.md | edm | adminApi | dashboard-nuxt |
| edmTemplate-data-flow.md | edmTemplate | adminApi | dashboard-nuxt |

## 問題統計
| 嚴重度 | edm | edmTemplate | 總計 |
|--------|-----|------------|------|
| ❌ 嚴重 | 6 | 0 | 6 |
| ⚠️ 注意 | 9 | 2 | 11 |
| ℹ️ 備註 | 0 | 4 | 4 |
| **總計** | **15** | **6** | **21** |

## ❌ 嚴重問題（需修正）

| # | Module | 類型 | 問題描述 | 影響 |
|---|--------|------|---------|------|
| 1 | edm | Request 欄位名不匹配 | 前端送 `landNumber`，後端為 `landNoSearch` | 地號搜尋無效 |
| 2 | edm | Request 欄位名不匹配 | 前端送 `addressDetail`，後端為 `addressDetailSearch` | 詳細地址搜尋無效 |
| ... | | | | |

## ⚠️ 注意事項

| # | Module | 類型 | 問題描述 |
|---|--------|------|---------|
| 1 | edm | storeIds 型別不一致 | 前端傳 number，後端用 sd.storeId 字串篩選 |
| ... | | | |

## ℹ️ 設計備註

| # | Module | 問題描述 |
|---|--------|---------|
| 1 | edmTemplate | 簡單 API 設計模式 |
| ... | | |
```

### 失敗時（模組名稱不在映射表）

```
❌ 找不到模組 xxx，可用模組：
  - edm
  - edmTemplate
  - transcript
  - transcriptChange
  - caseStudy
  - propertySurvey
  - propertyOwner
```

### 失敗時（檔案不存在）

```
❌ 檔案不存在：/path/to/not-found.md

📂 可用模組：edm, edmTemplate, transcript, transcriptChange, caseStudy, propertySurvey, propertyOwner
```

---

## 實作細節

### 需要讀取的檔案

| 檔案 | 用途 |
|------|------|
| 用戶指定的 `*-data-flow.md` | 主要讀取目標 |

### 問題解析邏輯

1. 找到 `## 問題清單` 區塊
2. 在該區塊中識別三種嚴重度的子區塊：
   - `### ❌` 開頭 → 嚴重問題
   - `### ⚠️` 開頭 → 注意事項
   - `### ℹ️` 開頭 → 設計備註
3. 解析每個子區塊中的表格行

### 大檔案處理策略

- 使用 Read 工具的 `offset` + `limit` 參數分段讀取
- 每段 600 行，直到讀完整個檔案
- 多檔案時使用 Task agent 並行讀取

### 注意事項

- 使用映射表直接定位，不需要 Glob 搜尋（參考 `/exportN` 的映射表設計）
- 絕對路徑模式作為備用，支援映射表外的檔案
- 不讀取檔案的所有細節，重點放在「問題清單」區塊的提取

---

## Skill 定義檔

**檔案位置**: `backend-nestjs/.claude/commands/read-data-flow.md`

（定義檔內容見 `backend-nestjs/.claude/commands/read-data-flow.md`，此處不重複）

---

## 設計決策記錄

### 2026-02-09：改用映射表替代 Glob 搜尋

**變更內容**：
- Step 1 參數解析：模組名稱改為查映射表直接定位，不再使用 Glob 搜尋
- 新增「模組名稱 → 檔案路徑映射表」區塊

**設計理由**：
- 參考 `/exportN` 的「分類 → 目錄映射表」設計
- 映射表直接定位比 Glob 搜尋更快、更精準
- 避免同名前綴的模組（如 transcript / transcriptChange）產生歧義

## 待辦事項

- [x] 用戶確認設計稿
- [x] 建立 `read-data-flow.md` 定義檔
- [x] 建立 `read-data-flow_flowchart.md` 流程圖
- [x] 改用映射表替代 Glob 搜尋
- [ ] 測試：讀取單一 data flow 檔案
- [ ] 測試：讀取多個 data flow 檔案
- [ ] `/api-flow-architecture` 執行後自動更新 `/read-data-flow` 的映射表（新增模組時同步）
