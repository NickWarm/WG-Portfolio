---
name: nq
description: 查詢 NotebookLM 並記錄結果（raw + summary 雙檔）。觸發條件：使用者說「用 nlm 問...」、「查 NotebookLM...」、或呼叫 /nq。
---

# NQ — NotebookLM Query & Record

查詢 NotebookLM notebook 並將結果存為一對檔案（原始回傳 + 整理摘要），同時更新查詢索引。

## 參數

從使用者訊息中解析以下資訊：

| 參數 | 必填 | 說明 |
|------|------|------|
| teacher | 否 | 老師名稱（kebab-case），預設：`eli`。決定輸出目錄和預設 notebooks |
| query | 是 | 查詢問題 |
| topic | 是 | 主題關鍵字，用於檔名（kebab-case），若使用者未指定則根據 query 自動產生 |
| notebooks | 否 | 要查詢的 notebook 名稱，若未指定則使用該 teacher 的預設 notebooks |

### 老師預設 Notebooks

| teacher | 預設 notebooks |
|---------|---------------|
| eli | `Eli 本地課程 (1) — STEP 1-4 核心策略, Eli 本地課程 (2) — STEP 5-7 進階 + 外匯基礎, Eli 直播回放 (1), Eli 直播回放 (2)` |
| yu | `老余直播 2025, 老余直播 2026` |
| sky | `Sky 直播 2025-2026` |

> 新增老師時在此表加一行即可。

## 執行流程

### Step 1：執行查詢

使用 `cross_notebook_query` 查詢指定 notebooks：

```
mcp__notebooklm-mcp__cross_notebook_query(
  query="{query}",
  notebook_names="{notebooks}"
)
```

### Step 2：存 Raw 檔

路徑：`docs/strategies/nlm-queries/{teacher}/{topic}-raw.md`

格式：

```markdown
# {主題中文名}（原始回傳）

> 查詢問題：{query}
> 查詢時間：{YYYY-MM-DD HH:MM}
> 查詢 Notebooks：{notebook names}

---

## Notebook: {notebook_title_1}

{完整 answer 原文，不做任何刪改}

### 引用來源

| Source ID | 影片標題 |
|-----------|---------|
| {source_id_1} | {source_title_1} |
| {source_id_2} | {source_title_2} |
| ... | ... |

---

## Notebook: {notebook_title_2}

{完整 answer 原文，不做任何刪改}

### 引用來源

| Source ID | 影片標題 |
|-----------|---------|
| {source_id_1} | {source_title_1} |
| {source_id_2} | {source_title_2} |
| ... | ... |
```

**重要**：
- answer 內容必須完整保留，不可摘要、刪減或改寫
- `sources_used` 來自 NLM 回傳的 `sources_used` 欄位，記錄該 notebook 回答時引用了哪些 source
- 影片標題需查詢 `source_list_drive` 或從已知的 source 清單中對應（source ID → title）
- 有了來源影片，使用者可以搭配 `/vck` 定位到該影片的具體時間片段

### Step 3：存 Summary 檔

路徑：`docs/strategies/nlm-queries/{teacher}/{topic}-summary.md`

格式：

```markdown
# {主題中文名}（摘要）

> 來源：NotebookLM 跨 notebook 查詢
> 查詢問題：{query}
> 整理日期：{YYYY-MM-DD}

---

{整合兩個 notebook 回傳內容，去重、結構化整理}
```

摘要原則：
- 合併兩個 notebook 的重複內容
- 保留所有獨特觀點，不遺漏
- 使用結構化標題分類
- 標注重要金句或關鍵數字

### Step 4：更新索引

路徑：`docs/strategies/nlm-queries/{teacher}/INDEX.md`

在表格最上方新增一行（最新在上）：

```
| {YYYY-MM-DD} | {topic} | {查詢問題簡述} | [raw]({topic}-raw.md) / [summary]({topic}-summary.md) |
```

如果 INDEX.md 不存在，先建立：

```markdown
# NotebookLM 查詢索引

> 每次查詢 NotebookLM 的完整記錄。每個主題包含原始回傳（raw）和整理摘要（summary）兩份檔案。

| 日期 | 主題 | 查詢問題 | 檔案 |
|------|------|----------|------|
```

### Step 5：回報結果

向使用者顯示 summary 的重點內容（不需要全文輸出，挑關鍵重點即可）。

## 注意事項

- Raw 檔是原始記錄，**絕對不可修改內容**
- 如果 NLM 回傳超長，raw 檔仍然完整保存
- 同一個 topic 如果重複查詢，用數字後綴區分：`{topic}-2-raw.md`
- 檔名一律 kebab-case，與專案命名規則一致
