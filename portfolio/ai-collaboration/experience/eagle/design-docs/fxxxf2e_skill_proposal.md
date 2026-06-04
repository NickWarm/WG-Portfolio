# /fxxxf2e 設計稿

> 📅 建立日期：2026-02-07

---

## 問題描述

### 現況痛點

| 痛點 | 說明 |
|------|------|
| 前端修改建議散落在 proposal | 前端同事需要知道行數範圍才能找到 |
| 缺少後端 commit 參照 | 前端不知道是基於哪個版本的後端 |
| 缺少驗證資料 | 前端不知道用哪筆資料測試 |
| 缺少 Notion 票連結 | 前端不知道對應哪張 QA 票 |
| 大項目多份 proposal | 前端修改分散在不同 proposal，難以追蹤 |

### 預期效益

1. **一份文件集中所有前端修改建議**：`{MMDD}_{N}_frontend_fix.md`
2. **漸進式累加**：每次 `/gcommit-push` 後追加，用 `---` 分隔
3. **每次只複製新增區塊**：sed + pbcopy，貼 Notion 就是最新一批
4. **完整參照資訊**：後端 commit、Notion 票連結、DB 驗證資料 ID

---

## 執行流程圖

```
/fxxxf2e 執行流程（v1.1 — 支援主動修復模式）
│
├─ 1. 【定位來源 + 模式偵測】
│   ├─ 從對話上下文取得 proposal 路徑
│   ├─ 搜尋 proposal 中的「# 前端修改」或「前端修改建議」區塊
│   ├─ 找不到前端修改 → 提示「此 proposal 沒有前端修改建議」→ 結束
│   ├─ 🆕 偵測模式：proposal 路徑含 `debug/potential-fix/`？
│   │   ├─ 是 → 標記「主動修復模式」（dpf 產出）
│   │   │   └─ 從 proposal 檔名提取 {MMDD}_{apiName}
│   │   └─ 否 → 維持「Bug Fix 模式」（debugP 產出）
│   │       └─ 提取前綴 {MMDD}_{N}
│   └─ 判斷 Proposal N（Bug Fix 模式：無後綴=1、_2_=2、_4_=4）
│
├─ 2. 【收集必要資訊】
│   ├─ 後端 commit hash（從 proposal「## 實作完成紀錄」）
│   │   └─ 找不到 → 標記「⚠️ 尚未 commit」
│   ├─ 🆕 模式分支：
│   │   ├─ 【Bug Fix 模式】
│   │   │   ├─ 對應 Issue # + Notion 票標題與 URL（從 proposal 或 bug spec 提取）
│   │   │   └─ Bug 簡述（從 bug spec 標題或 proposal 標題）
│   │   └─ 【主動修復模式】
│   │       ├─ Notion 票 / Issue # → 標記 N/A
│   │       └─ 簡述 → 從 proposal 標題提取（如「transcript 潛在問題修復提案」）
│   ├─ 驗證資料 DB ID + 環境（從 proposal「API 驗證結果」或「DB 測試資料」或「驗證建議」）
│   ├─ 前端專案名（從「# 前端修改（{project}）」提取）
│   └─ API 驗證範例（從 proposal 的 /check-result 驗證紀錄提取）
│       ├─ 從每個前端修改項目提取提到的 API endpoint + 欄位
│       ├─ 搜尋 proposal「### API 驗證紀錄」或「## /check-result」區塊
│       ├─ 只提取前端修改項目用到的 endpoint 的 Request + Response
│       └─ 找不到對應測試案例 → 不附（不捏造）
│
├─ 3. 【判斷：新建 or 追加】
│   ├─ 🆕 模式分支：
│   │   ├─ 【Bug Fix 模式】→ 檢查 {MMDD}_{N}_frontend_fix.md
│   │   └─ 【主動修復模式】→ 檢查 {MMDD}_{apiName}_frontend_fix.md
│   ├─ 不存在 → 新建（含 header）
│   ├─ 已存在 → 追加模式（--- 分隔）
│   └─ 記錄新增區塊的起始行數（供 sed 複製用）
│
├─ 4. 【寫入】
│   ├─ 🆕 模式分支（header 差異）：
│   │   ├─ 【Bug Fix 模式】header：📋 Bug Spec + 對應問題表含 Notion 票
│   │   └─ 【主動修復模式】header：📋 來源：Data Flow 主動檢查 + 對應問題表用 DF-N 編號
│   ├─ 新建模式：header + 第一批修改項目
│   └─ 追加模式：--- + 來源標記 + 新修改項目
│
├─ 5. 【sed + pbcopy】
│   ├─ 計算本次新增的行數範圍（start_line ~ end_line）
│   └─ sed -n '{start},{end}p' {file} | pbcopy
│       → 顯示「✅ 本次新增內容已複製到剪貼簿（第 {start} ~ {end} 行）」
│
├─ 6. 【更新 Bug Spec 索引】
│   ├─ 🆕 模式分支：
│   │   ├─ 【Bug Fix 模式】→ 找 {MMDD}_{N}_bug_spec.md，更新 Proposal 索引
│   │   └─ 【主動修復模式】→ 跳過（沒有 bug spec）
│   └─ 沒有 Proposal 索引 → 跳過
│
└─ 7. 【輸出】
    ├─ 文件路徑
    ├─ 本次新增 N 項修改
    └─ 🆕 罐頭留言（模式分支）：
        ├─ 【Bug Fix 模式】→ 現有罐頭留言
        └─ 【主動修復模式】→ 主動修復版罐頭留言（不含 Notion 票）
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| 無 | - | 從對話上下文自動判斷 proposal | - |

> 💡 不需要參數，因為 `/fxxxf2e` 預期在 `/gcommit-push` 之後立即執行，對話上下文中一定有 proposal 路徑。

---

## 輸出格式

### 文件結構 — 首次建立（Bug Fix 模式）

```markdown
# 前端修改建議 — {bug 簡述}

> 📋 Bug Spec：`{MMDD}_{N}_bug_spec.md`
> 🎯 前端專案：dashboard-nuxt

---

## 來源：Proposal 1（`{proposal_filename}`）
> 🏷️ 後端 Commit：`{hash}`
> 📅 {YYYY-MM-DD}

### 驗證資料

| 環境 | 資料 ID | 用途 |
|------|---------|------|
| dev | #44661（B0023052） | 主要測試案例 |

### 對應問題

| # | Notion 票 | Bug Spec Issue | 問題摘要 |
|---|----------|---------------|---------|
| 1 | [標示部沒有展示建物資訊](https://www.notion.so/xxx) | Issue #6 | QA retest 後欄位仍未記錄 |
| 2 | [上傳文件缺備註欄位](https://www.notion.so/yyy) | Issue #8 | 上傳文件缺備註 |

### API 驗證範例

> 以下從 proposal `/check-result` 驗證紀錄提取，僅包含前端修改用到的 endpoint

#### GET /api/v1/transcripts/{id}

**Request**：
```bash
curl -s http://localhost:3001/api/v1/transcripts/44671 \
  -H "Authorization: Bearer $TOKEN"
```

**Response**（前端用到的欄位）：
```json
{
  "data": {
    "buildingDescriptions": [{
      "attachedBuildings": [{"usage": "陽台", "area": 5.2}],
      "subBuilding": [{"subBuildingNumber": "3456-000", "area": 12.3}],
      "parkingSpaces": [{"parkingNumber": "1", "area": 8.5}]
    }]
  }
}
```

> 📌 前端修改 #1 需讀取 `buildingDescriptions[].attachedBuildings`、`subBuilding`、`parkingSpaces`

### 修改項目

#### 1. {標題} — {簡述}

**檔案**：`apps/web-ele/src/path/to/file.vue`

**問題**：
{問題描述 + 現有程式碼}

**修改方式**：
{修改建議 + 建議程式碼}
```

### 文件結構 — 追加時（Bug Fix 模式）

append 到同一份文件末尾：

```markdown

---

## 來源：Proposal 4（`{proposal_filename}`）
> 🏷️ 後端 Commit：`{hash2}`
> 📅 {YYYY-MM-DD}

### 驗證資料

| 環境 | 資料 ID | 用途 |
|------|---------|------|
| dev | #1918 | 邊界案例 |

### 對應問題

| # | Notion 票 | Bug Spec Issue | 問題摘要 |
|---|----------|---------------|---------|
| 1 | [刪除謄本後沒有消失](https://www.notion.so/zzz) | Issue #7 | DELETE 回 500 |

### API 驗證範例

> （同首次建立格式，僅提取本次前端修改用到的 endpoint）

### 修改項目

#### 1. {標題} — {簡述}
...
```

### 🆕 文件結構 — 首次建立（主動修復模式）

> 📋 dpf 產出的 proposal 沒有 bug spec、沒有 Notion 票，header 和對應問題表不同

```markdown
# 前端修改建議 — {apiName} 潛在問題修復

> 📋 來源：Data Flow 主動檢查（非 QA 開票）
> 🎯 前端專案：dashboard-nuxt

---

## 來源：{apiName} 潛在問題修復（`{proposal_filename}`）
> 🏷️ 後端 Commit：`{hash}`
> 📅 {YYYY-MM-DD}

### 驗證資料

| 環境 | 資料 ID | 用途 |
|------|---------|------|
| dev | #{id} | {用途} |

### 對應問題

| # | Data Flow 問題 | 類型 | 問題摘要 |
|---|---------------|------|---------|
| 1 | DF-1 | 500 未防護 | storeId FK 沒有前置查詢 |
| 2 | DF-3 | null 沒處理 | store 被 softDelete 時 storeName 為 null |

### API 驗證範例

> （同 Bug Fix 模式格式，僅提取前端修改用到的 endpoint）

### 修改項目

#### 1. {標題} — {簡述}

**檔案**：`apps/web-ele/src/path/to/file.vue`

**問題**：
{問題描述 + 現有程式碼}

**修改方式**：
{修改建議 + 建議程式碼}
```

### 🆕 文件結構 — 追加時（主動修復模式）

append 到同一份文件末尾（格式同首次建立的來源區塊，不含 header）：

```markdown

---

## 來源：{apiName} 潛在問題修復 第 2 批（`{proposal_filename}`）
> 🏷️ 後端 Commit：`{hash2}`
> 📅 {YYYY-MM-DD}

### 驗證資料
...
### 對應問題
...
### API 驗證範例
...
### 修改項目
...
```

### 對話框輸出（Bug Fix 模式）

```
✅ 前端修改建議已寫入

📄 文件：{MMDD}_{N}_frontend_fix.md
📍 本次新增：{N} 項修改（第 {start} ~ {end} 行）
📋 已複製到剪貼簿

────────────────────────────────────
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
後端修正已進 dev/staging，commit `{hash}`
前端修改建議請參考：{frontend_fix_path}

📍 本次新增：第 {start_line} 行 ~ 第 {end_line} 行
────────────────────────────────────
```

### 🆕 對話框輸出（主動修復模式）

```
✅ 前端修改建議已寫入

📄 文件：{MMDD}_{apiName}_frontend_fix.md
📍 本次新增：{N} 項修改（第 {start} ~ {end} 行）
📋 已複製到剪貼簿

────────────────────────────────────
📋 罐頭留言（主動修復版，可直接複製到 Notion）：
────────────────────────────────────
後端主動修復已進 dev/staging，commit `{hash}`
來源：Data Flow 主動檢查（非 QA 開票）
前端修改建議請參考：{frontend_fix_path}

📍 本次新增：第 {start_line} 行 ~ 第 {end_line} 行
────────────────────────────────────
```

---

## 實作細節

### 資訊來源對照

| 需要的資訊 | Bug Fix 模式 | 主動修復模式 |
|-----------|-------------|-------------|
| Proposal 路徑 | 對話上下文（`/gcommit-push` 或 `/implement`） | 同左 |
| 前端修改內容 | 搜尋「# 前端修改」或「前端修改建議」 | 同左 |
| 後端 commit hash | Proposal「## 實作完成紀錄」 | 同左 |
| Notion 票標題/URL | Proposal 或 bug spec 的 `notion.so` 連結 | **N/A**（標記「主動修復，非 QA 開票」） |
| Bug Spec Issue # | 前端修改區塊「對應 Issue #N」 | **N/A** |
| 驗證資料 DB ID | Proposal「API 驗證結果」或「DB 測試資料」 | Proposal「驗證建議」或「API 驗證結果」 |
| 前端專案名 | Proposal「# 前端修改（xxx）」 | 同左 |
| 簡述 | Bug Spec 標題或 Proposal 標題 | Proposal 標題（如「transcript 潛在問題修復提案」） |
| API 驗證範例 | Proposal「/check-result 驗證紀錄」 | 同左 |
| 檔名前綴 | `{MMDD}_{N}` | `{MMDD}_{apiName}` |

### Proposal 編號判斷

從 proposal 檔名提取 Proposal N：

| 檔名 | Proposal N |
|------|-----------|
| `0206_1_pdf_content_mismatch_proposal.md` | Proposal 1（無數字後綴） |
| `1228_1_2_transcript_ongoing_proposal.md` | Proposal 2（`_2_`） |
| `1228_1_4_transcript_patch_proposal.md` | Proposal 4（`_4_`） |

### 追加模式行數計算

```bash
# 追加前記錄起始行
start_line=$(wc -l < {file})
start_line=$((start_line + 1))

# 寫入新內容...

# 追加後記錄結束行
end_line=$(wc -l < {file})

# 複製本次新增區塊
sed -n "${start_line},${end_line}p" {file} | pbcopy
```

### API 驗證範例提取邏輯

**提取流程**：

```
API 驗證範例提取
│
├─ 1. 【從前端修改項目提取 endpoint 線索】
│   ├─ 掃描每個修改項目的「問題」和「修改方式」描述
│   ├─ 提取提到的 API endpoint（如 GET /transcripts/{id}、POST .../files）
│   └─ 提取提到的 response 欄位（如 buildingDescriptions[].attachedBuildings）
│
├─ 2. 【搜尋 proposal 驗證紀錄】
│   ├─ 搜尋「### API 驗證紀錄」或「## `/check-result` ... 驗證紀錄」區塊
│   ├─ 搜尋「## API 驗證結果」區塊（JSON 格式）
│   └─ 找不到任何驗證紀錄 → 跳過，不附 API 驗證範例
│
├─ 3. 【關聯比對】
│   ├─ 用 endpoint path 比對測試案例的 curl URL
│   ├─ 只提取前端修改用到的 endpoint
│   └─ 純後端驗證的測試案例（如 FK 驗證回 400）→ 不提取
│
└─ 4. 【精簡 Response】
    ├─ 只保留前端修改提到的欄位
    ├─ 過長的陣列用 [...] 省略
    └─ 附上 📌 說明：哪個修改項目用到哪些欄位
```

**提取來源優先順序**：

| 優先順序 | 來源 | 格式 | 適用場景 |
|---------|------|------|---------|
| 1 | `/check-result` 驗證紀錄 | Request curl + Response JSON | 有完整測試案例 |
| 2 | `## API 驗證結果` | JSON 區塊 | 只有 JSON 沒有 curl |
| 3 | 前端修改項目內文 | 修改描述提到的欄位 | 沒有驗證紀錄，從修改描述推斷 |

**不提取的情況**：

| 情況 | 處理 |
|------|------|
| proposal 沒有驗證紀錄 | 不附 API 驗證範例區塊 |
| 測試案例是純後端驗證（如 FK 400、DELETE 成功） | 跳過 |
| 前端修改項目沒有提到 API endpoint | 不附該項的範例 |

### `/gcommit-push` 整合

在 Step 15（罐頭留言）之後新增提醒：

```
────────────────────────────────────
📝 前端修改建議提醒
────────────────────────────────────
此 proposal 包含前端修改建議，建議執行：

▸ /fxxxf2e
────────────────────────────────────
```

### 注意事項

- 前端專案通常只有 dashboard-nuxt，不會混用不同前端專案
- Notion URL 可能來自 proposal 內的連結，也可能需要從 bug spec 提取
- 若 proposal 沒有「## 實作完成紀錄」（尚未 `/gcommit-push`），commit hash 欄位標記「⚠️ 尚未 commit」
- 🆕 **主動修復模式偵測**：proposal 路徑含 `debug/potential-fix/` → 自動切換為主動修復模式，跳過所有 Notion 票 / Issue # / bug spec 相關邏輯

---

## 待辦事項

- [x] 設計討論（2026-02-07）
- [x] 建立設計稿（2026-02-07）
- [x] 用戶確認設計稿（2026-02-07）
- [x] 建立定義檔：`backend-nestjs/.claude/commands/fxxxf2e.md`（2026-02-07）
- [x] 建立流程圖：`backend-nestjs/.claude/flowcharts/fxxxf2e_flowchart.md`（2026-02-07）
- [x] 更新 `/gcommit-push` 定義檔 + 流程圖：新增 Step 16.7 前端修改提醒（2026-02-07）
- [x] 設計變更：新增 API 驗證範例提取（2026-02-07）
- [x] 更新定義檔 + 流程圖：同步 API 驗證範例提取（2026-02-07）
- [x] 設計變更：支援主動修復模式（dpf 產出的 proposal）（2026-02-08）
- [x] 更新定義檔 + 流程圖：同步主動修復模式（2026-02-08）
- [ ] 測試驗證

---

### 2026-02-09 設計變更：新增最終步驟「更新進度表」

**變更內容**：在 skill 最後步驟完成後，自動執行 `@.claude/flowcharts/update-progress.md` 共用模組，將 proposal 進度表中 `/fxxxf2e` 對應的行標記為 ✅。

**設計背景**：見 `showFlow_skill_proposal.md`「2026-02-09 設計變更」。

**影響**：
- 流程圖：最後節點後新增「更新進度表」
- 定義檔：最後 Step 後新增引用 `@.claude/flowcharts/update-progress.md`
