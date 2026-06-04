---
description: 讀取 Data Flow 檔案並摘要前後端問題
argument-hint: <模組名稱或絕對路徑> [<模組名稱或絕對路徑2> ...]
design-doc: prompts/4_diary/debug/proposal/slash/read-data-flow_skill_proposal.md
---

@.claude/flowcharts/read-data-flow_flowchart.md

## 參數

- `$ARGUMENTS`：一或多個模組名稱或絕對路徑（空格分隔）
  - 模組名稱：如 `transcript` → 從映射表直接定位
  - 絕對路徑：如 `/Users/nicholas/Desktop/Projects/prompts/6_api_data_flow/adminApi/edm-data-flow.md`

## 模組名稱 → 檔案路徑映射表

| 模組名稱 | 檔案路徑 |
|----------|----------|
| `edm` | `prompts/6_api_data_flow/adminApi/edm-data-flow.md` |
| `edmTemplate` | `prompts/6_api_data_flow/adminApi/edmTemplate-data-flow.md` |
| `transcript` | `prompts/6_api_data_flow/adminApi/transcript-data-flow.md` |
| `transcriptChange` | `prompts/6_api_data_flow/adminApi/transcriptChange-data-flow.md` |
| `caseStudy` | `prompts/6_api_data_flow/adminApi/caseStudy-data-flow.md` |
| `propertySurvey` | `prompts/6_api_data_flow/adminApi/propertySurvey-data-flow.md` |
| `propertyOwner` | `prompts/6_api_data_flow/adminApi/propertyOwner-data-flow.md` |
| `estateListing` | `prompts/6_api_data_flow/adminApi/estateListing-data-flow.md` |
| `estateTransaction` | `prompts/6_api_data_flow/adminApi/estateTransaction-data-flow.md` |
| `informationSheet` | `prompts/6_api_data_flow/adminApi/informationSheet-data-flow.md` |
| `estateMedia` | `prompts/6_api_data_flow/adminApi/estateMedia-data-flow.md` |
| `estateSalesDetail` | `prompts/6_api_data_flow/adminApi/estateSalesDetail-data-flow.md` |
| `estateFile` | `prompts/6_api_data_flow/adminApi/estateFile-data-flow.md` |
| `bid` | `prompts/6_api_data_flow/adminApi/bid-data-flow.md` |
| `contract` | `prompts/6_api_data_flow/adminApi/contract-data-flow.md` |
| `contractType` | `prompts/6_api_data_flow/adminApi/contractType-data-flow.md` |
| `contractBatch` | `prompts/6_api_data_flow/adminApi/contractBatch-data-flow.md` |
| `contractChange` | `prompts/6_api_data_flow/adminApi/contractChange-data-flow.md` |
| `directMail` | `prompts/6_api_data_flow/adminApi/directMail-data-flow.md` |
| `contractChangeRequest` | `prompts/6_api_data_flow/adminApi/contractChangeRequest-data-flow.md` |
| `approvement` | `prompts/6_api_data_flow/adminApi/approvement-data-flow.md` |
| `leave` | `prompts/6_api_data_flow/adminApi/leave-data-flow.md` |
| `leaveType` | `prompts/6_api_data_flow/adminApi/leaveType-data-flow.md` |
| `leaveQuota` | `prompts/6_api_data_flow/adminApi/leaveQuota-data-flow.md` |
| `customer` | `prompts/6_api_data_flow/adminApi/customer-data-flow.md` |
| `announcement` | `prompts/6_api_data_flow/adminApi/announcement-data-flow.md` |
| `announcementCategory` | `prompts/6_api_data_flow/adminApi/announcementCategory-data-flow.md` |
| `admin` | `prompts/6_api_data_flow/adminApi/admin-data-flow.md` |
| `personnelChange` | `prompts/6_api_data_flow/adminApi/personnelChange-data-flow.md` |
| `store` | `prompts/6_api_data_flow/adminApi/store-data-flow.md` |
| `storeAdmin` | `prompts/6_api_data_flow/adminApi/storeAdmin-data-flow.md` |
| `realEstatesAdmins` | `prompts/6_api_data_flow/adminApi/realEstatesAdmins-data-flow.md` |

> 新增模組時，在此表新增一行即可。

## 任務

### Step 1: 參數解析

- 無參數 → 顯示映射表中所有可用模組，提示用戶選擇，結束執行
- 有參數 → 按空格分割，逐一判斷每個參數：
  - 以 `/` 開頭 → 視為絕對路徑，直接使用
  - 否則 → 視為模組名稱，查映射表：
    - 找到 → 使用對應路徑
    - 找不到 → 報錯：`❌ 找不到模組 {name}，可用模組：`，列出映射表所有模組名稱

### Step 2: 檔案驗證

1. 逐一檢查每個解析後的路徑是否存在（使用 Read 工具嘗試讀取第 1 行）
2. 任一路徑不存在：
   - 顯示錯誤：`❌ 檔案不存在：{path}`
   - 列出映射表所有可用模組
   - 結束執行
3. 全部通過 → 繼續

### Step 3: 讀取檔案

**單檔模式**（1 個路徑）：
1. 使用 Read 工具分段讀取（每段 600 行，透過 offset/limit）
2. 直到整個檔案讀完

**多檔模式**（2+ 個路徑）：
1. 並行啟動 Task agent（subagent_type=general-purpose），每個 agent 負責讀取一個檔案
2. 每個 agent 的任務：
   - 分段讀取完整檔案
   - 提取「## 基本資訊」區塊內容
   - 提取「## 問題清單」區塊完整內容
   - 回傳提取結果

### Step 4: 問題摘要

1. **提取基本資訊**（從 `## 基本資訊` 區塊）：
   - Module 名稱
   - API 目錄（adminApi / publicApi）
   - 對應前端專案

2. **定位問題清單**（找 `## 問題清單` 區塊）

3. **按嚴重度分類提取**：
   - `### ❌` 開頭的子區塊 → 嚴重問題
   - `### ⚠️` 開頭的子區塊 → 注意事項
   - `### ℹ️` 開頭的子區塊 → 設計備註

4. **解析表格行**：提取每一行的 #、嚴重度、類型、問題描述、位置/影響

5. **彙整統計**（多檔時）：按嚴重度 × 模組統計數量

### Step 5: 輸出結果

按以下格式輸出：

```markdown
# 📊 Data Flow 摘要

## 檔案資訊
| 檔案 | Module | API 目錄 | 前端專案 |
|------|--------|---------|---------|
| {filename} | {module} | {apiDir} | {frontend} |

## 問題統計
| 嚴重度 | {module1} | {module2} | 總計 |
|--------|-----------|-----------|------|
| ❌ 嚴重 | N | N | N |
| ⚠️ 注意 | N | N | N |
| ℹ️ 備註 | N | N | N |
| **總計** | **N** | **N** | **N** |

## ❌ 嚴重問題（需修正）

| # | Module | 類型 | 問題描述 | 影響 |
|---|--------|------|---------|------|
| 1 | {module} | {type} | {description} | {impact} |

## ⚠️ 注意事項

| # | Module | 類型 | 問題描述 |
|---|--------|------|---------|
| 1 | {module} | {type} | {description} |

## ℹ️ 設計備註

| # | Module | 問題描述 |
|---|--------|---------|
| 1 | {module} | {description} |
```

**單檔且無問題清單時**：
- 提示：`⚠️ {filename} 沒有「## 問題清單」區塊，可能尚未執行 /review-api-flow`
- 改為輸出檔案的基本資訊 + 已有的區塊摘要（Entity、DTO、Service、Controller 等）
