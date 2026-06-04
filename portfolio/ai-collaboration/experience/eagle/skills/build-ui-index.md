---
description: 建立/更新 UI-API 索引（掃描前端專案）
argument-hint: <dashboard|frontend|all> [--full]
design-doc: prompts/4_diary/debug/proposal/slash/build-ui-index_skill_proposal.md
---

@.claude/flowcharts/build-ui-index_flowchart.md

## 設計目的

產出索引文件，供 `ui-api-index.md` module 引用，讓 `/debugP` 和 `/check-result` 能快速查表取得「UI 操作 → API」的對應關係。

## 參數

- `$1`：掃描範圍（dashboard / frontend / all，預設 all）
- `--full`：強制全量掃描

## ⚠️ 執行原則

**禁止使用 Task tool**：
- 此 skill 必須直接執行，不得開啟 agent
- 所有步驟都要在當前 session 中完成
- 使用 Grep + Read 工具直接處理，不要委派給 agent

**原因**：
- 開 agent 會導致執行時間過長（實測 6+ 分鐘）
- 增量掃描模式下，檔案數量有限，直接執行更快
- Task tool 適合長時間背景任務，不適合此 skill
- 直接執行可以即時回饋進度，用戶體驗更好

## 前端專案位置

| 掃描範圍 | 前端專案路徑 |
|----------|-------------|
| dashboard | `/Users/nicholas/Desktop/Projects/dashboard-nuxt/apps/web-ele/src/` |
| frontend | `/Users/nicholas/Desktop/Projects/frontend-nuxt/` |

## 索引文件位置

| 索引文件 | 路徑 |
|----------|------|
| Dashboard | `prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md` |
| Frontend | `prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md` |

## 任務

### 0. 建立 Task 追蹤（可選）

**使用時機**：
- 全量掃描時建議使用（檔案多、時間長）
- 增量掃描時可選（讓用戶掌握進度）

**TaskCreate 列表**：

| Task | Subject | activeForm | Description |
|------|---------|------------|-------------|
| 1 | 解析參數與判斷模式 | 解析參數... | 解析掃描範圍參數，判斷全量或增量模式 |
| 2 | 掃描 API 定義 | 掃描 API 定義... | 使用 Grep 提取 api/core/*.ts 的 endpoint |
| 3 | 掃描頁面 | 掃描頁面... | 掃描 views/**/*.vue 的 API 呼叫 |
| 4 | 掃描功能操作 | 掃描功能操作... | 追蹤 @click handler 的 API 呼叫 |
| 5 | 掃描 Dialog | 掃描 Dialog... | 掃描 Dialog*.vue 的提交和載入函數 |
| 6 | 掃描 Composables | 掃描 Composables... | 掃描有封裝 API 的 composables |
| 7 | 產出 Dashboard 索引 | 產出 Dashboard 索引... | 生成/更新 ui-api-index-dashboard.md |
| 8 | 產出 Frontend 索引 | 產出 Frontend 索引... | 生成/更新 ui-api-index-frontend.md |
| 9 | 驗證索引文件 | 驗證索引文件... | 檢查索引文件格式和完整性 |
| 10 | 輸出結果統計 | 輸出結果... | 顯示掃描統計和索引位置 |

**重要**：
- 使用 TaskCreate 追蹤進度，但**禁止使用 Task tool 開啟 agent**
- 所有步驟都要在當前 session 中直接執行

### 1. 解析參數

```
掃描範圍 = $1 或 "all"
全量模式 = 參數包含 "--full"
```

### 2. 判斷掃描模式

- 檢查是否有 `--full` flag → 全量掃描
- 檢查 `/pull-frontend` 變動紀錄（如有）→ 增量掃描
- 否則 → 全量掃描

### 3. 掃描 API 定義

對每個目標專案，掃描 `api/core/*.ts`。

**效率優化**：不逐一讀取檔案，改用 Grep 直接提取 endpoint 資訊：

```bash
# 直接提取 requestClient 呼叫，取得 method 和 endpoint
rg "requestClient\.(get|post|patch|put|delete)\(['\"\`]" api/core/*.ts

# 輸出範例：
# cases.ts:282:  return requestClient.post('/estate-listings', data);
# cases.ts:357:  return requestClient.get('/bids', { params });
```

從輸出中提取：
- HTTP method（get/post/patch/put/delete）
- Endpoint（如 `/bids`）
- 檔案名稱可推斷 API 函數名稱

### 4. 掃描頁面級 API

掃描 `views/**/*.vue`：

```bash
# 找出有 import API 的頁面
rg -l "from ['\"]#/api" views/
```

對每個頁面：
1. 找 import 了哪些 API 函數
2. 找 `onMounted`、`onBeforeMount` 中呼叫的 API
3. 記錄「頁面載入 → API」

### 5. 掃描功能級 API

在同一批 `.vue` 檔案中：

1. 找互動元素：`<ElButton @click="xxx">`、`<ElTab>`
2. 追蹤 handler 函數到 API 呼叫
3. 記錄「操作 → handler → API」

### 6. 掃描 Dialog 元件

```bash
# 找出所有 Dialog 元件
rg -l "from ['\"]#/api" components/Dialog*.vue
```

對每個 Dialog：
1. 找 `handleSubmit`、`handleSave`、`handleConfirm` 函數
2. 找 `loadData`、`loadEditData`、`handleOpen` 函數
3. 記錄「Dialog 操作 → API」

### 7. 掃描 Composables（條件）

```bash
# 找出有封裝 API 的 composables
rg -l "(Api:|from ['\"]#/api|Api\()" composables/*.ts
```

對符合的 composable：
- 模式 A（參數注入）：記錄接受的 API 參數類型
- 模式 B（直接 import）：追蹤內部 API 呼叫

### 掃描效率優化原則

**重要**：避免逐一讀取所有檔案，會耗費大量 context。

| 方法 | 操作次數 | Context 消耗 |
|------|----------|-------------|
| ❌ 逐一讀取所有檔案 | 95+ 次 Read | 高 |
| ✅ Grep 篩選 + 讀取 | 3 次 Grep + 少量 Read | 低 |

**建議執行順序**：

1. Grep 提取 API 定義（取得 endpoint 對照表）
2. Grep 找出有 import API 的頁面清單
3. Grep 找出有 import API 的 Dialog 清單
4. Grep 找出有封裝 API 的 Composables
5. 只讀取「關鍵檔案」建立索引（如物件管理的核心頁面）
6. 其他檔案用 Grep 結果推斷

### 8. 產出索引文件

按以下格式產出 Markdown 索引：

```markdown
# [專案名稱] UI-API 索引

> 最後更新：[日期]
> 掃描 commit：[hash]

## [功能模組] ([路徑])

### 頁面：[頁面名稱] `[路由]`

**頁面檔案**：`[檔案路徑]`

| 操作 | 元件/函數 | API | HTTP Method |
|------|-----------|-----|-------------|
| [操作描述] | [函數名] | [endpoint] | [method] |

### Dialog：[Dialog 名稱]

**Dialog 檔案**：`[檔案路徑]`

| 操作 | 元件/函數 | API | HTTP Method |
|------|-----------|-----|-------------|
| [操作描述] | [函數名] | [endpoint] | [method] |
```

### 9. 驗證索引文件

檢查產出的索引文件：

**檢查項目**：
1. 檔案格式正確（Markdown 語法）
2. Header 資訊完整（日期、commit hash）
3. 表格結構完整（操作、元件/函數、API、HTTP Method）
4. 沒有空白或缺失的欄位

**驗證方式**：
- 讀取產出的索引文件
- 檢查是否有明顯的格式錯誤
- 確認 commit hash 正確

### 10. 輸出結果

顯示掃描結果：

```
✅ UI-API 索引建立完成

📊 掃描統計：
- 掃描模式：[全量/增量]
- 頁面數量：[N] 個
- Dialog 數量：[N] 個
- API 數量：[N] 個
- [增量模式] 新增/更新：[N] 個

📁 索引文件位置：
- prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md
- prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md

💡 下次更新：
   - /pull-frontend 有檔案更新 → 執行 /build-ui-index
   - /pull-frontend 沒有更新 → 不需要執行
```
