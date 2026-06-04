# /dpf 執行流程

```
/dpf {apiName} 執行流程（v1.0 — Data Flow 驅動的主動修復）
│
├─ 0. 【建立進度追蹤】（強制）
│   └─ 使用 TaskCreate 建立 7 個追蹤項目
│
├─ 1. 【讀取 Data Flow 文件】
│   ├─ 搜尋 6_api_data_flow/adminApi/{apiName}-data-flow.md
│   ├─ 搜尋 6_api_data_flow/publicApi/{apiName}-data-flow.md
│   ├─ 找到 → 讀取文件，記錄 API 目錄（adminApi 或 publicApi）
│   └─ 找不到 → 報錯：「❌ 找不到 {apiName} 的 data-flow 文件，請先執行 /api-flow-architecture {apiName}」→ 結束
│
├─ 2. 【提取問題清單】
│   ├─ 搜尋 data-flow 文件中的所有 ❌ 和 ⚠️ 問題
│   │   ├─ 「## 問題清單」→ 所有 ❌ 和 ⚠️ 問題（含各子表格）
│   │   ├─ 「## 500 防護檢查 → 500 路徑清單」→ ⚠️ 未防護路徑
│   │   ├─ 「## 資料流驗證 → 資料流斷點彙總」→ ❌ 和 ⚠️ 斷點
│   │   ├─ 「-c 檢查發現的問題」→ 所有問題（找不到就跳過）
│   │   └─ 「-s 檢查發現的問題」→ 所有問題（找不到就跳過）
│   ├─ 合併去重（以「問題描述 + 位置」為唯一鍵，保留最高嚴重度）
│   ├─ 問題篩選（複用 /add-pi 邏輯）
│   │   ├─ ❌ 問題 → 全部保留
│   │   └─ ⚠️ 問題 → 逐一判斷
│   │       ├─ 排除：前端已防護（catch/fallback/disabled/v-if）
│   │       ├─ 排除：無人使用（無前端頁面/前端未使用）
│   │       ├─ 排除：冗餘欄位（API 回傳但前端未使用）
│   │       └─ 保留：可能導致錯誤/500/資料不正確
│   └─ 無任何問題 → 顯示「✅ {apiName} 的 data-flow 沒有需要處理的問題」→ 結束
│
├─ 3. 【判斷執行模式】
│   ├─ 對話上下文有 proposal 路徑（剛跑完 /debugP 或 /add-pi）
│   │   └─ 進入「更新模式」
│   │       ├─ 讀取現有 proposal
│   │       ├─ 比對 Step 2 問題清單 vs proposal 現有內容
│   │       │   ├─ 已有解法 → 跳過
│   │       │   └─ 只有問題描述（/add-pi 加的）或完全沒有 → 標記需補充
│   │       └─ 全部已有解法 → 顯示「✅ 所有 data-flow 問題已有修改建議」→ 結束
│   └─ 對話上下文沒有 proposal
│       ├─ 搜尋 prompts/4_diary/{apiName}_api/debug/potential-fix/*_proposal.md
│       ├─ 有找到 → 讀取內容，比對哪些問題已處理、哪些是新問題
│       │   ├─ 全部已處理 → 顯示「✅ 所有問題已在既有 proposal 中處理」→ 結束
│       │   └─ 有新問題 → 只處理新問題，在輸出中標記「🆕」→「新建模式」
│       └─ 沒找到 → 全部問題都是新的 →「新建模式」
│
├─ 4. 【讀取後端程式碼並分析修法】
│   ├─ 從 data-flow 取得 Entity/DTO/Service/Controller 結構（不用重新搜尋）
│   ├─ 讀取問題涉及的 Service 原始碼
│   ├─ 讀取問題涉及的 Controller 原始碼
│   ├─ 讀取問題涉及的 DTO 原始碼
│   ├─ 【後端優先原則】分析每個問題時：
│   │   ├─ 先問：後端能否解決？
│   │   │   ├─ 回傳預設值物件（而非 null）→ 後端解
│   │   │   ├─ 格式化/轉換欄位值 → 後端解
│   │   │   ├─ 加 null guard / fallback → 後端解
│   │   │   ├─ 加欄位到 response → 後端解
│   │   │   └─ 以上都不適用 → 才考慮前端
│   │   ├─ 前端才該做的事（後端無法替代）：
│   │   │   ├─ UI 互動邏輯（v-if/v-show、disabled 狀態）
│   │   │   ├─ 前端路由/導航邏輯
│   │   │   ├─ 前端狀態管理（store/composable）
│   │   │   └─ 純顯示格式（CSS、排版、i18n）
│   │   └─ 問題來源表格判斷：
│   │       ├─ 後端能解 → 前端 ❌ / 後端 ✅
│   │       └─ 只有前端能解 → 前端 ✅ / 後端 ❌
│   ├─ 分析每個問題的修法（依後端優先原則產出具體修改建議）
│   ├─ 欄位名不匹配問題 → 依「欄位名不匹配統一修法規則」處理（後端加 alias，不改前端）
│   ├─ 前端欄位資訊直接從 data-flow「UI ↔ API 欄位對應」區塊取得（不需額外查 ui-api-index）
│   │
│   ├─ 4.5 【檔案產出偵測】
│   │   ├─ 掃描 module 目錄，偵測是否有檔案產出邏輯
│   │   │   > ℹ️ Grep = Claude Code tool（底層為 rg）、Glob = Claude Code tool（底層為 fast-glob）
│   │   │   ├─ Grep service 中: `puppeteer|generatePdf` → PDF 產出
│   │   │   ├─ Grep service 中: `docx-templates|docx-merger` → Word 產出
│   │   │   ├─ Grep service 中: `exceljs|xlsx` → Excel 產出（未來擴充）
│   │   │   └─ Glob: `templates/**` → template 檔案（.html/.hbs/.docx）
│   │   │
│   │   ├─ 沒有檔案產出 → 跳過，繼續 Step 5
│   │   └─ 有檔案產出 → 進入 4.6
│   │
│   ├─ 4.6 【檔案產出欄位分析】
│   │   ├─ 讀取檔案產出 service 原始碼
│   │   ├─ 讀取 template 檔案（若有）
│   │   ├─ 識別資料來源（從哪個 Web Service method 取資料）
│   │   ├─ 比對：Web API response 欄位 vs 檔案產出使用的欄位
│   │   │   ├─ PDF：template 中的 Handlebars 變數 vs prepareTemplateData 回傳
│   │   │   └─ Word：docx template 變數 vs 扁平化轉換函數回傳
│   │   ├─ 發現不一致 → 標記為問題，納入 proposal 解法
│   │   └─ 無問題 → 在 proposal 記錄「已檢查檔案產出，無問題」
│   │
│   └─ 4.6.5 【檔案產出欄位風險分析】
│       ├─ 從 Step 4.6 取得所有 template 變數清單
│       ├─ 逐一追溯每個變數的資料來源
│       │   ├─ 扁平化轉換函數中的 key → 對應的 DTO/Entity 欄位
│       │   ├─ 關聯深度（如 realEstate.store.name → 2 層關聯）
│       │   └─ Entity 欄位的 nullable 狀態（從 data-flow 取得）
│       ├─ 風險判斷
│       │   ├─ nullable 欄位 + 轉換函數有 fallback（?? ''、|| ''）→ ✅ 安全
│       │   ├─ nullable 欄位 + 轉換函數沒有 fallback → ⚠️ 風險（可能空白）
│       │   ├─ FK 關聯 + 關聯可能不存在 → ⚠️ 風險（整組欄位空白）
│       │   └─ 必填欄位 → ✅ 安全
│       └─ 產出「## 檔案產出欄位風險表」寫入 proposal
│           ├─ 供 /reviewDoc -data 推導檔案產出 cases
│           └─ 供 /check-result 驗證檔案內容
│
│   └─ 🆕 4.7 【額外檢查：分頁預設值】（獨立於問題清單）
│       ├─ 檢查 findAll/list endpoint 的 DTO pageSize/limit 預設值
│       ├─ 不是 10 → 納入問題清單，產出修改建議
│       └─ 是 10 → 跳過
│
├─ 5. 【產出/更新 Proposal】
│   ├─ 「新建模式」→ 建立新 proposal
│   │   ├─ 建立目錄：prompts/4_diary/{apiName}_api/debug/potential-fix/
│   │   ├─ 命名：{MMDD}_{apiName}_potential_fix_proposal.md
│   │   ├─ 包含：API Data Flow 參照區塊（文件路徑、scan-meta、關鍵結構摘要）
│   │   ├─ 包含：已知潛在問題（Data Flow）區塊（與 /add-pi 產出格式相同）
│   │   ├─ 包含：每個問題的解法（後端修改 + 前端修改建議）
│   │   ├─ 包含：前端修改區塊（Notion 票 / Issue # 標記 N/A）
│   │   ├─ 包含：驗證建議區塊（供 /check-result 使用）
│   │   └─ 包含：修改檔案清單
│   └─ 「更新模式」→ 更新現有 proposal
│       ├─ 無「## 已知潛在問題（Data Flow）」→ 新增區塊 + 解法
│       ├─ 有區塊但問題缺解法 → 為每個問題新增「## 解法 N」（含程式碼修改）
│       ├─ 更新問題表格（補上解法章節連結）
│       └─ 更新「## 修改檔案清單」追加新增的修改檔案
│
├─ 6. 【檢核 Proposal】
│   ├─ 讀取 review-proposal-rules.md
│   ├─ 讀取 adminApi-architecture.md
│   ├─ 檢查 Service 錯誤處理模式是否符合架構
│   ├─ 檢查 messageEN 是否完整
│   ├─ 檢查欄位影響矩陣
│   ├─ 🆕 歷史文件驗證
│   │   ├─ 從 proposal 提取關鍵字搜尋 prompts/4_diary/
│   │   ├─ 找到 → 比對是否符合歷史決策
│   │   └─ 有矛盾 → 自動修正或標記
│   └─ 有問題 → 自動修正後繼續
│
└─ 7. 【輸出結果】
    ├─ 顯示 proposal 路徑
    ├─ 顯示問題統計（❌ N 個、⚠️ N 個）
    ├─ 顯示修改檔案清單
    └─ 提示後續流程：
        「請依序執行：
         /reviewDoc → /reviewDoc -data {env} → /implement → /check-result {env} → /gcommit-push → /fxxxf2e」
│
└─ 8. 【更新進度表】（@update-progress.md）
    └─ 將 /dpf 標記為 ✅
```
