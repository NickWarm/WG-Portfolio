---
description: 從 Data Flow 問題清單主動生成修復 Proposal（QA 開票前）
argument-hint: <apiName>
design-doc: prompts/4_diary/debug/proposal/slash/dpf_skill_proposal.md
---

@.claude/flowcharts/dpf_flowchart.md

@/Users/nicholas/Desktop/Projects/.claude/modules/review-proposal-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/adminApi-architecture.md

## 設計目的

從 data-flow 文件的問題清單（❌/⚠️）直接生成修復 proposal，走完整修復流程。讓主動檢查模式不再停在「發現問題」，而是接到「修復 → 驗證 → commit → 通知前端」。

## 參數

- `$1`：API module 名稱（必填），例如 `transcript`、`estateSalesDetail`、`customer`

### 使用範例

```bash
# 從 data-flow 問題清單生 proposal
/dpf transcript

# 搭配完整流程
/dpf transcript → /reviewDoc → /implement → /check-result dev → /gcommit-push → /fxxxf2e
```

## 前置依賴

- 必須先有 data-flow 文件（`/api-flow-architecture {apiName}`）
- 最好也跑過 `/review-api-flow {apiName}`（產出問題清單）

## Task 追蹤機制（強制啟用）

### Step 0: 建立進度追蹤（強制）

| Task | Subject | activeForm |
|------|---------|------------|
| 1 | 讀取 Data Flow 文件 | 讀取 Data Flow 文件中... |
| 2 | 提取問題清單 | 提取問題清單中... |
| 3 | 判斷執行模式 | 判斷執行模式中... |
| 4 | 讀取後端程式碼並分析修法（含檔案產出偵測 + 欄位風險分析） | 分析後端程式碼中... |
| 5 | 產出/更新 Proposal | 產出/更新 Proposal 中... |
| 6 | 檢核 Proposal | 檢核 Proposal 中... |
| 7 | 輸出結果 | 輸出結果中... |
| 8 | Step 8 更新進度表 | 更新進度表中... |

### Task 更新規則

- 開始步驟時：`TaskUpdate(status: 'in_progress')`
- 完成步驟時：`TaskUpdate(status: 'completed')`
- 遇到問題時：保持 `in_progress` 並說明問題

## 任務

### Step 1：讀取 Data Flow 文件

1. 用 Glob 搜尋 data-flow 文件：
   - `prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md`
   - `prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md`
2. **找到** → 讀取文件，記錄 API 目錄（adminApi 或 publicApi）
3. **找不到** → 報錯：「❌ 找不到 {apiName} 的 data-flow 文件，請先執行 /api-flow-architecture {apiName}」→ 結束

### Step 2：提取問題清單

1. **搜尋並提取以下區塊**（找不到的就跳過，不報錯）：
   - **「## 問題清單」**：底下所有 `### ❌` 和 `### ⚠️` 子表格的每一行
   - **「## 500 防護檢查 → 500 路徑清單」**：表格中 ⚠️ 項目
   - **「## 資料流驗證 → 資料流斷點彙總」**：表格中 ❌ 和 ⚠️ 項目
   - **「-c 檢查發現的問題」**：表格中所有問題
   - **「-s 檢查發現的問題」**：表格中所有問題

2. **合併去重**：以「問題描述 + 位置」為唯一鍵，重複時保留嚴重度最高的（❌ > ⚠️）

3. **問題篩選**（複用 /add-pi 邏輯）：
   - **❌ 問題**：全部保留，不篩選
   - **⚠️ 問題**：逐一判斷是否為「真正的潛在問題」
     - **排除**：標記 `dpf-skip`（描述含 🏷️ dpf-skip，由其他專案/團隊處理）
     - **排除**：前端已防護（描述含 catch/fallback/disabled/v-if 防護）
     - **排除**：無人使用（標註「無前端頁面」「前端未使用」的 API/欄位）
     - **排除**：冗餘欄位（類型為「API 回傳但前端未使用」）
     - **保留**：可能導致錯誤、500、資料不正確的問題

4. 無任何問題 → 顯示「✅ {apiName} 的 data-flow 沒有需要處理的問題」→ 結束

### Step 3：判斷執行模式

**3.1 優先：從對話上下文判斷**
- 對話上下文有 proposal 路徑（剛跑完 `/debugP` 或 `/add-pi`）→ 進入**「更新模式」**
  - 讀取現有 proposal
  - 比對 Step 2 問題清單 vs proposal 現有內容
    - 已有解法（`## 解法 N` 區塊）→ 跳過
    - 只有問題描述（`/add-pi` 加的輕量描述）或完全沒有 → 標記需補充
  - 全部已有解法 → 顯示「✅ 所有 data-flow 問題已有修改建議」→ 結束

**3.2 備用：搜尋 potential-fix 目錄（新建模式）**
- 對話上下文沒有 proposal 時：
  1. **搜尋已有 Proposal**：
     ```bash
     ls prompts/4_diary/{apiName}_api/debug/potential-fix/*_proposal.md
     ```
  2. **有找到** → 讀取內容，比對哪些問題已處理、哪些是新問題
     - 全部已處理 → 顯示「✅ 所有問題已在既有 proposal 中處理」→ 結束
     - 有新問題 → 只處理新問題，在輸出中標記「🆕」→「新建模式」
  3. **沒找到** → 全部問題都是新的 →「新建模式」

### Step 4：讀取後端程式碼並分析修法

1. **從 data-flow 取得結構資訊**（不用重新搜尋）：
   - Entity 結構（欄位、關聯、nullable）
   - DTO 欄位定義
   - Service select/relations
   - Controller 路由

2. **讀取問題涉及的原始碼**：
   - `backend-nestjs/src/api/{dir}/{apiName}/*.service.ts`
   - `backend-nestjs/src/api/{dir}/{apiName}/*.controller.ts`
   - `backend-nestjs/src/api/{dir}/{apiName}/dto/*.dto.ts`

3. **前端欄位資訊**：直接從 data-flow「UI ↔ API 欄位對應」區塊取得（不需額外查 ui-api-index）

4. **分析每個問題的修法**（依後端優先原則）：
   - **先判斷：後端能否解決？**
     - 回傳預設值物件（而非 null）→ 後端解
     - 格式化/轉換欄位值 → 後端解
     - 加 null guard / fallback → 後端解
     - 加欄位到 response → 後端解
     - 以上都不適用 → 才考慮前端
   - **前端才該做的事**（後端無法替代）：UI 互動邏輯、前端路由、狀態管理、純顯示格式
   - 問題來源表格：後端能解 → 前端 ❌ / 後端 ✅
   - 產出具體修改建議（含程式碼）

#### Step 4.5：檔案產出偵測

> ℹ️ Grep = Claude Code tool（底層為 rg）、Glob = Claude Code tool（底層為 fast-glob）

1. **掃描 module 目錄**，偵測是否有檔案產出邏輯：
   - Grep service 中: `puppeteer|generatePdf` → PDF 產出
   - Grep service 中: `docx-templates|docx-merger` → Word 產出
   - Grep service 中: `exceljs|xlsx` → Excel 產出（未來擴充）
   - Glob: `templates/**` → template 檔案（.html/.hbs/.docx）

2. **沒有檔案產出** → 跳過，繼續 Step 5

3. **有檔案產出** → 進入 Step 4.6

#### Step 4.6：檔案產出欄位分析

1. **讀取檔案產出 service 原始碼**
2. **讀取 template 檔案**（若有）
3. **識別資料來源**（從哪個 Web Service method 取資料）
4. **比對：Web API response 欄位 vs 檔案產出使用的欄位**：
   - PDF：template 中的 Handlebars 變數 vs prepareTemplateData 回傳
   - Word：docx template 變數 vs 扁平化轉換函數回傳
5. **發現不一致** → 標記為問題，納入 proposal 解法
6. **無問題** → 在 proposal 記錄「已檢查檔案產出，無問題」

#### Step 4.6.5：檔案產出欄位風險分析

1. **從 Step 4.6 取得所有 template 變數清單**
2. **逐一追溯每個變數的資料來源**：
   - 扁平化轉換函數中的 key → 對應的 DTO/Entity 欄位
   - 關聯深度（如 realEstate.store.name → 2 層關聯）
   - Entity 欄位的 nullable 狀態（從 data-flow 取得）
3. **風險判斷**：
   - nullable 欄位 + 轉換函數有 fallback（`?? ''`、`|| ''`）→ ✅ 安全
   - nullable 欄位 + 轉換函數沒有 fallback → ⚠️ 風險（可能空白）
   - FK 關聯 + 關聯可能不存在 → ⚠️ 風險（整組欄位空白）
   - 必填欄位 → ✅ 安全
4. **產出「## 檔案產出欄位風險表」寫入 proposal**：
   - 供 `/reviewDoc -data` 推導檔案產出 cases
   - 供 `/check-result` 驗證檔案內容

#### Step 4.7：額外檢查：分頁預設值（獨立於問題清單）

- 分析 findAll/list endpoint 時，檢查 DTO 的 pageSize/limit 預設值
- 不是 10 → 納入問題清單，產出修改建議（@Transform default 10）
- 是 10 → 跳過

### Step 5：產出/更新 Proposal

#### 「新建模式」（對話上下文沒有 proposal）

1. **建立目錄**（不存在時自動建立）：
   ```bash
   mkdir -p prompts/4_diary/{apiName}_api/debug/potential-fix/
   ```

2. **建立 proposal 文件**：`{MMDD}_{apiName}_potential_fix_proposal.md`

3. **文件結構**：
   ```markdown
   # {apiName} 潛在問題修復提案

   > 📅 {YYYY-MM-DD}
   > 🔍 來源：Data Flow 主動檢查（非 QA 開票）
   > 📊 問題數量：❌ {N} 個、⚠️ {M} 個

   ## API Data Flow 參照

   | 項目 | 內容 |
   |------|------|
   | 文件路徑 | `prompts/6_api_data_flow/{dir}/{apiName}-data-flow.md` |
   | scan-meta | commit=`{hash}`, date=`{YYYY-MM-DD}` |
   | 涵蓋範圍 | Entity / DTO / Service / Controller |

   ### 關鍵結構摘要
   - **Entity**: {主要欄位、關聯}
   - **DTO**: {相關欄位}
   - **Service**: {select/relations 重點}
   - **Controller**: {相關路由}

   > ⚠️ 以上結構基於 data-flow 文件記錄的版本，若程式碼已有後續修改，以實際程式碼為準。

   ---

   ## 已知潛在問題（Data Flow）

   > 📊 來源：`prompts/6_api_data_flow/{dir}/{apiName}-data-flow.md`
   > 🎯 目標：主動修復，QA 開票前處理

   ### ❌ 需修正（{N} 項）

   | # | 類型 | 問題描述 | 位置 | 解法章節 |
   |---|------|---------|------|---------|
   | DF-1 | {類型} | {描述} | {位置} | § 解法 1 |

   ### ⚠️ 注意事項（{M} 項）

   | # | 類型 | 問題描述 | 位置 | 解法章節 |
   |---|------|---------|------|---------|
   | DF-N | {類型} | {描述} | {位置} | § 解法 N |

   ---

   ## 解法 1：{問題標題}

   ### 問題來源
   | 來源 | 需要修改 | 說明 |
   |------|----------|------|
   | 前端 | ❌/✅ | ... |
   | 後端 | ❌/✅ | ... |

   ### 後端修改
   **檔案**：`src/api/{dir}/{apiName}/{file}`
   **現有程式碼**：...
   **建議修改**：...

   ---

   ## 前端修改（{dashboard-nuxt|frontend-nuxt}）

   > 📋 來源：Data Flow 主動修復（N/A - 非 QA 開票，無 Notion 票 / Issue #）

   ### 1. {修改項目標題}
   **檔案**：`{file_path}`
   **問題**：{問題描述}
   **修改方式**：{修改建議}

   ---

   ## 驗證建議

   > 📋 供 `/check-result` 使用，因為 dpf 沒有 bug spec 指定帳號

   ### 建議驗證環境
   - **環境**：dev / staging

   ### 建議驗證帳號

   | 問題類型 | 建議帳號 | 原因 |
   |---------|---------|------|
   | 500 防護（FK/NOT NULL） | 任意帳號 | 只需觸發 DB 操作即可 |
   | 資料流斷裂（select 缺欄位） | 任意帳號 | 只需打 findOne/findAll 確認欄位 |
   | null 沒處理 | 任意帳號 | 需找到 nullable 欄位為 null 的資料 |
   | 權限相關 | 多角色帳號（admin/store/agent） | 需驗證不同角色的行為 |

   ---

   ## 修改檔案清單

   ### 後端（backend-nestjs）
   | 檔案 | 修改類型 | 說明 |
   |------|----------|------|
   | ... | ... | ... |

   ### 前端（{project}）
   | 檔案 | 修改類型 | 說明 |
   |------|----------|------|
   | ... | ... | ... |
   ```

#### 「更新模式」（對話上下文有 proposal）

1. **讀取現有 proposal 的 data-flow 問題狀態**：
   - 有「## 已知潛在問題（Data Flow）」區塊 → 從表格提取問題清單和狀態
   - 沒有此區塊 → 全部問題都需要新增

2. **為每個需補充的問題新增解法**：
   - 新增「## 解法 N：{問題標題}」區塊（含問題來源、後端修改程式碼、前端修改建議）
   - 格式與新建模式的解法區塊相同

3. **更新 proposal 現有區塊**：
   - 「## 已知潛在問題（Data Flow）」→ 補上解法章節連結（`§ 解法 N`）
   - 若無此區塊 → 新增完整區塊（含問題表格 + 解法章節）
   - 「## 修改檔案清單」→ 追加新增的修改檔案

### Step 6：檢核 Proposal

1. 依照 `review-proposal-rules.md` 檢核
2. 依照 `adminApi-architecture.md` 檢查錯誤處理模式
3. 檢核項目：
   - Service 錯誤處理模式是否符合架構
   - messageEN 是否完整
   - 欄位影響矩陣
   - **歷史文件驗證**：
     - 從 proposal 提取關鍵字（Entity 名稱、API 名稱、業務邏輯名詞）
     - rg -l "{關鍵字}" prompts/4_diary/
     - 找到 → 讀取內容、比對 proposal 是否符合歷史決策
     - 有矛盾 → 自動修正或標記 ⚠️
     - 無矛盾或沒找到 → 跳過
4. 有問題 → 自動修正後繼續

### Step 7：輸出結果

```
✅ 潛在問題修復提案已建立

📄 Proposal：{proposal_path}
📊 問題統計：❌ {N} 個、⚠️ {M} 個
📁 修改檔案：{file_count} 個

📝 修改檔案清單：
- {file_1}
- {file_2}

💡 請依序執行：
   /reviewDoc → /reviewDoc -data {env} → /implement → /check-result {env} → /gcommit-push → /fxxxf2e
```

### 結束前檢查（強制）

1. 執行 `TaskList` 確認所有 task 狀態
2. 全部 completed → 輸出結果
3. 有未完成 → 先補完成再輸出

### Step 8：更新進度表

@.claude/flowcharts/update-progress.md

執行進度表更新：將 `/dpf` 對應的步驟標記為 ✅。

## 注意事項

1. **不打遠端 API**：dpf 不做帳號驗證、不打遠端 API。驗證留給 `/check-result`
2. **不連 DB**：dpf 不連 DB 撈資料。DB 測試資料準備留給 `/reviewDoc -data`
3. **不查 PM2 日誌**：dpf 不是處理 500 錯誤，是處理潛在問題
4. **全部一個 proposal**：所有問題塞進同一個 proposal，不分流
5. **不查 ui-api-index**：data-flow 已包含「UI ↔ API 欄位對應」，資訊更完整
6. **與 /add-pi 的搭配**：dpf 獨立使用（新建模式）時不需要 /add-pi；debugP 流程中 /add-pi 先盤點問題，再由 /dpf 更新模式補上修改建議
7. **前後端欄位名不匹配的修法方向**：後端加開 alias 相容前端，保留原本參數名，不改前端。Input/Output 都要處理，同 API module 中所有同類問題統一處理。詳見下方「欄位名不匹配統一修法規則」
8. **檔案產出偵測**：Step 4 會自動掃描 module 目錄是否有檔案產出邏輯（PDF/Word/Excel），有的話一併讀取 service + template 分析，確保 proposal 涵蓋檔案產出邏輯的正確性
9. **後端優先原則**：分析修法時，先判斷後端能否解決（回傳預設值、格式化、null guard 等）。只有後端無法處理的情況（UI 邏輯、顯示格式、互動行為）才歸類為前端修改

## 欄位名不匹配統一修法規則

> 適用於 `/dpf`、`/add-pi`、`/reviewDoc` Step 1.7B 發現的「前後端欄位名不匹配」問題

### 核心原則

**後端加開 alias 相容前端，保留原本參數名。不改前端。**

### 規則說明

當 data-flow 發現前端使用的參數名與後端 DTO 定義不同時：

1. **保留後端原本的參數名**（不改、不刪）
2. **後端新增 alias 參數**，名稱與前端實際使用的一致
3. **Input 和 Output 都要處理**：
   - **Input（Request DTO）**：新增 alias 欄位，讓前端傳來的參數名也能被接收
   - **Output（Response）**：Service/Controller 回傳時同時包含原本欄位名和 alias 欄位名
4. **同一個 API module 中所有同類問題統一處理**：不只修單一 endpoint，所有用到相同參數的地方都要加 alias

### 範例

**問題**：後端 DTO 定義 `landNoSearch`，前端送 `landNumber`、GET 也用 `landNumber`

**修法**：
```typescript
// Request DTO — 保留原本 + 新增 alias
@IsOptional()
@IsString()
landNoSearch?: string    // 保留原本

@IsOptional()
@IsString()
landNumber?: string      // 新增 alias，相容前端

// Service — 合併處理
const landNoSearch = dto.landNoSearch || dto.landNumber
```

```typescript
// Response — 同時回傳兩個欄位名
return {
  ...data,
  landNumber: data.landNoSearch,  // alias，讓前端用 landNumber 也能拿到值
}
```
