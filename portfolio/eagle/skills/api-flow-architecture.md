---
description: 建立/維護後端 API 結構文件（Entity、DTO、Service、Controller）
argument-hint: <apiName|api1,api2 -pl> [-p] [--full]
design-doc: prompts/4_diary/debug/proposal/slash/api-flow-architecture_skill_proposal.md
---

@.claude/flowcharts/api-flow-architecture_flowchart.md

## 設計目的

產出後端 API 結構文件，存到 `prompts/6_api_data_flow/`，供 `/debugP`、`/reviewDoc`、`/review-api-flow` 查表使用，避免每次從零搜尋 Entity、DTO、Service select/relations。

## 參數

- `$1`：API module 名稱（選填），例如 `transcript`、`estateSalesDetail`、`customer`
- `-p`：顯示/建立進度表（progress 的縮寫）
- `-pl`：多 API 平行處理（parallel 的縮寫），搭配逗號分隔的 apiName 列表
- `--full`：強制全量掃描（忽略現有文件）

### 使用範例

```bash
# 建立/更新 API 結構文件
/api-flow-architecture transcript

# 顯示/建立進度表
/api-flow-architecture -p

# 強制全量重建
/api-flow-architecture transcript --full

# 多 API 平行處理
/api-flow-architecture edm,transcript -pl

# 多 API 平行 + 全量掃描
/api-flow-architecture edm,transcript -pl --full
```

## 後端程式碼位置

| 項目 | 路徑 |
|------|------|
| 主 repo（worktree 管理用） | `/Users/nicholas/Desktop/Projects/backend-nestjs` |
| BACKEND_READ_PATH（程式碼讀取用） | `/Users/nicholas/Desktop/Projects/backend-nestjs-dev-read` |
| worktree 分支 | `dev` |

> ⚠️ 所有讀取後端程式碼的操作都使用 BACKEND_READ_PATH，不直接讀取主 repo 的程式碼。
> 主 repo 路徑僅用於：fetch、worktree add/remove、setup-worktree-config.sh 腳本位置。

## 產出檔案位置

| API 目錄 | 產出路徑 |
|----------|---------|
| adminApi | `prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md` |
| publicApi | `prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md` |

## 任務

### 0. 建立進度追蹤（強制）

使用 TaskCreate 建立以下步驟：

| Task | Subject | activeForm |
|------|---------|------------|
| 1 | 判斷執行模式（-p 或 apiName） | 判斷執行模式中... |
| 1.5 | 確保 dev worktree 可用 | 確保 dev worktree 可用中... |
| 2 | 參數解析 | 解析參數中... |
| 3 | 定位後端程式碼 | 定位後端程式碼中... |
| 4 | 判斷掃描模式 | 判斷掃描模式中... |
| 5 | 逐區塊處理（讀取→分析→寫入→commit） | 處理區塊中... |
| 6 | 更新進度表 | 更新進度表中... |
| 7 | 同步 /read-data-flow 映射表 | 同步映射表中... |
| 8 | 輸出結果 | 輸出結果中... |

### 1. 判斷執行模式

**檢測 `-p` 參數**：

```bash
# 檢查參數是否為 -p
if [[ "$1" == "-p" ]]; then
    # 進入進度追踪模式
fi
```

**進度追踪模式（-p）**：
1. 檢查進度表是否存在：`prompts/6_api_data_flow/api-flow-progress.md`
2. **不存在** → 建立總進度表：
   - 先執行 Step 1.5 確保 dev worktree 可用
   - 掃描 `{BACKEND_READ_PATH}/src/api/adminApi/` 列出所有 API 目錄
   - 掃描 `{BACKEND_READ_PATH}/src/api/publicApi/` 列出所有 API 目錄
   - 排除非 API 目錄（無 `*.controller.ts` 的目錄）
   - 比對 `6_api_data_flow/` 判斷每個 API 狀態：
     - 有 data-flow 文件 + 有 review-api-flow 區塊 → ✅ 完整檢查
     - 有 data-flow 文件 + 無 review-api-flow 區塊 → ⏳ 僅 architecture
     - 無 data-flow 文件 → ⏸️ 尚未執行
   - 建立進度表（包含所有 API）
   - Git commit 進度表：
     ```bash
     cd /Users/nicholas/Desktop/Projects/prompts
     git add 6_api_data_flow/api-flow-progress.md
     git commit -m "api-flow-architecture: 建立 API Flow 進度表"
     ```
3. **已存在** → 顯示進度摘要：
   - 讀取進度表
   - 統計完成/進行中/未執行的 API 數量
   - 顯示進度統計（不修改、不 commit）
4. 執行完畢，跳到 Step 8 輸出結果

**API 結構文件模式（有 apiName）**：
- 繼續執行 Step 1.5

**多 API 平行模式（-pl）**：
- 解析逗號分隔的 apiName 列表（如 `edm,transcript`）
- 無逗號分隔列表 → 報錯：`❌ -pl 需搭配多個 API，格式：api1,api2 -pl`
- 檢查是否有 `--full` flag
- 進入平行模式，跳到 Step 1.5 → Phase 1

**多 API 但無 -pl**：
- 偵測到逗號分隔但沒有 `-pl` → 報錯：`❌ 多 API 需搭配 -pl，格式：api1,api2 -pl`

**無參數或參數錯誤**：
- 報錯：`❌ 請指定 API 名稱或使用 -p 查看進度`

---

### 1.5. 確保 dev worktree 可用（讀取後端程式碼用）

**執行時機**：所有需要讀取後端程式碼的模式（單一 API、-p 建立進度表、-pl）。-p 顯示摘要模式不需要（只讀進度表）。

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

### Phase 1：平行處理（-pl 模式專用）

> 此區塊僅在 `-pl` 模式執行，單一 API 模式跳過

**1.1 啟動背景 agent**：

對每個 apiName，使用 Task tool 啟動背景 agent：

```
Task(
  subagent_type="general-purpose",
  run_in_background=true,
  prompt="執行 /api-flow-architecture {apiName} 的 Step 2-5（平行模式）：
    - BACKEND_READ_PATH = /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
    - 所有後端程式碼讀取使用 BACKEND_READ_PATH（唯讀）
    - 執行 Step 2（參數解析）、Step 3（定位程式碼）、Step 4（判斷掃描模式）、Step 5（逐區塊處理）
    - ⏭️ 跳過 Step 5 中每個區塊的 git commit
    - ⏭️ 跳過 Step 6（進度表更新）
    - ⏭️ 跳過 Step 7（映射表同步）
    - [如有 --full] 使用全量掃描模式
    - 完成後將結果寫入 /tmp/api-flow-{apiName}-result.md（格式見下方）"
)
```

**1.2 等待所有 agent 完成**：

使用 TaskOutput 逐一檢查各 agent 狀態，全部完成後進入 Phase 2。

**Tmp 結果檔格式**（`/tmp/api-flow-{apiName}-result.md`）：

```markdown
# api-flow-architecture parallel result

| 項目 | 內容 |
|------|------|
| apiName | {apiName} |
| apiDir | {adminApi/publicApi} |
| dataFlowPath | prompts/6_api_data_flow/{dir}/{apiName}-data-flow.md |
| scanMode | {full/incremental} |
| status | {completed/failed} |
| commitHash | {HEAD hash} |

## 掃描統計

| 區塊 | 數量 |
|------|------|
| Entity | {N} |
| DTO | {N} |
| Service 方法 | {N} |
| Controller 路由 | {N} |

## 錯誤（如有）

{錯誤訊息，無錯誤則留空}
```

---

### Phase 2：合併階段（-pl 模式專用）

> 此區塊僅在 `-pl` 模式執行，主對話序列處理

**2.1 讀取結果**：
- 讀取所有 `/tmp/api-flow-*-result.md`
- 解析各 agent 的 status（completed/failed）

**2.2 批次 git commit**（僅成功的）：
```bash
cd /Users/nicholas/Desktop/Projects/prompts
# 只 add 成功的 data-flow 文件
git add 6_api_data_flow/{dir1}/{api1}-data-flow.md
git add 6_api_data_flow/{dir2}/{api2}-data-flow.md
git commit -m "api-flow-architecture: {api1}, {api2} 結構文件建立完成（parallel）"
```

**2.3 批次更新進度表**（僅成功的）：
- 檢查進度表是否存在
- 已存在 → 一次更新所有成功 API 的進度狀態
- Git commit 進度表

**2.4 批次更新 /read-data-flow 映射表**（僅成功的）：
- 對每個成功的 apiName，檢查是否已在映射表中
- 不存在的 → 批次新增映射行

**2.5 清理 tmp 檔案**：
```bash
rm -f /tmp/api-flow-*-result.md
```

**2.6 失敗處理**：
- 有失敗的 API → 在 Step 8 輸出中列出失敗原因
- 全部失敗 → 報錯：`❌ 所有 API 處理失敗`

---

### 2. 參數解析

（此步驟僅在 API 結構文件模式執行，-p 模式跳過）

1. 解析 `$1` 為 apiName，無值則報錯退出
2. 檢查是否有 `--full` flag

### 3. 定位後端程式碼

1. 用 Glob 搜尋 dev worktree 的後端程式碼目錄：
   - `{BACKEND_READ_PATH}/src/api/adminApi/{apiName}/`
   - `{BACKEND_READ_PATH}/src/api/publicApi/{apiName}/`
2. 找到 → 記錄 API 目錄位置（adminApi 或 publicApi）
3. 找不到 → 報錯退出：`❌ 找不到 {apiName} 的後端程式碼`

### 4. 判斷掃描模式

檢查 `prompts/6_api_data_flow/{adminApi|publicApi}/` 是否已有 `{apiName}-data-flow.md`：

**文件不存在 → 全量掃描模式**：
1. 取得 dev worktree HEAD commit hash：`git -C {BACKEND_READ_PATH} rev-parse --short HEAD`
2. 記錄 commit hash，供 Step 5 寫入 scan-meta

**文件已存在 + 有 `--full` → 全量掃描模式**：
- 同上

**文件已存在 + 無 `--full` → 漸進式更新模式**：
1. 讀取現有 data-flow 文件
2. 用 Grep 提取各區塊的 scan-meta commit hash：`<!-- scan-meta: commit=xxx -->`
3. 取得 dev worktree HEAD commit hash
4. 執行 git diff 偵測變更：
   ```bash
   git -C {BACKEND_READ_PATH} diff --name-only {last-commit}..HEAD -- src/api/**/{apiName}/
   ```
5. 有變更 → 分類變更檔案：
   - `*.entity.ts` → Entity 區塊需更新
   - `*.dto.ts` → DTO 區塊需更新
   - `*.service.ts` → Service 區塊需更新
   - `*.controller.ts` → Controller 區塊需更新
6. 無變更 → 輸出「✅ {apiName} 無需更新（上次掃描 commit: {hash}）」→ 結束

### 5. 逐區塊處理（讀取→分析→寫入→commit）

（此步驟僅在 API 結構文件模式執行，-p 模式跳過）
（所有後端程式碼從 BACKEND_READ_PATH 讀取）

處理順序：Entity → DTO → Service → Controller（固定順序，與 data-flow 文件區塊順序一致）

**全量模式**：依序處理四個區塊

**5a. Entity**：
1. 讀取 `src/api/**/{apiName}/*.entity.ts`
2. 分析 Entity 結構：
   - DB table 名稱（從 `@Entity()` 裝飾器提取）
   - 所有欄位（名稱、型別、nullable、default）
   - 關聯定義（ManyToOne、OneToMany、ManyToMany + 目標 Entity）
   - 特殊欄位（@CreateDateColumn、@UpdateDateColumn、@DeleteDateColumn）
3. 寫入 Entity 區塊（使用 replace-section.sh）：
   ```
   a. Write → /tmp/section-{apiName}-entity.md（含 ## Entity 結構 標題 + scan-meta + 內容，不含尾部 ---）
   b. Bash: /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh {data-flow路徑} "## Entity 結構" /tmp/section-{apiName}-entity.md
   c. Read 驗證替換結果（讀取區塊起始 5 行確認 scan-meta）
   d. Bash: rm /tmp/section-{apiName}-entity.md
   ```
4. Git commit：
   ```bash
   cd /Users/nicholas/Desktop/Projects/prompts
   git add 6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md
   git commit -m "api-flow-architecture: {apiName} Entity 結構建立完成"
   ```

**5b. DTO**：
1. 讀取 `src/api/**/{apiName}/dto/*.dto.ts`
2. 分析 DTO 定義：
   - Response DTO：回傳欄位清單
   - Create DTO：欄位 + 必填/選填 + 驗證規則（@IsNotEmpty、@IsOptional 等）
   - Update DTO：欄位 + 驗證規則
   - 如有多個 DTO（如 findAll 專用 response），全部列出
3. 寫入 DTO 區塊（使用 replace-section.sh）：
   ```
   a. Write → /tmp/section-{apiName}-dto.md（含 ## DTO 欄位定義 標題 + scan-meta + 內容，不含尾部 ---）
   b. Bash: /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh {data-flow路徑} "## DTO 欄位定義" /tmp/section-{apiName}-dto.md
   c. Read 驗證替換結果
   d. Bash: rm /tmp/section-{apiName}-dto.md
   ```
4. Git commit：`"api-flow-architecture: {apiName} DTO 定義建立完成"`

**5c. Service**：
1. 讀取 `src/api/**/{apiName}/*.service.ts`
2. 分析 Service 結構：
   - findOne：select 欄位、relations、where 條件
   - findAll：select 欄位、relations、where 條件、orderBy
   - 其他方法：create/update/remove 的 DB 操作（save/update/softRemove）
   - 錯誤處理模式（findOne 撈不到時的處理）
3. 寫入 Service 區塊（使用 replace-section.sh）：
   ```
   a. Write → /tmp/section-{apiName}-service.md（含 ## Service 查詢結構 標題 + scan-meta + 內容，不含尾部 ---）
   b. Bash: /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh {data-flow路徑} "## Service 查詢結構" /tmp/section-{apiName}-service.md
   c. Read 驗證替換結果
   d. Bash: rm /tmp/section-{apiName}-service.md
   ```
4. Git commit：`"api-flow-architecture: {apiName} Service 結構建立完成"`

**5d. Controller**：
1. 讀取 `src/api/**/{apiName}/*.controller.ts`
2. 分析 Controller 結構：
   - 所有路由（HTTP method + path + handler 名稱）
   - 參數來源（@Param、@Query、@Body）
   - Guard/Decorator 使用情況
3. 寫入 Controller 區塊（使用 replace-section.sh）：
   ```
   a. Write → /tmp/section-{apiName}-controller.md（含 ## Controller 路由結構 標題 + scan-meta + 內容，不含尾部 ---）
   b. Bash: /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh {data-flow路徑} "## Controller 路由結構" /tmp/section-{apiName}-controller.md
   c. Read 驗證替換結果
   d. Bash: rm /tmp/section-{apiName}-controller.md
   ```
4. Git commit：`"api-flow-architecture: {apiName} Controller 結構建立完成"`

**首次建立（文件不存在）**：
- 先用 Write 建立文件骨架（`# {apiName} 資料流索引` + `## 基本資訊` 區塊 + 尾部 `---`）
- 後續 Entity/DTO/Service/Controller 區塊用 replace-section.sh 的 append 模式逐個追加

**漸進模式**：只處理 Step 4 中 git diff 顯示有變更的區塊

- Entity 有變 → 執行 5a，commit message 改為：`"api-flow-architecture: {apiName} Entity 結構更新（漸進式）"`
- DTO 有變 → 執行 5b，commit message 改為：`"api-flow-architecture: {apiName} DTO 定義更新（漸進式）"`
- Service 有變 → 執行 5c，commit message 改為：`"api-flow-architecture: {apiName} Service 結構更新（漸進式）"`
- Controller 有變 → 執行 5d，commit message 改為：`"api-flow-architecture: {apiName} Controller 結構更新（漸進式）"`
- 沒變的區塊 → 跳過

**效率原則**：
- 每個區塊讀完就寫入 + commit，context 消耗分段釋放
- 不讀取 `*.module.ts`、`*.spec.ts` 等非結構性檔案
- 中途 crash → 已 commit 的區塊保留，下次漸進式更新只需處理剩餘區塊

**data-flow 文件格式**（首次建立時的完整結構）：

```markdown
# {apiName} 資料流索引

## 基本資訊
- Module: {apiName}
- API 目錄: {adminApi|publicApi}
- 對應前端專案: {dashboard-nuxt|frontend-nuxt}

---

## Entity 結構

<!-- scan-meta: commit={hash}, date={YYYY-MM-DD} -->

### {EntityName}

| 欄位 | 型別 | nullable | 說明 |
|------|------|----------|------|
| ... | ... | ... | ... |

### 關聯

| 關聯名稱 | 型別 | 目標 Entity | 說明 |
|---------|------|------------|------|
| ... | ... | ... | ... |

---

## DTO 欄位定義

<!-- scan-meta: commit={hash}, date={YYYY-MM-DD} -->

### Response DTO
（欄位表格）

### Create DTO
（欄位 + 驗證規則表格）

### Update DTO
（欄位 + 驗證規則表格）

---

## Service 查詢結構

<!-- scan-meta: commit={hash}, date={YYYY-MM-DD} -->

### findOne
（select、relations）

### findAll
（select、relations、where、orderBy）

### 其他方法
（方法清單表格）

---

## Controller 路由結構

<!-- scan-meta: commit={hash}, date={YYYY-MM-DD} -->

| 方法 | 路由 | Handler | 說明 |
|------|------|---------|------|
| ... | ... | ... | ... |
```

### 6. 更新進度表

**執行時機**：
- API 結構文件模式：完成 Step 5 後執行
- -p 模式：在 Step 1 已完成

**更新邏輯**：

1. 檢查進度表是否存在：`prompts/6_api_data_flow/api-flow-progress.md`
2. **不存在** → 跳過（首次執行 API 時不建立進度表，需用 `-p` 明確建立）
3. **已存在** → 更新對應 API 的進度：
   - 找到該 API 的進度區塊
   - 更新 `/api-flow-architecture {apiName}` 狀態為 ✅
   - 更新最後更新日期
   - Git commit 進度表變更：
     ```bash
     cd /Users/nicholas/Desktop/Projects/prompts
     git add 6_api_data_flow/api-flow-progress.md
     git commit -m "更新 API Flow 進度：{apiName} - api-flow-architecture 完成"
     ```

### 7. 同步 /read-data-flow 映射表

（此步驟僅在 API 結構文件模式執行，-p 模式跳過）

1. 讀取 `/read-data-flow` 定義檔：`backend-nestjs/.claude/commands/read-data-flow.md`
2. 檢查「## 模組名稱 → 檔案路徑映射表」是否已包含當前 apiName
   - 已存在 → 跳過，輸出 `ℹ️ {apiName} 已在 /read-data-flow 映射表中`
   - 不存在 → 繼續
3. 在映射表末尾新增一行：
   ```
   | `{apiName}` | `prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md` |
   ```
4. 使用 Edit 工具寫入定義檔
5. 輸出 `✅ 已將 {apiName} 加入 /read-data-flow 映射表`

### 8. 輸出結果

**API 結構文件模式**：

```
✅ API 結構文件建立完成

📊 掃描統計：
- API Module: {apiName}
- 掃描模式：[全量/漸進]
- Entity: [N] 個
- DTO: [N] 個
- Service 方法: [N] 個
- Controller 路由: [N] 個
- [漸進模式] 變更區塊：[Entity/DTO/Service/Controller]

📁 產出檔案：
- prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md

📌 scan-meta commit: {hash}

[如有更新進度表]
✅ 進度表已更新並 commit
```

**進度追踪模式（-p）**：

```
✅ API Flow 進度追踪

📊 進度統計：
- 總計：N 個 API
- ✅ 完整檢查（architecture + review）：X 個 (XX%)
- ⏳ 僅 architecture：Y 個 (YY%)
- ⏸️ 尚未執行：Z 個 (ZZ%)

📁 進度表位置：
- prompts/6_api_data_flow/api-flow-progress.md

💡 使用 /api-flow-architecture {apiName} 建立 API 結構文件
💡 使用 /review-api-flow {apiName} 執行前後端對齊檢查
```

**平行模式（-pl）**：

```
✅ API 結構文件批次建立完成（parallel）

📊 處理結果：
| API | 狀態 | 掃描模式 | Entity | DTO | Service | Controller |
|-----|------|----------|--------|-----|---------|------------|
| edm | ✅ | 全量 | 2 | 3 | 5 | 4 |
| transcript | ✅ | 全量 | 1 | 2 | 3 | 3 |

[如有失敗]
❌ 失敗的 API：
- {apiName}：{失敗原因}

📁 產出檔案：
- prompts/6_api_data_flow/{dir}/{api1}-data-flow.md
- prompts/6_api_data_flow/{dir}/{api2}-data-flow.md

📌 批次 commit: {hash}
✅ 進度表已更新
✅ /read-data-flow 映射表已更新
```

### 結束前檢查（強制）

1. 執行 TaskList 確認所有 task 狀態
2. 全部 completed → 輸出結果
3. 有未完成 → 先補完成再輸出
