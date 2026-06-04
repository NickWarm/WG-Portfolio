---
description: 拆分過大的 proposal 檔案為多份
argument-hint: [-n] [proposal-path]
design-doc: prompts/4_diary/debug/proposal/slash/splitP_skill_proposal.md
---

@.claude/flowcharts/splitP_flowchart.md

## 參數

- `-n`：新建模式旗標（可選，有則進入新建模式，不檢查行數）
- `$1`：proposal 路徑 或 Notion URL（可選）

### 智能定位邏輯

| 優先級 | 來源 | 說明 |
|--------|------|------|
| 1 | 對話上下文 | 前面的 `/debugP`、`/implement`、`/gcommit-push` 已經操作過的 proposal 路徑 |
| 2 | `$1` — 檔案路徑 | 用戶明確指定 proposal 路徑（適用於新開對話窗的情境） |
| 3 | `$1` — Notion URL | 用 `/findDoc` 邏輯找到 bug_spec + proposals，再判斷哪個需要拆分 |
| 4 | 詢問用戶 | 以上都沒有時，請用戶提供路徑 |

## Step 0：建立 Task 追蹤

```
TaskCreate 列表：
| # | Subject | activeForm | blockedBy |
|---|---------|------------|-----------|
| 1 | 定位 Proposal 並驗證 | 定位並驗證 Proposal | — |
| 2 | 分析 Proposal 結構 | 分析 Proposal 章節結構 | — |
| 3 | 確認搬移內容 | 等待用戶確認搬移內容 | — |
| 4 | 建立 Proposal 2 並更新 Proposal 1 | 建立 Proposal 2 並搬移章節 | Task 3 |
| 5 | 驗證內容完整性 | 驗證內容完整性 | Task 4 |
| 6 | 更新 Bug Spec 索引 | 更新 Bug Spec 索引 | Task 5 |
| 7 | Commit 拆分結果 | Commit 拆分結果 | Task 6 |
| 8 | 回報結果 | 回報拆分結果 | Task 7 |
```

## 任務

### Step 1：定位 Proposal 並驗證

1. **定位 proposal 路徑**：
   - 優先從對話上下文取得（前面 skill 已操作過的路徑）
   - `$1` 是檔案路徑 → 直接使用
   - `$1` 是 Notion URL → 執行以下流程：
     1. 從 URL 提取 page_id（32 字元 hex）
     2. 用 `rg "<page_id>" /Users/nicholas/Desktop/Projects/prompts/4_diary/ --glob "*.md" -l` 找到 bug_spec
     3. 從 bug_spec 路徑提取 `{MMDD}_{N}` 前綴
     4. 用 glob `{MMDD}_{N}_*_proposal.md` 找到所有 proposal
     5. 逐一檢查行數：
        - 沒找到 proposal → 提示先用 `/exportN` 匯出
        - 一份超過 3000 行 → 選該份進入拆分流程
        - 多份超過 3000 行 → 列出清單，詢問用戶要拆哪份
        - 都沒超過 → 回報「目前不需要拆分」，結束
   - 都沒有 → 詢問用戶

2. **驗證檔案**：
   - 確認檔案存在
   - 計算行數：`wc -l {proposal_path}`
   - 若 < 3000 行 → 使用 AskUserQuestion 詢問「尚未超過 3000 行門檻，確定要拆分嗎？」
   - 若用戶取消 → 結束執行

3. **解析檔名**：
   - 提取 `{MMDD}_{N}` 前綴
   - 用 glob 檢查同目錄下已有的 proposal：`ls {目錄}/{MMDD}_{N}_*_proposal.md`
   - 判斷新 proposal 編號（2、3...依序遞增）

### Step 2：分析 Proposal 結構

1. **讀取 proposal 全文**
2. **解析章節**：
   - 找出所有 `## ` 或 `# ` 層級的標題
   - 記錄每個章節的標題、起始行、結束行
3. **掃描狀態標記**：
   - `✅` / `已完成` / `已修復` → 標記為「已完成」
   - `⏳` / `進行中` → 標記為「未處理」
   - 無標記 → 標記為「未處理」
4. **輸出章節清單**：

```
📋 Proposal 章節結構

| # | 章節標題 | 行數範圍 | 狀態 |
|---|---------|---------|------|
| 1 | 問題描述 | L1-L120 | — (不搬移) |
| 2 | findOne 空回應修復 | L121-L800 | ✅ 已完成 |
| 3 | 關聯資料載入異常 | L801-L1500 | ✅ 已完成 |
| 4 | 批次查詢效能優化 | L1501-L3000 | ⏳ 未處理 |
| 5 | 分頁邏輯重構 | L3001-L4572 | 無標記 |
```

### Step 3：確認搬移內容

1. **判斷搬移範圍**：
   - **情況 A**：有「已完成」與「未處理」的明確分界 → 未處理的章節全部搬到 proposal 2
   - **情況 B**：無明確標記 → 最後一個章節搬到 proposal 2
   - ⚠️ 第一個章節（問題描述）永遠不搬移

2. **顯示搬移預覽**：

```
📦 搬移預覽

將搬移到 Proposal 2 的章節：
- 批次查詢效能優化（L1501-L3000）
- 分頁邏輯重構（L3001-L4572）

留在 Proposal 1 的章節：
- 問題描述（L1-L120）
- findOne 空回應修復（L121-L800）
- 關聯資料載入異常（L801-L1500）
```

3. **等待用戶確認**（AskUserQuestion）

### Step 4：建立 Proposal 2 並更新 Proposal 1

> ⚠️ 原子操作：建立新檔 + 從舊檔刪除，避免中斷導致內容重複或遺失

1. **生成 Proposal 1 快速索引表**：
   - 列出 proposal 1 留下的所有章節（主題 + 行數範圍 + 狀態）

2. **建立 Proposal 2 檔案**：
   - 檔名：`{MMDD}_{N}_2_{描述}_proposal.md`
   - 寫入檔頭：

```markdown
# {票標題} - Proposal 2

> 延續自：`{原始 proposal 檔名}`（{原始行數} 行）
> 建立日期：YYYY-MM-DD

## Proposal 1 快速索引

| # | 主題 | 行數範圍 | 狀態 |
|---|------|----------|------|
| 1 | findOne 空回應修復 | L121-L800 | ✅ 已完成 |
| 2 | 關聯資料載入異常 | L801-L1500 | ✅ 已完成 |

---

（以下為 proposal 2 的內容）
```

   - 寫入搬移的章節內容

3. **從 Proposal 1 刪除已搬移的章節**

### Step 5：驗證內容完整性

> ⚠️ 不一致時立即停止，不繼續後續步驟

1. **記錄原始行數**：拆分前的 proposal 1 行數（Step 1 已取得）
2. **計算拆分後行數**：
   - 拆分後 proposal 1 行數：`wc -l {proposal_1_path}`
   - 搬移內容行數：proposal 2 總行數 - 檔頭行數（延續自 + 快速索引 + 分隔線）
3. **比對**：
   - 原始行數 ≈ 拆分後 proposal 1 行數 + 搬移內容行數 → ✅ 繼續
   - 不一致 → ❌ 停止，回報差異行數

### Step 6：更新 Bug Spec 索引

1. **找到 bug_spec**：`ls {目錄}/{MMDD}_{N}_bug_spec.md`
2. **檢查「## Proposal 索引」區塊**：
   - **沒有** → 建立區塊，同時寫入 proposal 1 和 2 的條目
   - **有** → 新增 proposal 2 的條目
3. **索引格式**（條列式，每個項目標記狀態）：

```markdown
## Proposal 索引

### Proposal 1：`{proposal_1_filename}`（{行數} 行，✅ 已完成）

- ✅ findOne 空資料回應修復
- ✅ POST 回傳資料不完整修復
- ✅ findOne 回傳結構不符合 DTO

### Proposal 2：`{proposal_2_filename}`（{行數} 行，⏳ 進行中）

- ⏳ 批次查詢效能優化
- ⏳ 分頁邏輯重構
```

4. **狀態標記規則**：
   - 從 Step 2 掃描到的章節狀態提取
   - `✅`：該章節標記為已完成 / 已修復
   - `⏳`：該章節標記為進行中或無標記

### Step 7：Commit 拆分結果

```bash
cd /Users/nicholas/Desktop/Projects/prompts
git add {proposal_1_path} {proposal_2_path} {bug_spec_path}
git commit -m "splitP: {MMDD}_{N} 拆分 proposal 2"
```

### Step 8：回報結果

```
✅ Proposal 拆分完成

## 拆分結果

| 檔案 | 行數 | 狀態 |
|------|------|------|
| {proposal_1_filename} | {搬移後行數} 行 | 已完成項目 |
| {proposal_2_filename} | {新行數} 行 | 未處理項目 |

## 內容完整性
✅ 已驗證（原始 {N} 行 = 拆分後 {N} + {N} 行）

## 搬移的章節

- {章節名稱}（原 L{start}-L{end}）
- {章節名稱}（原 L{start}-L{end}）

## Bug Spec 索引已更新

📄 {bug_spec_filename} 新增/更新「## Proposal 索引」區塊

## Commit
✅ {commit_hash}

📁 Proposal 2 路徑：{完整路徑}
```

---

## 新建模式（-n 參數）

> 觸發：`/splitP -n [proposal-path]`
> 用途：建立全新 Proposal 處理新問題（前一份 Proposal 不動）

### Step 0N：建立 Task 追蹤

```
TaskCreate 列表：
| # | Subject | activeForm | blockedBy |
|---|---------|------------|-----------|
| 1 | 定位 Proposal 並判斷編號 | 定位並判斷 Proposal 編號 | — |
| 2 | 收集問題清單 | 收集未解決問題清單 | Task 1 |
| 3 | 建立新 Proposal（分段寫入） | 建立新 Proposal | Task 2 |
| 4 | 更新 Bug Spec 索引 | 更新 Bug Spec 索引 | Task 3 |
| 5 | Commit 新 Proposal | Commit 新 Proposal | Task 4 |
| 6 | 回報結果 | 回報結果 | Task 5 |
```

### Step 1N：定位 Proposal 並判斷編號

1. **定位 proposal**（現有智能定位邏輯，同搬移模式 Step 1）
2. **用 glob 找現有 proposal 數量**：`ls {目錄}/{MMDD}_{N}_*_proposal.md`
3. **計算下一個編號**（找到 1 份 → P2，找到 2 份 → P3，依序遞增）

### Step 2N：收集問題清單

1. **讀取 bug_spec**，找出未解決的問題：
   - 有「## Proposal 索引」→ 比對索引，找出未被任何 proposal 覆蓋的問題
   - 沒有索引 → 從留言中提取「測試不通過」相關的問題
2. **列出問題清單**，等待用戶確認（AskUserQuestion，用戶可增減）

### Step 3N：建立新 Proposal（強制分段寫入）

> ⚠️ 每段不超過 300 行，避免 context 壓力過大

1. **Write header**（≤300 行）：
   - 標題：`# {票標題} - Proposal {N}`
   - 延續自：`{前一份 proposal 檔名}`
   - 建立日期
   - 前 Proposal 快速索引表
   - 當前問題快速索引表

2. **逐段 Edit 追加 Issue 內容**（每段 ≤300 行）：
   - 對每個 Issue：
     - 讀取 bug_spec 中對應的 QA 留言和同事補充
     - 讀取前一份 Proposal 中的相關分析（如有）
     - Edit 追加：問題描述、根本原因、修改方式、驗證方式

3. **Edit 追加尾部**（≤300 行）：
   - 修改檔案清單 + 參考資料

### Step 4N：更新 Bug Spec 索引

1. 用 `{MMDD}_{N}_` glob 找到 bug_spec
2. 檢查「## Proposal 索引」區塊：
   - **沒有** → 建立，同時寫入所有 proposal 的條目
   - **有** → 新增新 proposal 的條目

### Step 5N：Commit

```bash
cd /Users/nicholas/Desktop/Projects/prompts
git add {new_proposal_path} {bug_spec_path}
git commit -m "splitP -n: {MMDD}_{N} 新建 proposal {X}"
```

### Step 6N：回報結果

```
✅ 新 Proposal 建立完成

## 建立結果

| 檔案 | 行數 | 狀態 |
|------|------|------|
| {new_proposal_filename} | {行數} 行 | 新建 |

## 處理的問題

- {問題 1}
- {問題 2}

## Bug Spec 索引已更新

📄 {bug_spec_filename} 新增/更新「## Proposal 索引」區塊

## Commit
✅ {commit_hash}

📁 新 Proposal 路徑：{完整路徑}
```
