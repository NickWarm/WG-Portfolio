# verify-QA 設計稿

> 📅 建立日期：2026-03-04
> 📅 更新日期：2026-03-04（區分詳情頁/列表頁測試 ID 來源）
> 關聯：Proposal 5 - verify-QA Skill 設計討論

---

## 問題描述

### 現況痛點

修復 publicApi 欄位映射問題後，需要驗證「資料從 DB 到官網/大後台的完整流程是否正確」。

目前沒有系統化的方式做這件事：
- 手動開瀏覽器比對官網與大後台，費時且容易遺漏
- 沒有記錄驗證過程，下次修改後無法快速重跑
- 三方比對（DB ↔ v2 API ↔ 大後台 API）需要同時查多個地方

### 預期效益

- 自動化三方比對：DB 原始值 ↔ v2 API 回傳值 ↔ 大後台 API 回傳值
- 不需要手動開瀏覽器，純程式碼 + DB 查詢驗證
- 驗證結果記錄到獨立文件，可重複執行
- 以官網為基準：只驗證官網有顯示的欄位，大後台獨有欄位不驗證

---

## 執行流程圖

```
/verify-QA 執行流程
│
├─ 1. 【參數解析】
│   ├─ $1 = module（必要）— objects / factory / teams / real-price
│   └─ $2 = env（可選）— dev（預設）/ staging
│
├─ 2. 【讀取三方對照表】
│   ├─ 讀取 Proposal 5 的三方對照表
│   ├─ objects → 詳情頁 52 欄位 + 列表頁 11 欄位
│   ├─ factory → 與 objects 相同（注意 4 個差異點）+ 列表頁 15 欄位
│   ├─ teams → 詳情頁（分店 10 + 員工 8）+ 列表頁 4 欄位
│   └─ real-price → 8 欄位（僅 v2 API ↔ DB 雙向驗證）
│
├─ 3. 【定位測試物件 ID】
│   ├─ 詳情頁測試 ID（從 proposal 提取）：
│   │   ├─ objects/factory → 從 objects_v2_verify_proposal.md 提取
│   │   ├─ teams → 從 teams_v2_verify_proposal.md 提取 storeId
│   │   ├─ real-price → 從 v2 API 回傳的前 N 筆取 ID
│   │   └─ 無 proposal → 要求用戶提供測試 ID
│   │
│   └─ 列表頁測試 ID（從列表 API 回傳取得）：
│       └─ 查詢列表 API 後，從回傳結果取任一筆物件 ID（不需要與詳情頁相同）
│
├─ 4. 【查詢 v2 API 回傳值】
│   ├─ 確認 local server 已啟動（port 3001）
│   │
│   ├─ 詳情 API（使用 Step 3 的詳情頁測試 ID）：
│   │   ├─ objects → GET /frontend/v2/objects/:id（買賣）或 /objects/rent/:id（租賃）
│   │   ├─ factory → GET /frontend/v2/objects/factory/:id
│   │   ├─ teams → GET /frontend/v2/teams/:storeId
│   │   └─ real-price → GET /frontend/v2/objects/real-price
│   │
│   ├─ 列表 API（查詢後從回傳結果取列表頁測試 ID）：
│   │   ├─ objects → POST /frontend/v2/objects → 取回傳第一筆的 idx 作為列表頁測試 ID
│   │   ├─ objects（租賃）→ POST /frontend/v2/objects/rent → 取回傳第一筆的 idx
│   │   ├─ factory → POST /frontend/v2/objects/factory/list → 取回傳第一筆的 idx
│   │   └─ teams → POST /frontend/v2/teams → 取回傳第一筆的 storeId
│   │
│   └─ 記錄：詳情頁用詳情 ID 的回傳值，列表頁用列表回傳的物件資料
│
├─ 5. 【查詢大後台 API 回傳值】（詳情頁測試 ID）
│   ├─ 取得 token：使用 get-token.sh {env} {account}
│   ├─ objects/factory → GET /api/v1/estate-listings/:id
│   │   └─ 大後台頁面：/cases/objects/:id（物件編輯頁 basic-info.vue）
│   ├─ teams → GET /api/v1/stores/:id
│   │   └─ 大後台頁面：/hr-admin/branch（分店管理 DialogHrAdminBranchEdit.vue）
│   ├─ real-price → 跳過（無大後台對應）
│   └─ ⚠️ 列表頁測試 ID 的大後台查詢在 Step 7 比對時執行
│
├─ 6. 【查詢 DB 原始值】（詳情頁測試 ID）
│   ├─ db-tunnel.sh {env} all（確認 SSH Tunnel 已啟動）
│   ├─ objects/factory → 查詢 realEstate + 關聯表（storeData、pointOfInterest、landInfo 等）
│   ├─ teams → 查詢 storeData + storeAdmin + admin + role
│   ├─ real-price → 查詢 realPrice 表
│   └─ ⚠️ 列表頁測試 ID 的 DB 查詢在 Step 7 比對時執行
│
├─ 7. 【三方比對】
│   ├─ 遍歷「官網有顯示的欄位」清單（詳情頁 + 列表頁）
│   │
│   ├─ 詳情頁比對（使用詳情頁測試 ID）：
│   │   ├─ objects/factory/teams → v2 API ↔ 大後台 API ↔ DB（三方）
│   │   └─ real-price → v2 API ↔ DB（雙向，無大後台）
│   │
│   ├─ 列表頁比對（使用列表 API 回傳的物件 ID）：
│   │   ├─ 從列表 API 回傳取得物件 ID（任一筆）
│   │   ├─ 用該 ID 查詢大後台詳情 API + DB 原始值
│   │   └─ 比對列表頁顯示的欄位（不是全部欄位）
│   │
│   ├─ 考慮轉換邏輯（enum→中文、組裝字串、計算值、S3 URL）
│   ├─ 推薦物件不額外驗證（與列表頁欄位完全相同）
│   └─ 標記每個欄位 ✅ / ❌
│
└─ 8. 【寫入驗證結果】
    ├─ 建立獨立驗證文件：prompts/4_diary/publicApi/v2/qa_verify/{module}_qa_verify.md
    ├─ 寫入三方比對驗證表（詳情頁 + 列表頁分開列）
    └─ 印出驗證摘要（通過率、失敗欄位清單）
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 是 | 模組名稱 | `objects` / `factory` / `teams` / `real-price` |
| `$2` | 否 | 環境（預設 dev） | `staging` |

### 模組說明

| 模組 | 驗證類型 | v2 API Endpoint | adminApi Endpoint | 大後台頁面 | 主要 DB 表 | 詳情頁測試 ID 來源 | 列表頁測試 ID 來源 |
|------|---------|----------------|----------------------|-----------|-----------|-------------------|-------------------|
| `objects` | 三方比對 | 詳情：`GET /objects/:id`、`GET /objects/rent/:id`；列表：`POST /objects` | `GET /estate-listings/:id` | `/cases/objects/:id`（basic-info.vue） | `realEstate` | `objects_v2_verify_proposal.md` | 列表 API 回傳第一筆 |
| `factory` | 三方比對 | 詳情：`GET /objects/factory/:id`；列表：`POST /objects/factory/list` | `GET /estate-listings/:id` | `/cases/objects/:id`（basic-info.vue） | `realEstate` | `factory_v2_verify_proposal.md` | 列表 API 回傳第一筆 |
| `teams` | 三方比對 | 詳情：`GET /teams/:storeId`；列表：`POST /teams` | `GET /stores/:id` | `/hr-admin/branch`（DialogHrAdminBranchEdit.vue） | `storeData` | `teams_v2_verify_proposal.md` | 列表 API 回傳第一筆 |
| `real-price` | 雙向比對 | `GET /objects/real-price` | 無 | 無 | `realPrice` | v2 API 回傳前 N 筆 | —（無列表/詳情區分） |

### 驗證範圍與優先級

| 優先級 | 頁面類型 | 模組 | 欄位數 | 驗證方式 |
|-------|---------|------|-------|---------|
| 高 | 詳情頁 | objects / factory | 52 | v2 API ↔ 大後台 ↔ DB |
| 高 | 詳情頁 | teams | 18（分店 10 + 員工 8） | v2 API ↔ 大後台 ↔ DB |
| 高 | 列表頁 | objects（買賣） | 11 | v2 API ↔ 大後台 ↔ DB |
| 高 | 列表頁 | objects（租賃） | 12 | v2 API ↔ 大後台 ↔ DB |
| 高 | 列表頁 | factory | 15 | v2 API ↔ 大後台 ↔ DB |
| 高 | 列表頁 | teams | 4 | v2 API ↔ 大後台 ↔ DB |
| 低 | 首頁區塊 | real-price | 8 | v2 API ↔ DB（無大後台） |
| 不驗證 | 推薦物件 | objects / factory | 14 | 與列表頁欄位完全相同，不額外驗證 |

---

## 輸出格式

### 驗證結果文件

**檔案位置**: `prompts/4_diary/publicApi/v2/qa_verify/{module}_qa_verify.md`

```markdown
# {Module} QA 驗證結果

> 驗證日期：YYYY-MM-DD
> 環境：{env}
> 測試物件：N 筆

---

## 三方對照表（官網為基準）

### 詳情頁欄位

| v2 API 欄位 | DB 欄位 | 大後台欄位 | 官網 UI 標籤 | 轉換邏輯 |
|------------|---------|-----------|------------|---------|
| ... | ... | ... | ... | ... |

### 列表頁欄位

| v2 API 欄位 | DB 欄位 | 大後台欄位 | 官網 UI 標籤 | 轉換邏輯 |
|------------|---------|-----------|------------|---------|
| ... | ... | ... | ... | ... |

---

## 三方比對驗證表

### 詳情頁驗證

#### 物件 {id}（買賣/租賃）

| 欄位 | v2 API 值 | 大後台 API 值 | DB 原始值 | 驗證結果 |
|------|----------|--------------|----------|---------|
| `objectNameonNet` | "xxx" | "xxx" | "xxx" | ✅ |
| `communityBuilding` | "xxx" | "xxx" (businessDistrict) | "xxx" | ✅ |
| `parkingSpace` | "有（xxx）" | "有（xxx）" (hasStall + stallDesc) | hasStall=true, stallDesc="xxx" | ✅ |
| ... | ... | ... | ... | ... |

#### 物件 {id2}（買賣/租賃）

...

### 列表頁驗證

#### 物件 {id}（買賣/租賃）

| 欄位 | v2 API 值 | 大後台 API 值 | DB 原始值 | 驗證結果 |
|------|----------|--------------|----------|---------|
| `objectNameonNet` | "xxx" | "xxx" | "xxx" | ✅ |
| `adPrice` | 1000 | 1000 | 1000 | ✅ |
| `totalArea` | 30.5 | 30.5 | 30.5 | ✅ |
| ... | ... | ... | ... | ... |

---

## 驗證總結

### 詳情頁

- 測試物件：N 筆
- 驗證欄位：N 個
- 通過：N 個 ✅
- 失敗：N 個 ❌
- 通過率：N/N = XX%

### 列表頁

- 測試物件：N 筆
- 驗證欄位：N 個
- 通過：N 個 ✅
- 失敗：N 個 ❌
- 通過率：N/N = XX%

### 失敗欄位清單

| 頁面類型 | 物件 ID | 欄位 | v2 API | 大後台 API | DB 原始值 | 問題描述 |
|---------|---------|------|--------|-----------|----------|---------|
| 詳情頁 | {id} | `communityBuilding` | "A" | "B" | "B" | v2 API 取值錯誤 |
| 列表頁 | {id} | `firstPic` | "path1" | "path1" | "path1" | ✅ |
| ... | ... | ... | ... | ... | ... | ... |

---

## 結論

✅ 全部通過 / ❌ 發現 N 個問題

[問題分析和修復建議]
```

### Real-Price 驗證結果格式（雙向比對）

```markdown
# Real-Price QA 驗證結果

> 驗證日期：YYYY-MM-DD
> 環境：{env}
> 測試筆數：N 筆

---

## 雙向對照表（v2 API ↔ DB）

| v2 API 欄位 | DB 欄位（realPrice） | 官網 UI 標籤 | 轉換邏輯 |
|------------|---------------------|------------|---------|
| `buildingState` | `buildingState` | 建物類型 | 直接映射 |
| `totalPriceNTD` | `totalPriceNTD` | 總價 | ÷ 10000 轉萬元 |
| ... | ... | ... | ... |

---

## 雙向比對驗證表

### 實價登錄 {id}

| 欄位 | v2 API 值 | DB 原始值 | 驗證結果 |
|------|----------|----------|---------|
| `buildingState` | "住宅大樓" | "住宅大樓" | ✅ |
| `totalPriceNTD` | 1000 | 10000000 | ✅（前端顯示 ÷ 10000） |
| ... | ... | ... | ... |

---

## 驗證總結

- 測試筆數：N 筆
- 驗證欄位：8 個
- 通過：N 個 ✅
- 失敗：N 個 ❌
- 通過率：N/N = XX%

---

## 結論

✅ 全部通過 / ❌ 發現 N 個問題

[問題分析和修復建議]
```

### 對話摘要

```
✅ verify-QA 完成（objects / dev）
- 測試物件：9 筆
- 詳情頁：52 欄位，通過率 100%
- 列表頁：11 欄位，通過率 100%

📄 結果已寫入：prompts/4_diary/publicApi/v2/qa_verify/objects_qa_verify.md
```

```
✅ verify-QA 完成（real-price / dev）
- 測試筆數：10 筆
- 驗證欄位：8 個（v2 API ↔ DB 雙向）
- 通過率：100%

📄 結果已寫入：prompts/4_diary/publicApi/v2/qa_verify/real-price_qa_verify.md
```

---

## 實作細節

### 需要讀取的檔案

| 檔案 | 用途 |
|------|------|
| `prompts/4_diary/publicApi/v2/objects_api/approvement_connection/0223_5_verifyDashboard_discussion.md` | 三方對照表（objects/factory/teams） |
| `prompts/4_diary/publicApi/v2/objects_api/objects_v2_verify_proposal.md` | objects 詳情頁測試物件 ID |
| `prompts/4_diary/publicApi/v2/objects_api/factory_v2_verify_proposal.md` | factory 詳情頁測試物件 ID |
| `prompts/4_diary/publicApi/v2/teams_api/teams_v2_verify_proposal.md` | teams 詳情頁測試分店 storeId |

> ⚠️ 列表頁測試 ID 不需要從檔案讀取，從列表 API 回傳結果取得

### API 查詢

#### Objects 模組

```bash
# 確認 local server 已啟動
curl -s http://localhost:3001/health

# v2 API — 詳情（買賣）— 使用詳情頁測試 ID
curl -s http://localhost:3001/frontend/v2/objects/{detail_id} | jq .

# v2 API — 詳情（租賃）— 使用詳情頁測試 ID
curl -s http://localhost:3001/frontend/v2/objects/rent/{detail_id} | jq .

# v2 API — 列表（買賣）— 從回傳結果取第一筆 idx 作為列表頁測試 ID
curl -s http://localhost:3001/frontend/v2/objects \
  -X POST -H "Content-Type: application/json" \
  -d '{"page":1,"pageSize":10}' | jq .

# v2 API — 列表（租賃）— 從回傳結果取第一筆 idx 作為列表頁測試 ID
curl -s http://localhost:3001/frontend/v2/objects/rent \
  -X POST -H "Content-Type: application/json" \
  -d '{"page":1,"pageSize":10}' | jq .

# 大後台 API — 詳情頁測試 ID + 列表頁測試 ID 都要查
curl -s http://localhost:3001/api/v1/estate-listings/{id} \
  -H "Authorization: Bearer {token}" | jq .
```

#### Factory 模組

```bash
# v2 API — 詳情（工業用地）
curl -s http://localhost:3001/frontend/v2/objects/factory/{id} | jq .

# v2 API — 列表
curl -s http://localhost:3001/frontend/v2/objects/factory/list \
  -X POST -H "Content-Type: application/json" \
  -d '{"page":1,"pageSize":10}' | jq .

# 大後台 API（與 objects 共用）
curl -s http://localhost:3001/api/v1/estate-listings/{id} \
  -H "Authorization: Bearer {token}" | jq .
```

#### Teams 模組

```bash
# v2 API — 列表
curl -s http://localhost:3001/frontend/v2/teams \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# v2 API — 詳情
curl -s http://localhost:3001/frontend/v2/teams/{storeId} | jq .

# 大後台 API
curl -s http://localhost:3001/api/v1/stores/{id} \
  -H "Authorization: Bearer {token}" | jq .
```

#### Real-Price 模組

```bash
# v2 API — 實價登錄
curl -s "http://localhost:3001/frontend/v2/objects/real-price?city=A&page=1&pageSize=10" | jq .

# 無大後台 API
```

### Token 取得

```bash
# 使用 get-token.sh 取得 adminApi token
./.claude/scripts/get-token.sh dev 12345678

# token 會自動儲存到 .token-cache/{env}/{account}
# test-dashboard-api.sh 會自動讀取
```

### DB 查詢

#### Objects/Factory 模組

```bash
# 確認 SSH Tunnel 已啟動
./scripts/db-tunnel.sh dev all

# PostgreSQL 查詢
export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
SELECT
  re.id,
  re.\"nameOnline\",
  re.\"contractSerialNumber\",
  re.\"advertisedPrice\",
  re.\"buildingArea\",
  re.\"landArea\",
  re.\"businessDistrict\",
  re.\"hasStall\",
  re.\"stallDesc\",
  store.\"storeName\",
  store.\"companyName\"
FROM \"realEstate\" re
LEFT JOIN \"storeData\" store ON store.id = re.\"storeId\"
WHERE re.id IN ({ids});
"
```

#### Teams 模組

```bash
# PostgreSQL 查詢
export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
SELECT
  store.id,
  store.\"storeId\",
  store.\"shortName\",
  store.address,
  store.tel,
  store.email,
  store.\"companyName\",
  store.\"openTime\",
  store.\"picturePath\",
  store.\"mallInfo\",
  admin.name AS \"employeeName\",
  admin.mobile1 AS \"employeeCellPhone\",
  admin.email AS \"employeeEmail\",
  admin.skills AS \"employeeSpecialSkill\",
  admin.note AS \"employeeMemo\",
  admin.\"salesLicenseNo\" AS \"employeeShopEmployeeLicenseId\",
  admin.\"pictureFilePath\" AS \"employeePictureFileName\",
  role.name AS \"roleName\"
FROM \"storeData\" store
LEFT JOIN \"storeAdmin\" sa ON sa.\"storeId\" = store.id
LEFT JOIN admin ON admin.id = sa.\"adminId\"
LEFT JOIN role ON role.id = admin.\"systemRoleId\"
WHERE store.\"storeId\" IN ({storeIds})
  AND admin.status = 2
  AND admin.\"salesLicenseNo\" IS NOT NULL;
"
```

#### Real-Price 模組

```bash
# PostgreSQL 查詢
export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
SELECT
  rp.id,
  rp.\"buildingState\",
  rp.\"landSectorPositionBuildingSectorHouseNumberPlate\",
  rp.\"totalPriceNTD\",
  rp.\"berthCategory\",
  rp.\"mainBuildingArea\",
  rp.\"landShiftingTotalAreaSquareMeter\",
  rp.\"transactionYearMonthAndDay\"
FROM \"realPrice\" rp
WHERE rp.id IN ({ids});
"
```

### 三方比對邏輯

#### Objects/Factory 模組（詳情頁）

**直接映射欄位**：
- v2 API 值 = 大後台 API 值 = DB 原始值
- 例如：`objectNameonNet` = `nameOnline` = `nameOnline`

**欄位命名差異**：
- v2 API: `communityBuilding` ↔ 大後台: `businessDistrict` ↔ DB: `businessDistrict`
- 比對時需要知道映射關係

**轉換邏輯欄位**：
- `parkingSpace`: v2 API = `"有（xxx）"` ↔ 大後台 = `hasStall=true, stallDesc="xxx"` ↔ DB = `hasStall=true, stallDesc="xxx"`
- `objectAge`: v2 API = `"5年3個月"` ↔ 大後台 = `buildingCompletedAt="2020-12-01"` ↔ DB = `buildingCompletedAt="2020-12-01"`
- enum 欄位：v2 API = 中文 ↔ 大後台 = enum number ↔ DB = enum number

**JOIN 欄位**：
- `storeName`: v2 API = `"xxx"` ↔ 大後台 = `storeId` → storeData ↔ DB = JOIN storeData
- `mainLandUseType`: v2 API = `"都市-住宅區"` ↔ 大後台 = `landInfos[0]` ↔ DB = JOIN realEstateIdentifier + landInfo

**Factory 特有差異**：
- `additionalText`: Objects 讀 `additionalNote`（備註），Factory 讀 `getPrimaryUsageText(primaryUsage)`（主要用途中文）
- `attributFormName`: Factory 的土地類型需要拼接用途，如 `土地(工業用地)`

#### Objects/Factory 模組（列表頁）

**列表頁欄位是詳情頁的子集**，比對邏輯相同，但欄位較少（10-15 個）。

**列表頁特有注意事項**：
- `firstPic`: 列表頁只取第一張照片，詳情頁取全部 → 比對 S3 原始路徑
- `stallInfo`: 列表頁用 boolean 顯示車位圖示，詳情頁用組裝字串
- `address`（租賃列表）: 組裝自 `zipCode` + `roadName`，與詳情頁的 `addressRoadId` + `addressDetail` 不同
- `hasSellAndRent`: 列表頁顯示買賣/租賃標籤，來自 `transactionType`

**大後台對應**：
- 大後台沒有「列表頁」和「詳情頁」的區分
- 列表頁驗證方式：從列表 API 取得物件 ID → 用大後台詳情 API（`GET /estate-listings/:id`）查詢 → 比對列表頁顯示的欄位
- 大後台頁面：`/cases/objects`（物件列表）→ `/cases/objects/:id`（物件編輯頁）

#### Teams 模組

**直接映射欄位**：
- 分店資訊：`storeId`, `shortName`, `address`, `tel`, `email`, `companyName`, `openTime`
- 員工資訊：`name`, `mobile1`, `email`, `skills`, `note`, `salesLicenseNo`

**S3 URL 欄位**：
- `storePictureFileName`: v2 API = S3 presigned URL ↔ 大後台 = `picturePath` ↔ DB = `picturePath`
- `employeePictureFileName`: v2 API = S3 presigned URL ↔ 大後台 = `pictureFilePath` ↔ DB = `pictureFilePath`
- 比對時需要比對原始路徑，不比對 presigned URL

**計算欄位**：
- `areaName`: v2 API = ZipCodeService 計算 ↔ 大後台 = `zipCode` ↔ DB = `zipCode`
- 比對時需要用 ZipCodeService 反推

**JOIN 欄位**：
- 員工資訊：透過 `storeAdmin` 關聯 `admin` 表
- `employeeJobId`: v2 API = convertRoleNameToLegacyJobId ↔ 大後台 = `systemRoleId` ↔ DB = JOIN role

**大後台對應**：
- 大後台頁面：`/hr-admin/branch`（分店管理列表頁）
- 編輯 Dialog：`DialogHrAdminBranchEdit.vue`
- API Endpoint：`GET /api/v1/stores/:id`

#### Real-Price 模組（雙向比對）

**僅 v2 API ↔ DB 比對**（無大後台對應）：
- `buildingState`: 直接映射
- `totalPriceNTD`: 直接映射（前端顯示時 ÷ 10000 轉萬元）
- `mainBuildingArea`: 直接映射
- `landShiftingTotalAreaSquareMeter`: 直接映射
- `transactionYearMonthAndDay`: 直接映射（民國年月格式）
- `berthCategory`: 直接映射
- `landSectorPositionBuildingSectorHouseNumberPlate`: 直接映射

**資料來源**：獨立 `realPrice` 表，資料來自政府實價登錄開放資料

#### 推薦物件（不額外驗證）

- 推薦物件使用與列表頁完全相同的欄位結構
- 卡片元件重用 `BaseCardSale` / `BaseCardRent`
- 驗證列表頁即可涵蓋推薦物件

### 注意事項

- **大後台 API 需要 token**：使用 `get-token.sh {env} {account}` 取得，帳號從對話上下文找，找不到用預設 `12345678`
- **欄位命名差異**：v2 API 和大後台的欄位名稱不同，需要透過 DB 欄位名稱映射
- **轉換邏輯**：enum→中文、組裝字串、計算值等，需要考慮轉換邏輯
- **官網為基準**：只驗證官網有顯示的欄位，大後台獨有欄位不驗證
- **測試物件 ID**：優先從 verifyOWS proposal 提取，確保測試資料一致
- **S3 URL 不直接比對**：presigned URL 每次不同，比對原始路徑即可
- **teams 模組**：大後台 `stores` endpoint 用 PG 的 `id`（integer），不是 `storeId`（string）
- **列表頁驗證策略**：詳情頁和列表頁使用不同的測試 ID
  - 詳情頁測試 ID：從 proposal 提取（固定 ID，確保可重複驗證）
  - 列表頁測試 ID：從列表 API 回傳結果取任一筆物件 ID → 用該 ID 查大後台詳情 API + DB → 比對列表頁欄位
  - 兩者不需要是同一個 ID
- **推薦物件不額外驗證**：與列表頁欄位完全相同，驗證列表頁即可涵蓋
- **實價登錄無大後台**：僅做 v2 API ↔ DB 雙向比對，資料來自獨立 `realPrice` 表

---

## 與 verifyOWS 的關係

| | verifyOWS | verify-QA |
|---|---|---|
| 比對對象 | v1 API vs v2 API | v2 API vs 大後台 API vs DB |
| 驗證目的 | v2 與 v1 輸出一致 | PG 生態系內部一致 |
| 觸發時機 | v2 實作後 | 欄位映射修復後 |
| 輸出位置 | `{module}_v2_verify_proposal.md` | `qa_verify/{module}_qa_verify.md` |
| 驗證範圍 | 所有 API 欄位 | 官網有顯示的欄位 |

---

## Skill 定義檔（草稿）

**檔案位置**: `backend-nestjs/.claude/commands/verify-QA.md`

```markdown
---
description: 官網與大後台欄位三方比對驗證（v2 API → 大後台 API → DB）
argument-hint: <module> [env]
design-doc: prompts/4_diary/debug/proposal/slash/verify-QA_skill_proposal.md
---

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

## 任務

執行三方比對驗證，確認資料從 DB → v2 API → 大後台 API 的完整流程正確。

以官網為基準，只驗證官網有顯示的欄位。

每個模組同時驗證詳情頁和列表頁（real-price 除外）。
推薦物件與列表頁欄位完全相同，不額外驗證。

---

## 設計變更

### 2026-03-04 設計變更：修正 token 路徑 + 新增前端索引表查詢

#### 問題描述

1. **Token 腳本路徑錯誤**：
   - 現況：`./scripts/get-token.sh {env} {account}`
   - 問題：實際路徑應該是 `./.claude/scripts/get-token.sh`
   - 影響：執行時會找不到檔案

2. **缺少前端索引表查詢步驟**：
   - 現況：直接從 Proposal 5 讀取三方對照表，假設所有欄位都是前端顯示的
   - 問題：沒有確認前端 UI 實際顯示哪些欄位，可能驗證了前端根本沒用到的欄位
   - 影響：驗證範圍不準確，浪費時間驗證無用欄位

#### 設計決策

**修正 1：Token 腳本路徑**
- 將所有 `./scripts/get-token.sh` 改為 `./.claude/scripts/get-token.sh`
- 位置：Step 4（查詢大後台 API 回傳值）

**修正 2：新增前端索引表 + Vue 程式碼查詢步驟**
- 新增「Step 1: 讀取前端索引表 + 讀 Vue 程式碼」
- 原 Step 1 改為「Step 2: 讀取三方對照表並確認驗證欄位」
- 後續步驟編號順延

#### 修改內容

**新增 Step 1：讀取前端索引表 + 讀 Vue 程式碼**

```markdown
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
```

**修改 Step 2：讀取三方對照表並確認驗證欄位**

```markdown
### Step 2: 讀取三方對照表並確認驗證欄位

1. **讀取 Proposal 5**：`0223_5_verifyDashboard_discussion.md`

2. **用 Step 1 的前端欄位清單交叉比對三方對照表**：
   - 只提取「前端程式碼中有使用」的欄位
   - 排除前端沒用到的欄位

3. **確認最終驗證欄位清單**（詳情頁 + 列表頁）
```

**修改 Step 6（原 Step 5）：查詢大後台 API 回傳值**

```bash
# 取得 token（修正路徑）
./.claude/scripts/get-token.sh {env} {account}
# 帳號從對話上下文找，找不到用預設 12345678
```

#### 流程圖更新

```
/verify-QA 執行流程
│
├─ 1. 【參數解析】
│   ├─ $1 = module（必要）— objects / factory / teams / real-price
│   └─ $2 = env（可選）— dev（預設）/ staging
│
├─ 2. 【讀取前端索引表 + 讀 Vue 程式碼】（新增）
│   ├─ 從 ui-api-index-frontend.md / ui-api-index-dashboard.md 定位頁面檔案路徑
│   ├─ 讀取對應的 Vue 檔案，從 template 提取實際綁定的欄位
│   └─ 輸出：官網顯示欄位 + 大後台顯示欄位
│
├─ 3. 【讀取三方對照表並確認驗證欄位】（原 Step 2）
│   ├─ 讀取 Proposal 5 的三方對照表
│   ├─ 用 Step 2 的前端欄位清單交叉比對
│   └─ 確認最終驗證欄位清單（只驗證前端程式碼有用的欄位）
│
├─ 4. 【定位測試物件 ID】（原 Step 3）
│   ├─ 詳情頁測試 ID（從 proposal 提取）
│   └─ 列表頁測試 ID（從列表 API 回傳取得）
│
├─ 5. 【查詢 v2 API 回傳值】（原 Step 4）
│   ├─ 確認 local server 已啟動
│   ├─ 詳情 API（使用詳情頁測試 ID）
│   └─ 列表 API（查詢後從回傳結果取列表頁測試 ID）
│
├─ 6. 【查詢大後台 API 回傳值】（原 Step 5，修正 token 路徑）
│   ├─ 取得 token：./.claude/scripts/get-token.sh {env} {account}
│   ├─ objects/factory → GET /api/v1/estate-listings/:id
│   ├─ teams → GET /api/v1/stores/:id
│   └─ real-price → 跳過
│
├─ 7. 【查詢 DB 原始值】（原 Step 6）
│   ├─ db-tunnel.sh {env} all
│   ├─ objects/factory → 查詢 realEstate + 關聯表
│   ├─ teams → 查詢 storeData + admin + role
│   └─ real-price → 查詢 realPrice 表
│
├─ 8. 【三方比對】（原 Step 7）
│   ├─ 遍歷「前端程式碼中實際使用的欄位」清單
│   ├─ 詳情頁比對（使用詳情頁測試 ID）
│   ├─ 列表頁比對（使用列表 API 回傳的物件 ID）
│   └─ 標記每個欄位 ✅ / ❌
│
└─ 9. 【寫入驗證結果】（原 Step 8）
    ├─ 建立驗證文件
    ├─ 寫入三方比對驗證表
    └─ 印出驗證摘要
```

#### 預期效益

1. **Token 路徑修正**：
   - 執行時不會再找不到 get-token.sh
   - 避免手動修正路徑的困擾

2. **前端索引表 + Vue 程式碼查詢**：
   - 從索引表定位頁面檔案路徑
   - 讀取 Vue 程式碼提取實際使用的欄位
   - 確保只驗證前端實際顯示的欄位
   - 驗證結果更準確，更符合「以官網為基準」的原則

#### 潛在衝突檢查

**與現有流程的相容性**：
- ✅ 新增 Step 1 不影響後續步驟邏輯
- ✅ Step 2 改為「確認驗證欄位」，與原本「讀取三方對照表」相容
- ✅ 後續步驟只是編號順延，邏輯不變
- ✅ Token 路徑修正不影響其他邏輯

**需要注意的點**：
1. **前端索引表需要是最新的**：
   - 前端索引表透過 `/build-ui-index` skill 更新
   - 如果索引表過期，定位到的頁面檔案路徑可能不準確
   - 建議：執行 verify-QA 前確認索引表是最新的

2. **欄位數量可能與原本寫死的不同**：
   - 原本設計稿中寫死「52 個欄位」、「18 個欄位」等
   - 改為從 Vue 程式碼動態提取後，欄位數量以實際為準
   - 驗證結果文件中記錄「實際驗證 N 個欄位（前端顯示）」

#### 實作注意事項

1. **Step 1 實作細節**：
   - 從索引表用 Grep 搜尋模組對應的頁面路徑
   - 讀取 Vue 檔案，從 `<template>` 區塊提取欄位綁定（如 `{{ item.xxx }}`、`:prop="row.xxx"`、`v-model="form.xxx"` 等）
   - 輸出「前端實際使用欄位」清單

2. **Step 2 實作細節**：
   - 讀取 Proposal 5 的三方對照表
   - 用 Step 1 的欄位清單交叉比對，過濾出需要驗證的欄位
   - 輸出最終驗證欄位清單供後續步驟使用

3. **驗證結果文件更新**：
   - 在「三方對照表」區塊標註「（前端實際使用）」
   - 在「驗證總結」中記錄「前端顯示 N 個欄位，驗證 N 個欄位」
```
