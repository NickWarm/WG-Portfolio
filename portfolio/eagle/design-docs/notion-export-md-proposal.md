# Notion 匯出 Markdown 提案

> 將 Notion 票匯出為 Markdown 檔案，供 Claude Code 讀取使用

---

## 實作進度

> ✅ **實作完成並驗證通過** - 2026-01-12

| 項目 | 狀態 | 完成日期 |
|------|------|----------|
| Notion MCP Server 部署 | ✅ 完成 | 2026-01-11 |
| MCP 配置（Projects/.claude/mcp.json） | ✅ 完成 | 2026-01-12 |
| MCP 配置（prompts/.claude/mcp.json） | ✅ 完成 | 2026-01-12 |
| Skill 檔案（exportN.md） | ✅ 完成 | 2026-01-12 |
| 方式一：標籤查詢 | ✅ 完成 | 2026-01-11 |
| 方式二：URL 查詢 | ✅ 完成 | 2026-01-11 |
| index.md 格式設計 | ✅ 完成 | 2026-01-12 |
| 過濾規則（跳過已處理票） | ✅ 完成 | 2026-01-12 |
| 留言比對邏輯（5步驟） | ✅ 完成 | 2026-01-12 |
| rg 跳脫字元注意事項 | ✅ 完成 | 2026-01-12 |
| MCP 工具說明文件 | ✅ 完成 | 2026-01-12 |
| 內容過濾規則（截斷前端/後端修改建議） | ✅ 完成 | 2026-01-12 |
| 強化「已存在檢查」（完整路徑 + 範例指令） | ✅ 完成 | 2026-01-12 |
| 強化備用腳本說明（禁止自寫程式碼 + 範例用法） | ✅ 完成 | 2026-01-12 |
| Wrapper 腳本（強制執行順序） | ✅ 完成 | 2026-01-12 |
| Skill 整合 Wrapper | ✅ 完成 | 2026-01-12 |
| 驗證測試 | ✅ 通過 | 2026-01-12 |
| Wrapper 修改（proposals 嵌入 existing_tickets） | ✅ 完成 | 2026-01-12 |
| 保留空段落排版 | ✅ 完成 | 2026-01-12 |
| 留言精準插入（Skill 更新） | ✅ 完成 | 2026-01-12 |
| Notion property 標籤提取 | ✅ 完成 | 2026-01-21 |
| 標題關鍵字映射（登入、權限） | ✅ 完成 | 2026-01-21 |
| 三層標籤優先順序機制 | ✅ 完成 | 2026-01-21 |
| 術語更新（標籤→分類） | ✅ 完成 | 2026-01-21 |
| 新增 [檔案] 分類 | ✅ 完成 | 2026-01-21 |
| 同事補充內容同步（設計完成） | ✅ 完成 | 2026-01-31 |
| 同事補充內容同步（Wrapper 修改） | ✅ 完成 | 2026-01-31 |
| 同事補充內容同步（Skill 更新） | ✅ 完成 | 2026-01-31 |
| 過濾規則優化（寬鬆 pattern + proposal 比對） | ✅ 完成 | 2026-01-31 |

### 術語更新記錄（2026-01-21）

> **重要**：為避免與 Notion property「標籤」（如大後台、業主、官網）混淆，`[xxx]` 格式統一改稱「**分類**」

| 舊術語 | 新術語 | 說明 |
|--------|--------|------|
| 標籤 `[xxx]` | 分類 `[xxx]` | 票標題中的 `[物件資料管理]` 等格式 |
| 標籤 → 目錄映射表 | 分類 → 目錄映射表 | 映射表標題 |
| Notion 標籤 | Notion property「標籤」 | Notion 屬性欄位（大後台、業主、官網等） |

**影響範圍**：
- `exportN.md` skill 檔案
- `export-notion.mjs` wrapper 腳本
- 本設計文件

### 驗證結果

| 項目 | 狀態 | 說明 |
|------|------|------|
| index.md 更新 | ✅ | 7 張票列出，5 張有新留言標記 |
| 新票合併 | ✅ | 2 張新票合併到 0112_1_bug_spec.md，用 `---` 分隔 |
| 留言追加 | ✅ | 已存在的檔案正確追加新留言 |
| proposal 檔案列出 | ✅ | 正確列出對應的 proposal 檔案 |

**Skill 檔案位置**: `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/exportN.md`

**MCP 配置位置**:
- Projects 級別: `/Users/nicholas/Desktop/Projects/.claude/mcp.json`
- prompts 專案: `/Users/nicholas/Desktop/Projects/prompts/.claude/mcp.json`

> 💡 **說明**：MCP 配置放在 Projects 級別，讓所有子專案都能使用 Notion MCP 工具。

---

## 工具說明

> ⚠️ **重要**：使用 **MCP 工具**，不是 npx 或 bash 命令！

### MCP 工具（優先使用）
- `notion_query_tickets` - 查詢票
- `notion_get_page_full` - 取得票完整內容
- `notion_get_options` - 取得可用選項

### 備用腳本（MCP 不可用時）

> ⚠️ **禁止自己寫程式碼！直接使用現成腳本！**
> 這些腳本使用原生 fetch API，**不需要 npm install**。

```bash
# 查詢票列表（可帶參數：人員 狀態）
node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/test-query.mjs 威G 開發中

# 匯出票的完整內容
node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-tickets.mjs
```

**範例用法**：
```bash
# 查詢威G的開發中票
node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/test-query.mjs 威G 開發中

# 篩選輸出中包含特定標籤的票
node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/test-query.mjs 威G 開發中 2>/dev/null | grep -A3 "\[物件資料管理\]"
```

---

## 已處理票的判斷規則

> ⚠️ **重要**：如果票內容包含 `# 前端修改建議` 標題，代表是**已處理過的票**：
> - ❌ **不需要再匯出內容**（bug spec 已經有了）
> - ✅ **依舊要檢查留言**，有新留言就追加到已有的 bug spec

---

## Skill 設計

### 指令格式

**方式一：用標籤查詢**
```
/exportN [標籤或關鍵字]
```

**方式二：用 URL 查詢**
```
/exportN https://www.notion.so/xxxxx
```

**Skill 說明**：匯出 Notion 票到本地 Markdown 檔案

### 使用範例

```bash
# 方式一：用標籤（最常見）
/exportN [物件資料管理]

# 方式二：用 URL（自動提取標籤）
/exportN https://www.notion.so/2e2516bdc04b8060b485f3cddb8f27f6

# 指定不同狀態
/exportN [物件資料管理] --status 規劃中

# 指定不同人員
/exportN [權限] --assignee Fei
```

### 預設行為

- **指派人員**：威G（optional，可用 `--assignee` 覆蓋）
- **狀態**：開發中（optional，可用 `--status` 覆蓋）
- **標籤來源**：直接指定 或 從 URL 自動提取

> 💡 **設計原則**：預設就是「威G + 開發中」，因為這是最常見的情境。

### 方式二流程說明

```
1. 從 URL 提取 page_id
   ↓
2. notion_get_page_full(page_id) 取得票標題
   ↓
3. 從標題提取標籤（如 [物件資料管理]）
   ↓
4. 執行標準查詢流程（同方式一）
```

> 💡 **好處**：用戶可以直接複製 Notion 票的 URL，不用手動提取標籤。

---

## 流程設計

### 流程（增量更新）

```
1. notion_query_tickets({ assignee: "威G", status: "開發中" })
   ↓
2. 篩選標題包含關鍵字的票
   ↓
3. 對每張票：
   │
   ├─ **⚠️ 必須先執行「已存在檢查」**
   │  ```bash
   │  rg "notion.so/{page_id}" /Users/nicholas/Desktop/Projects/prompts/4_diary/
   │  ```
   │  - 搜尋範圍：整個 4_diary 目錄（含所有子目錄）
   │  - 有結果 → 已存在；無結果 → 不存在
   │  ⚠️ 注意：`[]` 需跳脫為 `\[` 和 `\]`
   │
   ├─【已存在】執行留言比對（5步驟）：
   │   ├─ 1. 讀取本地檔案的「## 留言」區塊
   │   ├─ 2. 取得 Notion 票的留言（用 MCP 工具或腳本）
   │   ├─ 3. 比對留言數量和內容，找出新留言
   │   ├─ 4. **有新留言** → 追加到本地檔案，列入 index.md
   │   └─ 5. **無新留言** → 跳過，不做任何處理
   │
   └─【不存在】檢查票內容：
       │
       ├─ 包含「# 前端修改建議」→ **已處理票**
       │   └─ 只做留言比對（同上述 5 步驟）
       │
       └─ 不包含 → **新票**，待合併
           ├─ notion_get_page_full(page_id)
           ├─ 轉換為 Markdown
           └─ 從標題提取標籤（如 [物件資料管理]）
               ├─ 查映射表找到對應目錄（如 estateListing_api/debug/）
               ├─ 檢查該目錄今天是否已有 bug_spec
               │   ├─ 有 → 追加到今天的 bug_spec（用 --- 分隔）
               │   └─ 沒有 → 新建 {MMDD}_{N}_bug_spec.md
               └─ 如果標籤沒有對應目錄 → 放 /Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/
   ↓
4. 回報結果
   - 更新 X 張（有新留言）
   - 追加 X 張（合併到現有檔案）
   - 新增 X 張（新建檔案）
   - 跳過 X 張（無變動）
   ↓
5. 列出對應的 proposal 檔案
   - 根據 bug spec 檔名前綴（如 0105_1_）
   - 找出同目錄下對應的 proposal 檔案
   - 條列出來（不讀取內容）
```

> 💡 **增量更新好處**：
> - 已有的票保持原位（可能在 4_diary 的不同子目錄）
> - 只更新有變動的留言
> - 新票自動分類到對應的 API 目錄
> - 同一天的票自動合併
> - 未知標籤的票才放 `/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/`

### 分類 → 目錄映射表

> **術語說明**：`[xxx]` 稱為「分類」，與 Notion property「標籤」（如大後台、業主、官網）不同

| 分類 | 對應目錄 |
|------|----------|
| `[物件資料管理]` | `estateListing_api/debug/` |
| `[APP-物件管理]` | `estateListing_api/debug/` |
| `[買方客戶查詢]` | `customer_api/debug/` |
| `[委託客戶查詢]` | `customer_api/debug/` |
| `[APP-客戶管理]` | `customer_api/debug/` |
| `[成交資料查詢]` | `estateTransaction_api/debug/` |
| `[人員資料管理]` | `admin_api/debug/` |
| `[待店長確認]` | `approvement_api/debug/` |
| `[公告類別管理]` | `announcementCategory/debug/` |
| `[合約變更申請]` | `contractChangeRequest_api/debug/` |
| `[休假管理]` | `leave_api/debug/` |
| `[表單列表]` | `contract_api/debug/` |
| `[系統更新日誌]` | `systemLog_api/debug/` |
| `[登入歷程]` | `systemLog_api/debug/` |
| `[人員異動查詢]` | `subscriber/debug/` |
| `[謄本操作紀錄查詢]` | `transcript_api/transcritChange_api/debug/` |
| `[物件資料管理-照片影音]` | `estateMedia_api/debug/` |
| `[檔案]` | `file_upload/debug/` |
| 其他/未知分類 | `/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/` |

### 檔名格式

```
{MMDD}_{N}_bug_spec.md

- MMDD = 月日（如 0111 = 1月11日）
- N = 當天序號（1, 2, 3...）
```

**範例**：
```
0111_1_bug_spec.md   ← 1月11日第一批（通常只有這個，裡面多張票）
0111_2_bug_spec.md   ← 1月11日第二批（QA 後來又提出新的同標籤 bug）
```

> 💡 **說明**：因為票會合併，通常只會有 `_1_` 這個檔案，裡面包含多張票。
> 只有當 QA 在我們合併票後，又提出新的同標籤 bug 票時，才會產生 `_2_`、`_3_` 等。

**序號判斷邏輯**：
- 檢查目標目錄今天是否已有 `{MMDD}_*_bug_spec.md`
- 有 → 追加到該檔案（不會產生新序號）
- 沒有 → 新建 `{MMDD}_1_bug_spec.md`
- 如果用戶明確說「這是新的一批」→ 才產生 `_2_`

### 票的合併規則

> ⚠️ **重要**：相同標籤的新票 → 合併成 **一個** `{MMDD}_1_bug_spec.md` 檔案，**不是每張票一個檔案！**

**術語說明**：
- **標籤**：`[物件資料管理]`（方括號部分）
- **完整標題**：`[物件資料管理]編輯物件資料選擇鄰近捷運站...`

包含相同標籤的票會合併到同一個檔案，用 `---` 分隔：

```markdown
# [物件資料管理]第一張票標題

網址：https://www.notion.so/aaa

...內容...

---

# [物件資料管理]第二張票標題

網址：https://www.notion.so/bbb

...內容...

---

# [物件資料管理]第三張票標題（新追加）

網址：https://www.notion.so/ccc

...內容...
```

### Markdown 格式

> ⚠️ **重要**：新建票只記錄 Notion 票的**原始 Bug 描述**，不需要提案修正或分析。
> 相同標籤的票彙整到同一個 bug_spec.md 檔案中，用 `---` 分隔。

### 內容過濾規則

匯出票內容時，**必須過濾掉以下內容**：
- `# 前端修改建議` 標題及其以下所有內容
- `# 後端修改建議` 標題及其以下所有內容（如果有）

**過濾邏輯**：
```
原始內容：
  問題描述
  ...
  預期結果
  ---
  # 前端修改建議    ← 從這裡開始截斷
  ...分析內容...

匯出內容：
  問題描述
  ...
  預期結果
  （# 前端修改建議 以下的內容不匯出）
```

```markdown
# {icon} {標題}

| 屬性 | 值 |
|------|-----|
| 狀態 | {status} |
| 指派 | {assignees} |
| URL | {url} |
| 最後更新 | {last_edited_time} |

---

## 內容

{content}

---

## 留言

{comments}
```

### 範例輸出

```markdown
# 🤖 [物件資料管理]物件編輯後資料未正確更新

| 屬性 | 值 |
|------|-----|
| 狀態 | 開發中 |
| 指派 | 威G |
| URL | https://www.notion.so/object-data-2e2516bdc04b80ab946cf70ec0d1e237 |
| 最後更新 | 2026-01-11T09:45:00.000Z |

---

## 內容

問題描述
物件編輯後，部分欄位資料未正確更新

前提要件
有已存在物件資料

重現步驟
1. 進入物件編輯頁面
2. 修改物件名稱
3. 點擊儲存
4. 重新進入查看

實際結果
物件名稱未更新，顯示舊資料

[image]

[video]

預期結果
物件名稱應正確顯示更新後的內容

---

## 留言

- **2025-12-20**: 已確認問題
```

---

## 實作方式

### 方案 A：Claude 組合現有工具（推薦）

不需新增 MCP 工具，Claude 直接使用：
1. `notion_query_tickets` - 查詢票
2. `notion_get_page_full` - 取得內容
3. `Write` - 寫入檔案

**優點**：
- 不需改 MCP Server
- 彈性高，Claude 可依情況調整格式
- 可以即時看到進度

**流程**：
```
使用者：/exportN [物件資料管理]

Claude：
  → notion_query_tickets({ assignee: "威G", status: "開發中" })
  → 篩選標題含「[物件資料管理]」
  → 對每張票：
      → rg "notion.so/{page_id}" 4_diary/
      → 【已存在】比對留言，有新留言則更新原檔
      → 【不存在】
          → 查映射表 → estateListing_api/debug/
          → 檢查今天是否已有 bug_spec
          → 有 → 追加到 0111_1_bug_spec.md
          → 沒有 → 新建 0111_1_bug_spec.md
  → 回報結果（更新 X、追加 X、新增 X、跳過 X）
  → 列出對應的 proposal 檔案
```

### 方案 B：新增 MCP 工具

新增 `notion_export_md` 工具，一次完成所有步驟。

**優點**：
- 一個指令完成
- Token 使用量較少

**缺點**：
- 需要修改 MCP Server
- 較不彈性

---

## 建議

採用 **方案 A**，原因：

1. **現有工具已足夠** - 不需額外開發
2. **彈性** - 可以根據需求調整格式
3. **透明** - 每一步都可以看到
4. **快速驗證** - 現在就可以測試

如果之後發現頻繁使用且格式固定，再考慮封裝成 MCP 工具。

---

## 使用範例

### 基本用法

```
使用者：/exportN [物件資料管理]

Claude 回報：
📊 找到 5 張票，標籤「[物件資料管理]」

✅ 更新 1 張（有新留言）
   - 4_diary/estateListing_api/debug/0105_1_bug_spec.md

➕ 追加 2 張（合併到今天的 bug_spec）
   - 4_diary/estateListing_api/debug/0111_1_bug_spec.md

📥 新增 1 張（新建檔案）
   - 4_diary/estateListing_api/debug/0111_1_bug_spec.md

⏭️ 跳過 1 張（無變動）

📋 對應的 proposal 檔案：
   - 4_diary/estateListing_api/debug/0105_1_estateListing_save_and_filter_fix.md
```

### 指定狀態

```
使用者：/exportN [物件資料管理] --status 規劃中
```

### 指定人員

```
使用者：/exportN [權限] --assignee Fei
```

---

## Skill 檔案設計

### 檔案位置

```
/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/exportN.md
```

> 💡 **說明**：`Projects/.claude/commands` 是 symlink 指向 `backend-nestjs/.claude/commands`，所以放在 backend-nestjs 就等於放在 Projects。

### Skill 檔案內容

```markdown
---
description: 匯出 Notion 票到本地 Markdown 檔案
argument-hint: <標籤或URL> [--status 狀態] [--assignee 人員]
---

## 參數

- 標籤或 URL：$1（必填）
  - 方式一：標籤，如 `[物件資料管理]`
  - 方式二：URL，如 `https://www.notion.so/xxxxx`
- 狀態：$2（選填，預設「開發中」）
- 人員：$3（選填，預設「威G」）

## 預設值

- **指派人員**：威G
- **狀態**：開發中

## 輸入判斷邏輯

```
if $1 starts with "https://www.notion.so/" or "notion.so/":
    → 方式二：從 URL 提取 page_id → 取得票標題 → 提取標籤
else:
    → 方式一：直接使用 $1 作為標籤
```

## 分類 → 目錄映射表

> **術語說明**：`[xxx]` 稱為「分類」，與 Notion property「標籤」（如大後台、業主、官網）不同

| 分類 | 對應目錄 |
|------|----------|
| `[物件資料管理]` | `estateListing_api/debug/` |
| `[APP-物件管理]` | `estateListing_api/debug/` |
| `[買方客戶查詢]` | `customer_api/debug/` |
| `[委託客戶查詢]` | `customer_api/debug/` |
| `[APP-客戶管理]` | `customer_api/debug/` |
| `[成交資料查詢]` | `estateTransaction_api/debug/` |
| `[人員資料管理]` | `admin_api/debug/` |
| `[待店長確認]` | `approvement_api/debug/` |
| `[公告類別管理]` | `announcementCategory/debug/` |
| `[合約變更申請]` | `contractChangeRequest_api/debug/` |
| `[休假管理]` | `leave_api/debug/` |
| `[表單列表]` | `contract_api/debug/` |
| `[系統更新日誌]` | `systemLog_api/debug/` |
| `[登入歷程]` | `systemLog_api/debug/` |
| `[人員異動查詢]` | `subscriber/debug/` |
| `[謄本操作紀錄查詢]` | `transcript_api/transcritChange_api/debug/` |
| `[物件資料管理-照片影音]` | `estateMedia_api/debug/` |
| `[檔案]` | `file_upload/debug/` |
| 其他/未知分類 | `/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/` |

## 任務

1. **判斷輸入類型**：
   - 如果 $1 是 URL → 用 `notion_get_page_full` 取得票標題 → 提取標籤
   - 如果 $1 是標籤 → 直接使用
2. 使用 `notion_query_tickets` 查詢票（預設 assignee=威G, status=開發中）
3. 篩選標題包含標籤的票
4. 對每張票執行增量更新：
   - 用 rg 搜尋 `notion.so/{page_id}` 判斷是否已存在於 4_diary/
   - 【已存在】檢查 Notion 留言，有新留言則更新
   - 【不存在】下載內容，根據標籤映射表放到對應目錄
5. 同標籤的票合併到同一個檔案（用 `---` 分隔）
6. 檔名格式：`{MMDD}_{N}_bug_spec.md`
7. 回報結果（更新 X、追加 X、新增 X、跳過 X）
8. 更新 `/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/index.md` 彙總檔
9. 列出對應的 proposal 檔案

## 輸出格式

每張票的 Markdown 格式：

\`\`\`markdown
# {標題}

網址：{notion_url}

{內容}

---

## 留言

{comments}（如果有）
\`\`\`
```

---

## 設計決策

### 留言更新方式
- **追加更新**（非整個替換）
- 原因：同事可能編輯留言，AI 判斷哪些是新留言後追加
- AI 比對邏輯：比對留言時間戳或內容，識別新增/修改的留言

### 內容更新處理
- **預設不更新內容**，只更新留言
- 如需重新下載完整內容，用戶明確指示即可（不需 `--force` 參數）

### index.md 彙總檔

- **位置**：`/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/index.md`
- **用途**：彙總本次匯出的所有票
- **生命週期**：用戶分配完成或實作完後會清空，下次執行時重新建立
- **好處**：避免每次都建立新檔案，維持乾淨的目錄結構

> ⚠️ **重要**：直接使用 `index_data.all_tickets` 的原始內容，**禁止自行修改或組合標題**。

**票標題說明**：
- 票標題格式通常是 `[項目]XXXXX`，例如 `[物件資料管理]物件編輯後資料未正確更新`
- `[項目]` 是票標題的一部分，**不是** Notion 的「標籤」屬性（如大後台、業主、官網）
- 有些票標題沒有 `[項目]` 前綴，那就直接顯示原始標題
- **禁止** AI 自行把 Notion 標籤屬性加到標題前面

**格式**：

```markdown
# Notion 票匯總

> 最後更新：2026-01-12 14:30

## 所有撈下來的票

- [ ] [物件資料管理]物件編輯後資料未正確更新    ← 票標題本身就有 [項目]
- [ ] 登入方式修改                              ← 票標題沒有 [項目]，直接顯示
- [ ] [買方客戶查詢]使用總價進行需求配對...

## 已存在的票，有新的留言

- [物件資料管理]物件編輯後資料未正確更新
  - estateListing_api/debug/0105_1_bug_spec.md
  - estateListing_api/debug/0105_1_estateListing_save_and_filter_fix.md
- [買方客戶查詢]編輯買方客戶加入承辦2後，承辦1與承辦2會對調
  - customer_api/debug/0108_1_bug_spec.md
  - customer_api/debug/0108_1_customer_assignee_fix.md
```

> 💡 匯出時生成 `- [ ]` 項目，狀態由用戶自行管理。
> 💡 「已存在的票」同時列出 bug_spec 和對應的 proposal 檔案，方便快速定位。

---

## 問題記錄與解決方案

### 2026-01-12 驗證發現的問題

讓另一個 AI 執行 `/exportN [物件資料管理]`，發現以下問題：

#### 問題 1：重複匯出已存在的票

| 新建檔案 | page_id | 已存在於 |
|---------|---------|---------|
| `0112_1_bug_spec.md` | `2dc516bdc04b804c...` | `copy_and_delete/debug/0102_1_bug_spec.md` |
| `0112_2_bug_spec.md` | `2dd516bdc04b806c...` | `copy_and_delete/debug/0103_1_bug_spec.md` |

**原因**：AI 沒有正確執行 `rg` 搜尋整個 4_diary 目錄。

#### 問題 2：沒有合併成一個檔案

AI 創建了 5 個檔案（0112_1 到 0112_5），而不是合併成一個 `0112_1_bug_spec.md`。

#### 問題 3：執行順序錯誤

AI 的執行順序是：
1. 先創建檔案
2. 再搜尋 → 當然找到自己剛創建的檔案
3. 所以報告「7 張都已存在」

**正確的順序應該是**：
1. 先用 `rg` 搜尋**所有** page_id
2. 記錄哪些已存在、哪些不存在
3. 再決定要新增還是更新

#### 問題 4：AI 自己寫程式碼

AI 嘗試用 `node -e "require('@notionhq/client')..."` 自己寫程式碼，而不是使用現成的 `test-query.mjs` 腳本，導致 `npm install` 錯誤。

### 解決方案：Wrapper 腳本

為了強制正確的執行順序，需要建立一個 wrapper 腳本，讓 AI 只需要呼叫一個指令，無法自己亂來。

---

## Wrapper 腳本規劃

### 什麼是 Wrapper 腳本？

Wrapper 腳本是一個「包裝」腳本，把複雜的多步驟流程封裝成**一個簡單的指令**。

**類比**：
- 沒有 Wrapper：AI 需要自己組合 10 個步驟 → 容易出錯
- 有 Wrapper：AI 只需要呼叫 1 個指令 → 腳本內部處理所有步驟

### 好處

1. **強制執行順序** - 腳本內部控制，AI 無法跳過步驟
2. **減少 Token** - AI 不需要組合複雜命令
3. **避免錯誤** - 不會再出現「先創建再搜尋」的問題
4. **簡化 Skill** - Skill 只需要說「呼叫這個腳本」

---

## Wrapper 腳本詳細設計

### 檔案位置

```
/Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-notion.mjs
```

### 呼叫方式

```bash
node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-notion.mjs "[物件資料管理]" "開發中" "威G"
```

**參數**（對應 skill 設計）：
- `$1`：標籤或 URL（必填）
- `$2`：狀態（選填，預設「開發中」）
- `$3`：人員（選填，預設「威G」）

### 內部執行流程

```
輸入：標籤/URL、狀態、人員
│
├─ 1. 判斷輸入類型
│   ├─ URL → 取得票標題 → 提取標籤
│   └─ 標籤 → 直接使用
│
├─ 2. 查詢 Notion 票
│   └─ 使用 Notion API（同 test-query.mjs）
│
├─ 3. 篩選標籤
│   └─ 只保留標題包含指定標籤的票
│
├─ 4. **先搜尋所有 page_id 是否已存在**（強制順序！）
│   └─ 對每張票執行：rg "notion.so/{page_id}" /Users/.../4_diary/
│
├─ 5. 分類票
│   ├─ 已存在 → 記錄檔案路徑
│   └─ 不存在 → 檢查是否包含「# 前端修改建議」
│       ├─ 包含 → 視為已處理票（需找對應檔案）
│       └─ 不包含 → 標記為新票
│
├─ 6. 取得每張票的留言
│   └─ 使用 Notion API（同 test-comments.mjs）
│
├─ 7. 比對留言（已存在的票）
│   ├─ 讀取本地檔案的「## 留言」區塊
│   └─ 比對 Notion 留言，找出新留言
│
└─ 8. 輸出 JSON 結果
```

### 輸出格式（JSON）

```json
{
  "tag": "[物件資料管理]",
  "status": "開發中",
  "assignee": "威G",
  "target_dir": "estateListing_api/debug/",
  "summary": {
    "total": 7,
    "existing": 4,
    "existing_with_new_comments": 2,
    "new": 3
  },
  "existing_tickets": [
    {
      "page_id": "2dc516bdc04b804cacabf31e15203750",
      "title": "[物件資料管理]物件複製後，開發承辦人沒有按照複製物件頁面填寫的內容儲存",
      "file": "/Users/.../4_diary/estateListing_api/copy_and_delete/debug/0102_1_bug_spec.md",
      "has_new_comments": true,
      "new_comments": [
        {
          "date": "2026/1/12 下午3:00:00",
          "content": "這個問題已經修正了"
        }
      ],
      "proposals": [
        "estateListing_api/copy_and_delete/debug/0102_1_copy_delete_fix.md"
      ]
    },
    {
      "page_id": "2dd516bdc04b805d8c0cd012289cf287",
      "title": "[物件資料管理]編輯物件資料輸入管理費...",
      "file": "/Users/.../4_diary/estateListing_api/debug/0103_1_bug_spec.md",
      "has_new_comments": false,
      "new_comments": [],
      "proposals": []
    }
  ],
  "new_tickets": [
    {
      "page_id": "2dd516bdc04b807b8e94e1b7371cc56e",
      "title": "[物件資料管理]編輯物件資料勾選公共設施/出租說明...",
      "url": "https://www.notion.so/2dd516bdc04b807b8e94e1b7371cc56e",
      "content": "問題描述\n編輯物件資料勾選公共設施...\n\n預期結果\n...",
      "comments": [
        {
          "date": "2026/1/3 下午5:13:00",
          "content": "修正已經進 dev/staging"
        }
      ]
    }
  ],
  "index_data": {
    "all_tickets": [
      "[物件資料管理]物件複製後，開發承辦人沒有按照複製物件頁面填寫的內容儲存",
      "[物件資料管理]編輯物件資料輸入管理費...",
      "[物件資料管理]編輯物件資料勾選公共設施/出租說明..."
    ],
    "tickets_with_new_comments": [
      {
        "title": "[物件資料管理]物件複製後，開發承辦人沒有按照複製物件頁面填寫的內容儲存",
        "file": "estateListing_api/copy_and_delete/debug/0102_1_bug_spec.md",
        "proposals": [
          "estateListing_api/copy_and_delete/debug/0102_1_copy_delete_fix.md"
        ]
      }
    ]
  },
  "proposal_files": [
    {
      "bug_spec": "estateListing_api/debug/0105_1_bug_spec.md",
      "proposals": [
        "estateListing_api/debug/0105_1_estateListing_save_and_filter_fix.md"
      ]
    },
    {
      "bug_spec": "estateListing_api/copy_and_delete/debug/0102_1_bug_spec.md",
      "proposals": [
        "estateListing_api/copy_and_delete/debug/0102_1_copy_delete_fix.md"
      ]
    }
  ]
}
```

### 標籤 → 目錄映射表（內建於腳本）

支援三種標籤來源（優先順序由高到低）：
1. **標題格式 `[xxx]`** - 精確匹配
2. **Notion property「標籤」欄位** - 當標題沒有 `[xxx]` 時使用
3. **標題關鍵字** - 當以上都沒有對應目錄時，根據標題關鍵字決定

```javascript
const TAG_DIR_MAP = {
  // 標題格式分類（含方括號）- 與 Notion property「標籤」不同
  '[物件資料管理]': 'estateListing_api/debug/',
  '[APP-物件管理]': 'estateListing_api/debug/',
  '[買方客戶查詢]': 'customer_api/debug/',
  '[委託客戶查詢]': 'customer_api/debug/',
  '[APP-客戶管理]': 'customer_api/debug/',
  '[成交資料查詢]': 'estateTransaction_api/debug/',
  '[人員資料管理]': 'admin_api/debug/',
  '[待店長確認]': 'approvement_api/debug/',
  '[公告類別管理]': 'announcementCategory/debug/',
  '[合約變更申請]': 'contractChangeRequest_api/debug/',
  '[休假管理]': 'leave_api/debug/',
  '[表單列表]': 'contract_api/debug/',
  '[系統更新日誌]': 'systemLog_api/debug/',
  '[登入歷程]': 'systemLog_api/debug/',
  '[人員異動查詢]': 'subscriber/debug/',
  '[謄本操作紀錄查詢]': 'transcript_api/transcritChange_api/debug/',
  '[物件資料管理-照片影音]': 'estateMedia_api/debug/',
  '[首頁串 API]': 'frontPage_api/debug/',
  '[首頁串API]': 'frontPage_api/debug/',
  '[檔案]': 'file_upload/debug/',
  // Notion property 標籤（不含方括號）
  '官網': 'publicApi/debug/',
  'default': '/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/'
}

// 標題關鍵字 → 目錄映射表
const TITLE_KEYWORD_MAP = {
  '登入': 'auth_api/debug/',
  '權限': 'role_and_permission/debug/',
}
```

### 目錄決定邏輯（`getTargetDir` 函數）

```javascript
function getTargetDir(tag, title = '') {
  // 1. 先檢查標籤是否有對應目錄
  if (TAG_DIR_MAP[tag] && tag !== 'default') {
    return TAG_DIR_MAP[tag]
  }

  // 2. 檢查標題關鍵字
  for (const [keyword, dir] of Object.entries(TITLE_KEYWORD_MAP)) {
    if (title.includes(keyword)) {
      return dir
    }
  }

  // 3. 預設目錄
  return TAG_DIR_MAP['default']
}
```

### 內容過濾規則（內建於腳本）

```javascript
function filterContent(content) {
  // 在「# 前端修改建議」或「# 後端修改建議」處截斷
  const cutoffPatterns = [
    /^# 前端修改建議/m,
    /^# 後端修改建議/m
  ]

  for (const pattern of cutoffPatterns) {
    const match = content.match(pattern)
    if (match) {
      content = content.substring(0, match.index).trim()
    }
  }

  return content
}
```

### AI 的工作（簡化後）

有了 Wrapper 腳本後，AI 只需要：

1. **呼叫腳本取得 JSON 結果**
   ```bash
   node /Users/.../export-notion.mjs "[物件資料管理]" "開發中" "威G"
   ```

2. **根據 JSON 處理已存在的票**
   - 如果 `has_new_comments: true` → 追加新留言到檔案

3. **根據 JSON 處理新票**
   - 使用 `content` 欄位（已過濾）
   - 合併到一個 `{MMDD}_1_bug_spec.md` 檔案
   - 用 `---` 分隔每張票

4. **更新 index.md**
   - 使用 `index_data.all_tickets` 生成「所有撈下來的票」列表
   - 使用 `index_data.tickets_with_new_comments` 生成「已存在的票，有新的留言」列表

5. **列出對應的 proposal 檔案**
   - 使用 `proposal_files` 欄位
   - 顯示每個 bug_spec 對應的 proposal 檔案

6. **回報結果**

### Skill 修改後的任務區塊

```markdown
## 任務

1. **呼叫 Wrapper 腳本**：
   ```bash
   node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-notion.mjs "$1" "$2" "$3"
   ```

2. **根據 JSON 結果處理已存在的票**：
   - 如果 `has_new_comments: true` → 追加 `new_comments` 到檔案的留言區塊
   - ⚠️ **重要：一個檔案可能包含多張票**，需要精準插入到對應的子區塊：
     1. 讀取檔案，找到 `## 留言` 區塊
     2. 用票的 `title` 找到對應的 `### [票標題]` 子區塊
     3. 如果子區塊存在 → 追加新留言到該子區塊末尾
     4. 如果子區塊不存在 → 在 `## 留言` 區塊末尾新建 `### [票標題]` 子區塊

3. **根據 JSON 結果處理新票**：
   - 使用 `new_tickets` 中的 `content`（已過濾）
   - 合併成一個 `{MMDD}_1_bug_spec.md` 檔案
   - 用 `---` 分隔每張票

4. **更新 index.md 彙總檔**：
   - 使用 `index_data.all_tickets` 生成「## 所有撈下來的票」列表
   - 使用 `index_data.tickets_with_new_comments` 生成「## 已存在的票，有新的留言」列表
     - 每張票同時列出 `file`（bug_spec）和 `proposals`（對應的提案檔案）

5. **列出對應的 proposal 檔案**：
   - 使用 `proposal_files` 欄位
   - 條列每個 bug_spec 對應的 proposal 檔案（不讀取內容）

6. 回報結果（更新 X、新增 X、跳過 X）
```

### 對照檢查：Wrapper 是否符合 Skill 設計

| Skill 需求 | Wrapper 是否處理 |
|-----------|-----------------|
| 標籤或 URL 輸入 | ✅ 參數 $1 |
| 狀態篩選（預設開發中） | ✅ 參數 $2 |
| 人員篩選（預設威G） | ✅ 參數 $3 |
| 標籤 → 目錄映射 | ✅ TAG_DIR_MAP |
| 用 rg 搜尋整個 4_diary | ✅ 內部執行 |
| 留言比對 | ✅ 比對並輸出 new_comments |
| 內容過濾（截斷前端修改建議） | ✅ filterContent() |
| 輸出已過濾的 content | ✅ JSON 中的 content 欄位 |
| 判斷已處理票 | ✅ 檢查「# 前端修改建議」 |
| index.md 更新資料 | ✅ index_data 欄位（all_tickets + tickets_with_new_comments） |
| 列出對應 proposal 檔案 | ✅ existing_tickets.proposals + index_data.tickets_with_new_comments.proposals |
| 留言精準插入（多票檔案） | ✅ Skill 已更新，Wrapper 已提供足夠資訊 |

---

## ✅ 已完成：留言精準插入問題（2026-01-12）

> **發現日期**：2026-01-12
> **問題**：當一個 bug_spec 檔案包含多張票時，新留言沒有插入到對應票的留言子區塊

### 問題分析

**檔案結構**：
```markdown
# [票A標題]
網址：...
（票A內容）

---

# [票B標題]
網址：...
（票B內容）

---

## 留言

### [票A標題]
- 留言1
- 留言2

### [票B標題]
- 留言1
```

**問題現象**：
- 票A 和票B 的新留言都被加到檔案最底端
- 而不是各自追加到對應的 `### [票標題]` 子區塊

### 責任歸屬

| 元件 | 狀態 | 說明 |
|------|------|------|
| Wrapper | ✅ 已提供足夠資訊 | 每張票有獨立的 `title` + `new_comments` |
| Skill | ⚠️ 需要修改 | 需明確說明如何處理多票檔案的留言插入 |

### 解決方案

**修改 Skill 任務說明**（已更新）：

```markdown
2. **根據 JSON 結果處理已存在的票**：
   - 如果 `has_new_comments: true` → 追加 `new_comments` 到檔案的留言區塊
   - ⚠️ **重要：一個檔案可能包含多張票**，需要精準插入到對應的子區塊：
     1. 讀取檔案，找到 `## 留言` 區塊
     2. 用票的 `title` 找到對應的 `### [票標題]` 子區塊
     3. 如果子區塊存在 → 追加新留言到該子區塊末尾
     4. 如果子區塊不存在 → 在 `## 留言` 區塊末尾新建 `### [票標題]` 子區塊
```

### 實作狀態

- [x] 提案文件已更新
- [x] Skill 檔案已更新（2026-01-12）

---

## ✅ 已完成：Wrapper 修改（2026-01-12）

> **需求**：「已存在的票」區塊要同時列出 bug_spec 和對應的 proposal 檔案

### 修改位置

`/Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-notion.mjs`

### 修改內容

將 `proposals` 直接嵌入 `existing_tickets` 和 `index_data.tickets_with_new_comments` 中：

```javascript
// 現行結構
existing_tickets: [
  { page_id, title, file, has_new_comments, new_comments }
]

// 修改後結構
existing_tickets: [
  { page_id, title, file, has_new_comments, new_comments, proposals: [...] }
]
```

### 好處

1. **Skill 處理更簡單** - 不需要自己做 mapping，直接取用 `ticket.proposals`
2. **生成 index.md 更直接** - `tickets_with_new_comments` 已包含 proposals，可直接列出

### 實作方式

在現有的 `findProposalFiles()` 函數基礎上，把 proposals 直接塞入 `existing_tickets` 和 `tickets_with_new_comments`：

```javascript
// 在 existingTicket 物件中加入 proposals
const existingTicket = {
  page_id: ticket.id,
  title: ticket.title,
  file: existingFile,
  has_new_comments: newComments.length > 0,
  new_comments: newComments,
  proposals: findProposalFiles(existingFile)  // 直接嵌入
}

// tickets_with_new_comments 也要加入 proposals
if (newComments.length > 0) {
  ticketsWithNewComments.push({
    title: ticket.title,
    file: existingFile.replace(DIARY_BASE_PATH + '/', ''),
    proposals: proposals.map(p => p.replace(DIARY_BASE_PATH + '/', ''))
  })
}
```

### 注意事項

- `proposal_files` 欄位可以保留（向後兼容），但主要使用嵌入的 `proposals`
- `findProposalFiles()` 函數需要返回相對路徑陣列，而不是絕對路徑

---

## ✅ 已完成：URL 標題前綴導致搜尋失敗（2026-01-19）

> **發現日期**：2026-01-19
> **問題**：當 QA 修改 Notion 票標題後，已存在的票會被誤判為「新票」，導致重複匯出

### 問題分析

**場景**：
1. 用戶執行 `/exportN https://www.notion.so/Error-Code-2eb516bdc04b80eeb818ca3af881afba`
2. 這張票之前已經匯出過，存在於 `0118_1_bug_spec.md`
3. 但 Wrapper 搜尋不到，誤判為新票

**原因**：

Notion URL 格式會帶有標題前綴：
```
https://www.notion.so/Error-Code-2eb516bdc04b80eeb818ca3af881afba
                     ^^^^^^^^^^^
                     標題前綴（會隨著 QA 改標題而變化）
```

原本的搜尋邏輯 (`export-notion.mjs:221`)：
```javascript
`rg -l "notion.so/${pageId}" "${DIARY_BASE_PATH}" ...`
// 搜尋：notion.so/2eb516bdc04b80eeb818ca3af881afba
```

但檔案中記錄的是完整 URL（帶標題前綴）：
```markdown
網址：https://www.notion.so/Error-Code-2eb516bdc04b80eeb818ca3af881afba
```

**匹配失敗**：`notion.so/2eb516bdc04b80...` ≠ `notion.so/Error-Code-2eb516bdc04b80...`

### 解決方案

**直接搜尋 page_id，不加 `notion.so/` 前綴**：

```javascript
// 舊（有問題）
`rg -l "notion.so/${pageId}" "${DIARY_BASE_PATH}" --glob "!**/notion-export-md-proposal.md"`

// 新（修正後）
`rg -l "${pageId}" "${DIARY_BASE_PATH}" --glob "!**/notion-export-md-proposal.md"`
```

**理由**：
- page_id 是 32 字元的唯一 hex 字串（如 `2eb516bdc04b80eeb818ca3af881afba`）
- 無論 URL 格式如何變化，直接搜尋 page_id 都能正確匹配
- 不會有誤匹配風險，因為 page_id 格式非常特殊

### 實作狀態

- [x] 問題記錄到設計文件
- [x] 修改 `export-notion.mjs:221` 的搜尋邏輯

---

## ✅ 已完成：URL 輸入應只處理指定的單張票（2026-01-19）

> **發現日期**：2026-01-19
> **問題**：用戶指定特定票的 URL，但 Wrapper 會處理所有同標籤的票

### 問題分析

**場景**：
1. 用戶執行 `/exportN https://www.notion.so/2d0516bdc04b8043a856d1efef94b219`
2. 預期：只處理這一張票
3. 實際：處理了 2 張票（所有 `[物件資料管理]` 標籤的票）

**原因**：

原本的邏輯（`export-notion.mjs:318-339`）：
```javascript
if (isNotionUrl(tagOrUrl)) {
  const pageId = extractPageIdFromUrl(tagOrUrl)
  const page = await getPageFull(pageId)
  tag = extractTagFromTitle(page.title)  // 提取標籤
}

// 用標籤查詢所有同標籤的票
const allTickets = await queryTickets({ assignee, status })
const filteredTickets = allTickets.filter(t => t.title.includes(tag))
```

**問題**：URL 輸入被轉換成標籤後，又去查詢所有同標籤的票，導致多處理了不相關的票。

### 預期行為

| 輸入類型 | 預期行為 |
|---------|---------|
| URL | 只處理指定的那一張票 |
| 標籤 | 處理所有同標籤的票 |

### 解決方案

**新增 URL 單票處理模式**：

當輸入是 URL 時，直接處理該票，不走標籤查詢流程：

```javascript
if (isNotionUrl(tagOrUrl)) {
  const pageId = extractPageIdFromUrl(tagOrUrl)
  const page = await getPageFull(pageId)
  tag = extractTagFromTitle(page.title)

  // 🆕 URL 模式：只處理這一張票，不查詢其他同標籤的票
  const singleTicket = {
    id: pageId,
    title: page.title,
    // ... 其他屬性
  }
  filteredTickets = [singleTicket]
  // 跳過 queryTickets 和 filter 步驟
}
```

### 實作狀態

- [x] 問題記錄到設計文件
- [x] 修改 `export-notion.mjs` 的 URL 處理邏輯

---

## ✅ 已完成：支援 Notion property 標籤和標題關鍵字映射（2026-01-21）

> **發現日期**：2026-01-21
> **問題**：當票標題沒有 `[xxx]` 格式時，無法正確歸檔到對應目錄

### 問題分析

**場景**：
1. 用戶執行 `/exportN https://www.notion.so/2e6516bdc04b80d6bba3d5eecbe8d6d1`
2. 這張票標題是「登入方式修改」，沒有 `[xxx]` 格式標籤
3. 但票有 Notion property 標籤：「大後台」、「業主」
4. 原本的邏輯只從標題提取 `[xxx]`，找不到就報錯

**原因**：
- 原本的 `extractTagFromTitle()` 只支援標題中的 `[xxx]` 格式
- 沒有讀取 Notion property「標籤」欄位
- 沒有根據標題關鍵字判斷目錄

### 解決方案

**三層標籤來源機制**（優先順序由高到低）：

1. **標題格式 `[xxx]`** - 精確匹配（原有邏輯）
2. **Notion property「標籤」欄位** - 當標題沒有 `[xxx]` 時使用
3. **標題關鍵字** - 當以上都沒有對應目錄時，根據標題關鍵字決定

**修改內容**：

| 修改項目 | 說明 |
|---------|------|
| `getPageFull()` | 新增 `tags` 屬性，從 Notion property「標籤」欄位提取 |
| `TAG_DIR_MAP` | 新增「官網」→ `publicApi/debug/` |
| `TITLE_KEYWORD_MAP` | 新增標題關鍵字映射表 |
| `getTargetDir()` | 支援三層優先順序：標籤 → 標題關鍵字 → 預設 |

**標題關鍵字映射**：

| 關鍵字 | 對應目錄 |
|-------|---------|
| `登入` | `auth_api/debug/` |
| `權限` | `role_and_permission/debug/` |

### 測試結果

```
輸入：https://www.notion.so/2e6516bdc04b80d6bba3d5eecbe8d6d1
票標題：「登入方式修改」
Notion 標籤：「大後台」、「業主」

判斷流程：
1. 標題沒有 [xxx] 格式 ❌
2. Notion 標籤「大後台」沒有對應目錄 ❌
3. 標題包含「登入」關鍵字 ✅
   ↓
target_dir: "auth_api/debug/" ✅
```

### 實作狀態

- [x] 問題記錄到設計文件
- [x] 修改 `getPageFull()` 提取 Notion property 標籤
- [x] 新增 `TITLE_KEYWORD_MAP` 標題關鍵字映射表
- [x] 修改 `getTargetDir()` 支援三層優先順序
- [x] 更新設計文件的映射表區塊

---

## ✅ 已完成：釐清票標題與 Notion 標籤屬性的差異（2026-01-21）

> **發現日期**：2026-01-21
> **問題**：AI 誤把 Notion 標籤屬性加到票標題前面

### 問題分析

**場景**：
1. 執行 `/exportN https://www.notion.so/2e6516bdc04b80d6bba3d5eecbe8d6d1`
2. JSON 結果：`tag: "大後台"`、`title: "登入方式修改"`
3. AI 在 index.md 中寫成 `- [ ] [大後台] 登入方式修改`
4. 但原始票標題就是「登入方式修改」，不應該加 `[大後台]`

**原因**：
- 設計文件範例寫 `[標籤]票名`，AI 誤以為要把 Notion 標籤屬性加上去
- 實際上 `[項目]` 是票標題的一部分，不是 Notion 標籤屬性
- 應該直接使用 `index_data.all_tickets` 的原始內容

### 名詞釐清

| 名稱 | 實際意義 | 範例 |
|------|---------|------|
| `[項目]` | 票標題的一部分 | `[物件資料管理]物件編輯後資料未正確更新` |
| Notion 標籤屬性 | Notion property「標籤」欄位 | 大後台、業主、官網 |

### 解決方案

在設計文件和 Skill 檔案中明確說明：

1. **直接使用 `index_data.all_tickets` 的原始內容**
2. **禁止自行修改或組合標題**
3. **`[項目]` 是票標題的一部分，不是 Notion 標籤屬性**

### 實作狀態

- [x] 問題記錄到設計文件
- [x] 更新 `exportN.md` 的 index.md 格式說明
- [x] 更新設計文件的 index.md 彙總檔說明

---

## 研究記錄：Notion 封存留言與本地檔案的關係（2026-01-26）

> **研究日期**：2026-01-26
> **起因**：同事在 Notion 票中使用「已完成封存」功能，需確認這是否會影響本地已記錄的留言

### 研究發現

#### 1. Notion API 對封存留言的處理

**測試方式**：
```bash
curl -X GET "https://api.notion.com/v1/comments?block_id={page_id}&page_size=100" \
  -H "Authorization: Bearer {token}" \
  -H "Notion-Version: 2022-06-28"
```

**結論**：Notion `/v1/comments` API **只返回未解決（unresolved）的留言**，被標記為「已解決/封存」的討論串不會返回。

#### 2. 本地留言是否會被刪除

**結論**：**不會刪除**

我們的設計採用**追加邏輯**（非覆蓋）：

```
執行 /exportN
│
├─ 1. Wrapper 腳本取得 Notion 留言（只有未封存的）
│
├─ 2. findNewComments() 比對本地檔案
│   └─ 只找出「Notion 有但本地沒有」的留言
│
└─ 3. AI 追加新留言到本地檔案末尾
    └─ 不會動到已經存在的留言 ✅
```

**設計決策引用**（本文件第 617-620 行）：
```
### 留言更新方式
- **追加更新**（非整個替換）
- 原因：同事可能編輯留言，AI 判斷哪些是新留言後追加
```

#### 3. 封存後的行為總結

| 留言狀態 | Notion API 返回 | 本地檔案 |
|---------|----------------|---------|
| 封存前已匯出的留言 | ❌ 不返回 | ✅ 保留（不會被刪除）|
| 封存後的新留言 | ❌ 不返回 | ❌ 無法取得 |
| 未封存的新留言 | ✅ 返回 | ✅ 會追加 |

### 結論與建議

1. **安全性確認**：同事封存舊討論串，我們這邊已記錄的留言**不會被刪除**
2. **API 限制**：這是 Notion API 的設計，無法透過參數取得已封存的留言
3. **變通方案**：如果需要保留所有討論內容，可以請同事：
   - 不要 resolve 討論串，改用其他方式標記（如打勾 emoji）
   - 或在 resolve 前先複製重點到票的內容區

---

## ✅ 已實作：同事補充內容同步（2026-01-31 設計，同日完成）

> **需求背景**：同事（QA/前端）可能會在 Notion 票中補充有用資訊（如 request body、response 範例），這些資訊對 debug 有幫助，應該同步到本地。

### 設計決策記錄

| 討論項目 | 決策 |
|---------|------|
| 更新目標 | 先更新 bug_spec，再由 AI 分派到 proposal |
| 追加位置 | 該票內容區塊的最後（留言之前） |
| 觸發時機 | `/exportN` 執行時一併處理 |
| 偵測方式 | 全量 diff（比對 Notion 內容 vs bug_spec 內容） |
| 🆕 過濾方式 | **雙重過濾**：寬鬆標題 pattern + proposal 內容比對 |
| 🆕 寬鬆 pattern 原因 | 前端同事會修改我們複製過去的標題（如 `# 前端修改建議` → `# 前端需要增加...`）|
| 🆕 proposal 比對原因 | 確保「我們寫的內容複製到 Notion」不會被當成「同事補充」抓回來 |

### 執行流程

```
/exportN 執行時（已存在的票）
│
├─ 現有邏輯：比對留言，追加新留言到 bug_spec
│
└─ 🆕 新增邏輯：比對內容，追加「同事新增的說明」到 bug_spec + proposal
    │
    ├─ 階段 0：雙重過濾（Wrapper 層）
    │   ├─ 第一層：寬鬆標題 pattern 過濾（# 前端...、# 後端...）
    │   ├─ 第二層：讀取 proposal 內容，過濾「已存在於 proposal」的內容
    │   └─ 輸出：只保留「真正的同事補充內容」
    │
    ├─ 階段 1：更新 bug_spec
    │   ├─ 取得過濾後的 content_diff
    │   ├─ 比對 bug_spec 的原始內容（## 留言 以上）
    │   ├─ 找出「Notion 有但 bug_spec 沒有」的段落
    │   └─ 追加到該票內容區塊的最後（留言之前）
    │
    └─ 階段 2：AI 智能分派到 proposal
        ├─ 判斷這些內容屬於哪個 proposal 的範疇
        └─ 放到對應的 proposal 適當位置
```

### 內容過濾規則

**不抓的內容**：

> ⚠️ **原因**：這些內容通常是我們在 proposal 分析完成後，複製到 Notion 票上給 QA/DBA/前端同事看的。
> 既然是從 proposal 複製過去的，就不需要再抓回來。

| 標題格式 | 說明 |
|---------|------|
| `# 前端...` | h1 格式，**寬鬆匹配**（前端同事可能改標題） |
| `## 前端...` | h2 格式，**寬鬆匹配** |
| `# 後端...` | h1 格式，**寬鬆匹配** |
| `## 後端...` | h2 格式，**寬鬆匹配** |
| `# DB說明` | h1 格式 |
| `## DB說明` | h2 格式 |
| `# DB討論` | h1 格式 |
| `## DB討論` | h2 格式 |

**過濾邏輯**：遇到以上標題時，該標題及其以下所有內容都不抓。

---

### 🆕 2026-01-31 優化：雙重過濾機制

**問題發現**：
- 前端同事會修改我們複製過去的標題
- 例如：`# 前端修改建議` → `# 前端需要增加送必填資訊 objectType 到 EstateTransaction API`
- 原本的精確匹配 pattern 無法過濾這類變體標題

**解決方案：雙重過濾機制**

```
content_diff 判斷流程
│
├─ 第一層：標題 Pattern 過濾
│   └─ 寬鬆匹配 `# 前端...`、`# 後端...` 開頭的標題
│
├─ 第二層：Proposal 內容比對
│   ├─ 讀取對應的 proposal 檔案內容
│   └─ 過濾「已存在於 proposal」的內容（那是我們寫的）
│
└─ 最終結果：只保留「真正的同事補充內容」
```

**實作細節**：

```javascript
// 第一層：寬鬆 pattern（處理前端改標題的情況）
const cutoffPatterns = [
  /^\s*#{1,2}\s*前端/m,   // 匹配所有 # 前端... 開頭
  /^\s*#{1,2}\s*後端/m,   // 匹配所有 # 後端... 開頭
  /^\s*#{1,2}\s*DB說明/m,
  /^\s*#{1,2}\s*DB討論/m,
]

// 第二層：比對 proposal 內容
function findContentDiff(notionContent, localContent, proposalPaths = []) {
  const proposalContent = readProposalContent(proposalPaths)

  for (const line of notionLines) {
    // 檢查是否已存在於 bug_spec
    const existsInLocal = localLines.some(l => l.trim() === line.trim())

    // 檢查是否已存在於 proposal（我們寫的內容）
    const existsInProposal = proposalContent.includes(line.trim())

    // 只保留「兩邊都沒有」的內容
    if (!existsInLocal && !existsInProposal) {
      newLines.push(line)
    }
  }
}
```

**驗證結果**：

| 測試案例 | 之前 | 現在 |
|---------|------|------|
| `# 前端需要增加送必填...` 整合指南（~20,000 字） | ❌ 未過濾 | ✅ 已過濾 |
| request body（已在 bug_spec） | 出現在 diff | ✅ 已排除 |
| 真正的同事補充內容 | - | ✅ 正確保留 |

---

**要抓的內容**：
- QA 補充的 request body
- QA 補充的 response 範例
- QA 補充的重現步驟
- 前端同事補充的測試資料
- 其他非「我們寫回去」的內容

### bug_spec 追加格式

```markdown
# [物件資料管理]新增租賃成屋物件...

網址：https://www.notion.so/...

問題描述
新增租賃成屋物件，停車位頁圖檔/建號沒有儲存成功

前提要件
...

預期結果
...

### 同事補充 (2026-01-31 同步)

request body 23:42
request body

---

## 留言
...
```

**格式說明**：
- 使用 `### 同事補充 (YYYY-MM-DD 同步)` 標題
- 放在該票內容的最後、`---` 分隔線之前
- 如果有多次同步，追加新的日期區塊

### AI 分派到 proposal 的邏輯

```
同事補充的內容
│
├─ 包含 request/response body
│   └─ 放到 proposal 的「問題分析」或「測試資料」區塊
│
├─ 包含重現步驟補充
│   └─ 放到 proposal 的「問題描述」附近
│
├─ 包含錯誤訊息
│   └─ 放到 proposal 的「錯誤分析」區塊
│
└─ 其他
    └─ 放到 proposal 的「補充資訊」區塊
```

### proposal 追加格式

```markdown
## 同事補充資訊

> 來源：Notion 票 [[物件資料管理]新增租賃成屋物件...](URL)
> 同步時間：2026-01-31

### request body

request body 23:42
request body
```

### Wrapper 腳本修改規劃

需要修改 `export-notion.mjs`：

1. **新增 `content_diff` 欄位**：比對 Notion 內容 vs 本地 bug_spec，輸出差異
2. **內容過濾**：套用上述過濾規則
3. **輸出結構**：

```json
{
  "existing_tickets": [
    {
      "page_id": "...",
      "title": "...",
      "file": "...",
      "has_new_comments": true,
      "new_comments": [...],
      "has_content_update": true,
      "content_diff": {
        "notion_last_edited": "2026-01-30T13:43:00.000Z",
        "new_content": "request body 23:42\nrequest body"
      }
    }
  ]
}
```

### Skill 修改規劃

需要修改 `exportN.md`：

1. **新增任務步驟**：處理 `content_diff`
2. **bug_spec 更新**：追加「同事補充」區塊
3. **proposal 更新**：AI 智能分派

### 實際案例（設計依據）

**票**：`[物件資料管理]新增租賃成屋物件，停車位頁圖檔/建號沒有儲存成功`

**Notion 內容（目前）**：
```
request body 23:42
request body
---
問題描述
...
```

**bug_spec 內容（本地）**：
```
問題描述
...
```

**差異**：Notion 票在開頭新增了 `request body` 相關資訊，這個內容在 bug_spec 裡面沒有。

### 待辦事項

- [x] 修改 `export-notion.mjs`：新增內容比對邏輯 ✅ 2026-01-31
- [x] 修改 `export-notion.mjs`：新增過濾規則 ✅ 2026-01-31
- [x] 修改 `export-notion.mjs`：新增雙重過濾機制（寬鬆 pattern + proposal 比對）✅ 2026-01-31
- [x] 修改 `exportN.md`：新增處理 `content_diff` 的任務 ✅ 2026-01-31
- [x] 測試：驗證 bug_spec 更新正確 ✅ 2026-01-31
- [x] 測試：驗證 proposal 分派正確 ✅ 2026-01-31
- [x] 測試：驗證雙重過濾機制（前端改標題 + proposal 內容比對）✅ 2026-01-31

---

## 待實作：支援多份 Proposal（/splitP 連動調整）（2026-02-04）

> **來源設計稿**：`prompts/4_diary/debug/proposal/slash/splitP_skill_proposal.md`

### 需求背景

`/splitP` 新增了將過大 proposal 拆分為多份的能力（proposal 1、proposal 2...）。`/exportN` 有兩處需要連動調整：

1. **content_diff 比對**：需遍歷所有 proposal，避免誤判
2. **AI 分派到 proposal**：需選擇正確的目標 proposal

### 修改一：content_diff 比對遍歷所有 proposal

**現有邏輯**（Wrapper 層 `findContentDiff`）：

```
content_diff 判斷流程
│
├─ 2. 如果有差異 → 讀取對應的 proposal 檔案（單數）
└─ 3. 檢查差異內容是否已存在於 proposal
```

**修改為**：

```
content_diff 判斷流程
│
├─ 2. 如果有差異 → 用 {MMDD}_{N}_ glob 找到所有 proposal
│   └─ 逐一讀取每份 proposal
│
└─ 3. 檢查差異內容是否已存在於任一 proposal
    ├─ 任一 proposal 中已存在 → 跳過（是我們寫的）
    └─ 所有 proposal 都不存在 → 保留（是同事補充的新內容）
```

**影響範圍**：`export-notion.mjs` 的 `findContentDiff()` 函數

**現有程式碼**：
```javascript
function findContentDiff(notionContent, localContent, proposalPaths = []) {
  const proposalContent = readProposalContent(proposalPaths)
  // ...
}
```

**修改**：`proposalPaths` 需從單一路徑改為 glob 搜尋 `{MMDD}_{N}_*_proposal.md` 找到的所有路徑。

### 修改二：AI 分派到 proposal 需選擇正確的目標

**問題**：拆分後有多份 proposal，同事補充的新內容應該分派到哪一份？

**現有邏輯**（Skill 層，階段 2）：

```
AI 智能分派到 proposal
├─ 判斷內容屬於哪個 proposal 的範疇
└─ 放到對應的 proposal 適當位置
```

**修改為**：

```
AI 智能分派到 proposal（多份 proposal）
│
├─ 1. 用 {MMDD}_{N}_ glob 找到所有 proposal
│
├─ 2. 判斷目標 proposal
│   ├─ 檢查 bug_spec 的「## Proposal 索引」區塊
│   │   ├─ 有索引 → 找到狀態為 ⏳ 的 proposal（最新的進行中）
│   │   └─ 沒有索引 → 選最後一份 proposal（編號最大的）
│   └─ 只有一份 → 直接使用（維持現有行為）
│
└─ 3. 分派到目標 proposal 的適當位置
```

**設計原則**：
- 新內容永遠往最新的、進行中的 proposal 分派
- proposal 1 通常是已完成的內容，不應該再追加
- 如果有 Bug Spec 索引，用狀態判斷；沒有索引，用編號最大的

### Wrapper 輸出結構調整

`existing_tickets` 的 `proposals` 欄位已包含所有 proposal 路徑（由 `findProposalFiles()` 函數提供），現有結構不需要修改，只需確保 glob 能找到 proposal 2。

**驗證**：`findProposalFiles()` 使用的 glob pattern 是否能匹配 `{MMDD}_{N}_2_{描述}_proposal.md`？
- 若使用 `{MMDD}_{N}_*` → ✅ 能匹配
- 需確認實際的 glob pattern

### 實作狀態

- [x] 設計討論（2026-02-04）
- [x] 記錄到 exportN 設計稿（2026-02-04）
- [x] 修改 `export-notion.mjs`：`findContentDiff()` 遍歷所有 proposal（✅ 已確認現有實作已支援，`findProposalFiles()` 使用 `{prefix}_*.md` glob）
- [ ] 修改 `exportN.md`：AI 分派邏輯選擇正確的目標 proposal
- [x] 驗證 `findProposalFiles()` 的 glob pattern 能匹配 proposal 2（✅ 已確認）
- [ ] 測試驗證

---

## 待實作：content_diff 內容相同時跳過更新（2026-02-08）

> **發現日期**：2026-02-08
> **問題**：Wrapper 回傳 `has_content_update: true`，但 AI 比對後發現 `content_diff.new_content` 與 bug_spec 現有內容實質相同，導致 AI 卡住不知道該不該追加「### 同事補充」區塊

### 問題分析

**場景**：
1. 執行 `/exportN https://www.notion.so/2ff516bdc04b8020aae6f59f0466997a`
2. Wrapper 回傳 `has_content_update: true`，`content_diff.new_content` 有內容
3. AI 讀取 bug_spec，比對後發現內容實質相同（只有格式差異：缺少標題、網址、空行）
4. AI 卡住：定義檔說 `has_content_update: true` 就要追加，但追加等於重複寫入

**根因**：
- Wrapper 的 `findContentDiff()` 是逐行比對，格式差異（空行、標題行）會被判定為「有差異」
- Skill 定義檔的 Step 3 沒有「內容實質相同就跳過」的分支
- AI 遇到定義檔沒有覆蓋的情境，無法自行決策

### 解決方案

**修改層級**：Skill 定義檔（`exportN.md` + `exportN_flowchart.md`）

**不修改 Wrapper**：Wrapper 的判斷邏輯保持不變，比對責任放在 Skill 層

**修改內容**：Step 3 加前置比對判斷

```
Step 3：處理已存在的票（同事補充內容）
│
├─ 檢查 has_content_update
│   ├─ false → 跳過
│   └─ true → 讀取 bug_spec，比對 content_diff.new_content 與現有內容
│       │
│       ├─ 內容實質相同（只有格式差異）→ 跳過，回報「內容無變更」
│       └─ 有實質新內容 → 執行階段 1（更新 bug_spec）+ 階段 2（AI 分派到 proposal）
```

**「實質相同」的判斷標準**：
- 去除空行、標題行（`# xxx`）、網址行（`網址：...`）後，剩餘文字內容相同
- AI 自行判斷即可，不需要精確的程式邏輯

### 設計決策

| 討論項目 | 決策 |
|---------|------|
| 修改層級 | Skill 定義檔（不改 Wrapper） |
| 判斷方式 | AI 讀取 bug_spec 後自行比對 |
| 相同時行為 | 跳過，回報「內容無變更」 |
| 不同時行為 | 維持現有邏輯（階段 1 + 階段 2） |

### 實作狀態

- [x] 設計討論（2026-02-08）
- [x] 記錄到 exportN 設計稿（2026-02-08）
- [ ] 修改 `exportN.md`：Step 3 加前置比對判斷
- [ ] 修改 `exportN_flowchart.md`：更新流程圖
- [ ] 測試驗證

---

## 待實作：QA retest 不通過時提示執行 /splitP（2026-02-08）

> **發現日期**：2026-02-08
> **問題**：`/exportN` 匯出票後，如果 QA 最新留言是「測試不通過」，沒有任何提示引導下一步

### 問題分析

**場景**：
1. 執行 `/exportN` 更新三張 QA 票的留言
2. 三張票最新留言都是「測試不通過」
3. 用戶要求建立新 Proposal 來處理這些問題
4. AI 沒有 skill 引導，嘗試一次性組合 482 行的 Proposal 5 內容，卡住

**根因**：
- `/exportN` 的步驟 7（回報結果）只回報統計數字，沒有分析留言內容
- 沒有提示「QA retest 不通過 → 可能需要建立新 Proposal」
- 建立新 Proposal 不是 `/exportN` 的職責，應由 `/splitP` 的新建模式處理

### 解決方案

**修改層級**：Skill 定義檔（`exportN.md` + `exportN_flowchart.md`）

**職責劃分**：
- `/exportN`：只負責偵測 + 提示
- `/splitP`：負責實際建立新 Proposal（新建模式，見 splitP 設計稿）

在步驟 7（回報結果）之後，新增步驟 8：

```
8. **QA retest 不通過偵測**：
   - 掃描 `new_comments` 中是否包含「測試不通過」關鍵字
   - 如果有 → 執行以下提示：
     1. 用 glob `{MMDD}_{N}_*_proposal.md` 找到現有 proposal 數量
     2. 計算下一個編號
     3. 從留言中提取未解決的問題清單
     4. 輸出提示（見下方格式）
   - 如果沒有 → 跳過
```

**提示輸出格式**：

```markdown
⚠️ **偵測到 QA retest 不通過**

以下票的最新留言為「測試不通過」：
- [票標題1] — 未解決問題：{從留言提取}
- [票標題2] — 未解決問題：{從留言提取}

📋 **建立新 Proposal 資訊**：
- 下一個編號：P{N}
- 建議檔名：`{prefix}_{N}_{描述}_proposal.md`
- 對應 QA 票：{票數} 張

💡 建議執行 /splitP -n {proposal_path} 建立 Proposal {N}
```

### 流程圖更新

```
/exportN 執行流程（擴充）
│
├─ 1-7. 【現有流程不變】
│
└─ 8. 【QA retest 不通過偵測】
    ├─ 掃描 new_comments 是否包含「測試不通過」
    ├─ 有 → 用 glob 找現有 proposal 數量，計算下一個編號
    │   └─ 輸出提示：未解決問題 + 建議執行 /splitP -n
    └─ 沒有 → 跳過
```

### 設計決策

| 討論項目 | 決策 |
|---------|------|
| 修改層級 | Skill 定義檔（不改 Wrapper） |
| 偵測方式 | 掃描 `new_comments` 中的「測試不通過」關鍵字 |
| 提示時機 | 步驟 7 回報結果之後 |
| 是否自動建立 Proposal | 否，只提示用戶執行 `/splitP -n` |
| 建立 Proposal 的職責 | `/splitP` 新建模式（`-n` 參數，不在 `/exportN` 範圍內） |

### 實作狀態

- [x] 設計討論（2026-02-08）
- [x] 記錄到 exportN 設計稿（2026-02-08）
- [ ] 修改 `exportN.md`：新增步驟 8
- [ ] 修改 `exportN_flowchart.md`：更新流程圖
- [ ] 測試驗證

---

## 2026-02-08：index.md 更新改由 Wrapper 處理（Step 5 改進）

### 問題發現

AI 執行 Step 5（更新 index.md）時，Edit 工具頻繁失敗：

1. **Unicode 精確匹配問題**：index.md 含智慧引號（`""`）、中文特殊符號，Edit 工具要求 `old_string` 逐字元完全匹配，容易因不可見字元差異而失敗
2. **長檔案定位困難**：index.md 已超過 420 行，AI 難以精準定位插入點
3. **錯誤恢復成本高**：Edit 失敗後，AI 需要多次 Grep + Read + 重試，浪費 token 和時間

### 解決方案：Wrapper 處理 index.md 更新

**核心思路**：把 index.md 的「追加新票」邏輯從 AI（Edit 工具）移到 Wrapper（JS 精確操作）。

**整體流程調整**：

```
/exportN 執行流程（改進後）
│
├─ Step 1. Wrapper 執行（一次完成所有自動化）
│   ├─ 查詢 Notion 票
│   ├─ 分類 existing / new tickets
│   ├─ 計算 bug_spec_prefix（ls 目標目錄 → 算 MMDD 編號）
│   ├─ 更新 index.md（追加新票 + 新留言）
│   └─ 回傳 JSON（含 bug_spec_prefix + index_updated）
│
├─ Step 2-3. AI 處理已存在的票（留言/補充）
│
├─ Step 4. AI 建立新票 bug_spec
│   └─ 直接用 Wrapper 回傳的 bug_spec_prefix 命名
│       （不需要自己 ls + 算編號）
│
├─ Step 5. AI 確認 index.md（跳過或 fallback）
│   ├─ index_updated: true → 跳過
│   └─ index_updated: false → AI 手動更新
│
└─ Step 6-8. 回報結果
```

**Wrapper 新增功能**：

```
Wrapper 內部流程（新增部分）
│
├─ calcBugSpecPrefix(targetDir)
│   ├─ ls 目標目錄，找 {MMDD}_*_bug_spec.md
│   ├─ 今天已有 → 遞增編號（0208_1 → 0208_2）
│   └─ 今天沒有 → 用 {MMDD}_1
│
└─ updateIndexMd(newTickets, existingTicketsWithNewComments, targetDir, bugSpecPrefix)
    ├─ 1. readFileSync 讀取 index.md
    ├─ 2. 替換 `> 最後更新：...` 時間戳
    ├─ 3. 找到「## 已存在的票，有新的留言」標題位置
    │   └─ 在該標題前插入新票的 `- [ ]` 行（含 bug_spec 路徑）
    ├─ 4. 在「已存在的票」區塊末尾追加有新留言的票
    │   └─ 每張票列出 bug_spec 路徑 + proposal 路徑
    ├─ 5. writeFileSync 寫回
    └─ fallback：寫入失敗 → 回傳 index_updated: false
```

**保留原則**：
- 只做**追加**，不修改現有內容
- 現有的 `[x]`、`[analysis]`、`[fe]`、`[be]`、`🔴`、`✅` 等手動標記全部原封不動
- 只在兩個區塊的末尾插入新行

### Wrapper 修改範圍

| 檔案 | 修改內容 |
|------|----------|
| `export-notion.mjs` | 新增 `calcBugSpecPrefix()` + `updateIndexMd()` 函數 |

**新增函數簽名**：
```javascript
function calcBugSpecPrefix(targetDir) {
  const dir = join(DIARY_BASE_PATH, targetDir)
  const today = new Date()
  const mmdd = String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0')
  // ls dir, 找 {mmdd}_*_bug_spec.md, 計算下一個編號
  // 回傳如 "0208_1"
}

function updateIndexMd(newTickets, existingTicketsWithNewComments, targetDir, bugSpecPrefix, proposalFiles) {
  const INDEX_PATH = join(DIARY_BASE_PATH, 'debug/notion_tmp/index.md')
  // 1. readFileSync 讀取
  // 2. 找到兩個區塊的插入點
  // 3. 插入新行（用 bugSpecPrefix 組路徑）
  // 4. writeFileSync 寫回
  // 5. 失敗回傳 false
}
```

**插入格式**：
```markdown
# 新票（插入到「所有撈下來的票」區塊末尾）
- [ ] {ticket.title}
  - {targetDir}{bugSpecPrefix}_bug_spec.md

# 有新留言的票（插入到「已存在的票」區塊末尾）
- {ticket.title}
  - {ticket.file}
  - {ticket.proposals[0]}  （如果有）
```

### Skill 定義檔修改

**Step 4 改為**：
```
4. **根據 JSON 結果處理新票**：
   - 使用 Wrapper 回傳的 `bug_spec_prefix` 作為檔名前綴
   - 檔名：`{bug_spec_prefix}_bug_spec.md`
   - 不需要自己 ls 目錄 + 算編號
```

**Step 5 改為**：
```
5. **index.md 更新（Wrapper 自動處理）**：
   - Wrapper 已自動更新 index.md，AI 不需要手動操作
   - 如果 Wrapper 回傳 `index_updated: true` → 跳過
   - 如果 Wrapper 回傳 `index_updated: false`（向下相容）→ AI 手動更新
```

### 流程圖更新

```
/exportN 執行流程（Step 4-5 改進）
│
├─ 1. 【Wrapper 執行】（含 calcBugSpecPrefix + updateIndexMd）
│
├─ 2-3. 【處理已存在的票】不變
│
├─ 4. 【處理新票】
│   └─ 用 Wrapper 回傳的 bug_spec_prefix 命名（不自己算）
│
├─ 5. 【更新 index.md】
│   ├─ index_updated: true → 跳過（Wrapper 已處理）
│   └─ index_updated: false → AI 手動更新（向下相容）
│
└─ 6-8. 【現有流程不變】
```

### JSON 回傳格式變更

```json
{
  "bug_spec_prefix": "0208_1",
  "index_updated": true,
  "index_data": {
    "all_tickets": ["..."],
    "tickets_with_new_comments": ["..."]
  }
}
```

- `bug_spec_prefix` → AI 在 Step 4 直接用此前綴命名 bug_spec
- `index_updated: true` → Wrapper 已成功更新 index.md
- `index_updated: false` → Wrapper 更新失敗或舊版 Wrapper，AI 需要手動處理
- `index_data` 保留 → 向下相容 + AI 可用於回報結果

### 設計決策

| 討論項目 | 決策 |
|---------|------|
| 修改層級 | Wrapper（`export-notion.mjs`）+ Skill 定義檔 |
| 為什麼不用 Edit | Edit 工具對長 Markdown 檔案的精確匹配不可靠（Unicode、格式） |
| 為什麼 Wrapper 適合 | JS 操作字串精確，readFileSync/writeFileSync 100% 可靠 |
| MMDD 編號來源 | Wrapper 統一計算，AI 直接使用，保證一致 |
| 向下相容 | `index_updated` flag + 保留 `index_data`，舊版 Wrapper 仍可運作 |
| 手動標記保留 | Wrapper 只追加不修改，所有現有標記原封不動 |

### 實作狀態

- [x] 設計討論（2026-02-08）
- [x] 記錄到設計稿（2026-02-08）
- [ ] 修改 `export-notion.mjs`：新增 `calcBugSpecPrefix()` + `updateIndexMd()`
- [ ] 修改 `exportN.md`：Step 4 用 `bug_spec_prefix`、Step 5 加 `index_updated` 判斷
- [ ] 修改 `exportN_flowchart.md`：更新流程圖
- [ ] 測試驗證

---

## 2026-02-13：移除 status/assignee 預設值，URL 和標籤模式都不限狀態和人員

### 問題發現

用 URL 指定特定票時，預期無論票在什麼狀態都能拉下來。雖然 Wrapper 的 URL 模式已經跳過 `queryTickets`（不受 status/assignee 限制），但標籤模式仍然預設 `status=開發中`、`assignee=威G`，導致非「開發中」狀態或非「威G」的票無法被拉到。

實際使用場景中，用戶經常需要拉不同狀態的票（如「規劃中」、「測試中」），每次都要手動加 `--status` 參數很不方便。

### 設計決策

**移除 `$2`（status）和 `$3`（assignee）預設值**，改為：
- 不傳 status → 查詢所有狀態的票
- 不傳 assignee → 查詢所有人員的票
- 仍可用 `--status` 和 `--assignee` 手動指定（保留彈性）

### 影響範圍

| 位置 | 修改內容 |
|------|----------|
| `export-notion.mjs` | `queryTickets` 預設不傳 status/assignee，只在用戶明確指定時才傳 |
| `exportN.md` | 移除 `$2`、`$3` 參數說明和「## 預設值」區塊，更新 argument-hint |
| `exportN_flowchart.md` | 更新流程圖（移除 status/assignee 相關描述） |

### Wrapper 修改

**現有程式碼**（`export-notion.mjs:441-443`）：
```javascript
let tagOrUrl = args[0]
const status = args[1] || '開發中'
const assignee = args[2] || '威G'
```

**修改為**：
```javascript
let tagOrUrl = args[0]
const status = args[1] || null
const assignee = args[2] || null
```

**`queryTickets` 已支援**：現有的 `queryTickets` 函數在 `assignee`/`status` 為 falsy 時不會加入 filter，所以傳 `null` 就能查詢所有票。

### Skill 定義檔修改

**移除**：
- `$2`、`$3` 參數說明
- `## 預設值` 區塊

**更新 frontmatter**：
```yaml
---
description: 匯出 Notion 票到本地 Markdown 檔案
argument-hint: <標籤或URL> [--status 狀態] [--assignee 人員]
---
```
改為：
```yaml
---
description: 匯出 Notion 票到本地 Markdown 檔案
argument-hint: <標籤或URL>
---
```

**更新 Wrapper 呼叫**：
```bash
# 現有
node .../export-notion.mjs "$1" "$2" "$3"

# 修改為
node .../export-notion.mjs "$1"
```

保留 `--status` 和 `--assignee` 的說明，但改為「可選參數，不指定則查詢所有」。

### 流程圖更新

流程圖 Step 1 的 Wrapper 呼叫不再帶 status/assignee 參數。

### 實作狀態

- [x] 設計討論（2026-02-13）
- [x] 記錄到設計稿（2026-02-13）
- [x] 修改 `export-notion.mjs`：移除預設值
- [x] 修改 `exportN.md`：移除 $2/$3 參數和預設值區塊
- [x] 修改 `exportN_flowchart.md`：不需修改（流程圖未涉及 status/assignee）
- [ ] 測試驗證

## 2026-03-03：略過索引檔的留言/內容更新寫入（1_discuss.md 保護）

### 問題發現

當票沒有獨立 bug_spec 時，Wrapper 回傳的 `file` 會指向 `1_all_discuss.md/1_discuss.md`（工作追蹤索引檔）。Step 2（留言更新）和 Step 3（同事補充內容）直接往該檔案寫入，導致索引檔被污染。

**實際案例**：
- 票：「檢查舊專案與新專案的總價邏輯 (理論上要為廣告價）」
- Wrapper 回傳 `file: "1_all_discuss.md/1_discuss.md"`
- Step 3 把同事補充內容寫進索引檔（錯誤）

### 根因

`1_discuss.md` 是工作追蹤索引檔，不是 bug_spec。它只記錄票的參考連結和 claude session ID，不應該接收留言或內容更新。

### 解決方案

在 Step 2 和 Step 3 加入 **file 路徑前置檢查**：

```
file 路徑檢查（Step 2、Step 3 共用前置條件）
│
├─ file 路徑包含 "1_discuss.md" 或 "1_all_discuss.md"
│   └─ ⚠️ 跳過寫入，回報：「此票的 file 指向索引檔（非獨立 bug_spec），略過留言/內容更新」
│
└─ 其他正常 bug_spec 路徑
    └─ 繼續原有 Step 2 / Step 3 流程
```

### 定義檔修改

**Step 2 開頭新增**：
```markdown
2. **根據 JSON 結果處理已存在的票（留言更新）**：
   - ⚠️ **前置檢查**：如果 `file` 路徑包含 `1_discuss.md`，跳過此票的留言更新，回報「file 指向索引檔，略過」
   - 檢查 `existing_tickets` 陣列
   ...（原有流程不變）
```

**Step 3 開頭新增**：
```markdown
3. **根據 JSON 結果處理已存在的票（同事補充內容）**：
   - ⚠️ **前置檢查**：如果 `file` 路徑包含 `1_discuss.md`，跳過此票的內容更新，回報「file 指向索引檔，略過」
   - 檢查 `existing_tickets` 陣列中的 `has_content_update` 欄位
   ...（原有流程不變）
```

### 流程圖修改

在 Step 2 和 Step 3 節點前加入判斷分支：

```
├─ 2. 【處理已存在的票 - 留言更新】
│   ├─ file 包含 "1_discuss.md" → 跳過，回報「索引檔略過」
│   └─ 正常 bug_spec → has_new_comments: true → 追加到「## 留言」區塊
│
├─ 3. 【處理已存在的票 - 同事補充內容】
│   ├─ file 包含 "1_discuss.md" → 跳過，回報「索引檔略過」
│   └─ 正常 bug_spec → has_content_update: true
│       ├─ 比對 content_diff...（原有流程）
```

### 相容性影響分析

| 步驟 | 影響 | 說明 |
|------|------|------|
| Step 1（Wrapper 呼叫） | ❌ 無影響 | 不修改 Wrapper，檢查在 Skill 層 |
| Step 2（留言更新） | ✅ 新增前置檢查 | 只影響 file 指向索引檔的票，其他票不變 |
| Step 3（同事補充） | ✅ 新增前置檢查 | 同上 |
| Step 4（新票處理） | ❌ 無影響 | 使用 `new_tickets` 陣列，與 `file` 欄位無關 |
| Step 5（index.md） | ❌ 無影響 | 使用 `index_data`，獨立於 file 寫入 |
| Step 6（列出 proposal） | ❌ 無影響 | 使用 `proposal_files` 欄位 |
| Step 7（回報結果） | ❌ 無影響 | 使用 `summary` 欄位，跳過的票會被記為「略過」 |
| Step 8（QA retest） | ❌ 無影響 | 掃描 `new_comments` 資料，不依賴 file 寫入 |

### 實作狀態

- [x] 設計討論（2026-03-03）
- [x] 記錄到設計稿（2026-03-03）
- [ ] 修改 `exportN.md`：Step 2、Step 3 加入前置檢查
- [ ] 修改 `exportN_flowchart.md`：Step 2、Step 3 加入判斷分支
- [ ] 測試驗證

---

## 2026-03-10：新增 ticket_number 寫入 bug_spec（per-ticket branch 支援）

### 需求背景

同事希望每張 Notion 票獨立一個 git branch（如 `ticket/393-informationSheet-print-fix`），merge 進 dev 後 branch 保留在 GitHub。

為此需要在 bug_spec 中記錄 Notion 的 `ticket_number`（unique_id 屬性，自動遞增的純數字），供後續 `/gcommit-push` 和 `/merge-to-deploy` 提取使用。

### Wrapper 修改（已完成）

在 `export-notion.mjs` 的三個地方新增 `ticket_number` 欄位：

1. **`queryTickets()`**：從 `props['ID']?.unique_id?.number` 提取
2. **`getPageFull()`**：同上
3. **URL 模式 `filteredTickets` 組裝**：從 `page.ticket_number` 帶入

JSON 回傳結構變更：
```json
{
  "existing_tickets": [{
    "page_id": "xxx",
    "ticket_number": 393,
    "title": "(393)不動產說明書列印 - (完整測試)",
    ...
  }],
  "new_tickets": [{
    "page_id": "xxx",
    "ticket_number": 127,
    "title": "[待店長確認] 搜尋列缺少重置按鈕",
    ...
  }]
}
```

### Skill 定義檔修改

**Step 4（處理新票）**：寫入 bug_spec 時，在每張票的 header 加上 `Ticket: #{ticket_number}`

輸出格式變更：

```markdown
# {標題}

網址：{notion_url}
Ticket: #{ticket_number}

{內容}

---

## 留言

{comments}（如果有）
```

- `ticket_number` 為 `null` 時（理論上不會，但防禦性處理）→ 不寫 Ticket 行
- 已存在的票（Step 2/3）不需要修改，留言追加和同事補充不涉及 header 區塊

### 流程圖修改

Step 4 新增 ticket_number 寫入：

```
├─ 4. 【處理新票】
│   ├─ 合併到 {MMDD}_1_bug_spec.md
│   └─ 每張票 header 包含 Ticket: #{ticket_number}
```

### 相容性影響分析

| 步驟 | 影響 | 說明 |
|------|------|------|
| Step 1（Wrapper 呼叫） | ✅ 已修改 | Wrapper 已回傳 ticket_number |
| Step 2（留言更新） | ❌ 無影響 | 追加留言不涉及 header |
| Step 3（同事補充） | ❌ 無影響 | 追加補充不涉及 header |
| Step 4（新票處理） | ✅ 需修改 | header 新增 Ticket 行 |
| Step 5（index.md） | ❌ 無影響 | 使用 index_data，不含 ticket_number |
| Step 6（列出 proposal） | ❌ 無影響 | 使用 proposal_files |
| Step 7（回報結果） | ❌ 無影響 | 使用 summary |
| Step 8（QA retest） | ❌ 無影響 | 掃描 new_comments |

### 下游 Skill 連動

| Skill | 影響 | 說明 |
|-------|------|------|
| `/debugP` | ❌ 無影響 | 讀取 bug_spec 內容，多一行 Ticket 不影響分析 |
| `/gcommit-push` | 🔜 待設計 | 未來可從 proposal 或 bug_spec 提取 ticket_number |
| `/merge-to-deploy` | 🔜 待設計 | 未來用 ticket_number 建立 per-ticket branch |

### 實作狀態

- [x] Wrapper 修改（export-notion.mjs：queryTickets、getPageFull、URL 模式）
- [x] 設計討論（2026-03-10）
- [x] 記錄到設計稿（2026-03-10）
- [x] 修改 `exportN.md`：Step 4 輸出格式加上 Ticket 行（2026-03-10）
- [x] 修改 `exportN_flowchart.md`：Step 4 加上 ticket_number 說明（2026-03-10）
- [ ] 測試驗證

---

## 2026-03-10：已存在票自動補寫 ticket_number

### 需求背景

前一個設計變更只在 Step 4（新票）寫入 `Ticket: #{ticket_number}`。但在該設計之前就已存在的 bug spec 不會有 `Ticket:` 行。需要在處理已存在票時自動偵測並補寫。

### 設計決策

- 在 Step 2（留言更新）和 Step 3（同事補充）加入共用的前置步驟
- 檢查 bug spec 中該票 header 是否有 `Ticket:` 行
- 沒有且 Wrapper JSON 的 `ticket_number` 不為 null → 自動在「網址：」行之後插入

### 修改流程圖

```
處理已存在的票（Step 2/3 共用前置）
│
├─ 讀取 bug_spec 中該票的 header
├─ 檢查是否有 Ticket: 行
│   ├─ 有 → 跳過
│   └─ 沒有 + ticket_number 不為 null
│       └─ 在「網址：{url}」行之後插入「Ticket: #{ticket_number}」
└─ 繼續原有的 Step 2/3 邏輯
```

### 插入位置

```markdown
# {標題}

網址：{notion_url}
Ticket: #{ticket_number}    ← 插入這行

{內容}
```

### 相容性影響

| 步驟 | 影響 | 說明 |
|------|------|------|
| Step 2（留言更新） | ⚠️ 新增前置 | 補寫 ticket_number 後繼續留言更新 |
| Step 3（同事補充） | ⚠️ 新增前置 | 補寫 ticket_number 後繼續內容更新 |
| 其他步驟 | ❌ 無影響 | 不涉及 |

### 實作狀態

- [x] 設計討論（2026-03-10）
- [x] 記錄到設計稿（2026-03-10）
- [ ] 更新 `exportN.md` 定義檔
- [ ] 更新 `exportN_flowchart.md` 流程圖
