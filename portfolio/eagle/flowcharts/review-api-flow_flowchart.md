# review-api-flow 執行流程

```
/review-api-flow {apiName} 自動化執行流程
│
├─ 0. 【執行前準備】
│   ├─ AI 執行 clear（清空對話歷史）
│   └─ TaskCreate 建立追蹤步驟
│
├─ 0.5. 【確保 dev worktree 可用】（讀取後端程式碼用）
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
├─ 1. 【解析參數並讀取 Data Flow】
│   ├─ $1 = apiName（必填），無值 → 報錯退出
│   ├─ 搜尋 6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md
│   ├─ 找到 → 讀取文件，記錄 API 目錄（adminApi 或 publicApi）
│   └─ 找不到 → 報錯：「請先執行 /api-flow-architecture {apiName}」
│
├─ 2. 【判斷是否需要更新後端結構 + 提取前端 commit】
│   ├─ 提取 data-flow 文件中的 scan-meta commit hash
│   ├─ 取得 dev worktree HEAD commit hash（git -C {BACKEND_READ_PATH} rev-parse --short HEAD）
│   ├─ 後端：scan-meta == HEAD → 無變更，跳到 Step 3
│   └─ 後端：scan-meta != HEAD → 有變更
│       ├─ git -C {BACKEND_READ_PATH} diff --name-only {last-commit}..HEAD -- src/api/**/{apiName}/
│       ├─ 分類變更檔案：Entity / DTO / Service / Controller
│       ├─ 逐區塊處理（只處理有變的區塊）：
│       │   ├─ Entity 有變？ → 是：讀取→更新區塊+scan-meta→commit ✅ / 否：跳過
│       │   ├─ DTO 有變？ → 是：讀取→更新區塊+scan-meta→commit ✅ / 否：跳過
│       │   ├─ Service 有變？ → 是：讀取→更新區塊+scan-meta→commit ✅ / 否：跳過
│       │   └─ Controller 有變？ → 是：讀取→更新區塊+scan-meta→commit ✅ / 否：跳過
│       └─ 記錄後端變更狀態（哪些區塊有變）
│   ├─ 讀取前端索引表的掃描版本 commit
│   └─ 記錄後端/前端變更狀態（供 Step 3+4 使用）
│
├─ 3+4. 【讀取前端索引 + 執行 -c 檢查】（合併執行）
│   ├─ 判斷是否需要重跑 -c
│   │   ├─ 提取 data-flow -c 區塊的 frontend-commit
│   │   │   └─ 無 -c 區塊（首次）→ 完整執行 -c
│   │   ├─ 比對 frontend-commit vs 前端索引表 commit
│   │   │   ├─ 相同 + 後端沒變 → ⏭️ 跳過 -c，直接用現有結果
│   │   │   ├─ 相同 + 後端有變 → 🔄 用新後端結構 + 現有 UI 欄位重跑比對
│   │   │   └─ 不同 → git diff 確認 Vue 檔案是否有變
│   │   │       ├─ Vue 沒變 + 後端沒變 → ⏭️ 更新 frontend-commit，跳過 -c
│   │   │       ├─ Vue 沒變 + 後端有變 → 🔄 用新後端結構 + 現有 UI 欄位重跑比對
│   │   │       └─ Vue 有變 → 🔄 重讀 Vue 檔案重跑 -c
│   │   └─ git diff: git -C {frontend} diff --name-only {old}..{new} -- {vue-paths}
│   ├─ 讀取前端索引表（如需要）
│   │   ├─ adminApi → ui-api-index-dashboard.md
│   │   ├─ publicApi → ui-api-index-frontend.md
│   │   ├─ 找到 → 提取該 API 對應的所有頁面/Tab/Dialog 操作
│   │   ├─ 記錄前端檔案路徑（如 views/cases/objects/transcript-info.vue）
│   │   └─ 找不到 → 報錯：「請先執行 /build-ui-index」
│   ├─ 執行 -c 檢查（如需要，❌ 禁止啟動 agent）
│   │   ├─ Read 工具讀取前端 Vue 檔案（路徑已在索引表中）
│   │   ├─ 判斷：前端檔名 vs 後端 API 名稱是否一致？（命名混淆偵測）
│   │   ├─ 分析 template 和 script 中的 UI 欄位
│   │   ├─ Read 工具讀取 data-flow 文件
│   │   ├─ 提取 Response DTO 欄位和 Service 查詢結構
│   │   ├─ UI 欄位完整性（UI vs Response DTO 逐一比對）
│   │   │   ├─ ✅ 有對應
│   │   │   ├─ ❌ 缺失（UI 有但 response 沒有）
│   │   │   └─ ⚠️ 可疑（名稱不完全匹配）
│   │   ├─ DTO 欄位回傳保障（關聯 null、計算欄位）
│   │   └─ 500 防護檢查（5 種情境）
│   │       ├─ FK constraint violation
│   │       ├─ NOT NULL constraint violation
│   │       ├─ Unique constraint violation
│   │       ├─ 關聯資料 softDelete
│   │       └─ undefined/null 傳入 DB
│   ├─ Merge「## UI ↔ API 欄位對應」到 data-flow
│   │   ├─ scan-meta: commit + frontend-commit + date
│   │   └─ 如有命名混淆 →
│   │       ├─ -c 區塊加「### 命名對照（前後端混淆提醒）」
│   │       └─ Basic Info 區塊加「⚠️ 命名混淆提醒」+ 跨文件互標
│   └─ Git commit ✅
│
├─ 5. 【執行 -s 檢查：情境分析】
│   ├─ 讀取 data-flow 文件
│   ├─ 權限層級判斷
│   │   ├─ 讀取 {BACKEND_READ_PATH}/src/common/constants/permissions.constant.ts 該路由設定
│   │   ├─ 無設定 → auto-pass（JWT only），不標記權限問題
│   │   ├─ 有設定無 dataScope → ℹ️ 路由層級權限
│   │   └─ 有設定有 dataScope → 檢查 Service 是否實作過濾
│   │       ├─ 有實作 → ✅
│   │       └─ 未實作 → ⚠️ 需確認設計意圖
│   │           ├─ 可能原因 1：permissions.constant.ts 設定錯誤
│   │           ├─ 可能原因 2：Service 實作遺漏
│   │           └─ 建議與團隊確認設計意圖
│   ├─ 從前端索引表取得 UI 操作流程
│   │   ├─ 頁面載入 → 哪些 API
│   │   ├─ Tab 切換 → 哪些 API
│   │   ├─ 按鈕操作 → 哪些 API
│   │   └─ Dialog 操作 → 哪些 API
│   ├─ 畫出「前端 UI 情境流程圖」（文字版）
│   ├─ 讀取歷史文件（proposal/bug spec，如有）
│   │   └─ 畫出「歷史資料流流程圖」（文字版）
│   ├─ 聯集比對
│   │   ├─ UI 情境有但歷史沒提到 → 可能遺漏
│   │   ├─ 歷史有但 UI 沒覆蓋 → 可能是邊界案例
│   │   └─ 兩者都有 → 已覆蓋
│   ├─ 產出驗證 cases
│   │   ├─ 有值 case（DB 查詢條件 + 預期 response）
│   │   ├─ 沒值 case（DB 查詢條件 + 預期 null）
│   │   └─ 邊界 case（FK 不存在時預期 4XX）
│   ├─ Merge「## 情境分析」到 data-flow
│   └─ Git commit ✅
│
├─ 6. 【執行 -df 檢查：資料流鏈路驗證】
│   ├─ 讀取 data-flow 文件
│   ├─ Request 方向：前端欄位 → DTO → Service → DB
│   ├─ Response 方向：DB → Service select/relations → DTO → 前端
│   │   └─ 逐一比對：response 需要的欄位是否都在 select/relations 中
│   ├─ 逐情境驗證（搭配 Step 5 的情境）
│   │   ├─ 有值情境 → 欄位值是否正確傳遞
│   │   ├─ 沒值情境 → null 是否在每一層正確處理
│   │   └─ 邊界情境 → 錯誤是否在正確的層被攔截
│   ├─ Merge「## 資料流驗證」到 data-flow
│   └─ Git commit ✅
│
├─ 7. 【彙整問題清單】
│   ├─ 讀取 data-flow 文件
│   ├─ 收集所有問題並按嚴重度排序
│   │   ├─ ❌ 前後端不對齊的欄位
│   │   ├─ ❌ 資料流斷裂點
│   │   ├─ ❌ 500 未防護路徑
│   │   ├─ ⚠️ null 沒處理
│   │   └─ ⚠️ 文件過時提醒
│   ├─ Merge「## 問題清單」到 data-flow
│   └─ Git commit ✅
│
├─ 8. 【輸出結果 + 更新進度表】
    ├─ 讀取 data-flow 文件
    ├─ 產出完整報告
    │   ├─ 檢查統計（欄位/情境/資料流/500 防護）
    │   ├─ 問題清單（按嚴重度排序）
    │   ├─ 產出檔案位置
    │   └─ scan-meta: backend commit + frontend commit
    └─ 更新 api-flow-progress.md（如存在）
        ├─ Glob 檢查進度表是否存在
        ├─ 存在 → 讀取進度表 + data-flow 問題清單
        ├─ Edit 工具更新進度表狀態
        ├─ Read 工具驗證更新成功
        ├─ Git add + commit（失敗時報告錯誤，不做額外檢查）
        └─ 不存在 → 跳過並提示
```

## 步驟完成標準流程

每個步驟完成後必須執行（Step 1 除外）：

1. **Merge 結果到 data-flow 文件**（使用 replace-section.sh 避免 Edit 工具 400 error）
   - Step 4（-c 區塊）額外寫入 `frontend-commit`
   - **大區塊（Step 2/4/5/6/7）**：
     ```
     a. Write → /tmp/section-{apiName}-{step}.md（含 ## 標題 + scan-meta + 內容，不含尾部 ---）
     b. Bash: /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh {data-flow路徑} "## {區塊標題}" /tmp/section-{apiName}-{step}.md
     c. Read 驗證替換結果（讀取區塊起始 5 行確認 scan-meta）
     d. Bash: rm /tmp/section-{apiName}-{step}.md
     ```
   - **小區塊繼續用 Edit**：Step 4 命名混淆提醒、Step 8 進度表更新
2. **Git Commit**：`review-api-flow: {apiName} Step N - {步驟名稱}`
3. **TaskUpdate**：Task N → completed

## 程式碼讀取策略（前後端雙軌）

| 後端變更 | 前端 Vue 變更 | 行為 | Context 消耗 |
|---------|-------------|------|-------------|
| 無 | 無 | 只讀 data-flow 文件，跳過 -c | 最低 |
| 有 | 無 | data-flow + git diff 後端 + 現有 UI 欄位重跑比對 | 低 |
| 無 | 有 | data-flow + 重讀 Vue 重跑 -c | 低 |
| 有 | 有 | data-flow + 兩邊 git diff | 最小必要 |
| ❌ 每次都讀所有程式碼 | — | 禁止 | 高 |

## Task 流程

**自動化**：確保 worktree 可用 → 解析參數+讀取 data-flow → 判斷更新 → 讀取前端索引+-c 檢查 → -s 情境分析 → -df 資料流驗證 → 彙整問題 → 輸出結果+更新進度表

## 前置依賴

| 依賴 | 缺少時 |
|------|--------|
| `{apiName}-data-flow.md` | 報錯：請先執行 `/api-flow-architecture {apiName}` |
| `ui-api-index-*.md` | 報錯：請先執行 `/build-ui-index` |

## 後端程式碼讀取路徑

| 項目 | 路徑 |
|------|------|
| 主 repo（worktree 管理用） | `/Users/nicholas/Desktop/Projects/backend-nestjs` |
| BACKEND_READ_PATH（程式碼讀取用） | `/Users/nicholas/Desktop/Projects/backend-nestjs-dev-read` |
| worktree 分支 | `dev` |

> ⚠️ 所有讀取後端程式碼的操作都使用 BACKEND_READ_PATH，不直接讀取主 repo 的程式碼。
> 主 repo 路徑僅用於：fetch、worktree add/remove、setup-worktree-config.sh 腳本位置。
