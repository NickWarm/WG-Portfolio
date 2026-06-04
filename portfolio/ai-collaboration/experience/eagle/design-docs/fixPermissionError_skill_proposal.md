# /fixPermissionError 設計稿

> 📅 建立日期：2026-02-20

---

## 問題描述

estateMedia DF-4 發現一個可能廣泛存在的問題模式：

- Service 的 validate 方法不區分「找不到」和「無權限」，dataScope 權限不足時回傳「找不到」
- Controller 統一使用 `BadRequestException(400)`，不區分 404/403
- 前端 toast 顯示誤導訊息，讓使用者以為資料遺失

初始掃描顯示：15 個 Controller 只用 BadRequestException，32 個有 NotFoundException 但無 ForbiddenException。需要一個 skill 來逐一掃描各 API 模組，自動生成修復 proposal。

**工作模式**：獨立運作，不串入 dpf → reviewDoc → implement 的自動流程。每個 API 單獨處理：

```
/fixPermissionError {apiName}  → 產出 proposal
/reviewDoc                     → 檢核
/rrDoc                         → 修正後再檢核
/implement                     → 實作
/check-result                  → 驗證
/gcommit-push                  → commit + push
→ 換下一個 API 再跑一次
```

---

## 執行流程圖

```
/fixPermissionError {apiName} 執行流程
│
├─ 0. 【建立進度追蹤】
│   └─ TaskCreate 建立所有步驟
│
├─ 1. 【讀取範本】
│   └─ 讀取 permission_error_fix_pattern.md
│       ├─ 問題模式定義
│       ├─ 掃描標準
│       ├─ 修復 Pattern
│       └─ Proposal 產出模板
│
├─ 2. 【定位目標 API 檔案】
│   ├─ 找 Service：src/api/adminApi/{apiName}/{apiName}.service.ts
│   ├─ 找 Controller：src/api/adminApi/{apiName}/{apiName}.controller.ts
│   ├─ 找子 Service（如有）：src/api/adminApi/{apiName}/services/*.service.ts
│   ├─ 都找到 → 繼續
│   └─ 找不到 → 報錯結束
│
├─ 3. 【掃描 Service】
│   ├─ 3.1 找出所有 validate* 方法
│   ├─ 3.2 搜尋 dataScope / storeIds / storeId 相關邏輯
│   ├─ 3.3 分析各 validate 方法的錯誤回傳
│   │   ├─ 是否有 errorType 欄位
│   │   ├─ 各失敗情境的 message 內容
│   │   └─ 是否混淆「找不到」和「權限不足」
│   ├─ 3.4 找出使用 validate 回傳的 public methods
│   ├─ 3.5 分析 errorType 傳播鏈
│   │   ├─ spread（{ ...validation, data: null }）→ ✅ 安全
│   │   ├─ 逐欄位（{ message: validation.message }）→ ❌ 截斷 errorType
│   │   └─ 記錄每個 method 的回傳 key name（data / files / 其他）
│   └─ 3.6 判斷：有存取/權限驗證邏輯？
│       ├─ 有 → 繼續
│       └─ 無（只有資料格式驗證）→ Step 7 報告不適用
│
├─ 4. 【掃描 Controller】
│   ├─ 4.1 檢查 import 的 Exception 類型
│   ├─ 4.2 統計各 Exception 使用頻率
│   ├─ 4.3 找出所有 throw new ...Exception 語句
│   ├─ 4.4 找出軟性錯誤 handler（return { success: false } 不丟 Exception）
│   └─ 4.5 對照 Service 錯誤情境，列出需修正的 handler + 軟性錯誤 handler
│
├─ 5. 【分析匹配結果】
│   ├─ 套用範本的判斷矩陣
│   ├─ ❌ 需要修正 → 繼續 Step 6
│   ├─ ⚠️ 部分修正（已有 403 但用字串匹配/非標準命名）→ 繼續 Step 6（含遷移指引）
│   └─ ✅ 已修正 / ⏭️ 不適用 → Step 7 報告結果
│
├─ 6. 【產出 Proposal】
│   ├─ 6.1 套用範本的 Proposal 產出模板
│   ├─ 6.2 生成問題摘要表
│   ├─ 6.3 生成現況 vs 修改後對照表
│   ├─ 6.4 生成 Service 具體修改（含傳播鏈分析 + 回傳 key name）
│   ├─ 6.5 生成 Controller 具體修改（throw Exception handler）
│   ├─ 6.6 生成軟性錯誤 handler 清單（後續改進項）
│   ├─ 6.7 生成預期修改檔案清單
│   ├─ 6.8 生成驗證建議
│   ├─ 6.9 （⚠️ 模式）生成次優模式遷移指引
│   └─ 6.10 寫入檔案：prompts/4_diary/role_and_permission/debug/{MMDD}_{apiName}_permission_error_fix_proposal.md
│
├─ 7. 【輸出結果】
│   ├─ 有問題 → 顯示掃描摘要 + proposal 路徑 + 後續步驟提醒
│   └─ 無問題 → 顯示「不需要修正」+ 原因
│
├─ 7.5 【更新追蹤表】（僅 ✅/⏭️ 時）
│   ├─ 結果為 ✅ 已修正 或 ⏭️ 不適用 → 更新追蹤表
│   ├─ 結果為 ❌ 或 ⚠️ → 跳過（由 /gcommit-push 更新）
│   └─ 更新內容：
│       ├─ 該 API 的「掃描」欄位 → ✅
│       ├─ 該 API 的「結果」欄位 → ✅ 已修正 / ⏭️ 不適用
│       ├─ 該 API 的「日期」欄位 → 當天日期
│       ├─ 更新「進度統計」（已掃描數量 + 百分比）
│       ├─ 更新「掃描結果分佈」（結果數量 + API 清單）
│       └─ 更新「最後更新」日期
│
└─ 8. 【更新進度】
    └─ 標記所有 Task 為 completed
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 是 | adminApi 的 API 模組名稱（目錄名） | `estateListing` |

---

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

**規則**：
- 開始步驟時 → `TaskUpdate(status: 'in_progress')`
- 完成步驟時 → `TaskUpdate(status: 'completed')`
- 遇到阻塞時 → 保持 `in_progress`，說明原因

---

## 輸出格式

### 有問題時

```markdown
✅ 掃描完成：{apiName}

## 掃描結果
| 項目 | 結果 |
|------|------|
| validate 方法 | N 個（M 個涉及權限邏輯） |
| dataScope/storeIds 邏輯 | ✅ 有 / ❌ 無 |
| Controller Exception | 只有 BadRequestException / 有 NotFoundException 但無 ForbiddenException |
| 問題數 | N 個 |

## 產出 Proposal
📄 `prompts/4_diary/role_and_permission/debug/{MMDD}_{apiName}_permission_error_fix_proposal.md`

📋 接下來請依序執行：
1. /reviewDoc    ← 檢核 proposal
2. /rrDoc        ← 按檢核建議修正後再檢核
3. /implement    ← 實作
4. /check-result ← 驗證
5. /gcommit-push ← commit + push
```

### 無問題時

```markdown
✅ {apiName} 不需要修正

## 原因
{具體原因，例如：}
- Service 已有 errorType 欄位區分錯誤類型
- Controller 已有 NotFoundException / ForbiddenException 分支
- Service 無權限/存取驗證邏輯（只有資料格式驗證）
```

---

## 實作細節

### 需要讀取的檔案

| 檔案 | 用途 | 讀取時機 |
|------|------|----------|
| `prompts/4_diary/role_and_permission/design/permission_error_fix_pattern.md` | 問題模式 + 修復 pattern + proposal 模板 | Step 1 |
| `src/api/adminApi/{apiName}/{apiName}.service.ts` | 掃描 validate 方法和權限邏輯 | Step 3 |
| `src/api/adminApi/{apiName}/{apiName}.controller.ts` | 掃描 Exception 使用 | Step 4 |
| `src/api/adminApi/{apiName}/services/*.service.ts`（如存在）| 掃描子 Service | Step 3 |

### 掃描邏輯細節

#### Step 3：Service 層掃描

```
掃描策略
│
├─ 3.1 Grep "validate" → 找出所有 validate 方法名
│   └─ 讀取每個 validate 方法的完整邏輯
│
├─ 3.2 Grep "dataScope|storeIds|storeId" → 找權限相關邏輯
│   └─ 分析這些邏輯在錯誤回傳中的表現
│
├─ 3.3 分析每個 validate 方法的回傳
│   ├─ 有 errorType → 記錄為「已修正」
│   ├─ 無 errorType + 有權限邏輯 → 記錄為「需要修正」
│   └─ 無 errorType + 無權限邏輯（純資料驗證）→ 記錄為「不適用」
│
├─ 3.4 找出使用 validate 回傳的 public methods
│   └─ Grep "validation.success|validation.message" 或類似 pattern
│
├─ 3.5 分析 errorType 傳播鏈（DF-4 reviewDoc 經驗）
│   ├─ 每個 public method 如何轉發 validation 結果？
│   │   ├─ { ...validation, data: null } → ✅ spread 安全
│   │   └─ { success: false, message: validation.message, data: null } → ❌ 截斷
│   ├─ 記錄每個 method 的回傳 key name
│   │   ├─ 大多數用 data: null
│   │   └─ 特殊 key（如 uploadFiles 用 files: []）需個別處理
│   └─ 標記需要修改的 method 和修改方式
│
└─ 3.6 判斷整體結論
    ├─ 至少一個 validate 方法「需要修正」→ 有問題
    └─ 全部「已修正」或「不適用」→ 無問題
```

#### Step 4：Controller 層掃描

```
掃描策略
│
├─ 4.1 讀取 import 區塊
│   └─ 找 BadRequestException, NotFoundException, ForbiddenException
│
├─ 4.2 Grep "throw new" → 統計各 Exception
│   ├─ 只有 BadRequestException → 全部需要修正
│   ├─ 有 NotFoundException 無 ForbiddenException → 部分需要修正
│   └─ 已有 ForbiddenException → 檢查是否用 errorType 分支
│       ├─ 用 errorType 分支 → ✅ 已修正
│       ├─ 用 messageEN 字串匹配 → ⚠️ 次優，需遷移
│       └─ 用 result.type（非標準命名）→ ⚠️ 次優，需統一命名
│
├─ 4.3 找出軟性錯誤 handler
│   ├─ 搜尋 return { success: false 但不 throw Exception 的 handler
│   └─ 記錄為「後續改進項」（FORBIDDEN 時前端收 200，不觸發錯誤 toast）
│
└─ 4.4 對照 Service 掃描結果
    └─ 列出：需修正的 handler + 軟性錯誤 handler（分開列）
```

### Proposal 產出邏輯

1. 讀取範本的「Proposal 產出模板」區塊
2. 根據 Step 3-5 的掃描結果填入具體內容
3. 每個 validate 方法獨立分析，列出所有失敗情境
4. 為每個情境指定 errorType 和對應 Exception
5. 為每個 public method 分析傳播鏈：標記截斷問題 + 記錄回傳 key name
6. 為每個 Controller handler 生成修改程式碼（throw Exception 的 handler）
7. 獨立列出軟性錯誤 handler（不丟 Exception），標記為「後續改進項」
8. 若為 ⚠️ 部分修正模式，生成次優模式遷移指引（字串匹配 → errorType / type → errorType）

### 注意事項

1. **只掃描 adminApi**：不含 publicApi
2. **大型 Service 分段讀取**：超過 2000 行時分段讀取
3. **子 Service 檔案**：有些模組（如 estateListing、estateTransaction）有 `services/` 子目錄，需一併掃描
4. **不產出前端修改**：前端統一錯誤處理不受影響
5. **已修正的 API**：estateMedia 已完成，跑此 skill 應顯示「不需要修正」
6. **次優模式提示**：若 API 已有 ForbiddenException 但用字串匹配（如 estateTransaction），proposal 應建議改為 errorType 模式

---

## Skill 定義檔

**檔案位置**: `backend-nestjs/.claude/commands/fixPermissionError.md`

```markdown
---
description: 掃描 API 模組的權限錯誤訊息，生成修復 Proposal
argument-hint: <apiName>
design-doc: prompts/4_diary/debug/proposal/slash/fixPermissionError_skill_proposal.md
---

@.claude/flowcharts/fixPermissionError_flowchart.md

## 參數

- `$1`：adminApi 的 API 模組名稱（目錄名），例如 `estateListing`

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
```

---

## 流程圖檔案

**檔案位置**: `backend-nestjs/.claude/flowcharts/fixPermissionError_flowchart.md`

內容即本設計稿「執行流程圖」區塊的流程圖。

---

## 設計變更

### 2026-02-20：新增追蹤表機制

**問題描述**：

執行 `/fixPermissionError` 掃描各 API 後，沒有集中紀錄哪些掃過、哪些沒掃過，無法追蹤整體進度。

**設計決策**：

新增追蹤表 `prompts/4_diary/role_and_permission/permission-error-fix-progress.md`，預填所有 API 的初始分類。更新時機依掃描結果分為兩個觸發點：

| 掃描結果 | 更新時機 | 更新者 |
|---------|---------|--------|
| ⏭️ 不適用 | 掃描完成後立即 | `/fixPermissionError` Step 7.5 |
| ✅ 已修正 | 掃描完成後立即 | `/fixPermissionError` Step 7.5 |
| ❌ 需修正 | commit 推送後 | `/gcommit-push` Step 6.7 |
| ⚠️ 需遷移 | commit 推送後 | `/gcommit-push` Step 6.7 |

**修改內容**：

1. **fixPermissionError**：
   - 前置依賴加入追蹤表路徑
   - Task 追蹤表加入 Task 8「更新追蹤表」
   - 新增 Step 7.5「更新追蹤表」（僅 ✅/⏭️ 時執行）
2. **gcommit-push**：
   - 新增 Step 6.7「更新 fixPermissionError 追蹤表」（偵測 proposal 路徑含 `role_and_permission`）

**實作狀態**：

- [x] 設計討論（2026-02-20）
- [x] 記錄到 fixPermissionError 設計稿（2026-02-20）
- [x] 記錄到 gcommit-push 設計稿（2026-02-20）
- [x] 建立追蹤表（預填初始分類）（2026-02-20）
- [x] 更新 `fixPermissionError.md` 定義檔（2026-02-20）
- [x] 更新 `fixPermissionError_flowchart.md` 流程圖（2026-02-20）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-20）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-20）

### 2026-02-20：新增 `-list` 參數（顯示掃描進度）

**問題描述**：

掃描了幾個 API 後，沒有快速方式查看「哪些掃過、哪些還沒掃」，每次都要手動開追蹤表檔案看進度。

**設計決策**：

新增 `-list` 參數，讓 `/fixPermissionError -list` 讀取追蹤表並輸出掃描進度摘要。

**參數偵測邏輯**：

```
$1 判斷
├─ 以 `-` 開頭 → 視為 flag
│   └─ `-list` → 進入清單模式（跳過 Step 0~8，直接執行 Step L）
└─ 其他 → 視為 apiName → 進入原本掃描流程（Step 0~8）
```

**Step L：顯示掃描進度**（`-list` 專用）：

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

**不影響原本流程的理由**：

- `-list` 在 Step 0 之前就分流，完全獨立的執行路徑
- 不建立 Task、不讀取範本、不掃描程式碼、不產出 Proposal
- 只讀取追蹤表，只輸出文字，無任何檔案寫入

**修改內容**：

1. **fixPermissionError 定義檔**：
   - 參數區塊新增 `-list` 說明
   - 在 Step 0 之前新增「Step P：參數模式判斷」
   - 新增「Step L：顯示掃描進度」
2. **fixPermissionError 流程圖**：
   - 頂部新增模式判斷分支
   - 新增 `-list` 獨立路徑

**實作狀態**：

- [x] 設計討論（2026-02-20）
- [x] 記錄到 fixPermissionError 設計稿（2026-02-20）
- [x] 更新 `fixPermissionError.md` 定義檔（2026-02-20）
- [x] 更新 `fixPermissionError_flowchart.md` 流程圖（2026-02-20）

### 2026-02-21：Step 7.5 統計更新指示不夠明確

**問題描述**：

另一個 AI 執行 `/fixPermissionError auth` 時，Step 7.5 只更新了 auth 那一行，但漏了重算頂部統計數字。原因是定義檔 Step 7.5 第 3 點只寫「重算頂部統計數字（已掃描數量、百分比）」，但追蹤表頂部其實有 3 個需要更新的區塊：

| 區塊 | 原本指示 | 問題 |
|------|---------|------|
| 進度統計（已掃描/尚未掃描） | 有提到但不完整 | 只說「已掃描數量、百分比」 |
| 掃描結果分佈（數量 + API 清單） | ❌ 沒提到 | 需更新數量和說明欄的 API 名稱 |
| 最後更新日期 | ❌ 沒提到 | 應同步更新 |

**設計決策**：

Step 7.5 第 3 點展開為明確的 3 個子步驟：

```
3. 更新追蹤表頂部所有統計區塊：
   a. 「進度統計」：重算「✅ 已掃描」和「⏸️ 尚未掃描」的數量和百分比
   b. 「掃描結果分佈」：重算對應結果的數量，並在「說明」欄更新 API 名稱清單
   c. 「最後更新」：更新日期為當天
```

流程圖對應展開：

```
├─ 更新「進度統計」（已掃描數量 + 百分比）
├─ 更新「掃描結果分佈」（結果數量 + API 清單）
└─ 更新「最後更新」日期
```

**修改內容**：

1. **fixPermissionError 定義檔**：Step 7.5 第 3 點展開為 3 個子步驟
2. **fixPermissionError 流程圖**：Step 7.5 的「重算統計數字」展開為 3 行

**實作狀態**：

- [x] 設計討論（2026-02-21）
- [x] 記錄到 fixPermissionError 設計稿（2026-02-21）
- [x] 更新 `fixPermissionError.md` 定義檔（2026-02-21）
- [x] 更新 `fixPermissionError_flowchart.md` 流程圖（2026-02-21）
