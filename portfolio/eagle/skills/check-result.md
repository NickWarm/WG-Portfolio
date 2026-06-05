---
description: 切換到 dev/staging DB，用 local API 驗證實作結果
argument-hint: <dev|staging> [-f] [-p]
allowed-tools: Bash(./scripts/*:*), Bash(./.claude/scripts/*:*), Bash(curl:*), Bash(lsof:*), Bash(pkill:*), Bash(PGPASSWORD=*)
design-doc: prompts/4_diary/debug/proposal/slash/check-result_skill_proposal.md
---

@.claude/flowcharts/check-result_flowchart.md

@/Users/nicholas/Desktop/Projects/.claude/modules/curl-token.md
@/Users/nicholas/Desktop/Projects/.claude/modules/db-connection-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/api-response-index.md
@/Users/nicholas/Desktop/Projects/.claude/modules/ui-api-index.md

# Check Result - 驗證實作結果

用 local API + 遠端 DB 的方式驗證 AI 實作完成的項目。

## 參數

- 目標環境：$1（dev 或 staging）
- `-f`：可選 flag，檔案上傳輔助模式
- `-p`：可選 flag，權限輔助模式

### -f 模式說明

當驗證檔案上傳相關的修改時，加上 `-f` flag：

```bash
/check-result dev -f
```

**-f 模式會額外執行**：
1. 載入檔案上傳架構知識（精簡版，約 2,500 tokens）
2. Step 3 額外查詢 files table、foreignKey、documentType
3. Step 6.4 強制執行（非條件觸發）
4. Step 6.5 執行 4 項檔案上傳專屬檢核
5. Step 7 增加檔案維度分析

**檢測到 `-f` flag 時，執行以下步驟**：
1. 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/file_upload/architecture/file_upload_architecture.md`
2. 讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/file_upload/architecture/file_upload_checklist.md`
3. 輸出：「📁 檔案上傳輔助模式啟動」

### -p 模式說明

當驗證權限相關的修改時，加上 `-p` flag：

```bash
/check-result dev -p
```

**-p 模式會額外執行**：
1. 載入權限 DB 結構知識（dataScope 查詢模板）
2. 根據帳號角色自動查詢可存取的測試資料
3. 理解 200/400/403 的權限驗證意義

**檢測到 `-p` flag 時，執行以下步驟**：
1. 讀取 `/Users/nicholas/Desktop/Projects/.claude/modules/permission-helper.md`
2. 輸出：「🔐 權限輔助模式啟動」

## 執行步驟

### Step 0: 建立進度追蹤（強制）

> ⚠️ **此步驟為強制執行**，確保不會遺漏任何步驟

執行開始時，使用 TaskCreate 建立所有步驟的 task：

```
TaskCreate: subject="Step 1: 環境切換", activeForm="切換環境中..."
TaskCreate: subject="Step 2: 上下文分析", activeForm="分析上下文中..."
TaskCreate: subject="Step 2.5: 帳號智能識別", activeForm="識別測試帳號中..."
TaskCreate: subject="Step 3: DB 查詢測試資料", activeForm="查詢測試資料中..."
TaskCreate: subject="Step 4: Server 啟動 (port 3001)", activeForm="啟動 Server..."
TaskCreate: subject="Step 5: 取得 Token", activeForm="取得 Token..."
TaskCreate: subject="Step 6.1: 推導 API 序列", activeForm="查詢 UI-API 索引..."
TaskCreate: subject="Step 6.2: 存在性確認", activeForm="確認物件存在..."
TaskCreate: subject="Step 6.2.5: DB vs API 欄位一致性驗證", activeForm="逐欄比對 DB 與 API 回傳值..."  # 有新增/修改 GET 回傳欄位時才建立
TaskCreate: subject="Step 6.3: Bug Spec 模擬", activeForm="模擬前端操作..."
TaskCreate: subject="Step 6.3.6: CRU 寫入後 DB 回查", activeForm="回查 DB 確認寫入正確..."  # 有 POST/PATCH 操作時才建立
TaskCreate: subject="Step 6.4: 檔案可存取性驗證", activeForm="驗證檔案可存取..."
TaskCreate: subject="Step 6.4.5: 檔案內容抽樣驗證", activeForm="驗證檔案內容..."
TaskCreate: subject="Step 6.5: 檔案上傳 4 項專屬檢核", activeForm="執行檔案專屬檢核..."  # -f 模式才建立
TaskCreate: subject="Step 6.6: 篩選參數交互驗證", activeForm="驗證篩選參數交互行為..."  # proposal 有 🔍 cases 才建立
TaskCreate: subject="Step 7: 結果分析", activeForm="分析驗證結果..."
TaskCreate: subject="Step 8: 更新提案文件", activeForm="更新提案文件..."
TaskCreate: subject="Step 9: 結束前檢查", activeForm="確認所有步驟完成..."
TaskCreate: subject="Step 10: 更新進度表", activeForm="更新進度表中"
```

**執行規則**：
- 開始步驟時：`TaskUpdate(status: "in_progress")`
- 完成步驟時：`TaskUpdate(status: "completed")`

> ⛔ **禁止合併 Task**：必須嚴格按照上方列表逐一建立 Task，禁止將多個步驟合併為一個 Task（如把 6.1~6.4 合併為「Step 6: API 驗證」）。合併會導致子步驟被跳過。
>
> **2026-02-03 教訓**：AI 將 6.1~6.4 合併為單一 Task，跳過 6.1「推導 API 序列」（查 UI-API 索引），直接用猜測的 request body 打 API，導致驗證方式錯誤。

### Step 1: 切換資料庫環境（偵測優先）

> ⚠️ **重要**：先偵測環境狀態，已就緒則跳過切換，避免干擾其他 AI agent 或正在運行的 server

**1.1 偵測三項環境狀態**

```bash
# 1. Server 是否運行
lsof -ti:3001
# 有 PID 輸出 → serverRunning = true

# 2. PG Tunnel 是否連線
pgrep -f "ssh.*5433:localhost:5432"
# 有 PID → pgTunnelUp = true

# 3. MSSQL Tunnel 是否連線
pgrep -f "ssh.*1433:<SERVER_IP>:1433"
# 有 PID → mssqlTunnelUp = true

# 4. PG 目標環境
grep DB_DATABASE backend-nestjs/src/config/.env.local
# eagle-dev → currentEnv = "dev"
# eagle（非 eagle-dev）→ currentEnv = "staging"
# 檔案不存在 → currentEnv = "local"
```

**1.2 比對目標環境 vs 偵測結果**

| 偵測結果 | 操作 | dbSwitched |
|---------|------|------------|
| currentEnv == $1 且 pgTunnelUp 且 mssqlTunnelUp | ✅ 跳過切換 | false |
| currentEnv == $1 且 pgTunnelUp 且 !mssqlTunnelUp | 只跑 `./scripts/db-tunnel.sh mssql start` | false |
| currentEnv != $1 或 !pgTunnelUp | 跑 `./scripts/db-tunnel.sh $1 all`（完整切換）| true |

**1.3 確認環境就緒**

```bash
# 無論是否跳過，都執行 status 確認
./scripts/db-tunnel.sh status
```

**1.4 輸出偵測摘要**

```
🔍 環境偵測：Server {✅/❌} | PG({currentEnv}) {✅ 吻合/❌ 需切換} | MSSQL {✅/❌}
```

**❌ 禁止操作**：

| 禁止操作 | 原因 |
|---------|------|
| `cp .env.dev .env` | 繞過 db-tunnel.sh 的完整流程 |
| `cp .env.staging .env` | 繞過 db-tunnel.sh 的完整流程 |
| 任何手動修改 .env | 可能導致環境狀態不一致 |

> ⚠️ 環境切換**只能**透過 `db-tunnel.sh`，禁止任何手動 .env 操作

### Step 2: 上下文分析

從對話上下文理解剛完成的實作內容，判斷驗證類型：

| 情況 | 需要先查 DB | 說明 |
|------|-------------|------|
| 新增計算欄位（如 isWithin90Days） | ✅ | 需要找邊界案例驗證計算邏輯 |
| 新增關聯欄位（如 realEstateStoreId） | ✅ | 需要找各種關聯情況（有值/null） |
| 修改查詢邏輯/過濾條件 | ✅ | 需要找符合/不符合條件的資料 |
| 純 DTO 欄位重命名 | ❌ | 直接打 API 看格式即可 |
| 新增固定值欄位 | ❌ | 不依賴 DB 資料 |

### Step 3: DB 查詢測試資料（條件執行）

**若判斷為「涉及 DB」**，先用 psql 查詢適合的測試資料：

```bash
# 連線到目標環境的 DB（參考 db-connection-rules.md）
# Dev 環境
PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
SELECT id, [相關欄位]
FROM [相關表]
WHERE [條件]
LIMIT 5;
"

# Staging 環境
PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5433 -U <DB_USER> -d eagle -c "
SELECT id, [相關欄位]
FROM [相關表]
WHERE [條件]
LIMIT 5;
"
```

**查詢策略**：
- **邊界案例**：找剛好在邊界的資料（如剛好 90 天、剛好 91 天）
- **特殊情況**：找 null 值、空值、不存在的關聯
- **正常情況**：找一般正常的資料作為對照

**記錄測試資料**：
- 記錄找到的 ID
- 記錄預期的回傳值（從 DB 查詢結果計算）

**-f 模式額外查詢**：

當使用 `-f` flag 時，除了上述查詢外，額外查詢檔案相關資料：

```bash
# 查詢 files table 確認檔案紀錄存在
SELECT id, "fileName", "documentType", "fileUrl"
FROM [files_table]
WHERE [主 Entity foreignKey] = {id}
LIMIT 10;

# 確認 documentType 欄位值是否符合 DOCUMENT_TYPE_MAPPING
# 確認 fileUrl 路徑前綴是否正確
```

**篩選參數預期值讀取**（proposal 有 `### 🔍 篩選參數測試 Cases` 時）：

1. 讀取 proposal 的「### 🔍 篩選參數資料分佈」表
2. 讀取 proposal 的「### 🔍 篩選參數測試 Cases」表
3. 從 Cases 表提取每個 Q-N 的：情境描述（= query params 組合）、DB 預期筆數、預期關係
4. 記錄為 Step 6.6 的輸入資料

> 不重查 DB。理由：check-result 在 implement 後立即執行，DB 資料不會大幅變動。

**若判斷為「不涉及 DB」**，跳過此步驟。

### Step 4: 啟動 Local Server（配合環境偵測）

> ⚠️ **重要**：根據 Step 1 的 `dbSwitched` 和 `serverRunning` 決定操作

**4.1 判斷是否需要操作**

| dbSwitched | serverRunning | 操作 |
|-----------|---------------|------|
| true | 任意 | 需要重啟（走 4.2） |
| false | true | ✅ 跳過，輸出「Server 已在 port 3001 運行」 |
| false | false | 直接啟動（不需 pkill，走 4.3） |

**4.2 需要重啟時**（DB 已切換，server 連的是舊 DB）

```bash
# 1. 清理舊進程
pkill -f "nest start" || true

# 2. 確認 port 已釋放
lsof -i :3001
# 預期輸出：無任何結果

# 3. 啟動 server
./.claude/scripts/start-dev-server.sh

# 4. 確認啟動成功（等待 10-15 秒）
curl -s http://localhost:3001/health
```

**4.3 需要啟動時**（DB 沒切換但 server 未運行）

```bash
# 直接啟動，不需要 pkill（沒有舊進程）
./.claude/scripts/start-dev-server.sh

# 確認啟動成功
curl -s http://localhost:3001/health
```

### Step 5: 取得 Token

> ⚠️ **直接執行腳本，不要先查 DB 驗證帳號**
>
> 取 Token 是完全跟 DB 無關的行為。如果帳號有問題，腳本會返回錯誤。

```bash
./.claude/scripts/get-token.sh local
```

### Step 6: API 驗證（Bug Fix 三步法）

根據實作內容，查詢 `api-response-index.md` 確認正確的 jq 路徑，然後驗證。

#### 6.1 推導 API 序列（Bug Fix 場景必做）

如果是驗證 bug fix（從對話上下文判斷）：
1. 從對話中找到 bug spec 的「重現步驟」（如：點擊成交物件 → 填寫資料 → 點擊儲存）
2. **【優先】查詢 UI-API 索引**（參考 ui-api-index.md module）：
   - Dashboard 相關 → 查 `ui-api-index-dashboard.md`
   - Frontend 相關 → 查 `ui-api-index-frontend.md`
   - 根據「頁面/Tab/Dialog」查表取得 API
3. **【備用】** 若索引無對應項目，手動搜尋前端專案（dashboard-nuxt / frontend-nuxt），找出每個步驟對應的 API
4. 記錄要打的 API 序列（如：GET /estate-listings/{id} → POST /estate-transactions）

#### 6.2 存在性確認

先打 findOne/findAll 確認物件存在：

```bash
# 用 Step 3 找到的 ID 打查詢 API
./.claude/scripts/test-dashboard-api.sh "/estate-listings/{id}" ".data"

# 或用 findAll + filter
./.claude/scripts/test-dashboard-api.sh "/estate-transactions?page=1&limit=200" \
  ".data.items[] | select(.id == 6860) | {id, [驗證欄位]}"
```

- 確認 API 正常回傳
- 比對 DB 預期值 vs API 回傳值

#### 6.2.5 DB vs API 欄位一致性驗證（條件觸發）

> **觸發條件**：有新增或修改 GET 回傳欄位時執行（含計算欄位、關聯欄位）
> **跳過條件**：純 DTO 重命名、新增固定值欄位

**執行邏輯**：

1. 從 proposal/上下文列出「改動到的欄位」
2. 依欄位類型分別處理：

**一般欄位**（DB 直接存值）：
- 從 Step 3 DB 查詢結果取預期值
- 打 GET API 取回傳值
- 逐欄比對：DB 值 vs API 回傳值

**計算欄位**（DB 不直接存值）：
- 查 DB 原始欄位（如 `signedAt`、`contractDate`）
- AI 根據業務邏輯自己算出預期值
  - 例：`signedAt = 2025-11-21`，距今 91 天 → `isWithin90Days = false`
- 跟 API 回傳值比對

**產出格式**：

| 欄位 | DB 值/計算依據 | API 回傳值 | 結果 |
|------|--------------|-----------|------|
| storeName | "信義店"（DB 直接值）| "信義店" | ✅ |
| isWithin90Days | signedAt=2025-11-21，距今91天→false | false | ✅ |
| realEstateStoreId | null（DB 無關聯）| null | ✅ |

#### 6.3 Bug Spec 模擬

照著 bug spec 操作打目標 API：

```bash
# POST 範例
./.claude/scripts/test-dashboard-api.sh "/estate-transactions" \
  -X POST -d '{"realEstateId": {id}, "transactionRecovery": [{"type": 1, "recoveryAt": "", "amount": ""}]}'

# PATCH 範例
./.claude/scripts/test-dashboard-api.sh "/transcripts/123" \
  -X PATCH -d '{"realEstateId": 1, "areaSqm": 100}' ".data"

# DELETE 範例
./.claude/scripts/test-dashboard-api.sh "/transcripts/land/456" -X DELETE
```

> ⚠️ **統一使用 test-dashboard-api.sh**：所有 API 驗證（GET/POST/PATCH/DELETE）都必須透過此腳本執行，禁止使用裸 `curl` + `TOKEN=$(cat ...)` 的方式（會觸發 Claude Code 權限提示）。

- 驗證錯誤是否修復
- 記錄結果

#### 6.3.6 CRU 寫入後 DB 回查驗證（條件觸發）

> **觸發條件**：有 POST（CREATE）或 PATCH（UPDATE）操作時執行
> **跳過條件**：DELETE、純 GET 驗證

> ⚠️ **編號說明**：6.3.5 已被「500 路徑驗證」（2026-02-07 reviewDoc 整合）佔用，故本步驟編號為 6.3.6。

**執行邏輯**：

1. 從 request body 提取「送出的欄位值」
2. 從 API response 取得新建/更新的 ID
3. 直接查 DB 確認實際寫入值：

```bash
PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
SELECT [改動欄位]
FROM [table]
WHERE id = {新建/更新的 ID};
"
```

4. 逐欄比對：request 送出值 vs DB 實際值
5. 有業務邏輯轉換的欄位（如 enum 轉換）：標註「邏輯轉換」，說明預期轉換規則

**產出格式**：

| 欄位 | Request 送出值 | DB 實際值 | 結果 |
|------|--------------|---------|------|
| areaSqm | 100 | 100 | ✅ |
| status | "approved" | "approved" | ✅ |
| updatedAt | （系統產生）| 有值 | ✅ 有更新 |
| type | 1（enum）| "approved"（轉換）| ✅ 邏輯轉換正確 |

#### 6.4 檔案可存取性驗證（條件觸發 / -f 模式強制）

> **一般模式觸發條件**：API 回傳含 fileUrl 或 files 欄位時執行
> **-f 模式**：⚠️ 強制執行，不需要條件判斷

```bash
# 1. 下載檔案
curl -sS -o /tmp/verify_file "{fileUrl}"

# 2. 檢查格式（確認實際格式符合預期）
file /tmp/verify_file
# 預期：PDF document / JPEG image / PNG image 等

# 3. 檢查大小（確認 > 0 bytes）
ls -la /tmp/verify_file

# 4. 清理暫存
rm /tmp/verify_file
```

**驗證結果表格**：

| 檔案 | 下載 | 格式 | 大小 | 結果 |
|------|------|------|------|------|
| contract.pdf | ✅ 200 | ✅ PDF document | ✅ 50,898 bytes | ✅ 可用 |
| image.jpg | ✅ 200 | ❌ HTML document | - | ❌ 格式異常 |

#### 6.4.5 檔案內容抽樣驗證（有檔案產出時）

> **觸發條件**：Step 6.4 下載的檔案是 docx 或 pdf 時觸發

**內容提取**：

- **Word (docx)**：
  ```bash
  unzip -p {file} word/document.xml > /tmp/doc_content.xml
  grep -oP '(?<=<w:t[^>]*>)[^<]+' /tmp/doc_content.xml
  ```
- **PDF**：
  ```bash
  pdftotext {file} /tmp/pdf_content.txt  # 優先
  strings {file} | grep -v '^[[:space:]]*$'  # 備用
  ```

**抽樣策略**：

- **有「## 檔案產出欄位風險表」**：優先驗證 ⚠️ 風險欄位
  - 從 `/reviewDoc -data` 的「📄 檔案產出測試資料」取得預期值
  - 在檔案內容中搜尋預期值
  - 找到 → ✅ 欄位有值且正確
  - 找不到 + DB 有值 → ❌ 程式 bug（資料沒帶入檔案）
  - 找不到 + DB 無值 → ⚠️ DB 無資料（非程式 bug）
- **沒有風險表**：從 Step 3 DB 查詢結果隨機抽樣 5~10 個有值欄位

**容錯策略**：
- 搜尋時用子字串匹配（不要求完全一致）
- 數字欄位允許格式差異（如 `1000` vs `1,000`）
- 找不到時先嘗試去除空白再搜尋一次

**驗證結果表格**：

| # | 欄位 | DB 預期值 | 檔案中找到 | 結果 | 說明 |
|---|------|-----------|-----------|------|------|
| 1 | storeName | 信義店 | ✅ 信義店 | ✅ | - |
| 2 | parkingArea | (null) | ❌ 空白 | ⚠️ | DB 無資料，非程式 bug |
| 3 | legalNote | 備註文字 | ❌ 未找到 | ❌ | DB 有值但檔案沒帶入 → 程式 bug |

#### 6.5 檔案上傳 4 項專屬檢核（-f 模式）

> **觸發條件**：僅在 `-f` 模式下執行

| # | 檢核項 | 驗證方法 | 預期結果 |
|---|--------|---------|---------|
| 1 | CUSTOM_PATH_PREFIX | 檢查 API 回傳的 fileUrl 路徑 | 包含正確的環境前綴（dev/staging） |
| 2 | DOCUMENT_TYPE_MAPPING | 用 psql 查 DB 中的 documentType 欄位 | 值與 mapping 表一致 |
| 3 | DTO 檔案欄位 | 檢查 API response 結構 | 包含所有必要的檔案欄位（fileUrl、fileName 等） |
| 4 | Entity 關聯 | 用 psql 查 DB 確認 foreignKey | 檔案紀錄正確關聯到主 Entity |

**輸出格式**：

```markdown
### 檔案上傳 4 項專屬檢核

| # | 檢核項 | 結果 | 說明 |
|---|--------|------|------|
| 1 | CUSTOM_PATH_PREFIX | ✅/❌ | {fileUrl 路徑前綴檢查結果} |
| 2 | DOCUMENT_TYPE_MAPPING | ✅/❌ | {DB documentType 欄位檢查結果} |
| 3 | DTO 檔案欄位 | ✅/❌ | {response 結構檢查結果} |
| 4 | Entity 關聯 | ✅/❌ | {DB foreignKey 檢查結果} |
```

#### 6.6 篩選參數交互驗證（條件觸發）

> **觸發條件**：proposal 有 `### 🔍 篩選參數測試 Cases` 表
> **位置**：在 6.5 之後，Step 7 之前

**執行邏輯**：

1. **推導 findAll endpoint**：從 proposal 上下文推導目標 findAll endpoint（proposal 的問題描述和修改檔案清單會指出是哪個 list API）

2. **逐 case 呼叫 API**：
   ```bash
   # Q-1: countyCodes=O 不帶 townName
   ./.claude/scripts/test-dashboard-api.sh \
     "/estate-listings?page=1&countyCodes=O" ".data.totalCount"

   # Q-2: countyCodes=O + townName=東區
   ./.claude/scripts/test-dashboard-api.sh \
     "/estate-listings?page=1&countyCodes=O&townName=%E6%9D%B1%E5%8D%80" ".data.totalCount"
   ```

3. **比對驗證**（兩種判斷）：

| 驗證類型 | 判斷方式 | pass/fail |
|---------|---------|-----------|
| 子集關係 | Q-2 ≤ Q-1 | ✅/❌（確定性判斷）|
| 筆數比對 | API totalCount vs 預期筆數 | 只標差異，不做 pass/fail |

- **子集驗證**是核心：子參數結果永遠不該比母參數多，不受 DB 資料變動影響
- **筆數差異**僅作為參考資訊，留給人判斷

**驗證結果表格**：

```markdown
### 篩選參數交互驗證

| # | 情境 | API totalCount | 預期筆數 | 差異 | 備註 |
|---|------|---------------|---------|------|------|
| Q-1 | countyCodes=O | 1263 | 1263 | 0% | ✅ |
| Q-2 | countyCodes=O + townName=東區 | 50 | 50 | 0% | ✅ |

**子集驗證**：
| 關係 | 條件 | 結果 |
|------|------|------|
| Q-2 ≤ Q-1 | 50 ≤ 1263 | ✅ 成立 |
```

#### 非 Bug Fix 場景

如果不是驗證 bug fix（如：新功能、refactor）：

```bash
# 分頁 API 驗證範例
./.claude/scripts/test-dashboard-api.sh "/estate-listings?page=1" ".data.items[:3]"

# 單一物件 API 驗證範例
./.claude/scripts/test-dashboard-api.sh "/estate-sales-details/123" ".data"
```

### Step 7: 結果分析

#### API 成功（2xx）

- **有測試資料**：比對 DB 預期值 vs API 回傳值
- **無測試資料**：檢查 API 回應格式是否符合預期

**-f 模式額外分析**：
- fileUrl 路徑前綴是否正確（環境隔離）
- 檔案下載結果 vs DB 紀錄的一致性
- 4 項專屬檢核結果彙整

**篩選參數驗證結果**（有 Step 6.6 時）：
- 全部子集驗證 ✅ → 篩選邏輯正確
- 有子集驗證 ❌ → 明確指出：哪個 case 子集關係不成立、建議回到 proposal 分析篩選邏輯
- 筆數差異僅作為參考資訊

#### API 失敗（4xx/5xx）【強制：自動查日誌】

> ⚠️ **當 API 返回錯誤時，必須自動查看 Server 日誌找出原因**

**日誌位置**：`/tmp/dev-server.log`（由 `start-dev-server.sh` 產生）

```bash
# 查看最近的錯誤日誌
tail -100 /tmp/dev-server.log | grep -i -A10 "error\|exception\|duplicate\|500"
```

**常見錯誤診斷**：

| 錯誤關鍵字 | 可能原因 | 解決方向 |
|-----------|---------|---------|
| `duplicate key` | Sequence 不同步 | 檢查 DB sequence，執行 `setval()` |
| `not found` | 資料不存在 | 確認測試資料 ID 正確 |
| `relation does not exist` | Table 名稱錯誤 | 確認 Entity 對應的實際 table 名稱 |
| `null value in column` | 必填欄位缺少 | 檢查 DTO 和 Entity 定義 |

**診斷報告格式**：

```markdown
❌ API 返回 {statusCode} 錯誤

**錯誤訊息**：{從日誌提取的錯誤訊息}

**Stack Trace**（關鍵部分）：
{相關的程式碼位置}

**可能原因**：{根據錯誤類型判斷}

**建議修復**：{具體修復方向}
```

#### 效能摘要

收集 Step 6 所有 API 呼叫的回應時間（`test-dashboard-api.sh` 自動輸出），彙整為效能摘要表：

| API | 耗時 | 結果 |
|-----|------|------|
| GET /announcements?page=1&limit=10 | 0.65s | ✅ |
| POST /estate-transactions | 1.45s | ⚠️ 超過 1s |

**判斷標準**：
- ≤ 1.0s → ✅
- > 1.0s → ⚠️（記錄但不阻斷驗證流程）

**⚠️ API 超過 1 秒時的處理**：
- 記錄到效能摘要表
- Step 8 寫入 proposal 驗證紀錄時一併記錄
- 不自動中止驗證流程（效能問題可後續處理）

### Step 8: 自動更新提案文件（驗證通過時）

**8.1 判斷是否有 proposal**

從對話上下文搜尋最近讀取的 proposal 文件路徑：
- 有 proposal → 繼續更新
- 無 proposal → 跳過此步驟，只輸出驗證結果

**8.2 更新進度表**

1. 讀取 proposal 文件
2. 搜尋「📊 實作進度」或「實作進度」區塊
3. AI 根據上下文理解「剛驗證什麼」（如：Solution A API 驗證）
4. 智能匹配對應行，更新狀態：`❌ 待驗證` → `✅ 通過`

**8.3 新增驗證紀錄**（詳細格式）

> ⚠️ **強制要求**：驗證完成後必須主動記錄完整驗證過程，不等用戶提醒

在進度表下方新增驗證紀錄區塊：

```markdown
### API 驗證紀錄（{環境}）

**驗證時間**：YYYY-MM-DD
**驗證環境**：Local Server (port 3001) + {環境} DB

---

#### 測試案例 1：{案例描述}

**Request**：
```bash
curl -X POST "http://localhost:3001/api/v1/{endpoint}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "value1",
    "field2": "value2"
  }'
```

**Response**（關鍵部分）：
```json
{
  "statusCode": 400,
  "message": ["錯誤訊息"],
  "error": "Bad Request"
}
```

**結果**：✅ 通過
**說明**：{修改前 vs 修改後的差異，例如：修改前返回 500，修改後返回 400 並顯示友善錯誤訊息}

---

#### 測試案例 2：{案例描述}

**Request**：
```bash
curl -X {METHOD} "http://localhost:3001/api/v1/{endpoint}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{完整 request body}'
```

**Response**（關鍵部分）：
```json
{API 回傳的關鍵部分}
```

**結果**：✅ 通過 / ❌ 失敗
**說明**：{具體說明驗證了什麼、修改前後的差異}
```

**記錄要求**：
- **curl 命令**：完整可執行的命令，可直接複製重現
- **request body**：完整的 JSON 結構
- **response**：關鍵部分的 JSON（可省略過長的陣列內容）
- **說明**：明確描述修改前後的行為差異

**8.4 同步修改檔案清單**

> 防止 `/check-result` 期間的臨時修正（新增檔案、修改程式碼）被 `/gcommit-push` 遺漏

1. 在 backend-nestjs 目錄執行 `git status`，取得所有 modified + untracked 檔案
2. 讀取 proposal 的「修改檔案清單」（表格或列表格式皆可）
3. 比對：git 有但清單沒有的檔案 = 新增項目
   - **有新增** → 追加到清單，標註「（check-result 期間新增）」
   - **無新增** → 跳過
4. 顯示同步結果：
   ```
   📋 修改檔案清單同步
   - 新增 1 個檔案：src/templates/information-sheet/RealEstats_Stall.docx（check-result 期間新增）
   ```

**追加格式**：自動適配 proposal 的清單格式

- 表格式：`| {path} | 新增 | （check-result 期間新增：{簡述}） |`
- 列表式：`- {path}（check-result 期間新增）`

### Step 9: 結束前檢查（強制）

> ⚠️ **此步驟為強制執行**，輸出結果前必須確認所有步驟完成

1. 執行 `TaskList` 查看所有 task 狀態
2. 確認所有 task 都是 `completed`
3. 若有未完成的 task → **先補完成再輸出結果**
4. 全部完成 → 輸出結果

### Step 10：更新進度表

@.claude/flowcharts/update-progress.md

執行進度表更新：將 `/check-result` 對應的步驟標記為 ✅。

## 輸出格式

```
✅ Check Result 完成

| 項目 | 狀態 |
|------|------|
| 環境 | [dev/staging] |
| DB 切換 | ✅ |
| DB 查詢測試資料 | ✅ 已查詢 / ⏭️ 跳過 |
| Local Server | ✅ 運行中 |
| Token 取得 | ✅ |
| API 驗證 | ✅/❌ |
| 提案文件更新 | ✅ 已更新 / ⏭️ 無 proposal |

### 測試資料（若有查詢）

| ID | DB 預期值 | API 回傳值 | 結果 |
|----|----------|-----------|------|
| xxx | xxx | xxx | ✅/❌ |

### 驗證結果

- [具體驗證內容和結果]

### 效能摘要

| API | 耗時 | 結果 |
|-----|------|------|
| {endpoint} | {time}s | ✅/⚠️ |

{有 ⚠️ 時} → 💡 建議排查慢查詢：查看 /tmp/dev-server.log 或開啟 TypeORM query logging
```
