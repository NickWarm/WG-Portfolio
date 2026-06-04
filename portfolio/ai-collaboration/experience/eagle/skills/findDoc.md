---
description: 快速查找 Notion 票討論進度和技術文件
argument-hint: <關鍵字或URL>
design-doc: prompts/4_diary/debug/proposal/slash/findDoc_skill_proposal.md
---

@.claude/flowcharts/findDoc_flowchart.md

## 參數

- 關鍵字或 URL：$1（必填）
  - 方式一：Notion URL，如 `https://www.notion.so/xxxxx`
  - 方式二：關鍵字，如 `物件編輯`、`customer`、`[權限]`

## 輸入判斷邏輯

```
if $1 starts with "https://www.notion.so/" or "notion.so/":
    → 方式一：從 URL 提取 page_id → 用 rg 搜尋 page_id
else:
    → 方式二：使用 $1 作為關鍵字 → 兩階段搜尋
```

## 任務

### 方式一：URL 查詢

1. **從 URL 提取 page_id**（32 字元 hex）
   - URL 格式：`https://www.notion.so/[可選標題]-[page_id]`
   - 提取最後 32 字元（不含連字號）

2. **用 rg 搜尋 page_id**
   ```bash
   rg "<page_id>" /Users/nicholas/Desktop/Projects/prompts/4_diary/ --glob "*.md" -l
   ```

3. **判斷結果**
   - 找到 → 進入步驟 4（關聯文件發現）
   - 沒找到 → 提示用 `/exportN <URL>` 匯出

4. **🆕 關聯文件發現**（找到 bug_spec 後必須執行）
   - 從找到的文件路徑提取日期前綴（`MMDD_N`）
   - 用 Glob 搜尋同前綴的所有文件
   ```bash
   # 例：找到 1228_1_bug_spec.md
   # 提取前綴：1228_1
   # 搜尋：/path/to/dir/1228_1_*.md
   ```
   - 這樣可以找到同組的 proposal 文件（如 `1228_1_xxx_proposal.md`）

5. **批次讀取並摘要輸出**
   - 讀取 bug_spec 和所有關聯的 proposal 文件
   - 摘要輸出：Bug 描述、提案摘要、實作進度

### 方式二：關鍵字查詢（兩階段搜尋）

#### 前置處理：跳脫特殊字元

⚠️ **重要**：`[]` 是 rg regex 特殊字元，需要跳脫

```bash
# 跳脫 [] 字元
escaped_keyword=$(echo "$1" | sed 's/\[/\\[/g; s/\]/\\]/g')
```

| 原始關鍵字 | 跳脫後 |
|-----------|--------|
| `[物件資料管理]` | `\[物件資料管理\]` |
| `[權限]` | `\[權限\]` |
| `customer` | `customer`（無需跳脫）|

#### 第一階段：搜尋 *_api/ 目錄

```bash
rg -i "$escaped_keyword" /Users/nicholas/Desktop/Projects/prompts/4_diary/*_api/ \
   --glob "*.md" \
   -l 2>/dev/null
```

**判斷**：
- 有結果 → 直接讀取所有找到的文件，然後摘要輸出
- 無結果 → 進入第二階段

#### 第二階段：搜尋整個 prompts 專案

```bash
rg -i "$escaped_keyword" /Users/nicholas/Desktop/Projects/prompts/ \
   --glob "*.md" \
   --glob "!node_modules/**" \
   --glob "!.git/**" \
   -l \
   | head -20
```

## 輸出格式

### URL 查詢 - 找到

1. **用 rg 搜尋 page_id 找到 bug_spec**
2. **🆕 用日期前綴找關聯的 proposal 文件**
3. **批次讀取並摘要輸出**：

```markdown
🎯 **找到這張 Notion 票的相關文件：**

**Notion URL**: <原始 URL>

## 📂 文件清單

| # | 類型 | 文件路徑 |
|---|------|----------|
| 1 | Bug Spec | `4_diary/transcript_api/debug/1228_1_bug_spec.md` |
| 2 | Proposal | `4_diary/transcript_api/debug/1228_1_transcript_findone_empty_response.md` |

## 📋 內容摘要

### 1. Bug Spec (1228_1_bug_spec.md)
- **問題描述**: [從文件中提取的問題描述]
- **影響範圍**: [從文件中提取]

### 2. Proposal (1228_1_transcript_findone_empty_response.md)
- **實作進度**: [從文件中提取]
- **修復方案**: [從文件中提取的方案摘要]
- **修改檔案**: [從文件中提取]
```

### URL 查詢 - 沒找到

```markdown
❌ 這張 Notion 票尚未匯出到本地

**Notion URL**: <原始 URL>

💡 建議執行：
/exportN <原始 URL>
```

### 關鍵字 - 找到（第一或第二階段）

1. **直接讀取所有找到的文件**
2. **摘要輸出**：

```markdown
🎯 **找到與「<關鍵字>」相關的文件：**

## 📂 文件清單

| # | 文件路徑 |
|---|----------|
| 1 | `4_diary/customer_api/debug/0115_1_bug_spec.md` |
| 2 | `4_diary/customer_api/design/customer_query_design.md` |

## 📋 內容摘要

### 1. 0115_1_bug_spec.md
- **主題**: [文件主題]
- **關鍵內容**: [與關鍵字相關的重點摘要]

### 2. customer_query_design.md
- **主題**: [文件主題]
- **關鍵內容**: [與關鍵字相關的重點摘要]
```

### 完全沒找到

```markdown
❌ 沒有找到與「<關鍵字>」相關的文件

💡 建議：
1. 嘗試其他關鍵字
2. 使用英文搜尋（如 customer 代替 客戶）
3. 使用 /exportN 從 Notion 匯出相關票
```
