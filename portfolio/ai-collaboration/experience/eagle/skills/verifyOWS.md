---
description: publicApi v2 驗證（v1 vs v2 逐欄位比對）
argument-hint: <proposal|data|check|review|review-again> [module]
allowed-tools: Bash(./scripts/*:*), Bash(./.claude/scripts/*:*), Bash(curl:*), Bash(lsof:*), Bash(pkill:*), Bash(PGPASSWORD=*), Bash(export PGPASSWORD=*), Bash(sqlcmd:*)
design-doc: prompts/4_diary/debug/proposal/slash/verifyOWS_skill_proposal.md
---

@.claude/flowcharts/verifyOWS_flowchart.md

@/Users/nicholas/Desktop/Projects/.claude/modules/db-connection-rules.md

# verifyOWS - publicApi v2 驗證

驗證 publicApi v2 API response 與 v1 逐欄位一致。

## 參數

- `$1`：模式（必要）— proposal / data / check / review / review-again
- `$2`：模組名稱（可選）— form / teams / objects / factory，無則從上下文判斷

## 核心原則

- **check 只測 + 記錄**：發現差異記錄到 verify_proposal，不修改程式碼
- **review 才分析**：搭配 implementation_prompt 檢核修改提案品質
- **修改由 /implement 負責**：review 通過後用戶執行 /implement
- **check 全 pass 時更新文件**：更新 verify_proposal + publicApi_analysis.md 模組狀態
- **/gcommit-push 僅在有程式碼修改時提示**：首次 check 就全 pass 不需要 commit
- **每個模式結束印出下一步指引**

## 檔案路徑

| 檔案 | 路徑 |
|------|------|
| verify_proposal | `prompts/4_diary/publicApi/v2/{module}_api/{module}_v2_verify_proposal.md` |
| 原始 proposal | `prompts/4_diary/publicApi/v2/{module}_api/{module}_v2_proposal.md` |
| plan | `prompts/4_diary/publicApi/v2/review_v2_plan.md` |
| implementation_prompt | `prompts/4_diary/publicApi/v2/publicApi_v2_implementation_prompt.md` |
| publicApi_analysis | `prompts/4_diary/publicApi/v2/publicApi_analysis.md` |
| picture_guide | `prompts/4_diary/publicApi/v2/picture_url_handling_guide.md` |

## 執行步驟

### proposal 模式

1. **建立進度追蹤**（強制）
   ```
   TaskCreate: subject="Step 1: 建立進度追蹤", activeForm="建立進度追蹤中..."
   TaskCreate: subject="Step 2: 定位 verify_proposal", activeForm="定位 verify_proposal..."
   TaskCreate: subject="Step 3: 讀取 plan", activeForm="讀取 plan..."
   TaskCreate: subject="Step 4: 整理參數排列組合", activeForm="整理參數排列組合..."
   TaskCreate: subject="Step 5: 寫入 verify_proposal", activeForm="寫入 verify_proposal..."
   ```

2. **定位 verify_proposal**
   - 從對話上下文或 `$2` 取得模組名稱
   - 路徑：`prompts/4_diary/publicApi/v2/{module}_api/{module}_v2_verify_proposal.md`
   - 不存在 → 建立骨架
   - 已存在 → 讀取現有內容

3. **讀取 plan 中該模組的區塊**
   - 讀取 `review_v2_plan.md`
   - 提取 endpoint 清單、前端實際傳值格式、比對規則

4. **整理前端參數排列組合**（per endpoint）
   - 無篩選（基本分頁）
   - 單一篩選（city only, keyword only, etc.）
   - 組合篩選（city + district + price range）
   - 邊界值（priceMin=0, 超大 page number）
   - 產出 Cases 表

4.5. **辨識圖片欄位**（讀取 picture_url_handling_guide.md）
   - 從 v2 proposal 和 v1 service 找出圖片相關欄位
   - 記錄 v1 URL 拼接方式（ConfigService + 舊伺服器 URL）
   - 記錄 v2 S3 路徑結構（S3Service.generateSignedUrl）
   - 記錄到 verify_proposal 的「## 圖片欄位分析」區塊

5. **寫入 verify_proposal**
   - 寫入：## Endpoint 清單、## 前端參數排列組合、## 比對規則
   - 在對話中印出：「📋 Proposal 建立完成。下一步：/verifyOWS data {module}」

### data 模式

1. **讀取 verify_proposal + 模組的 v2 proposal**
   - 讀取 verify_proposal 的參數排列組合
   - 讀取 `{module}_v2_proposal.md` 的 MSSQL ↔ PostgreSQL 欄位對照表
   - 了解 MSSQL table/view 名稱、欄位名稱、值域差異

2. **連 dev DB 撈真實資料**（PostgreSQL + MSSQL 雙資料庫）
   - 讀取 db-connection-rules.md
   - `./scripts/db-tunnel.sh dev all`
   - 【PostgreSQL】v2 資料查詢
     - ⚠️ psql 格式：`export PGPASSWORD=<DB_PASSWORD> && psql ...`（不用 inline 格式）
     - 撈有資料的篩選值（哪些 city 有物件、哪些 storeId 有效）
     - 撈特定 endpoint 需要的 ID
   - 【MSSQL】v1 資料查詢（參考 v2 proposal 的欄位對照表）
     - 連線：`sqlcmd -S localhost,1433 -U <DB_USER> -P '<DB_PASSWORD>' -C -d <DB_NAME>`
     - 用 PostgreSQL 撈到的篩選值，反查 MSSQL 確認 v1 也有資料
   - 記錄每個 case 的具體參數值（確保 v1/v2 都有資料可比對）

3. **寫入 verify_proposal**
   - 寫入：## 測試資料
   - 在對話中印出：「🗄️ 測試資料準備完成。下一步：/verifyOWS check {module}」

### check 模式

1. **確認前置條件**
   - verify_proposal 已存在且有參數排列組合 + 測試資料
   - `./scripts/db-tunnel.sh dev all` 已連接
   - `lsof -i :3001` 確認 server 運行中，沒有 → `./.claude/scripts/start-dev-server.sh`

2. **逐 case 驗證**（一個 endpoint 測完再下一個，TaskCreate per 參數模式）
   - curl v1: `localhost:3001/frontend/v1/{endpoint}`
   - curl v2: `localhost:3001/frontend/v2/{endpoint}`
   - 逐欄位比對（嚴格一致規則，詳見流程圖「比對規則」+ picture_url_handling_guide.md）
   - 發現差異 → 記錄到修改提案 → 繼續測下一個 case
   - 記錄 pass/fail + 差異欄位

3. **更新 verify_proposal**
   - 寫入：## 驗證結果、## 差異報告
   - 有修改提案 → 寫入 ## 修改提案
   - 全 pass → 更新 verify_proposal 標註「✅ 驗證通過」+ 更新 `publicApi_analysis.md` 模組狀態
     - 首次 check 就全 pass（無程式碼修改）→ 印出：「✅ {module} 驗證通過，已更新 verify_proposal 和 publicApi_analysis.md」
     - 經過 review/implement 後全 pass（有程式碼修改）→ 印出：「✅ {module} 驗證通過，已更新文件。下一步：/gcommit-push」
   - 有差異 → 印出：「⚠️ 發現差異，修改提案已記錄。下一步：/verifyOWS review {module}」

### review 模式

1. **定位三份輸入**
   - 讀取 `{module}_v2_proposal.md`（原始實作提案，理解歷史決策）
   - 讀取 v2 service/controller/dto 程式碼
   - 讀取 verify_proposal 中的修改提案

2. **載入檢核知識**
   - 讀取 `publicApi_v2_implementation_prompt.md` 的關鍵區塊
     - 實作目標（136-150）
     - v1 vs v2 架構差異（154-190）
     - 實作檢查清單（2008-2055）

3. **檢核修改提案**
   - 架構規範：PostgreSQL Entity、@InjectRepository、v2 前綴
   - Service 層：禁止 try-catch、NotFoundException、enum 常數
   - DTO 設計：Input/Output 分離、@Expose()、plainToInstance
   - SQL 安全：參數化查詢、白名單排序、LIKE 轉義
   - 比對 v1 service 邏輯：v2 是否涵蓋 v1 所有參數處理和查詢邏輯
   - 修改範圍是否最小化（不過度修改）

4. **輸出檢核結果 + 更新 verify_proposal**
   - ⚠️ 使用 Edit tool 局部修改，禁止 Write 覆蓋整份文件
   - 全通過 → 印出：「✅ Review 通過。下一步：/implement，完成後執行 /verifyOWS check {module}」
   - 有問題 → 更新修改提案 → 印出：「❌ 修改提案有問題，已更新。下一步：/verifyOWS review {module}」

### review-again 模式

1. **讀取 verify_proposal 的修改提案**

2. **讀取修正後的 v2 程式碼**
   - 確認修改提案已被正確實作

3. **再次比對檢核**
   - 修改提案是否恰當（有沒有過度修改或遺漏）
   - 修正後的程式碼是否符合規範
   - 搭配原始 proposal 確認修改不偏離設計意圖

4. **更新 verify_proposal**
   - 全通過 → 印出：「✅ Review 通過。下一步：/implement，完成後執行 /verifyOWS check {module}」
   - 有問題 → 更新修改提案 → 印出：「❌ 修改提案有問題，已更新。下一步：/verifyOWS review-again {module}」
