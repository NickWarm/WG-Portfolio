---
description: 掃描 API 模組的權限錯誤訊息，生成修復 Proposal
argument-hint: <apiName>
design-doc: prompts/4_diary/debug/proposal/slash/fixPermissionError_skill_proposal.md
---

@.claude/flowcharts/fixPermissionError_flowchart.md

## 參數

- `$1`：API 模組名稱或 flag
  - 一般模式：adminApi 的 API 模組名稱（目錄名），例如 `estateListing`
  - `-list`：顯示掃描進度（不執行掃描）

## 前置依賴

- 範本文件存在：`prompts/4_diary/role_and_permission/design/permission_error_fix_pattern.md`
- 追蹤表存在：`prompts/4_diary/role_and_permission/permission-error-fix-progress.md`

## Task 追蹤機制（強制啟用）

| Task | Subject | activeForm |
|------|---------|------------|
| 1 | 讀取修復 Pattern 範本 | 讀取修復 Pattern 範本中... |
| 2 | 定位目標 API 檔案 | 定位目標 API 檔案中... |
| 3 | 掃描 Service 層 | 掃描 Service 層中... |
| 4 | 掃描 Controller 層 | 掃描 Controller 層中... |
| 5 | 分析匹配結果 | 分析匹配結果中... |
| 6 | 產出 Proposal | 產出 Proposal 中... |
| 7 | 輸出結果 | 輸出結果中... |
| 8 | 更新追蹤表 | 更新追蹤表中... |

## 任務

### Step P：參數模式判斷

```
$1 判斷
├─ 以 `-` 開頭 → 視為 flag
│   └─ `-list` → 進入清單模式（執行 Step L，跳過 Step 0~8）
└─ 其他 → 視為 apiName → 進入掃描模式（Step 0~8）
```

### Step L：顯示掃描進度（`-list` 專用）

1. 讀取追蹤表：`prompts/4_diary/role_and_permission/permission-error-fix-progress.md`
2. 解析統計數字和各 API 狀態
3. 輸出格式：

```
📊 權限錯誤掃描進度：{已掃描}/{總計}（{百分比}%）

| 結果 | 數量 |
|------|------|
| ❌ 需修正 | {N} |
| ⚠️ 需遷移 | {N} |
| ✅ 已修正 | {N} |
| ⏭️ 不適用 | {N} |

⏸️ 尚未掃描（{N} 個）：

【已有403 - 優先處理】
  {apiName}, {apiName}, ...

【400+404】
  {apiName}, {apiName}, ...

【只有400】
  {apiName}, {apiName}, ...

【特殊】
  {apiName}, {apiName}, ...

💡 建議下一個掃描：{apiName}（{初始分類}）
```

4. 建議下一個掃描的優先順序：已有403 > 400+404 > 只有400 > 特殊
5. 結束（不進入 Step 0~8）

### Step 0：建立進度追蹤

建立上方表格中的所有 Task。

### Step 1：讀取範本

讀取修復 Pattern 範本：
```
prompts/4_diary/role_and_permission/design/permission_error_fix_pattern.md
```

記住以下關鍵資訊：
- 問題模式定義（模式 A/B/C）
- 掃描標準和判斷矩陣
- 修復 Pattern（Service errorType + Controller Exception 映射）
- Proposal 產出模板

### Step 2：定位目標 API 檔案

```
檔案定位
│
├─ Glob: src/api/adminApi/{$1}/{$1}.service.ts
├─ Glob: src/api/adminApi/{$1}/{$1}.controller.ts
├─ Glob: src/api/adminApi/{$1}/services/*.service.ts（可選）
│
├─ 都找到 → 繼續
└─ 主要檔案找不到 → 報錯結束
```

### Step 3：掃描 Service 層

1. Grep `validate` 找出所有 validate 方法
2. Grep `dataScope|storeIds|storeId` 找權限相關邏輯
3. 讀取每個 validate 方法的完整邏輯，分析：
   - 是否有 errorType 回傳
   - 各失敗情境的 message 內容
   - 是否混淆「找不到」和「權限不足」
4. 找出所有使用 validate 回傳的 public methods
5. **分析 errorType 傳播鏈**（DF-4 reviewDoc 經驗：這是最容易遺漏的問題）：
   - 每個 public method 如何轉發 validation 結果？
   - `{ ...validation, data: null }` spread → ✅ 安全
   - `{ success: false, message: validation.message, data: null }` → ❌ 截斷 errorType
   - 記錄每個 method 的回傳 key name（`data` / `files` / 其他）
6. 判斷：有存取/權限驗證邏輯嗎？
   - 有 → 繼續
   - 無（只有資料格式驗證）→ 跳到 Step 7 報告不適用

> **重要**：區分「存取/權限驗證」和「資料格式驗證」。只有前者需要修正。

### Step 4：掃描 Controller 層

1. 讀取 import 區塊，找 Exception 類型
2. Grep `throw new` 統計各 Exception 使用
3. 找出所有 handler 中的錯誤處理模式
4. **找出軟性錯誤 handler**：搜尋 `return { success: false` 但不 throw Exception 的 handler，記錄為「後續改進項」
5. 若已有 ForbiddenException，判斷使用的模式：
   - errorType 分支 → ✅ 已修正
   - messageEN 字串匹配 → ⚠️ 需遷移
   - result.type 非標準命名 → ⚠️ 需統一
6. 對照 Step 3 的掃描結果，列出需修正的 handler + 軟性錯誤 handler（分開列）

### Step 5：分析匹配結果

套用範本的判斷矩陣：

| Service 有權限檢查 | Service 有 errorType | Controller 有 403 | 結論 |
|:---:|:---:|:---:|------|
| ✅ | ❌ | ❌ | ❌ 需要修正 |
| ✅ | ❌ | ✅ | ⚠️ 部分修正 |
| ✅ | ✅ | ✅ | ✅ 已修正 |
| ❌ | — | — | ⏭️ 不適用 |

- ❌ 或 ⚠️ → 繼續 Step 6
- ✅ 或 ⏭️ → 跳到 Step 7

### Step 6：產出 Proposal

套用範本的「Proposal 產出模板」，包含：
1. 標頭（apiName、日期、出處引用）
2. 問題摘要表
3. 現況 vs 修改後對照表
4. Service 具體修改（validate 方法 + public method 傳播鏈 + 回傳 key name）
5. Controller 具體修改（throw Exception handler 的 errorType 分支）
6. 軟性錯誤 handler 清單（後續改進項，不在本次修正範圍）
7. 預期修改檔案清單
8. 驗證建議
9. （⚠️ 模式限定）次優模式遷移指引

寫入路徑：
```
prompts/4_diary/role_and_permission/debug/{MMDD}_{apiName}_permission_error_fix_proposal.md
```

> {MMDD} 用 `date +%m%d` 取得。

### Step 7：輸出結果

**有問題時**：
```
✅ 掃描完成：{apiName}

## 掃描結果
[掃描摘要表]

## 產出 Proposal
📄 {proposal 路徑}

📋 接下來請依序執行：
1. /reviewDoc    ← 檢核 proposal
2. /rrDoc        ← 按檢核建議修正後再檢核
3. /implement    ← 實作
4. /check-result ← 驗證
5. /gcommit-push ← commit + push
```

**無問題時**：
```
✅ {apiName} 不需要修正

## 原因
{具體原因}
```

### Step 7.5：更新追蹤表（僅 ✅/⏭️ 時）

追蹤表路徑：
```
prompts/4_diary/role_and_permission/permission-error-fix-progress.md
```

**執行條件**：結果為 ✅ 已修正 或 ⏭️ 不適用時才執行。❌ 需修正 / ⚠️ 需遷移時跳過（由 `/gcommit-push` 更新）。

1. 讀取追蹤表
2. 找到該 API 的行，更新：
   - 「掃描」欄位 → ✅
   - 「結果」欄位 → ✅ 已修正 / ⏭️ 不適用
   - 「日期」欄位 → 當天日期（`date +%m-%d`）
3. 更新追蹤表頂部所有統計區塊：
   a. 「進度統計」：重算「✅ 已掃描」和「⏸️ 尚未掃描」的數量和百分比
   b. 「掃描結果分佈」：重算對應結果的數量，並在「說明」欄更新 API 名稱清單
   c. 「最後更新」：更新日期為當天
