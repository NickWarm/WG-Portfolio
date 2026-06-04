---
description: Debug ticket（連 db + 分析專案）
argument-hint: <env> <ticket-path> [-f] [-p]
design-doc: prompts/4_diary/debug/proposal/slash/debugP_skill_proposal.md
---

@.claude/flowcharts/debugP_flowchart.md

@/Users/nicholas/Desktop/Projects/.claude/modules/debug-output-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/curl-token.md
@/Users/nicholas/Desktop/Projects/.claude/modules/review-proposal-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/db-connection-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/api-response-index.md
@/Users/nicholas/Desktop/Projects/.claude/modules/ui-api-index.md

## 參數

- 目標環境：$1（dev / staging）
- Bug spec：$2
- `-f`：可選 flag，檔案上傳輔助模式
- `-p`：可選 flag，權限輔助模式

### -f 模式說明

當 debug 涉及檔案上傳相關的 bug 時，加上 `-f` flag：

```bash
/debugP dev /path/to/spec.md -f
```

**-f 模式會額外執行**：
1. 載入檔案上傳架構知識（精簡版，~2,500 tokens）
2. 最後檢核時執行 6 項檔案上傳專屬檢核

### -p 模式說明

當 debug 涉及權限相關的 bug 時，加上 `-p` flag：

```bash
/debugP dev /path/to/spec.md -p
```

**-p 模式會額外執行**：
1. 載入權限架構知識（精簡版，~3,000 tokens）
2. **分析權限配置**（三個權限檔案）
3. **判斷權限問題類型**：
   - A. 沒權限 → 直接產出解法，跳過 DB/API
   - B. 有權限卻被擋 → 繼續走 DB + API 驗證流程
4. 最後檢核時執行 6 項權限專屬檢核

### 組合使用

可同時使用 `-f` 和 `-p`：

```bash
/debugP dev /path/to/spec.md -f -p
```

## 分析範圍

- 前端專案：dashboard-nuxt
- 後端專案：backend-nestjs

## Task 追蹤機制（強制啟用）

> ⚠️ **所有 /debugP 執行都必須使用 Task 追蹤**，確保不會遺漏任何步驟

### Step 0: 建立進度追蹤（強制）

執行開始時，根據情境判斷使用哪種流程，然後用 TaskCreate 建立所有步驟：

**500 錯誤流程（18 步）**：
| Task | Subject | activeForm | blockedBy |
|------|---------|------------|-----------|
| 1 | 讀取 Bug Spec | 讀取 Bug Spec... | - |
| 2 | 帳號智能識別 | 識別測試帳號... | 1 |
| 3 | 檢查已有 Proposal | 檢查已有 Proposal... | 2 |
| 4 | SSH 查 PM2 日誌 | 查詢 PM2 錯誤日誌... | 3 |
| 5 | 分析 Stack Trace | 分析錯誤堆疊... | 4 |
| 6 | 定位程式碼位置 | 讀取相關程式碼... | 5 |
| 7 | 查 API Data Flow 文件 | 查詢 API Data Flow... | 6 |
| 8 | 查前端索引表 | 查詢 UI-API 索引... | 7 |
| 9 | 分析後端 API | 分析後端程式碼... | 8 |
| 10 | 帳號驗證（打遠端 API） | 驗證帳號... | 9 |
| 11 | 查 DB（備用） | 查詢 DB 資料... | 10 |
| 12 | 判斷問題來源 | 判斷前端/後端... | 11 |
| 13 | 產出修改建議 | 撰寫提案文件... | 12 |
| 14 | 歷史文件驗證 | 搜尋歷史文件... | 13 |
| 15 | 檢核提案文件 | 檢核提案文件... | 14 |
| 16 | 結束前檢查 | 確認所有步驟完成... | 15 |
| 17 | Step 9 更新進度表 | 更新進度表中... | 16 |

**一般 Debug 流程（15 步）**：
| Task | Subject | activeForm | blockedBy |
|------|---------|------------|-----------|
| 1 | 讀取 Bug Spec | 讀取 Bug Spec... | - |
| 2 | 帳號智能識別 | 識別測試帳號... | 1 |
| 3 | 檢查已有 Proposal | 檢查已有 Proposal... | 2 |
| 4 | 查 API Data Flow 文件 | 查詢 API Data Flow... | 3 |
| 5 | 查前端索引表 | 查詢 UI-API 索引... | 4 |
| 6 | 分析後端 API | 分析後端程式碼... | 5 |
| 7 | 帳號驗證（打遠端 API） | 驗證帳號... | 6 |
| 8 | 查 DB（備用） | 查詢 DB 資料... | 7 |
| 9 | 判斷問題來源 | 判斷前端/後端... | 8 |
| 10 | 產出修改建議 | 撰寫提案文件... | 9 |
| 11 | 歷史文件驗證 | 搜尋歷史文件... | 10 |
| 12 | 檢核提案文件 | 檢核提案文件... | 11 |
| 13 | 結束前檢查 | 確認所有步驟完成... | 12 |
| 14 | Step 9 更新進度表 | 更新進度表中... | 13 |

### Task 更新規則

- 開始步驟時：`TaskUpdate(status: 'in_progress')`
- 完成步驟時：`TaskUpdate(status: 'completed')`
- 遇到問題時：保持 `in_progress` 並說明問題

### Step 8: 結束前檢查（強制）

> ⚠️ **此步驟為強制執行**，輸出結果前必須確認所有步驟完成

1. 執行 `TaskList` 查看所有 task 狀態
2. 確認所有 task 都是 `completed`
3. 若有未完成的 task → **先補完成再輸出結果**
4. 全部完成 → 輸出結果

### Step 9：更新進度表

@.claude/flowcharts/update-progress.md

執行進度表更新：將 `/debugP` 對應的步驟標記為 ✅。

## 任務

### Step 0.5：-f / -p 模式載入知識（條件執行）

#### -f 模式（檔案上傳輔助）

> 🆕 **僅當參數包含 `-f` flag 時執行**

檢測到 `-f` flag 時，執行以下步驟：
1. 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/file_upload/architecture/file_upload_architecture.md`
2. 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/file_upload/architecture/file_upload_checklist.md`
3. 輸出：「📁 檔案上傳輔助模式啟動」

#### -p 模式（權限輔助）

> 🆕 **僅當參數包含 `-p` flag 時執行**

檢測到 `-p` flag 時，執行以下步驟：
1. 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/role_and_permission/design/2_permission_adjustment_rules.md`
2. 讀取 `/Users/nicholas/Desktop/Projects/.claude/modules/permission-helper.md`
3. 輸出：「🔐 權限輔助模式啟動」

**-p 模式分析時應識別**：
- 需要修改的權限檔案（apiPermissions、permissions、rolePermissionMapping）
- 路由與權限對應關係
- Guard 配置需求
- 是否為輔助性 API（可豁免權限）

---

1. 讀取 bug spec，理解問題

### Step 1.5：問題盤點（多問題 Bug Spec 必執行）🆕

> ⚠️ **當 bug spec 包含多個問題時，必須執行此步驟**

**識別條件**（滿足任一即觸發）：
1. 檔案中有 2 個以上的 `# [xxx]` 一級標題（排除 `## 留言`）
2. 檔案中有 2 個以上的 `---` 分隔線（排除留言區塊前的分隔線）
3. 🆕 **留言區塊中有多問題描述**（2026-02-01 新增）：
   - 數字列表：「1. xxx 2. xxx」或「有兩個/三個地方」
   - 連接詞：「另外」「還有」「以及」「除此之外」
   - 明確陳述：「這邊有 N 個問題」

> ⚠️ **設計理由**：單票 bug spec 的留言中，同事可能會補充額外發現的問題。若只看標題會遺漏這些補充問題。

1. **檢測多問題結構**：
   - 檢查是否滿足上述任一識別條件
   - 若滿足 → 執行問題盤點；若不滿足 → 跳過此步驟

2. **逐一盤點問題**：
   - 提取每張票的標題
   - 識別每張票的核心問題
   - 🆕 **分析錯誤訊息含義**（2026-02-01 新增）：
     - 識別 bug spec 中的實際錯誤訊息
     - 區分「表象問題」（訊息是英文 → 需中文化）vs「根因問題」（為什麼會觸發這個錯誤）
     - 若根因問題與表象問題不同 → 視為獨立問題
   - 判斷問題是否相同或相關
   - **判斷是否需要 DB 驗證**（見下方規則）

3. **輸出問題清單表格**：
   ```
   | # | 票標題 | 核心問題 | 需要 DB | 是否相同根因 |
   |---|--------|---------|---------|-------------|
   | 1 | ... | ... | ❌/✅ | - |
   | 2 | ... | ... | ❌/✅ | ✅/❌ |
   ```

**DB 需求判斷規則**：
| 問題類型 | 需要 DB | 原因 |
|---------|---------|------|
| 錯誤訊息中文化 | ❌ | 純程式碼修改，看 service 即可 |
| 🆕 錯誤訊息內容暗示資料問題 | ✅ | 訊息內容暗示資料/邏輯問題，需查 DB 驗證為何觸發此錯誤 |
| 資料顯示錯誤 | ✅ | 需查 DB 驗證資料狀態 |
| 儲存失敗 | ✅ | 需查 DB 驗證 ID 是否存在 |
| 權限問題 | ✅ | 需查 DB 驗證用戶權限 |
| UI 顯示異常（資料相關） | ✅ | 可能是欄位沒傳、格式錯誤，需查 DB |
| API 回傳格式錯誤 | ❌/✅ | 視情況，可能需查 DB 對比預期值 |

> ⚠️ **重要區分**（2026-02-01 新增）：
> - **錯誤訊息中文化**：只看訊息是中文還是英文
> - **錯誤訊息內容暗示資料問題**：分析訊息的「內容」是否暗示資料/邏輯問題
>
> **範例**：錯誤訊息 `Buyer customer must have at least one agent (adminStoreRelations)`
> - 表象問題：訊息是英文 → 需要中文化 → ❌ 不需 DB
> - 根因問題：為什麼 adminStoreRelations 驗證會失敗？ → ✅ 需要 DB

---

### Step 1.8：檢查已有 Proposal（2026-02-02 新增）🆕

> **設計理由**：避免重複分析已知問題，參考已有的分析結果

1. **搜尋已有 Proposal**：
   ```bash
   ls $(dirname bug_spec_path)/*_proposal.md
   ```

2. **有找到時**：
   - 讀取 proposal 內容
   - 了解之前的分析結果
   - 了解之前的修改方案
   - 了解驗證結果（成功/失敗）

3. **後續分析時**：
   - 參考 proposal 內容
   - 避免重複分析已知的問題
   - 若有新問題，基於已有分析擴充

---

2. **【場景判斷】**（AI 智能判斷，不需詢問用戶）
   - 對話上下文有 `/implement` → 建議改用 `/check-result` 驗證（本地 server + 遠端 DB）
   - 單獨執行 `/debugP` 查問題 → 直接打遠端 API，不需要切 DB、不需要啟動本地 server
     - Dev API：`https://api-dev.<COMPANY_DOMAIN>`
     - Staging API：`https://api-staging.<COMPANY_DOMAIN>`
3. **【條件】如果 bug spec 位於 `frontPage_api/debug/`：**
   - 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/frontPage_api/develop/` 底下的歷史開發紀錄
   - 理解 frontPage API 的架構設計與過去經驗
   - 後續產出的提案文件必須符合 frontPage API 架構
4. **【強制條件 - 500 優先處理】** 如果標題或內容包含 "500"：
   - ⚠️ **此步驟必須在步驟 5-8 之前完成，不可跳過**
   - 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/dev_server_debug_prompt.md`
   - SSH 連進指定環境，執行 PM2 錯誤日誌查詢：
     1. **先看最近錯誤**：`pm2 logs 0 --lines 50 --err`（不要先 grep 特定關鍵字）
     2. **找 stack trace**：找到 Error 和 at xxx.ts:行數
     3. **定位程式碼**：根據 stack trace 讀對應的程式碼
     4. **再驗證 DB**：用程式碼邏輯去驗證 DB 狀態
   - 將 PM2 日誌分析結果作為後續步驟的指引

   > 💡 **500 Debug 流程口訣**：PM2 日誌 → Stack Trace → 程式碼 → DB 驗證
### Step 4.5：查 API Data Flow 文件（條件）🆕

> **設計理由**：利用已建立的 data-flow 文件作為分析基礎，避免每次從零搜尋 Entity/DTO/Service

1. **判斷是否為 API 相關 bug**：
   - 依據：bug spec 內容中的 API 路徑、endpoint、controller 名稱、前端打的 API 等
   - 非 API 相關（migration、config、共用 util 等）→ 跳過此步驟

2. **提取 apiName 並搜尋 data-flow 文件**：
   - 搜尋 `prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md`
   - 搜尋 `prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md`

3. **結果處理**：
   - **找到** → 讀取文件，作為後續分析的基礎知識（Entity 結構、DTO 欄位、Service select/relations、Controller 路由）
   - **沒找到** → ⚠️ **中斷**，提示用戶先執行 `/api-flow-architecture {apiName}`

---

### Step 5-7：分析與驗證（分流執行）🆕

> ⚠️ **多票 bug spec 時，根據各問題的 DB 需求分流執行**

**5. 先處理：不需要 DB 的問題**
   - 查看前端送了什麼請求
   - 查看後端 API、程式碼邏輯、entity 定義
   - 產出解法（純程式碼修改）

**6. 條件執行：DB 連線（只連一次）**
   - 檢查：問題清單中是否有任一問題需要 DB
   - 有需要 → 執行以下步驟；無需要 → 跳過步驟 6-7
   - **先檢查連線狀態**：執行 `./scripts/db-tunnel.sh status`
   - 已連線目標環境 → 跳過切換，直接用 psql 查詢
   - 未連線或連錯環境 → 執行 `./scripts/db-tunnel.sh $1` 切換
   - 使用 psql 連線查詢（參考 db-connection-rules.md）
   - ⛔ **禁止使用 MCP `db_repl`**（那是 production 正式環境，不是 $1）

**7. 後處理：需要 DB 的問題**
   - 查詢相關資料表
   - 驗證資料狀態
   - 分析錯誤觸發原因
   - 產出解法（含 DB 驗證結果）

### Step 8：帳號驗證（🆕 2026-02-02 修正策略）

> **核心原則**：有指定驗指定，沒指定驗全部 role

**8.0 判斷驗證範圍**：
| 情況 | 驗證範圍 | 範例 |
|------|----------|------|
| bug spec 有指定帳號 | 只驗證指定的帳號 | 「店長進入物調表跳錯誤」→ 只驗證店長 |
| bug spec 沒指定 | 全部 role 驗一輪 | 「所有非總部帳號都有問題」→ 驗全部 |

**8.1 查前端索引表**：
   - **【優先】查詢 UI-API 索引**（參考 ui-api-index.md module）：
     - Dashboard 相關 → 查 `ui-api-index-dashboard.md`
     - Frontend 相關 → 查 `ui-api-index-frontend.md`
     - 根據「頁面/Tab/Dialog」查表取得 API
   - **【備用】** 若索引無對應項目，手動搜尋前端專案
   - 記錄要打的 API 序列

**8.2 打遠端 API 驗證**（優先）：
   - ⚠️ **【強制規則】所有 API 呼叫統一使用 test-dashboard-api.sh**
     - ❌ 禁止裸 curl + TOKEN=$(...) 複合命令（會觸發權限提示）
   - **取得 Token**：`./.claude/scripts/get-token.sh $1 {account/password}`
   - 用腳本打遠端 API：`./.claude/scripts/test-dashboard-api.sh $1 "/path" ".jq"`
   - 分析回傳結果，驗證現況（錯誤訊息、行為）

**8.3 查 DB**（備用，需要時才做）：
   - 需要理解資料狀態時才執行
   - 方式 1：SSH 進機器查
   - 方式 2：本地 db-tunnel.sh 連遠端 DB

**8.4 檔案可存取性驗證**（條件觸發：API 回傳含 fileUrl/files 欄位）：
   1. 下載檔案：`curl -sS -o /tmp/verify_file "{fileUrl}"`
   2. 檢查格式：`file /tmp/verify_file`（確認實際格式符合預期）
   3. 檢查大小：`ls -la /tmp/verify_file`（確認 > 0 bytes）
   4. 清理暫存：`rm /tmp/verify_file`
   5. 輸出驗證結果表格（檔案、下載、格式、大小、結果）

**API 呼叫方式**：
   - GET：`./.claude/scripts/test-dashboard-api.sh $1 "/path" ".jq"`
   - POST：`./.claude/scripts/test-dashboard-api.sh $1 "/path" -X POST -d '{json}' ".jq"`
   - PATCH：`./.claude/scripts/test-dashboard-api.sh $1 "/path" -X PATCH -d '{json}' ".jq"`
   - DELETE：`./.claude/scripts/test-dashboard-api.sh $1 "/path" -X DELETE`
   - ❌ 禁止裸 curl + TOKEN=$(...) 複合命令（會觸發權限提示）
9. **判斷問題來源**（前端/後端/兩者）
   - 根據前面分析，明確判斷問題出在哪裡
   - 在 proposal 中標示問題來源表格

10. **產出修改建議文件**（遵循輸出規則）
    - 先執行 Proposal 檔案偵測（debug-output-rules.md）
    - **新建模式**：依照「分段寫入規則」分 6 段寫入（Write + Edit 追加）
    - **更新模式**：用 Edit tool 局部修改既有檔案
    - **分頁預設值檢查**（條件執行）：
      - 涉及 findAll/list endpoint？
        - 否 → 跳過
        - 是 → 檢查 DTO pageSize/limit 預設值
          - 不是 10 → 在 proposal 加入修改建議（@Transform default 10）
          - 是 10 → 不提

### 多問題 Proposal 格式（多票 bug spec 時必須遵循）🆕

```markdown
# [主題] 提案

## 問題清單

| # | 票標題 | 核心問題 | 需要 DB | 解法章節 |
|---|--------|---------|---------|---------|
| 1 | ... | ... | ❌ | § 解法 1 |
| 2 | ... | ... | ✅ | § 解法 2 |

> 💡 **根因關聯**：[說明問題之間的關係]

---

## 解法 1：[問題 1 標題]

### 問題來源
| 來源 | 需要修改 | 說明 |
|------|----------|------|
| 前端 | ❌/✅ | ... |
| 後端 | ❌/✅ | ... |

### 修改內容
[具體修改內容]

---

## 解法 2：[問題 2 標題]

### 問題來源
...

### DB 驗證結果（如需要 DB）
...

### 修改內容
...
```

**API Data Flow 參照區塊**（條件：Step 4.5 有讀取 data-flow 文件時）🆕：
   - 放在 proposal 文件**最前面**（標題之後、問題描述之前）
   - 包含：文件路徑、scan-meta（commit + date）、涵蓋範圍
   - 包含：關鍵結構摘要（Entity、DTO、Service、Controller 與 bug 相關的重點）
   - 非 API 相關 bug（Step 4.5 跳過的情況）不需要此區塊
   - 格式範例：
     ```markdown
     ## API Data Flow 參照

     | 項目 | 內容 |
     |------|------|
     | 文件路徑 | `prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md` |
     | scan-meta | commit=`{hash}`, date=`{YYYY-MM-DD}` |
     | 涵蓋範圍 | Entity / DTO / Service / Controller |

     ### 關鍵結構摘要
     - **Entity**: {主要欄位、關聯}
     - **DTO**: {與 bug 相關的欄位}
     - **Service**: {select/relations 重點}
     - **Controller**: {相關路由}

     > ⚠️ 以上結構基於 data-flow 文件記錄的版本，若程式碼已有後續修改，以實際程式碼為準。
     ```

**一般 Proposal 內容要求**：
   - 搭配前後端程式碼與 db 資料
   - ⚠️ **如需前端修改，必須包含前端修改建議**：
     - 指明前端專案（dashboard-nuxt / frontend-nuxt）
     - 指明檔案路徑
     - 提供現有程式碼與建議修改的對比
     - 說明修改原因
11. **【歷史文件驗證】**從提案中提取關鍵字，搜尋 prompts 專案的相關歷史文件：
    - 執行 `rg -l "{關鍵字}" /Users/nicholas/Desktop/Projects/prompts/4_diary/`
    - 關鍵字來源：Entity 名稱、API 名稱、業務邏輯名詞
    - 若找到相關歷史文件：讀取內容、比對提案是否符合歷史決策
    - 在提案中新增「## 歷史文件參照」區塊（若有找到相關文件）
    - 若發現與歷史決策矛盾：調整提案或標註需討論
12. 依照檢核規則檢查提案文件
13. **【-f 模式專屬檢核】**（僅當參數包含 `-f` flag 時執行）
    - 在一般檢核完成後，額外執行 6 項檔案上傳專屬檢核：
      | # | 項目 | 檢核內容 |
      |---|------|----------|
      | 1 | CUSTOM_PATH_PREFIX | pathPrefix 定義與命名慣例 |
      | 2 | DOCUMENT_TYPE_MAPPING | documentType 對應正確性 |
      | 3 | Module 設定 | CommonModule、S3Module、FileService 注入 |
      | 4 | Service 方法 | handleFileUpload 呼叫與參數 |
      | 5 | DTO 欄位 | files 欄位與 Swagger 裝飾器 |
      | 6 | Entity 關聯 | File[] 關聯與 documentType |
    - 輸出格式：在檢核結果後新增「📁 檔案上傳專屬檢核」表格

14. **【-p 模式專屬檢核】**（僅當參數包含 `-p` flag 時執行）
    - 在一般檢核完成後，額外執行 6 項權限專屬檢核：
      | # | 項目 | 檢核內容 |
      |---|------|----------|
      | 1 | apiPermissions.constant.ts | 權限項目定義、命名格式 `MODULE_ACTION`、label |
      | 2 | permissions.constant.ts | 路由權限對應、HTTP Method + Path 正確性 |
      | 3 | rolePermissionMapping.constant.ts | 角色集合分配、各角色權限是否合理 |
      | 4 | Controller Guards | `@UseGuards(JwtGuard, RoleGuard, PermissionGuard)` 順序 |
      | 5 | Module 依賴 | Permission Entity、RedisModule、PermissionGuard Provider |
      | 6 | 輔助性 API 豁免 | simple-list、enum 等輔助性 API 不應設權限 |
    - 輸出格式：在檢核結果後新增「🔐 權限專屬檢核」表格
