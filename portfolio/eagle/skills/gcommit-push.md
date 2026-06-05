---
description: 完成實作後，更新提案文件並 commit
argument-hint: <proposal-path> [ticket-number]
design-doc: prompts/4_diary/debug/proposal/slash/gcommit-push_skill_proposal.md
---

@.claude/flowcharts/gcommit-push_flowchart.md

## 專案範圍

⚠️ **此 skill 僅處理 backend-nestjs 專案的 commit**

- 工作目錄：`/Users/nicholas/Desktop/Projects/backend-nestjs`
- 非此專案的檔案修改會被自動忽略，不納入 commit
- 包括但不限於：prompts/、Projects/.claude/、其他專案目錄

## 參數

- 提案文件路徑：$1
- Ticket Number（可選）：$2（Notion 票的數字 ID，如 `393`）

## 任務

1. 讀取提案文件，理解修改內容
2. 從提案文件中提取「修改檔案清單」區塊（預期修改的檔案）
3. 在 backend-nestjs 目錄執行 `git status`，取得實際修改的檔案清單
   - 工作目錄：`/Users/nicholas/Desktop/Projects/backend-nestjs`
   - ⚠️ 忽略其他專案（prompts、Projects/.claude 等）的修改
4. 【驗證步驟】比對預期修改與實際修改：
   - **先過濾**：只保留 backend-nestjs 目錄下的檔案
   - 非 backend-nestjs 的修改直接忽略（不列出、不詢問、不 commit）
   - 列出「提案有列但 git 沒改」的檔案（遺漏）
   - 列出「git 有改但提案沒列」的檔案（額外，不納入 commit）
   - 遺漏：詢問用戶是否繼續
   - 額外：列出提醒但不詢問，直接只 commit 提案清單中的檔案
5. 在提案文件最後新增「## 實作完成紀錄」區塊：
   - 完成時間
   - 修改檔案列表（list 格式，非 checklist）
   - Commit message（先寫，hash 稍後補）
6. 根據提案內容決定 commit message 前綴：
   - `fix:` - Bug 修復
   - `feat:` - 新增功能
   - `refactor:` - 重構優化
7. **檢查提案是否包含前端修改**：
   - 搜尋提案文件中是否有「# 前端修改」區塊
   - 若有，提取前端專案名稱和各修改項目
   - 將前端修改摘要加入 commit message（參考 Commit Message 格式）
9. 在 backend-nestjs 目錄執行 git add（指定檔案，禁止 git add .）
   - 確認所有檔案路徑都在 backend-nestjs 目錄下
   - 若發現非 backend-nestjs 的檔案，自動跳過
10. 執行 git commit
11. 執行 `git log -1 --format="%h"` 取得短 commit hash
12. 更新提案文件，在 Commit 區塊下方加入 `**Commit Hash**：\`{hash}\``
12.5. **更新 Bug Spec 索引進度**（若有多份 proposal）：
    - 從 proposal 路徑提取 `{MMDD}_{N}` 前綴
    - 用 glob 計算 `{目錄}/{MMDD}_{N}_*_proposal.md` 數量
    - 若只有 1 份 → 跳過
    - 若 2 份以上：
      1. 找到 `{MMDD}_{N}_bug_spec.md`
      2. 讀取「## Proposal 索引」區塊
      3. 比對本次 proposal 的「## 實作完成紀錄」，找出完成的項目
      4. 對應項目 ⏳ → ✅，附上 `— {commit_hash}`
      5. 用 `wc -l` 更新 Proposal 標題的行數
      6. 若所有項目都 ✅ → 標題狀態改為「✅ 已完成」
13. **推送到遠端**：
    ```bash
    git push origin adminApi
    ```
    - push 成功後顯示完成訊息
13.1. **建立/更新 ticket branch**：
    - **決定 branch name**：
      - 有 $2（ticket-number）→ `ticket/{number}-{slug}`
      - 無 $2 → `{slug}`
      - slug 來源：從 commit message 提取（去掉 `fix:` / `feat:` / `refactor:` 前綴，空格轉 `-`，全小寫）
      - 範例：`fix: customer pagination limit 30 to 10` → `customer-pagination-limit-30-to-10`
    - **檢查 branch 是否存在**：
      ```bash
      git branch -r --list "origin/{branch-name}"
      ```
    - **不存在** → 建立新 branch：
      ```bash
      git branch {branch-name} adminApi
      git push origin {branch-name}
      ```
    - **已存在** → cherry-pick 新 commit：
      ```bash
      git checkout {branch-name}
      git cherry-pick {commit-hash}
      git push origin {branch-name}
      git checkout adminApi
      ```
    - **輸出**：`🎫 {branch-name} 已建立/已更新（commit: {hash}）`
13.5. **更新 API Data Flow scan-meta**（若有對應文件）：
    - **從 commit 檔案提取 apiName**：
      - 分析 Step 9 git add 的檔案路徑，提取 `src/api/**/{apiName}/` 中的 apiName
      - 若無 API 相關檔案（如只改 migration、config）→ 跳過此步驟
    - **搜尋 data-flow 文件**：
      - 用 Glob 搜尋 `prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md`
      - 用 Glob 搜尋 `prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md`
      - 找不到 → 跳過（不報錯，該 API 可能尚未建立 data-flow 文件）
    - **取得 push 後的 commit hash**：
      - 使用 `git -C backend-nestjs rev-parse --short HEAD` 取得最新 commit hash
    - **精準更新 scan-meta**：
      - 分類 commit 中的檔案類型：
        - `*.entity.ts` → Entity 區塊
        - `*.dto.ts` → DTO 區塊
        - `*.service.ts` → Service 區塊
        - `*.controller.ts` → Controller 區塊
      - 只更新有變更的區塊的 scan-meta：
        ```
        <!-- scan-meta: commit={new-hash}, date={YYYY-MM-DD} -->
        ```
      - 沒變更的區塊 → 不動其 scan-meta
    - **顯示更新結果**：
      ```
      📄 API Data Flow scan-meta 已更新
      - 檔案：prompts/6_api_data_flow/{dir}/{apiName}-data-flow.md
      - Commit：{hash}
      - 更新區塊：Entity, DTO（僅列出有更新的）
      ```
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
13.8. **更新 fix-id-string-number 追蹤表**（若 proposal 路徑含 `_id_type_fix_proposal.md`）：
    - **偵測條件**：proposal 路徑匹配 `*_id_type_fix_proposal.md`
      - 不匹配 → 跳過此步驟
    - **從路徑提取 apiName**：
      - 路徑格式：`{MMDD}_{apiName}_id_type_fix_proposal.md`
      - 提取 `{apiName}`
    - **更新追蹤表**：
      - 路徑：`prompts/4_diary/debug/id-type-fix-progress.md`
      - 該 API 的「Commit」欄位 → commit hash
    - **重算統計數字**（已掃描數量、百分比）
    - **顯示更新結果**：
      ```
      📊 id-type-fix 追蹤表已更新
      - API：{apiName}
      - Commit：{hash}
      ```
14. **Migration 執行提醒**（若有 migration 檔案）：
    - **檢查是否需要執行**：
      - 檢查 commit 檔案中是否包含 `src/database/migrations/` 路徑
      - 若無 migration 檔案，跳過此步驟
    - **從提案文件提取資訊**：
      - 讀取提案文件，尋找「migration」、「新增欄位」、「ALTER TABLE」等關鍵字
      - 提取 table 名稱和 column 名稱
    - **查詢 dev/staging DB**：
      ```bash
      # 切換到 dev 環境
      ./scripts/db-tunnel.sh dev

      # 查詢欄位是否存在
      psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        AND column_name = '{column_name}'
      "
      ```
    - **顯示執行提醒**：
      ```
      📋 Migration 執行提醒
      ─────────────────────────────────
      Migration 檔案：{migration_file_name}
      影響資料表：{table_name}
      新增欄位：{column_name}

      環境狀態檢查：
      - dev:     {✅ 已存在 / ❌ 需要執行 migration}
      - staging: {✅ 已存在 / ❌ 需要執行 migration}

      {若有需要執行的環境}
      ⚠️ 請在以下環境執行 migration：
         yarn migration:run --env={env}
      ─────────────────────────────────
      ```
15. **生成罐頭留言**：
    - 檢查提案文件是否有「# 前端修改」或「前端修改建議」區塊
    - 若純後端修改 → 「交接給QA測試」
    - 若有前端修改：
      - 取得前端修改區塊的起始行數（grep -n 搜尋「前端修改」）
      - 取得前端修改區塊的結束行數（搜尋下一個「---」或「後端修改」）
      - 罐頭訊息包含：提案文件路徑 + 行數範圍
    - **多份 proposal 標明來源**：
      - 用 glob 檢查同目錄是否有多份 proposal（`{MMDD}_{N}_*_proposal.md`）
      - 只有一份 → 不標註（維持現有行為）
      - 多份 → 罐頭留言附加：`📄 提案文件：{path}（Proposal N）`
    - 顯示格式化的罐頭留言，方便用戶複製到 Notion
15.5. **複製前端修改建議到剪貼簿**（若有前端修改）：
    - 沿用 Step 15 已取得的起始行（start_line）和結束行（end_line）
    - ⚠️ **必須使用 Bash 工具**執行以下 sed 指令（不可只顯示訊息而跳過執行）：
      ```bash
      sed -n '{start_line},{end_line}p' {proposal_path} | pbcopy
      ```
    - Bash 執行成功後顯示：`✅ 前端修改建議已複製到剪貼簿（第 {start_line} ~ {end_line} 行）`
    - 若無前端修改 → 跳過此步驟
16. **Proposal 行數檢查提醒**：
    - 計算 proposal 行數
    - 若 > 3000 行 → 顯示提醒：
      ```
      ⚠️ 此 proposal 已達 {N} 行（超過 3000 行門檻）
      💡 建議先執行 /compact 再執行 /splitP 拆分
      ```
    - 若 <= 3000 行 → 不顯示，結束
16.5. **API Data Flow 更新提醒**（若 Step 13.5 有偵測到 API 變更）：
    - 若 Step 13.5 判斷無 API 檔案 → 跳過，不顯示此區塊
    - 若 Step 13.5 有提取 apiName → 顯示獨立提醒區塊：
      - 對每個 apiName：
        - data-flow 文件存在：
          - `▸ /api-flow-architecture {apiName}`    ← 更新後端結構
          - `▸ /review-api-flow {apiName}`          ← 重新對齊前後端
        - data-flow 文件不存在：
          - `▸ /api-flow-architecture {apiName}`    ← 建立後端結構（尚未建立）
          - `▸ /review-api-flow {apiName}`          ← 對齊前後端
    - 顯示格式（data-flow 存在）：
      ```
      ────────────────────────────────────
      🔄 API Data Flow 更新提醒
      ────────────────────────────────────
      本次 commit 修改了以下 API，建議依序更新：

      ▸ /api-flow-architecture {apiName}    ← 更新後端結構
      ▸ /review-api-flow {apiName}          ← 重新對齊前後端
      ────────────────────────────────────
      ```
    - 顯示格式（data-flow 不存在）：
      ```
      ────────────────────────────────────
      🔄 API Data Flow 更新提醒
      ────────────────────────────────────
      本次 commit 修改了以下 API，建議依序建立：

      ▸ /api-flow-architecture {apiName}    ← 建立後端結構（尚未建立）
      ▸ /review-api-flow {apiName}          ← 對齊前後端
      ────────────────────────────────────
      ```
16.7. **前端修改建議提醒**（若 Step 15 grep -n 搜尋到前端修改行數範圍）：
    - Step 15 grep -n 未找到前端修改行數 → 跳過
    - Step 15 有行數 + Step 15.5 已執行 sed + pbcopy → 顯示提醒：
      ```
      ────────────────────────────────────
      📝 前端修改建議提醒
      ────────────────────────────────────
      此 proposal 包含前端修改建議，建議執行：

      ▸ /fxxxf2e
      ────────────────────────────────────
      ```

### Step 10：更新進度表

@.claude/flowcharts/update-progress.md

執行進度表更新：將 `/gcommit-push` 對應的步驟標記為 ✅。

## 罐頭留言格式

push 成功後，顯示：

### 純後端修改

```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `{hash}` 交接給QA測試
🎫 Branch: {branch-name}
────────────────────────────────────
```

### 包含前端修改

```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `{hash}` 交接給前端處理
🎫 Branch: {branch-name}

📄 提案文件：{proposal_path}
📍 前端修改建議：第 {start_line} 行 ~ 第 {end_line} 行
────────────────────────────────────
```

**判斷規則**：

| 提案內容 | 交接對象 | 附加資訊 |
|---------|---------|---------|
| 有「# 前端修改」或「前端修改建議」區塊 | 前端處理 | 提案路徑 + 行數範圍 |
| 純後端修改 | QA測試 | 無 |

## 驗證輸出格式

```
📋 檔案一致性檢查

預期修改（提案文件）：
- src/api/.../customer.service.ts
- src/api/.../customer.controller.ts

實際修改（git status）：
- src/api/.../customer.service.ts
- src/api/.../customer.controller.ts

✅ 檔案一致，準備 commit
```

若有額外修改（與提案無關）：

```
📋 檔案一致性檢查

預期修改（提案文件）：
- src/api/.../customer.service.ts
- src/api/.../customer.controller.ts

實際修改（git status）：
- src/api/.../customer.service.ts
- src/api/.../customer.controller.ts
- src/api/.../customer.dto.ts        ← 額外修改（非本次工作範圍）

ℹ️ 額外修改（不納入此次 commit）：
- customer.dto.ts（可能是其他任務的修改）

✅ 將只 commit 提案清單中的 2 個檔案
```

若有遺漏：

```
📋 檔案一致性檢查

預期修改（提案文件）：
- src/api/.../customer.service.ts
- src/api/.../customer.controller.ts

實際修改（git status）：
- src/api/.../customer.service.ts

⚠️ 發現遺漏：
- customer.controller.ts（提案有列但未修改）

是否繼續 commit？
```

## 新增區塊格式

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

**Commit Hash**：`{短 hash，7-8 碼}`
```

## Commit Message 格式

⚠️ **強制規定**：
- commit message **必須用英文**
- 主要訊息只需要一行
- **不要加** `Co-Authored-By` 署名

### 純後端修改（提案無前端區塊）

```
{prefix}: {apiName} {英文修改摘要}
```

範例：
- `fix: customer pagination limit 30 to 10`
- `feat: contractType add CRUD endpoints`
- `refactor: estateListing optimize findAll query`

### 包含前端修改（提案有「# 前端修改」區塊）

當提案文件包含「# 前端修改（xxx-nuxt）」區塊時，commit message 需加上前端摘要：

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

範例（對應 auth login 提案）：
```
fix: auth remove username from login

Frontend changes (dashboard-nuxt):
- login.vue: remove username form field
- auth.ts: remove username from LoginParams
```

❌ 錯誤範例（中文）：
- `fix: customer 修正分頁問題` ← 禁止

## 驗證結果處理

| 情況 | 處理方式 |
|------|----------|
| 完全一致 | 直接進入 commit 流程 |
| 有遺漏 | 警告用戶，詢問是否繼續 |
| 有額外修改 | **列出提醒用戶，但不納入此次 commit**（不詢問，直接忽略） |
| 兩者皆有 | 列出遺漏並詢問；額外修改僅列出提醒，不納入 commit |

### ⚠️ 重要原則

**只 commit 提案清單中的檔案**：
- AI 的工作範圍 = 提案文件中列出的檔案
- 其他修改是用戶或其他 AI 的工作，與當前任務無關
- 額外修改要列出讓用戶知道，但絕對不要 commit 或詢問是否納入

---

## 變更紀錄

### ~~2026-01-22：新增額外修改自動暫存機制~~（已被 2026-02-11 設計變更取代）

> 已移除 fetch + rebase 機制，adminApi 只有本人推送，不需要 rebase，因此 stash 暫存機制也不再需要。

### 2026-01-26：新增 Migration 執行提醒功能

**問題描述**：

在實作含有 migration 的功能時，DBA 可能已在 dev/staging 環境手動建立欄位，導致開發者不確定是否需要執行 migration。

**解決方案**：

新增步驟 14「Migration 執行提醒」，在 push 成功後自動檢查：
1. 檢查 commit 是否包含 migration 檔案
2. 從提案文件提取 table/column 資訊
3. 查詢 dev/staging DB，檢查欄位是否已存在
4. 顯示各環境的狀態，提醒哪些環境需要執行 migration

**設計原則**：
- 若無 migration 檔案則跳過此步驟
- 使用 `information_schema.columns` 檢查欄位存在性
- 明確顯示每個環境的狀態（✅ 已存在 / ❌ 需要執行）

### 2026-01-27：新增前端修改參考資訊

**需求**：當有前端修改時，罐頭訊息應包含提案文件路徑和前端修改的行數範圍，方便前端人員直接查看。

**實作**：
- 更新步驟 15：增加取得前端修改區塊行數範圍的邏輯
- 更新罐頭留言格式：包含前端修改時顯示「提案文件 + 行數範圍」
- 格式：`📍 前端修改建議：第 {start_line} 行 ~ 第 {end_line} 行`

### 2026-01-24：新增罐頭留言生成功能

**需求**：commit 推送完成後，自動生成罐頭留言方便用戶複製到 Notion 通知相關人員。

**實作**：
- 新增步驟 15：生成罐頭留言（原步驟 14）
- 根據提案是否有前端修改區塊，判斷交接對象（前端處理 / QA測試）
- 新增「罐頭留言格式」區塊說明輸出格式

### 2026-02-07：新增 API Data Flow scan-meta 更新

**問題描述**：

`/api-flow-architecture` 和 `/review-api-flow` 產出的 data-flow 文件使用 scan-meta commit hash 判斷是否需要更新。但 push 後 commit hash 不會自動同步到 data-flow 文件，導致下次執行時誤判為「有變更」而重新讀取程式碼。

**解決方案**：

新增步驟 13.5「更新 API Data Flow scan-meta」，在 push 成功後自動更新：
1. 從 commit 檔案提取 apiName
2. 搜尋對應的 data-flow 文件
3. 分類變更檔案類型，精準更新對應區塊的 scan-meta
4. 沒變更的區塊不動其 scan-meta

**設計原則**：
- 若無 API 相關檔案或無 data-flow 文件 → 靜默跳過
- 精準更新：只更新有變更的區塊（Entity/DTO/Service/Controller）
- 閉環設計：gcommit-push 更新 scan-meta → 下次 review-api-flow 看到最新 hash → 無變更時不讀程式碼

### 2026-02-07：新增 API Data Flow 更新提醒

**問題描述**：

Step 13.5 已分析 commit 檔案並提取 apiName，但流程結束後沒有提醒用戶執行 `/review-api-flow` 更新前後端對齊檢查。

**解決方案**：

新增步驟 16.5「API Data Flow 更新提醒」，在所有輸出最後面顯示獨立提醒區塊：
- 有 API 變更 → 列出 `/review-api-flow {apiName}` 指令
- 無 data-flow 文件 → 額外提示需先執行 `/api-flow-architecture`
- 無 API 變更 → 不顯示

**設計原則**：
- 資料全部來自 Step 13.5 已分析的結果，不需額外讀取
- 放在最後，不中斷任何流程
