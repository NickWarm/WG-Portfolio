---
description: 前後端流程對齊檢查（-c/-s/-df 邏輯 + scan-meta 更新）
argument-hint: <apiName>
design-doc: prompts/4_diary/debug/proposal/slash/review-api-flow_skill_proposal.md
---

@.claude/flowcharts/review-api-flow_flowchart.md

## 設計目的

對指定 API 做前後端流程對齊檢查（UI 欄位對應、情境分析、資料流驗證），產出 merge 回 `prompts/6_api_data_flow/` 持久化文件。不需要 proposal / bug spec，傳 API 名稱就能跑。

## 參數

- `$1`：API module 名稱（必填），例如 `transcript`、`estateSalesDetail`、`customer`

## 前置依賴

| 依賴 | 說明 | 缺少時 |
|------|------|--------|
| `api-flow-architecture` 產出 | `6_api_data_flow/{apiName}-data-flow.md` | 報錯：請先執行 `/api-flow-architecture {apiName}` |
| 前端索引表 | `ui-api-index-dashboard.md` 或 `ui-api-index-frontend.md` | 報錯：請先執行 `/build-ui-index` |

## 產出檔案位置

| API 目錄 | 產出路徑 |
|----------|---------|
| adminApi | `prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md`（merge 回現有文件） |
| publicApi | `prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md`（merge 回現有文件） |

## 後端程式碼位置

| 項目 | 路徑 |
|------|------|
| 主 repo（worktree 管理用） | `/Users/nicholas/Desktop/Projects/backend-nestjs` |
| BACKEND_READ_PATH（程式碼讀取用） | `/Users/nicholas/Desktop/Projects/backend-nestjs-dev-read` |
| worktree 分支 | `dev` |

> ⚠️ 所有讀取後端程式碼的操作都使用 BACKEND_READ_PATH，不直接讀取主 repo 的程式碼。
> 主 repo 路徑僅用於：fetch、worktree add/remove、setup-worktree-config.sh 腳本位置。

## 任務

### 0. 建立進度追蹤（強制）

使用 TaskCreate 建立以下步驟：

| Task | Subject | activeForm |
|------|---------|------------|
| 0.5 | 確保 dev worktree 可用 | 確保 dev worktree 可用中... |
| 1 | 解析參數並讀取 Data Flow 文件 | 解析參數中... |
| 2 | 判斷是否需要更新後端結構 + 提取前端 commit | 判斷更新中... |
| 3 | 讀取前端索引表 + 判斷是否需要重跑 -c | 讀取前端索引中... |
| 4 | 執行 -c 檢查：UI ↔ API 欄位對應 | 執行欄位對應檢查中... |
| 5 | 執行 -s 檢查：情境分析 | 執行情境分析中... |
| 6 | 執行 -df 檢查：資料流鏈路驗證 | 執行資料流驗證中... |
| 7 | 彙整問題清單 | 彙整問題清單中... |
| 8 | 輸出結果並更新進度表 | 輸出結果中... |

**Step 3+4 合併執行**：Step 3 讀取前端索引後立即執行 Step 4 的 -c 檢查，一次 merge 完整的「UI ↔ API 欄位對應」區塊，簡化流程。

### 步驟完成標準流程

每個步驟完成後必須執行（Step 1 除外）：

1. **Merge 結果到 data-flow 文件**
   - 更新 scan-meta（commit + date + step）
   - Step 4（-c 區塊）額外寫入 `frontend-commit`

   **大區塊（Step 2/4/5/6/7）使用 replace-section.sh**：
   ```
   a. Write → /tmp/section-{apiName}-{step}.md
      - 內容包含 ## 標題行 + scan-meta + 區塊內容
      - 不包含尾部 --- 分隔線（script 自動處理）
   b. Bash 執行替換：
      /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh {data-flow路徑} "## {區塊標題}" /tmp/section-{apiName}-{step}.md
   c. Read 工具驗證替換結果（讀取區塊起始的 5 行確認 scan-meta 正確）
   d. Bash 清理暫存檔：rm /tmp/section-{apiName}-{step}.md
   ```

   **小區塊繼續用 Edit 工具**：
   - Step 4 命名混淆提醒（2-30 行，Edit 在 Basic Info 區塊追加）
   - Step 8 進度表更新（1 行，Edit 替換狀態行）

   **暫存檔命名規則**（含 apiName 避免多 AI 平行衝突）：
   | Step | 暫存檔路徑 | 對應區塊 |
   |------|-----------|---------|
   | 2 | `/tmp/section-{apiName}-{區塊名}.md` | Entity/DTO/Service/Controller |
   | 4 | `/tmp/section-{apiName}-c.md` | `## UI ↔ API 欄位對應` |
   | 5 | `/tmp/section-{apiName}-s.md` | `## 情境分析` |
   | 6 | `/tmp/section-{apiName}-df.md` | `## 資料流驗證` |
   | 7 | `/tmp/section-{apiName}-issues.md` | `## 問題清單` |

2. **Git Commit**
   ```bash
   cd /Users/nicholas/Desktop/Projects/prompts
   git add 6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md
   git commit -m "review-api-flow: {apiName} Step N - {步驟名稱}"
   ```

3. **TaskUpdate**
   - TaskUpdate Task N → completed

### Git Commit Message 格式

```bash
# Step 2: 更新後端結構（逐區塊 commit）
review-api-flow: {apiName} Step 2 - Entity 結構更新
review-api-flow: {apiName} Step 2 - DTO 定義更新
review-api-flow: {apiName} Step 2 - Service 結構更新
review-api-flow: {apiName} Step 2 - Controller 結構更新

# Step 4: UI 欄位對應
review-api-flow: {apiName} Step 4 - UI ↔ API 欄位對應檢查完成

# Step 5: 情境分析
review-api-flow: {apiName} Step 5 - 情境分析完成（N 個情境，M 個遺漏）

# Step 6: 資料流驗證
review-api-flow: {apiName} Step 6 - 資料流驗證完成（N 個斷裂點）

# Step 7: 問題清單
review-api-flow: {apiName} Step 7 - 問題清單彙整完成（N 個問題）

# Step 8: 更新進度表（如進度表存在）
更新 API Flow 進度：{apiName} - review-api-flow 完成（N 個問題）
```

### 0.5. 確保 dev worktree 可用（讀取後端程式碼用）

**執行時機**：所有執行模式都需要（讀取後端程式碼前必須先確保可用）。

1. Fetch 最新 dev 分支：
   ```bash
   git -C /Users/nicholas/Desktop/Projects/backend-nestjs fetch origin dev
   ```
2. 檢查 worktree 是否存在：
   ```bash
   test -d /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
   ```
   - **存在** → 直接 pull：
     ```bash
     git -C /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read pull origin dev
     ```
   - **不存在** → 建立 + 配置 + pull：
     ```bash
     git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree add \
       /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read dev
     /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/setup-worktree-config.sh \
       /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
     git -C /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read pull origin dev
     ```
3. 記錄 `BACKEND_READ_PATH = /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read`
   - 後續所有讀取後端程式碼的步驟，改用此路徑

---

### 1. 解析參數並讀取 Data Flow 文件

1. 解析 `$1` 為 apiName，無值則報錯退出
2. 用 Glob 搜尋 data-flow 文件：
   - `prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md`
   - `prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md`
3. 找到 → 讀取文件，記錄 API 目錄位置（adminApi 或 publicApi）
4. 找不到 → 報錯退出：`❌ 找不到 {apiName} 的 API Data Flow 文件，請先執行 /api-flow-architecture {apiName}`

### 2. 判斷是否需要更新後端結構 + 提取前端 commit

**2.1 後端變更判斷**

1. 用 Grep 提取 data-flow 文件中的 scan-meta commit hash：`<!-- scan-meta: commit=xxx -->`
2. 取得 dev worktree HEAD commit hash：`git -C {BACKEND_READ_PATH} rev-parse --short HEAD`
3. 比對 scan-meta commit 與 HEAD：

**scan-meta == HEAD（無變更）**：
- 不讀任何後端程式碼
- 記錄：後端無變更

**scan-meta != HEAD（有變更）**：
1. 執行 git diff 偵測變更：
   ```bash
   git -C {BACKEND_READ_PATH} diff --name-only {last-commit}..HEAD -- src/api/**/{apiName}/
   ```
2. 分類變更檔案：
   - `*.entity.ts` → Entity 區塊需更新
   - `*.dto.ts` → DTO 區塊需更新
   - `*.service.ts` → Service 區塊需更新
   - `*.controller.ts` → Controller 區塊需更新
3. **逐區塊處理**（只處理有變的區塊，順序：Entity → DTO → Service → Controller，所有後端程式碼從 BACKEND_READ_PATH 讀取）：
   - Entity 有變 → 讀取 `{BACKEND_READ_PATH}/src/api/**/{apiName}/*.entity.ts` → 更新 Entity 區塊 + scan-meta → Git commit：
     `"review-api-flow: {apiName} Step 2 - Entity 結構更新"`
   - DTO 有變 → 讀取 `{BACKEND_READ_PATH}/src/api/**/{apiName}/dto/*.dto.ts` → 更新 DTO 區塊 + scan-meta → Git commit：
     `"review-api-flow: {apiName} Step 2 - DTO 定義更新"`
   - Service 有變 → 讀取 `{BACKEND_READ_PATH}/src/api/**/{apiName}/*.service.ts` → 更新 Service 區塊 + scan-meta → Git commit：
     `"review-api-flow: {apiName} Step 2 - Service 結構更新"`
   - Controller 有變 → 讀取 `{BACKEND_READ_PATH}/src/api/**/{apiName}/*.controller.ts` → 更新 Controller 區塊 + scan-meta → Git commit：
     `"review-api-flow: {apiName} Step 2 - Controller 結構更新"`
4. 記錄：後端有變更（哪些區塊）

**2.2 提取前端 commit**

1. 讀取前端索引表（根據 API 目錄）：
   - adminApi → `prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md`
   - publicApi → `prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md`
2. 從索引表 header 提取 `掃描版本：{project} commit {hash}` 的 commit hash
3. 記錄：前端索引表 commit（供 Step 3+4 比對使用）

### 3. 讀取前端索引表 + 判斷是否需要重跑 -c

**3.1 判斷前端是否有變更**

1. 提取 data-flow 文件 `-c` 區塊的 `frontend-commit`：
   - 無 `-c` 區塊（首次執行）→ 標記：需要完整執行 -c
   - 有 `-c` 區塊 → 提取 `frontend-commit`
2. 比對 `frontend-commit` vs Step 2 提取的前端索引表 commit：
   - 相同 → 前端沒變
   - 不同 → 用 git diff 確認該 API 的 Vue 檔案是否有變：
     ```bash
     git -C {dashboard-nuxt|frontend-nuxt} diff --name-only {old-frontend-commit}..{new-frontend-commit} -- {vue-file-paths-from-index}
     ```

**3.2 六種組合判斷**

| 前端 Vue 變更 | 後端變更 | 行為 |
|-------------|---------|------|
| 無（commit 相同） | 無 | ⏭️ 完全跳過 -c，直接用現有結果 |
| 無（commit 相同） | 有（DTO/Service 等） | 🔄 用新後端結構 + data-flow 已有的 UI 欄位清單重跑比對（不重讀 Vue） |
| 有（Vue 檔案有變） | 無 | 🔄 重讀 Vue 檔案 + 現有後端結構重跑 -c |
| 有（Vue 檔案有變） | 有 | 🔄 重讀 Vue 檔案 + 新後端結構，完整重跑 -c |
| commit 不同但 Vue 沒變 | 無 | ⏭️ 更新 frontend-commit，跳過 -c 重跑 |
| commit 不同但 Vue 沒變 | 有 | 🔄 用新後端結構 + data-flow 已有的 UI 欄位清單重跑比對（不重讀 Vue） |

**3.3 讀取前端索引表**（如需要讀取 Vue 檔案時）

1. 根據 API 目錄判斷前端專案：
   - adminApi → 讀取 `prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md`
   - publicApi → 讀取 `prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md`
2. 找到 → 提取該 API 對應的所有頁面/Tab/Dialog 操作
3. 記錄前端檔案路徑（如 `views/cases/objects/transcript-info.vue`）
4. 找不到 → 報錯退出：`❌ 找不到前端索引表，請先執行 /build-ui-index`

### 4. 執行 -c 檢查：UI ↔ API 欄位對應

> 根據 Step 3 的組合判斷結果，決定執行範圍。跳過 -c 時直接進入 Step 5。

**重要原則**：
- ❌ **禁止啟動 Task tool 的 general-purpose agent**
- ❌ 禁止使用 Glob/Grep 搜尋前端檔案（路徑已在索引表中）
- ✅ **直接使用 Read 工具**讀取已知路徑的檔案
- ✅ **AI 自己執行分析**，不需要啟動其他 agent

**執行步驟**：

**4.1 讀取前端 Vue 檔案**
1. 使用 Read 工具讀取前端檔案（路徑已在 Step 3 的索引表中）
2. 判斷前端檔名是否與後端 API 名稱一致（命名混淆偵測）
   - 不一致 → 標記命名混淆，記錄：實際 Vue 檔名、顯示名稱、混淆的檔案/API
   - 一致 → 無需處理
3. 分析 template 中的顯示欄位
4. 分析 script 中的 API response 使用方式
5. 記錄所有 UI 欄位清單

**4.2 讀取 data-flow 文件**
1. 使用 Read 工具讀取 data-flow 文件
2. 提取 Response DTO 欄位定義
3. 提取 Service 查詢結構（select/relations）

**4.3 UI 欄位完整性比對**
- 逐一比對 UI 欄位 vs Response DTO 欄位
- 標記狀態：
  - ✅ 有對應 → UI 欄位在 response 中存在
  - ❌ 缺失 → UI 欄位在 response 中不存在
  - ⚠️ 可疑 → 欄位名稱不完全匹配（如 UI 用 storeName，API 回 store.name）
- 產出 UI ↔ API 欄位對應表

**4.4 DTO 欄位回傳保障**
- 檢查 DTO 定義的欄位是否都能正常回傳
- 關聯資料可能為 null → 是否有處理？
- 計算欄位依賴的來源是否可靠？

**4.5 500 防護檢查**
- 從 data-flow 的 Service 區塊取得所有 DB 寫入操作（save/update/softRemove/delete）
- 對每個操作逐一檢查 5 種 500 情境：

| 500 情境類型 | 檢查方式 |
|-------------|----------|
| FK constraint violation | 每個 FK 欄位是否有前置查詢驗證（findOne → 不存在回 4XX） |
| NOT NULL constraint violation | 必填欄位是否有 DTO 驗證（@IsNotEmpty）+ Service 補值 |
| Unique constraint violation | 唯一欄位是否有前置查詢或 catch QueryFailedError |
| 關聯資料 softDelete | LEFT JOIN 關聯是否可能被 soft delete，後續操作是否安全 |
| undefined/null 傳入 DB | Service 是否拿可能為空的值做 DB 查詢或寫入 |

- 產出 500 防護表 + 500 路徑清單

**4.6 命名混淆紀錄**（僅在 4.1 偵測到混淆時執行）
- 在 -c 區塊新增「### 命名對照（前後端混淆提醒）」表格
- 在 Basic Info 區塊新增「⚠️ 命名混淆提醒」blockquote
- 如果存在交叉混淆（如 propertySurvey ↔ caseStudy）：
  - 在對方的 data-flow 文件中也記錄反向的命名混淆提醒
  - 兩個文件互相引用（Markdown 相對路徑連結）
  - 對方的 data-flow 文件不存在 → 只標當前的

### 5. 執行 -s 檢查：情境分析

**5.0 權限層級判斷**
- 讀取 `{BACKEND_READ_PATH}/src/common/constants/permissions.constant.ts`
- 找到該 API 路由的權限設定：
  - 無設定 → PermissionGuard auto-pass，僅需 JWT，不標記權限問題
  - 有設定但無 dataScope → 僅路由層級權限，記為 ℹ️ 設計備註
  - 有設定且有 dataScope → 檢查 Service 是否實作 dataScope 過濾：
    - 有實作 → ✅
    - 未實作 → ⚠️ 需確認設計意圖
      - 可能原因 1：permissions.constant.ts 設定錯誤（應移除 dataScope）
      - 可能原因 2：Service 實作遺漏（應補上過濾邏輯）
      - 建議與團隊確認此 API 的資料範圍設計意圖
- 此步驟的產出用於 5.1~5.4 的情境矩陣，避免權限誤判

**5.1 畫 UI 情境流程圖**
- 從前端索引表取得該功能的所有操作：
  - 頁面載入 → 哪些 API
  - Tab 切換 → 哪些 API
  - 按鈕操作 → 哪些 API
  - Dialog 操作 → 哪些 API
- 畫出文字版流程圖，標記：
  - 必填欄位 → 一定有值
  - 選填欄位 → 可能沒值
  - 條件欄位 → 特定情境才有值

**5.2 畫歷史資料流流程圖（如有 proposal/bug spec）**
- 從對話上下文或 proposal 取得修正前/後資料流
- 畫出文字版流程圖
- 若無歷史文件 → 跳過此步，只用 UI 情境流程圖

**5.3 聯集比對**
- 取兩張流程圖的聯集（若只有 UI 流程圖則以此為準）
- 檢查每個情境的 response 資料是否完整
- 找出遺漏的情境（邊界案例、null 處理）

**5.4 產出驗證 cases**
- 有值 case：DB 查詢條件 + 預期 response 值
- 沒值 case：DB 查詢條件 + 預期 null/預設值
- 邊界 case：FK 不存在時的預期 4XX
- 這些 cases 供 `/check-result` 和 `/reviewDoc -data` 使用

### 6. 執行 -df 檢查：資料流鏈路驗證

**6.1 Request 方向（前端 → DB）**
- 追蹤前端送出的每個欄位：
  - 前端欄位 → DTO 接收（create/update DTO）→ Service 處理 → DB 寫入
- 從 data-flow 文件取得 DTO 欄位定義和 Service 處理邏輯
- 標記斷裂點（DTO 沒接收、Service 沒處理等）

**6.2 Response 方向（DB → 前端）**
- 從 data-flow 文件取得 Service select/relations/JOIN 資訊
- 追蹤每個欄位：
  - DB 欄位 → Service 查詢（select/relations）→ Response DTO → 前端顯示
- 逐一比對：response 需要的欄位是否都在 select/relations 中
- 標記斷裂點（select 漏欄位、沒有 JOIN 關聯等）

**6.3 逐情境驗證**
- 搭配 Step 5 的情境，逐一驗證：
  - 有值情境 → 欄位值是否正確傳遞
  - 沒值情境 → null 是否在每一層正確處理
  - 邊界情境 → 錯誤是否在正確的層被攔截（FK 4XX、DTO 驗證）

### 7. 彙整問題清單

- 讀取 data-flow 文件
- 收集 Step 4/5/6 發現的所有問題
- 按嚴重度排序：
  - ❌ 前後端不對齊的欄位
  - ❌ 資料流斷裂點
  - ❌ 500 未防護路徑
  - ⚠️ null 沒處理
  - ⚠️ 文件過時提醒
- Merge「## 問題清單」到 data-flow 文件
- 更新 scan-meta（commit hash + 日期）

> **注意**：Step 4/5/6 的分析結果已在各步驟完成時即時 merge 到 data-flow 文件，Step 7 只需要彙整問題清單。

### 8. 輸出結果 + 更新進度表

**8.1 產出完整報告**

```
✅ 前後端流程對齊檢查完成

📊 檢查統計：
- API Module: {apiName}
- 後端結構更新：[是/否]（scan-meta 偵測）
- 前端 UI 更新：[是/否/跳過]（frontend-commit 偵測）
- UI 欄位對應：[N] 個欄位，[M] 個問題
- 情境分析：[N] 個情境，[M] 個遺漏
- 資料流驗證：Request [N] 條 / Response [N] 條，[M] 個斷裂點
- 500 防護：[N] 個 DB 操作，[M] 個未防護

📁 已更新檔案：
- prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md

❌ 問題清單（[N] 項）：
1. [嚴重度] [類型] 問題描述
2. ...

📌 scan-meta:
- backend commit: {hash}
- frontend commit: {hash}

[如有更新進度表]
✅ 進度表已更新並 commit
- prompts/6_api_data_flow/api-flow-progress.md
```

**8.2 更新進度表**

1. **使用 Glob 工具檢查進度表是否存在**
   ```
   Glob(pattern="api-flow-progress.md", path="prompts/6_api_data_flow")
   ```

2. **進度表存在** → 更新對應 API 進度：
   - 讀取進度表文件
   - 讀取 data-flow 文件的問題清單
   - 統計問題數量（❌ 嚴重問題、⚠️ 注意事項）
   - 使用 Edit 工具更新進度表中該 API 的狀態：
     ```markdown
     - ✅ /review-api-flow — 完成（N 個問題）
     ```
   - 使用 Read 工具驗證更新是否成功
   - Git commit 進度表變更：
     ```bash
     cd /Users/nicholas/Desktop/Projects/prompts
     git add 6_api_data_flow/api-flow-progress.md
     git commit -m "更新 API Flow 進度：{apiName} - review-api-flow 完成（N 個問題）"
     ```
   - 如 commit 失敗，報告具體錯誤原因（不需要額外的 staging 檢查）

3. **進度表不存在** → 跳過，在輸出結果中提示：「💡 使用 /api-flow-architecture -p 建立進度追蹤表」

**錯誤處理原則**：
- ❌ **禁止**：執行 `git diff --cached` 檢查 staging 狀態
- ✅ **正確**：直接 Edit → Read 驗證 → git add → git commit
- ✅ **失敗處理**：如 commit 失敗，直接報告錯誤原因即可
- 💡 **設計理念**：簡化流程，找到文件 → 更新 → commit，不需要額外驗證步驟

### 結束前檢查（強制）

1. 執行 TaskList 確認所有 task 狀態
2. 全部 completed → 輸出結果
3. 有未完成 → 先補完成再輸出
