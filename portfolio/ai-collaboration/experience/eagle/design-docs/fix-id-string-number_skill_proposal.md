# fix-id-string-number 設計稿

> 📅 建立日期：2026-02-20

---

## 問題描述

### 現況痛點

前端送 JSON body 時，`number` 類型欄位可能以 `string` 形式送出（如 `"id": "1"`）。NestJS 的 `@IsNumber()` decorator 不會自動轉型，直接驗證失敗 → 400 error。

**需要修正的情況**：
- `@IsNumber()` 前面沒有 `@Type(() => Number)` 或等效 `@Transform`
- 只影響 Request Body DTO（Update\*Dto、Create\*Dto 中的巢狀 DTO）
- Query DTO 通常已有 `@Transform(parseInt)` 或 `@Transform(({ value }) => ...)` 處理

**已知案例**：
- `estateTransaction` 的 9 個 Update DTO 中，7 個 id 欄位缺少 `@Type(() => Number)`（已修正，commit `83425a0e` + `bbe98858`）
- 51 個 adminApi 模組可能都有相同問題

### 預期效益

- 系統化掃描所有 API 模組，避免遺漏
- 自動修正 + build 驗證，快速批量處理
- 追蹤表記錄進度，方便分批執行

---

## 執行流程圖

```
/fix-id-string-number {$1} 執行流程
│
├─ 入口分流
│   ├─ $1 === '-list' → 列表模式（讀追蹤表 → 輸出摘要 → 結束）
│   └─ 其他 → 掃描模式（繼續 Step 0）
│
├─ 0. 【建立進度追蹤】
│   └─ TaskCreate 建立所有步驟
│
├─ 1. 【定位目標 DTO 檔案】
│   ├─ Glob: src/api/adminApi/{apiName}/**/*.dto.ts
│   ├─ 找到 → 繼續
│   └─ 找不到 → 報錯結束
│
├─ 2. 【掃描 @IsNumber() + id 欄位】
│   ├─ 2.1 Grep @IsNumber() 找出所有位置
│   ├─ 2.2 篩選欄位名為 id 的（下一行是 id: number 或 id?: number）
│   ├─ 2.3 每個 id 欄位往上讀 decorator 區塊
│   │   ├─ 有 @Type(() => Number) → ✅ 已修正
│   │   ├─ 有 @Transform(...Number...) → ✅ 已修正（替代方案）
│   │   └─ 都沒有 → ❌ 需修正
│   └─ 2.4 記錄：DTO 類別名、欄位名、行數、修正狀態
│
├─ 3. 【分類 DTO 類型 + 過濾】
│   ├─ Update*Dto / Create*Dto 中的巢狀 DTO → Request Body（需修正）
│   ├─ *QueryDto / Find*QueryDto → Query Params（跳過）
│   ├─ *ResponseDto / 純 output → Response（跳過）
│   └─ 統計：需修正 N 個 / 已修正 N 個 / 不適用 N 個
│
├─ 4. 【判斷結果】
│   ├─ 全部 ✅ 或全部不適用 → Step 7 報告「不需修正」
│   └─ 有 ❌ 在 Request Body DTO → 繼續 Step 5
│
├─ 5. 【自動修正】
│   ├─ 5.1 確認 import { Type } from 'class-transformer' 存在
│   │   └─ 不存在 → 加入 import
│   ├─ 5.2 對每個 ❌ 欄位，在 @IsNumber() 前加入 @Type(() => Number)
│   └─ 5.3 記錄修改清單
│
├─ 6. 【Build 驗證】
│   ├─ cd backend-nestjs && yarn build
│   ├─ 成功 → 繼續
│   └─ 失敗 → 分析錯誤，嘗試修正後重 build
│
├─ 7. 【產出輕量 Proposal】
│   ├─ 掃描結果表
│   ├─ 修改檔案清單
│   ├─ Build 結果
│   └─ 寫入：prompts/4_diary/debug/{MMDD}_{apiName}_id_type_fix_proposal.md
│
├─ 8. 【更新追蹤表】
│   └─ 追蹤表：prompts/4_diary/debug/id-type-fix-progress.md
│
└─ 9. 【輸出結果】
    ├─ 有修正 → 顯示修正摘要 + 提醒 /gcommit-push
    └─ 無需修正 → 顯示「不需修正」
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 是 | API 模組名稱 或 `-list` | `estateListing`、`-list` |

### -list 模式

讀取追蹤表，輸出已掃描進度摘要。不執行掃描。

```
/fix-id-string-number -list
│
├─ 1. 讀取追蹤表
│   └─ prompts/4_diary/debug/id-type-fix-progress.md
│       ├─ 不存在 → 「尚未執行過，請先執行 /fix-id-string-number {apiName}」
│       └─ 存在 → 繼續
│
├─ 2. 解析統計數字
│   └─ 提取：已掃描、已修正、不適用、需人工
│
├─ 3. 篩選已掃描的 API
│   └─ 只列出「掃描」欄位為 ✅ 的行
│
└─ 4. 輸出摘要
    ├─ 統計數字
    ├─ 已掃描 API 表格（只有已掃描的，不列空行）
    └─ 未掃描 API 數量提醒
```

**輸出格式**：

```markdown
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

📌 還有 50 個 API 未掃描
```

---

## 前置依賴

- 追蹤表存在：`prompts/4_diary/debug/id-type-fix-progress.md`
  - 首次執行時由 skill 自動建立

---

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

---

## 掃描策略細節

### Step 2：掃描邏輯

**搜尋 Pattern**：

```
@IsNumber()
id: number       ← 或 id?: number
```

**判斷「已修正」的 Pattern（任一即可）**：

```typescript
// Pattern A：@Type(() => Number)
@Type(() => Number)
@IsNumber()
id: number

// Pattern B：@Transform 轉 Number
@Transform(({ value }) => Number(value))
@IsNumber()
id: number

// Pattern C：@Transform 帶 null 防護
@Transform(({ value }) => value ? Number(value) : value)
@IsNumber()
id: number

// Pattern D：@Transform 帶 undefined 防護
@Transform(({ value }) => (value !== undefined && value !== null) ? Number(value) : value)
@IsNumber()
id: number
```

**不需修正的情況**：
- `@IsNumber()` 的欄位不是 `id`（如 `amount: number`）→ 不在本次範圍
- DTO 類別是 Query/Response 類型 → 跳過
- DTO 類別名不含 Update/Create 且不是被 Update/Create DTO 巢狀引用的 → 跳過

### Step 3：DTO 類型判斷

```
DTO 類型判斷
│
├─ 類別名包含 Update* → Request Body
├─ 類別名包含 Create* → Request Body（但 id 通常是 auto-generated，需確認是否有 @IsNumber()）
├─ 類別名包含 *Query* / *Filter* → Query Params（跳過）
├─ 類別名包含 *Response* / *Result* → Response（跳過）
└─ 其他名稱 → 讀取 Controller 確認用途
    ├─ 在 @Body() 中使用 → Request Body
    └─ 不確定 → 標記 ⚠️ 需人工確認
```

### Step 5：自動修正策略

**修正方式**：統一使用 `@Type(() => Number)`（最簡潔、最一致）

```typescript
// 修正前
@IsNumber()
id: number

// 修正後
@Type(() => Number)
@IsNumber()
id: number
```

**Import 處理**：
1. 檢查檔案是否已有 `import { Type } from 'class-transformer'`
2. 如果已有 `class-transformer` import 但沒有 `Type` → 加入 `Type` 到 import
3. 如果完全沒有 `class-transformer` import → 新增整行 import

---

## 輸出格式

### 有修正時

```markdown
✅ 掃描完成：{apiName}

## 掃描結果

| # | DTO 類別 | 欄位 | 行數 | 修正前 | 狀態 |
|---|---------|------|------|--------|------|
| 1 | UpdateCustomerDto | id | 1698 | 缺少 @Type | ✅ 已修正 |
| 2 | UpdateRealEstateDto | id | 1730 | 缺少 @Type | ✅ 已修正 |
| 3 | UpdateInsuranceCompanyDto | id | 1751 | 已有 @Type | ⏭️ 已存在 |

## Build 結果
✅ Build 通過

## 產出 Proposal
📄 prompts/4_diary/debug/{MMDD}_{apiName}_id_type_fix_proposal.md

📋 接下來請執行：
▸ /gcommit-push {proposal-path}    ← commit + push
```

### 無需修正時

```markdown
✅ {apiName} 不需要修正

## 原因
- DTO 中沒有 @IsNumber() 的 id 欄位
- 或所有 id 欄位已有 @Type(() => Number)
```

---

## 輕量 Proposal 格式

```markdown
# {apiName} id Type 修正

> 📅 修正日期：YYYY-MM-DD
> 🔧 由 /fix-id-string-number 自動產出

## 問題描述

Request Body DTO 的 id 欄位缺少 `@Type(() => Number)`，前端送 string 時驗證失敗。

## 掃描結果

| # | DTO 類別 | 欄位 | 行數 | 修正前 | 狀態 |
|---|---------|------|------|--------|------|
| 1 | ... | id | ... | 缺少 @Type | ✅ 已修正 |

## 修改檔案清單

- src/api/adminApi/{apiName}/dto/{apiName}.dto.ts

## Build 結果

✅ Build 通過
```

---

## 追蹤表格式

**路徑**：`prompts/4_diary/debug/id-type-fix-progress.md`

```markdown
# id Type 修正追蹤表

> 問題：Request Body DTO 的 id 欄位缺少 @Type(() => Number)
> 修正方式：自動加入 @Type(() => Number) decorator

已掃描：X / 51 (Y%)

| # | API | 掃描 | 結果 | 修正數 | 日期 | Commit |
|---|-----|------|------|--------|------|--------|
| 1 | admin | ❌ | - | - | - | - |
| 2 | announcement | ❌ | - | - | - | - |
| ... | ... | ... | ... | ... | ... | ... |
| 51 | videoUrl | ❌ | - | - | - | - |
```

**結果欄位值**：

| 結果 | 說明 |
|------|------|
| ✅ 已修正 | 有問題且已自動修正 |
| ⏭️ 不適用 | 無 @IsNumber() id 欄位，或已全部修正 |
| ❌ 需人工 | 有不確定的 DTO 類型，需人工確認 |

---

## gcommit-push 整合

### 需要新增的步驟（gcommit-push Step 13.8）

**偵測條件**：proposal 路徑匹配 `*_id_type_fix_proposal.md`
- 不匹配 → 跳過

**更新追蹤表**：
1. 從路徑提取 `{apiName}`（`{MMDD}_{apiName}_id_type_fix_proposal.md`）
2. 更新追蹤表 `prompts/4_diary/debug/id-type-fix-progress.md`：
   - 「掃描」欄位 → ✅
   - 「結果」欄位 → ✅ 已修正
   - 「日期」欄位 → 當天日期
   - 「Commit」欄位 → commit hash
3. 重算統計數字

> ⚠️ **此整合需要透過 `/updateDesign gcommit-push` 同步到 gcommit-push 定義檔**

---

## 與 fixPermissionError 的設計比較

| 面向 | fixPermissionError | fix-id-string-number |
|------|-------------------|---------------------|
| 掃描對象 | Service + Controller | DTO |
| 問題複雜度 | 高（多種 pattern、傳播鏈） | 低（只查 @Type 有沒有） |
| 修正方式 | 產出 Proposal → /implement | 自動修正 + build |
| Proposal 內容 | 詳細分析 + 修改對照表 | 輕量掃描結果 |
| 追蹤表 | permission-error-fix-progress.md | id-type-fix-progress.md |
| gcommit-push 整合 | Step 13.7 | Step 13.8（待新增） |

---

## 注意事項

1. **不修改 Query DTO**：Query 參數有自己的轉型方式（`@Transform(parseInt)`），不在本次範圍
2. **不修改 Response DTO**：Response 不需要轉型
3. **Import 衝突處理**：加入 `Type` import 時注意不破壞現有 import 排序（Prettier 會自動處理）
4. **已修正的 API**：`estateTransaction` 已在本次 session 手動修正，追蹤表初始化時直接標記 ✅
