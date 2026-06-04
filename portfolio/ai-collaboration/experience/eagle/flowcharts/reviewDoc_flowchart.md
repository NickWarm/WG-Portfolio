# reviewDoc 執行流程

```
/reviewDoc 執行流程（v4.0 - 移除 c/s/df，data 改用 data-flow 文件）
│
├─ 1. 【參數識別】（⛔ 識別到參數後，必須走對應的專屬流程，禁止降級為一般模式）
│   ├─ 無參數 → 一般檢核模式
│   ├─ again 參數 → Again 模式（重新檢核上次文件）
│   ├─ f 參數 → 檔案上傳補充檢核模式
│   ├─ p 參數 → 權限補充檢核模式
│   └─ data 參數 → DB Data 測試資料準備模式（從 data-flow 推導 cases）
│
├─ [f 模式專屬流程]
│   │
│   ├─ 1. 【按需載入知識】（僅此模式載入）
│   │   ├─ file_upload_architecture.md
│   │   └─ file_upload_checklist.md
│   │
│   ├─ 2. 【讀取提案文件】
│   │   └─ 從對話上下文判斷
│   │
│   ├─ 3. 【執行 6 項專屬檢核】
│   │   ├─ CUSTOM_PATH_PREFIX
│   │   ├─ DOCUMENT_TYPE_MAPPING
│   │   ├─ Module 設定
│   │   ├─ Service 方法
│   │   ├─ DTO 欄位
│   │   └─ Entity 關聯
│   │
│   └─ 4. 【輸出】
│       ├─ 標註「📁 檔案上傳補充檢核」
│       └─ 只顯示檔案上傳相關檢核結果
│
├─ [p 模式專屬流程] 🆕
│   │
│   ├─ 1. 【按需載入知識】（僅此模式載入）
│   │   ├─ 1_permission_architecture.md
│   │   ├─ 2_permission_adjustment_rules.md
│   │   └─ 🆕 eagle_permission_v1.csv（角色 × 功能 × 操作 權限矩陣）
│   │
│   ├─ 2. 【讀取提案文件】
│   │   └─ 從對話上下文判斷
│   │
│   ├─ 3. 【執行 6 項專屬檢核】
│   │   ├─ apiPermissions.constant.ts（權限項目定義）
│   │   ├─ permissions.constant.ts（路由權限對應）
│   │   ├─ rolePermissionMapping.constant.ts（角色集合）
│   │   ├─ Controller Guards（@UseGuards）
│   │   ├─ Module 依賴（Entity、Redis、Guard）
│   │   ├─ 輔助性 API 豁免（simple-list 等）
│   │   └─ 🆕 CSV 權限矩陣比對（eagle_permission_v1.csv）
│   │       ├─ 比對 proposal 權限項目 vs CSV 角色權限矩陣
│   │       ├─ CSV「yes」→ proposal 必須有對應角色授權 → 沒有則 ❌
│   │       ├─ CSV「需確認」→ ⚠️ 標記需與 PM 確認
│   │       └─ CSV 沒有該功能 → ⚠️ 標記 CSV 可能需更新
│   │
│   └─ 4. 【輸出】
│       ├─ 標註「🔐 權限專屬檢核」
│       └─ 只顯示權限相關檢核結果
│
├─ [data 模式專屬流程]（v4 - 2026-02-19 新增篩選參數交互行為 cases）
│   │
│   ├─ 1. 【取得 API Data Flow 文件】
│   │   ├─ 檢查 proposal 是否有「## API Data Flow 參照」區塊
│   │   │   ├─ 有 → 從區塊取得文件路徑，讀取 data-flow 文件
│   │   │   └─ 沒有 → ⚠️ 中斷
│   │   │       ├─ 提示：請先執行 /api-flow-architecture {apiName}
│   │   │       ├─ 用戶執行完回來後繼續
│   │   │       └─ 自動讀取新建的 data-flow 文件
│   │   │           └─ 自動補寫「## API Data Flow 參照」到 proposal
│   │   └─ 提取：Entity 欄位、relations、nullable、DTO、Service select
│   │
│   ├─ 2. 【推導驗證 Cases】
│   │   ├─ nullable 欄位 → 有值 case + null case
│   │   ├─ FK 關聯 → 關聯存在 case + 關聯不存在 case
│   │   ├─ softDelete 關聯 → 正常 case + 被刪除 case
│   │   ├─ 必填欄位 → 有值 case（不需 null case）
│   │   ├─ 從 proposal 修改內容聚焦相關欄位
│   │   ├─ 🆕 從 proposal「## 檔案產出欄位風險表」推導檔案產出 cases
│   │   │   ├─ 沒有風險表 → 跳過，維持現有行為
│   │   │   └─ 有風險表 → 提取 ⚠️ 風險欄位
│   │   │       ├─ nullable FK → 「FK 存在 + 有值」case + 「FK 不存在 + 空白」case
│   │   │       ├─ nullable 欄位 → 「有值」case + 「null」case
│   │   │       ├─ 深層關聯 → 「完整關聯鏈」case + 「中間關聯斷裂」case
│   │   │       └─ 特殊 case：「完整資料」— 找一筆所有風險欄位都有值的記錄
│   │   ├─ 產出 Cases 表（欄位、情境、預期行為），檔案產出 cases 標記「📄」
│   │   └─ 🆕 篩選參數交互行為 cases（proposal 涉及 findAll + 欄位匹配 query param 時）
│   │       ├─ 不涉及 findAll 或無匹配 query param → 跳過
│   │       └─ 有匹配 → 推導篩選 Cases
│   │           ├─ 從 data-flow DTO 列出 query params，按「篩選維度」分組
│   │           ├─ Q-1: 只帶母參數 → 預期：該分類所有資料
│   │           ├─ Q-2: 母參數 + 子參數 → 預期：Q-2 ≤ Q-1（子集）
│   │           ├─ Q-3: 不帶任何篩選 → 預期：全部資料
│   │           ├─ Q-4: 只帶子參數 → 預期：依篩選邏輯定義
│   │           └─ 產出 Cases 表標記「🔍 篩選」
│   │
│   ├─ 3. 【連接 DB + 推導 SQL】
│   │   ├─ ./scripts/db-tunnel.sh {env} → 連接目標環境
│   │   ├─ ⚠️ psql 格式：export PGPASSWORD=<DB_PASSWORD> && psql ...
│   │   ├─ 用 data-flow 的 Entity 關聯推導 JOIN 路徑
│   │   └─ 🆕 篩選參數資料分佈 SQL（有篩選 cases 時）
│   │       ├─ 從 data-flow Service findAll WHERE 條件推導
│   │       ├─ 單參數分佈：GROUP BY {param}
│   │       └─ 交叉分佈：GROUP BY {paramA}, {paramB}
│   │
│   ├─ 4. 【撈 DB 測試資料】
│   │   ├─ 逐 case 執行 SQL
│   │   ├─ 記錄 ID + 欄位值
│   │   ├─ 找不到 → 標記「⚠️ 無測試資料」→ 嘗試替代條件
│   │   ├─ 多筆策略：優先找 1 筆覆蓋最多 case 的記錄
│   │   ├─ 🆕 檔案產出 cases（有風險表時）
│   │   │   ├─ 「完整資料」case → JOIN 查詢所有風險欄位都 IS NOT NULL
│   │   │   │   └─ 找不到 → 標記「⚠️ 無完整測試資料，部分欄位必定空白」
│   │   │   ├─ 「空白」case → 找風險欄位為 NULL 的記錄
│   │   │   └─ 記錄到 proposal「## DB 測試資料」，標記「📄 檔案產出測試資料」
│   │   └─ 🆕 篩選參數 cases（有篩選 cases 時）
│   │       ├─ 先查資料分佈 → 得到各組合「預期筆數」
│   │       ├─ 交叉驗證：子集筆數 ≤ 母集筆數？
│   │       │   ├─ 是 → ✅ 分佈合理
│   │       │   └─ 否 → ❌ 篩選邏輯可能有 bug
│   │       └─ 記錄到 proposal「## DB 測試資料」，標記「🔍 篩選參數測試資料」
│   │
│   └─ 5. 【寫入 proposal + 輸出】
│       ├─ proposal 新增「## DB 測試資料」
│       ├─ 標註「🗄️ DB Data 測試資料準備」
│       └─ 結尾提示：「請執行 /implement」
│
├─ [一般/Again 模式流程]
│   │
│   ├─ 🆕 1.5 【前置檢查：API Data Flow 參照】
│   │   ├─ Proposal 有「## API Data Flow 參照」區塊？
│   │   │   ├─ 有 → 讀取對應 data-flow 文件，作為檢核基礎
│   │   │   └─ 沒有 → 判斷 bug 類型
│   │   │       ├─ API 相關 → ⚠️ 警告：缺少 Data Flow 參照
│   │   │       └─ 非 API → 跳過
│   │   └─ 用途：後續檢核比對欄位分析一致性
│   │
│   ├─ 1.7A 【程式碼品質檢核】（永遠執行，僅 adminApi）
│   │   ├─ 從 proposal 識別涉及的 service 檔案，讀取原始碼
│   │   ├─ 500 防護比對
│   │   │   └─ 任何 endpoint 有潛在 500 風險的 DB 操作沒用 executeWithDbErrorHandling → 記錄 CR
│   │   ├─ 回傳型別比對
│   │   │   └─ 未用 DashboardServiceResponse<T> → 記錄 CR
│   │   ├─ 🆕 檔案產出一致性檢核（不依賴 proposal 是否提到，主動掃描）
│   │   │   ├─ 掃描 module 目錄，偵測是否有檔案產出邏輯
│   │   │   │   > ℹ️ Grep = Claude Code tool（底層為 rg）、Glob = Claude Code tool（底層為 fast-glob）
│   │   │   │   ├─ Grep service 中: `puppeteer|generatePdf` → PDF 產出
│   │   │   │   ├─ Grep service 中: `docx-templates|docx-merger` → Word 產出
│   │   │   │   ├─ Grep service 中: `exceljs|xlsx` → Excel 產出（未來擴充）
│   │   │   │   └─ Glob: `templates/**` → template 檔案（.html/.hbs/.docx）
│   │   │   │
│   │   │   ├─ 沒有檔案產出 → 跳過
│   │   │   │
│   │   │   └─ 有檔案產出 → 執行一致性檢核
│   │   │       ├─ 讀取檔案產出 service 原始碼
│   │   │       ├─ 讀取 template 檔案（若有）
│   │   │       ├─ 識別資料來源（從哪個 Web Service method 取資料）
│   │   │       ├─ 比對：Web API response 欄位 vs 檔案產出使用的欄位
│   │   │       │   ├─ PDF：template 中的 Handlebars 變數 vs prepareTemplateData 回傳
│   │   │       │   └─ Word：docx template 變數 vs 扁平化轉換函數回傳
│   │   │       ├─ 比對：proposal 修改是否影響檔案產出（欄位新增/刪除/改名）
│   │   │       │   ├─ 有影響但 proposal 未涵蓋 → ❌ 標記遺漏
│   │   │       │   └─ 有影響且 proposal 已涵蓋 → ✅
│   │   │       ├─ 有 CR → proposal 新增「## 檔案產出一致性檢核發現」section
│   │   │       └─ 無 CR → 跳過
│   │   ├─ 有 CR → proposal 新增「## 程式碼品質檢核發現」
│   │   └─ 無 CR → 跳過
│   │
│   ├─ 🆕 1.7E 【檔案上傳自動偵測】（永遠執行，僅 adminApi）
│   │   ├─ Grep service 中: `FileService|S3Service|handleFileUpload|CUSTOM_PATH_PREFIX`
│   │   ├─ 沒有檔案上傳 → 跳過
│   │   └─ 有檔案上傳 → 自動執行 -f 的 6 項專屬檢核
│   │       ├─ 載入：file_upload_architecture.md + file_upload_checklist.md
│   │       ├─ 執行 6 項：CUSTOM_PATH_PREFIX / DOCUMENT_TYPE_MAPPING / Module / Service / DTO / Entity
│   │       ├─ 有 CR → proposal 新增「## 檔案上傳自動檢核發現」
│   │       └─ 無 CR → 跳過
│   │
│   ├─ 🆕 1.7D 【DTO @Type 轉換檢核】（永遠執行，僅 adminApi）
│   │   ├─ Glob: src/api/adminApi/{apiName}/**/*.dto.ts
│   │   ├─ 掃描每個 DTO 檔案
│   │   │   ├─ Grep @IsNumber() 找出所有位置（含行數）
│   │   │   ├─ 每個 @IsNumber() 往下一行確認欄位名是否為 id
│   │   │   │   ├─ 匹配 /^\s+id[?]?\s*:\s*number/ → 是 id 欄位
│   │   │   │   └─ 不匹配 → 跳過
│   │   │   └─ 是 id 欄位 → 往上讀 3-5 行確認 decorator 區塊
│   │   │       ├─ 有 @Type(() => Number) → ✅ 跳過
│   │   │       ├─ 有 @Transform( 且含 Number( → ✅ 替代方案，跳過
│   │   │       └─ 都沒有 → 判斷 DTO 類別用途
│   │   │           ├─ 往上找最近的 class XXX { → 取得類別名
│   │   │           ├─ Update*/Create* → ❌ 需補充 @Type(() => Number)
│   │   │           ├─ *QueryDto/*FilterDto → ⏭️ 跳過（Query Params 不需要）
│   │   │           └─ *ResponseDto/*ResultDto → ⏭️ 跳過（Response 不需要）
│   │   ├─ 有 ❌ → proposal 新增「## DTO @Type 轉換檢核發現」
│   │   │   └─ 每個 CR 含：DTO 類別名、欄位名、行數、建議修改
│   │   └─ 無 ❌ → 跳過
│   │
│   ├─ 1.7C 【跨模組 Enum/Type/Transform 影響檢核】（proposal 修改了 Entity Enum/共用 type/DTO Transform 語意時）
│   │   ├─ 觸發條件：proposal 修改了以下任一項
│   │   │   ├─ *.entity.ts 的 Enum 定義
│   │   │   ├─ 共用 Enum/constants 的值
│   │   │   ├─ 共用 type/interface 結構
│   │   │   ├─ *.dto.ts 的 Transform 行為語意（null/undefined 回傳改變）
│   │   │   ├─ 沒有 → 跳過 1.7C
│   │   │   └─ 有 → 繼續
│   │   ├─ 1. 提取被修改的 Enum/Type/Transform 欄位名稱
│   │   ├─ 2. Grep src/api/ 搜尋所有引用檔案（排除 proposal 已涵蓋的）
│   │   ├─ 3. 分析使用方式
│   │   │   ├─ Input DTO Transform（@IsEnum + @Transform）→ ❌ 需改
│   │   │   ├─ Response DTO type 引用 → ⚠️ 視情況
│   │   │   ├─ Service 硬編碼比對（如 if value === -1）→ ❌ 需改
│   │   │   ├─ Service null/undefined guard（Transform 語意觸發時）
│   │   │   │   ├─ !== undefined / === undefined → ❌ 需確認
│   │   │   │   ├─ !== null / === null → ❌ 需確認
│   │   │   │   ├─ ?? defaultValue → ⚠️ 檢查行為差異
│   │   │   │   └─ ...(field !== undefined && { key }) → ❌ 需確認
│   │   │   └─ 其他引用 → ✅ 不需改
│   │   ├─ 有需修改 → proposal 新增「## 跨模組影響檢核發現」
│   │   └─ 無需修改 → 跳過
│   │
│   ├─ 1.7B 【Data Flow 交叉檢核】（Step 1.5 有讀取 data-flow 時）
│   │   ├─ 參數比對：DTO 定義 vs 前端實際使用的參數
│   │   │   └─ 不一致 → 依「欄位名不匹配統一修法規則」處理（後端加 alias，不改前端）
│   │   ├─ 有額外 CR → proposal 新增「## Data Flow 交叉檢核發現」
│   │   ├─ 無額外 CR → 跳過
│   │   ├─ 已知問題覆蓋檢核（/add-pi 產出檢核）
│   │   │   ├─ proposal 有「## 已知潛在問題（Data Flow）」？
│   │   │   │   ├─ 有 → 比對 data-flow ❌ 問題是否全涵蓋
│   │   │   │   │   ├─ 全涵蓋 → ✅
│   │   │   │   │   └─ 有遺漏 → ❌ 列出遺漏，建議重跑 /add-pi
│   │   │   │   └─ 沒有
│   │   │   │       ├─ data-flow 有 ❌ → ⚠️「建議執行 /add-pi」
│   │   │   │       └─ data-flow 沒有 ❌ → ✅ 無需處理
│   │   │   └─ 只報告，不寫入 proposal
│   │   └─ （交叉檢核結束）
│   │
│   ├─ 2. 【讀取提案文件】
│   │   └─ 讀取完整提案內容
│   │
│   ├─ 3. 【自動驗證階段】
│   │   ├─ 3.1 欄位使用驗證（Grep 前端專案）
│   │   ├─ 3.2 相關程式碼分析（同 pattern 檢查）
│   │   ├─ 3.3 技術語法驗證（WebSearch 官方文件）
│   │   └─ 3.4 格式自動補充（messageEN、欄位影響矩陣）
│   │
│   ├─ 4. 【更新提案文件】
│   │   ├─ 「待確認問題」→「已確認問題」
│   │   ├─ 補充驗證結果表格
│   │   ├─ 補充缺少的 messageEN
│   │   └─ 補充缺少的欄位影響矩陣
│   │
│   ├─ 5-14. 【檢核流程】
│   │   ├─ 5. 欄位影響矩陣
│   │   ├─ 6. 讀取現有 DTO
│   │   ├─ 7. 讀取架構規範 + 現有程式碼
│   │   ├─ 8. apiDoc 檢核
│   │   ├─ 9. 判斷 API 複雜度
│   │   ├─ 10. 檢查文件結構（不符則主動調整）
│   │   ├─ 11. 驗證範例程式碼
│   │   ├─ 12. 逐項檢核
│   │   │   ├─ （現有檢核項目...）
│   │   │   ├─ 🆕 歷史文件驗證
│   │   │   │   ├─ 從 proposal 提取關鍵字搜尋 prompts/4_diary/
│   │   │   │   ├─ 找到 → 比對是否符合歷史決策
│   │   │   │   └─ 有矛盾 → 標記「⚠️ 與歷史決策不一致」
│   │   │   └─ 🆕 分頁預設值檢核
│   │   │       ├─ 檢查 findAll/list endpoint 的 DTO pageSize/limit 預設值
│   │   │       ├─ 沒有預設值 → ❌ 需補充 @Transform default 10
│   │   │       ├─ 預設值不是 10 → ❌ 需修改
│   │   │       └─ 預設值是 10 → ✅
│   │   ├─ 13. 前端架構檢查（若有前端修改）
│   │   │   ├─ 13.0 【前端修改必要性檢核】（先於技術檢查）
│   │   │   │   ├─ 逐項檢查每個前端修改建議
│   │   │   │   │   ├─ 後端能否解決？（回預設值 / 格式化 / null guard / 加欄位）
│   │   │   │   │   │   ├─ 能 → ❌ 標記「建議改為後端處理」
│   │   │   │   │   │   └─ 不能 → ✅ 確認為前端修改
│   │   │   │   │   └─ 是否屬於「只有前端能做的事」？
│   │   │   │   │       ├─ UI 互動 / 路由 / 狀態管理 / 顯示格式 → ✅
│   │   │   │   │       └─ 資料處理 / null 防護 / 格式轉換 → ❌ 後端應處理
│   │   │   │   ├─ 有 ❌ → 檢核結果新增「⚠️ 前端修改必要性」section
│   │   │   │   └─ 全 ✅ → 繼續技術檢查
│   │   │   ├─ 13.1 判斷對應的前端專案
│   │   │   ├─ 13.2 確認檔案路徑是否存在
│   │   │   └─ 13.3 確認 API 呼叫慣例
│   │   └─ 14. 回報檢核結果
│   │
│   └─ 15. 【輸出檢核結果】
│       ├─ 標註模式標籤
│       │   ├─ 🔍 已自動驗證 X 項問題
│       │   ├─ 📊 複雜 API 模式
│       │   ├─ 🖥️ 含前端修改檢查
│       │   ├─ 📄 含檔案產出檢核
│       │   ├─ 🔗 含跨模組影響檢核
│       │   ├─ ⚠️ 程式架構需調整
│       │   └─ ⚠️ 前端修改必要性需重新評估
│       ├─ 自動驗證結果摘要
│       ├─ 檢核項目表格（✅/❌）
│       ├─ 問題摘要區塊
│       └─ 結尾提示
│           ├─ 有問題 → 「/reviewDoc again」
│           └─ 全通過 → 「/implement」
```

## 進度表更新規則

所有模式執行完畢後，自動執行 `@.claude/flowcharts/update-progress.md`：
- 一般/again/f/p 模式 → 更新進度表中 `/reviewDoc` 行
- data 模式 → 更新進度表中 `/reviewDoc -data` 行

## 重要限制

⛔ **檢核完成 ≠ 可以開始實作**
- /reviewDoc 的職責是「驗證、修正、檢核」
- 即使所有檢核項目都通過，AI 也**不得自動開始實作**
- 只有在用戶執行 `/implement` 後才能開始實作

## Again 模式

- 從對話歷史找到上次檢核的**文件路徑**和**檢核範圍**
- 只針對上次檢核的相同範圍重新檢核
- 同一份提案文件可能包含多個歷史提案

## File 模式（/reviewDoc f）

> 📁 **補充檢核模式**：預期已跑過 `/reviewDoc`

**設計原則**：
- **按需載入**：檔案上傳知識只在此模式才載入，避免浪費 token
- **不重複**：不做 Service 架構、DTO 完整性等一般檢核
- **只專注**：6 項檔案上傳專屬檢核

**檢核項目**：
| # | 項目 | 檢核內容 |
|---|------|----------|
| 1 | CUSTOM_PATH_PREFIX | pathPrefix 定義與命名慣例 |
| 2 | DOCUMENT_TYPE_MAPPING | documentType 對應正確性 |
| 3 | Module 設定 | CommonModule、S3Module、FileService 注入 |
| 4 | Service 方法 | handleFileUpload 呼叫與參數 |
| 5 | DTO 欄位 | files 欄位與 Swagger 裝飾器 |
| 6 | Entity 關聯 | File[] 關聯與 documentType |

## Permission 模式（/reviewDoc p）

> 🔐 **補充檢核模式**：預期已跑過 `/reviewDoc`

**設計原則**：
- **按需載入**：權限知識只在此模式才載入，避免浪費 token
- **不重複**：不做 Service 架構、DTO 完整性等一般檢核
- **只專注**：6 項權限專屬檢核

**檢核項目**：
| # | 項目 | 檢核內容 |
|---|------|----------|
| 1 | apiPermissions.constant.ts | 權限項目定義、命名格式、label |
| 2 | permissions.constant.ts | 路由權限對應、Method + Path |
| 3 | rolePermissionMapping.constant.ts | 角色集合、權限分配 |
| 4 | Controller Guards | @UseGuards 裝飾器、順序 |
| 5 | Module 依賴 | Entity、RedisModule、PermissionGuard |
| 6 | 輔助性 API 豁免 | simple-list 等不設權限 |

## Component 模式（/reviewDoc c）🆕

> 🖥️ **補充檢核模式**：預期已跑過 `/reviewDoc`，檢核 UI 欄位與 API response 對應

**設計原則**：
- **按需載入**：前端索引表只在此模式才讀取
- **不重複**：不做 Service 架構、DTO 完整性等一般檢核
- **只專注**：UI 欄位 ↔ API response 欄位對應 + API 設計品質
- **產出寫入 proposal**：供 `-s` 讀取

**檢核項目**：
| # | 項目 | 檢核內容 |
|---|------|----------|
| 1 | UI 欄位完整性 | 前端元件有出的欄位，API response 都有對應 |
| 2 | DTO 欄位回傳保障 | DTO 定義的欄位都能正常回傳（關聯 null、計算欄位等） |
| 3 | FK 4XX 處理 | 每個 FK 欄位都有「撈不到 → 回 4XX」的錯誤處理 |
| 4 | DB 寫入錯誤防護 | 列出所有 DB 寫入操作，逐一檢查每種 DB 錯誤情境是否有防護 |
| 5 | 500 路徑清單 | 列出所有可能產生 500 的路徑，標記已防護/未防護 |

> **2026-02-07 變更**：移除原第 2 項「Select 完整性」，Service select/relations 檢查責任歸屬 `-df`（資料流鏈路中的 Service 查詢環節）。

## Situation 模式（/reviewDoc s）🆕

> 📊 **補充檢核模式**：預期已跑過 `/reviewDoc` 和 `-c`，分析所有情境並產出驗證 cases

**設計原則**：
- **前置依賴**：從 proposal 讀取 `-c` 產出的 UI ↔ API 欄位對應表
- **按需載入**：前端索引表 + 歷史 proposal/bug spec
- **只專注**：情境流程圖比對 + 驗證 cases 產出
- **產出寫入 proposal**：供 `-df` 和 `/check-result` 讀取

**產出**：
- 前端 UI 情境流程圖（文字版）
- 歷史資料流流程圖（文字版）
- 聯集比對結果
- 驗證 cases（有值/沒值/邊界，含 DB 查詢條件）

## Data Flow 模式（/reviewDoc df）🆕

> 🔄 **補充檢核模式**：預期已跑過 `/reviewDoc`、`-c`、`-s`，驗證完整資料流鏈路

**設計原則**：
- **前置依賴**：從 proposal 讀取 `-c` 欄位對應表 + `-s` 情境和驗證 cases
- **搭配 -s**：用 `-s` 產出的情境逐一驗證，不用從零檢查
- **只專注**：前端 → DTO → Service → DB 的完整資料流鏈路
- **產出寫入 proposal**：供 `/check-result` 讀取

**驗證方向**：
- Request：前端欄位 → DTO 接收 → Service 處理 → DB 寫入
- Response：DB 欄位 → Service 查詢 → Response DTO → 前端顯示

## Data 模式（/reviewDoc data）（v2 - 2026-02-07 修正版）

> 🗄️ **補充檢核模式**：預期已跑過 `/reviewDoc`、`-c`、`-s`、`-df`，連 DB 撈測試資料

> **2026-02-07 教訓**：
> 1. `PGPASSWORD=<DB_PASSWORD> psql ...` 格式被 Hook 擋住，必須用 `export PGPASSWORD=<DB_PASSWORD> && psql ...`
> 2. 不要假設 table 的 join 路徑，先讀 Entity 確認關聯再寫 SQL
> 3. -s 的查詢條件是概念性的，-data 需要自己推導完整 SQL（含 table 名、JOIN、SELECT）

**設計原則**：
- **前置依賴**：從 proposal 讀取 `-s` 驗證 cases + `-df` 資料流鏈路
- **環境參數**：必須指定 dev 或 staging
- **Token**：不處理（/debugP 時已取得）
- **四階段**：確認 Schema → 撈 DB → 驗證 -s/-df → 寫入 proposal
- **產出寫入 proposal**：供 `/check-result` 直接使用

**驗證方向**：
- Step 2.5：確認 DB Schema + 推導完整 SQL（概念性條件 → 可執行 SQL）
- Phase 1：撈 DB 測試資料（使用 Step 2.5 產出的 SQL）
- Phase 2：回頭驗證 -s 情境分析 + -df 資料流鏈路
- Phase 3：寫入 proposal（含修正）
