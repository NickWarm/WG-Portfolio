---
description: 匯出 Notion 票到本地 Markdown 檔案
argument-hint: <標籤或URL>
design-doc: prompts/4_diary/debug/proposal/mcp/notion/notion-export-md-proposal.md
related-doc: prompts/4_diary/debug/proposal/mcp/notion/notion-mcp-server.md
---

@.claude/flowcharts/exportN_flowchart.md

## 參數

- 分類或 URL：$1（必填）
  - 方式一：分類，如 `[物件資料管理]`
  - 方式二：Page URL，如 `https://www.notion.so/xxxxx`
  - 方式三：Database URL，如 `https://www.notion.so/xxxxx?v=xxxxx`
- 目標 proposal 路徑：從對話上下文取得（Database 模式用）

## 輸入判斷邏輯

```
if $1 starts with "https://www.notion.so/" or "notion.so/":
    呼叫 Wrapper → 檢查 JSON 結果的 mode 欄位
    ├─ mode === "database" → 方式三：Database 模式
    └─ 其他 → 方式二：從 URL 提取 page_id → 取得票標題 → 提取分類
else:
    → 方式一：直接使用 $1 作為分類
```

## 分類 → 目錄映射表

> **術語說明**：`[xxx]` 稱為「分類」，與 Notion property「標籤」（如大後台、業主、官網）不同

| 分類 | 對應目錄 |
|------|----------|
| `[物件資料管理]` | `estateListing_api/debug/` |
| `[APP-物件管理]` | `estateListing_api/debug/` |
| `[買方客戶查詢]` | `customer_api/debug/` |
| `[買方客戶新增查詢]` | `customer_api/debug/` |
| `[委託客戶查詢]` | `customer_api/debug/` |
| `[APP-客戶管理]` | `customer_api/debug/` |
| `[成交資料查詢]` | `estateTransaction_api/debug/` |
| `[成交資料]` | `estateTransaction_api/debug/` |
| `[人員資料管理]` | `admin_api/debug/` |
| `[待店長確認]` | `approvement_api/debug/` |
| `[公告查詢]` | `announcement/debug/` |
| `[公告類別管理]` | `announcementCategory/debug/` |
| `[合約變更申請]` | `contractChangeRequest_api/debug/` |
| `[休假管理]` | `leave_api/debug/` |
| `[表單列表]` | `contract_api/debug/` |
| `[表單類型管理]` | `contract_api/debug/` |
| `[系統更新日誌]` | `systemLog_api/debug/` |
| `[登入歷程]` | `systemLog_api/debug/` |
| `[人員異動查詢]` | `subscriber/debug/` |
| `[謄本操作紀錄查詢]` | `transcript_api/transcritChange_api/debug/` |
| `[物件資料管理-照片影音]` | `estateMedia_api/debug/` |
| `[物件資料管理-物調表]` | `transcript_api/caseStudy_api/debug/` |
| `[首頁串 API]` | `frontPage_api/debug/` |
| `[首頁串API]` | `frontPage_api/debug/` |
| `[首頁]` | `frontPage_api/debug/` |
| `[檔案]` | `file_upload/debug/` |
| `[權限管理]` | `role_and_permission/debug/` |
| `[權限]` | `role_and_permission/debug/` |
| `[契變紀錄]` | `contractChange_api/debug/` |
| `[官網]` | `publicApi/debug/` |
| `[EDM管理列表]` | `edm_api/debug/` |
| `[新增EDM]` | `edm_api/debug/` |
| `[銷售明細表]` | `transcript_api/estateSalesDetail_api/debug/` |
| `[產權調查]` | `transcript_api/propertySurvey_api/debug/` |
| 其他/未知分類 | `/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/` |

## Wrapper 腳本

> ⚠️ **重要**：使用 Wrapper 腳本，不要自己組合 API 呼叫！

```bash
node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-notion.mjs "$1"
```

**參數**：
- `$1`：標籤或 URL（必填）

**範例**：
```bash
# 用標籤查詢
node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-notion.mjs "[物件資料管理]"

# 用 URL 查詢
node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-notion.mjs "https://www.notion.so/xxx"
```

## 任務

1. **呼叫 Wrapper 腳本取得 JSON 結果**：
   ```bash
   node /Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-notion.mjs "$1"
   ```

   **模式判斷**：檢查 JSON 結果的 `mode` 欄位
   - `mode === "database"` → 跳到 **步驟 D1（Database 模式）**
   - 其他 → 繼續步驟 2（原有票處理流程）

### Database 模式（步驟 D1～D3）

> 當 Wrapper 回傳 `mode: "database"` 時執行此流程

**D1. 確認目標 proposal 路徑**：
   - 從對話上下文取得用戶指定的 proposal 路徑
   - 如果上下文沒有 → 詢問用戶：「請提供要更新的 proposal 路徑」

**D2. 讀取 proposal 並判斷更新策略**：
   1. 讀取目標 proposal 檔案
   2. 搜尋 `## {database_title}` 標題（用 JSON 的 `database_title` 欄位匹配）
   - **找到** → 執行「更新」：
     1. 定位 `## {database_title}` 區塊
     2. 找到該區塊內的 `> 來源：Notion Database` 和 `> 同步時間：` 行
     3. 找到緊接的 Markdown 表格（從 `| ` 開頭到表格結束）
     4. 只替換 `> 同步時間` 和表格本體，**保留表格後面的所有內容**（討論紀錄、分析等）
   - **沒找到** → 執行「追加」：在 proposal 末尾追加完整區塊

**D3. 寫入 Markdown 表格**：

   追加/更新格式：
   ```markdown
   ## {database_title}

   > 來源：Notion Database
   > 同步時間：YYYY-MM-DD

   {markdown_table}
   ```

   完成後回報：
   ```
   ✅ Database「{database_title}」已同步到 proposal
   - 模式：新增 / 更新
   - 資料筆數：{total_count}
   - 目標檔案：{proposal_path}
   ```

---

### 票處理模式（步驟 2～8，原有流程）

2. **根據 JSON 結果處理已存在的票（留言更新）**：
   - ⚠️ **前置檢查**：如果 `file` 路徑包含 `1_discuss.md`，跳過此票的留言更新，回報「file 指向索引檔，略過」
   - **補寫 ticket_number**（Step 2/3 共用前置）：
     1. 讀取 bug_spec 中該票的 header 區塊
     2. 檢查是否已有 `Ticket:` 行
     3. 沒有 + Wrapper JSON 的 `ticket_number` 不為 `null` → 在「網址：{url}」行之後插入 `Ticket: #{ticket_number}`
     4. 已有或 `ticket_number` 為 `null` → 跳過
   - 檢查 `existing_tickets` 陣列
   - 如果 `has_new_comments: true` → 追加 `new_comments` 到檔案的留言區塊
   - ⚠️ **重要：一個檔案可能包含多張票**，需要精準插入到對應的子區塊：
     1. 讀取檔案，找到 `## 留言` 區塊
     2. 用票的 `title` 找到對應的 `### [票標題]` 子區塊
     3. 如果子區塊存在 → 追加新留言到該子區塊末尾
     4. 如果子區塊不存在 → 在 `## 留言` 區塊末尾新建 `### [票標題]` 子區塊

3. **根據 JSON 結果處理已存在的票（同事補充內容）**：
   - ⚠️ **前置檢查**：如果 `file` 路徑包含 `1_discuss.md`，跳過此票的內容更新，回報「file 指向索引檔，略過」
   - **補寫 ticket_number**（同 Step 2 前置，若 Step 2 已補寫則跳過）
   - 檢查 `existing_tickets` 陣列中的 `has_content_update` 欄位
   - 如果 `has_content_update: true` → 執行以下步驟：

   **前置比對：確認內容是否有實質變更**
   1. 讀取 bug_spec 檔案中該票的內容區塊
   2. 比對 `content_diff.new_content` 與現有內容（忽略格式差異：空行、標題行、網址行）
   3. 如果內容實質相同 → 跳過，不執行階段 1 和階段 2
   4. 如果有實質新內容 → 繼續執行階段 1 和階段 2

   **階段 1：更新 bug_spec**
   1. 讀取 bug_spec 檔案，找到該票的內容區塊
   2. 在該票內容的最後（`---` 分隔線之前）追加「同事補充」區塊
   3. 格式：
      ```markdown
      ### 同事補充 (YYYY-MM-DD 同步)

      {content_diff.new_content}
      ```

   **階段 2：AI 智能分派到 proposal**
   0. 判斷目標 proposal（多份 proposal 時）：
      - 用 `proposals` 欄位取得所有 proposal 路徑
      - 只有一份 → 直接使用（維持現有行為）
      - 多份 → 檢查 bug_spec 的「## Proposal 索引」區塊
        - 有索引 → 找狀態為 ⏳ 的 proposal（最新進行中的）
        - 沒有索引 → 選最後一份 proposal（編號最大的）
   1. 判斷補充內容的類型：
      - 包含 request/response body → 放到 proposal 的「問題分析」或「測試資料」
      - 包含重現步驟補充 → 放到 proposal 的「問題描述」附近
      - 包含錯誤訊息 → 放到 proposal 的「錯誤分析」
      - 其他 → 放到 proposal 的「補充資訊」區塊
   2. 在目標 proposal 中追加：
      ```markdown
      ## 同事補充資訊

      > 來源：Notion 票 [{票標題}]({URL})
      > 同步時間：YYYY-MM-DD

      {content_diff.new_content}
      ```

4. **根據 JSON 結果處理新票**：
   - 檢查 `new_tickets` 陣列
   - 使用 `content` 欄位（已過濾，不含前端修改建議）
   - 合併成一個 `{MMDD}_1_bug_spec.md` 檔案
   - 用 `---` 分隔每張票
   - 目標目錄：`/Users/nicholas/Desktop/Projects/prompts/4_diary/{target_dir}`

5. **更新 index.md 彙總檔**：
   - 位置：`/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/notion_tmp/index.md`
   - 使用 `index_data.all_tickets` 生成「## 所有撈下來的票」列表
   - 使用 `index_data.tickets_with_new_comments` 生成「## 已存在的票，有新的留言」列表
     - 每張票同時列出 `file`（bug_spec）和 `proposals`（對應的提案檔案）

6. **列出對應的 proposal 檔案**：
   - 使用 `proposal_files` 欄位
   - 條列每個 bug_spec 對應的 proposal 檔案（不讀取內容）

7. **回報結果**：
   - 使用 `summary` 欄位
   - 格式：更新 X 張（有新留言）、新增 X 張、內容更新 X 張、內容相同 X 張（跳過）、跳過 X 張、補寫 Ticket X 張

8. **QA retest 不通過偵測**：
   - 掃描 `existing_tickets` 中 `new_comments` 是否包含「測試不通過」關鍵字
   - 如果沒有 → 跳過
   - 如果有 → 執行以下提示：
     1. 從 `proposal_files` 取得現有 proposal 路徑
     2. 用 glob `{MMDD}_{N}_*_proposal.md` 計算下一個 proposal 編號
     3. 從留言中提取未解決的問題清單
     4. 輸出提示：
        - 未解決問題清單
        - 下一個 Proposal 編號 + 建議檔名
        - 「建議執行 `/splitP -n {proposal_path}` 建立 Proposal {N}」

## 已處理票的判斷規則

> ⚠️ **重要**：如果票內容包含 `# 前端修改建議` 標題，代表是**已處理過的票**：
> - ❌ **不需要再匯出內容**（bug spec 已經有了）
> - ✅ **依舊要檢查留言**，有新留言就追加到已有的 bug spec

## 輸出格式

> ⚠️ **重要**：新建票只記錄 Notion 票的**原始 Bug 描述**，不需要提案修正或分析。
> 相同標籤的票彙整到同一個 bug_spec.md 檔案中，用 `---` 分隔。

### 內容過濾規則

匯出票內容時，**必須過濾掉以下內容**：

> ⚠️ **原因**：這些內容通常是我們在 proposal 分析完成後，複製到 Notion 票上給 QA/DBA/前端同事看的。
> 既然是從 proposal 複製過去的，就不需要再抓回來。

| 標題格式 | 說明 |
|---------|------|
| `# 前端修改建議` / `## 前端修改建議` | 前端修改提案 |
| `# 後端修改建議` / `## 後端修改建議` | 後端修改提案 |
| `# DB說明` / `## DB說明` | DBA 說明 |
| `# DB討論` / `## DB討論` | DBA 討論 |

**過濾邏輯**：遇到以上標題時，該標題及其以下所有內容都不抓。

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

每張票的 Markdown 格式：

```markdown
# {標題}

網址：{notion_url}
Ticket: #{ticket_number}

{內容}（直接複製 Notion 票的原始內容，不加任何分析或提案）

---

## 留言

{comments}（如果有）
```

> **ticket_number 規則**：從 Wrapper JSON 的 `ticket_number` 欄位取得。若為 `null` → 不寫 Ticket 行。

## index.md 格式

> ⚠️ **重要**：直接使用 `index_data.all_tickets` 的原始內容，**禁止自行修改或組合標題**。

**說明**：
- 票標題格式通常是 `[項目]XXXXX`，例如 `[物件資料管理]物件編輯後資料未正確更新`
- `[項目]` 是票標題的一部分，**不是** Notion 的「標籤」屬性（如大後台、業主）
- 有些票標題沒有 `[項目]` 前綴，那就直接顯示原始標題

```markdown
# Notion 票匯總

> 最後更新：YYYY-MM-DD HH:mm

## 所有撈下來的票

- [ ] [物件資料管理]物件編輯後資料未正確更新    ← 票標題本身就有 [項目]
- [ ] 登入方式修改                              ← 票標題沒有 [項目]，直接顯示

## 已存在的票，有新的留言

- [物件資料管理]物件編輯後資料未正確更新
  - 對應目錄/MMDD_N_bug_spec.md
  - 對應目錄/MMDD_N_proposal_name.md
```

---

## 設計決策記錄

### 2026-01-31：新增同事補充內容同步功能

**變更內容**：
- 新增任務步驟 3：處理已存在票的「同事補充內容」
- 階段 1：更新 bug_spec（追加「### 同事補充」區塊）
- 階段 2：AI 智能分派到 proposal

**設計理由**：
- 同事（QA/前端）可能在 Notion 票中補充有用資訊（如 request body、response 範例）
- 這些資訊對 debug 有幫助，應該同步到本地
- 先更新 bug_spec 作為單一來源，再由 AI 分派到 proposal 適當位置

**過濾規則**：
- 不抓「前端修改建議」、「後端修改建議」、「DB說明」、「DB討論」
- 原因：這些是我們從 proposal 複製過去的，不需要再抓回來

**詳見設計稿**：`prompts/4_diary/debug/proposal/mcp/notion/notion-export-md-proposal.md`

---

### 2026-01-31：過濾規則優化（寬鬆 pattern + proposal 比對）

**問題發現**：
- 前端同事會修改標題，把「# 前端修改建議」改成「# 前端需要增加送必填資訊 objectType...」
- 原本的精確匹配 pattern 無法過濾這類變體標題

**解決方案**：
1. **寬鬆 pattern**：`/^\s*#{1,2}\s*前端/m` 匹配所有 `# 前端...` 開頭的標題
2. **proposal 比對**：比對 content_diff 時，讀取對應的 proposal 內容，過濾已存在於 proposal 的內容

**判斷流程**：參見流程圖 `content_diff 判斷流程` 章節

---

### 2026-02-04：支援多份 Proposal 的 AI 分派邏輯（/splitP 連動）

**變更內容**：
- Step 3 階段 2 新增「步驟 0：判斷目標 proposal」
- 多份 proposal 時，優先選「進行中」的 proposal，否則選編號最大的

**設計理由**：
- `/splitP` 拆分後會產生多份 proposal（如 `0204_1_proposal.md` + `0204_1_2_後續修正_proposal.md`）
- 同事補充的新內容應該分派到「最新進行中」的 proposal，而不是已完成的
- Wrapper 層的 `findProposalFiles()` 已使用 `{prefix}_*.md` glob，不需修改

**詳見設計稿**：`prompts/4_diary/debug/proposal/mcp/notion/notion-export-md-proposal.md`

---

### 2026-02-08：content_diff 內容相同時跳過更新

**問題發現**：
- Wrapper 回傳 `has_content_update: true`，但 AI 比對後發現內容實質相同（只有格式差異）
- 定義檔缺少「內容相同就跳過」的分支，導致 AI 卡住

**解決方案**：
- Step 3 加前置比對判斷：讀取 bug_spec 後比對內容，實質相同就跳過
- 不修改 Wrapper，比對責任放在 Skill 層

**詳見設計稿**：`prompts/4_diary/debug/proposal/mcp/notion/notion-export-md-proposal.md`

**變更內容**：
- 新增 `[權限管理]` → `role_and_permission/debug/`
- 新增 `[權限]` → `role_and_permission/debug/`

**設計理由**：
- `[權限管理]` 和 `[權限]` 屬於同一功能領域，應歸類到相同目錄
- 目錄命名為 `role_and_permission` 是因為權限系統通常與角色（role）緊密相關
- 統一管理權限相關的 bug spec 和 proposal 文件

**目錄結構**：
```
/Users/nicholas/Desktop/Projects/prompts/4_diary/
└── role_and_permission/
    └── debug/           ← 權限相關的 Notion 票匯出到這裡
```

---

### 2026-02-08：QA retest 不通過偵測（/splitP -n 連動）

**變更內容**：
- 新增步驟 8：偵測 QA retest 不通過 → 提示用戶執行 `/splitP -n`

**設計理由**：
- `/exportN` 匯出票後，如果 QA 最新留言是「測試不通過」，沒有提示下一步
- 建立新 Proposal 不是 `/exportN` 的職責，由 `/splitP -n` 新建模式處理
- `/exportN` 只負責偵測 + 提示

**詳見設計稿**：`prompts/4_diary/debug/proposal/mcp/notion/notion-export-md-proposal.md`

---

### 2026-02-13：新增 Database 模式（Notion 表格同步到 Proposal）

**變更內容**：
- Wrapper（export-notion.mjs）：新增 `retrieveDatabase`、`queryDatabase`、`extractPropertyValue`、`generateMarkdownTable`、`formatDatabaseOutput` 函數
- Wrapper 輸出新增 `mode: "database"` 和 `markdown_table` 欄位
- Skill 定義新增步驟 D1～D3（Database 模式處理流程）
- 支援自動偵測 Database URL（Notion API 回報 `is a database` 時切換）

**設計理由**：
- 需要把 Notion Database 表格同步到 proposal，追蹤最新定義
- 用 `## {database_title}` 作為錨點，重複執行時只更新表格本體，保留討論紀錄
- Wrapper 層生成 Markdown 表格（`\n` → `<br>`、`|` → `\|`），Skill 層處理追加/更新邏輯

**更新策略**：
- proposal 已有同名 `## 標題` → 只替換同步時間 + 表格，保留後續討論內容
- proposal 沒有 → 追加完整區塊到末尾

---

### 2026-03-03：略過索引檔的留言/內容更新寫入（1_discuss.md 保護）

**變更內容**：
- Step 2、Step 3 新增前置檢查：`file` 路徑包含 `1_discuss.md` 時跳過寫入

**設計理由**：
- `1_discuss.md` 是工作追蹤索引檔，不是 bug_spec
- 當票沒有獨立 bug_spec 時，Wrapper 回傳的 `file` 指向索引檔，直接寫入會污染索引檔
- 跳過寫入不影響 Step 4~8（它們不依賴 `file` 欄位的寫入結果）

**詳見設計稿**：`prompts/4_diary/debug/proposal/mcp/notion/notion-export-md-proposal.md`

---

### 2026-03-10：新增 ticket_number 寫入 bug_spec（per-ticket branch 支援）

**變更內容**：
- Wrapper 新增 `ticket_number` 欄位（Notion unique_id 屬性，純數字）
- Step 4 輸出格式：每張票 header 新增 `Ticket: #{ticket_number}` 行
- `ticket_number` 為 `null` 時不寫 Ticket 行

**設計理由**：
- 同事希望每張票獨立 git branch（如 `ticket/393-informationSheet-print-fix`）
- 需要在 bug_spec 記錄 ticket_number，供 `/gcommit-push` 和 `/merge-to-deploy` 提取

**詳見設計稿**：`prompts/4_diary/debug/proposal/mcp/notion/notion-export-md-proposal.md`
