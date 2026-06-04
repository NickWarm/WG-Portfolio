# api-flow-architecture 執行流程

```
/api-flow-architecture {apiName} [-p] [-pl] [--full] 執行流程
│
├─ 1. 【判斷執行模式】
│   ├─ 檢測 -p 參數
│   │   ├─ 有 -p → 進度追踪模式
│   │   │   ├─ 進度表不存在 → 建立總進度表
│   │   │   │   ├─ Step 1.5 建立 dev worktree（見下方）
│   │   │   │   ├─ 掃描 {BACKEND_READ_PATH}/src/api/adminApi/ 列出所有 API 目錄
│   │   │   │   ├─ 掃描 {BACKEND_READ_PATH}/src/api/publicApi/ 列出所有 API 目錄
│   │   │   │   ├─ 排除非 API 目錄（無 *.controller.ts 的目錄）
│   │   │   │   ├─ 比對 6_api_data_flow/ 判斷每個 API 狀態
│   │   │   │   ├─ 建立進度表（包含所有 API）
│   │   │   │   ├─ Git commit 進度表 ✅
│   │   │   │   └─ 跳到 Step 8 輸出結果
│   │   │   └─ 進度表已存在 → 顯示進度摘要（不需要 worktree）
│   │   │       ├─ 讀取進度表
│   │   │       ├─ 統計完成/進行中/未執行數量
│   │   │       └─ 顯示進度統計（不修改、不 commit）
│   │   └─ 跳到 Step 8 輸出結果
│   │
│   ├─ 檢測 -pl 參數（平行模式）
│   │   ├─ 解析逗號分隔的 apiName 列表（如 edm,transcript）
│   │   ├─ 無逗號分隔列表 → 報錯：「❌ -pl 需搭配多個 API，格式：api1,api2 -pl」
│   │   ├─ 檢查是否有 --full flag
│   │   └─ 進入平行模式 → 跳到 Step 1.5 → Phase 1
│   │
│   ├─ 有 apiName（含逗號但無 -pl）→ 報錯：「❌ 多 API 需搭配 -pl，格式：api1,api2 -pl」
│   │
│   ├─ 有 apiName（單一）→ API 結構文件模式
│   │   └─ 繼續 Step 1.5
│   │
│   └─ 無參數 → 報錯退出
│
├─ 1.5. 【確保 dev worktree 可用】（讀取後端程式碼用）
│   ├─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs fetch origin dev
│   ├─ 檢查 worktree 是否存在（test -d backend-nestjs-dev-read）
│   │   ├─ 存在 → 直接 pull
│   │   │   └─ git -C backend-nestjs-dev-read pull origin dev
│   │   └─ 不存在 → 建立 + 配置 + pull
│   │       ├─ git worktree add backend-nestjs-dev-read dev
│   │       ├─ setup-worktree-config.sh backend-nestjs-dev-read
│   │       └─ git -C backend-nestjs-dev-read pull origin dev
│   └─ 記錄 BACKEND_READ_PATH = /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
│
│   ┌─────────────────────────────────────────────────┐
│   │ 【平行模式 -pl】                                  │
│   │                                                   │
│   │ Phase 1：平行處理（背景 agent 各自獨立）            │
│   │ ├─ 對每個 apiName 啟動背景 agent                   │
│   │ │   ├─ Step 2-5：參數解析→定位→掃描模式→逐區塊處理  │
│   │ │   ├─ 所有後端讀取使用 BACKEND_READ_PATH（唯讀）   │
│   │ │   ├─ ⏭️ 跳過 Step 5 的 git commit               │
│   │ │   ├─ ⏭️ 跳過 Step 6（進度表）                    │
│   │ │   ├─ ⏭️ 跳過 Step 7（映射表）                    │
│   │ │   └─ 寫結果到 /tmp/api-flow-{apiName}-result.md  │
│   │ └─ 等待所有 agent 完成                             │
│   │                                                   │
│   │ Phase 2：合併階段（主對話序列執行）                  │
│   │ ├─ 讀取所有 /tmp/api-flow-*-result.md              │
│   │ ├─ 檢查各 agent 狀態（成功/失敗）                   │
│   │ ├─ 批次 git commit（僅成功的 data-flow 文件）       │
│   │ ├─ 批次更新進度表（僅成功的 API）                   │
│   │ ├─ 批次更新 /read-data-flow 映射表（僅成功的 API）  │
│   │ └─ 清理 /tmp/api-flow-*-result.md                  │
│   │                                                   │
│   │ → 跳到 Step 8 輸出結果（-pl 模式）                 │
│   └─────────────────────────────────────────────────┘
│
├─ 2. 【參數解析】
│   ├─ $1 = apiName（必填）
│   ├─ --full → 強制全量掃描
│   └─ 無 apiName → 報錯退出
│
├─ 3. 【定位後端程式碼】（使用 BACKEND_READ_PATH）
│   ├─ 搜尋 {BACKEND_READ_PATH}/src/api/adminApi/{apiName}/
│   ├─ 搜尋 {BACKEND_READ_PATH}/src/api/publicApi/{apiName}/
│   ├─ 找到 → 記錄 API 目錄（adminApi 或 publicApi）
│   └─ 找不到 → 報錯退出
│
├─ 4. 【判斷掃描模式】
│   ├─ 檢查 6_api_data_flow/ 是否已有 {apiName}-data-flow.md
│   │   ├─ 不存在 → 全量掃描模式
│   │   └─ 已存在 → 檢查 --full flag
│   │       ├─ 有 --full → 全量掃描模式
│   │       └─ 無 --full → 漸進式更新模式
│   │
│   ├─ 【全量掃描模式】
│   │   └─ 取得 dev worktree HEAD commit hash（git -C {BACKEND_READ_PATH} rev-parse --short HEAD）
│   │
│   └─ 【漸進式更新模式】
│       ├─ 讀取現有 data-flow 文件
│       ├─ 提取各區塊的 scan-meta（commit hash）
│       ├─ git -C {BACKEND_READ_PATH} diff --name-only {last-commit}..HEAD -- src/api/**/{apiName}/
│       ├─ 有變更 → 分類：Entity / DTO / Service / Controller
│       └─ 無變更 → 輸出「無需更新」並結束
│
├─ 5. 【逐區塊處理：讀取→分析→寫入→commit】（從 BACKEND_READ_PATH 讀取）
│   ├─ 首次建立：先 Write 文件骨架（# 標題 + ## 基本資訊 + ---）
│   ├─ 寫入方式：使用 replace-section.sh（避免 Edit 工具 400 error）
│   │   ├─ Write → /tmp/section-{apiName}-{block}.md（含 ## 標題 + scan-meta + 內容，不含尾部 ---）
│   │   ├─ Bash: /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh {path} "## {標題}" /tmp/section-{apiName}-{block}.md
│   │   ├─ Read 驗證替換結果（區塊起始 5 行）
│   │   └─ Bash: rm /tmp/section-{apiName}-{block}.md
│   ├─ 全量模式：依序處理四個區塊
│   │   ├─ 5a. Entity：讀取 *.entity.ts → 分析結構 → replace-section.sh → Git commit ✅
│   │   ├─ 5b. DTO：讀取 dto/*.dto.ts → 分析定義 → replace-section.sh → Git commit ✅
│   │   ├─ 5c. Service：讀取 *.service.ts → 分析結構 → replace-section.sh → Git commit ✅
│   │   └─ 5d. Controller：讀取 *.controller.ts → 分析結構 → replace-section.sh → Git commit ✅
│   │
│   └─ 漸進模式：只處理有變更的區塊
│       ├─ Entity 有變？ → 是：讀取→replace-section.sh→commit ✅ / 否：跳過
│       ├─ DTO 有變？ → 是：讀取→replace-section.sh→commit ✅ / 否：跳過
│       ├─ Service 有變？ → 是：讀取→replace-section.sh→commit ✅ / 否：跳過
│       └─ Controller 有變？ → 是：讀取→replace-section.sh→commit ✅ / 否：跳過
│
├─ 6. 【更新進度表】
│   ├─ API 結構文件模式：完成 Step 5 後執行
│   ├─ -p 模式：在 Step 1 已完成
│   ├─ 檢查進度表是否存在
│   │   ├─ 不存在 → 跳過
│   │   └─ 已存在 → 更新對應 API 進度 + git commit
│   └─ 進度表位置：prompts/6_api_data_flow/api-flow-progress.md
│
├─ 7. 【同步 /read-data-flow 映射表】
│   ├─ -p 模式 → 跳過
│   └─ API 結構文件模式：
│       ├─ 讀取 read-data-flow.md 定義檔的映射表
│       ├─ 檢查 apiName 是否已在映射表中
│       │   ├─ 已存在 → 跳過
│       │   └─ 不存在 → 新增映射行並寫入定義檔
│       └─ 輸出同步結果
│
└─ 8. 【輸出結果】
    ├─ API 結構文件模式：
    │   ├─ 掃描模式（全量/漸進）
    │   ├─ 掃描統計（Entity/DTO/Service/Controller 各幾個）
    │   ├─ 產出檔案位置
    │   └─ 漸進模式：變更摘要
    │
    ├─ 進度追踪模式（-p）：
    │   ├─ 進度統計（完整檢查/僅 architecture/未執行）
    │   ├─ 進度表位置
    │   └─ 使用提示
    │
    └─ 平行模式（-pl）：
        ├─ 各 API 處理結果表格（狀態/掃描模式/統計）
        ├─ 失敗的 API 及原因（如有）
        ├─ 批次 commit hash
        └─ 進度表/映射表更新狀態
```

## 後端程式碼讀取路徑

| 項目 | 路徑 |
|------|------|
| 主 repo（worktree 管理用） | `/Users/nicholas/Desktop/Projects/backend-nestjs` |
| BACKEND_READ_PATH（程式碼讀取用） | `/Users/nicholas/Desktop/Projects/backend-nestjs-dev-read` |
| worktree 分支 | `dev` |

> ⚠️ 所有讀取後端程式碼的操作都使用 BACKEND_READ_PATH，不直接讀取主 repo 的程式碼。
> 主 repo 路徑僅用於：fetch、worktree add/remove、setup-worktree-config.sh 腳本位置。

## 產出位置

| API 目錄 | 對應前端專案 | 產出位置 |
|----------|-------------|---------|
| adminApi/{apiName}/ | dashboard-nuxt | `prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md` |
| publicApi/{apiName}/ | frontend-nuxt | `prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md` |

## Task 流程

**進度追踪模式（-p 建立）**：判斷執行模式 → 確保 dev worktree 可用 → 掃描 API 目錄 → 建立進度表 → Git commit → 輸出結果

**進度追踪模式（-p 顯示）**：判斷執行模式 → 讀取進度表 → 顯示摘要（不需要 worktree）

**全量掃描**：判斷執行模式 → 確保 dev worktree 可用 → 參數解析 → 定位程式碼 → 判斷掃描模式 → 逐區塊處理（Entity→DTO→Service→Controller，每個讀取→分析→寫入→commit） → 更新進度表 → 同步映射表 → 輸出結果

**漸進式更新**：判斷執行模式 → 確保 dev worktree 可用 → 參數解析 → 定位程式碼 → 偵測變更 → 逐區塊處理（只處理有變的區塊） → 更新進度表 → 同步映射表 → 輸出結果

**平行模式（-pl）**：判斷執行模式 → 確保 dev worktree 可用 → Phase 1 平行（各 agent 從 BACKEND_READ_PATH 讀取）→ Phase 2 合併 → 輸出結果

## 效率原則

| 方法 | Context 消耗 |
|------|-------------|
| ❌ 四個區塊全部累積在 context 再一次寫入 | 高 |
| ✅ 逐區塊處理：讀完就寫入 + commit，context 分段釋放 | 中 |
| ✅ git diff 篩選 + 只處理有變的區塊（漸進式） | 低 |
| ✅ -p 模式只掃描檔案清單，不讀程式碼 | 最低 |
