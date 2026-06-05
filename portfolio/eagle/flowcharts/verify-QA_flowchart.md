# /verify-QA 執行流程

```
/verify-QA 執行流程
│
├─ 1. 【參數解析】
│   ├─ $1 = module（必要）— objects / factory / teams / real-price
│   ├─ $2 = env（可選）— dev（預設）/ staging
│   └─ 無 $1 → 提示用戶指定模組
│
├─ 2. 【建立進度追蹤】（強制）
│   └─ TaskCreate 建立 Step 1 ~ Step 9 的 task
│
├─ 3. 【讀取前端索引表 + 讀 Vue 程式碼】
│   ├─ 從 ui-api-index-frontend.md / ui-api-index-dashboard.md 定位頁面檔案路徑
│   ├─ 讀取對應的 Vue 檔案，從 template 提取實際綁定的欄位
│   └─ 輸出：官網顯示欄位 + 大後台顯示欄位
│
├─ 4. 【讀取三方對照表並確認驗證欄位】
│   ├─ 讀取 Proposal 5：0223_5_verifyDashboard_discussion.md
│   ├─ 用 Step 1 的前端欄位清單交叉比對三方對照表
│   └─ 確認最終驗證欄位清單（只驗證前端程式碼有用的欄位）
│
├─ 5. 【定位測試物件 ID】
│   ├─ 詳情頁測試 ID（從 proposal 提取）：
│   │   ├─ objects → 從 objects_v2_verify_proposal.md 提取
│   │   ├─ factory → 從 factory_v2_verify_proposal.md 提取
│   │   ├─ teams → 從 teams_v2_verify_proposal.md 提取 storeId
│   │   ├─ real-price → 從 v2 API 回傳的前 N 筆取 ID
│   │   └─ 無 proposal → 要求用戶提供測試 ID
│   │
│   └─ 列表頁測試 ID（從列表 API 回傳取得）：
│       └─ 查詢列表 API 後，從回傳結果取任一筆物件 ID（不需要與詳情頁相同）
│
├─ 6. 【查詢 v2 API 回傳值】
│   ├─ 確認 local server 已啟動（lsof -i :3001）
│   │   └─ 沒有 → ./.claude/scripts/start-dev-server.sh
│   │
│   ├─ 詳情 API（使用 Step 5 的詳情頁測試 ID）：
│   │   ├─ [objects] → GET /frontend/v2/objects/:id（買賣）、/objects/rent/:id（租賃）
│   │   ├─ [factory] → GET /frontend/v2/objects/factory/:id
│   │   ├─ [teams] → GET /frontend/v2/teams/:storeId
│   │   └─ [real-price] → GET /frontend/v2/objects/real-price?city=A&page=1&pageSize=10
│   │
│   ├─ 列表 API（查詢後從回傳結果取列表頁測試 ID）：
│   │   ├─ [objects] → POST /frontend/v2/objects → 取回傳第一筆的 idx
│   │   ├─ [objects 租賃] → POST /frontend/v2/objects/rent → 取回傳第一筆的 idx
│   │   ├─ [factory] → POST /frontend/v2/objects/factory/list → 取回傳第一筆的 idx
│   │   └─ [teams] → POST /frontend/v2/teams → 取回傳第一筆的 storeId
│   │
│   └─ 記錄：詳情頁用詳情 ID 的回傳值，列表頁用列表回傳的物件資料
│
├─ 7. 【查詢大後台 API 回傳值】（僅詳情頁測試 ID）
│   ├─ 取得 token：./.claude/scripts/get-token.sh {env} {account}
│   │   └─ 帳號從對話上下文找，找不到用預設 12345678
│   │
│   ├─ [objects / factory]
│   │   └─ GET /api/v1/estate-listings/:id
│   │
│   ├─ [teams]
│   │   └─ GET /api/v1/stores/:id（用 PG 的 id，不是 storeId）
│   │
│   ├─ [real-price] → 跳過（無大後台對應）
│   │
│   ├─ ⚠️ 列表頁測試 ID 的大後台查詢在 Step 9 比對時執行
│   │
│   └─ 記錄每個測試物件的大後台 API 回傳值
│
├─ 8. 【查詢 DB 原始值】（僅詳情頁測試 ID）
│   ├─ 確認 SSH Tunnel：./scripts/db-tunnel.sh {env} all
│   │
│   ├─ [objects / factory]
│   │   └─ 查詢 realEstate + 關聯表（storeData、pointOfInterest、landInfo 等）
│   │
│   ├─ [teams]
│   │   └─ 查詢 storeData + storeAdmin + admin + role
│   │
│   ├─ [real-price]
│   │   └─ 查詢 realPrice 表
│   │
│   ├─ ⚠️ 列表頁測試 ID 的 DB 查詢在 Step 9 比對時執行
│   │
│   └─ 記錄每個測試物件的 DB 原始值
│
├─ 9. 【三方比對】
│   ├─ 遍歷「前端程式碼中實際使用的欄位」清單（詳情頁 + 列表頁）
│   │
│   ├─ 詳情頁比對（使用詳情頁測試 ID）：
│   │   ├─ [objects / factory / teams] → v2 API ↔ 大後台 API ↔ DB（三方）
│   │   └─ [real-price] → v2 API ↔ DB（雙向，無大後台）
│   │
│   ├─ 列表頁比對（使用列表 API 回傳的物件 ID）：
│   │   ├─ 從列表 API 回傳取得物件 ID（任一筆）
│   │   ├─ 用該 ID 查詢大後台詳情 API + DB 原始值
│   │   └─ 比對列表頁顯示的欄位（不是全部欄位）
│   │
│   ├─ 比對規則
│   │   ├─ 直接映射欄位：值完全一致
│   │   ├─ 欄位命名差異：透過映射關係比對（如 communityBuilding ↔ businessDistrict）
│   │   ├─ 轉換邏輯欄位：考慮 enum→中文、組裝字串、計算值
│   │   ├─ S3 URL 欄位：比對原始路徑，不比對 presigned URL
│   │   └─ JOIN 欄位：透過關聯表反查
│   │
│   ├─ 推薦物件不額外驗證（與列表頁欄位完全相同）
│   │
│   └─ 標記每個欄位 ✅ / ❌
│
└─ 10. 【寫入驗證結果】
    ├─ 建立驗證文件：prompts/4_diary/publicApi/v2/qa_verify/{module}_qa_verify.md
    ├─ 寫入三方對照表（詳情頁 + 列表頁分開列）
    ├─ 寫入三方比對驗證表（per 測試物件）
    ├─ 寫入驗證總結（通過率、失敗欄位清單）
    │
    └─ 印出驗證摘要
        ├─ 全 pass → ✅ verify-QA 完成（{module} / {env}）
        └─ 有差異 → ❌ 發現 N 個問題，詳見 qa_verify 文件
```

## 比對規則詳細說明

### Objects/Factory 模組

#### 詳情頁（52 欄位）

**直接映射欄位**：
- v2 API 值 = 大後台 API 值 = DB 原始值
- 例如：`objectNameonNet` = `nameOnline` = `nameOnline`

**欄位命名差異**：
- v2 API: `communityBuilding` ↔ 大後台: `businessDistrict` ↔ DB: `businessDistrict`

**轉換邏輯欄位**：
- `parkingSpace`: v2 = `"有（xxx）"` ↔ 大後台 = `hasStall + stallDesc` ↔ DB = `hasStall + stallDesc`
- `objectAge`: v2 = `"5年3個月"` ↔ 大後台 = `buildingCompletedAt` ↔ DB = `buildingCompletedAt`
- enum 欄位：v2 = 中文 ↔ 大後台 = enum number ↔ DB = enum number

**JOIN 欄位**：
- `storeName`: v2 = 中文 ↔ 大後台 = `storeId` → storeData ↔ DB = JOIN storeData
- `mainLandUseType`: v2 = 中文 ↔ 大後台 = `landInfos[0]` ↔ DB = JOIN realEstateIdentifier + landInfo

**Factory 特有差異**：
- `additionalText`: Objects 讀 `additionalNote`，Factory 讀 `getPrimaryUsageText(primaryUsage)`
- `attributFormName`: Factory 土地類型需拼接用途，如 `土地(工業用地)`

#### 列表頁（10-15 欄位）

列表頁欄位是詳情頁的子集，比對邏輯相同，但注意：
- `firstPic`: 列表頁只取第一張照片 → 比對 S3 原始路徑
- `stallInfo`: 列表頁用 boolean，詳情頁用組裝字串
- `address`（租賃列表）: 組裝自 `zipCode` + `roadName`
- `hasSellAndRent`: 來自 `transactionType`

**大後台對應**：
- 大後台沒有列表頁/詳情頁區分
- 列表頁驗證：從列表 API 取得物件 ID → 用大後台詳情 API 查詢 → 比對列表頁欄位

### Teams 模組

**直接映射欄位**：
- 分店：`storeId`, `shortName`, `address`, `tel`, `email`, `companyName`, `openTime`
- 員工：`name`, `mobile1`, `email`, `skills`, `note`, `salesLicenseNo`

**S3 URL 欄位**：
- `storePictureFileName` / `employeePictureFileName`: 比對原始路徑，不比對 presigned URL

**計算欄位**：
- `areaName`: v2 = ZipCodeService 計算 ↔ 大後台 = `zipCode` ↔ DB = `zipCode`

**JOIN 欄位**：
- 員工資訊：透過 `storeAdmin` 關聯 `admin` 表
- `employeeJobId`: v2 = convertRoleNameToLegacyJobId ↔ 大後台 = `systemRoleId` ↔ DB = JOIN role

### Real-Price 模組（雙向比對）

僅 v2 API ↔ DB 比對（無大後台）：
- `buildingState`: 直接映射
- `totalPriceNTD`: 直接映射（前端顯示 ÷ 10000 轉萬元）
- `mainBuildingArea`: 直接映射
- `landShiftingTotalAreaSquareMeter`: 直接映射
- `transactionYearMonthAndDay`: 直接映射（民國年月格式）
- `berthCategory`: 直接映射
- `landSectorPositionBuildingSectorHouseNumberPlate`: 直接映射
