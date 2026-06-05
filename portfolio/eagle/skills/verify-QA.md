---
description: 官網與大後台欄位三方比對驗證（v2 API ↔ 大後台 API ↔ DB）
argument-hint: <module> [env]
allowed-tools: Bash(./scripts/*:*), Bash(./.claude/scripts/*:*), Bash(curl:*), Bash(lsof:*), Bash(PGPASSWORD=*), Bash(export PGPASSWORD=*)
design-doc: prompts/4_diary/debug/proposal/slash/verify-QA_skill_proposal.md
---

@.claude/flowcharts/verify-QA_flowchart.md

@/Users/nicholas/Desktop/Projects/.claude/modules/db-connection-rules.md

# verify-QA - 官網與大後台欄位三方比對驗證

驗證資料從 DB → v2 API → 大後台 API 的完整流程正確。以官網為基準，只驗證官網有顯示的欄位。先讀取前端索引表 + Vue 程式碼確認實際顯示欄位，再進行三方比對。

## 參數

- `$1`：模組名稱（必要）— objects / factory / teams / real-price
- `$2`：環境（可選）— dev（預設）/ staging

## 模組驗證範圍

| 模組 | 驗證類型 | 詳情頁欄位 | 列表頁欄位 |
|------|---------|-----------|-----------|
| objects | 三方比對 | 52 | 11（買賣）/ 12（租賃） |
| factory | 三方比對 | 52（4 個差異） | 15 |
| teams | 三方比對 | 18（分店 10 + 員工 8） | 4 |
| real-price | 雙向比對 | - | 8（v2 API ↔ DB，無大後台） |

## 核心原則

- **官網為基準**：只驗證官網有顯示的欄位，大後台獨有欄位不驗證
- **推薦物件不額外驗證**：與列表頁欄位完全相同，驗證列表頁即可涵蓋
- **S3 URL 不直接比對**：presigned URL 每次不同，比對原始路徑即可
- **teams 模組注意**：大後台 `stores` endpoint 用 PG 的 `id`（integer），不是 `storeId`（string）

## 檔案路徑

| 檔案 | 路徑 |
|------|------|
| 三方對照表（Proposal 5） | `prompts/4_diary/publicApi/v2/objects_api/approvement_connection/0223_5_verifyDashboard_discussion.md` |
| objects 測試 ID | `prompts/4_diary/publicApi/v2/objects_api/objects_v2_verify_proposal.md` |
| factory 測試 ID | `prompts/4_diary/publicApi/v2/objects_api/factory_v2_verify_proposal.md` |
| teams 測試 ID | `prompts/4_diary/publicApi/v2/teams_api/teams_v2_verify_proposal.md` |
| 驗證結果輸出 | `prompts/4_diary/publicApi/v2/qa_verify/{module}_qa_verify.md` |
| 官網前端索引表 | `prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md` |
| 大後台前端索引表 | `prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md` |

## 執行步驟

### Step 0: 建立進度追蹤（強制）

```
TaskCreate: subject="Step 1: 讀取前端索引表 + 讀 Vue 程式碼", activeForm="讀取前端索引表..."
TaskCreate: subject="Step 2: 讀取三方對照表並確認驗證欄位", activeForm="讀取三方對照表..."
TaskCreate: subject="Step 3: 定位測試物件 ID", activeForm="定位測試物件 ID..."
TaskCreate: subject="Step 4: 查詢 v2 API 回傳值", activeForm="查詢 v2 API..."
TaskCreate: subject="Step 5: 查詢大後台 API 回傳值", activeForm="查詢大後台 API..."
TaskCreate: subject="Step 6: 查詢 DB 原始值", activeForm="查詢 DB 原始值..."
TaskCreate: subject="Step 7: 三方比對", activeForm="執行三方比對..."
TaskCreate: subject="Step 8: 寫入驗證結果", activeForm="寫入驗證結果..."
```

> real-price 模組跳過 Step 5（無大後台對應）

### Step 1: 讀取前端索引表 + 讀 Vue 程式碼

1. **從前端索引表定位頁面檔案路徑**：
   - 讀取官網索引表：`prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md`
   - 讀取大後台索引表：`prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md`
   - 根據模組找到對應的頁面檔案路徑

   **模組 → 頁面檔案對照**：

   | 模組 | 前端 | 頁面檔案路徑（從索引表取得） |
   |------|------|---------------------------|
   | objects | 官網詳情頁 | `frontend-nuxt/pages/sales/[id].vue` |
   | objects | 官網列表頁 | `frontend-nuxt/pages/sales/index.vue` |
   | objects | 大後台編輯頁 | `dashboard-nuxt/.../views/cases/objects/basic-info.vue` |
   | objects | 大後台列表頁 | `dashboard-nuxt/.../views/cases/objects/index.vue` |
   | factory | 官網詳情頁 | 與 objects 共用 `pages/sales/[id].vue` |
   | factory | 官網列表頁 | `frontend-nuxt/pages/factories/index.vue` |
   | factory | 大後台 | 與 objects 共用 |
   | teams | 官網頁面 | `frontend-nuxt/pages/branch/index.vue` |
   | teams | 大後台列表頁 | `dashboard-nuxt/.../views/hr-admin/branch.vue` |
   | teams | 大後台編輯頁 | `dashboard-nuxt/.../components/DialogHrAdminBranchEdit.vue` |
   | real-price | 官網元件 | `frontend-nuxt/components/homepage/ActualPriceSection.vue` |
   | real-price | 大後台 | 無 |

2. **讀取 Vue 程式碼，提取實際使用的欄位**：
   - 讀取上述 Vue 檔案
   - 從 template 區塊提取實際綁定的欄位（如 `{{ item.storeShortName }}`、`:prop="row.address"` 等）
   - 區分詳情頁和列表頁的欄位

3. **輸出前端實際使用欄位清單**：
   - 官網顯示欄位（詳情頁 + 列表頁）
   - 大後台顯示欄位（編輯頁 + 列表頁）

### Step 2: 讀取三方對照表並確認驗證欄位

1. 讀取 Proposal 5：`0223_5_verifyDashboard_discussion.md`
2. 用 Step 1 的前端欄位清單交叉比對三方對照表
3. 只提取「前端程式碼中有使用」的欄位
4. 確認最終驗證欄位清單（詳情頁 + 列表頁）

### Step 3: 定位測試物件 ID

**詳情頁測試 ID（從 proposal 提取）**：

1. **objects** → 讀取 `objects_v2_verify_proposal.md`，提取測試物件 ID
2. **factory** → 讀取 `factory_v2_verify_proposal.md`，提取測試物件 ID
3. **teams** → 讀取 `teams_v2_verify_proposal.md`，提取測試分店 storeId
4. **real-price** → 先呼叫 v2 API 取得前 N 筆，從回傳結果取 ID
5. 無 proposal 或無 ID → 要求用戶提供測試 ID

**列表頁測試 ID（從列表 API 回傳取得）**：

- 查詢列表 API 後，從回傳結果取任一筆物件 ID（不需要與詳情頁相同）

### Step 4: 查詢 v2 API 回傳值

1. **確認 local server 已啟動**
   ```bash
   lsof -i :3001
   # 沒有 → ./.claude/scripts/start-dev-server.sh
   ```

2. **逐模組查詢**

   **objects**：
   ```bash
   # 詳情（買賣）— 使用詳情頁測試 ID
   curl -s http://localhost:3001/frontend/v2/objects/{detail_id} | jq .
   # 詳情（租賃）— 使用詳情頁測試 ID
   curl -s http://localhost:3001/frontend/v2/objects/rent/{detail_id} | jq .
   # 列表（買賣）— 從回傳結果取第一筆 idx 作為列表頁測試 ID
   curl -s http://localhost:3001/frontend/v2/objects -X POST -H "Content-Type: application/json" -d '{"page":1,"pageSize":10}' | jq .
   # 列表（租賃）— 從回傳結果取第一筆 idx 作為列表頁測試 ID
   curl -s http://localhost:3001/frontend/v2/objects/rent -X POST -H "Content-Type: application/json" -d '{"page":1,"pageSize":10}' | jq .
   ```

   **factory**：
   ```bash
   # 詳情 — 使用詳情頁測試 ID
   curl -s http://localhost:3001/frontend/v2/objects/factory/{detail_id} | jq .
   # 列表 — 從回傳結果取第一筆 idx 作為列表頁測試 ID
   curl -s http://localhost:3001/frontend/v2/objects/factory/list -X POST -H "Content-Type: application/json" -d '{"page":1,"pageSize":10}' | jq .
   ```

   **teams**：
   ```bash
   # 詳情 — 使用詳情頁測試 storeId
   curl -s http://localhost:3001/frontend/v2/teams/{detail_storeId} | jq .
   # 列表 — 從回傳結果取第一筆 storeId 作為列表頁測試 ID
   curl -s http://localhost:3001/frontend/v2/teams -X POST -H "Content-Type: application/json" -d '{}' | jq .
   ```

   **real-price**：
   ```bash
   curl -s "http://localhost:3001/frontend/v2/objects/real-price?city=A&page=1&pageSize=10" | jq .
   ```

3. **記錄**：詳情頁用詳情 ID 的回傳值，列表頁用列表回傳的物件資料

### Step 5: 查詢大後台 API 回傳值（僅詳情頁測試 ID）

> ⚠️ real-price 模組跳過此步驟

1. **取得 token**
   ```bash
   ./.claude/scripts/get-token.sh {env} {account}
   # 帳號從對話上下文找，找不到用預設 12345678
   ```

2. **逐模組查詢**（使用詳情頁測試 ID）

   **objects / factory**：
   ```bash
   curl -s http://localhost:3001/api/v1/estate-listings/{detail_id} -H "Authorization: Bearer {token}" | jq .
   ```

   **teams**：
   ```bash
   # 注意：用 PG 的 id（integer），不是 storeId（string）
   curl -s http://localhost:3001/api/v1/stores/{detail_id} -H "Authorization: Bearer {token}" | jq .
   ```

3. 記錄每個測試物件的大後台 API 回傳值

> ⚠️ 列表頁測試 ID 的大後台查詢在 Step 7 比對時執行

### Step 6: 查詢 DB 原始值（僅詳情頁測試 ID）

1. **確認 SSH Tunnel**
   ```bash
   ./scripts/db-tunnel.sh {env} all
   ```

2. **逐模組查詢**（使用詳情頁測試 ID）

   **objects / factory**：
   ```bash
   export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
   SELECT re.id, re.\"nameOnline\", re.\"contractSerialNumber\", re.\"advertisedPrice\",
          re.\"buildingArea\", re.\"landArea\", re.\"businessDistrict\",
          re.\"hasStall\", re.\"stallDesc\",
          store.\"storeName\", store.\"companyName\"
   FROM \"realEstate\" re
   LEFT JOIN \"storeData\" store ON store.id = re.\"storeId\"
   WHERE re.id IN ({detail_ids});
   "
   ```

   **teams**：
   ```bash
   export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
   SELECT store.id, store.\"storeId\", store.\"shortName\", store.address,
          store.tel, store.email, store.\"companyName\", store.\"openTime\",
          store.\"picturePath\", store.\"mallInfo\",
          admin.name AS \"employeeName\", admin.mobile1 AS \"employeeCellPhone\",
          admin.email AS \"employeeEmail\", admin.skills AS \"employeeSpecialSkill\",
          admin.note AS \"employeeMemo\",
          admin.\"salesLicenseNo\" AS \"employeeShopEmployeeLicenseId\",
          admin.\"pictureFilePath\" AS \"employeePictureFileName\",
          role.name AS \"roleName\"
   FROM \"storeData\" store
   LEFT JOIN \"storeAdmin\" sa ON sa.\"storeId\" = store.id
   LEFT JOIN admin ON admin.id = sa.\"adminId\"
   LEFT JOIN role ON role.id = admin.\"systemRoleId\"
   WHERE store.\"storeId\" IN ({detail_storeIds})
     AND admin.status = 2
     AND admin.\"salesLicenseNo\" IS NOT NULL;
   "
   ```

   **real-price**：
   ```bash
   export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
   SELECT rp.id, rp.\"buildingState\",
          rp.\"landSectorPositionBuildingSectorHouseNumberPlate\",
          rp.\"totalPriceNTD\", rp.\"berthCategory\",
          rp.\"mainBuildingArea\", rp.\"landShiftingTotalAreaSquareMeter\",
          rp.\"transactionYearMonthAndDay\"
   FROM \"realPrice\" rp
   WHERE rp.id IN ({detail_ids});
   "
   ```

3. 記錄每個測試物件的 DB 原始值

> ⚠️ 列表頁測試 ID 的 DB 查詢在 Step 7 比對時執行

### Step 7: 三方比對

1. 遍歷「前端程式碼中實際使用的欄位」清單（詳情頁 + 列表頁）

2. **詳情頁比對**（使用詳情頁測試 ID）：
   - **objects / factory / teams** → v2 API ↔ 大後台 API ↔ DB（三方）
   - **real-price** → v2 API ↔ DB（雙向，無大後台）

3. **列表頁比對**（使用列表 API 回傳的物件 ID）：
   - 從列表 API 回傳取得物件 ID（任一筆）
   - 用該 ID 查詢大後台詳情 API + DB 原始值
   - 比對列表頁顯示的欄位（不是全部欄位）

4. **比對規則**：
   - 考慮轉換邏輯（enum→中文、組裝字串、計算值、S3 URL）
   - 推薦物件不額外驗證（與列表頁欄位完全相同）

5. 標記每個欄位 ✅ / ❌

### Step 8: 寫入驗證結果

1. **建立驗證文件**：`prompts/4_diary/publicApi/v2/qa_verify/{module}_qa_verify.md`

2. **寫入內容**：
   - 三方對照表（詳情頁 + 列表頁分開列）
   - 三方比對驗證表（per 測試物件，詳情頁 + 列表頁分開）
   - 驗證總結（通過率、失敗欄位清單）
   - 結論（全部通過 / 發現問題 + 修復建議）

3. **印出驗證摘要**

   全 pass：
   ```
   ✅ verify-QA 完成（{module} / {env}）
   - 測試物件：N 筆
   - 詳情頁：N 欄位，通過率 100%
   - 列表頁：N 欄位，通過率 100%

   📄 結果已寫入：prompts/4_diary/publicApi/v2/qa_verify/{module}_qa_verify.md
   ```

   有差異：
   ```
   ❌ verify-QA 發現問題（{module} / {env}）
   - 測試物件：N 筆
   - 詳情頁：N 欄位，通過率 XX%（N 個失敗）
   - 列表頁：N 欄位，通過率 XX%（N 個失敗）

   📄 詳見：prompts/4_diary/publicApi/v2/qa_verify/{module}_qa_verify.md
   ```

   real-price：
   ```
   ✅ verify-QA 完成（real-price / {env}）
   - 測試筆數：N 筆
   - 驗證欄位：8 個（v2 API ↔ DB 雙向）
   - 通過率：100%

   📄 結果已寫入：prompts/4_diary/publicApi/v2/qa_verify/real-price_qa_verify.md
   ```
