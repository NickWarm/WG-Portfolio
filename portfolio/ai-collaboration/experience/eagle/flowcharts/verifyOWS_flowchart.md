# /verifyOWS 執行流程

```
/verifyOWS 執行流程
│
├─ 1. 【參數解析】
│   ├─ $1 = proposal → 建立 verify_proposal + 整理參數排列組合（流程起點）
│   ├─ $1 = data → 準備驗證資料（proposal 建立後執行）
│   ├─ $1 = check → v1/v2 輸出驗證（data 準備好後執行）
│   ├─ $1 = review → 檢核修改提案（check 發現差異後執行）
│   └─ $1 = review-again → 再次檢核修改提案（/implement 後、再次 check 前）
│
├─ [proposal 模式] — 建立 verify_proposal + 整理參數排列組合（流程起點）
│   │
│   ├─ 1. 【建立進度追蹤】（強制，參考 check-result Step 0）
│   │   └─ TaskCreate 建立所有步驟的 task
│   │
│   ├─ 2. 【定位 verify_proposal】
│   │   ├─ 從對話上下文找到模組名稱
│   │   ├─ 路徑：prompts/4_diary/publicApi/v2/{module}_api/{module}_v2_verify_proposal.md
│   │   ├─ 不存在 → 建立骨架
│   │   └─ 已存在 → 讀取現有內容
│   │
│   ├─ 3. 【讀取 plan 中該模組的區塊】
│   │   ├─ 讀取 review_v2_plan.md
│   │   ├─ 提取 endpoint 清單
│   │   ├─ 提取前端實際傳值格式
│   │   └─ 提取比對規則
│   │
│   ├─ 4. 【整理前端參數排列組合】（per endpoint）
│   │   ├─ 從前端傳值格式推導所有可能的參數組合
│   │   ├─ 無篩選（基本分頁）
│   │   ├─ 單一篩選（city only, keyword only, etc.）
│   │   ├─ 組合篩選（city + district + price range）
│   │   ├─ 邊界值（priceMin=0, 超大 page number）
│   │   └─ 產出 Cases 表
│   │
│   ├─ 4.5 【辨識圖片欄位】（讀取 picture_url_handling_guide.md）
│   │   ├─ 從 v2 proposal / v1 service 找出圖片相關欄位
│   │   ├─ 記錄 v1 URL 拼接方式 + v2 S3 路徑結構
│   │   └─ 無圖片欄位的模組（如 form）→ 跳過此步驟
│   │
│   └─ 5. 【寫入 verify_proposal + 印出下一步】
│       ├─ ## Endpoint 清單
│       ├─ ## 前端參數排列組合（per endpoint 的 Cases 表）
│       ├─ ## 比對規則
│       ├─ 標註「📋 Proposal 建立完成，請執行 /verifyOWS data」
│       └─ 在對話中印出：「📋 Proposal 建立完成。下一步：/verifyOWS data {module}」
│
├─ [data 模式] — 準備驗證資料（proposal 建立後執行）
│   │
│   ├─ 1. 【讀取 verify_proposal + 模組的 v2 proposal】
│   │   ├─ 讀取 verify_proposal 的參數排列組合，了解每個 endpoint 需要什麼測試資料
│   │   └─ 讀取 {module}_v2_proposal.md 的 MSSQL ↔ PostgreSQL 欄位對照表
│   │       └─ 了解 MSSQL table/view 名稱、欄位名稱、值域差異
│   │
│   ├─ 2. 【連 dev DB 撈真實資料】（PostgreSQL + MSSQL 雙資料庫）
│   │   ├─ 讀取 db-connection-rules.md
│   │   ├─ db-tunnel.sh dev all（同時啟動 PostgreSQL tunnel + MSSQL tunnel）
│   │   ├─ 【PostgreSQL】v2 資料查詢
│   │   │   ├─ ⚠️ psql 格式：export PGPASSWORD=<DB_PASSWORD> && psql ...（不用 inline 格式）
│   │   │   ├─ 撈有資料的篩選值（哪些 city 有物件、哪些 storeId 有效）
│   │   │   └─ 撈特定 endpoint 需要的 ID（detail 用的 objectId、recommend 用的 storeId+id）
│   │   ├─ 【MSSQL】v1 資料查詢（參考 v2 proposal 的欄位對照表，用正確的 MSSQL table/view 名稱查詢）
│   │   │   ├─ 連線：sqlcmd -S localhost,1433 -U <DB_USER> -P '<DB_PASSWORD>' -C -d <DB_NAME>
│   │   │   └─ 用 PostgreSQL 撈到的篩選值，反查 MSSQL 確認 v1 也有資料
│   │   └─ 記錄每個 case 的具體參數值（確保 v1/v2 都有資料可比對）
│   │
│   └─ 3. 【寫入 verify_proposal + 印出下一步】
│       ├─ ## 測試資料（從 DB 撈到的真實值，對應每個 case）
│       ├─ 標註「🗄️ 測試資料準備完成，請執行 /verifyOWS check」
│       └─ 在對話中印出：「🗄️ 測試資料準備完成。下一步：/verifyOWS check {module}」
│
├─ [check 模式] — v1/v2 輸出驗證（data 準備好後執行）
│   │
│   ├─ 1. 【確認前置條件】
│   │   ├─ verify_proposal 已存在且有參數排列組合 + 測試資料
│   │   ├─ db-tunnel.sh dev all 已連接
│   │   └─ lsof -i :3001 確認 server 運行中，沒有 → ./.claude/scripts/start-dev-server.sh
│   │
│   ├─ 2. 【逐 case 驗證】（一個 endpoint 測完再下一個，TaskCreate per 參數模式）
│   │   ├─ curl v1: localhost:3001/frontend/v1/{endpoint}
│   │   ├─ curl v2: localhost:3001/frontend/v2/{endpoint}
│   │   ├─ 逐欄位比對（嚴格一致規則）
│   │   │   ├─ 一般欄位：exact match
│   │   │   ├─ 檔案 URL（詳見 picture_url_handling_guide.md）：
│   │   │   │   ├─ v2 必須是 presigned URL（含 X-Amz-Signature）
│   │   │   │   ├─ curl v2 URL → HTTP 200（抽樣驗證）
│   │   │   │   ├─ 有圖/無圖與 v1 一致
│   │   │   │   └─ 檔名不比對（MSSQL vs PostgreSQL 可能不同）
│   │   │   ├─ 陣列：長度一致 + 每個元素逐欄位比對
│   │   │   ├─ null/空值：嚴格一致（null/""/ 0 不互通）
│   │   │   └─ 排序：順序一致
│   │   ├─ 發現差異 → 記錄到修改提案 → 繼續測下一個 case
│   │   └─ 記錄 pass/fail + 差異欄位
│   │
│   └─ 3. 【更新 verify_proposal + 印出下一步】
│       ├─ ## 驗證結果（填入每個 case 的 pass/fail）
│       ├─ ## 差異報告（fail 的欄位 + v1 值 vs v2 值）
│       ├─ 全 pass → 更新 verify_proposal 標註「✅ 驗證通過」+ 更新 publicApi_analysis.md 模組狀態
│       │   ├─ 首次 check 就全 pass（無程式碼修改）→ 印出：「✅ {module} 驗證通過，已更新 verify_proposal 和 publicApi_analysis.md」
│       │   └─ 經過 review/implement 後全 pass（有程式碼修改）→ 印出：「✅ {module} 驗證通過，已更新文件。下一步：/gcommit-push」
│       └─ 有修改提案 → 寫修改提案到 verify_proposal → 在對話中印出：「⚠️ 發現差異，修改提案已記錄。下一步：/verifyOWS review {module}」
│
├─ [review 模式] — 檢核修改提案（check 發現差異後執行）
│   │
│   ├─ 1. 【定位三份輸入】
│   │   ├─ 讀取 {module}_v2_proposal.md（原始實作提案，理解歷史決策）
│   │   ├─ 讀取 v2 service/controller/dto 程式碼
│   │   └─ 讀取 verify_proposal 中的修改提案
│   │
│   ├─ 2. 【載入檢核知識】
│   │   └─ 讀取 publicApi_v2_implementation_prompt.md 的關鍵區塊
│   │       ├─ 實作目標（136-150）
│   │       ├─ v1 vs v2 架構差異（154-190）
│   │       └─ 實作檢查清單（2008-2055）
│   │
│   ├─ 3. 【檢核修改提案】
│   │   ├─ 架構規範：PostgreSQL Entity、@InjectRepository、v2 前綴
│   │   ├─ Service 層：禁止 try-catch、NotFoundException、enum 常數
│   │   ├─ DTO 設計：Input/Output 分離、@Expose()、plainToInstance
│   │   ├─ SQL 安全：參數化查詢、白名單排序、LIKE 轉義
│   │   ├─ 比對 v1 service 邏輯：v2 是否涵蓋 v1 所有參數處理和查詢邏輯
│   │   └─ 修改範圍是否最小化（不過度修改）
│   │
│   └─ 4. 【輸出檢核結果 + 更新 verify_proposal + 印出下一步】
│       ├─ 檢核項目表格（✅/❌）
│       ├─ ⚠️ 使用 Edit tool 局部修改，禁止 Write 覆蓋整份文件
│       ├─ 有問題 → 更新修改提案 → 在對話中印出：「❌ 修改提案有問題，已更新。下一步：/verifyOWS review {module}」
│       └─ 全通過 → 在對話中印出：「✅ Review 通過。下一步：/implement，完成後執行 /verifyOWS check {module}」
│
├─ [review-again 模式] — 再次檢核修改提案
│   │
│   ├─ 1. 【讀取 verify_proposal 的修改提案】
│   │   └─ 讀取修改提案區塊
│   │
│   ├─ 2. 【讀取修正後的 v2 程式碼】
│   │   └─ 確認修改提案已被正確實作
│   │
│   ├─ 3. 【再次比對檢核】
│   │   ├─ 修改提案是否恰當（有沒有過度修改或遺漏）
│   │   ├─ 修正後的程式碼是否符合規範
│   │   └─ 搭配原始 proposal 確認修改不偏離設計意圖
│   │
│   └─ 4. 【更新 verify_proposal + 印出下一步】
│       ├─ 全通過 → 標註「✅ Review 通過」→ 在對話中印出：「✅ Review 通過。下一步：/implement，完成後執行 /verifyOWS check {module}」
│       └─ 有問題 → 更新修改提案 → 在對話中印出：「❌ 修改提案有問題，已更新。下一步：/verifyOWS review-again {module}」
│
└─ 【/implement 後的下一步】
    └─ /implement 完成後，在對話中印出：「✅ 實作完成。下一步：/verifyOWS check {module}」
```

## 比對規則

| 欄位類型 | 比對方式 |
|---------|---------|
| 一般欄位 | 完全一致 |
| 檔案 URL | 數量一致 + v2 URL 可實際讀取（v1 用 MSSQL 原始檔名，v2 用 S3 路徑，檔名不同不比對） |
| 排序 | 順序一致 |
| 筆數 | v1 vs v2 筆數一致 |
| null/空值 | 嚴格一致（null/""/ 0 不互通） |
| 陣列 | 長度一致 + 每個元素逐欄位比對 |

## v1 vs v2 打法

```bash
# GET 請求
curl -s http://localhost:3001/frontend/v1/{endpoint}?{params} | jq .
curl -s http://localhost:3001/frontend/v2/{endpoint}?{params} | jq .

# POST 請求
curl -s -X POST http://localhost:3001/frontend/v1/{endpoint} \
  -H "Content-Type: application/json" \
  -d '{body}' | jq .
curl -s -X POST http://localhost:3001/frontend/v2/{endpoint} \
  -H "Content-Type: application/json" \
  -d '{body}' | jq .
```

> 官網 API 無認證需求，不使用 `test-dashboard-api.sh`，直接 curl。

## 驗證執行順序

| 順序 | 模組 | Endpoints | 複雜度 |
|------|------|-----------|--------|
| 1 | form | 1 | ⭐ |
| 2 | teams | 2 | ⭐⭐ |
| 3 | objects | 8 | ⭐⭐⭐ |
| 4 | factory | 4 | ⭐⭐⭐⭐ |
