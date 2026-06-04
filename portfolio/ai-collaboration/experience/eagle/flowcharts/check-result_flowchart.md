# check-result 執行流程

```
/check-result 執行流程（v3 - 環境偵測優先）
│
├─ 0. 【建立進度追蹤】（強制）
│   └─ 使用 TaskCreate 建立所有步驟的 task
│
├─ 1. 【環境切換】（偵測優先）
│   │
│   ├─ 1.1 偵測三項環境狀態
│   │   ├─ Server: lsof -ti:3001（有 PID = 已運行）
│   │   ├─ PG Tunnel: pgrep -f "ssh.*5433:localhost:5432"（有 = 已連）
│   │   ├─ MSSQL Tunnel: pgrep -f "ssh.*1433:<SERVER_IP>:1433"（有 = 已連）
│   │   └─ PG 目標環境: grep DB_DATABASE backend-nestjs/src/config/.env.local
│   │       ├─ eagle-dev → currentEnv = "dev"
│   │       ├─ eagle（非 eagle-dev）→ currentEnv = "staging"
│   │       └─ 檔案不存在 → currentEnv = "local"
│   │
│   ├─ 1.2 比對目標環境 vs 偵測結果
│   │   ├─ 【全部吻合】currentEnv == $1 且 PG ✅ 且 MSSQL ✅
│   │   │   └─ 跳過切換，dbSwitched = false
│   │   ├─ 【PG 對但 MSSQL 未連】
│   │   │   └─ 只跑 db-tunnel.sh mssql start，dbSwitched = false
│   │   └─ 【環境不對 / 都沒連】
│   │       └─ 跑 db-tunnel.sh $1 all，dbSwitched = true
│   │
│   └─ 1.3 輸出偵測摘要
│       └─ 「🔍 環境偵測：Server {✅/❌} | PG({env}) {✅/❌} | MSSQL {✅/❌}」
│
├─ 2. 【上下文分析】
│   ├─ 從對話上下文理解：
│   │   ├─ 剛完成什麼實作
│   │   ├─ 涉及哪些欄位/邏輯
│   │   └─ proposal 文件內容
│   │
│   └─ 判斷驗證類型：
│       ├─ Bug Fix 驗證 → 走三步法
│       ├─ 涉及 DB 欄位/計算 → 需要先查 DB
│       └─ 純 DTO/格式變更 → 直接打 API
│
├─ 2.5 【帳號智能識別】
│   │
│   ├─ 從對話上下文找到 bug spec 路徑
│   │
│   ├─ 掃描整份 Bug Spec（主內容 + 留言區塊）
│   │   └─ 正則匹配：account/password 格式
│   │
│   ├─ 識別結果：
│   │   ├─ 找到 1 個帳號 → 記錄，後續使用
│   │   ├─ 找到多個帳號 → 記錄所有，準備迭代驗證
│   │   └─ 沒找到 → 使用預設帳號
│   │       ├─ 指令：get-token.sh local 12345678
│   │       └─ ⚠️ 預設帳號帳密相同，禁止加 /password
│   │
│   └─ 輸出：
│       └─ 「📌 發現 N 個測試帳號：{帳號列表}」
│
├─ 3. 【條件分流：DB 查詢測試資料】
│   │
│   ├─ 【涉及 DB】
│   │   ├─ 用 psql 查詢測試資料
│   │   └─ 記錄 ID + 預期值
│   │
│   └─ 【不涉及 DB】
│       └─ 跳過此步驟
│
├─ 4. 【Server 啟動】（配合環境偵測）
│   │
│   ├─ 4.1 判斷是否需要操作
│   │   ├─ dbSwitched = true → 需要重啟（走 4.2）
│   │   ├─ dbSwitched = false 且 serverRunning = true → 跳過
│   │   └─ dbSwitched = false 且 serverRunning = false → 直接啟動（不 pkill）
│   │
│   └─ 4.2 【需要重啟時】
│       ├─ pkill -f "nest start" || true
│       ├─ 確認 port 3001 已釋放
│       └─ 啟動 start-dev-server.sh
│
├─ 5-7. 【多帳號迭代驗證】
│   │
│   │   ┌─────────────────────────────────────────┐
│   │   │  迭代：對每個測試帳號執行 5 ~ 7          │
│   │   └─────────────────────────────────────────┘
│   │
│   ├─ 5. 【取得 Token】（使用當前帳號）
│   │   ├─ ⚠️ 直接執行腳本，不要先查 DB 驗證帳號
│   │   ├─ 輸出：「📌 [{N}/{Total}] 驗證帳號：{account}（{角色}）」
│   │   └─ ./.claude/scripts/get-token.sh local {account/password}
│   │
│   ├─ 6. 【API 驗證 - Bug Fix 三步法】
│   │   ├─ 6.1 推導 API 序列
│   │   ├─ 6.2 存在性確認
│   │   ├─ 6.3 Bug Spec 模擬
│   │   ├─ 6.4 檔案可存取性驗證（條件觸發）
│   │   └─ 6.6 篩選參數交互驗證（條件觸發）
│   │
│   ├─ 7. 【結果分析】
│   │   ├─ API 成功（2xx）→ 比對 DB 預期值 vs API 回傳值
│   │   ├─ API 失敗（4xx/5xx）→ 自動查日誌
│   │   └─ 效能摘要 → 收集所有 API 耗時，⚠️ 標記超過 1s
│   │
│   ├─ 7.5 【更新 Proposal - 當前帳號結果】
│   │   └─ 在 proposal 新增當前帳號的驗證紀錄
│   │
│   └─ ↺ 下一個帳號（如果有）
│
├─ 8. 【自動更新提案文件】（驗證完成時）
│   ├─ 8.1 判斷是否有 proposal
│   ├─ 8.2 更新進度表
│   ├─ 8.3 確認所有帳號驗證紀錄已寫入
│   └─ 8.4 同步修改檔案清單
│       ├─ git status 取得 backend-nestjs 下 modified + untracked 檔案
│       ├─ 比對 proposal「修改檔案清單」
│       ├─ git 有但清單沒有 → 追加，標註「（check-result 期間新增）」
│       └─ 無新增 → 跳過
│
└─ 9. 【結束前檢查】（強制）
    ├─ 執行 TaskList 確認所有 task 狀態
    ├─ 全部 completed → 輸出多帳號驗證摘要
    └─ 有未完成 → 先補完成再輸出
│
└─ 10. 【更新進度表】（@update-progress.md）
    └─ 將 /check-result 標記為 ✅
```

## Bug Fix 三步法

```
API 驗證流程
│
├─ ⚠️ 【強制規則】所有 API 呼叫統一使用 test-dashboard-api.sh
│   ├─ GET:    ./.claude/scripts/test-dashboard-api.sh "/path" ".jq"
│   ├─ POST:   ./.claude/scripts/test-dashboard-api.sh "/path" -X POST -d '{json}'
│   ├─ PATCH:  ./.claude/scripts/test-dashboard-api.sh "/path" -X PATCH -d '{json}' ".jq"
│   ├─ DELETE: ./.claude/scripts/test-dashboard-api.sh "/path" -X DELETE
│   └─ ❌ 禁止裸 curl + TOKEN=$(...) 複合命令（會觸發權限提示）
│
├─ 6.1 推導 API 序列
│   ├─ 讀取「重現步驟」
│   ├─ 【優先】查詢 UI-API 索引
│   └─ 【備用】搜尋前端專案
│
├─ 6.2 存在性確認
│   ├─ 用 DB ID 打 findOne/findAll
│   └─ 比對 DB 預期值 vs API 回傳值
│
├─ 6.2.5 DB vs API 欄位一致性驗證（條件觸發）
│   ├─ 觸發條件：有新增/修改 GET 回傳欄位
│   ├─ 【一般欄位】DB 直接值 vs API 回傳值逐欄比對
│   ├─ 【計算欄位】查 DB 原始欄位 → AI 自己算 → 跟 API 比對
│   └─ 產出：逐欄位 ✅/❌ 比對表
│
├─ 6.3 Bug Spec 模擬
│   ├─ 照著操作步驟打 API（POST/PATCH/DELETE）
│   └─ 驗證錯誤是否修復
│
├─ 6.3.6 CRU 寫入後 DB 回查驗證（條件觸發）
│   ├─ 觸發條件：有 POST/PATCH 操作
│   ├─ 從 request body 提取送出的欄位值
│   ├─ 從 response 取得新建/更新的 ID
│   ├─ 直接查 DB 確認實際寫入值
│   ├─ 逐欄比對：request 送出值 vs DB 實際值
│   └─ 產出：CRU 寫入一致性驗證表
│
└─ 6.4 檔案可存取性驗證（條件觸發）
    ├─ 下載檔案
    ├─ 檢查格式和大小
    └─ 輸出驗證結果表格

└─ 6.4.5 檔案內容抽樣驗證（有檔案產出時）
    ├─ 觸發條件
    │   ├─ Step 6.4 下載的檔案是 docx 或 pdf → 觸發
    │   ├─ proposal 有「## 檔案產出欄位風險表」→ 使用風險表指引抽樣
    │   └─ 沒有風險表 → 隨機抽樣 5~10 個欄位
    │
    ├─ Word (docx) 內容提取
    │   ├─ unzip -p {file} word/document.xml
    │   └─ grep 提取 <w:t> 標籤中的文字內容
    │
    ├─ PDF 內容提取
    │   ├─ pdftotext（如有）
    │   └─ strings（備用）
    │
    ├─ 抽樣比對
    │   ├─ 【有風險表】優先驗 ⚠️ 風險欄位
    │   │   ├─ 從「📄 檔案產出測試資料」取預期值
    │   │   ├─ 找到 → ✅ 正確
    │   │   ├─ 找不到 + DB 有值 → ❌ 程式 bug
    │   │   └─ 找不到 + DB 無值 → ⚠️ DB 無資料（非 bug）
    │   └─ 【沒有風險表】隨機抽樣 5~10 個有值欄位
    │
    └─ 產出：檔案內容驗證結果表

└─ 6.6 篩選參數交互驗證（條件觸發）
    ├─ 觸發條件：proposal 有 🔍 篩選參數測試 Cases
    ├─ 從 proposal 讀取 Q-N cases + 預期筆數
    ├─ 推導 findAll endpoint（從 proposal 上下文）
    ├─ 逐 case 呼叫 findAll API（test-dashboard-api.sh）
    ├─ 子集驗證：Q-2 ≤ Q-1（確定性 pass/fail）
    ├─ 筆數比對：API vs 預期（僅參考，不做 pass/fail）
    └─ 產出：篩選參數驗證結果表
```

## -f 模式差異（檔案上傳輔助）

```
/check-result dev -f（與一般模式的差異）
│
├─ 0. 【建立進度追蹤 + 載入檔案上傳知識】
│   ├─ 解析參數，識別 -f flag
│   ├─ TaskCreate 包含 Step 6.5
│   └─ 🆕 載入檔案上傳知識（精簡版，約 2,500 tokens）
│       ├─ file_upload_architecture.md（架構文件）
│       └─ file_upload_checklist.md（檢核清單）
│
├─ 3. 【DB 查詢測試資料】（🆕 增加檔案相關查詢）
│   └─ 除了一般查詢外，額外查詢：
│       ├─ files table 確認檔案紀錄存在
│       ├─ 檔案與主 Entity 的關聯（foreignKey）
│       └─ documentType 欄位值是否符合 DOCUMENT_TYPE_MAPPING
│
├─ 6.4 【強制執行】檔案可存取性驗證
│   └─ ⚠️ -f 模式下此步驟為必做，非條件觸發
│
├─ 6.5 【新增】檔案上傳 4 項專屬檢核
│   ├─ CUSTOM_PATH_PREFIX
│   ├─ DOCUMENT_TYPE_MAPPING
│   ├─ DTO 檔案欄位
│   └─ Entity 關聯
│
└─ 7. 【結果分析】（🆕 增加檔案維度）
    └─ 除了一般比對外，額外分析：
        ├─ fileUrl 路徑前綴是否正確（環境隔離）
        ├─ 檔案下載結果 vs DB 紀錄的一致性
        └─ 4 項專屬檢核結果彙整
```

## 驗證類型判斷

| 情況 | 需要先查 DB | 說明 |
|------|-------------|------|
| 新增計算欄位 | ✅ | 需要找邊界案例驗證計算邏輯 |
| 新增關聯欄位 | ✅ | 需要找各種關聯情況 |
| 修改查詢邏輯 | ✅ | 需要找符合/不符合條件的資料 |
| 純 DTO 欄位重命名 | ❌ | 直接打 API 看格式 |
| 新增固定值欄位 | ❌ | 不依賴 DB 資料 |
