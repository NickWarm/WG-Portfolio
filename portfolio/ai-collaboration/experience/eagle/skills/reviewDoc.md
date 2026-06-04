---
description: 檢核提案文件（v3 自動驗證版）
argument-hint: [again|f|p|data]
design-doc: prompts/4_diary/debug/proposal/slash/review_skill_proposal.md
---

@.claude/flowcharts/reviewDoc_flowchart.md

@/Users/nicholas/Desktop/Projects/.claude/modules/review-proposal-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/adminApi-architecture.md

## 參數

- `$1`：可選
  - `again` - 重新檢核上次的文件
  - `f` - 檔案上傳補充檢核模式（只檢核檔案上傳相關項目）
  - `p` - 權限補充檢核模式（只檢核權限相關項目）
  - `data` - DB Data 測試資料準備模式（從 data-flow 文件推導 cases + 撈 DB 驗證）

## 任務

### 一般模式（無參數）

1. 從對話上下文判斷要檢核的提案文件
1.5 **【前置檢查：API Data Flow 參照】** 🆕
   - 檢查 proposal 是否有「## API Data Flow 參照」區塊
   - **有** → 提取文件路徑，讀取對應 data-flow 文件，作為後續檢核基礎知識
     - 後續步驟可比對 proposal 的欄位分析是否與 data-flow 一致
   - **沒有 + API 相關 bug** → ⚠️ 在檢核結果中警告「缺少 API Data Flow 參照」
   - **沒有 + 非 API bug** → 正常，跳過
1.7A **【程式碼品質檢核】**（永遠執行，僅 adminApi）
   - 從 proposal 識別涉及的 service 檔案，讀取 service 原始碼
   - **檢核項目**：
     - **500 防護缺失**：任何 endpoint 有潛在 500 風險的 DB 操作卻沒用 `executeWithDbErrorHandling`（`src/common/helpers/dbErrorHandling.helper.ts`）→ 建議加上 wrapper，回傳有意義的錯誤訊息而非不明 500
     - **回傳型別不一致**：service 未用 `DashboardServiceResponse<T>`（`src/common/types/dashboard-service-response.ts`）→ 建議統一
     - **檔案產出一致性**（不依賴 proposal 是否提到，主動掃描 module 目錄）：
       > ℹ️ Grep = Claude Code tool（底層為 rg）、Glob = Claude Code tool（底層為 fast-glob）
       - 掃描 module 目錄偵測檔案產出邏輯：
         - Grep service 中: `puppeteer|generatePdf` → PDF 產出
         - Grep service 中: `docx-templates|docx-merger` → Word 產出
         - Grep service 中: `exceljs|xlsx` → Excel 產出（未來擴充）
         - Glob: `templates/**` → template 檔案（.html/.hbs/.docx）
       - 沒有檔案產出 → 跳過
       - 有檔案產出 → 執行一致性檢核：
         - 讀取檔案產出 service 原始碼 + template 檔案（若有）
         - 識別資料來源（從哪個 Web Service method 取資料）
         - 比對：Web API response 欄位 vs 檔案產出使用的欄位（PDF: Handlebars 變數 vs prepareTemplateData；Word: docx template 變數 vs 扁平化轉換函數）
         - 比對：proposal 修改是否影響檔案產出（欄位新增/刪除/改名）
           - 有影響但 proposal 未涵蓋 → ❌ 標記遺漏
           - 有影響且 proposal 已涵蓋 → ✅
         - 有 CR → proposal 新增「## 檔案產出一致性檢核發現」section
         - 無 CR → 跳過
   - **有發現**：在 proposal 新增「## 程式碼品質檢核發現」section，每個 CR 含問題描述、建議修改、涉及檔案
   - **無發現**：不修改 proposal
   - ℹ️ `executeWithDbErrorHandling` 處理 PostgreSQL 錯誤碼：23503 (FK)、23502 (NOT NULL)、23505 (UNIQUE)
   - ℹ️ publicApi 使用 throw 風格，不適用 `executeWithDbErrorHandling`
1.7E **【檔案上傳自動偵測】**（永遠執行，僅 adminApi）
   - 掃描 module 目錄，偵測是否有檔案上傳邏輯
     - Grep service 中: `FileService|S3Service|handleFileUpload|CUSTOM_PATH_PREFIX`
   - 沒有檔案上傳 → 跳過
   - 有檔案上傳 → 自動執行 -f 的 6 項專屬檢核
     - 載入知識：file_upload_architecture.md + file_upload_checklist.md
     - 執行 6 項檢核：
       - CUSTOM_PATH_PREFIX
       - DOCUMENT_TYPE_MAPPING
       - Module 設定
       - Service 方法
       - DTO 欄位
       - Entity 關聯
     - 有 CR → proposal 新增「## 檔案上傳自動檢核發現」section
     - 無 CR → 跳過
1.7D **【DTO @Type 轉換檢核】**（永遠執行，僅 adminApi）
   - Glob: `src/api/adminApi/{apiName}/**/*.dto.ts` 取得所有 DTO 檔案
   - 掃描每個 DTO 檔案：
     - Grep `@IsNumber()` 找出所有位置（含行數）
     - 每個 `@IsNumber()` 往下一行確認欄位名是否為 `id`：
       - 匹配 `/^\s+id[?]?\s*:\s*number/` → 是 id 欄位
       - 不匹配 → 跳過
     - 是 id 欄位 → 往上讀 3-5 行確認 decorator 區塊：
       - 有 `@Type(() => Number)` → ✅ 跳過
       - 有 `@Transform(` 且含 `Number(` → ✅ 替代方案，跳過
       - 都沒有 → 判斷 DTO 類別用途：
         - 往上找最近的 `class XXX {` → 取得類別名
         - `Update*` / `Create*` → ❌ 需補充 `@Type(() => Number)`
         - `*QueryDto` / `*FilterDto` → ⏭️ 跳過（Query Params 不需要）
         - `*ResponseDto` / `*ResultDto` → ⏭️ 跳過（Response 不需要）
   - 有 ❌ → proposal 新增「## DTO @Type 轉換檢核發現」section
     - 每個 CR 含：DTO 類別名、欄位名、行數、建議修改
     - 確認 `Type` 是否已從 `class-transformer` import，若無需補充 import
   - 無 ❌ → 跳過
1.7C **【跨模組 Enum/Type/Transform 影響檢核】**（proposal 修改了 Entity Enum/共用 type/DTO Transform 語意時才執行）
   - **觸發條件**：proposal 修改檔案清單中有以下情況：
     - Entity 檔案（*.entity.ts）中的 Enum 定義變更
     - 共用 Enum 定義檔（如 enums/*.ts、constants/*.ts）的值變更
     - 共用 type/interface 的結構變更
     - DTO 檔案（*.dto.ts）中的 Transform 行為語意變更（null/undefined 回傳行為改變、條件邏輯改變；不含純格式重構）
   - 沒有 → 跳過 1.7C
   - 有 → 執行以下步驟：
     1. **提取被修改的 Enum/Type/Transform 欄位名稱**：從 proposal 修改內容提取
     2. **Grep 搜尋所有引用檔案**：
        - 搜尋範圍：`src/api/` 目錄
        - 重點檔案類型：*.dto.ts > *.service.ts > *.controller.ts
        - 排除：已在 proposal 修改清單中的檔案
     3. **分析每個引用檔案的使用方式**：
        - DTO 中 @IsEnum() + @Transform() 驗證 → 同樣 Transform pattern 但沒有新寫法 → ❌ 需修改
        - DTO 中僅作為 type 引用（response DTO 型別標註）→ ⚠️ 視情況
        - Service 中比對特定 Enum 值（如 `if value === -1`）→ ❌ 需修改
        - Service 中對 Transform 影響欄位的 null/undefined 判斷邏輯：
          - `!== undefined` / `=== undefined` guard → ❌ 需確認語意是否連動
          - `!== null` / `=== null` guard → ❌ 需確認語意是否連動
          - `?? defaultValue` 空值合併 → ⚠️ 檢查 null vs undefined 行為差異
          - 條件展開 `...(field !== undefined && { key: field })` → ❌ 需確認
        - 其他引用（import 但未直接使用修改的值）→ ✅ 不需修改
     4. **產出影響清單**：
        - 有需修改的檔案 → proposal 新增「## 跨模組影響檢核發現」section
        - 每個 CR 含：檔案路徑、Enum/Type 名稱、使用方式、建議修改
        - 無需修改 → 跳過
   - **Service 層檢核搜尋策略**（Transform 語意變更時）：
     1. 從 Transform 變更中提取影響的欄位名稱
     2. 在 Service 檔案中 Grep 這些欄位名稱
     3. 分析匹配行的上下文：是否包含 null/undefined 判斷邏輯
     4. 有 → 比對 Transform 語意變更是否影響判斷結果
   - **產出表格格式**：`| # | 檔案 | Enum/Type | 使用方式 | 需修改？ | 說明 |`
1.7B **【Data Flow 交叉檢核】**（前置條件：Step 1.5 有讀取 data-flow 文件時才執行）
   - 用 data-flow 的 Entity/DTO/Service/Controller 結構交叉比對 proposal
   - **檢核項目**：
     - **參數不一致**：data-flow 顯示前端使用的參數 ≠ 後端 DTO 定義 → 建議後端加開 alias 參數相容前端（Input/Output 都要處理），保留原本參數名，不改前端。同 API module 中所有同類問題統一處理。詳見 `/dpf` 定義檔「欄位名不匹配統一修法規則」
   - **有額外發現**：在 proposal 新增「## Data Flow 交叉檢核發現」section，每個 CR 含問題描述、建議修改、涉及檔案
   - **無額外發現**：不修改 proposal
   - **已知問題覆蓋檢核**（/add-pi 產出檢核）：
     - 檢查 proposal 是否有「## 已知潛在問題（Data Flow）」區塊
     - **有** → 比對 data-flow 的 ❌ 問題是否全部涵蓋
       - 全涵蓋 → ✅
       - 有遺漏 → ❌ 列出遺漏的問題，建議重跑 `/add-pi`
     - **沒有 + data-flow 有 ❌ 問題** → ⚠️ 警告「data-flow 有 N 個已知問題未納入，建議執行 /add-pi」
     - **沒有 + data-flow 沒有 ❌ 問題** → ✅ 無需處理
     - ℹ️ 此項只報告，不寫入 proposal（修改是 `/add-pi` 的職責）
2. 讀取提案文件
3. **【自動驗證階段】**（2026-01-30 v3 新增）
   - **3.1 欄位使用驗證**
     - 從提案中提取涉及的欄位名稱（如：agentName、photoUrl）
     - 判斷對應前端專案（adminApi → dashboard-nuxt, publicApi → frontend-nuxt）
     - 使用 Grep 搜尋前端專案確認欄位是否被使用
     - 記錄驗證結果：使用中 / 未使用 / 不確定
   - **3.2 相關程式碼分析**
     - 識別提案涉及的「相關檔案」（如同名 .service.ts、.filter.service.ts）
     - 讀取相關檔案程式碼
     - 分析是否有相同問題（搜尋相同 pattern，如 LEFT JOIN）
     - 記錄分析結果：有相同問題 / 無相同問題 + 原因
   - **3.3 技術語法驗證**
     - 識別提案中使用的第三方庫語法（如：TypeORM distinctOn、NestJS decorator）
     - 按優先順序搜尋驗證：
       1. 優先：WebSearch 官方文件
       2. 備用：搜尋 GitHub Issues/PRs
       3. 第三備用：查閱該庫的 Source Code
     - 記錄驗證結果：語法正確 / 需調整 + 正確語法
   - **3.4 格式自動補充**
     - 檢查 messageEN：缺少則根據 message 自動翻譯補充
     - 檢查欄位影響矩陣：缺少則根據提案內容自動產生
4. **【更新提案文件】**（2026-01-30 v3 新增）
   - ⚠️ **使用 Edit tool 局部修改**，禁止 Write tool 覆蓋整份文件
   - 將「待確認問題」改為「已確認問題」
   - 補充驗證結果表格（| 問題 | 結論 | 依據 |）
   - 補充缺少的 messageEN
   - 補充缺少的欄位影響矩陣
5. **檢查「欄位影響矩陣」是否存在**
   - 若不存在（且步驟 3.4 無法自動產生），標記需要補充
   - 矩陣應包含：欄位名稱、create、update、findOne/findAll、修改類型、說明
6. **讀取該 API 現有的 DTO 檔案**
   - 根據提案涉及的 API 路徑，找到對應的 DTO 檔案
   - 分析現有的欄位結構和命名慣例
   - 確認提案修改是否符合現有 DTO 架構
7. **讀取架構規範 + 現有程式碼**
   - 7.1 讀取 `adminApi-architecture.md` Module，取得主要設計模式
   - 7.2 檢查該 API 是否在「已知例外」清單中
     - 在例外清單（contract、contractBatch、rolePermission）→ 標記使用 throw 模式
     - 不在例外清單 → 使用主要設計模式（return { success: false }）
   - 7.3 讀取該 API 的 Service/Controller 程式碼，確認實際情況
     - 若與架構規範不符 → 以實際程式碼為準
     - 若符合架構規範 → 繼續
8. **apiDoc 檢核**
   - 檢查該 API 是否有 apiDocs 檔案（{api名稱}.apiDocs.ts）
   - 判斷是否需要更新 apiDoc（業務邏輯變更、欄位架構變更、欄位棄用）
   - 若有 apiDoc 修改提案，檢核引用的欄位是否在 entity 存在
9. **判斷 API 複雜度**（參考檢核規則中的複雜度判斷標準）
10. **檢查提案文件結構**（參考檢核規則中的結構規範）
    - 確認順序：已確認問題 → 前端修改 → 後端修改 → 驗證方式
    - 檢查分隔線使用是否正確
    - **若結構不符規範，主動調整**：
      - 直接移動區塊到正確位置
      - 在檢核結果中回報「已調整文件結構」
11. **驗證提案範例程式碼**
    - 比對 Service 錯誤處理模式
      - 提案與該 API 的模式不符 → ❌ 標記不符
      - 模式一致 → ✅
    - 比對 Controller 錯誤處理模式
      - Exception 類型對應正確（404/403/400）→ ✅
      - Exception 類型不對 → ❌ 標記需調整
    - 比對方法簽名（參數順序是否符合慣例）
    - 比對錯誤訊息格式
      - 有 message + messageEN → ✅
      - 缺少 messageEN → ❌（應已在步驟 3.4 自動補充）
12. 依照檢核規則逐項檢查
    - 基本規則：全部 API 都要檢查
    - **欄位一致性檢核**：矩陣完整性、跨 endpoint 一致性、符合現有 DTO 架構
    - **apiDoc 一致性檢核**：前置檢查、需要更新的情況、內容檢核
    - **Service 層查詢完整性檢核**（若提案涉及 response 欄位新增）：
      - 若 Service 使用 TypeORM `select` 明確指定欄位，確認新欄位有包含
      - 若涉及關聯 Entity，確認 `relations` 或 `join` 有正確載入
      - 特別注意：JWT payload 需要的欄位是否在登入查詢的 select 中
    - 複雜 API 額外規則：只有複雜 API 才檢查
    - **前端修改建議規則**：若有前端修改區塊，需檢查前端專案架構
    - **歷史文件驗證**：
      - 從 proposal 提取關鍵字（Entity 名稱、API 名稱、業務邏輯名詞）
      - rg -l "{關鍵字}" prompts/4_diary/
      - 找到 → 讀取內容、比對 proposal 是否符合歷史決策
      - 有矛盾 → 在檢核結果標記「⚠️ 與歷史決策不一致」
      - 無矛盾或沒找到 → 跳過
    - **分頁預設值檢核**：
      - 檢查 proposal 中所有 findAll/list endpoint
      - 讀取現有 DTO 確認 pageSize/limit 預設值（Step 6 已讀取 DTO，直接用）
      - DTO 的 pageSize/limit 預設值是否為 10
        - 沒有預設值 → ❌ 標記需補充 @Transform default 10
        - 預設值不是 10 → ❌ 標記需修改
        - 預設值是 10 → ✅
13. **前端架構檢查**（若提案有前端修改建議）
    - **13.0 前端修改必要性檢核**（先於技術檢查）：
      - 逐項檢查每個前端修改建議：
        - 後端能否解決？（回預設值物件 / 格式化 / null guard / 加欄位到 response）
          - 能 → ❌ 標記「建議改為後端處理」，說明後端替代方案
          - 不能 → ✅ 確認為前端修改
        - 是否屬於「只有前端能做的事」？（UI 互動、路由、狀態管理、顯示格式）
          - 是 → ✅ 確認前端
          - 否（資料處理、null 防護、格式轉換）→ ❌ 後端應處理
      - 有 ❌ → 在檢核結果新增「⚠️ 前端修改必要性」section，列出建議的後端替代方案
      - 全 ✅ → 繼續技術檢查
    - **13.1** 判斷對應的前端專案（adminApi → dashboard-nuxt, publicApi → frontend-nuxt）
    - **13.2** 確認建議修改的檔案路徑是否存在
    - **13.3** 確認 API 呼叫方式是否符合前端專案慣例
14. 對話框回報檢核結果
    - 若有自動驗證，在開頭標註「🔍 已自動驗證 X 項問題」
    - 若為複雜 API，標註「📊 複雜 API 模式」
    - 若有前端檢查，標註「🖥️ 含前端修改檢查」
    - 若缺少欄位影響矩陣，標註「⚠️ 缺少欄位影響矩陣」
    - 若有 apiDoc 相關問題，標註「📄 apiDoc 需要關注」
    - 若有程式架構不符，標註「⚠️ 程式架構需調整」
    - 若有跨模組影響，標註「🔗 含跨模組影響檢核」
    - 若有前端修改必要性問題，標註「⚠️ 前端修改必要性需重新評估」
15. 如有問題，說明需要修正的地方

### Again 模式（$1 = again）
1. 從對話歷史中找到最近一次 `/reviewDoc` 檢核的：
   - 文件路徑
   - **檢核範圍**（哪個段落/提案，因為同一份文件可能有多個提案）
2. 重新讀取該文件（取得最新內容）
3. **執行自動驗證階段**（同一般模式步驟 3-4）
4. **只針對上次檢核的相同範圍**，依照檢核規則逐項檢查
5. 對話框回報檢核結果
6. 如有問題，說明需要修正的地方

> ⚠️ **重要**：同一份提案文件可能包含多個歷史提案，`again` 模式必須從對話上下文理解上次檢核的是「哪個部分」，而不是整篇文件重新檢核。

### File 模式（$1 = f）

> 📁 **補充檢核模式**：預期已跑過 `/reviewDoc`，只檢核檔案上傳相關項目

**執行流程**：

1. **載入檔案上傳知識**（按需載入）：
   - 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/file_upload/architecture/file_upload_architecture.md`
   - 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/file_upload/architecture/file_upload_checklist.md`
2. 從對話上下文判斷要檢核的提案文件
3. 讀取提案文件
4. **執行 6 項檔案上傳專屬檢核**（不重複一般檢核項目）：
   - **4.1 CUSTOM_PATH_PREFIX 檢核**
     - 提案是否有定義 pathPrefix？
     - 是否已加入 constant.ts 的 CUSTOM_PATH_PREFIX？
     - 命名是否符合 `{module}_{type}` 慣例？
   - **4.2 DOCUMENT_TYPE_MAPPING 檢核**
     - 是否需要新的 documentType？
     - 是否已加入 constant.ts 的 DOCUMENT_TYPE_MAPPING？
     - 鍵值是否對應 FileService 方法？
   - **4.3 Module 設定檢核**
     - CommonModule 是否已引入？
     - S3Module 是否已引入？
     - FileService 是否已注入 constructor？
   - **4.4 Service 方法檢核**
     - 是否呼叫 fileService.handleFileUpload()？
     - 參數是否包含 pathPrefix、userId、oldFiles？
     - 是否處理回傳的 fileIds？
   - **4.5 DTO 欄位檢核**
     - Request DTO 是否有 files?: string[]？
     - Response DTO 是否有 files 關聯？
     - Swagger 裝飾器是否正確？
   - **4.6 Entity 關聯檢核**
     - Entity 是否有 files: File[] 關聯？
     - @OneToMany 關聯設定是否正確？
     - documentType 是否對應？
5. 對話框回報檢核結果
   - 標註「📁 檔案上傳補充檢核」
   - 只顯示檔案上傳相關的檢核結果
6. 如有問題，說明需要修正的地方

### Permission 模式（$1 = p）

> 🔐 **補充檢核模式**：預期已跑過 `/reviewDoc`，只檢核權限相關項目

**執行流程**：

1. **載入權限知識**（按需載入）：
   - 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/role_and_permission/design/1_permission_architecture.md`
   - 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/role_and_permission/design/2_permission_adjustment_rules.md`
   - 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/role_and_permission/design/eagle_permission_v1.csv`（角色 × 功能 × 操作 權限矩陣）
2. 從對話上下文判斷要檢核的提案文件
3. 讀取提案文件
4. **執行 6 項權限專屬檢核**（不重複一般檢核項目）：
   - **4.1 apiPermissions.constant.ts 檢核**
     - 提案是否有定義新的權限項目？
     - 權限命名是否符合 `module.operation.action` 格式？
     - 是否有對應的中英文 label？
   - **4.2 permissions.constant.ts 檢核**
     - 路由是否已加入權限對應？
     - HTTP Method + Path 是否正確？
     - dataScope 設定是否正確？
   - **4.3 rolePermissionMapping.constant.ts 檢核**
     - 新權限是否加入適當的角色集合？
     - 是否考慮所有相關角色（admin、store、agent）？
     - 權限集合邏輯是否正確？
   - **4.4 Controller Guards 檢核**
     - @UseGuards(JwtAuthGuard, PermissionGuard) 是否加入？
     - Guards 順序是否正確（JWT 在前）？
     - 是否有遺漏的 endpoint？
   - **4.5 Module 依賴檢核**
     - TypeOrmModule.forFeature 是否包含權限相關 Entity？
       - Permission, Role, RolePermission, Admin
     - RedisModule 是否已引入？
     - PermissionGuard 是否加入 providers？
   - **4.6 輔助性 API 豁免檢核**
     - simple-list、dropdown 等是否正確豁免？
     - 是否誤將輔助性 API 加入權限控制？
     - 豁免設計是否符合 PermissionGuard 自動放行機制？
   - **4.7 CSV 權限矩陣比對**
     - 比對 proposal 定義的權限項目 vs CSV 中的角色權限矩陣
     - 比對 rolePermissionMapping 的角色分配 vs CSV 中各角色的 yes/需確認
     - CSV 中標記「yes」→ proposal 必須有對應角色授權 → 沒有則 ❌
     - CSV 中標記「需確認」→ ⚠️ 標記需與 PM 確認
     - CSV 中沒有該功能 → ⚠️ 標記 CSV 可能需更新
5. 對話框回報檢核結果
   - 標註「🔐 權限專屬檢核」
   - 只顯示權限相關的檢核結果
6. 如有問題，說明需要修正的地方

### Data 模式（$1 = data）

> 🗄️ **補充檢核模式**：從 API Data Flow 文件推導所有欄位的有值/沒值 cases，連 DB 撈測試資料驗證
>
> ⛔ **禁止降級**：用戶指定 `-data` 就必須執行 `-data` 模式的完整流程，禁止自行切換到一般模式。

> **教訓**：
> 1. `PGPASSWORD=<DB_PASSWORD> psql ...` 格式被 Hook 擋住，必須用 `export PGPASSWORD=<DB_PASSWORD> && psql ...`
> 2. 不要假設 table 的 join 路徑，先從 data-flow 文件確認關聯再寫 SQL

**執行流程**：

1. **取得 API Data Flow 文件**
   - 檢查 proposal 是否有「## API Data Flow 參照」區塊
   - **有** → 從區塊取得文件路徑，讀取 data-flow 文件
   - **沒有** → ⚠️ 中斷，提示先執行 `/api-flow-architecture {apiName}`
     - 用戶執行完回來後繼續
     - 自動讀取新建的 data-flow 文件
     - 自動補寫「## API Data Flow 參照」區塊到 proposal
   - 提取：Entity 欄位、relations、nullable、DTO 欄位、Service select
2. **推導驗證 Cases**
   - 從 data-flow 的 Entity 欄位 + relations 推導有值/沒值情境
     - nullable 欄位 → 有值 case + null case
     - FK 關聯 → 關聯存在 case + 關聯不存在 case
     - softDelete 關聯 → 正常 case + 被刪除 case
     - 必填欄位 → 有值 case（不需 null case）
   - 從 proposal 修改內容聚焦相關欄位（不展開所有欄位）
   - **從 proposal「## 檔案產出欄位風險表」推導檔案產出 cases**（沒有風險表則跳過）：
     - 提取 ⚠️ 風險欄位
     - nullable FK → 「FK 存在 + 有值」case + 「FK 不存在 + 空白」case
     - nullable 欄位 → 「有值」case + 「null」case
     - 深層關聯 → 「完整關聯鏈」case + 「中間關聯斷裂」case
     - 特殊 case：「完整資料」— 找一筆所有 ⚠️ 風險欄位都有值的記錄（供 /check-result 驗證檔案內容）
   - 產出 Cases 表（欄位、情境、預期行為），檔案產出 cases 標記「📄」
   - **🆕 從 data-flow DTO query parameters 推導篩選參數交互行為 cases**（不涉及 findAll 則跳過）：
     - 觸發條件：proposal 涉及 findAll/list endpoint + 修改欄位匹配 query parameter
     - 「涉及」定義：直接（修改 DTO 篩選邏輯）或間接（修改欄位處理且該欄位也是 query param）
     - 從 data-flow DTO 列出 query parameters，按「篩選維度」分組（同 Entity/相關 Entity 參數歸同組）
     - 推導篩選 Cases：
       - Q-1: 只帶母參數 → 預期：該分類所有資料
       - Q-2: 帶母參數 + 子參數 → 預期：Q-2 筆數 ≤ Q-1（子集關係）
       - Q-3: 不帶任何篩選 → 預期：全部資料
       - Q-4: 只帶子參數不帶母參數 → 預期：依篩選邏輯定義
     - 產出 Cases 表中標記「🔍 篩選」
3. **連接 DB + 推導 SQL**
   - 讀取 db-connection-rules.md（`/Users/nicholas/Desktop/Projects/.claude/modules/db-connection-rules.md`）
   - 使用 `db-tunnel.sh` 連接目標環境
   - ⚠️ **psql 連線格式**：必須使用 `export PGPASSWORD=<DB_PASSWORD> && psql ...` 格式
   - ❌ 禁止使用 `PGPASSWORD=<DB_PASSWORD> psql ...`（inline 格式會被 Hook 權限擋住）
   - Dev: `export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev`
   - Staging: `export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle`
   - 用 data-flow 的 Entity 關聯推導 JOIN 路徑（不用再讀 Entity 檔案）
   - **🆕 篩選參數資料分佈 SQL**（有篩選 cases 時）：
     - 從 data-flow Service 的 findAll WHERE 條件推導
     - ⚠️ 不自己假設 WHERE 條件，從 data-flow 讀取 Service 查詢邏輯
     - 單參數分佈：`SELECT {param}, COUNT(*) FROM {table} WHERE {基礎條件} GROUP BY {param}`
     - 交叉分佈：`SELECT {paramA}, {paramB}, COUNT(*) ... GROUP BY 1, 2`
4. **撈 DB 測試資料**
   - 逐 case 執行 SQL
   - 記錄每個 case 的 ID + 欄位值
   - 找不到 → 標記「⚠️ 無測試資料」，嘗試替代條件
   - 多筆策略：優先找 1 筆覆蓋最多 case 的記錄
   - **檔案產出 cases**（有風險表時）：
     - 「完整資料」case → JOIN 查詢所有風險欄位都 IS NOT NULL 的記錄
       - 找不到 → 標記「⚠️ 無完整測試資料，部分欄位必定空白」
     - 「空白」case → 找風險欄位為 NULL 的記錄
     - 記錄到 proposal「## DB 測試資料」，標記「📄 檔案產出測試資料」
   - **🆕 篩選參數 cases**（有篩選 cases 時）：
     - 先查資料分佈 → 得到各組合的「預期筆數」
     - 交叉驗證：子集筆數 ≤ 母集筆數？
       - 是 → ✅ 分佈合理
       - 否 → ❌ 篩選邏輯可能有 bug
     - 記錄到 proposal「## DB 測試資料」，標記「🔍 篩選參數測試資料」
5. **寫入 proposal + 輸出結果**
   - 在 proposal 新增「## DB 測試資料」區塊
   - 標註「🗄️ DB Data 測試資料準備」
   - 結尾提示：「確認提案無誤後，請執行 /implement」

## 檢核輸出格式

### 有自動驗證 + 有問題時的輸出格式（2026-01-30 v3 新增）

```
📋 提案文件檢核結果

🔍 已自動驗證 3 項問題

### 自動驗證結果
| 問題 | 結論 | 依據 |
|------|------|------|
| agentName 欄位是否必要？ | ✅ 需要保留 | 前端 `add.vue:547` 有使用 `prop="agentName"` |
| edm.filter.service.ts 是否有相同問題？ | ❌ 沒有 | 使用分階段查詢，Map 不會重複 |
| TypeORM distinctOn 語法 | ✅ 正確 | TypeORM PR #4954 確認語法 |

---

### 檢核項目
| 項目 | 狀態 |
|------|------|
| Service 層架構 | ✅ |
| Service 層查詢完整性 | ✅ |
| DTO 資訊完整性 | ❌ |
| 欄位一致性 | ✅ |

---

### ❌ 發現的問題（1 項）

1. **DTO 資訊完整性**
   - 問題：description 缺少 xxx 說明
   - 建議：補充 xxx 描述

---
⏸️ 檢核完成。如需修正，請修改提案文件後執行 `/reviewDoc again`。
⚠️ 確認提案無誤後，請執行 `/implement` 開始實作。
```

### 全部通過時的輸出格式

```
📋 提案文件檢核結果

🔍 已自動驗證 3 項問題

### 自動驗證結果
| 問題 | 結論 | 依據 |
|------|------|------|
| agentName 欄位是否必要？ | ✅ 需要保留 | 前端有使用 |
| edm.filter.service.ts 是否有同樣問題？ | ❌ 沒有 | 查詢方式不同 |
| TypeORM distinctOn 語法 | ✅ 正確 | 官方文件確認 |

---

### 檢核項目
| 項目 | 狀態 |
|------|------|
| Service 層架構 | ✅ |
| Service 層查詢完整性 | ✅ |
| DTO 資訊完整性 | ✅ |
| 欄位一致性 | ✅ |

---

✅ 所有檢核項目通過

---
⏸️ 檢核完成。確認提案無誤後，請執行 `/implement` 開始實作。
```

### 程式架構不符時的輸出格式

```
📋 提案文件檢核結果

⚠️ 程式架構需調整

### 檢核項目
| 項目 | 狀態 |
|------|------|
| Service 層架構 | ❌ |
| Controller 層架構 | ❌ |
| DTO 資訊完整性 | ✅ |
| 欄位一致性 | ✅ |

---

### ❌ 發現的問題（2 項）

1. **Service 層錯誤回傳格式不符**
   - 問題：提案使用 `throw new ForbiddenException(...)`
   - 現有架構：使用 `return { success: false, message, messageEN }`
   - 建議：改為 return 格式，並包含 `messageEN` 欄位

   ```typescript
   // ❌ 提案寫法
   throw new ForbiddenException('您不是此成交的買方或賣方經紀人')

   // ✅ 符合現有架構
   return {
     success: false,
     message: '您不是此成交的買方或賣方經紀人，無法查看明細',
     messageEN: 'You are not the buyer or seller agent, cannot view details',
   }
   ```

2. **Controller 層 Exception 類型對應需補充**
   - 問題：提案未說明 Controller 如何處理權限錯誤
   - 現有架構：Controller 檢查 `result.messageEN` 關鍵字來決定 Exception 類型
   - 建議：補充 Controller 錯誤處理邏輯，權限錯誤使用 `ForbiddenException` (403)

---
⏸️ 檢核完成。如需修正，請修改提案文件後執行 `/reviewDoc again`。
⚠️ 確認提案無誤後，請執行 `/implement` 開始實作。
```

### File 模式輸出格式（/reviewDoc f）

```
📋 提案文件檢核結果

📁 檔案上傳補充檢核

### 檔案上傳專屬檢核
| 項目 | 狀態 | 備註 |
|------|------|------|
| CUSTOM_PATH_PREFIX | ✅ | `REAL_ESTATE_DOCUMENT` 已定義 |
| DOCUMENT_TYPE_MAPPING | ✅ | 對應 `realEstateDocument` |
| Module 設定 | ✅ | CommonModule 已引入 |
| Service 方法 | ❌ | 缺少 oldFiles 參數 |
| DTO 欄位 | ✅ | files?: string[] 已定義 |
| Entity 關聯 | ✅ | @OneToMany 設定正確 |

---

### ❌ 發現的問題（1 項）

1. **Service 方法參數不完整**
   - 問題：handleFileUpload 缺少 oldFiles 參數
   - 建議：加入 `oldFiles: entity.files` 以支援檔案更新時的舊檔清理

---
⏸️ 檢核完成。如需修正，請修改提案文件後執行 `/reviewDoc f again`。
⚠️ 確認提案無誤後，請執行 `/implement` 開始實作。
```

### 輸出格式重點

⚠️ **重要**：
1. 有自動驗證時，必須在開頭顯示「🔍 已自動驗證 X 項問題」和驗證結果表格
2. 有 ❌ 項目時，必須在表格後用「發現的問題」區塊詳細說明每個問題和建議修正方式
3. 不可只在表格打 ❌ 而不解釋
4. **File 模式**：標註「📁 檔案上傳補充檢核」，只顯示 6 項專屬檢核結果
5. **Data 模式**：標註「🗄️ DB Data 測試資料準備」，顯示推導的 Cases 表 + DB 測試資料 + 🔍 篩選參數資料分佈（若有）

### Data 模式輸出格式（/reviewDoc data）

```
📋 提案文件檢核結果

🗄️ DB Data 測試資料準備（{env} 環境）

### API Data Flow 來源
- **文件**: prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md
- **scan-meta**: commit=`{hash}`, date=`{date}`

### 推導的驗證 Cases

| # | 欄位 | 情境 | 預期行為 | DB 查詢條件 |
|---|------|------|---------|------------|
| 1 | storeId (nullable FK) | 有值 | storeName 有值 | WHERE "storeId" IS NOT NULL LIMIT 1 |
| 2 | storeId (nullable FK) | null | storeName = null | WHERE "storeId" IS NULL LIMIT 1 |
| 3 | store (softDelete) | 被刪除 | storeName = null 或 4XX | WHERE store."deletedAt" IS NOT NULL |
| 4 | contractId (required FK) | 不存在 | 4XX（非 500） | N/A，用假 ID 測試 |

### DB 測試資料

| # | 情境 | 撈到的 ID | 關鍵欄位值 | 狀態 |
|---|------|-----------|-----------|------|
| 1 | storeId 有值 | bid.id = 42 | storeId=5, store.name="信義店" | ✅ |
| 2 | storeId null | bid.id = 87 | storeId=null | ✅ |
| 3 | store 已刪除 | ⚠️ 無測試資料 | - | ⚠️ |
| 4 | contractId 不存在 | - | 用假 ID 測試 | ✅ |

### 🔍 篩選參數資料分佈

**相關參數組**：countyCodes + zipCode + townName（地址篩選組）

| countyCodes | zipCode | townName | DB 筆數 | 備註 |
|-------------|---------|----------|---------|------|
| O | - | - | 1263 | 全新竹市 |
| O | 300 | 東區 | 50 | 東區 + zipCode=300 |

### 🔍 篩選參數測試 Cases

| # | 情境 | 預期關係 | DB 驗證 | 狀態 |
|---|------|---------|---------|------|
| Q-1 | countyCodes=O 不帶 townName | = 1263 | 1263 | ✅ |
| Q-2 | countyCodes=O + townName=東區 | ≤ Q-1 | 50 ≤ 1263 | ✅ |

---

### ⚠️ 缺少測試資料（1 項）

1. **store 已刪除的情境**
   - 查詢條件：`WHERE "storeId" NOT IN (SELECT id FROM store WHERE "deletedAt" IS NULL)`
   - DB 中找不到符合的資料
   - 建議：手動建立測試資料，或在 /check-result 時跳過此 case

---
⏸️ 檢核完成。確認提案無誤後，請執行 `/implement` 開始實作。
```

## 注意事項

1. **進度表更新**：所有模式執行完畢後，自動執行 `@.claude/flowcharts/update-progress.md`。一般/again/f/p 模式更新 `/reviewDoc` 行；data 模式更新 `/reviewDoc -data` 行。
