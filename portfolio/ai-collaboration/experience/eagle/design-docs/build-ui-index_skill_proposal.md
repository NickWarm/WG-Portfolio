# Build UI Index Skill 設計提案

## 概述

建立「UI 操作 → 前端檔案 → API」的索引系統，讓 `/debugP` 和 `/check-result` 能快速查表，不用每次都搜尋前端專案。

---

## 設計目的與系統關係

### 核心目的

`/build-ui-index` 的核心目的是**產出索引文件**，供 `ui-api-index.md` module 引用，讓 `/debugP` 和 `/check-result` 能快速查表取得「UI 操作 → API」的對應關係。

### 系統關係圖

```
/build-ui-index 在系統中的角色
│
├─ 1. 【產出】索引文件（存放於 prompts 專案）
│   ├─ ui-api-index-dashboard.md → dashboard-nuxt 的索引
│   └─ ui-api-index-frontend.md → frontend-nuxt 的索引
│
├─ 2. 【被引用】ui-api-index.md module
│   ├─ 位置：Projects/.claude/modules/
│   └─ 功能：提供索引查詢指引，告訴 AI 如何使用索引
│
├─ 3. 【使用者 Skill】
│   ├─ /debugP → 查表取得 Bug 重現步驟的 API 序列
│   └─ /check-result → 查表驗證實作結果的 API
│
└─ 4. 【觸發來源】
    └─ /pull-frontend → 前端有更新時提示執行 /build-ui-index
                      → 前端沒更新則不需要執行
```

### 觸發時機邏輯

| /pull-frontend 結果 | 是否需要執行 /build-ui-index |
|---------------------|------------------------------|
| 有檔案更新 | ✅ 需要執行（增量更新） |
| 沒有檔案更新 | ❌ 不需要執行 |
| 首次建立索引 | ✅ 需要執行（全量掃描） |

### 資料流

```
/pull-frontend 拉取前端更新
        ↓
/build-ui-index 掃描前端專案
        ↓
產出索引文件（ui-api-index-*.md）
        ↓
ui-api-index.md module 引用索引
        ↓
/debugP、/check-result 查表使用
```

### 待完成的整合項目

| 項目 | 說明 | 狀態 |
|------|------|------|
| `ui-api-index.md` module | 提供索引查詢指引，被其他 skill 引用 | ✅ 完成 |
| 修改 `/debugP` | 新增 module 引用 + 查表步驟 | ✅ 完成 |
| 修改 `/check-result` | 新增 module 引用 + 查表步驟 | ✅ 完成 |
| 修改 `/pull-frontend` | 新增更新提示（Option A 簡易版）| ✅ 完成 |

---

## 問題描述

### 現況

目前 `/debugP` 執行「Bug Fix 三步法」時：
1. 讀取 bug spec 的「重現步驟」（如：點選物件編輯 → 出價紀錄 tab → 點出價按鈕）
2. AI 手動搜尋前端專案，找出每個步驟對應的檔案和 API
3. 產出 API 序列

**問題**：
- 每次都要 grep + 讀檔，花費 5-10 次檔案操作
- Token 消耗高
- AI 可能搜尋不完整或遺漏

### 目標

建立預先索引，讓 AI 查表即可：
- 讀 bug spec → 查索引 → 直接取得「前端檔案 → API」對應
- 花費：1 次檔案操作

---

## 架構設計

```
UI-API 索引系統
│
├─ 1. 【Skill: /build-ui-index】
│   ├─ 功能：AI 掃描前端專案，產出索引文件
│   ├─ 觸發時機：/pull-frontend 有更新後執行
│   └─ 輸出：索引 markdown 文件
│
├─ 2. 【Module: ui-api-index-dashboard.md】
│   ├─ 內容：dashboard-nuxt 的頁面 + 功能 → API 對應表
│   └─ 被 /debugP、/check-result 引用（adminApi 相關）
│
├─ 3. 【Module: ui-api-index-frontend.md】
│   ├─ 內容：frontend-nuxt 的頁面 + 功能 → API 對應表
│   └─ 被 /debugP、/check-result 引用（publicApi 相關）
│
└─ 4. 【整合 /pull-frontend】
    └─ pull 完有更新 → 提示執行 /build-ui-index
```

### 檔案位置

| 類型 | 檔案 | 位置 |
|------|------|------|
| Skill 定義 | `build-ui-index.md` | `Projects/.claude/commands/` |
| 設計稿 | `build-ui-index_skill_proposal.md` | `prompts/4_diary/debug/proposal/slash/` |
| 索引文件 | `ui-api-index-dashboard.md` | `prompts/4_diary/debug/ui-api-index/` |
| 索引文件 | `ui-api-index-frontend.md` | `prompts/4_diary/debug/ui-api-index/` |
| Module 引用 | `ui-api-index.md` | `Projects/.claude/modules/` |

### 前後端對應關係

| 後端 API 目錄 | 前端專案 | 索引文件 |
|--------------|----------|----------|
| `src/api/adminApi/` | `dashboard-nuxt` | `ui-api-index-dashboard.md` |
| `src/api/publicApi/` | `frontend-nuxt` | `ui-api-index-frontend.md` |

---

## 執行流程

```
/build-ui-index 完整執行流程
│
├─ 1. 【參數解析】
│   ├─ $1 = dashboard → 只掃描 dashboard-nuxt
│   ├─ $1 = frontend → 只掃描 frontend-nuxt
│   ├─ $1 = all 或空（預設）→ 兩個都掃描
│   └─ --full flag → 強制全量掃描（忽略增量）
│
├─ 2. 【判斷掃描模式】
│   │
│   ├─ 有 --full flag？
│   │   └─ 是 → 全量掃描模式
│   │
│   └─ 檢查 /pull-frontend 變動紀錄
│       ├─ 有變動紀錄 → 增量掃描模式
│       │   ├─ 讀取變動檔案清單
│       │   └─ 過濾出需要重新掃描的檔案：
│       │       ├─ views/**/*.vue
│       │       ├─ components/**/*.vue
│       │       ├─ api/core/*.ts
│       │       └─ composables/*.ts
│       │
│       └─ 無變動紀錄或首次執行 → 全量掃描模式
│
├─ 3. 【掃描前端專案】
│   │
│   ├─ 3.1 【掃描 API 定義】api/core/*.ts
│   │   ├─ 搜尋模式：export.*function.*Api|export.*const.*Api
│   │   ├─ 提取：函數名稱、HTTP method、endpoint
│   │   └─ 產出：「API 函數 → HTTP endpoint」對照表
│   │       例：createBidApi → POST /bids
│   │
│   ├─ 3.2 【掃描頁面】views/**/*.vue
│   │   ├─ 搜尋 import：from ['"]#/api|from ['"]@/api
│   │   ├─ 搜尋生命週期：onMounted|onBeforeMount
│   │   ├─ 追蹤生命週期中的 API 呼叫
│   │   └─ 記錄：「頁面載入 → API」
│   │
│   ├─ 3.3 【掃描功能操作】views/**/*.vue
│   │   ├─ 搜尋互動元素：
│   │   │   ├─ <ElButton @click="xxx">
│   │   │   ├─ <ElTab> 切換
│   │   │   └─ @submit、@change 等事件
│   │   ├─ 追蹤 handler 函數 → API 呼叫
│   │   └─ 記錄：「操作 → handler → API」
│   │
│   ├─ 3.4 【掃描 Dialog】components/Dialog*.vue
│   │   ├─ 搜尋 import：from ['"]#/api
│   │   ├─ 搜尋提交函數：handleSubmit|handleSave|handleConfirm
│   │   ├─ 搜尋載入函數：loadData|loadEditData|handleOpen
│   │   └─ 記錄：「Dialog 操作 → API」
│   │
│   └─ 3.5 【掃描 Composables】composables/*.ts（條件）
│       │
│       ├─ 先篩選有封裝 API 的檔案：
│       │   rg -l "(Api:|from ['\"]#/api|Api\()" composables/*.ts
│       │
│       ├─ 模式 A：參數注入
│       │   ├─ 特徵：函數簽名有 xxxApi: (data) => Promise
│       │   └─ 例：useFileUpload(createApi, options)
│       │
│       └─ 模式 B：直接 import
│           ├─ 特徵：import { xxxApi } from '#/api
│           └─ 追蹤內部的 API 呼叫
│
├─ 4. 【產出/更新索引文件】
│   │
│   ├─ 全量掃描模式：
│   │   └─ 重新產出完整索引文件
│   │
│   ├─ 增量掃描模式：
│   │   ├─ 讀取現有索引文件
│   │   ├─ 更新有變動的區塊
│   │   └─ 保留未變動的區塊
│   │
│   ├─ 索引文件結構：
│   │   ├─ 按功能模組分類（cases/, deals/, customers/...）
│   │   ├─ 每個模組包含：頁面、Tab、Dialog
│   │   └─ 每個項目包含：操作、元件/函數、API、HTTP Method
│   │
│   └─ 輸出位置：
│       ├─ prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md
│       └─ prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md
│
└─ 5. 【輸出結果】
    ├─ 掃描模式：全量 / 增量
    ├─ 掃描統計：
    │   ├─ 頁面數量
    │   ├─ Dialog 數量
    │   ├─ API 數量
    │   └─ 新增/更新數量（增量模式）
    ├─ 索引文件位置
    └─ 下次更新提示（commit hash）
```

---

## 參數說明

| 參數 | 說明 | 範例 |
|------|------|------|
| `$1` | 掃描範圍 | `dashboard` / `frontend` / `all`（預設）|
| `--full` | 強制全量掃描 | 忽略增量更新，重新掃描所有檔案 |

### 使用範例

```bash
/build-ui-index              # 增量掃描全部（dashboard + frontend）
/build-ui-index dashboard    # 增量掃描 dashboard-nuxt
/build-ui-index frontend     # 增量掃描 frontend-nuxt
/build-ui-index --full       # 強制全量掃描全部
/build-ui-index dashboard --full  # 強制全量掃描 dashboard-nuxt
```

---

## 索引文件格式

### 檔案結構

```
prompts/4_diary/debug/ui-api-index/
├─ ui-api-index-dashboard.md    # dashboard-nuxt 索引
├─ ui-api-index-frontend.md     # frontend-nuxt 索引
└─ README.md                    # 索引說明與更新紀錄
```

### 索引內容格式

```markdown
# Dashboard-Nuxt UI-API 索引

> 最後更新：2026-01-29
> 掃描版本：dashboard-nuxt commit abc1234

## 物件管理 (cases/objects)

### 頁面：物件編輯 `/cases/objects/:id`

**頁面檔案**：`apps/web-ele/src/views/cases/objects/[id].vue`

| 操作 | 元件/函數 | API | HTTP Method |
|------|-----------|-----|-------------|
| 頁面載入 | `onMounted` | `/real-estates/:id` | GET |
| 儲存編輯 | `handleSave` | `/real-estates/:id` | PATCH |

### Tab：出價紀錄 `#offer-records`

**Tab 檔案**：`apps/web-ele/src/views/cases/objects/offer-records.vue`

| 操作 | 元件/函數 | API | HTTP Method |
|------|-----------|-----|-------------|
| Tab 載入 | `loadOfferRecords` | `/bids?realEstateId=x` | GET |
| 點擊出價按鈕 | `handleAddRecord` | 開啟 Dialog | - |

### Dialog：新增/編輯出價

**Dialog 檔案**：`apps/web-ele/src/components/DialogCasesObjectsOfferRecordsAdd.vue`

| 操作 | 元件/函數 | API | HTTP Method |
|------|-----------|-----|-------------|
| Dialog 開啟 | `handleOpen` | `/contracts/simple-list` | GET |
| | | `/store-admins/simple-list` | GET |
| 新增出價 | `handleSubmit` | `/bids` | POST |
| 編輯出價 | `handleSubmit` | `/bids/:id` | PATCH |
| 載入編輯資料 | `loadEditData` | `/bids/:id` | GET |

---

## 成交管理 (deals)

### 頁面：成交列表 `/deals`
...
```

---

## Module 設計

### ui-api-index.md

**位置**：`Projects/.claude/modules/ui-api-index.md`

**功能**：被 `/debugP` 和 `/check-result` 引用，提供索引查詢指引

```markdown
## UI-API 索引使用指南

### 索引文件位置

| 前端專案 | 索引文件 |
|----------|----------|
| dashboard-nuxt | `@/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md` |
| frontend-nuxt | `@/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md` |

### 使用方式

1. **判斷前端專案**：
   - Bug 在 Dashboard 後台 → 查 `ui-api-index-dashboard.md`
   - Bug 在官網前台 → 查 `ui-api-index-frontend.md`

2. **根據 Bug Spec 操作步驟查表**：
   - 找到對應的「頁面 / Tab / Dialog」區塊
   - 取得「操作 → API」對應

3. **產出 API 序列**：
   - 按照操作順序，列出要打的 API

### 索引更新

當 `/pull-frontend` 有更新時，執行 `/build-ui-index` 更新索引。
```

---

## 整合 /pull-frontend

### 方案討論（2026-01-30）

#### Option A：簡易提示（採用）

**概念**：只根據 git pull 輸出判斷是否有更新，有更新就提示執行 `/build-ui-index`。

**優點**：
- 實作簡單，只需修改 `/pull-frontend` 輸出格式
- 不需要額外的變動紀錄機制
- 用戶可自行決定是否執行索引更新

**缺點**：
- 每次都是全量掃描，無法做增量更新
- 如果只改了一個檔案，也要重新掃描整個專案

**判斷邏輯**：
```
git pull 輸出包含 "Already up to date" → 沒有更新
其他情況（Updating xxx..xxx、檔案變更清單）→ 有更新
```

#### Option B：變動紀錄（未採用）

**概念**：`/pull-frontend` 記錄變動的檔案清單，`/build-ui-index` 根據清單做增量更新。

**優點**：
- 支援增量更新，只掃描有變動的檔案
- 效率更高（大專案時差異明顯）

**缺點**：
- 需要設計變動紀錄的儲存格式和位置
- 需要處理紀錄過期、清理等問題
- 實作複雜度較高

**變動紀錄格式（設計草稿）**：
```markdown
<!-- prompts/4_diary/debug/ui-api-index/.pull-frontend-changes.md -->
# Pull Frontend 變動紀錄

## 最後更新
- 時間：2026-01-30 14:30
- dashboard-nuxt commit：abc1234
- frontend-nuxt commit：def5678

## 變動檔案
### dashboard-nuxt
- apps/web-ele/src/views/cases/objects/[id].vue
- apps/web-ele/src/api/core/cases.ts

### frontend-nuxt
- （無變動）
```

### 決策結果

**採用 Option A**

**原因**：先採用簡易版，實際使用後再評估是否需要增量更新機制。如果發現全量掃描的效率問題明顯，再升級到 Option B。

### 實作內容

在 `/pull-frontend` 定義檔新增「索引更新提示」區塊：

```markdown
## 索引更新提示

### 判斷邏輯

檢查 git pull 輸出：
- 包含 `Already up to date` → 沒有更新
- 其他情況 → 有更新

### 提示規則

| dashboard-nuxt | frontend-nuxt | 提示內容 |
|----------------|---------------|----------|
| 有更新 | 有更新 | `💡 建議執行 /build-ui-index all` |
| 有更新 | 沒更新 | `💡 建議執行 /build-ui-index dashboard` |
| 沒更新 | 有更新 | `💡 建議執行 /build-ui-index frontend` |
| 沒更新 | 沒更新 | （不顯示提示）|
```

---

## 整合 /debugP 和 /check-result

### Module 實作（2026-01-30）

**已建立**：`Projects/.claude/modules/ui-api-index.md`

**內容**：
- 索引文件位置說明
- 三步驟使用方式（判斷專案 → 查表 → 產出序列）
- 索引結構說明（Dashboard vs Frontend 差異）
- 備用方案（手動搜尋）

### 修改 debug.md（2026-01-30 完成）

**變更 1**：在模組引用區新增：

```markdown
@/Users/nicholas/Desktop/Projects/.claude/modules/ui-api-index.md
```

**變更 2**：修改「Bug Fix 三步法 - Step 5.1 推導 API 序列」：

```markdown
├─ 5.1 推導 API 序列
│   ├─ 讀取 bug spec 的「重現步驟」
│   │
│   ├─ 【優先】查詢 UI-API 索引（參考 ui-api-index.md）
│   │   ├─ Dashboard 相關 → 查 ui-api-index-dashboard.md
│   │   ├─ Frontend 相關 → 查 ui-api-index-frontend.md
│   │   └─ 根據「頁面/Tab/Dialog」查表取得 API
│   │
│   ├─ 【備用】若索引無對應項目
│   │   └─ 手動搜尋前端專案
│   │
│   └─ 產出 API 序列（如：GET → POST）
```

**效益**：
| 方式 | 操作次數 | Context 消耗 |
|------|----------|-------------|
| ❌ 手動搜尋前端 | 3-5 次 Grep + 2-3 次 Read | 高 |
| ✅ 查索引取得 API | 1 次 Read 索引 | 低 |

### 修改 check-result.md（2026-01-30 ✅ 完成）

同樣新增 module 引用和查詢索引的步驟：

1. **新增 module 引用**：
   ```markdown
   @/Users/nicholas/Desktop/Projects/.claude/modules/ui-api-index.md
   ```

2. **更新流程圖 Step 6.1**：加入索引查詢分支

3. **更新詳細說明 Step 6.1**：
   - 【優先】查詢 UI-API 索引
   - 【備用】手動搜尋前端專案

4. **更新設計稿**：新增「UI-API 索引整合」區塊

---

## 掃描策略

### 索引深度研究（2026-01-29）

以「出價紀錄」功能為例，追蹤完整的 API 呼叫鏈路：

```
「點選物件編輯 → 出價紀錄 tab → 點出價按鈕」
│
├─ 1. 【頁面】views/cases/objects/[id].vue
│   └─ 載入物件資料
│
├─ 2. 【Tab 元件】views/cases/objects/offer-records.vue
│   ├─ import { getBidsApi } from '#/api/core'
│   └─ 呼叫 getBidsApi() → GET /bids
│
├─ 3. 【Dialog 元件】components/DialogCasesObjectsOfferRecordsAdd.vue
│   ├─ import { createBidApi, editBidApi, ... } from '#/api/core'
│   └─ 呼叫 createBidApi() → POST /bids
│
├─ 4. 【API 定義】api/core/cases.ts
│   └─ export function createBidApi() { return requestClient.post('/bids') }
│
└─ 5. 【HTTP Client】requestClient
    └─ 實際發送 HTTP 請求到後端
```

#### 發現：API 呼叫模式

| 模式 | 說明 | 比例 |
|------|------|------|
| **直接呼叫** | `.vue` 檔案直接 import `api/core` 的函數 | 大部分 |
| **Composable 封裝** | 經過 `composables/*.ts` 再打 API | 少數（如 use-file-upload.ts）|

#### 結論：索引需要追蹤的層級

| 層級 | 需要索引？ | 原因 |
|------|-----------|------|
| **views/*.vue** | ✅ 必要 | 頁面入口 |
| **components/*.vue** | ✅ 必要 | Dialog、功能元件直接打 API |
| **api/core/*.ts** | ✅ 必要 | API 函數定義 → HTTP endpoint |
| **composables/*.ts** | ⚠️ 部分 | 只索引「有封裝 API 呼叫」的 composable |

### Dashboard-Nuxt 掃描範圍

```
dashboard-nuxt/apps/web-ele/src/
├─ views/           # 頁面（必要）
│   ├─ cases/       # 物件管理
│   ├─ deals/       # 成交管理
│   ├─ customers/   # 客戶管理
│   └─ ...
├─ components/      # 元件（必要，尤其是 Dialog）
├─ composables/     # 僅索引有封裝 API 的（如 use-file-upload.ts）
└─ api/core/        # API 定義（必要，取得 endpoint）
```

### 掃描規則

1. **Step 1：掃描 API 定義**
   - 掃描 `api/core/*.ts`
   - 建立「API 函數名稱 → HTTP endpoint」對照表
   - 例：`createBidApi` → `POST /bids`

2. **Step 2：掃描頁面級 API**
   - 掃描 `views/` 下所有 `.vue` 檔案
   - 找 `onMounted`、`onBeforeMount` 中的 API 呼叫
   - 記錄「頁面載入 → API」

3. **Step 3：掃描功能級 API**
   - 找 `<ElButton @click="xxx">` 等互動元素
   - 找 `<ElTab>` 切換觸發的載入
   - 追蹤 handler 函數到 API 呼叫

4. **Step 4：掃描 Dialog 元件**
   - 掃描 `components/Dialog*.vue`
   - 找 `handleSubmit`、`handleSave` 等提交函數

5. **Step 5：掃描 Composables（條件）**
   - 掃描 `composables/*.ts`
   - 使用下方「Composables 掃描策略」找出有封裝 API 的檔案
   - 只索引符合條件的 composable

### API 識別模式

```javascript
// 模式 1：直接 import API 函數（最常見，在 .vue 檔案中）
import { xxxApi } from '#/api/core'
const { data } = await xxxApi(params)

// 模式 2：在 api/core/*.ts 中定義
export async function createBidApi(data) {
  return requestClient.post('/bids', data)
}

// 模式 3：Composable 封裝（少數）
// composables/use-file-upload.ts
const response = await createApi(requestData)
```

### Composables 掃描策略

Composables 中封裝 API 有兩種模式：

#### 模式 A：參數注入（如 use-file-upload.ts）

```typescript
// composable 接受 API 函數作為參數
export function useFileUpload(
  createApi: (data: any) => Promise<CreateApiResponse>,  // ← API 函數作為參數
  options
) {
  // ...
  const response = await createApi(requestData)  // ← 呼叫傳入的 API
}
```

**特徵**：函數簽名中有 `xxxApi:` 型別定義

#### 模式 B：直接 import

```typescript
import { createXxxApi } from '#/api/core'

export function useXxx() {
  const response = await createXxxApi(data)
}
```

**特徵**：`import { xxxApi } from '#/api`

#### 掃描指令

```bash
# 策略 1：找「API 函數作為參數」的 composable
rg "Api:" composables/*.ts

# 策略 2：找「直接 import API」的 composable
rg "from ['\"]#/api|from ['\"]@/api" composables/*.ts

# 策略 3：找「呼叫 xxxApi()」的 composable
rg "Api\(" composables/*.ts

# 組合：找出所有有封裝 API 的 composables
rg -l "(Api:|from ['\"]#/api|from ['\"]@/api|Api\()" composables/*.ts
```

#### 目前已知有封裝 API 的 Composables

| 檔案 | 封裝模式 | 說明 |
|------|----------|------|
| `use-file-upload.ts` | 參數注入 | 接受 `createApi` 參數 |
| `use-multi-file-upload-with-replace.ts` | 參數注入 | 使用 `useFileUpload` |

---

## 掃描效率優化（2026-01-30 實作經驗）

### 問題

逐一讀取所有 API 定義檔（`api/core/*.ts`）會耗費大量 context，不適合在 AI Skill 中使用。

### 解決方案

使用 Grep 直接提取「API 函數 → endpoint → HTTP method」對應，避免讀取完整檔案內容。

### 優化後的掃描策略

#### 1. API 定義掃描（不讀檔，用 Grep）

```bash
# 直接提取 requestClient 呼叫，取得 method 和 endpoint
rg "requestClient\.(get|post|patch|put|delete)\(['\"\`]" api/core/*.ts --context 0

# 輸出範例：
# cases.ts:282:  return requestClient.post('/estate-listings', data);
# cases.ts:357:  return requestClient.get('/bids', { params });
```

#### 2. 頁面/Dialog 掃描（先篩選，再讀取）

```bash
# Step 1: 找出有 import API 的檔案（不讀內容）
rg -l "from ['\"]#/api" views/

# Step 2: 只讀取有 import API 的檔案
# 這樣可以跳過沒有 API 呼叫的頁面
```

#### 3. Composables 掃描（先篩選）

```bash
# 找出有封裝 API 的 composables（通常很少）
rg -l "(Api:|from ['\"]#/api|Api\()" composables/*.ts
```

### 效率比較

| 方法 | 操作次數 | Context 消耗 |
|------|----------|-------------|
| 逐一讀取所有檔案 | 95+ 次 Read | 高 |
| Grep 篩選 + 讀取 | 3 次 Grep + 少量 Read | 低 |

### 建議執行順序

```
1. Grep 提取 API 定義（取得 endpoint 對照表）
2. Grep 找出有 import API 的頁面清單
3. Grep 找出有 import API 的 Dialog 清單
4. Grep 找出有封裝 API 的 Composables
5. 只讀取「關鍵檔案」建立索引（如物件管理的核心頁面）
6. 其他檔案用 Grep 結果推斷
```

---

## Task 追蹤機制

### 設計決策（2026-01-30）

全量掃描時檔案很多，需要 Task 追蹤進度，讓用戶知道目前執行到哪個步驟。

### 啟用條件

| 掃描模式 | 是否啟用 Task | 原因 |
|----------|--------------|------|
| 全量掃描 | ✅ 啟用 | 檔案多、時間長，需要追蹤進度 |
| 增量掃描 | ✅ 啟用 | 讓用戶能掌握進度，比較安心 |

### Task 列表

**全量掃描（10 步）**：

| # | Subject | activeForm |
|---|---------|------------|
| 1 | 解析參數與判斷模式 | 解析參數... |
| 2 | 掃描 API 定義 (api/core/*.ts) | 掃描 API 定義... |
| 3 | 掃描頁面 (views/**/*.vue) | 掃描頁面... |
| 4 | 掃描功能操作 (@click handler) | 掃描功能操作... |
| 5 | 掃描 Dialog (components/Dialog*.vue) | 掃描 Dialog... |
| 6 | 掃描 Composables | 掃描 Composables... |
| 7 | 產出 Dashboard 索引 | 產出 Dashboard 索引... |
| 8 | 產出 Frontend 索引 | 產出 Frontend 索引... |
| 9 | 驗證索引文件 | 驗證索引文件... |
| 10 | 輸出結果統計 | 輸出結果... |

**增量掃描（6 步）**：

| # | Subject | activeForm |
|---|---------|------------|
| 1 | 解析參數與判斷模式 | 解析參數... |
| 2 | 讀取變動檔案清單 | 讀取變動清單... |
| 3 | 掃描變動檔案 | 掃描變動檔案... |
| 4 | 更新索引文件 | 更新索引... |
| 5 | 驗證索引文件 | 驗證索引文件... |
| 6 | 輸出結果統計 | 輸出結果... |

### Task 更新規則

- 開始步驟時：`TaskUpdate(status: 'in_progress')`
- 完成步驟時：`TaskUpdate(status: 'completed')`
- 遇到問題時：保持 `in_progress` 並說明問題

---

## 實作狀態

- [x] 設計稿確認（2026-01-30）
- [x] 建立 `ui-api-index/` 目錄（2026-01-29）
- [x] 實作 `/build-ui-index` skill（2026-01-30）
- [x] 首次執行 `/build-ui-index dashboard`（2026-01-30，commit 95a9901）
- [x] 執行 `/build-ui-index frontend`（2026-01-30，commit d4a30f9）
- [x] 建立 `ui-api-index.md` module（2026-01-30）
- [x] 修改 `/debugP` 整合索引查詢（2026-01-30）
- [x] 修改 `/check-result` 整合索引查詢（2026-01-30）
- [x] 修改 `/pull-frontend` 新增更新提示（Option A，2026-01-30）
- [ ] 測試驗證

---

## 設計決策總結

| 討論項目 | 決策 | 原因 |
|----------|------|------|
| 索引範圍 | dashboard-nuxt + frontend-nuxt | 對應後端 adminApi + publicApi |
| 索引粒度 | 頁面級 + 功能級 | 完整覆蓋操作步驟 |
| 使用方式 | Skill + Module | Skill 建立索引，Module 供查詢 |
| 更新機制 | AI Skill + 增量更新 | 搭配 /pull-frontend，只更新有變動的部分 |
| 索引位置 | prompts 專案 | 納入版本控制，可追蹤歷史 |
| 索引深度 | views + components + api/core + 部分 composables | 研究實際呼叫鏈路後確認 |
| 索引驗證 | 不需要 | 前端打的 API 一定存在 |
| 掃描效率 | Grep 篩選 + 少量讀取 | 避免逐一讀取耗費大量 context |
| /pull-frontend 整合 | Option A 簡易提示 | 先簡單做，實際使用後再評估是否需要增量機制 |

---

## 設計決策討論紀錄

### 1. 索引深度（2026-01-29 已確認）

**問題**：是否需要追蹤到 composables / hooks 層級？

**研究過程**：以「出價紀錄」功能追蹤完整 API 呼叫鏈路（見「掃描策略 > 索引深度研究」）

**結論**：
- ✅ `views/*.vue` - 必要
- ✅ `components/*.vue` - 必要
- ✅ `api/core/*.ts` - 必要
- ⚠️ `composables/*.ts` - 僅索引有封裝 API 呼叫的（目前只有 `use-file-upload.ts`）

---

### 2. 增量更新（2026-01-29 已確認）

**問題**：每次全量重建？還是只更新有變動的部分？

**決策**：✅ 增量更新

**設計**：
- `/pull-frontend` 執行時記錄有變動的檔案清單
- `/build-ui-index` 根據變動清單，只重新掃描有變動的檔案
- 索引文件中記錄每個區塊的「最後掃描 commit」

**增量更新流程**：

```
/build-ui-index 增量更新流程
│
├─ 1. 【檢查變動】
│   ├─ 讀取 /pull-frontend 記錄的變動檔案清單
│   └─ 若無變動紀錄 → 全量掃描
│
├─ 2. 【篩選需更新範圍】
│   ├─ 過濾出 views/, components/, api/, composables/ 的變動
│   └─ 確定要重新掃描的檔案
│
├─ 3. 【增量掃描】
│   ├─ 只讀取有變動的檔案
│   └─ 更新對應的索引區塊
│
└─ 4. 【合併索引】
    ├─ 將新掃描結果合併到現有索引
    └─ 更新「最後更新時間」和「掃描 commit」
```

**索引文件格式調整**：

```markdown
## 物件管理 (cases/objects)

<!-- scan-meta: commit=abc1234, date=2026-01-29 -->

### 頁面：物件編輯 `/cases/objects/:id`
...
```

---

### 3. 索引驗證（2026-01-29 已確認）

**問題**：是否需要驗證索引中的 API 在後端確實存在？

**決策**：❌ 不需要

**原因**：前端打的 API 一定是後端存在的，否則功能早就壞了。不需要額外驗證。

---

### 4. 執行原則與限制（2026-02-08 新增）

**問題**：AI 在執行 `/build-ui-index` 時，誤判為複雜任務而開啟 agent，導致執行時間過長（6+ 分鐘）。

**決策**：❌ 禁止使用 Task tool

**執行原則**：
1. **直接執行**：所有步驟都要在當前 session 中完成
2. **禁止開 agent**：不得使用 Task tool 委派給其他 agent
3. **使用 Grep + Read**：直接使用 Grep 和 Read 工具處理檔案

**原因**：
- 開 agent 會導致執行時間過長（實測 6 分 15 秒）
- 增量掃描模式下，檔案數量有限（通常 < 10 個），直接執行更快
- Task tool 適合長時間背景任務，不適合此 skill
- 直接執行可以即時回饋進度，用戶體驗更好

**TaskCreate 使用規則**：
- ✅ 可以使用 TaskCreate 追蹤進度
- ✅ 可以使用 TaskUpdate 更新狀態
- ❌ 禁止使用 Task tool 開啟 agent
- ❌ 禁止委派給其他 agent 執行

**步驟結構統一**（2026-02-08 更新）：
- 定義檔、流程圖、設計稿的步驟編號已統一
- 定義檔新增 Step 0 的 TaskCreate 列表
- 定義檔新增 Step 9「驗證索引文件」
- 確保三份文件步驟一致

**實測數據**（2026-02-08）：
| 執行方式 | 時間 | 檔案數 |
|----------|------|--------|
| ❌ 開 agent | 6 分 15 秒 | 4 個變更檔案 |
| ✅ 直接執行 | 預估 < 1 分鐘 | 4 個變更檔案 |

**定義檔修改**：
- 在定義檔開頭新增「⚠️ 執行原則」區塊
- 明確標註「禁止使用 Task tool」
- 在流程圖中新增警告標示

**相容性檢查**：
- ✅ 與現有流程相容：只是禁止開 agent，不影響功能邏輯
- ✅ 與 TaskCreate 機制相容：仍可使用 TaskCreate 追蹤進度，但不開 agent
- ✅ 與增量掃描相容：直接執行反而更適合增量掃描的少量檔案
