---
description: 掃描 API 模組的 DTO id 欄位，自動加入 @Type(() => Number) 轉型
argument-hint: <apiName | -list>
design-doc: prompts/4_diary/debug/proposal/slash/fix-id-string-number_skill_proposal.md
---

@.claude/flowcharts/fix-id-string-number_flowchart.md

## 參數

- `$1`：API 模組名稱（如 `estateListing`）或 `-list`

## -list 模式

當 `$1` 為 `-list` 時，不執行掃描，直接輸出進度摘要：

1. 讀取追蹤表 `prompts/4_diary/debug/id-type-fix-progress.md`
   - 不存在 → 提示「尚未執行過，請先執行 /fix-id-string-number {apiName}」
2. 提取統計數字（已掃描、已修正、不適用、需人工）
3. 篩選「掃描」欄位為 ✅ 的行
4. 輸出：

```
📊 id Type 修正進度

## 統計
- 已掃描：N / 51（X%）
- ✅ 已修正：N
- ⏭️ 不適用：N
- ⚠️ 需人工：N

## 已掃描 API

| # | API 模組 | 結果 | 修正數 | Commit | 日期 |
|---|---------|------|--------|--------|------|
| 24 | estateTransaction | ✅ 已修正 | 2 | `d5abc57f` | 0220 |

📌 還有 {N} 個 API 未掃描
```

> 不建立 Task、不修改任何檔案。

## 掃描模式（$1 為 apiName）

## 前置依賴

- 追蹤表：`prompts/4_diary/debug/id-type-fix-progress.md`（首次執行自動建立）

## Task 追蹤機制（強制啟用）

| Task | Subject | activeForm |
|------|---------|------------|
| 1 | 定位目標 DTO 檔案 | 定位 DTO 檔案中... |
| 2 | 掃描 @IsNumber() + id 欄位 | 掃描 DTO 中... |
| 3 | 分類 DTO 類型 | 分類 DTO 中... |
| 4 | 自動修正 | 修正 DTO 中... |
| 5 | Build 驗證 | 執行 Build... |
| 6 | 產出 Proposal | 產出 Proposal 中... |
| 7 | 更新追蹤表 | 更新追蹤表中... |
| 8 | 輸出結果 | 輸出結果中... |

## 任務

### Step 0：建立進度追蹤

建立上方表格中的所有 Task。

### Step 1：定位目標 DTO 檔案

```
檔案定位
│
├─ Glob: src/api/adminApi/{$1}/**/*.dto.ts
│
├─ 找到 → 記錄所有 DTO 檔案路徑，繼續
└─ 找不到 → 報錯結束：「{$1} 沒有 DTO 檔案」
```

### Step 2：掃描 @IsNumber() + id 欄位

對每個 DTO 檔案：

1. Grep `@IsNumber()` 找出所有位置（含行數）
2. 每個 `@IsNumber()` 往下一行，確認欄位名是否為 `id`：
   - 匹配 `/^\s+id[?]?\s*:\s*number/` → 是 id 欄位
   - 不匹配 → 跳過
3. 確認是 id 欄位後，往上讀 3-5 行 decorator 區塊：
   - 有 `@Type(() => Number)` → ✅ 已修正
   - 有 `@Transform(` 且內容含 `Number(` → ✅ 已修正（替代方案）
   - 都沒有 → ❌ 需修正
4. 往上搜尋最近的 `class XXX {` → 記錄所屬 DTO 類別名
5. 記錄：DTO 類別名、行數、修正狀態

### Step 3：分類 DTO 類型

對每個找到的 ❌ 欄位，判斷所屬 DTO 類別的用途：

| 類別名 Pattern | 分類 | 處理 |
|---------------|------|------|
| `Update*Dto` | Request Body | ❌ 需修正 |
| `Create*Dto` 且 id 有 `@IsNumber()` | Request Body | ❌ 需修正（巢狀 DTO 中的 id） |
| `*QueryDto` / `*FilterDto` | Query Params | ⏭️ 跳過 |
| `*ResponseDto` / `*ResultDto` | Response | ⏭️ 跳過 |
| 其他 | 需確認 | ⚠️ 讀 Controller 確認 |

**統計輸出**：

```
📊 掃描結果統計
- 需修正：N 個
- 已修正：N 個
- 不適用：N 個
```

### Step 4：判斷結果

- 全部 ✅ 或全部 ⏭️ → 跳到 Step 7（不產出 proposal）
- 有 ❌ → 繼續 Step 5

### Step 5：自動修正

**5.1 確認 import**：

```
Import 處理
│
├─ Grep "from 'class-transformer'" → 找 import 行
│
├─ 有 import 行
│   ├─ 已包含 Type → 不動
│   └─ 不包含 Type → 在 import specifiers 中加入 Type
│
└─ 沒有 import 行
    └─ 在 import 區塊中加入：import { Type } from 'class-transformer'
```

**5.2 修正欄位**：

對每個 ❌ 欄位，使用 Edit 工具：

```typescript
// old_string
@IsNumber()
id: number

// new_string
@Type(() => Number)
@IsNumber()
id: number
```

> ⚠️ 注意 `@IsNumber()` 可能帶參數如 `@IsNumber({}, { each: true })`，Edit 時要匹配完整行

**5.3 記錄修改清單**

### Step 6：Build 驗證

```bash
cd /Users/nicholas/Desktop/Projects/backend-nestjs && yarn build
```

- 成功 → 繼續
- 失敗 → 分析錯誤，修正後重 build

### Step 7：產出輕量 Proposal

**有修正時**，寫入 proposal：

路徑：`prompts/4_diary/debug/{MMDD}_{apiName}_id_type_fix_proposal.md`

> `{MMDD}` 用 `date +%m%d` 取得

格式：

```markdown
# {apiName} id Type 修正

> 📅 修正日期：YYYY-MM-DD
> 🔧 由 /fix-id-string-number 自動產出

## 問題描述

Request Body DTO 的 id 欄位缺少 `@Type(() => Number)`，前端送 string 時驗證失敗。

## 掃描結果

| # | DTO 類別 | 欄位 | 行數 | 修正前 | 狀態 |
|---|---------|------|------|--------|------|
| 1 | {ClassName} | id | {line} | 缺少 @Type | ✅ 已修正 |

## 修改檔案清單

- src/api/adminApi/{apiName}/dto/{apiName}.dto.ts

## Build 結果

✅ Build 通過
```

**無修正時**，不產出 proposal。

### Step 8：更新追蹤表

追蹤表路徑：`prompts/4_diary/debug/id-type-fix-progress.md`

**首次執行**：追蹤表不存在時，自動建立（含 51 個 API 模組）。
- `estateTransaction` 初始化時直接標記 ✅（已手動修正）

**更新內容**：
1. 找到該 API 的行
2. 更新：
   - 「掃描」欄位 → ✅
   - 「結果」欄位 → ✅ 已修正 / ⏭️ 不適用 / ⚠️ 需人工
   - 「修正數」欄位 → N（修正了幾個 id 欄位）
   - 「日期」欄位 → 當天日期（`date +%m%d`）
3. 重算頂部統計數字（已掃描數量、百分比）

### Step 9：輸出結果

**有修正時**：

```
✅ 掃描完成：{apiName}

## 掃描結果

| # | DTO 類別 | 欄位 | 行數 | 狀態 |
|---|---------|------|------|------|
| 1 | ... | id | ... | ✅ 已修正 |

## Build 結果
✅ Build 通過

## 產出 Proposal
📄 {proposal 路徑}

📋 接下來請執行：
▸ /gcommit-push {proposal-path}    ← commit + push
```

**無修正時**：

```
✅ {apiName} 不需要修正

## 原因
{具體原因：沒有 @IsNumber() id 欄位 / 已全部修正}
```

---

## gcommit-push 整合（待 /updateDesign 同步）

gcommit-push 需新增 Step 13.8：

**偵測條件**：proposal 路徑匹配 `*_id_type_fix_proposal.md`

**動作**：
1. 從路徑提取 `{apiName}`
2. 更新 `prompts/4_diary/debug/id-type-fix-progress.md`：
   - 「Commit」欄位 → commit hash
3. 重算統計數字

> ⚠️ 此整合需透過 `/updateDesign gcommit-push` 同步
