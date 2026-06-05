# findDoc Skill 設計提案

> 快速查找與 Notion 票相關的討論進度和技術文件

---

## 實作進度

| 項目 | 狀態 | 完成日期 |
|------|------|----------|
| 設計文件 | ✅ 完成 | 2026-01-23 |
| Skill 檔案（findDoc.md） | ✅ 完成 | 2026-01-23 |
| URL 輸入判斷邏輯 | ✅ 完成 | 2026-01-23 |
| 兩階段搜尋邏輯 | ✅ 完成 | 2026-01-23 |
| rg 跳脫字元處理 | ✅ 完成 | 2026-01-23 |
| 驗證測試 | ✅ 通過 | 2026-01-23 |
| **關聯文件發現機制** | ✅ 完成 | 2026-01-27 |

---

## 問題背景

### 現況痛點

1. **Notion 票討論進度散落各處**
   - 從 Notion 匯出的 bug_spec 和 proposal 文件放在 `*_api/debug/` 目錄
   - AI 隨機搜尋時容易錯過這些文件
   - 找相關資料需要多次嘗試

2. **搜尋效率低**
   - AI 用 Grep 搜尋整個 prompts 專案
   - 結果太多，需要人工篩選
   - 無法優先顯示最相關的 Notion 票討論

3. **上下文斷裂**
   - 用戶提到某個功能的 bug，AI 不知道之前有討論過
   - 重複分析已經分析過的問題

4. **拿到 Notion URL 後找不到本地文件**
   - 用戶給了 Notion 票 URL
   - 不知道這張票是否已經用 `/exportN` 匯出過
   - 不知道對應的 bug_spec 和 proposal 在哪裡

---

## 設計目標

### 核心理念

**輸入判斷 + 兩階段搜尋策略**

```
輸入判斷
│
├─ Notion URL → 提取 page_id → 用 rg 搜尋 page_id
│   ├─ 找到 → 顯示對應的 bug_spec 和 proposal
│   └─ 沒找到 → 提示用 /exportN 匯出
│
└─ 關鍵字 → 兩階段搜尋
    │
    ├─ 第一階段：搜尋 *_api/ 目錄（不限於 debug/）
    │   ├─ 找到 → 直接顯示結果
    │   └─ 沒找到 → 進入第二階段
    │
    └─ 第二階段：rg 搜尋整個 prompts 專案
```

### 預期效益

| 項目 | 改善前 | 改善後 |
|------|--------|--------|
| 搜尋速度 | 全專案搜尋 | 優先搜尋 debug 目錄 |
| 相關性 | 結果雜亂 | 優先顯示 Notion 票討論 |
| 上下文 | 常遺漏歷史討論 | 快速找到相關票 |

---

## Skill 設計

### 指令格式

```bash
/findDoc <關鍵字或URL>

# 方式一：用 Notion URL 查詢（精準查找）
/findDoc https://www.notion.so/2e2516bdc04b8060b485f3cddb8f27f6
/findDoc https://www.notion.so/Bug-Title-2e2516bdc04b8060b485f3cddb8f27f6

# 方式二：用關鍵字查詢（模糊搜尋）
/findDoc 物件編輯
/findDoc 登入
/findDoc 權限
/findDoc customer
```

### 參數說明

- `<關鍵字或URL>`：必填
  - **Notion URL**：直接用 page_id 精準搜尋
  - **關鍵字**：支援中英文，兩階段搜尋

### 輸入判斷邏輯（參考 /exportN）

```
if $1 starts with "https://www.notion.so/" or "notion.so/":
    → 方式一：從 URL 提取 page_id → 用 rg 搜尋 page_id
else:
    → 方式二：使用 $1 作為關鍵字 → 兩階段搜尋
```

### page_id 提取規則（同 /exportN）

Notion URL 格式：
```
https://www.notion.so/[可選標題前綴]-[page_id]
https://www.notion.so/[page_id]
```

page_id 是 32 字元的 hex 字串，例如：`2e2516bdc04b8060b485f3cddb8f27f6`

### rg 跳脫字元處理（參考 /exportN）

⚠️ **重要**：使用 rg 搜尋時，`[]` 是 regex 特殊字元，需要跳脫

| 原始關鍵字 | 跳脫後 |
|-----------|--------|
| `[物件資料管理]` | `\[物件資料管理\]` |
| `[權限]` | `\[權限\]` |

**跳脫邏輯**：
```bash
# 將 [ 替換為 \[，將 ] 替換為 \]
escaped_keyword=$(echo "$1" | sed 's/\[/\\[/g; s/\]/\\]/g')
rg -i "$escaped_keyword" ...
```

---

## 執行流程

### 方式一：Notion URL 查詢

當輸入是 Notion URL 時：

```
1. 從 URL 提取 page_id（32 字元 hex）
   ↓
2. 用 rg 搜尋 page_id
   rg "<page_id>" /Users/nicholas/Desktop/Projects/prompts/4_diary/ --glob "*.md" -l
   ↓
3. 判斷結果
   ├─ 找到 → 顯示對應的 bug_spec 和 proposal 文件
   └─ 沒找到 → 提示用 /exportN 匯出這張票
```

**搜尋指令**：
```bash
# 直接搜尋 page_id（同 /exportN 的邏輯）
rg "2e2516bdc04b8060b485f3cddb8f27f6" /Users/nicholas/Desktop/Projects/prompts/4_diary/ \
   --glob "*.md" \
   -l
```

> ⚠️ **注意**：直接搜尋 page_id，不加 `notion.so/` 前綴（參考 /exportN 的設計決策）

### 方式二：關鍵字查詢（兩階段搜尋）

當輸入是關鍵字時：

#### 第一階段：精準搜尋（*_api/ 目錄）

```bash
# 搜尋所有 *_api/ 目錄下的文件（不限於 debug/）
rg -i "<關鍵字>" /Users/nicholas/Desktop/Projects/prompts/4_diary/*_api/ \
   --glob "*.md" \
   -l 2>/dev/null
```

**搜尋範圍**：
```
/Users/nicholas/Desktop/Projects/prompts/4_diary/
├── admin_api/           ← 整個目錄，不只 debug/
│   ├── debug/
│   ├── design/
│   └── *.md
├── customer_api/
├── estateListing_api/
├── role_and_permission/
├── transcript_api/
├── publicApi/
├── ... 其他 *_api/ 目錄
```

> 💡 **設計理由**：討論進度和設計文件可能放在 `*_api/` 的任何子目錄，不一定在 `debug/`

**判斷邏輯**：
- 有結果 → 顯示找到的文件，詢問是否要讀取
- 無結果 → 自動進入第二階段

#### 第二階段：廣泛搜尋（整個 prompts 專案）

```bash
# 搜尋整個 prompts 專案
rg -i "<關鍵字>" /Users/nicholas/Desktop/Projects/prompts/ \
   --glob "*.md" \
   --glob "!node_modules/**" \
   --glob "!.git/**" \
   -l \
   | head -20
```

**排除目錄**：
- `node_modules/`
- `.git/`

---

## 輸出格式

### 方式一：URL 查詢 - 找到文件

```markdown
🎯 **找到這張 Notion 票的相關文件：**

**Notion URL**: https://www.notion.so/2e2516bdc04b8060b485f3cddb8f27f6

| 類型 | 文件路徑 |
|------|----------|
| Bug 規格 | `customer_api/debug/0115_1_bug_spec.md` |
| 修復提案 | `customer_api/debug/0115_1_customer_fix_proposal.md` |

💡 是否要讀取這些文件？
```

### 方式一：URL 查詢 - 沒找到

```markdown
❌ 這張 Notion 票尚未匯出到本地

**Notion URL**: https://www.notion.so/2e2516bdc04b8060b485f3cddb8f27f6

💡 建議執行：
\`\`\`bash
/exportN https://www.notion.so/2e2516bdc04b8060b485f3cddb8f27f6
\`\`\`
```

### 方式二：關鍵字 - 第一階段找到

```markdown
🎯 **在 *_api/ 目錄中找到：**

| 目錄 | 文件 | 說明 |
|------|------|------|
| `customer_api/debug/` | `0115_1_bug_spec.md` | Bug 規格 |
| `customer_api/debug/` | `0115_1_customer_fix_proposal.md` | 修復提案 |
| `customer_api/design/` | `customer_query_design.md` | 設計文件 |

💡 是否要讀取這些文件？
```

### 方式二：關鍵字 - 第一階段無結果，第二階段找到

```markdown
⚠️ 在 *_api/ 目錄中沒有找到相關文件

🔍 **在整個 prompts 專案中找到：**

| 路徑 | 文件 |
|------|------|
| `4_diary/knowledge/` | `customer_query_optimization.md` |
| `5_workflow/` | `customer_api_template.md` |

💡 是否要讀取這些文件？
```

### 完全沒找到

```markdown
❌ 沒有找到與「<關鍵字>」相關的文件

💡 建議：
1. 嘗試其他關鍵字
2. 使用英文搜尋（如 customer 代替 客戶）
3. 使用 /exportN 從 Notion 匯出相關票
```

---

## 目錄結構參考

### *_api/debug/ 目錄說明

這些目錄存放從 Notion 匯出的文件，由 `/exportN` skill 產生：

| 目錄 | 對應 Notion 分類 |
|------|------------------|
| `admin_api/debug/` | [人員資料管理] |
| `customer_api/debug/` | [買方客戶查詢]、[委託客戶查詢] |
| `estateListing_api/debug/` | [物件資料管理] |
| `estateTransaction_api/debug/` | [成交資料查詢] |
| `role_and_permission/debug/` | [權限管理]、[權限] |
| `auth_api/debug/` | 登入相關 |
| `transcript_api/debug/` | [謄本操作紀錄查詢] |
| `approvement_api/debug/` | [待店長確認] |

### 文件命名規則

```
{MMDD}_{N}_bug_spec.md      # Bug 規格（從 Notion 匯出）
{MMDD}_{N}_{name}_proposal.md  # 修復提案
{MMDD}_{N}_{name}_analysis.md  # 問題分析
```

---

## 與其他 Skill 的關係

| Skill | 用途 | 與 findDoc 的關係 |
|-------|------|-------------------|
| `/exportN` | 從 Notion 匯出票 | findDoc 搜尋 exportN 產生的文件 |
| `/debugP` | Debug 問題排查 | findDoc 可找到相關的歷史 debug 記錄 |
| `/implement` | 實作功能 | findDoc 可找到相關的設計文件 |

---

## Skill 檔案設計

### 檔案位置

```
/Users/nicholas/Desktop/Projects/prompts/.claudeCode/Eagle/commands/findDoc.md
```

### Skill 檔案內容

```markdown
---
description: 快速查找 Notion 票討論進度和技術文件
argument-hint: <關鍵字或URL>
---

## 參數

- 關鍵字或 URL：$1（必填）
  - 方式一：Notion URL，如 `https://www.notion.so/xxxxx`
  - 方式二：關鍵字，如 `物件編輯`、`customer`

## 輸入判斷邏輯

\`\`\`
if $1 starts with "https://www.notion.so/" or "notion.so/":
    → 方式一：從 URL 提取 page_id → 用 rg 搜尋 page_id
else:
    → 方式二：使用 $1 作為關鍵字 → 兩階段搜尋
\`\`\`

## 任務

### 方式一：URL 查詢

1. **從 URL 提取 page_id**（32 字元 hex）
   - URL 格式：`https://www.notion.so/[可選標題]-[page_id]`
   - 提取最後 32 字元

2. **用 rg 搜尋 page_id**
   \`\`\`bash
   rg "<page_id>" /Users/nicholas/Desktop/Projects/prompts/4_diary/ --glob "*.md" -l
   \`\`\`

3. **判斷結果**
   - 找到 → 列出 bug_spec 和 proposal 文件
   - 沒找到 → 提示用 `/exportN <URL>` 匯出

### 方式二：關鍵字查詢（兩階段搜尋）

#### 前置處理：跳脫特殊字元

\`\`\`bash
# 跳脫 [] 字元（rg regex 特殊字元）
escaped_keyword=$(echo "$1" | sed 's/\[/\\[/g; s/\]/\\]/g')
\`\`\`

#### 第一階段：搜尋 *_api/ 目錄（不限於 debug/）

\`\`\`bash
rg -i "$escaped_keyword" /Users/nicholas/Desktop/Projects/prompts/4_diary/*_api/ \
   --glob "*.md" \
   -l 2>/dev/null
\`\`\`

**判斷**：
- 有結果 → 列出文件，詢問是否要讀取
- 無結果 → 進入第二階段

#### 第二階段：搜尋整個 prompts 專案

\`\`\`bash
rg -i "$escaped_keyword" /Users/nicholas/Desktop/Projects/prompts/ \
   --glob "*.md" \
   --glob "!node_modules/**" \
   --glob "!.git/**" \
   -l \
   | head -20
\`\`\`

## 輸出格式

1. 分類顯示找到的文件（debug 目錄 vs 其他目錄）
2. 顯示文件路徑和簡短說明
3. 詢問是否要讀取特定文件
4. URL 查詢沒找到時，提示用 /exportN 匯出
```

---

## 進階功能（未來擴充）

### 可考慮的增強

1. **自動讀取最相關文件**
   - 根據關鍵字匹配度排序
   - 自動讀取前 3 個最相關的文件

2. **支援多關鍵字**
   ```bash
   /findDoc 客戶 編輯
   ```

3. **時間篩選**
   ```bash
   /findDoc 物件 --recent 7d  # 最近 7 天的文件
   ```

4. **整合 index.md**
   - 自動讀取 `/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/index.md`
   - 顯示最近從 Notion 匯出的票列表

---

## 設計決策記錄

### 2026-01-27：關聯文件發現機制

**問題發現**：

用 `/findDoc <URL>` 查詢時，只會找到包含 page_id 的 bug_spec 文件，但**同組的 proposal 文件會被遺漏**，因為 proposal 裡面不一定有 Notion URL。

**實際案例**：
```
/findDoc https://www.notion.so/2cd516bdc04b812bb08de49160261f9a

找到：1228_1_bug_spec.md（包含 page_id）
遺漏：1228_1_transcript_findone_empty_response.md（proposal，無 page_id）
```

**改進方案**：

找到 bug_spec 後，用日期前綴（`MMDD_N`）搜尋同組的 proposal 文件：

```
/findDoc URL 執行流程（改進版）
│
├─ 1. 【提取 page_id】
│   └─ 從 URL 提取 32 字元 hex
│
├─ 2. 【搜尋 page_id】
│   └─ rg "<page_id>" → 找到 bug_spec
│
├─ 3. 【🆕 關聯文件發現】
│   ├─ 提取 bug_spec 的日期前綴（如 1228_1）
│   └─ 用 glob 搜尋同前綴的其他文件：
│       ls ${DIR}/${prefix}_*.md
│       例：1228_1_bug_spec.md → 1228_1_*.md
│
├─ 4. 【批次讀取】
│   ├─ 讀取 bug_spec
│   └─ 讀取所有關聯的 proposal 文件
│
└─ 5. 【摘要輸出】
    ├─ Bug 描述
    ├─ 提案摘要
    └─ 實作進度
```

**技術實作**：

```bash
# 從 bug_spec 路徑提取前綴
# 例：/path/to/1228_1_bug_spec.md → 1228_1
prefix=$(basename "$file" | grep -oE '^[0-9]{4}_[0-9]+')
dir=$(dirname "$file")

# 搜尋同前綴的所有文件
ls "${dir}/${prefix}_"*.md 2>/dev/null
```

---

### 2026-01-23：初始設計

**設計理由**：
1. **兩階段搜尋**：先精準後廣泛，提高搜尋效率
2. **優先 debug 目錄**：Notion 票討論通常最相關
3. **簡單指令**：只需一個關鍵字，降低使用門檻

**參考**：
- `/exportN` 的分類 → 目錄映射表
- 現有 `*_api/debug/` 目錄結構
