# Commit Implement Skill 提案

## 需求背景

當 `/debugP` 或 `/implement` 流程完成實作後，需要：
1. 在提案文件最後新增一節，記錄修改內容
2. 列出所有修改的檔案
3. 驗證修改檔案與提案一致
4. 執行 git commit

目前這個流程是手動用 prompt 觸發，希望設計成 skill 自動化。

## 現有 Prompt

```
針對你負責的，所修改的所有項目
我要 commit 哪些檔案，以及建議的 commit message 是什麼
commit message 請給我一行英文的版本就可以了，格式如下
fix: api Name 修改內容
feat: api Name 修改內容
```

## Skill 設計

### 基本資訊

| 項目 | 內容 |
|------|------|
| **Skill 名稱** | `/commit-implement` |
| **描述** | 完成實作後，更新提案文件並 commit |
| **參數** | `<proposal-path>` - 提案文件路徑 |

### 執行流程

```
1. 讀取提案文件，確認是哪個功能的修改
   ↓
2. 從提案文件中提取「修改檔案清單」（預期修改）
   ↓
3. 執行 git status，取得所有修改的檔案清單（實際修改）
   ↓
4. 在提案文件最後新增「## 實作完成紀錄」區塊
   ↓
5. 列出修改的檔案（list 格式，非 checklist）
   ↓
6. 【驗證】比對提案文件的修改清單與 git status 結果
   ↓
7. 若不一致，列出差異並詢問用戶是否繼續
   ↓
8. 根據修改內容，建議 commit message
   ↓
9. 執行 git add（指定檔案）+ git commit
```

### 新增區塊格式

```markdown
---

## 實作完成紀錄

**完成時間**：2026-01-16

### 修改檔案

- src/api/adminApi/customer/customer.service.ts
- src/api/adminApi/customer/customer.controller.ts
- src/api/adminApi/customer/buyersAdmin.service.ts
- src/api/adminApi/customer/buyersAdmin.controller.ts
- src/api/adminApi/customer/dto/buyersAdmin.dto.ts

### Commit

```
fix: customer pagination limit 30 to 10
```
```

### Commit Message 規則

| 前綴 | 使用時機 |
|------|----------|
| `fix:` | Bug 修復、錯誤修正 |
| `feat:` | 新增功能、新增 API |
| `refactor:` | 重構、優化 |
| `docs:` | 文件修改 |

**格式**：`{prefix}: {apiName} {修改摘要}`

**範例**：
- `fix: customer pagination limit 30 to 10`
- `feat: contractType add CRUD endpoints`
- `refactor: estateListing optimize findAll query`

## Skill 定義檔

```markdown
---
description: 完成實作後，更新提案文件並 commit
argument-hint: <proposal-path>
---

## 參數

- 提案文件路徑：$1

## 任務

1. 讀取提案文件，理解修改內容
2. 從提案文件中提取「修改檔案清單」區塊（預期修改的檔案）
3. 執行 `git status`，取得實際修改的檔案清單
4. 在提案文件最後新增「## 實作完成紀錄」區塊：
   - 完成時間
   - 修改檔案列表（list 格式，非 checklist）
   - Commit message
5. 【驗證步驟】比對預期修改與實際修改：
   - 列出「提案有列但 git 沒改」的檔案（遺漏）
   - 列出「git 有改但提案沒列」的檔案（額外）
   - 若有差異，詢問用戶是否繼續
6. 根據提案內容決定 commit message 前綴（fix/feat/refactor）
7. 顯示 commit 預覽，等待用戶確認
8. 執行 git add（指定檔案，禁止 git add .）
9. 執行 git commit

## Commit Message 格式

- fix: {apiName} {修改摘要} - Bug 修復
- feat: {apiName} {修改摘要} - 新增功能
- refactor: {apiName} {修改摘要} - 重構優化

## 驗證輸出格式

```
📋 檔案一致性檢查

預期修改（提案文件）：
- src/api/.../customer.service.ts
- src/api/.../customer.controller.ts

實際修改（git status）：
- src/api/.../customer.service.ts
- src/api/.../customer.controller.ts
- src/api/.../customer.dto.ts        ← 額外修改

⚠️ 發現差異：
- 額外修改：customer.dto.ts（提案未列出）

是否繼續 commit？(y/n)
```

## 輸出格式

在提案文件最後新增：

```markdown
---

## 實作完成紀錄

**完成時間**：YYYY-MM-DD

### 修改檔案

- path/to/file1.ts
- path/to/file2.ts

### Commit

```
{prefix}: {apiName} {修改摘要}
```
```
```

## 驗證邏輯說明

### 為什麼需要驗證？

1. **確保完整性**：避免遺漏提案中列出的修改
2. **避免意外提交**：發現不在提案範圍內的修改
3. **文件與程式碼同步**：確保提案文件反映實際修改

### 驗證結果處理

| 情況 | 處理方式 |
|------|----------|
| 完全一致 | 直接進入 commit 流程 |
| 有遺漏 | 警告用戶，詢問是否繼續 |
| 有額外修改 | 警告用戶，詢問是否納入此次 commit |
| 兩者皆有 | 列出所有差異，詢問用戶決定 |

---

**建立時間**：2026-01-16
**狀態**：已實作

---

## 功能擴充：專案範圍限制（2026-01-19）

### 問題發現

在實際使用中發現，AI 執行 `/gcommit-push` 時會想要 commit 非 backend-nestjs 專案的檔案：

| 情況 | 期望行為 | 實際行為 |
|------|----------|----------|
| 同時修改 backend-nestjs + prompts | 只 commit backend-nestjs 的檔案 | AI 想把 prompts 的修改也 commit |
| 同時修改 backend-nestjs + Projects/.claude | 只 commit backend-nestjs 的檔案 | AI 想把 modules 的修改也 commit |

**問題根源**：

1. **skill 沒有定義專案範圍**：沒有明確說明只處理 backend-nestjs
2. **git status 看到所有修改**：在 Projects 目錄下執行會看到多個專案的修改
3. **AI 不知道該忽略什麼**：沒有規則指示哪些檔案應該被排除

### 設計討論（2026-01-19）

**結論**：此 skill 應該專注在 backend-nestjs 專案的 commit，不處理其他專案。

### 修改提案

#### 1. 新增「專案範圍」區塊

在 skill 開頭加入：

```markdown
## 專案範圍

⚠️ **此 skill 僅處理 backend-nestjs 專案的 commit**

- 工作目錄：`/Users/nicholas/Desktop/Projects/backend-nestjs`
- 非此專案的檔案修改會被自動忽略，不納入 commit
- 包括但不限於：prompts/、Projects/.claude/、其他專案目錄
```

#### 2. 修改步驟 3 - 指定目錄

原本：
```markdown
3. 執行 `git status`，取得實際修改的檔案清單
```

改為：
```markdown
3. 在 backend-nestjs 目錄執行 `git status`，取得實際修改的檔案清單
   - 工作目錄：`/Users/nicholas/Desktop/Projects/backend-nestjs`
   - ⚠️ 忽略其他專案（prompts、Projects/.claude 等）的修改
```

#### 3. 修改步驟 4 - 加入路徑過濾

在驗證步驟加入過濾邏輯：

```markdown
4. 【驗證步驟】比對預期修改與實際修改：
   - **先過濾**：只保留 backend-nestjs 目錄下的檔案
   - 非 backend-nestjs 的修改直接忽略（不列出、不詢問、不 commit）
   - 列出「提案有列但 git 沒改」的檔案（遺漏）
   - 列出「git 有改但提案沒列」的檔案（額外，不納入 commit）
   - 遺漏：詢問用戶是否繼續
   - 額外：列出提醒但不詢問，直接只 commit 提案清單中的檔案
```

#### 4. 修改步驟 8 - 明確限制範圍

```markdown
8. 在 backend-nestjs 目錄執行 git add（指定檔案，禁止 git add .）
   - 確認所有檔案路徑都在 backend-nestjs 目錄下
   - 若發現非 backend-nestjs 的檔案，自動跳過
```

### 預期效果

| 情況 | 修改前 | 修改後 |
|------|--------|--------|
| git status 看到 prompts 修改 | 可能被納入 commit | 自動忽略 |
| git status 看到 .claude/modules 修改 | 可能被納入 commit | 自動忽略 |
| 只有 backend-nestjs 修改 | 正常處理 | 正常處理 |

### 實作狀態

- ✅ 更新 `gcommit-push.md` skill（新增專案範圍 + 修改步驟）（2026-01-19）
- [ ] 測試驗證

---

## 功能擴充：前端修改摘要（2026-01-21）

### 問題發現

在處理 auth login 移除 username 的需求時發現：

| 情況 | 期望行為 | 實際行為 |
|------|----------|----------|
| 提案只有後端修改 | 一行 commit message | ✅ 正常 |
| 提案包含前端修改建議 | commit message 應包含前端修改摘要 | ❌ 沒有顯示前端需要改什麼 |

**問題場景**：

提案文件包含「# 前端修改（dashboard-nuxt）」區塊時，這些修改不會由 `/implement` 執行（因為只處理後端），但 commit 時應該摘要說明前端需要做什麼修改，方便前端人員參考。

### 設計討論（2026-01-21）

**結論**：根據提案文件是否包含前端修改區塊，動態調整 commit message 格式。

**提案文件結構參考**（來自 `/reviewDoc`）：

```markdown
# 標題

## 📋 需求摘要
...

---

# 前端修改（dashboard-nuxt）

## 1. {修改標題}

**檔案路徑**: `apps/web-ele/src/...`

**修改原因**: ...

---

# 後端修改（backend-nestjs）
...
```

### 修改提案

#### 1. 新增步驟 7 - 檢查前端修改

在原步驟 6（決定 commit message 前綴）之後，新增：

```markdown
7. **檢查提案是否包含前端修改**：
   - 搜尋提案文件中是否有「# 前端修改」區塊
   - 若有，提取前端專案名稱和各修改項目
   - 將前端修改摘要加入 commit message（參考 Commit Message 格式）
```

#### 2. 擴充 Commit Message 格式

原本：
```markdown
## Commit Message 格式

⚠️ **強制規定**：
- commit message **必須用英文**
- 只需要一行
- **不要加** `Co-Authored-By` 署名

```
{prefix}: {apiName} {英文修改摘要}
```
```

改為：
```markdown
## Commit Message 格式

⚠️ **強制規定**：
- commit message **必須用英文**
- 主要訊息只需要一行
- **不要加** `Co-Authored-By` 署名

### 純後端修改（提案無前端區塊）

```
{prefix}: {apiName} {英文修改摘要}
```

### 包含前端修改（提案有「# 前端修改」區塊）

```
{prefix}: {apiName} {英文修改摘要}

Frontend changes ({frontend-project}):
- {filename}: {modification summary}
- {filename}: {modification summary}
```

**提取規則**：
- 從「# 前端修改（xxx-nuxt）」取得前端專案名稱
- 從每個「**檔案路徑**」取得檔案名稱（只取最後的檔名）
- 從「## N. {標題}」取得修改摘要
```

### 範例

**提案文件**（auth login）：

```markdown
# 前端修改（dashboard-nuxt）

## 1. 登入頁面（移除 username 欄位）

**檔案路徑**: `apps/web-ele/src/views/_core/authentication/login.vue`

## 2. API 型別定義（移除 username）

**檔案路徑**: `apps/web-ele/src/api/core/auth.ts`
```

**產生的 commit message**：

```
fix: auth remove username from login

Frontend changes (dashboard-nuxt):
- login.vue: remove username form field
- auth.ts: remove username from LoginParams
```

### 預期效果

| 情況 | 修改前 | 修改後 |
|------|--------|--------|
| 提案只有後端 | 一行 commit message | 一行 commit message（不變）|
| 提案有前端區塊 | 一行 commit message | 一行 + 前端修改摘要 |

### 實作狀態

- ✅ 更新 `gcommit-push.md` skill（新增步驟 7 + 擴充 Commit Message 格式）（2026-01-21）
- [ ] 測試驗證

---

## 功能擴充：Notion 自動留言通知（2026-01-23）

### 需求背景

commit 完成後，希望自動在對應的 Notion 票上留言通知，讓相關人員知道進度。

### API 測試結果

| 功能 | 狀態 | 說明 |
|------|------|------|
| 新增留言 | ✅ 可用 | `POST /v1/comments` |
| 刪除留言 | ❌ 不可用 | API 不支援，需在 Notion UI 手動刪除 |
| 代表用戶留言 | ❌ 不可用 | Notion 安全限制，留言者一律顯示為 Integration |

### API 使用方式

```bash
curl -X POST 'https://api.notion.com/v1/comments' \
  -H 'Authorization: Bearer {NOTION_TOKEN}' \
  -H 'Notion-Version: 2022-06-28' \
  -H 'Content-Type: application/json' \
  -d '{
    "parent": { "page_id": "{PAGE_ID}" },
    "rich_text": [{ "text": { "content": "留言內容" } }]
  }'
```

**Token 位置**：`/Users/nicholas/Desktop/Projects/prompts/mcp-servers/notion/export-notion.mjs` 的 `NOTION_TOKEN` 常數

### 留言格式設計

由於無法代表用戶留言（Notion 安全限制），建議在內容開頭標註來源：

```
威G: 已完成實作，commit hash: e3497279
```

### 待辦事項

- [ ] 請同事到 https://www.notion.so/my-integrations 修改 Integration 名稱（目前顯示「未命名的機器人」）
- [ ] Integration 名稱設定後，測試留言顯示效果
- [ ] 設計如何從提案文件提取 Notion page_id
- [ ] 在 `/gcommit-push` 流程中加入自動留言步驟

### 設計提案

#### 1. 從提案文件提取 page_id

提案文件通常在開頭有 Notion URL：

```markdown
Notion
- 票名：[出價紀錄] 合約編號邏輯需要調整
- 網址：https://www.notion.so/2cd516bdc04b813085cbe81591e0642e
```

提取邏輯：
```javascript
// 從 URL 提取 32 字元的 page_id
const match = content.match(/notion\.so\/([a-f0-9]{32})/)
const pageId = match ? match[1] : null
```

#### 2. 新增步驟 - 自動留言

在 commit 成功後（現有步驟 13 之後）新增：

```markdown
14. **Notion 留言通知**（可選）：
    - 從提案文件提取 Notion page_id
    - 若找到 page_id，發送留言通知
    - 留言格式：`威G: 已完成實作\nCommit: {hash}\n分支: adminApi`
    - 若無 page_id，跳過此步驟（不報錯）
```

#### 3. 留言內容範本

```
威G: 已完成實作
Commit: {commit_hash}
分支: adminApi
修改: {修改摘要}
```

### 實作狀態

- ✅ API 測試完成（2026-01-23）
- [ ] 等待 Integration 名稱設定
- [ ] 實作自動留言功能

---

## 功能擴充：罐頭留言生成（2026-01-23）

### 需求背景

commit 推送完成後，用戶需要手動到 Notion 票上留言通知相關人員。希望自動生成罐頭留言，方便直接複製貼上。

### 留言類型判斷

根據提案文件內容，自動判斷交接對象：

| 提案內容 | 交接對象 | 原因 |
|---------|---------|------|
| 有「# 前端修改」區塊 | 前端處理 | 需要前端配合修改 |
| 純後端修改 | QA測試 | 後端已完成，可直接測試 |

### 留言格式

```
修正已經進 dev/staging，commit `{hash}` 交接給{對象}
```

**範例**：
- `修正已經進 dev/staging，commit `e3497279` 交接給前端處理`
- `修正已經進 dev/staging，commit `e3497279` 交接給QA測試`

### 輸出格式

在 `/gcommit-push` 完成推送後，顯示：

```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `e3497279` 交接給QA測試
────────────────────────────────────
```

### 新增步驟

在現有步驟 13（同步遠端並推送）之後新增：

```markdown
14. **生成罐頭留言**：
    - 檢查提案文件是否有「# 前端修改」區塊
    - 若有前端修改 → 「交接給前端處理」
    - 若純後端修改 → 「交接給QA測試」
    - 顯示格式化的罐頭留言，方便用戶複製
```

### 實作狀態

- ✅ 更新 `gcommit-push.md` skill（新增步驟 14）（2026-01-23）
- [ ] 測試驗證

---

## 功能擴充：Migration 執行提醒（2026-01-26）

### 問題發現

在實作 edmTemplate codeName 欄位時發現：

| 情況 | 問題 |
|------|------|
| commit 包含 migration | 容易忘記要去 dev/staging 執行 migration |
| DBA 已處理 dev | 但 staging 還是需要執行，容易遺漏 |
| 沒有自動檢查 | 不知道哪個環境已有欄位、哪個還需要處理 |

**實際案例**：
- commit 了 `AddCodeNameToEdmTemplate` migration
- Dev DB 因為 DBA 已手動處理，欄位已存在
- 但 Staging DB 還沒有，需要執行 migration
- 如果沒有檢查機制，很容易遺漏 Staging

### 設計提案

#### 執行流程

```
/gcommit-push Migration 檢查流程
│
├─ Step 1: 掃描 commit 檔案
│   └─ 檢查是否包含 src/database/migrations/*.ts
│
├─ Step 2: 若有 migration → 從提案文件提取資訊
│   ├─ 表名（從 Entity 路徑推斷，如 EdmTemplate.ts → edmTemplate）
│   └─ 欄位名（從欄位影響矩陣或修改內容提取）
│
├─ Step 3: 查詢 Dev DB
│   ├─ 執行 ./scripts/db-tunnel.sh dev
│   └─ 查詢 information_schema.columns 確認欄位是否存在
│
├─ Step 4: 查詢 Staging DB
│   ├─ 執行 ./scripts/db-tunnel.sh staging
│   └─ 查詢 information_schema.columns 確認欄位是否存在
│
└─ Step 5: 顯示檢查結果
    ├─ 列出 migration 檔案和目標欄位
    ├─ 顯示各環境狀態（✅ 已有 / ❌ 需執行）
    └─ 提供執行指令（僅對需要執行的環境）
```

#### 查詢語法

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = '{表名}' AND column_name = '{欄位名}';
```

- 有結果 → 欄位已存在，不需執行 migration
- 無結果 → 欄位不存在，需要執行 migration

#### 輸出格式

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 此次 commit 包含 Migration

📁 Migration：1769435341000-AddCodeNameToEdmTemplate.ts
📊 表：edmTemplate
📝 新增欄位：codeName

📍 環境檢查：
- Dev:     ✅ 欄位已存在
- Staging: ❌ 需要執行 migration

🔧 Staging 執行指令：
yarn migration:single src/database/migrations/1769435341000-AddCodeNameToEdmTemplate.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 全部都有的情況

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 此次 commit 包含 Migration

📁 Migration：1769435341000-AddCodeNameToEdmTemplate.ts
📊 表：edmTemplate
📝 新增欄位：codeName

📍 環境檢查：
- Dev:     ✅ 欄位已存在
- Staging: ✅ 欄位已存在

✅ 所有環境都已有此欄位，無需執行 migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 步驟調整

原本步驟 14 是「生成罐頭留言」，現在變成：

| 步驟 | 內容 |
|------|------|
| 14 | **Migration 檢查**（新增） |
| 15 | 生成罐頭留言（原步驟 14） |

### 資訊來源

| 資訊 | 來源 |
|------|------|
| Migration 檔案 | git commit 的檔案清單 |
| 表名 | 提案文件的 Entity 路徑（如 `EdmTemplate.ts` → `edmTemplate`）|
| 欄位名 | 提案文件的「欄位影響矩陣」或「修改內容」區塊 |
| DB 連線 | `./scripts/db-tunnel.sh dev/staging` |

### 實作狀態

- [ ] 更新 `gcommit-push.md` skill（新增步驟 14 Migration 檢查）
- [ ] 測試驗證

---

## 功能擴充：前端修改參考資訊（2026-01-27）

### 問題發現

在完成 mapFeatures/POIType 擴充的 commit 後發現：

| 情況 | 問題 |
|------|------|
| 罐頭訊息只說「交接給前端處理」| 前端不知道要去哪裡看修改內容 |
| 前端要自己找提案文件 | 增加溝通成本 |
| 不知道從哪行開始看 | 提案文件可能很長 |

**實際案例**：

罐頭訊息：
```
修正已經進 dev/staging，commit `85975000` 交接給前端處理
```

前端收到後的疑問：
- 「提案文件在哪？」
- 「前端修改建議在文件的哪個位置？」

### 設計決策

當有前端修改時，罐頭訊息自動附帶：
1. 提案文件路徑
2. 前端修改區塊的行數範圍（從第幾行到第幾行）

### 執行流程圖

```
/gcommit-push 前端參考資訊流程
│
├─ 1. 【檢查前端修改】
│   ├─ 無前端修改 → 罐頭訊息：「交接給 QA 測試」（不變）
│   └─ 有前端修改 → 繼續步驟 2
│
├─ 2. 【提取參考資訊】
│   ├─ 提案文件路徑（從對話上下文取得）
│   ├─ 前端修改起始行數（grep 搜尋「前端修改」關鍵字）
│   └─ 前端修改結束行數（搜尋下一個「---」分隔線或「後端修改」區塊）
│
└─ 3. 【輸出罐頭訊息】
    └─ 包含：commit hash + 交接對象 + 提案路徑 + 行數範圍
```

### 修改提案

#### 1. 更新步驟 15 - 生成罐頭留言

原本：
```markdown
15. **生成罐頭留言**：
    - 檢查提案文件是否有「# 前端修改」或「前端修改建議」區塊
    - 若有前端修改 → 「交接給前端處理」
    - 若純後端修改 → 「交接給QA測試」
    - 顯示格式化的罐頭留言，方便用戶複製到 Notion
```

改為：
```markdown
15. **生成罐頭留言**：
    - 檢查提案文件是否有「# 前端修改」或「前端修改建議」區塊
    - 若純後端修改 → 「交接給QA測試」
    - 若有前端修改：
      - 取得前端修改區塊的起始行數（grep -n 搜尋「前端修改」）
      - 取得前端修改區塊的結束行數（搜尋下一個「---」或「後端修改」）
      - 罐頭訊息包含：提案文件路徑 + 行數範圍
    - 顯示格式化的罐頭留言，方便用戶複製到 Notion
```

#### 2. 更新罐頭留言格式

原本：
```markdown
## 罐頭留言格式

push 成功後，顯示：

```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `{hash}` 交接給{對象}
────────────────────────────────────
```
```

改為：
```markdown
## 罐頭留言格式

push 成功後，顯示：

### 純後端修改

```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `{hash}` 交接給QA測試
────────────────────────────────────
```

### 包含前端修改

```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `{hash}` 交接給前端處理

📄 提案文件：{proposal_path}
📍 前端修改建議：第 {start_line} 行 ~ 第 {end_line} 行
────────────────────────────────────
```
```

### 範例

**提案文件**：`prompts/4_diary/transcript_api/informationSheet_api/debug/0126_1_mapFeatures_poitype_expansion_proposal.md`

**前端修改區塊位置**：第 125 行 ~ 第 188 行

**輸出**：
```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `85975000` 交接給前端處理

📄 提案文件：prompts/4_diary/transcript_api/informationSheet_api/debug/0126_1_mapFeatures_poitype_expansion_proposal.md
📍 前端修改建議：第 125 行 ~ 第 188 行
────────────────────────────────────
```

### 實作狀態

- [x] 設計討論（2026-01-27）
- [x] 更新 `gcommit-push.md` skill 定義檔（2026-01-27）
- [ ] 測試驗證

---

## 功能擴充：支援多份 Proposal（/splitP 連動調整）（2026-02-04）

### 需求背景

`/splitP` 新增了將過大 proposal 拆分為多份的能力（proposal 1、proposal 2...），`/gcommit-push` 需要連動調整以正確處理多份 proposal 的情境。

**來源設計稿**：`prompts/4_diary/debug/proposal/slash/splitP_skill_proposal.md`

### 涉及的修改

共兩處：

| # | 修改位置 | 類型 | 說明 |
|---|---------|------|------|
| 1 | Step 8（生成罐頭留言） | 修改 | 多份 proposal 時標明來源 |
| 2 | Step 8 之後 | 新增 | 新增 Step 9：proposal 行數檢查提醒 |

### ~~設計決策：不自動維護 Bug Spec 索引~~（已被 2026-02-04 設計變更取代）

~~**原始方案**：在 /gcommit-push 新增 Step 3.5 自動更新 Bug Spec 的 Proposal 索引~~

~~**調整為**：不做自動化，改為提醒用戶手動執行 /splitP~~

> ⚠️ 此決策已被取代，見下方「功能擴充：Bug Spec 索引進度同步（2026-02-04）」

**索引生命週期（最新）**：

| 時機 | 寫入者 | 動作 |
|------|--------|------|
| 拆分 proposal | `/splitP` | 建立「## Proposal 索引」區塊 |
| commit 時 | `/gcommit-push` | 同步索引中的 ✅/⏳ 狀態 + commit hash |

### 修改提案

#### 1. 修改 Step 8（罐頭留言）：標明 Proposal 來源

若存在多份 proposal（同目錄下有 `{MMDD}_{N}_2_*_proposal.md`），罐頭留言標明是哪份的修正：

**原本**：
```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `{hash}` 交接給QA測試
────────────────────────────────────
```

**多份 proposal 時改為**：
```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `{hash}` 交接給QA測試

📄 提案文件：{proposal_2_path}（Proposal 2）
────────────────────────────────────
```

**判斷邏輯**：
- 用 glob 檢查同目錄下是否有多份 proposal（`{MMDD}_{N}_*_proposal.md`）
- 只有一份 → 不標註（維持現有行為）
- 多份 → 標註當前 proposal 編號（Proposal 1 / Proposal 2）

#### 2. 新增 Step 9：Proposal 行數檢查提醒

在所有流程結束後（罐頭留言之後），檢查 proposal 行數並提醒：

```
└─ 9. 【🆕 Proposal 行數檢查提醒】
    ├─ 計算 proposal 行數
    ├─ <= 3000 行 → 不顯示，結束
    └─ > 3000 行 → 顯示提醒：
        ⚠️ 此 proposal 已達 {N} 行（超過 3000 行門檻）
        💡 建議先執行 /compact 再執行 /splitP 拆分
```

**設計原則**：
- 放在最後，所有 commit/push/罐頭留言都完成後才提醒
- 不中斷任何流程
- 門檻值 3000 行（與 /splitP 一致）
- 建議先 /compact 釋放 context，再執行 /splitP

### 流程圖更新

現有流程圖需調整 Step 8 並新增 Step 9：

```
/gcommit-push 執行流程（含 /splitP 連動）
│
├─ ...（Step 1-7 不變）
│
├─ 8. 【生成罐頭留言】
│   ├─ 純後端 → 「交接給QA測試」
│   ├─ 有前端修改 → 「交接給前端處理」+ 提案路徑 + 行數範圍
│   └─ 🆕 多份 proposal → 標明「（Proposal N）」
│
└─ 9. 【🆕 Proposal 行數檢查提醒】
    ├─ <= 3000 行 → 結束
    └─ > 3000 行 → 提醒用戶先 /compact 再 /splitP
```

### 實作狀態

- [x] 設計討論（2026-02-04）
- [x] 記錄到 gcommit-push 設計稿（2026-02-04）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-20）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-20）
- [ ] 測試驗證

---

## 功能擴充：Bug Spec 索引進度同步（2026-02-04）

### 問題發現

經過 `/splitP` 拆分後，bug_spec 會有「## Proposal 索引」記錄每份 proposal 的進度（✅/⏳ 狀態標記）。但 `/gcommit-push` 完成實作後只更新 proposal（新增「## 實作完成紀錄」），**沒有同步更新 bug_spec 索引的進度**。

| 情況 | 期望行為 | 實際行為 |
|------|----------|----------|
| /gcommit-push 完成一個章節 | bug_spec 索引對應項目從 ⏳ → ✅ | ❌ 索引沒更新，仍然是 ⏳ |
| 多次 commit 後 | 索引應反映最新進度 | ❌ 索引停留在 /splitP 當時的狀態 |

### 設計決策：用 proposal 數量判斷是否需要更新

**觸發條件**：不需要讀 bug_spec 檢查是否有索引區塊，直接用 glob 計算 proposal 數量

```
從 proposal 路徑提取 {MMDD}_{N} 前綴
│
├─ glob: {目錄}/{MMDD}_{N}_*_proposal.md
├─ 計算數量
│   ├─ 1 份 → 跳過（沒用過 /splitP，不會有索引）
│   └─ 2 份以上 → 更新 bug_spec 索引進度
```

**設計理由**：
- 一份 proposal = 沒經過 /splitP = 沒有索引要更新
- 兩份以上 = 一定經過 /splitP = 一定有「## Proposal 索引」
- 不用讀 bug_spec 就能判斷，省 context

### 更新邏輯

```
更新 Bug Spec 索引進度
│
├─ 1. 從 proposal 路徑提取 {MMDD}_{N} 前綴
├─ 2. glob 計算 proposal 數量
│   └─ 1 份 → 結束（跳過）
│
├─ 3. 找到 bug_spec：{目錄}/{MMDD}_{N}_bug_spec.md
├─ 4. 讀取 bug_spec 的「## Proposal 索引」區塊
├─ 5. 判斷本次完成了什麼
│   ├─ 從 proposal 的「## 實作完成紀錄」提取修改摘要
│   └─ 比對索引中 ⏳ 的項目，找出本次完成的項目
│
├─ 6. 更新索引
│   ├─ 對應項目 ⏳ → ✅
│   ├─ 附上 commit hash：`— {hash}`
│   └─ 更新 Proposal 標題的行數（wc -l 重新計算）
│
└─ 7. 檢查整份 Proposal 是否全部完成
    ├─ 所有項目都 ✅ → 更新標題狀態為「✅ 已完成」
    └─ 仍有 ⏳ → 維持「⏳ 進行中」
```

### 步驟位置

放在現有 Step 5（Git 操作 + 取得 hash）之後、Step 6（同步遠端推送）之前：

```
├─ 5. 【執行 Git 操作】
│   ├─ git add + git commit
│   └─ 取得 commit hash → 更新提案文件
│
├─ 5.5 【🆕 更新 Bug Spec 索引進度】
│   ├─ glob 計算 proposal 數量
│   │   └─ 1 份 → 跳過
│   ├─ 2 份以上 → 讀取 bug_spec 索引
│   ├─ 比對本次完成項目，⏳ → ✅ + commit hash
│   └─ 更新 Proposal 標題行數和整體狀態
│
├─ 6. 【同步遠端並推送】
│   └─ ...
```

**放在 push 之前的理由**：
- 已有 commit hash 可以標記
- bug_spec 是 prompts 專案的檔案（不在 backend-nestjs commit 範圍），只是更新本地檔案
- 若 push 失敗，索引已更新也無害（hash 仍有效）

### 索引更新範例

**更新前**：
```markdown
### Proposal 2：`1228_1_2_transcript_ongoing_proposal.md`（720 行，⏳ 進行中）

- ✅ unitCode/sectionCode API 回傳補齊（available-identifiers）— `095d9226`
- ✅ RealEstateIdentifier CRUD endpoints（POST/PATCH/GET）— `8a72fa0b`
- ✅ DTO 缺少欄位驗證（sellRights*、landOtherRights 欄位）
- ✅ 謄本土地使用分區新格式（三層式 LandUseZoneLevel）
- ⏳ 標示部 landDescription/buildingDescription 改為數組
- ⏳ 產調確認完成日期 API（含公設車位、庭院坪數、有無增建）
```

**本次完成「產調確認完成日期 API」後**：
```markdown
### Proposal 2：`1228_1_2_transcript_ongoing_proposal.md`（850 行，⏳ 進行中）

- ✅ unitCode/sectionCode API 回傳補齊（available-identifiers）— `095d9226`
- ✅ RealEstateIdentifier CRUD endpoints（POST/PATCH/GET）— `8a72fa0b`
- ✅ DTO 缺少欄位驗證（sellRights*、landOtherRights 欄位）
- ✅ 謄本土地使用分區新格式（三層式 LandUseZoneLevel）
- ⏳ 標示部 landDescription/buildingDescription 改為數組
- ✅ 產調確認完成日期 API（含公設車位、庭院坪數、有無增建）— `a1b2c3d4`
```

### 實作狀態

- [x] 設計討論（2026-02-04）
- [x] 記錄到 gcommit-push 設計稿（2026-02-04）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-20）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-20）
- [ ] 測試驗證

---

## 功能擴充：前端修改建議複製到剪貼簿（2026-02-06）

### 問題發現

在完成 `/gcommit-push` 後，罐頭留言會附帶提案文件路徑和前端修改行數範圍。但用戶仍需手動開啟提案文件、找到對應行數、複製前端修改內容，才能轉交給前端。

| 情況 | 問題 |
|------|------|
| 罐頭留言有行數範圍 | 但要自己開檔案去複製內容 |
| 提案文件可能很長 | 找行數不方便 |
| 每次都重複操作 | 浪費時間 |

**實際痛點**：用戶希望 `/gcommit-push` 完成後，前端修改建議的完整內容已經在剪貼簿中，直接 Cmd+V 就能貼給前端。

### 設計決策

在罐頭留言生成（Step 15）之後，自動將前端修改建議區塊複製到系統剪貼簿。

### 執行流程圖

```
/gcommit-push 前端修改複製到剪貼簿流程
│
├─ 1. 【檢查前端修改】（沿用 Step 15 已判斷的結果）
│   ├─ 無前端修改 → 跳過
│   └─ 有前端修改 → 繼續步驟 2
│
├─ 2. 【擷取前端修改內容】
│   ├─ 已有起始行數（start_line）和結束行數（end_line）
│   └─ 用 sed 擷取該區塊內容
│
└─ 3. 【複製到剪貼簿】
    ├─ 執行 sed -n '{start},{end}p' {proposal_path} | pbcopy
    └─ 顯示：✅ 前端修改建議已複製到剪貼簿（第 {start} ~ {end} 行）
```

### 修改提案

#### 1. 新增 Step 15.5 - 複製前端修改到剪貼簿

在 Step 15（罐頭留言）之後、Step 16（Proposal 行數檢查）之前新增：

```markdown
15.5 **複製前端修改建議到剪貼簿**（若有前端修改）：
    - 沿用 Step 15 已取得的起始行（start_line）和結束行（end_line）
    - 執行 `sed -n '{start_line},{end_line}p' {proposal_path} | pbcopy`
    - 顯示：`✅ 前端修改建議已複製到剪貼簿（第 {start_line} ~ {end_line} 行）`
    - 若無前端修改 → 跳過此步驟
```

#### 2. 流程圖更新

現有流程圖需在 Step 15 和 Step 16 之間插入：

```
├─ 15. 【生成罐頭留言】
│   ├─ 純後端 → 「交接給QA測試」
│   ├─ 有前端修改 → 「交接給前端處理」+ 提案路徑 + 行數範圍
│   └─ 多份 proposal → 標明「（Proposal N）」
│
├─ 15.5 【🆕 複製前端修改到剪貼簿】
│   ├─ 無前端修改 → 跳過
│   └─ 有前端修改 → sed + pbcopy → 顯示確認訊息
│
└─ 16. 【Proposal 行數檢查提醒】
    ├─ <= 3000 行 → 結束
    └─ > 3000 行 → 提醒：先 /compact 再 /splitP
```

### 技術實作

```bash
# macOS 剪貼簿複製
sed -n '43,141p' prompts/4_diary/.../proposal.md | pbcopy
```

**平台限制**：
- `pbcopy` 僅適用 macOS（本專案開發環境固定為 macOS，無需跨平台）

### 預期效果

| 步驟 | 修改前 | 修改後 |
|------|--------|--------|
| 罐頭留言顯示後 | 用戶手動開檔案複製前端修改 | ✅ 前端修改已在剪貼簿 |
| 轉交前端 | 開檔案 → 找行數 → 複製 → 貼上 | 直接 Cmd+V 貼上 |

### 實作狀態

- [x] 設計討論（2026-02-06）
- [x] 記錄到 gcommit-push 設計稿（2026-02-06）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-06）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-06）
- [ ] 測試驗證

---

## 功能擴充：API Data Flow scan-meta 更新（2026-02-07）

### 問題發現

`/api-flow-architecture` 和 `/review-api-flow` 使用 scan-meta commit hash 做漸進式更新判斷。但 `/gcommit-push` 完成實作並 push 後，對應 API 的 data-flow 文件中的 scan-meta 仍停留在舊的 commit hash，導致下次執行 `/review-api-flow` 時 git diff 會重複偵測到已經處理過的變更。

| 情況 | 問題 |
|------|------|
| commit 修改了某 API 的 Service | data-flow 文件的 scan-meta 沒更新 |
| 下次跑 /review-api-flow | git diff 又偵測到同樣的變更，重複分析 |
| 沒有閉環 | scan-meta 永遠停在上次 /api-flow-architecture 的 commit |

### 設計決策

在 push 成功後（Step 6 之後），自動更新對應 API Data Flow 文件的 scan-meta commit hash。

### 執行流程圖

```
/gcommit-push scan-meta 更新流程
│
├─ 1. 【判斷是否涉及 API 程式碼】
│   ├─ 從本次 commit 的檔案清單提取路徑
│   ├─ 篩選 src/api/{adminApi|publicApi}/{apiName}/ 下的檔案
│   ├─ 有 → 提取涉及的 apiName 列表
│   └─ 沒有（如 migration、shared 等）→ 跳過此步驟
│
├─ 2. 【檢查 data-flow 文件是否存在】
│   ├─ 對每個 apiName：
│   │   ├─ 搜尋 prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md
│   │   ├─ 找到 → 加入更新清單
│   │   └─ 找不到 → 跳過（該 API 還沒建立索引）
│   └─ 更新清單為空 → 跳過此步驟
│
├─ 3. 【更新 scan-meta commit hash】
│   ├─ 取得本次 commit 的短 hash（已在 Step 5 取得）
│   ├─ 取得今天日期
│   ├─ 對每個需要更新的 data-flow 文件：
│   │   ├─ 從 commit 檔案分類變更類型（Entity/DTO/Service/Controller）
│   │   └─ 只更新有變更的區塊的 scan-meta
│   │       例如：只改了 Service → 只更新 Service 區塊的 scan-meta
│   └─ 寫入更新後的文件
│
└─ 4. 【輸出更新結果】
    └─ 📌 已更新 API Data Flow scan-meta：
        - {apiName}: {變更區塊} → commit {hash}
```

### 步驟位置

放在 Step 6（同步遠端並推送）之後、Step 7（Migration 提醒）之前：

```
├─ 6. 【同步遠端並推送】
│   └─ git fetch + rebase + push
│
├─ 6.5 【🆕 更新 API Data Flow scan-meta】
│   ├─ 從 commit 檔案提取涉及的 apiName
│   ├─ 檢查 data-flow 文件是否存在
│   ├─ 更新對應區塊的 scan-meta commit hash
│   └─ 輸出更新結果
│
├─ 7. 【Migration 執行提醒】
│   └─ ...
```

**放在 push 之後的理由**：
- push 成功代表 commit 已確定，scan-meta 應記錄最終的 commit hash
- data-flow 文件在 prompts 專案（不在 backend-nestjs commit 範圍），只是更新本地檔案
- 與 Step 5.5（Bug Spec 索引更新）的設計原則一致

### scan-meta 更新規則

| commit 檔案 | 更新的 scan-meta 區塊 |
|------------|---------------------|
| `*.entity.ts` | `## Entity 結構` 的 scan-meta |
| `dto/*.dto.ts` | `## DTO 欄位定義` 的 scan-meta |
| `*.service.ts` | `## Service 查詢結構` 的 scan-meta |
| `*.controller.ts` | `## Controller 路由結構` 的 scan-meta |
| `*.module.ts` | `## Module 依賴` 的 scan-meta（若有此區塊） |

**精準更新原則**：只更新有變更的區塊，不動沒變的區塊。例如只改了 DTO，就只更新 DTO 區塊的 scan-meta，Service/Controller/Entity 的 scan-meta 不動。

### 與其他 Skill 的閉環

```
/api-flow-architecture {apiName}     ← 建立/更新後端結構文件，寫入 scan-meta
        ↓
/review-api-flow {apiName}           ← 讀取 scan-meta 判斷是否需更新
        ↓
/implement                           ← 實作修改
        ↓
/gcommit-push                        ← push 後更新 scan-meta → 閉環
        ↓
/review-api-flow {apiName}           ← 下次執行時 scan-meta 已是最新，不重複分析
```

### 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 記錄到 gcommit-push 設計稿（2026-02-07）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-07）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

## 功能擴充：API Data Flow 更新提醒（2026-02-07）

### 問題發現

`/gcommit-push` 在 Step 13.5 已經分析了 commit 檔案並提取 apiName、搜尋 data-flow 文件，但流程結束後沒有提醒用戶去執行 `/review-api-flow` 更新前後端對齊檢查。用戶需要自己記得哪些 API 改過、要跑哪個指令。

| 情況 | 問題 |
|------|------|
| commit 改了某 API | 用戶不知道要跑 /review-api-flow |
| commit 改了多個 API | 更容易遺漏 |
| 該 API 還沒建立 data-flow | 用戶不知道要先跑 /api-flow-architecture |

### 設計決策

在 gcommit-push 最後輸出的末尾，新增獨立區塊提醒用戶執行 `/review-api-flow`。

**觸發條件**：Step 13.5 有偵測到 API 檔案變更（已提取出 apiName）時才顯示，無 API 檔案變更則不顯示。

### 執行流程圖

```
/gcommit-push API Data Flow 更新提醒流程
│
├─ 1. 【檢查 Step 13.5 結果】
│   ├─ Step 13.5 無 API 檔案 → 不顯示提醒
│   └─ Step 13.5 有提取 apiName → 繼續
│
├─ 2. 【組合提醒內容】
│   ├─ 對每個 apiName：
│   │   ├─ data-flow 文件存在 → `/review-api-flow {apiName}`
│   │   └─ data-flow 文件不存在 → `/review-api-flow {apiName}` + ⚠️ 需先執行 /api-flow-architecture
│   └─ 多個 apiName → 列出多行
│
└─ 3. 【顯示獨立區塊】
    └─ 在所有輸出最後面顯示
```

### 顯示格式

#### 單一 API（有 data-flow 文件）

```
────────────────────────────────────
🔄 API Data Flow 更新提醒
────────────────────────────────────
本次 commit 修改了以下 API，建議更新前後端對齊檢查：

▸ /review-api-flow customer
────────────────────────────────────
```

#### 多個 API

```
────────────────────────────────────
🔄 API Data Flow 更新提醒
────────────────────────────────────
本次 commit 修改了以下 API，建議更新前後端對齊檢查：

▸ /review-api-flow customer
▸ /review-api-flow store
────────────────────────────────────
```

#### 無 data-flow 文件（需先建立）

```
────────────────────────────────────
🔄 API Data Flow 更新提醒
────────────────────────────────────
本次 commit 修改了以下 API，建議更新前後端對齊檢查：

▸ /review-api-flow customer
▸ /review-api-flow store  ⚠️ 需先執行 /api-flow-architecture store
────────────────────────────────────
```

#### 無 API 檔案變更

不顯示此區塊。

### 步驟位置

放在 Step 16（Proposal 行數檢查提醒）之後，作為最後一個獨立區塊：

```
├─ 16. 【Proposal 行數檢查提醒】
│   ├─ <= 3000 行 → 不顯示
│   └─ > 3000 行 → 提醒：先 /compact 再 /splitP
│
└─ 16.5 【🆕 API Data Flow 更新提醒】
    ├─ Step 13.5 無 API 檔案 → 不顯示
    └─ Step 13.5 有 apiName → 顯示提醒區塊
        ├─ 有 data-flow → `/review-api-flow {apiName}`
        └─ 無 data-flow → 加 ⚠️ 需先 /api-flow-architecture
```

**放在最後的理由**：
- 所有 commit/push/罐頭留言/行數檢查都完成後才提醒
- 不中斷任何流程
- 用戶看完所有結果後，最後看到下一步建議

### 資料來源

所有資訊都來自 Step 13.5 已經分析過的結果，不需要額外讀取或計算：

| 資訊 | 來源 |
|------|------|
| apiName 列表 | Step 13.5 從 commit 檔案提取 |
| data-flow 文件是否存在 | Step 13.5 已搜尋過 |

### 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 記錄到 gcommit-push 設計稿（2026-02-07）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-07）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

## 功能擴充：前端修改建議提醒（2026-02-07）

### 問題發現

`/gcommit-push` 在 Step 15 已用 grep -n 定位 proposal 前端修改區塊的行數範圍，Step 15.5 用 sed + pbcopy 複製到剪貼簿，但流程結束後沒有提醒用戶去執行 `/fxxxf2e` 將前端修改建議提取到獨立文件。用戶需要自己記得要跑哪個指令。

| 情況 | 問題 |
|------|------|
| proposal 有前端修改建議 | 用戶不知道要跑 `/fxxxf2e` |
| 大項目多份 proposal | 更容易遺漏，前端修改散落各 proposal |
| 前端同事等待修改建議 | 延遲交付前端修改文件 |

### 設計決策

在 gcommit-push 最後輸出的末尾（Step 16.5 API Data Flow 更新提醒之後），新增獨立區塊提醒用戶執行 `/fxxxf2e`。

**觸發條件**：Step 15 用 grep -n 搜尋到前端修改區塊的行數範圍（即 Step 15.5 有執行 sed + pbcopy）時才顯示，Step 15 未搜尋到行數則不顯示。

### 執行流程圖

```
/gcommit-push 前端修改建議提醒流程
│
├─ 1. 【檢查 Step 15 / 15.5 結果】
│   ├─ Step 15 grep -n 未搜尋到前端修改行數 → 不顯示提醒
│   └─ Step 15 有取得行數範圍 + Step 15.5 已執行 sed + pbcopy → 繼續
│
└─ 2. 【顯示獨立區塊】
    └─ 在所有輸出最後面顯示（Step 16.5 之後）
```

### 顯示格式

```
────────────────────────────────────
📝 前端修改建議提醒
────────────────────────────────────
此 proposal 包含前端修改建議，建議執行：

▸ /fxxxf2e
────────────────────────────────────
```

#### 無前端修改

不顯示此區塊。

### 步驟位置

放在 Step 16.5（API Data Flow 更新提醒）之後，作為最後一個獨立區塊：

```
├─ 16.5 【API Data Flow 更新提醒】
│   ├─ Step 13.5 無 API 檔案 → 不顯示
│   └─ Step 13.5 有 apiName → 顯示提醒區塊
│
└─ 16.7 【🆕 前端修改建議提醒】
    ├─ Step 15 grep -n 未找到前端修改行數 → 不顯示
    └─ Step 15 有行數 + Step 15.5 已 sed + pbcopy → 顯示提醒：▸ /fxxxf2e
```

**放在最後的理由**：
- 所有 commit/push/罐頭留言/行數檢查/API Flow 提醒都完成後才提醒
- 不中斷任何流程
- 用戶看完所有結果後，最後看到下一步建議

### 資料來源

所有資訊都來自 Step 15 / 15.5 已經執行過的結果，不需要額外讀取或計算：

| 資訊 | 來源 |
|------|------|
| 是否有前端修改 | Step 15 grep -n 是否搜尋到行數範圍 |
| 確認前端修改已處理 | Step 15.5 sed + pbcopy 已執行 |

### 與 `/fxxxf2e` 的關係

| 角色 | 說明 |
|------|------|
| `/gcommit-push` Step 15 | grep -n 定位前端修改行數範圍 |
| `/gcommit-push` Step 15.5 | sed + pbcopy 複製 proposal 中的前端修改到剪貼簿 |
| `/gcommit-push` Step 16.7 | 只負責**提醒**執行 `/fxxxf2e`，不執行任何提取 |
| `/fxxxf2e` | 實際**執行**提取，生成/追加 `{MMDD}_{N}_frontend_fix.md` |

### 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 記錄到 gcommit-push 設計稿（2026-02-07）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-07）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

### 2026-02-09 設計變更：新增最終步驟「更新進度表」

**變更內容**：在 skill 最後步驟完成後，自動執行 `@.claude/flowcharts/update-progress.md` 共用模組，將 proposal 進度表中 `/gcommit-push` 對應的行標記為 ✅。

**設計背景**：見 `showFlow_skill_proposal.md`「2026-02-09 設計變更」。

**影響**：
- 流程圖：最後節點後新增「更新進度表」
- 定義檔：最後 Step 後新增引用 `@.claude/flowcharts/update-progress.md`

---

### 2026-02-10 設計變更：Step 16.5 提醒邏輯調整（增加 /api-flow-architecture 更新提醒）

**問題描述**：

現有 Step 16.5「API Data Flow 更新提醒」只提醒跑 `/review-api-flow`，但後端改了之後，data-flow 文件中的 Entity/DTO/Service/Controller 結構描述已經過時（Step 13.5 只更新 scan-meta commit hash，沒有重新讀取程式碼更新結構內容）。

此外，後端修正後原本的前後端問題可能已經解決（例如後端加開了 alias 參數相容前端），應該重跑 `/review-api-flow` 重新對齊。

| 情況 | 現有行為 | 期望行為 |
|------|----------|----------|
| data-flow 存在 | 只提醒 `/review-api-flow` | 先提醒 `/api-flow-architecture` 更新結構，再提醒 `/review-api-flow` 重新對齊 |
| data-flow 不存在 | 提醒 `/review-api-flow` + ⚠️ 需先 `/api-flow-architecture` | 先提醒 `/api-flow-architecture` 建立結構，再提醒 `/review-api-flow` 對齊 |

**修改提案**：

#### Step 16.5 提醒邏輯調整

**原本**：
```
- data-flow 文件存在 → `▸ /review-api-flow {apiName}`
- data-flow 文件不存在 → `▸ /review-api-flow {apiName}  ⚠️ 需先執行 /api-flow-architecture {apiName}`
```

**改為**：
```
- data-flow 文件存在 →
  `▸ /api-flow-architecture {apiName}`    ← 更新後端結構
  `▸ /review-api-flow {apiName}`          ← 重新對齊前後端
- data-flow 文件不存在 →
  `▸ /api-flow-architecture {apiName}`    ← 建立後端結構
  `▸ /review-api-flow {apiName}`          ← 對齊前後端
```

#### 顯示格式調整

**data-flow 文件存在**：
```
────────────────────────────────────
🔄 API Data Flow 更新提醒
────────────────────────────────────
本次 commit 修改了以下 API，建議依序更新：

▸ /api-flow-architecture {apiName}    ← 更新後端結構
▸ /review-api-flow {apiName}          ← 重新對齊前後端
────────────────────────────────────
```

**data-flow 文件不存在**：
```
────────────────────────────────────
🔄 API Data Flow 更新提醒
────────────────────────────────────
本次 commit 修改了以下 API，建議依序建立：

▸ /api-flow-architecture {apiName}    ← 建立後端結構（尚未建立）
▸ /review-api-flow {apiName}          ← 對齊前後端
────────────────────────────────────
```

**設計理由**：
- `/api-flow-architecture` 用漸進式更新只處理有變的區塊，效率高
- `/review-api-flow` 重跑可以發現原本的問題是否已修正
- 順序固定：先更新結構 → 再對齊，確保 `/review-api-flow` 讀到最新結構

**影響**：
- 定義檔：Step 16.5 提醒邏輯和顯示格式
- 流程圖：Step 16.5 節點內容

---

### 2026-02-11 設計變更：移除 fetch + rebase 機制（Step 13 / 流程圖 Step 6）

**問題描述**：

現有 Step 13「同步遠端並推送」包含完整的 fetch + rebase + push 流程，以及為避免 rebase 失敗而設計的精準 stash 暫存機制：

```bash
# 現有流程
git stash push -m "..." -- [額外修改的檔案清單]   # 暫存額外修改
git fetch origin adminApi
git rebase origin/adminApi                     # 讓本地新 commit 置頂
git push origin adminApi
git stash pop                                      # 恢復額外修改
```

經與同事討論確認，**adminApi 分支只有本人推送 commit**，不會有其他人推送到該分支，因此：

- `git fetch` + `git rebase` 不需要（本地永遠是最新的，沒有遠端新 commit 要同步）
- 精準 stash 暫存機制也不需要（是為了處理 rebase 失敗而設計的）

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| Step 13 步驟數 | 5 步（stash → fetch → rebase → push → stash pop） | 1 步（push） |
| 錯誤處理 | rebase 衝突、stash pop 失敗 | 無（直接 push） |
| 執行時間 | fetch + rebase 約 5-10 秒 | push 約 2-3 秒 |

**修改提案**：

#### 1. 簡化 Step 13（定義檔）

**原本**：
```markdown
13. **同步遠端並推送**：
    - **預先處理額外修改**（避免 rebase 失敗）：
      - 檢查是否有 unstaged changes（額外修改）
      - 若有，使用精準 stash 暫存這些檔案：
        ```bash
        git stash push -m "gcommit-push: 暫存額外修改" -- [額外修改的檔案清單]
        ```
    - **執行同步**：
      ```bash
      git fetch origin adminApi
      git rebase origin/adminApi   # 讓本地新 commit 置頂
      git push origin adminApi
      ```
    - **恢復額外修改**：
      - 若有暫存，執行 `git stash pop` 恢復
    - **錯誤處理**：
      - 如果 rebase 有衝突，停止並通知用戶處理
      - push 成功後顯示完成訊息
```

**改為**：
```markdown
13. **推送到遠端**：
    ```bash
    git push origin adminApi
    ```
    - push 成功後顯示完成訊息
```

#### 2. 簡化流程圖 Step 6

**原本**：
```
├─ 6. 【同步遠端並推送】
│   ├─ 預先處理額外修改
│   │   └─ 有 unstaged changes → git stash push（精準暫存）
│   ├─ git fetch + git rebase origin/adminApi
│   ├─ git push origin adminApi
│   └─ 恢復額外修改（git stash pop）
```

**改為**：
```
├─ 6. 【推送到遠端】
│   └─ git push origin adminApi
```

#### 3. 移除定義檔「變更紀錄」中相關段落

定義檔末尾的「### 2026-01-22：新增額外修改自動暫存機制」段落已不適用，應移除或標記為已取代。

**實作狀態**：

- [x] 設計討論（2026-02-11）
- [x] 記錄到 gcommit-push 設計稿（2026-02-11）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-20）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-20）
- [ ] 測試驗證

---

### 2026-02-13 設計變更：移除 commit 前用戶確認步驟（Step 8）

**問題描述**：

原本 Step 8「顯示 commit 預覽，等待用戶確認」會在 commit 前停下來等用戶確認。實際使用中，前面的 Step 4 檔案一致性檢查已足夠驗證 commit 內容，Step 8 的確認步驟造成不必要的中斷。

**設計決策**：

移除 Step 8 的用戶確認等待，讓流程從 Step 7（決定 commit message + 前端修改摘要）直接接到 Step 9（git add）。

**修改內容**：

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| 定義檔 Step 8 | `顯示 commit 預覽，等待用戶確認` | 移除此步驟，Step 7 完成後直接進入 Step 9 |
| 驗證結果處理表 | `完全一致 → 直接進入 commit 流程` | 不變（已是直接進入） |

**設計理由**：
- Step 4 的檔案一致性檢查已涵蓋驗證需求（遺漏才詢問、額外自動忽略）
- 減少不必要的互動中斷，加速 commit 流程

**實作狀態**：

- [x] 設計討論（2026-02-13）
- [x] 記錄到 gcommit-push 設計稿（2026-02-13）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-20）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-20）
- [ ] 測試驗證

---

### 2026-02-20 設計變更：新增 fixPermissionError 追蹤表更新

**問題描述**：

`/fixPermissionError` skill 需要一個追蹤表記錄各 API 的掃描進度。對於需要修正的 API（❌/⚠️），修復後經由 `/gcommit-push` 提交時，應自動更新追蹤表。

**設計決策**：

在 Step 6.5（scan-meta 更新）之後新增 Step 6.7「更新 fixPermissionError 追蹤表」，條件觸發。

**修改內容**：

#### 定義檔新增 Step 6.7

在 Step 13.5（scan-meta）之後新增：

```markdown
13.7. **更新 fixPermissionError 追蹤表**（若 proposal 路徑含 role_and_permission）：
    - **偵測條件**：proposal 路徑匹配 `role_and_permission/debug/*_permission_error_fix_proposal.md`
      - 不匹配 → 跳過此步驟
    - **從路徑提取 apiName**：
      - 路徑格式：`{MMDD}_{apiName}_permission_error_fix_proposal.md`
      - 提取 `{apiName}`
    - **更新追蹤表**：
      - 路徑：`prompts/4_diary/role_and_permission/permission-error-fix-progress.md`
      - 該 API 的「掃描」欄位 → ✅
      - 該 API 的「結果」欄位 → ✅ 已修正（gcommit-push = 修復已 commit，直接標 ✅）
      - 該 API 的「日期」欄位 → 當天日期
      - 重算頂部統計數字（✅ 已修正 +1）
    - **顯示更新結果**：
      ```
      📊 fixPermissionError 追蹤表已更新
      - API：{apiName}
      - 結果：✅ 已修正
      ```
```

#### 流程圖新增 Step 6.7

```
├─ 6.7 【更新 fixPermissionError 追蹤表】（若 proposal 路徑含 role_and_permission）
│   ├─ 偵測：proposal 路徑匹配 role_and_permission/debug/*_permission_error_fix_proposal.md
│   │   └─ 不匹配 → 跳過
│   ├─ 從路徑提取 apiName
│   ├─ 更新追蹤表：掃描 ✅ + 結果 ✅ 已修正 + 日期
│   └─ 重算統計數字
```

**關聯設計稿**：

- fixPermissionError 設計稿：`prompts/4_diary/debug/proposal/slash/fixPermissionError_skill_proposal.md`
- 追蹤表：`prompts/4_diary/role_and_permission/permission-error-fix-progress.md`

**實作狀態**：

- [x] 設計討論（2026-02-20）
- [x] 記錄到 gcommit-push 設計稿（2026-02-20）
- [x] 記錄到 fixPermissionError 設計稿（2026-02-20）
- [x] 建立追蹤表（預填初始分類）（2026-02-20）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-20）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-20）

---

### 2026-02-20 設計變更：新增 fix-id-string-number 追蹤表更新

**問題描述**：

`/fix-id-string-number` skill 使用追蹤表 `prompts/4_diary/debug/id-type-fix-progress.md` 記錄各 API 模組的掃描進度。gcommit-push 需要在 commit 後自動更新追蹤表的 Commit 欄位。

**設計決策**：

與 Step 13.7（fixPermissionError）相同設計模式：
- 偵測 proposal 路徑 pattern → 提取 apiName → 更新對應追蹤表

**修改內容**：

#### 定義檔新增 Step 13.8

在 Step 13.7 之後新增：
- **偵測條件**：proposal 路徑匹配 `*_id_type_fix_proposal.md`
- **從路徑提取 apiName**：格式 `{MMDD}_{apiName}_id_type_fix_proposal.md`
- **更新追蹤表**：`prompts/4_diary/debug/id-type-fix-progress.md` 的 Commit 欄位
- **重算統計數字**

#### 流程圖新增 Step 6.8

```
├─ 6.8 【更新 fix-id-string-number 追蹤表】（若 proposal 路徑含 _id_type_fix_proposal.md）
│   ├─ 偵測：proposal 路徑匹配 *_id_type_fix_proposal.md
│   │   └─ 不匹配 → 跳過
│   ├─ 從路徑提取 apiName（格式：{MMDD}_{apiName}_id_type_fix_proposal.md）
│   ├─ 更新追蹤表：Commit 欄位 → commit hash
│   └─ 重算統計數字
```

**關聯設計稿**：

- fix-id-string-number 設計稿：`prompts/4_diary/debug/proposal/slash/fix-id-string-number_skill_proposal.md`
- 追蹤表：`prompts/4_diary/debug/id-type-fix-progress.md`

**實作狀態**：

- [x] 設計討論（2026-02-20）
- [x] 記錄到 gcommit-push 設計稿（2026-02-20）
- [x] 記錄到 fix-id-string-number 設計稿（2026-02-20）
- [x] 更新 `gcommit-push.md` 定義檔（2026-02-20）
- [x] 更新 `gcommit-push_flowchart.md` 流程圖（2026-02-20）

---

## 2026-03-10 設計變更：新增 per-ticket branch 支援（cherry-pick 到 ticket branch）

### 需求背景

同事希望每張 Notion 票獨立一個 git branch，merge 進 dev 後 branch 保留在 GitHub，方便追蹤每張票的修改歷史。

### 設計決策

- gcommit-push 新增可選的第二參數 `[ticket-number]`（Notion unique_id）
- commit 到 adminApi 後，自動 cherry-pick 到對應的 ticket branch
- 沒有 ticket-number 時，使用 commit message 的 slug 作為 branch name（無 `ticket/` 前綴）

### 參數變更

```
# 現有
/gcommit-push <proposal-path>

# 新增
/gcommit-push <proposal-path> [ticket-number]
```

- `ticket-number`：可選，Notion 票的數字 ID（如 `393`）
- 省略時，仍建立 branch 但不帶 `ticket/` 前綴

### 新增步驟：建立/更新 ticket branch

在 Step 6（push adminApi）之後、Step 6.5（scan-meta）之前插入：

#### Step 6.1：建立/更新 ticket branch

```
Step 6.1: 建立/更新 ticket branch
│
├─ 1. 決定 branch name
│   ├─ 有 ticket-number → ticket/{number}-{slug}
│   └─ 無 ticket-number → {slug}
│   └─ slug 來源：從 commit message 提取（如 fix: customer pagination → customer-pagination）
│
├─ 2. 檢查 branch 是否存在
│   └─ git branch -r --list "origin/{branch-name}"
│
├─ 3. 條件處理
│   ├─ 不存在 → 建立新 branch
│   │   ├─ git branch {branch-name} adminApi
│   │   └─ git push origin {branch-name}
│   │
│   └─ 已存在 → cherry-pick 新 commit
│       ├─ git checkout {branch-name}
│       ├─ git cherry-pick {commit-hash}（Step 5 取得的 hash）
│       ├─ git push origin {branch-name}
│       └─ git checkout adminApi
│
└─ 4. 輸出
    └─ 🎫 {branch-name} 已建立/已更新（commit: {hash}）
```

### Branch 命名規則

| 情境 | 格式 | 範例 |
|------|------|------|
| 有 ticket-number | `ticket/{number}-{slug}` | `ticket/393-informationSheet-print-fix` |
| 無 ticket-number | `{slug}` | `informationSheet-print-fix` |

**slug 提取規則**：
1. 從 commit message 取得（去掉 `fix:` / `feat:` / `refactor:` 前綴）
2. 空格轉 `-`，全小寫
3. 範例：`fix: customer pagination limit 30 to 10` → `customer-pagination-limit-30-to-10`

### 輸出格式變更

完成報告新增 ticket branch 資訊：

```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `{hash}` 交接給QA測試
🎫 Branch: ticket/393-informationSheet-print-fix
────────────────────────────────────
```

### 相容性影響

| 現有步驟 | 影響 | 說明 |
|---------|------|------|
| Step 1~5（commit 流程） | ❌ 無影響 | 完全不變 |
| Step 5.5（Bug Spec 索引） | ❌ 無影響 | 不涉及 branch |
| Step 6（push adminApi） | ❌ 無影響 | 維持 push adminApi |
| **新 Step 6.1** | ✅ 新增 | cherry-pick 到 ticket branch |
| Step 6.5~6.8（追蹤表更新） | ❌ 無影響 | 使用已有的 commit hash |
| Step 7~9.7（提醒、罐頭留言） | ⚠️ 小改 | 罐頭留言加上 branch 資訊 |

### 實作狀態

- [x] 設計討論（2026-03-10）
- [x] 記錄到設計稿（2026-03-10）
- [ ] 更新 `gcommit-push.md` 定義檔
- [ ] 更新 `gcommit-push_flowchart.md` 流程圖
