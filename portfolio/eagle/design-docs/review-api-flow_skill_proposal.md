# review-api-flow 設計稿

> 📅 建立日期：2026-02-07
> 📋 來源：`check_result_field_verification_gaps.md` 中的獨立 Skill 設計

---

## 問題描述

目前 `/reviewDoc -c/-s/-df` 綁在 debug 流程中，有兩個限制：

| 限制 | 說明 |
|------|------|
| **必須有 proposal** | `-c/-s/-df` 預期已跑過 `/reviewDoc`，需要 proposal 作為上下文 |
| **被動觸發** | 只在 debug 流程中使用，無法主動對任何 API 做健康檢查 |

實際需求是：**給一個 API 名稱，就能直接做前後端流程對齊檢查，不需要 proposal、不需要 bug spec**。

### 現況痛點

- 每次跑 `-c/-s/-df` 都要先有 proposal，無法獨立執行
- 每張票都從零搜尋前端欄位、Service select、DTO 定義
- 沒有持久化的分析結果，無法跨票複用
- 無法在 QA 報 bug 之前主動發現問題

### 預期效益

- 傳 API 名稱就能跑，不需要 proposal / bug spec
- 用 scan-meta commit hash + git diff 判斷是否需要更新，避免重複分析
- 分析結果 merge 回 `6_api_data_flow/` 持久化文件，跨票複用
- 主動發現 select 缺欄位、FK 沒防護、null 沒處理等問題

---

## 定位與分工

| Skill | 職責 |
|-------|------|
| **api-flow-architecture** | 建立/維護**後端** API 結構文件（Entity、DTO、Service、Controller 的結構性事實） |
| **review-api-flow** | **前後端流程對齊檢查**（含 `-c/-s/-df` 邏輯），消費 api-flow-architecture 產出的文件 |

`review-api-flow` **不做**後端結構文件的建立與維護（那是 `api-flow-architecture` 的工作）。它讀取已建立的後端結構文件，搭配前端索引表做對齊檢查。

### 前置依賴

| 依賴 | 說明 | 缺少時的處理 |
|------|------|-------------|
| `api-flow-architecture` 產出 | `6_api_data_flow/{apiName}-data-flow.md` | 提示先執行 `/api-flow-architecture {apiName}` |
| 前端索引表 | `ui-api-index-dashboard.md` 或 `ui-api-index-frontend.md` | 提示先執行 `/build-ui-index` |

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` (apiName) | 是 | API module 名稱 | `transcript`、`estateSalesDetail`、`customer` |

### 使用範例

```bash
# 主動檢查模式（不需要 bug）
/review-api-flow transcript
/review-api-flow estateSalesDetail

# Bug Fix 模式（取代 /reviewDoc -c/-s/-df）
/debugP dev → proposal
/reviewDoc → 一般檢核
/review-api-flow transcript → 前後端對齊檢查
```

---

## 程式碼讀取策略（效率優先）

### 核心原則

`review-api-flow` **優先使用 data-flow 文件**，只在程式碼有變更時才讀原始碼，且只讀有變的部分。

### scan-meta 判斷流程（前後端雙軌）

`review-api-flow` 同時追蹤**後端 commit**（backend-nestjs）和**前端 commit**（dashboard-nuxt / frontend-nuxt），分別判斷是否需要更新。

#### 後端 scan-meta 判斷

| 條件 | 行為 | 讀取量 |
|------|------|--------|
| data-flow 文件不存在 | 報錯，提示先執行 `/api-flow-architecture` | 無 |
| scan-meta commit == backend HEAD（無變更） | **不讀任何後端程式碼**，直接用 data-flow | 最低 |
| scan-meta commit != backend HEAD（有變更） | git diff 分類變更，**只讀有變的檔案**，更新 data-flow | 最小必要 |

#### 前端 scan-meta 判斷

| 條件 | 行為 | 讀取量 |
|------|------|--------|
| data-flow 無 `-c` 區塊（首次執行） | 完整讀取前端 Vue 檔案，執行 -c 檢查 | 正常 |
| frontend-commit == 前端索引表 commit（前端無變更） | 看後端是否有變更（見下方組合判斷） | 視情況 |
| frontend-commit != 前端索引表 commit（前端有變更） | 用 git diff 找出該 API 的 Vue 檔案是否有變更 | 視情況 |

#### 前端變更偵測細節

```bash
# 從 data-flow 文件的 -c 區塊提取 frontend-commit（上次記錄的前端 commit）
# 從前端索引表提取掃描版本 commit（目前可用的前端版本）
# 比對兩者是否一致

# 如果不一致，用 git diff 確認該 API 相關的 Vue 檔案是否有變更
# 注意：比對的是兩個前端 commit 之間的差異，不是用 HEAD
git -C {dashboard-nuxt|frontend-nuxt} diff --name-only {old-frontend-commit}..{new-frontend-commit} -- {vue-file-paths-from-index}
```

**-c 檢查的組合判斷**（前端 + 後端一起看）：

| 前端 Vue 變更 | 後端變更 | 行為 |
|-------------|---------|------|
| 無（commit 相同） | 無 | ⏭️ 完全跳過 -c，直接用現有結果 |
| 無（commit 相同） | 有（DTO/Service 等） | 🔄 用新後端結構 + data-flow 已有的 UI 欄位清單重跑比對（不重讀 Vue） |
| 有（Vue 檔案有變） | 無 | 🔄 重讀 Vue 檔案 + 現有後端結構重跑 -c |
| 有（Vue 檔案有變） | 有 | 🔄 重讀 Vue 檔案 + 新後端結構，完整重跑 -c |
| commit 不同但 Vue 沒變 | 無 | ⏭️ 更新 frontend-commit，跳過 -c 重跑 |
| commit 不同但 Vue 沒變 | 有 | 🔄 用新後端結構 + data-flow 已有的 UI 欄位清單重跑比對（不重讀 Vue） |

### 後端變更偵測與分類

```bash
# 從 data-flow 文件提取 scan-meta commit hash
# 比對上次 commit 到現在，{apiName}/ 目錄下有哪些檔案變更
git -C backend-nestjs diff --name-only {last-commit}..HEAD -- src/api/**/{apiName}/
```

**分類變更 → 只讀對應檔案**：

| 變更檔案 | 需要讀取 | 影響的對齊檢查 |
|---------|---------|---------------|
| `*.entity.ts` | 只讀變更的 Entity | -c（欄位對應）、-df（資料流） |
| `*.dto.ts` | 只讀變更的 DTO | -c（欄位對應）、-df（資料流） |
| `*.service.ts` | 只讀變更的 Service | -df（select/relations）、-c（500 防護） |
| `*.controller.ts` | 只讀變更的 Controller | -c（路由/錯誤處理） |
| 無變更 | **不讀任何程式碼** | 全部用 data-flow 文件 |

### scan-meta 格式（擴充）

```markdown
<!-- scan-meta: commit={backend-hash}, frontend-commit={frontend-hash}, date={YYYY-MM-DD} -->
```

- `commit`：後端 backend-nestjs 的 commit hash
- `frontend-commit`：前端專案（dashboard-nuxt 或 frontend-nuxt）的 commit hash
- `date`：最後更新日期

> **注意**：`frontend-commit` 只出現在 `-c` 區塊的 scan-meta 中，因為只有 -c 檢查需要讀取前端 Vue 檔案。後端結構區塊（Entity/DTO/Service/Controller）的 scan-meta 維持原本只有 `commit` 的格式。

### 效率對比

| 方法 | Context 消耗 |
|------|-------------|
| ❌ 每次都讀所有後端 + 前端程式碼 | 高 |
| ❌ 每次都讀 data-flow + 所有程式碼 | 高 |
| ✅ 前後端都無變更 → 只讀 data-flow 文件 | 最低 |
| ✅ 只有後端變更 → 讀 data-flow + git diff 後端檔案 | 低 |
| ✅ 只有前端變更 → 讀 data-flow + git diff 前端 Vue 檔案 | 低 |
| ✅ 前後端都有變更 → 讀 data-flow + 兩邊 git diff 檔案 | 最小必要 |

---

## 核心檢查項目

### -c 檢查：UI ↔ API 欄位對應

| # | 項目 | 檢核內容 |
|---|------|----------|
| 1 | UI 欄位完整性 | 前端元件有出的欄位，API response 都有對應 |
| 2 | DTO 欄位回傳保障 | DTO 定義的欄位都能正常回傳（關聯 null、計算欄位等） |
| 3 | FK 4XX 處理 | 每個 FK 欄位都有「撈不到 → 回 4XX」的錯誤處理 |
| 4 | 500 防護 | 5 種 500 情境全部檢查（FK/NOT NULL/Unique/softDelete/undefined） |

#### -c 檢查執行細節（2026-02-08 設計變更）

**問題背景**：Step 4 執行時，AI 誤判為需要「探索性搜尋」任務，啟動了 general-purpose agent，導致卡住 17+ 分鐘。

**根本原因**：
1. 定義檔只描述「要做什麼」，沒有明確「怎麼做」
2. 前端索引表只有**操作列表**（哪個 Tab 呼叫哪個 API），沒有**實際的 UI 欄位**
3. AI 誤以為需要「搜尋前端檔案」，所以啟動了 agent

**正確執行流程**：

```
Step 3+4 合併執行流程
│
├─ 3. 【讀取前端索引表】
│   ├─ 讀取 ui-api-index-dashboard.md 或 ui-api-index-frontend.md
│   ├─ 提取該 API 對應的所有頁面/Tab/Dialog 操作
│   └─ 記錄前端檔案路徑（如 views/cases/objects/transcript-info.vue）
│
└─ 4. 【執行 -c 檢查】
    ├─ 4.1 讀取前端 Vue 檔案
    │   ├─ 使用 Read 工具讀取前端檔案（路徑已在索引表中）
    │   ├─ 分析 template 中的顯示欄位
    │   ├─ 分析 script 中的 API response 使用方式
    │   └─ 記錄所有 UI 欄位清單
    │
    ├─ 4.2 讀取 data-flow 文件
    │   ├─ 使用 Read 工具讀取 data-flow 文件
    │   ├─ 提取 Response DTO 欄位定義
    │   └─ 提取 Service 查詢結構（select/relations）
    │
    ├─ 4.3 UI 欄位完整性比對
    │   ├─ 逐一比對 UI 欄位 vs Response DTO 欄位
    │   ├─ 標記：✅ 有對應 / ❌ 缺失 / ⚠️ 可疑
    │   └─ 產出 UI ↔ API 欄位對應表
    │
    ├─ 4.4 DTO 欄位回傳保障檢查
    │   ├─ 檢查 Service 的 relations（LEFT JOIN 可能為 null）
    │   ├─ 檢查計算欄位的來源是否可靠
    │   └─ 產出 DTO 欄位回傳保障表
    │
    ├─ 4.5 500 防護檢查
    │   ├─ 從 data-flow 的 Service 區塊提取 DB 寫入操作
    │   ├─ 逐一檢查 5 種 500 情境
    │   └─ 產出 500 防護表 + 500 路徑清單
    │
    ├─ 4.6 Merge 結果到 data-flow 文件
    │   ├─ 新增/更新「## UI ↔ API 欄位對應」區塊
    │   └─ 更新 scan-meta（commit + frontend-commit + date + step=4）
    │
    └─ 4.7 Git commit
        └─ review-api-flow: {apiName} Step 4 - UI ↔ API 欄位對應檢查完成
```

**禁止行為**：
- ❌ **啟動 Task tool 的 general-purpose agent**（這是最大的問題）
- ❌ 使用 Glob/Grep 搜尋前端檔案（路徑已在索引表中，不需要搜尋）
- ❌ 使用 Task tool 的 Explore agent（這是直接的分析任務，不是探索任務）

**正確行為**：
- ✅ **直接使用 Read 工具**讀取已知路徑的前端檔案
- ✅ **直接使用 Read 工具**讀取 data-flow 文件
- ✅ **AI 自己執行分析**，不需要啟動其他 agent
- ✅ 所有檢查都在當前 session 中完成

**設計理念**：
- Step 3 已經提供了前端檔案路徑（從索引表中）
- Step 4 只需要「讀取 → 分析 → 比對 → 產出」
- 這是一個**直接的分析任務**，不是**探索性搜尋任務**
- 不需要任何 agent，AI 自己就能完成

### -s 檢查：情境分析 + 聯集比對

| # | 項目 | 檢核內容 |
|---|------|----------|
| 0 | 權限層級判斷 | 查 `permissions.constant.ts` 判斷該 API 的權限設定層級，決定是否需要檢查 dataScope 過濾 |
| 1 | UI 情境流程圖 | 從前端索引表取得所有操作，畫出文字流程圖 |
| 2 | 歷史資料流流程圖 | 從 proposal/bug spec（如有）取得修正前/後資料流 |
| 3 | 聯集比對 | 兩張流程圖取聯集，找漏掉的 response 資料 |
| 4 | 驗證 cases | 產出有值/沒值/邊界 cases（供 `/check-result` 使用） |

#### 5.0 權限層級判斷（設計決策：2026-02-07）

**問題背景**：caseStudy 的 S-5 誤判 — `-s` 檢查將「Service 沒有 dataScope 過濾」標為 ❌ 安全問題，但這是設計如此（auto-pass，僅需 JWT）。

**根因**：`-s` 定義缺乏權限架構意識，沒有區分「API 層級存取控制」和「頁面層級存取控制」。

**解法**：在 -s 檢查最前面加入權限層級判斷，先查 `permissions.constant.ts` 再決定是否標記：

```
權限層級判斷流程
│
├─ 1. 讀取 permissions.constant.ts 找到該 API 路由
│   ├─ 無該路由設定 → PermissionGuard auto-pass（僅 JWT）
│   │   └─ ✅ 不標記權限問題（設計如此）
│   │
│   ├─ 有設定但無 dataScope
│   │   └─ ℹ️ 僅路由層級權限控管，記為設計備註
│   │
│   └─ 有設定且有 dataScope
│       └─ 進入 Step 2
│
├─ 2. 檢查 Service 是否實作 dataScope 過濾
│   ├─ 有根據 req.dataScope 過濾 → ✅ 正常
│   ├─ 沒有任何過濾邏輯 → ⚠️ 需確認設計意圖
│   │   ├─ 可能原因 1：permissions.constant.ts 設定錯誤（應移除 dataScope）
│   │   ├─ 可能原因 2：Service 實作遺漏（應補上過濾邏輯）
│   │   └─ 建議與團隊確認此 API 的資料範圍設計意圖
│   └─ 用其他方式過濾（如 accessLevel）→ ⚠️ 需確認是否等價
│
└─ 3. 驗證 ROLE_DATA_SCOPE 對應（僅有 dataScope 時）
    ├─ broker → ownData（只看自己的）
    ├─ storeManager/secretary → ownStore（只看自己店的）
    └─ headquarters* → allStores（看全部）
```

**判斷邏輯依據**：
- 專案使用兩層存取控制：Route 層（PermissionGuard）+ Data 層（dataScope）
- `permissions.constant.ts` 定義哪些路由有權限檢查和 dataScope
- PermissionGuard 對沒有設定的路由 auto-pass（只需 JWT）
- 參考文件：`prompts/4_diary/role_and_permission/design/1_permission_architecture.md`

### -df 檢查：資料流鏈路驗證

| # | 項目 | 檢核內容 |
|---|------|----------|
| 1 | Request 方向 | 前端欄位 → DTO 接收 → Service 處理 → DB 寫入 |
| 2 | Response 方向 | DB 欄位 → Service select/relations → Response DTO → 前端顯示 |
| 3 | 逐情境驗證 | 搭配 -s 的情境，逐一驗證資料流是否正確傳遞 |
| 4 | 斷裂點標記 | 標記哪一層出問題（DTO 缺欄位、Service 沒 JOIN、select 漏欄位等） |

---

## 500 防護檢查（5 種情境）

| 500 情境類型 | 檢查方式 | 典型場景 |
|-------------|----------|----------|
| FK constraint violation | 每個 FK 欄位是否有前置查詢驗證 | 前端送 `storeId=999`，但 store 不存在 |
| NOT NULL constraint violation | 必填欄位是否有 DTO 驗證 + Service 補值 | 缺 `realEstateId`，DB 寫入時炸 NOT NULL |
| Unique constraint violation | 唯一欄位是否有前置查詢或 catch 處理 | 重複的 `contractNo` |
| 關聯資料 softDelete | LEFT JOIN 關聯是否可能被 soft delete | store 被 soft delete，bid.storeId 還指向它 |
| undefined/null 傳入 DB | Service 是否拿可能為空的值做 DB 操作 | 前端沒送 `contractId`，Service 拿 undefined 查 DB |

---

## 產出位置

分析結果 merge 回 `api-flow-architecture` 建立的 data-flow 文件：

```
prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md
```

### merge 的內容

| 區塊 | 來源 | 說明 |
|------|------|------|
| Entity / DTO / Service / Controller 結構 | `api-flow-architecture` 產出 | review-api-flow 不修改這些區塊 |
| UI ↔ API 欄位對應表 | `-c` 檢查產出 | 新增或更新 |
| 情境流程圖 + 聯集比對 | `-s` 檢查產出 | 新增或更新 |
| 資料流鏈路驗證表 | `-df` 檢查產出 | 新增或更新 |
| 問題清單 | 綜合產出 | 新增或更新 |

### data-flow 文件擴充結構

`review-api-flow` 在 `api-flow-architecture` 產出的文件基礎上，新增以下區塊：

```markdown
# {apiName} 資料流索引

## 基本資訊
（api-flow-architecture 產出，不動）

## Entity 結構
（api-flow-architecture 產出，不動）

## DTO 欄位定義
（api-flow-architecture 產出，不動）

## Service 查詢結構
（api-flow-architecture 產出，不動）

## Controller 路由結構
（api-flow-architecture 產出，不動）

## Module 依賴
（api-flow-architecture 產出，不動）

---

## UI ↔ API 欄位對應（review-api-flow -c 產出）

<!-- scan-meta: commit={backend-hash}, frontend-commit={frontend-hash}, date={YYYY-MM-DD} -->

### 頁面：{頁面名稱}

| UI 欄位 | 來源元件 | API response 欄位 | 狀態 |
|---------|----------|-------------------|------|
| ... | ... | ... | ... |

### 500 防護表

| DB 寫入操作 | 500 情境 | 防護方式 | 狀態 |
|------------|----------|---------|------|
| ... | ... | ... | ... |

---

## 情境分析（review-api-flow -s 產出）

<!-- scan-meta: commit={hash}, date={YYYY-MM-DD} -->

### 前端 UI 情境流程圖
（文字版流程圖）

### 聯集比對結果
（比對表格）

### 驗證 Cases
（供 /check-result 使用）

---

## 資料流驗證（review-api-flow -df 產出）

<!-- scan-meta: commit={hash}, date={YYYY-MM-DD} -->

### Request 方向（前端 → DB）
（鏈路表格）

### Response 方向（DB → 前端）
（鏈路表格）

### 逐情境驗證結果
（驗證表格）

---

## 問題清單（review-api-flow 產出）

<!-- scan-meta: commit={hash}, date={YYYY-MM-DD} -->

| # | 嚴重度 | 類型 | 問題 | 建議修正 |
|---|--------|------|------|---------|
| ... | ... | ... | ... | ... |
```

---

## 輸出格式

### 成功時

```
✅ 前後端流程對齊檢查完成

📊 檢查統計：
- API Module: {apiName}
- 後端結構更新：[是/否]（scan-meta 偵測）
- 前端 UI 更新：[是/否/跳過]（frontend-commit 偵測）
- UI 欄位對應：[N] 個欄位，[M] 個問題
- 情境分析：[N] 個情境，[M] 個遺漏
- 資料流驗證：Request [N] 條 / Response [N] 條，[M] 個斷裂點
- 500 防護：[N] 個 DB 操作，[M] 個未防護

📁 已更新檔案：
- prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md

❌ 問題清單（[N] 項）：
1. [嚴重度] [類型] 問題描述
2. ...

📌 scan-meta:
- backend commit: {hash}
- frontend commit: {hash}

[如有更新進度表]
✅ 進度表已更新並 commit
- prompts/6_api_data_flow/api-flow-progress.md
```

### 失敗時

```
❌ 找不到 {apiName} 的 API Data Flow 文件
💡 請先執行 /api-flow-architecture {apiName} 建立後端結構文件
```

```
❌ 找不到 {apiName} 的前端索引
💡 請先執行 /build-ui-index 建立前端索引表
```

---

## 需要讀取的檔案

### 必定讀取（每次執行）

| 檔案 | 用途 | 來源 |
|------|------|------|
| `prompts/6_api_data_flow/{dir}/{apiName}-data-flow.md` | 後端結構文件（核心資料來源） | api-flow-architecture 產出 |
| `prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md` | Dashboard 前端索引（提取掃描版本 commit） | build-ui-index 產出 |
| `prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md` | Frontend 前端索引（提取掃描版本 commit） | build-ui-index 產出 |

### 條件讀取 — 後端（僅後端 scan-meta commit != backend HEAD 時）

| 檔案 | 讀取條件 | 用途 |
|------|---------|------|
| `backend-nestjs/src/api/**/{apiName}/*.entity.ts` | git diff 顯示 Entity 有變更 | 更新 data-flow 的 Entity 區塊 |
| `backend-nestjs/src/api/**/{apiName}/dto/*.dto.ts` | git diff 顯示 DTO 有變更 | 更新 data-flow 的 DTO 區塊 |
| `backend-nestjs/src/api/**/{apiName}/*.service.ts` | git diff 顯示 Service 有變更 | 更新 data-flow 的 Service 區塊 |
| `backend-nestjs/src/api/**/{apiName}/*.controller.ts` | git diff 顯示 Controller 有變更 | 更新 data-flow 的 Controller 區塊 |

### 條件讀取 — 前端（僅前端 frontend-commit != 前端索引表掃描版本 commit 時）

| 檔案 | 讀取條件 | 用途 |
|------|---------|------|
| `{dashboard-nuxt\|frontend-nuxt}/views/**/*.vue` | git diff 顯示該 API 相關的 Vue 檔案有變更 | 重跑 -c 檢查（UI 欄位對應） |

---

## 與其他 Skill 的關係

### 依賴

| Skill | 關係 |
|-------|------|
| `api-flow-architecture` | 必須先執行，產出後端結構文件 |
| `build-ui-index` | 必須先執行，產出前端索引表 |

### 消費者

| Skill | 如何使用 review-api-flow 產出 |
|-------|-------------------------------|
| `/check-result` | 讀取驗證 cases 表，逐 case 執行 API 驗證 |
| `/reviewDoc -data` | 讀取驗證 cases 的 DB 查詢條件，撈測試資料 |

### scan-meta 更新時機

| 時機 | 誰更新 | 更新內容 |
|------|--------|---------|
| 執行 `/api-flow-architecture` | api-flow-architecture | 後端結構區塊的 scan-meta（`commit`） |
| 執行 `/review-api-flow` Step 2 | 本 skill | 後端結構區塊的 scan-meta（`commit`，如有變更） |
| 執行 `/review-api-flow` Step 4 | 本 skill | `-c` 區塊的 scan-meta（`commit` + `frontend-commit`） |
| 執行 `/review-api-flow` Step 5/6/7 | 本 skill | `-s/-df/問題清單` 區塊的 scan-meta（`commit`） |
| 執行 `/gcommit-push` | gcommit-push | 對應 API 的所有 scan-meta commit hash |

### 進度表更新時機

| 時機 | 誰更新 | 更新內容 |
|------|--------|---------|
| 執行 `/api-flow-architecture {apiName}` | api-flow-architecture | 更新「/api-flow-architecture {apiName}」狀態為 ✅ |
| 執行 `/review-api-flow {apiName}` | 本 skill | 更新「/review-api-flow」狀態為 ✅ + 問題統計 |

---

## 與 /reviewDoc -c/-s/-df 的遷移關係

| 項目 | 現狀（/reviewDoc -c/-s/-df） | 未來（review-api-flow） |
|------|---------------------------|------------------------|
| 觸發方式 | `/reviewDoc -c` 需要 proposal | `/review-api-flow {apiName}` 直接傳 API 名稱 |
| 前置依賴 | 需要先跑 `/reviewDoc` | 需要 api-flow-architecture + build-ui-index |
| 產出位置 | 寫在 proposal 裡 | 寫在 `6_api_data_flow/` 持久化文件 |
| 知識累積 | 每次從零分析 | scan-meta + git diff 漸進式更新 |

### 遷移策略

> 方案 A — 搬完後移除（已決定）

1. 先完成 `review-api-flow` 實作
2. 確認功能完整後，從 `/reviewDoc` 移除 `-c/-s/-df`
3. 在搬遷完成之前，`-c/-s/-df` 維持現狀可正常使用

---

## 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 設計稿完成
- [x] 建立流程圖（`review-api-flow_flowchart.md`）
- [x] 建立定義檔（`review-api-flow.md`）
- [ ] 測試驗證

---

## 2026-02-08 設計變更：自動化執行模式

### 問題描述

原本的設計是人工逐步執行 8 個步驟，每個步驟都需要人工確認和觸發下一步。這樣的流程：
- **耗時長**：需要持續關注，無法一次執行完成
- **容易中斷**：人工介入點多，容易因為其他事情中斷
- **Context 累積**：所有步驟的 context 累積到最後，可能導致 token 爆炸

### 設計決策

**核心機制**：
1. **執行前 clear**：清空對話歷史，從乾淨狀態開始
2. **Task 追蹤進度**：用 TaskCreate/TaskUpdate 追蹤執行到哪一步
3. **分段 compact**：每個步驟完成後執行 /compact，避免 context 爆炸
4. **即時持久化**：每步驟完成後立即 merge 結果到 data-flow 文件並 git commit
5. **最後不 compact**：Step 8 輸出結果後不 compact，保留完整報告

### 執行流程

```
/review-api-flow {apiName} 自動化執行流程
│
├─ 0. 【執行前準備】
│   ├─ AI 執行 clear（清空對話歷史）
│   └─ TaskCreate 建立 8 個追蹤步驟
│
├─ 1. 【解析參數並讀取 Data Flow】
│   ├─ TaskUpdate Task 1 → in_progress
│   ├─ 讀取 {apiName}-data-flow.md
│   ├─ TaskUpdate Task 1 → completed
│   └─ /compact
│
├─ 2. 【判斷是否需要更新後端結構】
│   ├─ TaskUpdate Task 2 → in_progress
│   ├─ git diff 偵測變更
│   ├─ 如有變更 → 更新後端結構區塊
│   ├─ Merge 回 data-flow 文件
│   ├─ Git commit ✅
│   ├─ TaskUpdate Task 2 → completed
│   └─ /compact
│
├─ 3+4. 【讀取前端索引 + 執行 -c 檢查】（合併執行）
│   ├─ TaskUpdate Task 3 → in_progress
│   ├─ 讀取 ui-api-index-*.md
│   ├─ TaskUpdate Task 3 → completed
│   ├─ TaskUpdate Task 4 → in_progress
│   ├─ 執行欄位對應檢查
│   ├─ Merge「## UI ↔ API 欄位對應」到 data-flow
│   ├─ Git commit ✅
│   ├─ TaskUpdate Task 4 → completed
│   └─ /compact
│
├─ 5. 【執行 -s 檢查：情境分析】
│   ├─ TaskUpdate Task 5 → in_progress
│   ├─ 讀取 data-flow 文件
│   ├─ 執行情境分析
│   ├─ Merge「## 情境分析」到 data-flow
│   ├─ Git commit ✅
│   ├─ TaskUpdate Task 5 → completed
│   └─ /compact
│
├─ 6. 【執行 -df 檢查：資料流驗證】
│   ├─ TaskUpdate Task 6 → in_progress
│   ├─ 讀取 data-flow 文件
│   ├─ 執行資料流驗證
│   ├─ Merge「## 資料流驗證」到 data-flow
│   ├─ Git commit ✅
│   ├─ TaskUpdate Task 6 → completed
│   └─ /compact
│
├─ 7. 【彙整問題清單】
│   ├─ TaskUpdate Task 7 → in_progress
│   ├─ 讀取 data-flow 文件
│   ├─ 收集所有問題並排序
│   ├─ Merge「## 問題清單」到 data-flow
│   ├─ Git commit ✅
│   ├─ TaskUpdate Task 7 → completed
│   └─ /compact
│
└─ 8. 【輸出結果 + 更新進度表】
    ├─ TaskUpdate Task 8 → in_progress
    ├─ 讀取 data-flow 文件
    ├─ 產出完整報告
    ├─ 更新 api-flow-progress.md（如存在）
    │   ├─ 更新 /review-api-flow 執行狀態為 ✅
    │   ├─ 更新問題統計（❌ 嚴重問題、⚠️ 注意事項）
    │   └─ Git commit 進度表變更
    ├─ TaskUpdate Task 8 → completed
    └─ ❌ 不 compact（保留完整輸出）
```

### 資料傳遞策略

**方案 B：即時更新 data-flow 文件**（採用）

每個步驟完成後：
1. 立即 merge 結果到 data-flow 文件
2. Git commit 持久化
3. 下一步驟從 data-flow 文件讀取前面步驟的結果

**優勢**：
- ✅ **設計一致**：符合原本「merge 回 data-flow」的設計
- ✅ **資料持久**：每步驟結果立即保存，不怕中斷
- ✅ **除錯友善**：直接查看 data-flow 文件即可
- ✅ **無需清理**：不產生暫存檔案
- ✅ **進度可追溯**：每個步驟都有 git commit 記錄

### 步驟完成標準流程

每個步驟完成後必須執行（Step 1 除外）：

1. **Merge 結果到 data-flow 文件**
   - 新增/更新對應區塊
   - 更新 scan-meta（commit + date + step）
   - Step 4（-c 區塊）額外寫入 `frontend-commit`

2. **Git Commit**
   ```bash
   cd /Users/nicholas/Desktop/Projects/prompts
   git add 6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md
   git commit -m "review-api-flow: {apiName} Step N - {步驟名稱}"
   ```

3. **TaskUpdate**
   - TaskUpdate Task N → completed

4. **Compact**
   - 執行 /compact（Step 8 除外）

### Git Commit Message 格式

```bash
# Step 2: 更新後端結構
review-api-flow: {apiName} Step 2 - 更新後端結構（Entity/DTO 變更）

# Step 4: UI 欄位對應
review-api-flow: {apiName} Step 4 - UI ↔ API 欄位對應檢查完成

# Step 5: 情境分析
review-api-flow: {apiName} Step 5 - 情境分析完成（N 個情境，M 個遺漏）

# Step 6: 資料流驗證
review-api-flow: {apiName} Step 6 - 資料流驗證完成（N 個斷裂點）

# Step 7: 問題清單
review-api-flow: {apiName} Step 7 - 問題清單彙整完成（N 個問題）

# Step 8: 更新進度表（如進度表存在）
更新 API Flow 進度：{apiName} - review-api-flow 完成（N 個問題）
```

### 中斷恢復機制

如果執行中斷：

1. **查看 Task 進度**
   ```bash
   TaskList
   ```

2. **查看 git log 確認已完成的步驟**
   ```bash
   cd /Users/nicholas/Desktop/Projects/prompts
   git log --oneline 6_api_data_flow/{dir}/{apiName}-data-flow.md
   ```

3. **從中斷位置繼續執行**
   - AI 讀取 data-flow 文件
   - 取得前面步驟的結果
   - 從下一個 pending 的 Task 繼續

### 特殊處理：Step 3 + Step 4 合併

**原因**：Step 3 提取的 UI 欄位不適合單獨寫入 data-flow

**解決方案**：
- Step 3 和 Step 4 合併執行
- 提取 UI 欄位後立即執行欄位對應檢查
- 一次 merge 完整的「UI ↔ API 欄位對應」區塊
- 避免 UI 欄位在 compact 後遺失

### 特殊處理：Step 8 更新進度表

**執行時機**：Step 8 輸出結果後，在 TaskUpdate 之前

**更新邏輯**：

1. **檢查進度表是否存在**
   ```bash
   # 使用 Glob 工具檢查進度表檔案
   Glob(pattern="api-flow-progress.md", path="prompts/6_api_data_flow")
   ```

2. **進度表存在 → 更新對應 API 進度**
   - 讀取進度表文件
   - 讀取 data-flow 文件的問題清單
   - 統計問題數量（❌ 嚴重問題、⚠️ 注意事項）
   - 使用 Edit 工具更新進度表中該 API 的狀態：
     ```markdown
     - ✅ /review-api-flow — 完成（N 個問題）
     ```
   - 使用 Read 工具驗證更新是否成功
   - Git commit 進度表變更：
     ```bash
     cd /Users/nicholas/Desktop/Projects/prompts
     git add 6_api_data_flow/api-flow-progress.md
     git commit -m "更新 API Flow 進度：{apiName} - review-api-flow 完成（N 個問題）"
     ```
   - 如 commit 失敗，報告具體錯誤原因（不需要額外的 staging 檢查）

3. **進度表不存在 → 跳過**
   - 不影響主流程執行
   - 在輸出結果中提示：「💡 使用 /api-flow-architecture -p 建立進度追蹤表」

**與 api-flow-architecture 的協作**：
- api-flow-architecture 更新「/api-flow-architecture {apiName}」狀態
- review-api-flow 更新「/review-api-flow」狀態
- 兩者共同維護同一份 api-flow-progress.md

**錯誤處理原則**（2026-02-08 設計變更）：
- ❌ **禁止**：執行 `git diff --cached` 檢查 staging 狀態
- ✅ **正確**：直接 Edit → Read 驗證 → git add → git commit
- ✅ **失敗處理**：如 commit 失敗，直接報告錯誤原因即可
- 💡 **設計理念**：簡化流程，找到文件 → 更新 → commit，不需要額外驗證步驟

### Compact 後的資料讀取策略

每個步驟開始時：

1. **檢查 Task 進度**
   ```bash
   TaskList  # 確認當前在哪一步
   ```

2. **讀取 data-flow 文件**
   ```bash
   Read prompts/6_api_data_flow/{dir}/{apiName}-data-flow.md
   ```

3. **提取需要的資訊**
   - Step 4 需要：Response DTO（從 `## DTO 欄位定義` 區塊）
   - Step 5 需要：UI 欄位對應（從 `## UI ↔ API 欄位對應` 區塊）
   - Step 6 需要：情境分析（從 `## 情境分析` 區塊）
   - Step 7 需要：所有問題（從各區塊收集）

### 實作要點

1. **執行前 clear**：確保從乾淨狀態開始，不受之前對話影響
2. **Task 追蹤**：即使 compact 後也能知道執行到哪一步
3. **即時 commit**：每步驟完成後立即 commit，確保進度不遺失
4. **Step 3+4 合併**：避免 UI 欄位在 compact 後遺失
5. **Step 8 更新進度表**：檢查 api-flow-progress.md 是否存在，存在則更新並 commit
6. **最後不 compact**：保留完整輸出給用戶查看

### 預期效益

| 項目 | 原設計 | 自動化設計 |
|------|--------|-----------|
| 執行方式 | 人工逐步執行 | 一次自動執行完成 |
| Context 管理 | 累積到最後 | 分段 compact |
| 進度追蹤 | 無 | Task 系統 |
| 中斷恢復 | 需重新執行 | 從中斷位置繼續 |
| 資料持久化 | 最後一次 merge | 每步驟立即 commit |
| 除錯難度 | 高（需重跑） | 低（git log 查看） |
| Token 效率 | 低（累積） | 高（分段清理） |

---

## 2026-02-08 設計變更：權限層級判斷邏輯修正

### 問題描述

propertyOwner API 執行 `/review-api-flow` 時，Step 5 的權限層級判斷將「Service 未實作 dataScope 過濾」標記為「❌ 安全問題」，但實際上這需要與團隊確認設計意圖，不應直接判定為錯誤。

### 根本原因

1. **PermissionGuard 行為誤解**：
   - PermissionGuard 只負責**注入** dataScope 資訊到 `request['dataScope']`
   - 不會自動過濾資料，需要 Service 主動讀取並實作過濾邏輯

2. **判斷邏輯過於武斷**：
   - 原邏輯假設「有 dataScope 設定就必須實作過濾」
   - 忽略了兩種合理情境：
     - 情境 A：API 設計為跨分店共享（permissions.constant.ts 設定錯誤）
     - 情境 B：API 應該分店隔離（Service 實作遺漏）

### 設計決策

**修正判斷邏輯**：

| 原邏輯 | 新邏輯 |
|--------|--------|
| 未實作 → ❌ 安全問題 | 未實作 → ⚠️ 需確認設計意圖 |

**新的判斷流程**：

```
├─ 2. 檢查 Service 是否實作 dataScope 過濾
│   ├─ 有根據 req.dataScope 過濾 → ✅ 正常
│   ├─ 沒有任何過濾邏輯 → ⚠️ 需確認設計意圖
│   │   ├─ 可能原因 1：permissions.constant.ts 設定錯誤（應移除 dataScope）
│   │   ├─ 可能原因 2：Service 實作遺漏（應補上過濾邏輯）
│   │   └─ 建議與團隊確認此 API 的資料範圍設計意圖
│   └─ 用其他方式過濾（如 accessLevel）→ ⚠️ 需確認是否等價
```

### 修改內容

**影響檔案**：
1. `review-api-flow_skill_proposal.md` - 設計稿（本檔案）
2. `review-api-flow.md` - 定義檔 Step 5.0
3. `review-api-flow_flowchart.md` - 流程圖 Step 5

**修改位置**：
- 定義檔：行 190-193
- 流程圖：行 64

**修改前**：
```markdown
- 未實作 → ❌ 安全問題（permissions.constant.ts 要求過濾但 Service 沒做）
```

**修改後**：
```markdown
- 未實作 → ⚠️ 需確認設計意圖
  - 可能原因 1：permissions.constant.ts 設定錯誤（應移除 dataScope）
  - 可能原因 2：Service 實作遺漏（應補上過濾邏輯）
  - 建議與團隊確認此 API 的資料範圍設計意圖
```

### 預期效果

**修正前**：
- propertyOwner 被標記為「❌ 嚴重問題（2 個）」
- 其中一個是 dataScope 未實作

**修正後**：
- propertyOwner 標記為「❌ 嚴重問題（1 個）+ ⚠️ 需確認（1 個）」
- dataScope 未實作改為需確認項目

### 實作狀態

- [x] 設計變更討論（2026-02-08）
- [x] 修正 propertyOwner-data-flow.md 報告
- [x] 同步更新定義檔和流程圖（/updateDesign 執行完成）

---

## 2026-02-08 設計變更：移除 Compact 機制

### 問題描述

原本設計在每個步驟完成後執行 `/compact`，目的是避免 context 累積導致 token 爆炸。但實際執行後發現：

1. **Context 累積問題不嚴重**：8 個步驟執行完成後，context 並未達到需要 compact 的程度
2. **Compact 造成資訊遺失風險**：分段 compact 可能導致前面步驟的重要資訊遺失
3. **即時持久化已足夠**：每步驟完成後立即 merge 到 data-flow 文件並 git commit，已經確保資料不遺失
4. **增加複雜度**：compact 機制增加了流程複雜度，但實際效益不明顯

### 設計決策

**移除所有 compact 相關機制**：

| 原設計 | 新設計 |
|--------|--------|
| 每步驟完成後執行 /compact | 不執行 compact，保持完整 context |
| Step 8 不 compact（保留完整輸出） | 所有步驟都不 compact |
| Step 3+4 合併避免 compact 後遺失 | Step 3+4 合併仍保留（簡化流程） |
| Compact 後的資料讀取策略 | 直接從 data-flow 文件讀取 |

**保留的機制**：
- ✅ **執行前 clear**：清空對話歷史，從乾淨狀態開始（這不是 compact）
- ✅ **即時持久化**：每步驟完成後立即 merge 結果到 data-flow 文件並 git commit
- ✅ **Task 追蹤進度**：用 TaskCreate/TaskUpdate 追蹤執行到哪一步
- ✅ **Step 3+4 合併**：簡化流程，一次完成前端索引讀取和欄位對應檢查

### 修改內容

**影響檔案**：
1. `review-api-flow_skill_proposal.md` - 設計稿（本檔案）
2. `review-api-flow.md` - 定義檔
3. `review-api-flow_flowchart.md` - 流程圖

**修改位置**：

**流程圖**：
- Line 15, 27, 54, 86, 99, 111: 移除各步驟的 `/compact`
- Line 127: 移除「❌ 不 compact（保留完整輸出）」說明
- Line 137: 移除步驟完成標準流程中的 compact 說明

**定義檔**：
- Line 48: 修改 Step 3+4 合併原因（不再提 compact）
- Line 69: 移除步驟完成標準流程中的 Compact 步驟

**設計稿**：
- Line 517: 移除「分段 compact」機制說明
- Line 519: 移除「最後不 compact」說明
- Line 534, 543, 554, 563, 572, 581, 592: 移除各步驟的 `/compact`
- Line 630: 移除步驟完成標準流程中的 Compact
- Line 674-683: 修改 Step 3+4 合併原因
- Line 728-747: 移除「Compact 後的資料讀取策略」章節
- Line 751-767: 修改實作要點和預期效益

### 修改前後對比

**步驟完成標準流程**：

修改前：
```markdown
每個步驟完成後必須執行（Step 1 除外）：

1. **Merge 結果到 data-flow 文件**
2. **Git Commit**
3. **TaskUpdate**
4. **Compact** - 執行 /compact（Step 8 除外）
```

修改後：
```markdown
每個步驟完成後必須執行（Step 1 除外）：

1. **Merge 結果到 data-flow 文件**
2. **Git Commit**
3. **TaskUpdate**
```

**Step 3+4 合併原因**：

修改前：
```markdown
**原因**：Step 3 提取的 UI 欄位不適合單獨寫入 data-flow

**解決方案**：
- Step 3 和 Step 4 合併執行
- 提取 UI 欄位後立即執行欄位對應檢查
- 一次 merge 完整的「UI ↔ API 欄位對應」區塊
- 避免 UI 欄位在 compact 後遺失
```

修改後：
```markdown
**原因**：Step 3 提取的 UI 欄位不適合單獨寫入 data-flow

**解決方案**：
- Step 3 和 Step 4 合併執行
- 提取 UI 欄位後立即執行欄位對應檢查
- 一次 merge 完整的「UI ↔ API 欄位對應」區塊
- 簡化流程，減少步驟切換
```

**預期效益**：

修改前：
```markdown
| 項目 | 原設計 | 自動化設計 |
|------|--------|-----------|
| Context 管理 | 累積到最後 | 分段 compact |
| Token 效率 | 低（累積） | 高（分段清理） |
```

修改後：
```markdown
| 項目 | 原設計 | 自動化設計 |
|------|--------|-----------|
| Context 管理 | 累積到最後 | 保持完整 context |
| Token 效率 | 低（累積） | 中（可接受範圍） |
```

### 預期效果

**移除前**：
- 每個步驟完成後執行 /compact
- 需要從 data-flow 文件重新讀取前面步驟的結果
- 增加流程複雜度

**移除後**：
- 保持完整的 context，不執行 compact
- 所有步驟的資訊都在 context 中，無需重新讀取
- 簡化流程，降低複雜度
- 如 context 真的太大，可由用戶手動執行 /compact

### 實作狀態

- [x] 設計變更討論（2026-02-08）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-08 設計變更：前端漸進式更新

### 問題描述

目前 `/review-api-flow` 只有**後端**透過 scan-meta commit + git diff 做漸進式更新（Step 2），**前端**每次都完整讀取 Vue 檔案重跑 -c 檢查，即使前端程式碼沒有任何變更。

**現況**：

| 來源 | 漸進式更新 | 說明 |
|------|-----------|------|
| 後端（backend-nestjs） | ✅ 有 | Step 2 比對 scan-meta commit vs HEAD，只讀 git diff 有變的檔案 |
| 前端（dashboard-nuxt / frontend-nuxt） | ❌ 沒有 | Step 3+4 每次都完整讀取前端索引表 + Vue 檔案 |

**痛點**：
- 前端沒變的情況下，每次都重新讀取 Vue 檔案浪費 context
- -c 檢查結果的 scan-meta 只記錄後端 commit，無法判斷前端是否有變更
- 前端索引表已有 `掃描版本` commit hash，但沒被利用

### 設計決策

**核心原則**：前端也要像後端一樣，用 commit hash 比對判斷是否需要重跑。

**scan-meta 擴充**：`-c` 區塊的 scan-meta 新增 `frontend-commit` 欄位。

```markdown
<!-- 原格式 -->
<!-- scan-meta: commit={hash}, date={YYYY-MM-DD} -->

<!-- 新格式（僅 -c 區塊） -->
<!-- scan-meta: commit={backend-hash}, frontend-commit={frontend-hash}, date={YYYY-MM-DD} -->
```

**前端 commit 來源**：從前端索引表的 `掃描版本：{project} commit {hash}` 提取。這個 commit 代表 `/pull-frontend` + `/build-ui-index` 後的前端版本。

**判斷流程**：

```
Step 3+4 前端漸進式更新判斷
│
├─ 1. 讀取 data-flow 文件的 -c 區塊 scan-meta
│   ├─ 無 -c 區塊（首次執行）→ 完整執行 -c 檢查
│   └─ 有 -c 區塊 → 提取 frontend-commit
│
├─ 2. 讀取前端索引表的掃描版本 commit
│
├─ 3. 比對 frontend-commit vs 前端索引表 commit
│   ├─ 相同 → 前端沒變
│   │   └─ 再檢查後端是否有變更（Step 2 結果）
│   │       ├─ 後端也沒變 → ⏭️ 完全跳過 -c，直接用現有結果
│   │       └─ 後端有變（DTO/Service 等）→ 🔄 只用新的後端結構重跑 -c 比對
│   │           └─ 不需要重讀 Vue 檔案，用 data-flow 已有的 UI 欄位清單
│   │
│   └─ 不同 → 前端有變
│       ├─ git diff 確認該 API 相關的 Vue 檔案是否有變更
│       │   ├─ Vue 檔案沒變 → 再檢查後端是否有變更
│       │   │   ├─ 後端也沒變 → ⏭️ 更新 frontend-commit，跳過 -c
│       │   │   └─ 後端有變 → 🔄 用新後端結構 + 現有 UI 欄位重跑比對
│       │   └─ Vue 檔案有變 → 再檢查後端是否有變更
│       │       ├─ 後端沒變 → 🔄 重讀 Vue + 現有後端結構重跑 -c
│       │       └─ 後端有變 → 🔄 重讀 Vue + 新後端結構，完整重跑 -c
│       └─ git diff 指令：
│           git -C {frontend-project} diff --name-only {old-commit}..{new-commit} -- {vue-paths}
```

**六種組合情境**：

| 後端變更 | 前端 Vue 變更 | 行為 | Context 消耗 |
|---------|-------------|------|-------------|
| 無 | 無（commit 相同） | ⏭️ 完全跳過 -c | 最低 |
| 有 | 無（commit 相同） | 🔄 用新後端結構 + 現有 UI 欄位重跑比對 | 低 |
| 無 | commit 不同但 Vue 沒變 | ⏭️ 更新 frontend-commit，跳過 -c | 最低 |
| 有 | commit 不同但 Vue 沒變 | 🔄 用新後端結構 + 現有 UI 欄位重跑比對 | 低 |
| 無 | 有（Vue 有變） | 🔄 重讀 Vue + 現有後端結構重跑 -c | 低 |
| 有 | 有（Vue 有變） | 🔄 重讀 Vue + 新後端結構，完整重跑 -c | 正常 |

### 修改內容

**影響檔案**：
1. `review-api-flow_skill_proposal.md` - 設計稿（本檔案）
2. `review-api-flow.md` - 定義檔 Step 2、Step 3+4
3. `review-api-flow_flowchart.md` - 流程圖 Step 2、Step 3+4

**設計稿已修改的區塊**：
- 「scan-meta 判斷流程」→ 改為「前後端雙軌」，新增前端判斷表格和偵測細節
- 「效率對比」→ 新增前後端組合情境
- 「scan-meta 格式」→ 新增 `frontend-commit` 欄位說明
- 「data-flow 文件擴充結構」→ `-c` 區塊 scan-meta 加入 `frontend-commit`
- 「需要讀取的檔案」→ 拆分為後端條件讀取和前端條件讀取
- 「scan-meta 更新時機」→ 細化各步驟更新的欄位

**定義檔和流程圖待修改**（透過 /updateDesign 同步）：
- Step 2：擴充為同時判斷後端和前端變更
- Step 3+4：加入前端 commit 比對邏輯，沒變就跳過
- 步驟完成標準流程：-c 區塊的 scan-meta 要寫入 `frontend-commit`

### 預期效果

**修改前**：
- 前端每次都完整讀取 Vue 檔案 + 重跑 -c 檢查
- 即使前端沒有任何變更也要重跑

**修改後**：
- 前端沒變 + 後端沒變 → 完全跳過 -c，context 消耗最低
- 前端沒變 + 後端有變 → 只用新後端結構重跑比對，不重讀 Vue 檔案
- 前端 commit 不同但 Vue 沒變 + 後端沒變 → 更新 frontend-commit，跳過 -c
- 前端 commit 不同但 Vue 沒變 + 後端有變 → 用新後端結構 + 現有 UI 欄位重跑比對
- 前端 Vue 有變 → 重讀 Vue 檔案重跑 -c（搭配後端是否有變決定用新/舊後端結構）

### 實作狀態

- [x] 設計變更討論（2026-02-08）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-08 設計變更：Step 2 分段寫入

### 問題描述

目前 Step 2 在後端有變更時，會一次處理所有有變的區塊：

```
Step 2 現況（後端有變更時）
│
├─ git diff 分類 → 找出 Entity/DTO/Service/Controller 哪些有變
├─ 一次讀取所有有變的檔案
├─ 一次更新所有有變的區塊
├─ 一次 Git commit
└─ 記錄：後端有變更
```

**問題**：
- 多個區塊的分析結果累積在 context，消耗大
- 如果 AI 中途 crash，已分析完的區塊結果丟失
- 各區塊有獨立的 scan-meta commit hash，應該各自 commit 才能精確追蹤
- 與 Step 4/5/6/7 的分段 commit 設計不一致
- 與 `/api-flow-architecture` 的分段寫入設計不一致（同步修改）

### 設計決策

**核心原則**：每個有變的區塊獨立處理，讀完就更新、commit，再處理下一個。

**修改後的流程**：

```
Step 2（後端有變更時）— 逐區塊處理
│
├─ git diff 分類 → 找出哪些區塊有變
│
├─ Entity 有變？
│   ├─ 是 → 讀取 *.entity.ts → 更新 Entity 區塊 + scan-meta → Git commit
│   └─ 否 → 跳過
│
├─ DTO 有變？
│   ├─ 是 → 讀取 dto/*.dto.ts → 更新 DTO 區塊 + scan-meta → Git commit
│   └─ 否 → 跳過
│
├─ Service 有變？
│   ├─ 是 → 讀取 *.service.ts → 更新 Service 區塊 + scan-meta → Git commit
│   └─ 否 → 跳過
│
├─ Controller 有變？
│   ├─ 是 → 讀取 *.controller.ts → 更新 Controller 區塊 + scan-meta → Git commit
│   └─ 否 → 跳過
│
├─ 提取前端索引表 commit（不受分段影響）
└─ 記錄：後端有變更（哪些區塊）+ 前端 commit
```

**Git Commit Message 格式**：

```bash
# 逐區塊 commit
review-api-flow: {apiName} Step 2 - Entity 結構更新
review-api-flow: {apiName} Step 2 - DTO 定義更新
review-api-flow: {apiName} Step 2 - Service 結構更新
review-api-flow: {apiName} Step 2 - Controller 結構更新
```

**處理順序**：Entity → DTO → Service → Controller（與 data-flow 文件區塊順序一致，也與 `/api-flow-architecture` 一致）

### 修改內容

**影響檔案**：
1. `review-api-flow_skill_proposal.md` - 設計稿（本檔案）
2. `review-api-flow.md` - 定義檔 Step 2
3. `review-api-flow_flowchart.md` - 流程圖 Step 2

**定義檔和流程圖待修改**（透過 /updateDesign 同步）：
- Step 2：後端有變更時，從一次處理改為逐區塊處理（讀取 → 更新 → commit）
- 流程圖 Step 2 的 `Git commit ✅` 改為逐區塊各自 commit

### 預期效果

**修改前**：
- 多個區塊一次讀取、一次更新、一次 commit
- 中途 crash → 全部丟失

**修改後**：
- 每個有變的區塊獨立處理，讀完就更新 + commit
- 中途 crash → 已 commit 的區塊保留
- 每個區塊的 scan-meta 各自記錄精確的 commit hash
- 與 Step 4/5/6/7 和 `/api-flow-architecture` 的分段寫入一致

### 實作狀態

- [x] 設計變更討論（2026-02-08）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-08 設計變更：前後端命名混淆紀錄

### 問題描述

前端檔案命名與後端 API module 名稱不一致，容易混淆：

| 後端 API | 前端檔案 | 前端顯示名稱 | 混淆點 |
|---------|---------|------------|-------|
| propertySurvey | `owner-survey*.vue` | 產權調查 | `property-survey.vue` 是 caseStudy 不是 propertySurvey |
| caseStudy | `property-survey.vue` | 物調表 | 名稱像 propertySurvey 但實際是 caseStudy |

**痛點**：
- AI 和開發者都容易從前端檔案名誤判對應的後端 API
- 每次執行 `/review-api-flow` 都可能踩到相同的命名陷阱
- 已完成的 data-flow 文件如果沒記錄混淆資訊，後續查閱時仍會搞混

### 設計決策

**方案 C：Basic Info + -c 區塊都記錄**（採用）

| 記錄位置 | 記錄內容 | 作用 |
|---------|---------|------|
| Basic Info（基本資訊區塊） | 命名混淆提醒（簡短警示） | 開啟文件就能看到，避免第一時間搞錯 |
| -c 區塊（UI ↔ API 欄位對應） | 命名對照表（完整對照） | 檢查欄位對應時有精確的名稱對照 |

### 紀錄格式

#### Basic Info 區塊 — 命名混淆提醒

在 `## 基本資訊` 區塊最下方新增：

```markdown
> **⚠️ 命名混淆提醒**：本 API（{apiName}）對應的前端頁面是 `{actual-vue-file}`，Tab 顯示名稱為「{display-name}」。
> 前端的 `{confusing-vue-file}`（顯示名稱「{confusing-display-name}」）使用的是 {other-api} API，**不是**本 API。
> 詳見 [{other-api}-data-flow.md](./{other-api}-data-flow.md)
```

#### -c 區塊 — 命名對照表

在 `## UI ↔ API 欄位對應` 區塊的開頭，scan-meta 之後新增：

```markdown
### 命名對照（前後端混淆提醒）

| 後端 API | 前端檔案 | 前端顯示名稱 | 備註 |
|---------|---------|------------|------|
| {apiName} | {actual-vue-files} | {display-name} | ⚠️ {confusing-vue-file} 是 {other-api} API |
```

### 觸發條件

**不是所有 API 都需要命名混淆紀錄**，只在以下情況觸發：

1. **AI 在 Step 4（-c 檢查）執行過程中發現**：
   - 前端檔案名稱與後端 API module 名稱明顯不一致
   - 例如：`property-survey.vue` 不是 `propertySurvey` API 的前端
   - 例如：`owner-survey*.vue` 才是 `propertySurvey` API 的前端

2. **存在交叉混淆**：
   - 兩個 API 的命名容易互相混淆（如 propertySurvey ↔ caseStudy）
   - 需要在**兩個** data-flow 文件中互相標註

### 執行流程

```
Step 4（-c 檢查）命名混淆紀錄流程
│
├─ 4.1 讀取前端 Vue 檔案
│   └─ 在讀取過程中判斷：前端檔案名稱是否與後端 API 名稱一致？
│
├─ 4.2~4.5 正常執行 -c 檢查
│
├─ 4.6 Merge 結果到 data-flow 文件
│   ├─ 正常的 -c 檢查結果
│   ├─ 如果發現命名混淆 →
│   │   ├─ 在 -c 區塊新增「### 命名對照（前後端混淆提醒）」
│   │   └─ 在 Basic Info 區塊新增「⚠️ 命名混淆提醒」
│   └─ 沒有命名混淆 → 不新增
│
└─ 4.7 Git commit
    └─ commit 中包含命名混淆紀錄（如果有的話）
```

### 跨文件互標

當發現交叉混淆（如 propertySurvey ↔ caseStudy）時：

1. **在當前 API 的 data-flow 文件中**：記錄命名混淆提醒
2. **在被混淆的 API 的 data-flow 文件中**：也記錄反向的命名混淆提醒
3. 兩個文件互相引用（Markdown 相對路徑連結）

> ⚠️ 注意：如果被混淆的 API 的 data-flow 文件尚未建立，只在當前文件中記錄，不強制建立另一個文件。

### 修改內容

**影響檔案**：
1. `review-api-flow_skill_proposal.md` - 設計稿（本檔案）
2. `review-api-flow.md` - 定義檔 Step 4
3. `review-api-flow_flowchart.md` - 流程圖 Step 4

**定義檔和流程圖待修改**（透過 /updateDesign 同步）：
- Step 4（-c 檢查）：新增命名混淆判斷和紀錄邏輯
- 流程圖 Step 3+4：新增命名混淆判斷分支

### 預期效果

**修改前**：
- 命名混淆只靠人工記憶或口頭傳達
- 每次打開 data-flow 文件都可能搞混前端對應

**修改後**：
- 打開 data-flow 文件第一眼就能看到命名混淆提醒（Basic Info）
- 做欄位對應檢查時有完整的命名對照表（-c 區塊）
- 交叉混淆的 API 互相標註，不會漏掉任何一邊

### 實作狀態

- [x] 設計變更討論（2026-02-08）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-10 設計變更：使用 git worktree dev 分支讀取後端程式碼

### 問題描述

目前 `/review-api-flow` 直接讀取 `backend-nestjs/` 本地目錄的程式碼。本地通常在 `adminApi` 分支上開發，可能有未 commit 的修改或與 dev 分支不同步的內容。

**痛點**：
- Step 2 偵測後端變更時，比對的是 adminApi 分支的 HEAD，可能包含尚未 merge 到 dev 的實驗性修改
- Step 5 讀取 `permissions.constant.ts` 時，可能讀到本地正在修改的版本
- 產出的對齊檢查結果可能基於尚未部署的程式碼，不反映 dev 環境的實際狀態

**預期**：
- 從 dev 分支的乾淨狀態讀取程式碼，確保對齊檢查反映已合併到 dev 的穩定版本
- 使用 git worktree 避免影響本地正在開發的 adminApi 分支
- 與 `/api-flow-architecture` 使用相同的 worktree 模式，保持一致

### 設計決策

**參考 `/merge-to-deploy` 和 `/api-flow-architecture` 的 worktree 模式**：建立臨時 worktree 切到 dev 分支，讀取完畢後清理。

**共用相同的 worktree 命名和路徑**（與 api-flow-architecture 一致）：
- worktree 名稱：`backend-nestjs-dev-read`
- worktree 路徑：`/Users/nicholas/Desktop/Projects/backend-nestjs-dev-read`

### 新增步驟：Step 0.5 建立 dev worktree

在 Step 0（建立進度追蹤）之後、Step 1（解析參數）之前，新增 worktree 建立步驟。

**流程**：

```
Step 0.5. 建立 dev worktree（讀取用）
│
├─ 1. Fetch 最新 dev 分支
│   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs fetch origin dev
│
├─ 2. 建立 worktree
│   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree add
│       /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read dev
│
├─ 3. 設定 worktree 配置
│   └─ /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/setup-worktree-config.sh
│       /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
│
├─ 4. Pull 最新 dev
│   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read pull origin dev
│
└─ 5. 記錄 BACKEND_READ_PATH
    └─ 後續所有讀取後端程式碼的步驟，改用此路徑
```

**變數定義**：
```
BACKEND_READ_PATH = /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
```

### 路徑替換清單

後續步驟中，所有引用 `backend-nestjs` 讀取程式碼的地方，改用 `BACKEND_READ_PATH`：

| 步驟 | 原路徑 | 新路徑 |
|------|--------|--------|
| Step 2 | `git -C backend-nestjs rev-parse --short HEAD` | `git -C {BACKEND_READ_PATH} rev-parse --short HEAD` |
| Step 2 | `git -C backend-nestjs diff --name-only` | `git -C {BACKEND_READ_PATH} diff --name-only` |
| Step 2 | 讀取 `backend-nestjs/src/api/**/{apiName}/*.ts` | 讀取 `{BACKEND_READ_PATH}/src/api/**/{apiName}/*.ts` |
| Step 5 | 讀取 `backend-nestjs/src/common/constants/permissions.constant.ts` | 讀取 `{BACKEND_READ_PATH}/src/common/constants/permissions.constant.ts` |

**不替換的路徑**：
- `backend-nestjs/.claude/scripts/setup-worktree-config.sh`（腳本位置不變）
- `git -C backend-nestjs worktree add/remove`（worktree 管理指令本身用主 repo）
- `git -C backend-nestjs fetch origin dev`（fetch 用主 repo）
- 前端相關路徑（dashboard-nuxt / frontend-nuxt，不受影響）
- prompts 專案路徑（data-flow 文件讀寫，不受影響）

### 新增步驟：清理 worktree

在 Step 8（輸出結果 + 更新進度表）完成後，清理 worktree：

```
Step 8.5. 清理 dev worktree
│
└─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree remove
    /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read --force
```

**錯誤處理**：如果 worktree 清理失敗，報告錯誤但不影響已完成的結果。

### 修改影響

| 影響的檔案 | 修改內容 |
|-----------|---------|
| 定義檔 | 新增 Step 0.5（建立 worktree）、Step 8.5（清理）、所有後端路徑替換 |
| 流程圖 | 新增 Step 0.5 和 Step 8.5 節點、路徑替換 |
| TaskCreate | 新增 2 個 task（建立 worktree、清理 worktree） |

### 實作狀態

- [x] 設計變更討論（2026-02-10）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 執行完成）

---

## 2026-02-11 設計變更：保留 dev worktree（不再每次清理）

### 問題描述

目前 `/review-api-flow` 和 `/api-flow-architecture` 共用同一個 worktree 路徑 `backend-nestjs-dev-read`，每次執行時建立（Step 0.5）、結束時清理（Step 8.5）。

**痛點**：
- 連續執行多個 API 時，每次都要 `worktree add` + `worktree remove`，浪費時間
- 上一次執行的 Step 8.5 清理失敗（或中斷），下一次 Step 0.5 建立時會報 `fatal: already exists`
- 實際上 worktree 是唯讀用途，保留不會影響任何開發工作

**觸發場景**：
```
/review-api-flow estateTransaction  → Step 8.5 清理失敗（worktree 殘留）
/api-flow-architecture transcript   → Step 1.5 建立失敗：already exists
```

### 設計決策

**核心原則**：worktree 保留不清理，每次執行只確保存在 + pull 最新。

**修改前**：
```
Step 0.5：建立 worktree（每次都 worktree add）
Step 8.5：清理 worktree（每次都 worktree remove）
```

**修改後**：
```
Step 0.5：確保 worktree 可用（存在就 pull，不存在就建立）
Step 8.5：移除（不再清理 worktree）
```

### Step 0.5 修改：確保 dev worktree 可用

**修改後的流程**：

```
Step 0.5. 確保 dev worktree 可用
│
├─ 1. Fetch 最新 dev 分支
│   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs fetch origin dev
│
├─ 2. 檢查 worktree 是否存在
│   ├─ 存在（目錄存在）→ 直接 pull
│   │   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read pull origin dev
│   └─ 不存在 → 建立 + 配置 + pull
│       ├─ git -C backend-nestjs worktree add backend-nestjs-dev-read dev
│       ├─ setup-worktree-config.sh backend-nestjs-dev-read
│       └─ git -C backend-nestjs-dev-read pull origin dev
│
└─ 3. 記錄 BACKEND_READ_PATH = /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
```

**判斷方式**：檢查 `/Users/nicholas/Desktop/Projects/backend-nestjs-dev-read` 目錄是否存在（`ls` 或 `test -d`）。

### Step 8.5 修改：移除

**修改前**：
```
Step 8.5. 清理 dev worktree
└─ git -C backend-nestjs worktree remove backend-nestjs-dev-read --force
```

**修改後**：
- 移除 Step 8.5
- 移除 TaskCreate 中的「清理 dev worktree」task

### TaskCreate 修改

**移除**：
- Task「清理 dev worktree」（原 Step 8.5）

**修改**：
- Task「建立 dev worktree」→ 改為「確保 dev worktree 可用」
  - subject: `確保 dev worktree 可用`
  - activeForm: `確保 dev worktree 可用中...`

### 修改影響

| 影響的檔案 | 修改內容 |
|-----------|---------|
| 定義檔 | Step 0.5 改為「確保 worktree 可用」邏輯、移除 Step 8.5、更新 TaskCreate |
| 流程圖 | Step 0.5 改為存在判斷分支、移除 Step 8.5 節點 |
| TaskCreate | 移除「清理 dev worktree」task、修改「建立 dev worktree」task 名稱 |

### 實作狀態

- [x] 設計變更討論（2026-02-11）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-13 設計變更：使用 replace-section.sh 替代 Edit 工具做大區塊替換

### 問題描述

Merge 結果到 data-flow 文件時，使用 Edit 工具替換整個 `## 區塊`。當區塊很大（如 transcript 的情境分析 441 行、資料流驗證 392 行），`old_string` + `new_string` 超過 API 的 content validation 限制，觸發 `invalid contentList text` 400 error。

### 設計決策

建立 `replace-section.sh` helper script，用 shell 命令（grep 定位行號 + sed 先刪後插）替代 Edit 工具做大區塊替換。

**腳本位置**：`backend-nestjs/.claude/scripts/replace-section.sh`

**使用方式**：
```bash
# 1. 將新區塊內容寫入暫存檔（含 ## 標題 + scan-meta + 內容，不含尾部 ---）
Write → /tmp/section-{apiName}-{step}.md

# 2. 執行替換
.claude/scripts/replace-section.sh {data-flow路徑} "## {區塊標題}" /tmp/section-{apiName}-{step}.md

# 3. 驗證 + 清理
Read 驗證替換結果（區塊起始 5 行）
rm /tmp/section-{apiName}-{step}.md
```

**區塊邊界規則**：
- 替換範圍：從 `## 標題` 行到下一個 `---` 行（含）
- 最後一個區塊：到文件末尾
- 找不到區塊 → append 模式（在文件末尾追加）
- script 自動補上尾部 `---` 分隔線

### 修改內容

**步驟完成標準流程**修改為：

| 區塊大小 | 寫入方式 | 適用步驟 |
|---------|---------|---------|
| 大區塊（>30 行） | Write → /tmp + replace-section.sh | Step 2/4/5/6/7 |
| 小區塊（<30 行） | Edit 工具 | Step 4 命名混淆提醒、Step 8 進度表更新 |

**暫存檔命名規則**：

| Step | 暫存檔路徑 | 對應區塊 |
|------|-----------|---------|
| 2 | `/tmp/section-{apiName}-{區塊名}.md` | Entity/DTO/Service/Controller |
| 4 | `/tmp/section-{apiName}-c.md` | `## UI ↔ API 欄位對應` |
| 5 | `/tmp/section-{apiName}-s.md` | `## 情境分析` |
| 6 | `/tmp/section-{apiName}-df.md` | `## 資料流驗證` |
| 7 | `/tmp/section-{apiName}-issues.md` | `## 問題清單` |

**影響檔案**：
1. `review-api-flow_skill_proposal.md` - 設計稿（本檔案）
2. `review-api-flow.md` - 定義檔步驟完成標準流程
3. `review-api-flow_flowchart.md` - 流程圖步驟完成標準流程

### 實作狀態

- [x] 設計變更討論（2026-02-13）
- [x] 建立 replace-section.sh 腳本
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

### 2026-02-13 設計變更：replace-section.sh 路徑改為完整路徑

**問題**：定義檔和流程圖中的 `replace-section.sh` 使用相對路徑 `.claude/scripts/replace-section.sh`，但 Claude Code 工作目錄是 `/Users/nicholas/Desktop/Projects/`，導致其他 AI 執行時找不到 script。

**修正**：所有 Bash 呼叫路徑改為完整路徑 `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh`

**影響檔案**：
1. `review-api-flow.md` - 定義檔步驟完成標準流程（1 處）
2. `review-api-flow_flowchart.md` - 流程圖步驟完成標準流程（1 處）
