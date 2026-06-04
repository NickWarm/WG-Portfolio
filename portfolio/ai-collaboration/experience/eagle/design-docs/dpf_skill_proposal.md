# dpf 設計稿

> 📅 建立日期：2026-02-08
> 📋 來源：`check_result_field_verification_gaps.md` 中的主動檢查模式缺少「生 proposal → 實作 → 驗證」後半段
> 📋 全名：Debug Potential issue and Fix

---

## 問題描述

### 現況痛點

目前有兩條流程：

**Bug Spec 驅動（被動，QA 開票後）**：
```
/exportN → /debugP → /reviewDoc → /add-pi → /review-api-flow → /reviewDoc -data → /implement → /check-result → /gcommit-push → /fxxxf2e
```

**主動檢查模式（只到發現問題）**：
```
/api-flow-architecture {apiName} → /review-api-flow {apiName} → 發現問題清單 → ???
```

主動模式到 `/review-api-flow` 產出問題清單就停了，沒有接到「生 proposal → 實作 → 驗證 → commit → 通知前端」的後半段。問題被發現了但沒有被修掉，還是要等 QA 開票才處理。

### 預期效益

- **QA 開票前就修完**：從 data-flow 的問題清單直接生 proposal，走完整修復流程
- **Reuse 現有 skill**：proposal 格式同 debugP，後續可接 `/reviewDoc` → `/implement` → `/check-result` → `/gcommit-push` → `/fxxxf2e`
- **減少 QA 工作量**：主動修掉潛在問題，QA 不用開票、不用回測

---

## 定位與分工

| Skill | 職責 | 輸入來源 |
|-------|------|----------|
| `/debugP` | 被動修 bug：從 bug spec 分析 → 生 proposal | QA 開的 bug spec |
| **`/dpf`** | **主動修 bug：從 data-flow 問題清單 → 生 proposal** | **data-flow 文件的 ❌/⚠️ 問題** |
| `/add-pi` | 將 data-flow 問題**納入既有 proposal** | 已有的 proposal + data-flow |

### /dpf 與 /add-pi 的差異

| 項目 | /dpf | /add-pi |
|------|------|---------|
| **前提** | 沒有 proposal，從零生成 | 已有 proposal（debugP 產出） |
| **觸發時機** | 主動檢查模式，QA 開票前 | Bug Fix 流程中，debugP 之後 |
| **問題來源** | data-flow 的所有問題（❌ + ⚠️） | data-flow 的問題，比對 proposal 後補充未涵蓋的 |
| **產出** | 全新的 proposal | 在既有 proposal 追加區塊 |

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` (apiName) | 是 | API module 名稱 | `transcript`、`estateSalesDetail`、`customer` |

### 使用範例

```bash
# 從 data-flow 問題清單生 proposal
/dpf transcript

# 搭配完整流程
/dpf transcript → /reviewDoc → /implement → /check-result dev → /gcommit-push → /fxxxf2e
```

---

## 問題來源

從兩個來源收集問題：

| 來源 | 說明 | 問題類型 |
|------|------|----------|
| `/api-flow-architecture` 產出 | data-flow 文件中的結構性問題 | Entity/DTO/Service/Controller 結構缺陷 |
| `/review-api-flow` 產出 | data-flow 文件中的 -c/-s/-df 檢查問題 | 前後端不對齊、資料流斷裂、500 未防護、null 沒處理 |

### 問題提取位置

從 `{apiName}-data-flow.md` 中搜尋以下區塊：

| 區塊 | 來源 skill | 問題標記 |
|------|-----------|----------|
| `## 問題清單` | review-api-flow | `### ❌` 和 `### ⚠️` |
| `## 500 防護檢查 → 500 路徑清單` | review-api-flow -c | ⚠️ 項目 |
| `## 資料流驗證 → 資料流斷點彙總` | review-api-flow -df | ❌ 和 ⚠️ 項目 |
| `-c 檢查發現的問題` | review-api-flow -c | 所有問題 |
| `-s 檢查發現的問題` | review-api-flow -s | 所有問題 |

### 問題篩選（複用 /add-pi 邏輯）

- **❌ 問題**：全部保留，不篩選
- **⚠️ 問題**：逐一判斷是否為「真正的潛在問題」
  - **排除**：前端已防護（描述含 catch/fallback/disabled/v-if 防護）
  - **排除**：無人使用（標註「無前端頁面」「前端未使用」的 API/欄位）
  - **排除**：冗餘欄位（類型為「API 回傳但前端未使用」）
  - **保留**：可能導致錯誤、500、資料不正確的問題

---

## Proposal 存放位置

```
prompts/4_diary/{apiName}_api/debug/potential-fix/
```

**命名格式**：`{MMDD}_{apiName}_potential_fix_proposal.md`

**範例**：
```
prompts/4_diary/transcript_api/debug/potential-fix/0208_transcript_potential_fix_proposal.md
prompts/4_diary/customer_api/debug/potential-fix/0208_customer_potential_fix_proposal.md
```

**設計理由**：
- 放在 `debug/` 下：與 debugP 的 proposal 同層級，方便查找
- 多一個 `potential-fix/` 子目錄：區分「QA 開票後的修復」和「主動發現的修復」
- 目錄不存在時自動建立

---

## 執行流程圖

```
/dpf {apiName} 執行流程
│
├─ 1. 【讀取 Data Flow 文件】
│   ├─ 搜尋 6_api_data_flow/adminApi/{apiName}-data-flow.md
│   ├─ 搜尋 6_api_data_flow/publicApi/{apiName}-data-flow.md
│   ├─ 找到 → 讀取文件，記錄 API 目錄（adminApi 或 publicApi）
│   └─ 找不到 → 報錯：「❌ 找不到 {apiName} 的 data-flow 文件，請先執行 /api-flow-architecture {apiName}」
│
├─ 2. 【提取問題清單】
│   ├─ 搜尋 data-flow 文件中的所有 ❌ 和 ⚠️ 問題
│   ├─ 合併去重（以「問題描述 + 位置」為唯一鍵）
│   ├─ 問題篩選（複用 /add-pi 邏輯，排除前端已防護/無人使用/冗餘欄位）
│   └─ 無任何問題 → 顯示「✅ {apiName} 的 data-flow 沒有需要處理的問題」→ 結束
│
├─ 3. 【檢查已有 Proposal】（複用 debugP Step 1.8 邏輯）
│   ├─ 搜尋 prompts/4_diary/{apiName}_api/debug/potential-fix/*_proposal.md
│   ├─ 有找到 → 讀取內容，比對哪些問題已處理、哪些是新問題
│   │   ├─ 全部已處理 → 顯示「✅ 所有問題已在既有 proposal 中處理」→ 結束
│   │   └─ 有新問題 → 只處理新問題，在輸出中標記「🆕」
│   └─ 沒找到 → 全部問題都是新的，繼續
│
├─ 4. 【讀取後端程式碼】（複用 debugP Step 5-7 分析邏輯）
│   ├─ 從 data-flow 取得 Entity/DTO/Service/Controller 結構（不用重新搜尋）
│   ├─ 讀取問題涉及的 Service 原始碼
│   ├─ 讀取問題涉及的 Controller 原始碼
│   ├─ 讀取問題涉及的 DTO 原始碼
│   ├─ 分析每個問題的修法
│   └─ 前端欄位資訊直接從 data-flow「UI ↔ API 欄位對應」區塊取得（不需額外查 ui-api-index）
│
├─ 5. 【產出 Proposal】（複用 debugP 產出格式）
│   ├─ 建立目錄：prompts/4_diary/{apiName}_api/debug/potential-fix/
│   ├─ 建立 proposal 文件
│   ├─ 包含：API Data Flow 參照區塊
│   ├─ 包含：問題清單表格（全部問題）
│   ├─ 包含：每個問題的解法（後端修改 + 前端修改建議）
│   └─ 包含：修改檔案清單
│
├─ 6. 【檢核 Proposal】（複用 debugP 檢核邏輯）
│   ├─ 檢查 Service 錯誤處理模式是否符合架構
│   ├─ 檢查 messageEN 是否完整
│   ├─ 檢查欄位影響矩陣
│   └─ 有問題 → 自動修正後繼續
│
└─ 7. 【輸出結果】
    ├─ 顯示 proposal 路徑
    ├─ 顯示問題統計（❌ N 個、⚠️ N 個）
    ├─ 顯示修改檔案清單
    └─ 提示後續流程：
        「請依序執行：
         /reviewDoc → /reviewDoc -data {env} → /implement → /check-result {env} → /gcommit-push → /fxxxf2e」
```

---

## 與 debugP 步驟對照

| debugP 步驟 | dpf 對應 | 差異說明 |
|-------------|----------|----------|
| Step 0 建立 Task 追蹤 | Step 0 建立 Task 追蹤 | 相同，使用 TaskCreate |
| Step 0.5 -f/-p 模式載入 | 不需要 | dpf 沒有 -f/-p 模式 |
| Step 1 讀取 bug spec | **Step 1 讀取 data-flow 文件** | **來源不同：bug spec → data-flow** |
| Step 1.5 多問題分流 | **Step 2 提取問題清單** | **全部塞進一個 proposal，不分流** |
| Step 1.8 檢查已有 Proposal | Step 3 檢查已有 Proposal | 相同邏輯，搜尋路徑不同 |
| Step 2 場景判斷 | 不需要 | dpf 不打遠端 API |
| Step 3 frontPage 特殊處理 | 不需要 | dpf 不處理 frontPage 特殊邏輯 |
| Step 4 500 優先處理 | 不需要 | dpf 不查 PM2 日誌 |
| Step 4.5 查 API Data Flow | **Step 1 已包含** | **data-flow 就是來源，不用額外查** |
| Step 5-7 分析與驗證 | Step 4 讀取後端程式碼 | 簡化：不需要 DB 連線，從 data-flow 結構分析修法 |
| Step 8 帳號驗證 | 不需要 | dpf 不打遠端 API 驗證 |
| Step 8.1 查前端索引表 | **不需要** | **data-flow 已包含「UI ↔ API 欄位對應」，資訊更完整** |
| Step 10 產出 proposal | Step 5 產出 Proposal | 格式相同，來源不同 |
| Step 11 歷史文件驗證 | 不需要 | data-flow 已包含歷史分析 |
| Step 12 檢核 | Step 6 檢核 Proposal | 相同邏輯 |

---

## Task 追蹤機制（強制啟用）

### Step 0: 建立進度追蹤（強制）

| Task | Subject | activeForm |
|------|---------|------------|
| 1 | 讀取 Data Flow 文件 | 讀取 Data Flow 文件中... |
| 2 | 提取問題清單 | 提取問題清單中... |
| 3 | 檢查已有 Proposal | 檢查已有 Proposal 中... |
| 4 | 讀取後端程式碼並分析修法 | 分析後端程式碼中... |
| 5 | 產出 Proposal | 撰寫 Proposal 中... |
| 6 | 檢核 Proposal | 檢核 Proposal 中... |
| 7 | 輸出結果 | 輸出結果中... |

---

## 需要讀取的檔案

| 檔案 | 用途 | 時機 |
|------|------|------|
| `prompts/6_api_data_flow/{dir}/{apiName}-data-flow.md` | 問題來源 + API 結構 + 前端欄位資訊 | Step 1 |
| `prompts/4_diary/{apiName}_api/debug/potential-fix/*_proposal.md` | 檢查已有 proposal | Step 3 |
| `backend-nestjs/src/api/{dir}/{apiName}/*.service.ts` | 分析修法 | Step 4 |
| `backend-nestjs/src/api/{dir}/{apiName}/*.controller.ts` | 分析修法 | Step 4 |
| `backend-nestjs/src/api/{dir}/{apiName}/dto/*.dto.ts` | 分析修法 | Step 4 |

### 需要引用的 Module

| Module | 用途 |
|--------|------|
| `review-proposal-rules.md` | 檢核規則 |
| `adminApi-architecture.md` | 架構規範（錯誤處理模式） |

---

## 注意事項

1. **不打遠端 API**：dpf 不做帳號驗證、不打遠端 API。驗證留給 `/check-result`
2. **不連 DB**：dpf 不連 DB 撈資料。DB 測試資料準備留給 `/reviewDoc -data`
3. **不查 PM2 日誌**：dpf 不是處理 500 錯誤，是處理潛在問題
4. **全部一個 proposal**：所有問題塞進同一個 proposal，不分流
5. **問題篩選**：複用 `/add-pi` 的篩選邏輯，排除噪音
6. **前置依賴**：必須先有 data-flow 文件（`/api-flow-architecture`），最好也跑過 `/review-api-flow`
7. **不查 ui-api-index**：data-flow 文件已包含「UI ↔ API 欄位對應」區塊，資訊比 ui-api-index 更完整（含 null 處理、狀態標記），不需要額外查前端索引表
8. **前後端欄位名不匹配的修法方向**：見下方「欄位名不匹配統一修法規則」

---

## 欄位名不匹配統一修法規則

> 📅 2026-02-08 新增
> 📋 適用於 `/dpf`、`/add-pi`、`/reviewDoc` Step 1.7B 發現的「前後端欄位名不匹配」問題

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

### 設計理由

- 前端已上線運作，改前端風險高、需要前端配合部署
- 後端加 alias 是向後相容，不影響既有功能
- 同時回傳兩個欄位名，前端無論用哪個都能拿到值

---

## 後續 Skill 銜接分析（2026-02-08）

> 📋 逐一檢查 dpf 產出的 proposal 能否被後續每個 skill 正確消費

### 銜接問題與調整

#### 問題 1：/reviewDoc Step 1.7B 會誤報「建議執行 /add-pi」

**現況**：`/reviewDoc` Step 1.7B 的「已知問題覆蓋檢核」會檢查 proposal 是否有「## 已知潛在問題（Data Flow）」區塊（`/add-pi` 的產出格式）。dpf 的問題已經在「## 問題清單」和各「## 解法 N」中，但用的是不同區塊名稱。

**結果**：reviewDoc 看到 data-flow 有 ❌ 問題，但 proposal 沒有「## 已知潛在問題（Data Flow）」區塊 → 誤報警告。

**調整**：dpf 的 proposal 也加上「## 已知潛在問題（Data Flow）」區塊，格式與 `/add-pi` 產出相同。這樣 reviewDoc 不用改。

**調整位置**：dpf 設計稿（Proposal 輸出格式）

#### 問題 2：Data Flow 流程不需要 /add-pi

**現況**：Bug Fix 流程中 `/add-pi` 是因為 debugP 只看 bug spec 不看 data-flow，需要額外補充。dpf 本身就是從 data-flow 問題生成 proposal，問題已經全部納入。

**調整**：在 Data Flow 驅動流程中明確標示跳過 `/add-pi`。

**調整位置**：dpf 設計稿（完整流程圖）

#### 問題 3：/check-result 帳號識別 — dpf 沒有指定帳號

**現況**：`/check-result` Step 2.5「帳號智能識別」從對話上下文識別帳號。debugP 有 bug spec 說「某帳號有問題」，但 dpf 沒有。

**結果**：check-result 不知道要用哪些帳號驗證。

**調整**：dpf 的 proposal 加上「## 驗證建議」區塊，根據問題類型建議驗證帳號和環境。

**調整位置**：dpf 設計稿（Proposal 輸出格式）

#### 問題 4：/fxxxf2e 找不到 Notion 票和 Issue #

**現況**：`/fxxxf2e` Step 2 從 proposal 提取「對應 Issue #N」和 Notion 票 URL。dpf 沒有 Notion 票、沒有 Issue #N。

**結果**：fxxxf2e 找不到這些欄位，可能報錯或產出不完整。

**調整（兩邊都改）**：
- **dpf 設計稿**：proposal 的前端修改區塊中，Notion 票和 Issue # 欄位標記「N/A - 主動修復，非 QA 開票」
- **fxxxf2e 定義檔**：看到 Notion 票 / Issue # 為 N/A 時，跳過對應欄位，罐頭留言改為「主動修復」版本

**調整位置**：dpf 設計稿 + fxxxf2e 定義檔

### 不需要調整的 Skill

| Skill | 原因 |
|-------|------|
| `/reviewDoc`（除 1.7B 外） | Step 1.5 有「## API Data Flow 參照」✅；Step 3 自動驗證 ✅；格式相容 ✅ |
| `/reviewDoc -data` | 從「## API Data Flow 參照」取得 data-flow 路徑 ✅ |
| `/implement` | 從對話上下文取 proposal，讀取修改項目後實作 ✅ |
| `/check-result`（除帳號外） | 非 bug fix 場景不需要 bug spec ✅；proposal 格式相容 ✅ |
| `/gcommit-push` | $1 = proposal 路徑 ✅；找不到 bug spec 時跳過索引更新 ✅；scan-meta 更新不依賴 bug spec ✅ |

---

## Proposal 輸出格式（更新版）

> 📋 根據銜接分析，新增「已知潛在問題（Data Flow）」和「驗證建議」區塊

```markdown
# {apiName} 潛在問題修復提案

> 📅 {YYYY-MM-DD}
> 🔍 來源：Data Flow 主動檢查（非 QA 開票）
> 📊 問題數量：❌ {N} 個、⚠️ {M} 個

## API Data Flow 參照

| 項目 | 內容 |
|------|------|
| 文件路徑 | `prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md` |
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

> 📊 來源：`prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md`
> 🎯 目標：主動修復，QA 開票前處理

### ❌ 需修正（{N} 項）

| # | 類型 | 問題描述 | 位置 | 解法章節 |
|---|------|---------|------|---------|
| DF-1 | 500 未防護 | storeId FK 沒有前置查詢 | bid.service.ts | § 解法 1 |
| DF-2 | 資料流斷裂 | agentName 在 select 中缺失 | bid.service.ts | § 解法 2 |

### ⚠️ 注意事項（{M} 項）

| # | 類型 | 問題描述 | 位置 | 解法章節 |
|---|------|---------|------|---------|
| DF-3 | null 沒處理 | store 被 softDelete 時 storeName 為 null | bid.service.ts | § 解法 3 |

---

## 解法 1：storeId FK 沒有前置查詢

### 問題來源
| 來源 | 需要修改 | 說明 |
|------|----------|------|
| 前端 | ❌ | 前端已正確送 storeId |
| 後端 | ✅ | Service 缺少 FK 前置查詢 |

### 後端修改

**檔案**：`src/api/adminApi/bid/bid.service.ts`

**現有程式碼**：
```typescript
// 直接使用 storeId，沒有檢查 store 是否存在
```

**建議修改**：
```typescript
// 加入 FK 前置查詢
if (dto.storeId) {
  const store = await this.storeRepository.findOne({ where: { id: dto.storeId } })
  if (!store) {
    return {
      success: false,
      message: '找不到指定的店家',
      messageEN: 'Store not found',
    }
  }
}
```

---

## 解法 2：agentName 在 select 中缺失

### 問題來源
| 來源 | 需要修改 | 說明 |
|------|----------|------|
| 前端 | ❌ | 前端已使用 agentName 欄位 |
| 後端 | ✅ | Service select 缺少 agent 關聯 |

### 後端修改
...

---

## 前端修改（{dashboard-nuxt|frontend-nuxt}）

> 若有前端需要修改的項目，統一放在此區塊
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
| `src/api/adminApi/bid/bid.service.ts` | 修改 | 加入 FK 前置查詢 + select 補欄位 |

### 前端（{project}）
| 檔案 | 修改類型 | 說明 |
|------|----------|------|
| `pages/bid/index.vue` | 修改 | 處理 storeName null 顯示 |
```

---

## 完整 Data Flow 驅動流程（更新版）

> 📋 根據銜接分析，明確標示跳過 /add-pi

```
Data Flow 驅動的完整流程（QA 開票前主動修復）
│
├─ 前置：/api-flow-architecture {apiName}（建立後端結構文件）
├─ 前置：/review-api-flow {apiName}（前後端對齊檢查，產出問題清單）
│
├─ 1. /dpf {apiName}（🆕 從問題清單生 proposal）
│
├─ 2. /reviewDoc（reuse，一般檢核）
│   └─ ⏭️ 跳過 /add-pi（dpf 已從 data-flow 納入所有問題，不需要 /add-pi 補充）
│
├─ 3. /reviewDoc -data {env}（reuse，撈 DB 測試資料）
├─ 4. /implement（reuse，實作修正）
├─ 5. /check-result {env}（reuse，驗證，帳號從 proposal「驗證建議」取得）
├─ 6. /gcommit-push（reuse，提交 + 更新 scan-meta）
└─ 7. /fxxxf2e（reuse，通知前端，Notion 票 / Issue # 標記 N/A）
```

### 與 Bug Spec 驅動流程的對比（更新版）

| 項目 | Bug Spec 驅動 | Data Flow 驅動 |
|------|--------------|----------------|
| 觸發時機 | QA 開票後（被動） | 主動檢查（QA 開票前） |
| 問題來源 | bug spec | data-flow 問題清單 |
| 生 proposal 的 skill | `/debugP` | `/dpf` |
| /add-pi | 需要（補充 data-flow 問題） | **不需要**（dpf 已納入） |
| /review-api-flow | 在 /add-pi 之後 | 在 /dpf **之前**（是問題來源） |
| 後續流程 | `/reviewDoc` → `/implement` → ... | 相同，完全 reuse |
| 產出位置 | `debug/{MMDD}_{N}_*_proposal.md` | `debug/potential-fix/{MMDD}_{apiName}_*_proposal.md` |
| 前端通知 | `/fxxxf2e`（有 Notion 票） | `/fxxxf2e`（Notion 票 = N/A） |
| 驗證帳號 | bug spec 指定 | proposal「驗證建議」區塊 |

---

## 需要連動調整的其他 Skill

| Skill | 調整內容 | 優先級 |
|-------|---------|--------|
| `/fxxxf2e` | 看到 Notion 票 / Issue # 為 N/A 時，跳過對應欄位，罐頭留言改為「主動修復」版本 | 中（dpf 實作後再改） |

### /fxxxf2e 調整細節

**現況**：Step 2 從 proposal 提取「對應 Issue #N」和 Notion 票 URL，找不到會報錯或產出不完整。

**調整**：
1. 搜尋 Notion 票 / Issue # 時，若值為 `N/A` 或找不到 → 標記為「主動修復」模式
2. 罐頭留言改為：
```
📋 罐頭留言（主動修復版）：
────────────────────────────────────
後端主動修復已進 dev/staging，commit `{hash}`
來源：Data Flow 主動檢查（非 QA 開票）
前端修改建議請參考：{frontend_fix_path}

📍 本次新增：第 {start_line} 行 ~ 第 {end_line} 行
────────────────────────────────────
```

---

## 實作狀態

- [x] 設計討論（2026-02-08）
- [x] 設計稿完成
- [x] 後續 Skill 銜接分析完成（4 個調整項目）
- [x] 建立流程圖（`dpf_flowchart.md`）（2026-02-08）
- [x] 建立定義檔（`dpf.md`）（2026-02-08）
- [x] 調整 `/fxxxf2e` 定義檔（支援 N/A 模式）（2026-02-08）
- [ ] 測試驗證
- [ ] 更新模式實作（2026-02-10）

---

### 2026-02-09 設計變更：新增最終步驟「更新進度表」

**變更內容**：在 skill 最後步驟完成後，自動執行 `@.claude/flowcharts/update-progress.md` 共用模組，將 proposal 進度表中 `/dpf` 對應的行標記為 ✅。

**設計背景**：見 `showFlow_skill_proposal.md`「2026-02-09 設計變更」。

**影響**：
- 流程圖：最後節點後新增「更新進度表」
- 定義檔：最後 Step 後新增引用 `@.claude/flowcharts/update-progress.md`
- TaskCreate：如有，新增一行

---

### 2026-02-10 設計變更：新增「更新模式」（支援已有 Proposal 的 data-flow 修法補充）

**變更動機**：

目前 Bug Spec 驅動流程中，data-flow 潛在問題的處理存在分析深度不足的問題：

| 步驟 | 做什麼 | 不足 |
|------|--------|------|
| `/debugP` | 針對 bug spec 分析，產出 proposal | 只處理同事提報的問題，不分析 data-flow |
| `/add-pi` | 把 data-flow 問題加入 proposal | 只有輕量描述，**不讀原始碼**分析修法 |

缺少一個步驟來為 data-flow 問題提供**程式碼級別**的修改建議。`/dpf` 本身就有讀原始碼分析修法的能力（Step 4），只需讓它支援「更新現有 proposal」即可。

**變更內容**：

#### Step 3 調整：從對話上下文判斷執行模式

```
├─ 3. 【判斷執行模式】
│   ├─ 對話上下文有 proposal 路徑（剛跑完 /debugP 或 /add-pi）
│   │   └─ 進入「更新模式」
│   │       ├─ 讀取現有 proposal
│   │       ├─ 比對 Step 2 問題清單 vs proposal 現有內容
│   │       │   ├─ 已有解法 → 跳過
│   │       │   └─ 只有問題描述（/add-pi 加的）或完全沒有 → 標記需補充
│   │       └─ 全部已有解法 → 顯示「✅ 所有 data-flow 問題已有修改建議」→ 結束
│   └─ 對話上下文沒有 proposal
│       ├─ 搜尋 potential-fix/ 目錄（現有邏輯）
│       ├─ 有找到 → 比對問題（現有邏輯）
│       └─ 沒找到 → 全部新問題 →「新建模式」
```

#### Step 5 調整：依模式產出或更新

```
├─ 5. 【產出/更新 Proposal】
│   ├─ 「新建模式」→ 建立新 proposal（現有邏輯不變）
│   └─ 「更新模式」→ 更新現有 proposal
│       ├─ 無「## 已知潛在問題（Data Flow）」→ 新增區塊 + 解法
│       ├─ 有區塊但問題缺解法 → 為每個問題新增「## 解法 N」（含程式碼修改）
│       ├─ 更新問題表格（補上解法章節連結）
│       └─ 更新「## 修改檔案清單」追加新增的修改檔案
```

#### 注意事項 6 調整

原：「Data Flow 流程不需要 /add-pi：dpf 已從 data-flow 納入所有問題，後續跳過 /add-pi」

改為：「dpf 獨立使用（新建模式）時不需要 /add-pi；debugP 流程中 /add-pi 先盤點問題，再由 /dpf 更新模式補上修改建議」

#### 更新後的 Bug Spec 驅動流程（含 data-flow 問題修復）

```
Bug Spec 驅動（含 data-flow 問題修復）
│
├─ /debugP {env} {bug-spec}      ← 處理 bug，產出 proposal
├─ /add-pi                        ← 盤點 data-flow 問題，加入 proposal（輕量）
├─ /dpf {apiName}                 ← 【更新模式】讀程式碼，補上修改建議
├─ /reviewDoc                     ← 檢核完整 proposal
├─ /reviewDoc -data {env}         ← 撈 DB 驗證資料
├─ /implement                     ← 實作
├─ /check-result {env}            ← 驗證
├─ /gcommit-push                  ← 提交
└─ /fxxxf2e                       ← 通知前端
```

#### 與現有流程的對比

| 流程 | /add-pi | /dpf 模式 | data-flow 問題分析深度 |
|------|---------|-----------|----------------------|
| Data Flow 驅動（獨立） | 不需要 | 新建模式 | ✅ 完整（讀原始碼） |
| Bug Spec 驅動（舊） | 跑 /add-pi | 不跑 /dpf | ⚠️ 輕量（只有描述） |
| **Bug Spec 驅動（新）** | **跑 /add-pi** | **更新模式** | **✅ 完整（讀原始碼）** |

**影響**：
- 流程圖：Step 3 和 Step 5 增加更新模式分支
- 定義檔：Step 3 和 Step 5 增加更新模式邏輯、注意事項 6 調整
- 設計稿「/dpf 與 /add-pi 的差異」表格需更新
- 設計稿「完整 Data Flow 驅動流程」和「Bug Spec 驅動流程」需更新

---

### 2026-02-12 設計變更：Step 4 擴充「檔案產出邏輯」分析

**變更動機**：

estateSalesDetail 的 PDF 欄位資料正確性問題，是用戶提醒後才發現的。根本原因是 `/dpf` Step 4 只讀 Web API 的 `*.service.ts` / `*.controller.ts` / `dto/*.dto.ts`，不會偵測 module 是否有檔案產出 service（PDF/Word），導致 proposal 完全不涵蓋檔案產出邏輯，後續 reviewDoc 也無從檢核。

**盤點 adminApi 會產出檔案的 module**：

| Module | 產出格式 | 技術 | 關鍵檔案 |
|--------|---------|------|----------|
| estateSalesDetail | PDF | Puppeteer + Handlebars template | `estateSalesDetail.pdf.service.ts` |
| informationSheet | Word (docx) | `docx-templates` + `docx-merger` | `informationSheet.service.ts`（內含 template 路徑、資料轉換） |

> ℹ️ exportList2（CSV 匯出）由其他同事負責，不納入此偵測範圍

**共同點**：兩種都有「資料 → 檔案格式轉換」的中間層，而目前 dpf 完全沒碰這一層。

**變更內容**：

#### Step 4 擴充：偵測並分析檔案產出邏輯

在現有 Step 4「讀取後端程式碼並分析修法」中，新增子步驟：

```
├─ 4. 【讀取後端程式碼並分析修法】
│   ├─ （現有）從 data-flow 取得 Entity/DTO/Service/Controller 結構
│   ├─ （現有）讀取 Service / Controller / DTO 原始碼
│   ├─ （現有）分析每個問題的修法
│   │
│   ├─ 🆕 4.5 【檔案產出偵測】
│   │   ├─ 掃描 module 目錄，偵測是否有檔案產出邏輯
│   │   │   > ℹ️ Grep = Claude Code tool（底層為 rg）、Glob = Claude Code tool（底層為 fast-glob）
│   │   │   ├─ Grep service 中: `puppeteer|generatePdf` → PDF 產出
│   │   │   ├─ Grep service 中: `docx-templates|docx-merger` → Word 產出
│   │   │   ├─ Grep service 中: `exceljs|xlsx` → Excel 產出（未來擴充）
│   │   │   └─ Glob: `templates/**` → template 檔案（.html/.hbs/.docx）
│   │   │
│   │   ├─ 沒有檔案產出 → 跳過，繼續 Step 5
│   │   │
│   │   └─ 有檔案產出 → 進入 4.6
│   │
│   └─ 🆕 4.6 【檔案產出欄位分析】
│       ├─ 讀取檔案產出 service 原始碼
│       ├─ 讀取 template 檔案（若有）
│       ├─ 識別資料來源（從哪個 Web Service method 取資料）
│       ├─ 比對：Web API response 欄位 vs 檔案產出使用的欄位
│       │   ├─ PDF：template 中的 Handlebars 變數 vs prepareTemplateData 回傳
│       │   └─ Word：docx template 變數 vs 扁平化轉換函數回傳
│       ├─ 發現不一致 → 標記為問題，納入 proposal 解法
│       └─ 無問題 → 在 proposal 記錄「已檢查檔案產出，無問題」
```

#### Proposal 輸出格式擴充

在「## 修改檔案清單」中，新增「檔案產出」分類：

```markdown
### 檔案產出（{format}）
| 檔案 | 修改類型 | 說明 |
|------|----------|------|
| `src/api/adminApi/{module}/{file}` | 修改 | {說明} |
```

#### 注意事項新增

8. **檔案產出偵測**：Step 4 會自動掃描 module 目錄是否有檔案產出邏輯（PDF/Word/Excel），有的話一併讀取 service + template 分析，確保 proposal 涵蓋檔案產出邏輯的正確性

**影響**：
- 流程圖：Step 4 新增 4.5 + 4.6 子步驟
- 定義檔：Step 4 新增檔案產出偵測邏輯 + 注意事項 9
- TaskCreate：Task 4 description 更新為「讀取後端程式碼並分析修法（含檔案產出偵測）」

**實作狀態**：
- [x] 設計討論（2026-02-12）
- [x] 記錄到 dpf 設計稿（2026-02-12）
- [ ] 更新 `dpf.md` 定義檔
- [ ] 更新 `dpf_flowchart.md` 流程圖
- [ ] 測試驗證

---

### 2026-02-12 設計變更：Step 4.6 擴充「檔案產出欄位風險分析」

**變更動機**：

informationSheet 的 Word 產出在 `/check-result` 才發現 5 個內容問題（E-1/E-2/F-1/G-1/G-2），以及空白欄位（DB 無資料）。根本原因是 Step 4.6 只做「程式碼層面」的欄位比對（template 變數有沒有對應的 prepareWordData key），**沒有追溯到 Entity 欄位的 nullable 狀態**，也沒有標記「哪些 template 變數可能因為 DB 無資料而空白」。

**問題分析**：

| 現有 Step 4.6 做的 | 缺少的 |
|-------------------|--------|
| template 變數 vs 扁平化轉換函數回傳 | template 變數 → Entity 欄位的 nullable 追溯 |
| 發現不一致 → 標記問題 | nullable 欄位沒有 fallback → 標記風險 |
| 無問題 → 記錄「已檢查」 | 產出「檔案產出欄位風險表」供後續 skill 消費 |

**變更內容**：

在 Step 4.6 之後新增 Step 4.6.5：

```
├─ 4.6.5 🆕 【檔案產出欄位風險分析】
│   ├─ 從 Step 4.6 取得所有 template 變數清單
│   ├─ 逐一追溯每個變數的資料來源
│   │   ├─ 扁平化轉換函數中的 key → 對應的 DTO/Entity 欄位
│   │   ├─ 關聯深度（如 realEstate.store.name → 2 層關聯）
│   │   └─ Entity 欄位的 nullable 狀態（從 data-flow 取得）
│   │
│   ├─ 風險判斷
│   │   ├─ nullable 欄位 + 轉換函數有 fallback（?? ''、|| ''）→ ✅ 安全
│   │   ├─ nullable 欄位 + 轉換函數沒有 fallback → ⚠️ 風險（可能空白）
│   │   ├─ FK 關聯 + 關聯可能不存在 → ⚠️ 風險（整組欄位空白）
│   │   └─ 必填欄位 → ✅ 安全
│   │
│   └─ 產出「## 檔案產出欄位風險表」寫入 proposal
│       ├─ 供 /reviewDoc -data 推導檔案產出 cases
│       └─ 供 /check-result 驗證檔案內容
```

**Proposal 新增區塊格式**：

```markdown
## 檔案產出欄位風險表

> 📋 供 `/reviewDoc -data` 和 `/check-result` 使用
> 🎯 追溯 template 變數 → Entity 欄位 → nullable 狀態

| # | Template 變數 | 資料來源 | Entity 欄位 | nullable | 有 fallback | 風險 |
|---|--------------|---------|-------------|----------|------------|------|
| 1 | storeName | re.store.name | store.name | ✅ (FK nullable) | ❌ | ⚠️ 可能空白 |
| 2 | ownerName | re.ownerName | realEstate.ownerName | ❌ (NOT NULL) | - | ✅ 安全 |
| 3 | parkingArea | re.legalAttr.parkingArea | realEstateLegalAttribute.parkingArea | ✅ (nullable) | ✅ (?? '') | ✅ 安全 |

### ⚠️ 風險欄位摘要（{N} 個）

| # | 變數 | 風險原因 | 建議處理 |
|---|------|---------|---------|
| 1 | storeName | FK nullable，store 可能不存在 | 加 fallback 或在 proposal 解法中處理 |
```

**與後續 skill 的銜接**：

| 消費者 | 如何使用風險表 |
|--------|-------------|
| `/reviewDoc -data` | 為 ⚠️ 風險欄位推導「有值 case + 空白 case」，撈 DB 找測試資料 |
| `/check-result` | 用測試資料驗證檔案內容，確認風險欄位的實際表現 |

**影響**：
- 流程圖：Step 4.6 後新增 4.6.5
- 定義檔：Step 4 新增 4.6.5 邏輯
- TaskCreate：Task 4 description 更新為「讀取後端程式碼並分析修法（含檔案產出偵測 + 欄位風險分析）」

**實作狀態**：
- [x] 設計討論（2026-02-12）
- [x] 記錄到 dpf 設計稿（2026-02-12）
- [x] 更新 `dpf.md` 定義檔（2026-02-12 /updateDesign）
- [x] 更新 `dpf_flowchart.md` 流程圖（2026-02-12 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-12 設計變更：Step 4 新增「後端優先原則」

**變更動機**：

directMail 的 `/dpf` 分析出 storeData 可能為 null，AI 將它歸類為「前端修改」（加 optional chaining），但實際上後端可以在 `assembleResponse` 回傳預設值物件而非 null，前端完全不用改。

根本原因是 Step 4「分析每個問題的修法」只判斷「問題來源是前端還是後端」，但**沒有「後端能處理就後端處理」的優先原則**。導致 AI 看到「前端會 crash」就歸類為前端修改，而不是先問「後端能不能防止 crash」。

**問題分析**：

| 現有邏輯 | 缺少的 |
|---------|--------|
| 判斷「問題表現在哪裡」（前端 crash → 前端問題） | 判斷「問題能在哪裡解決」（後端回預設值 → 後端解） |
| 問題來源表格：前端 ✅ / 後端 ❌ | 應該是：前端 ❌ / 後端 ✅（後端回預設值即可） |

**變更內容**：

#### 新增規則：後端優先原則

在 Step 4「分析每個問題的修法」加入判斷原則：

```
├─ 4. 【讀取後端程式碼並分析修法】
│   ├─ （現有）從 data-flow 取得結構
│   ├─ （現有）讀取原始碼
│   ├─ 🆕 【後端優先原則】分析每個問題時：
│   │   ├─ 1. 先問：後端能否解決？
│   │   │   ├─ 回傳預設值物件（而非 null）→ 後端解
│   │   │   ├─ 格式化/轉換欄位值 → 後端解
│   │   │   ├─ 加 null guard / fallback → 後端解
│   │   │   ├─ 加欄位到 response → 後端解
│   │   │   └─ 以上都不適用 → 才考慮前端
│   │   ├─ 2. 前端才該做的事（後端無法替代）：
│   │   │   ├─ UI 互動邏輯（v-if/v-show、disabled 狀態）
│   │   │   ├─ 前端路由/導航邏輯
│   │   │   ├─ 前端狀態管理（store/composable）
│   │   │   └─ 純顯示格式（CSS、排版、i18n）
│   │   └─ 3. 問題來源表格判斷：
│   │       ├─ 後端能解 → 前端 ❌ / 後端 ✅
│   │       └─ 只有前端能解 → 前端 ✅ / 後端 ❌
│   ├─ （現有）分析每個問題的修法
│   ├─ （現有）4.5 檔案產出偵測
│   └─ （現有）4.6 + 4.6.5 檔案產出欄位分析
```

#### 典型案例

| 問題 | 錯誤歸類 | 正確歸類 | 原因 |
|------|---------|---------|------|
| storeData 為 null，前端取屬性 TypeError | 前端加 `?.` | 後端回預設值物件 `{ id: null, companyName: '', ... }` | 後端 assembleResponse 可回預設值 |
| road 為 null，前端顯示空白 | 前端加 `v-if` | 後端回 `roadName: ''`（已在 assembleResponse 做） | 後端已有此 pattern |
| decimal 回 string "468.00" | 前端 parseFloat | 後端 DTO @Transform | 後端能在 response 層處理 |
| 表單送出按鈕的 disabled 條件 | — | 前端 ✅ | 純 UI 互動，後端無法替代 |

#### 注意事項新增

9. **後端優先原則**：分析修法時，先判斷後端能否解決（回傳預設值、格式化、null guard 等）。只有後端無法處理的情況（UI 邏輯、顯示格式、互動行為）才歸類為前端修改

**影響**：
- 流程圖：Step 4 新增「後端優先原則」判斷節點
- 定義檔：Step 4 修法分析加入判斷邏輯 + 注意事項 9
- Proposal 產出：前端修改項目預期大幅減少

**實作狀態**：
- [x] 設計討論（2026-02-12）
- [x] 記錄到 dpf 設計稿（2026-02-12）
- [x] 更新 `dpf.md` 定義檔（2026-02-12 /updateDesign）
- [x] 更新 `dpf_flowchart.md` 流程圖（2026-02-12 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-13 設計變更：新增 Step 4.7「額外檢查：分頁預設值」

**變更動機**：

所有 findAll/list endpoint 的分頁預設值應為 10 筆。dpf 是 data-flow 問題清單驅動，分頁預設值不一定在問題清單裡，所以需要作為「額外檢查」，獨立於問題清單。

**變更內容**：

#### Step 4.7 額外檢查：分頁預設值

在 Step 4.6.5 之後、Step 5 之前新增：

```
├─ 4. 【讀取後端程式碼並分析修法】
│   ├─ （現有 4.1 ~ 4.6.5...）
│   └─ 🆕 4.7 【額外檢查：分頁預設值】（獨立於問題清單）
│       ├─ 分析 findAll/list endpoint 時，檢查 DTO 的 pageSize/limit 預設值
│       ├─ 不是 10 → 納入問題清單，產出修改建議（@Transform default 10）
│       └─ 是 10 → 跳過
```

**適用**：所有 dpf 執行（不分模式）

**不衝突原因**：4.7 獨立於問題清單，不影響 4.5/4.6/4.6.5 的檔案產出偵測流程。

**影響**：
- 流程圖：Step 4 末尾新增 4.7 節點
- 定義檔：Step 4 新增額外檢查邏輯

**實作狀態**：
- [x] 設計討論（2026-02-13）
- [x] 記錄到 dpf 設計稿（2026-02-13）
- [x] 更新 `dpf.md` 定義檔（2026-02-13 /updateDesign）
- [x] 更新 `dpf_flowchart.md` 流程圖（2026-02-13 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-13 設計變更：Step 6 新增「歷史文件驗證」

**變更動機**：

dpf 產出的 proposal 也需要比對 `prompts/4_diary/` 歷史文件紀錄，確保不與過去的設計決策矛盾。debugP 已有 Step 7.1 歷史文件驗證，dpf 的 Step 6「檢核 Proposal」也應加入相同機制。

**變更內容**：

#### Step 6 新增：歷史文件驗證

在現有 Step 6 檢核項目之後新增：

```
├─ 6. 【檢核 Proposal】
│   ├─ 讀取 review-proposal-rules.md
│   ├─ 讀取 adminApi-architecture.md
│   ├─ 檢查 Service 錯誤處理模式是否符合架構
│   ├─ 檢查 messageEN 是否完整
│   ├─ 檢查欄位影響矩陣
│   ├─ 🆕 歷史文件驗證
│   │   ├─ 從 proposal 提取關鍵字（Entity 名稱、API 名稱、業務邏輯名詞）
│   │   ├─ rg -l "{關鍵字}" prompts/4_diary/
│   │   ├─ 找到 → 讀取內容、比對 proposal 是否符合歷史決策
│   │   ├─ 有矛盾 → 自動修正或標記 ⚠️
│   │   └─ 無矛盾或沒找到 → 跳過
│   └─ 有問題 → 自動修正後繼續
```

**適用**：所有 dpf 執行

**與 debugP / reviewDoc 的關係**：

| Skill | 歷史文件驗證位置 | 角色 |
|-------|----------------|------|
| debugP | Step 7.1（已有，不改） | 生產端 |
| dpf | Step 6（🆕 新增） | 生產端 |
| reviewDoc | Step 12（🆕 新增） | 品質關卡 |

三者互補：debugP/dpf 產出時比對 → reviewDoc 檢核時再次確認。

**影響**：
- 流程圖：Step 6 新增「歷史文件驗證」子項
- 定義檔：Step 6 新增歷史文件驗證邏輯

**實作狀態**：
- [x] 設計討論（2026-02-13）
- [x] 記錄到 dpf 設計稿（2026-02-13）
- [x] 更新 `dpf.md` 定義檔（2026-02-13 /updateDesign）
- [x] 更新 `dpf_flowchart.md` 流程圖（2026-02-13 /updateDesign）
- [ ] 測試驗證
