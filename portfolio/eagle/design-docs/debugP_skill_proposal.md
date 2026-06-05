# Debug Skill + Module 設計提案

## 概述

將 debug 流程拆分為兩個 skill，搭配模組化設計，讓流程可重複使用且易於維護。

---

## 原始通用模版

目前每次 debug 都會手動貼以下 prompt：

```markdown
先說一下 debug 的流程

會給你 bug 的 spec 文件，他的檔名會有個日期前綴，像是 0919_2_bug_spec.md

請你讀完 api、程式碼、entity 定義後，幫我生出修改建議文件

檔案會放在跟 bug spec 文件同一個 folder

然後修改文件
- 要有相同的日期與編號前綴，例如 0919_2_
- 檔名請用英文，檔名要跟要修的問題敘述有關
- 檔案內容標題與文字敘述維持用中文

bug 文件：

文件路徑

前端 dashboard 專案：dashboard-nuxt，你可能需要看一下前端送了什麼

**如何 curl 測 dev/staging db 的資料**

/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/curl_get_dashboard_token.md

**你可以用直接連到 staging db 與打 staging api 的方式**

搭配前後端的程式碼與 staging db 的資料，然後寫篇修改提案文件給我
```

### 問題

1. 每次都要重複貼這段
2. `/compact` 後 AI 會忘記規則，又要重貼
3. 無法靈活切換 staging / dev / production 環境

---

## 設計討論過程

### 初版想法：拆成多個 Skill

原本考慮將流程拆成三個 skill：

| 原始內容 | 拆分後 | 類型 |
|---------|--------|------|
| 檔名規則、格式要求 | `debug-output-rules.md` | 模組 |
| curl_get_dashboard_token.md | `curl-token.md` | 模組 |
| 載入 bug spec + 規則 | `ticket.md` | Skill 1 |
| 分析專案與 db | `analyze.md` | Skill 2 |
| 完整流程 | `full.md` | Skill 3 |

### 討論：子目錄 vs 參數傳遞

參考 `skill_module_architecture.md` 和 `slash-command-subcommands.md` 的設計方式，討論了兩種組織方式：

**方式一：子目錄**
```
.claude/commands/debug/
├── ticket.md      → /ticket (project:debug)
├── analyze.md     → /analyze (project:debug)
└── full.md        → /full (project:debug)
```
- 優點：視覺分類清楚，有 `(project:debug)` 標籤
- 缺點：命令名稱太短，可能與其他類別衝突

**方式二：參數傳遞（子項目風格）**
```
.claude/commands/debugP.md

使用：
/debugP ticket /path/to/spec.md
/debugP analyze staging
```
- 優點：更像標準 CLI 設計（git commit, docker run）
- 缺點：需要在 prompt 中處理子命令分支邏輯

### 結論：簡化設計

討論後發現，實際使用場景是：

```
/debugP staging /path/to/0919_2_bug_spec.md
```

這就是**一個 skill + 兩個參數**，不需要拆成多個 skill，也不需要子命令設計。

**不需要子目錄的原因**：
- 目前 debug 類只有一個 skill
- 模組（curl-token.md）是共用的，其他 skill 之後也能引用
- 不需要視覺分類

---

## **最終設計**

### 檔案位置決策

因為我們都是在 **Projects 目錄**開啟 Claude Code，所以 skill 和 modules 必須放在 Projects/.claude/ 才能被載入。

這與現有的 `know-cc-config.md` 和 `merge-to-deploy.md` 採用相同的設計方式。

### 檔案結構

```
/Users/nicholas/Desktop/Projects/.claude/
├── commands/
│   ├── debugP.md              ← 新增
│   ├── know-cc-config.md     ← 已存在
│   └── merge-to-deploy.md    ← 已存在
│
└── modules/                   ← 新建目錄
    ├── debug-output-rules.md ← 新增
    └── curl-token.md         ← 新增
```

### 模組設計

#### debug-output-rules.md

檔案位置：`/Users/nicholas/Desktop/Projects/.claude/modules/debug-output-rules.md`

```markdown
## Debug 輸出規則

### 輸入檔案
- bug spec 的檔名會有日期前綴，像是 `0919_2_bug_spec.md`

### 輸出檔案位置
- 放在與 bug spec 文件同一個 folder

### 輸出檔名規則
- 保留相同的日期與編號前綴（例如 0919_2_）
- 檔名用英文，需與修改問題相關

### 輸出內容格式
- 標題與文字敘述維持中文
```

#### curl-token.md

檔案位置：`/Users/nicholas/Desktop/Projects/.claude/modules/curl-token.md`

使用 `@` 引用現有文件：

```markdown
@/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/curl_get_dashboard_token.md
```

### Skill 設計

#### debugP.md

檔案位置：`/Users/nicholas/Desktop/Projects/.claude/commands/debugP.md`

```markdown
---
description: Debug ticket（連 db + 分析專案）
argument-hint: <env> <ticket-path>
---

@/Users/nicholas/Desktop/Projects/.claude/modules/debug-output-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/curl-token.md

## 參數

- 目標環境：$1
- Bug spec：$2

## 分析範圍

- 前端專案：dashboard-nuxt
- 後端專案：backend-nestjs

## 任務

1. 讀取 bug spec，理解問題
2. 查看前端送了什麼請求
3. 查看後端 API、程式碼邏輯、entity 定義
4. 連線指定環境的 db 查詢相關資料
5. 用 curl 打 API 驗證
6. 搭配前後端程式碼與 db 資料，產出修改建議文件（遵循輸出規則）
```

---

## 參數設計

| 參數位置 | 說明 | 範例值 |
|----------|------|--------|
| `$1` | 環境名稱 | `staging` / `dev` / `production` |
| `$2` | bug spec 路徑 | `/path/to/0919_2_bug_spec.md` |

---

## 為什麼要模組化？

### debug-output-rules.md

- `/compact` 後 AI 會忘記命名規則
- 放模組裡，每次執行 skill 都會重新載入
- 避免每次都要重複貼規則

### curl-token.md

- 連線方式可能會更新
- 之後加 production 連線時，只需更新這個模組
- **多個 skill 可共用**同一份連線教學（這是選擇簡化設計的關鍵原因）

---

## 執行範例

```bash
/debugP staging /Users/nicholas/Desktop/Projects/prompts/4_diary/debug/0919_2_bug_spec.md

# 產出：0919_2_fix_user_permission.md
```

```bash
/debugP dev /path/to/0120_1_bug_spec.md

# 產出：0120_1_fix_api_response.md
```

---

## 設計決策總結

| 討論項目 | 決策 | 原因 |
|----------|------|------|
| 拆成多個 skill？ | 否，一個就夠 | 實際使用就是一個動作 |
| 使用子目錄？ | 否 | 不需要視覺分類，只有一個 skill |
| 使用子命令風格？ | 否 | 不需要分支邏輯，兩個參數就夠 |
| 模組共用？ | 是 | curl-token.md 之後其他 skill 也會用 |

---

## 已確認事項

| 問題 | 決策 | 原因 |
|------|------|------|
| 模組位置？ | Projects/.claude/ | 因為在 Projects 開啟 Claude Code，與現有 skill 相同設計 |
| curl-token.md 內容？ | 用 `@` 引用現有檔案 | 不需維護兩份，更新時只需改原始檔案 |

---

## 實作狀態

### 已完成 ✅

1. ✅ 確認設計
2. ✅ 建立 modules 目錄
3. ✅ 建立 debug-output-rules.md 模組
4. ✅ 建立 curl-token.md 模組
5. ✅ 建立 debugP.md skill
6. ✅ 測試執行 - **驗證成功**

### 驗證結果（2026-01-11）

```bash
/debugP staging /path/to/0111_1_bug_spec.md
```

- ✅ skill 正確載入
- ✅ 模組引用正常（`@` 語法運作）
- ✅ 參數傳遞正常（$1 環境、$2 路徑）
- ✅ AI 正確分析前後端專案與 db
- ✅ 產出修改建議文件（遵循輸出規則）

### 備註

寫入檔案時會被要求權限確認，這是 Claude Code 本身的機制，選擇 "Yes, allow all edits during this session" 即可。

---

## 功能擴充：歷史文件驗證（2026-01-19）

### 問題發現

在實際使用中發現，有些提案文件（如 `0114_1_owner_admin_ids_proposal.md`）會引用歷史文件來驗證提案正確性：

```markdown
## 歷史文件參照

- `1017_1_7_final_correct_solution.md` - 驗證 adminStoreRelations 的正確理解
- `1017_1_6_correct_understanding.md` - 確認業務邏輯
```

這種歷史文件參照能有效避免重複犯錯，確保提案符合既有的架構決策。

### 設計擴充

在任務流程中新增「歷史文件驗證」步驟：

**原流程**：
```
7. 產出修改建議文件
8. 依照檢核規則檢查提案文件
```

**擴充後**：
```
7. 產出修改建議文件
8. 【歷史文件驗證】搜尋 prompts 專案的相關歷史文件
9. 依照檢核規則檢查提案文件
```

### 歷史文件驗證流程

1. **提取關鍵字**：從第一版提案中提取關鍵字
   - Entity 名稱（如 Customer、EstateListing）
   - API 名稱（如 adminStoreRelations）
   - 業務邏輯名詞（如 BuyersAdmin、RealEstatesAdmins）

2. **搜尋歷史文件**：
   ```bash
   # 在整個 4_diary 搜尋
   rg -l "{關鍵字}" /Users/nicholas/Desktop/Projects/prompts/4_diary/

   # 限定在特定 API 目錄搜尋（更精準）
   rg -l "{關鍵字}" /Users/nicholas/Desktop/Projects/prompts/4_diary/{api_name}_api/
   ```

3. **比對與引用**：
   - 若找到相關歷史文件，讀取內容
   - 比對提案是否符合歷史決策
   - 在提案中新增「## 歷史文件參照」區塊

4. **處理矛盾**：
   - 若發現與歷史決策矛盾，調整提案或標註需討論

### 提案文件新增區塊格式

```markdown
## 歷史文件參照

搜尋關鍵字：`adminStoreRelations`, `Customer`, `BuyersAdmin`

### 相關歷史文件

1. **1017_1_7_final_correct_solution.md**
   - 路徑：`estateListing_api/debug/1017_1_7_final_correct_solution.md`
   - 相關內容：adminStoreRelations 用途說明
   - 與本提案關係：✅ 一致 / ⚠️ 需調整

2. **1017_1_6_correct_understanding.md**
   - 路徑：`estateListing_api/debug/1017_1_6_correct_understanding.md`
   - 相關內容：業務邏輯定義
   - 與本提案關係：✅ 一致
```

### 設計經驗

| 經驗項目 | 說明 |
|----------|------|
| 為什麼需要？ | 避免重複犯錯，確保提案符合既有架構決策 |
| 何時觸發？ | 第一版提案完成後、正式檢核前 |
| 搜尋範圍？ | prompts/4_diary/ 目錄，可限定特定 API 目錄 |
| 找不到怎麼辦？ | 正常，表示是新議題，跳過此步驟 |
| 找到矛盾怎麼辦？ | 調整提案或標註需討論，讓用戶決定 |

### 實作狀態

- ✅ 已更新設計文件（本文件）
- ✅ 已更新 skill 定義（`/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/debugP.md`）
  - 新增步驟 8：歷史文件驗證
  - 原步驟 8 改為步驟 9

---

## 功能擴充：DB 連線規則明確化（2026-01-19）

### 問題發現

在實際使用中發現，AI 在執行 `/debugP` 時會混淆 DB 連線方式：

| 情況 | 期望行為 | 實際行為 |
|------|----------|----------|
| `/debugP staging` | 用 `db-tunnel.sh staging` + psql | AI 直接用 MCP `db_repl` |
| `/debugP dev` | 用 `db-tunnel.sh dev` + psql | AI 直接用 MCP `db_repl` |

**問題根源**：

1. **步驟 5 描述模糊**：只寫「連線指定環境的 db 查詢相關資料」，沒有明確指定用什麼方式
2. **MCP 工具太方便**：AI 看到有 DB 工具就直接用，沒意識到 MCP 的 `production` 環境不是 `/debugP` 的 `$1` 參數（dev/staging）
3. **curl-token.md 定位問題**：雖然有 DB 連線說明，但放在「取 Token 打 API」的脈絡中，AI 在「查 DB」步驟不會自然想到去看

### 設計討論（2026-01-19）

討論了幾個解決方向：

| 方向 | 說明 | 優點 | 缺點 |
|------|------|------|------|
| A | 在 `/debugP` skill 中明確指定連線方式 | 直接在執行流程中卡住 | 只解決 `/debugP`，其他場景可能還是會混 |
| B | 創建 DB 連線模組，統一引用 | 統一管理，多個 skill 可共用 | 需要創建新檔案 |
| C | 在 CLAUDE.md 加強 MCP 警告 | 不需要改 skill | AI 可能還是會忽略（CLAUDE.md 太長）|
| D | Hook 攔截 MCP 使用 | 自動攔截 | 實作複雜 |

**結論：採用 A + B 組合方案**

### 實作提案

#### 方案 B：創建 DB 連線規則模組

**檔案位置**：`/Users/nicholas/Desktop/Projects/.claude/modules/db-connection-rules.md`

```markdown
## DB 連線規則（開發/Debug 用途）

### ⛔ 絕對禁止

- **禁止使用 MCP `db_repl` 進行開發/debug**
- MCP 的 `production` 環境是正式機器，與開發流程的 dev/staging **完全無關**
- 違反此規則可能導致誤操作正式環境資料

### ✅ 正確的 DB 連線方式

#### 切換 PostgreSQL 環境

```bash
./scripts/db-tunnel.sh local    # 切回本地 DB
./scripts/db-tunnel.sh staging  # 切換到 Staging DB
./scripts/db-tunnel.sh dev      # 切換到 Dev DB
```

#### 連線 PostgreSQL REPL

| 環境 | 連線指令 | 前置步驟 |
|------|---------|----------|
| **Local** | `PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5432 -U postgres -d eagle` | `yarn local:up` |
| **Staging** | `PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5433 -U <DB_USER> -d eagle` | `./scripts/db-tunnel.sh staging` |
| **Dev** | `PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev` | `./scripts/db-tunnel.sh dev` |

### 環境對應表

| `/debugP` 參數 | DB 環境 | 連線方式 | MCP 可用？ |
|---------------|---------|----------|------------|
| `staging` | Staging | db-tunnel.sh + psql | ❌ 禁止 |
| `dev` | Dev | db-tunnel.sh + psql | ❌ 禁止 |
| `local` | Local | Docker psql | ❌ 禁止 |

> ⚠️ **AI 注意**：MCP `db_repl` 的 `production` 環境是正式機器，**絕對不等於** `/debugP` 參數中的任何環境。
```

#### 方案 A：修改 `/debugP` skill 步驟 5

**檔案位置**：`/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/debugP.md`

**修改內容**：

原本步驟 5：
```markdown
5. 連線指定環境的 db 查詢相關資料
```

修改為：
```markdown
5. **連線指定環境的 db 查詢相關資料**（遵循 DB 連線規則）
   - 執行 `./scripts/db-tunnel.sh $1` 切換到目標環境
   - 使用 psql 連線查詢（參考 db-connection-rules.md）
   - ⛔ **禁止使用 MCP `db_repl`**（那是 production 正式環境，不是 $1）
```

同時在 skill 開頭新增模組引用：
```markdown
@/Users/nicholas/Desktop/Projects/.claude/modules/db-connection-rules.md
```

### 完整修改後的 debugP.md

```markdown
---
description: Debug ticket（連 db + 分析專案）
argument-hint: <env> <ticket-path>
---

@/Users/nicholas/Desktop/Projects/.claude/modules/debug-output-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/curl-token.md
@/Users/nicholas/Desktop/Projects/.claude/modules/db-connection-rules.md

## 參數

- 目標環境：$1
- Bug spec：$2

## 分析範圍

- 前端專案：dashboard-nuxt
- 後端專案：backend-nestjs

## 任務

1. 讀取 bug spec，理解問題
2. **【條件】如果標題或內容包含 "500"：**
   - 讀取 @/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/dev_server_debug_prompt.md
   - 先 SSH 連進指定環境，查 PM2 錯誤日誌，找出 500 的根本原因
   - 將 PM2 日誌分析結果納入後續修改建議
3. 查看前端送了什麼請求
4. 查看後端 API、程式碼邏輯、entity 定義
5. **連線指定環境的 db 查詢相關資料**（遵循 DB 連線規則）
   - 執行 `./scripts/db-tunnel.sh $1` 切換到目標環境
   - 使用 psql 連線查詢（參考 db-connection-rules.md）
   - ⛔ **禁止使用 MCP `db_repl`**（那是 production 正式環境，不是 $1）
6. 用 curl 打 API 驗證
7. 搭配前後端程式碼與 db 資料，產出修改建議文件（遵循輸出規則）
8. **【歷史文件驗證】**從提案中提取關鍵字，搜尋 prompts 專案的相關歷史文件：
   - 執行 `rg -l "{關鍵字}" /Users/nicholas/Desktop/Projects/prompts/4_diary/`
   - 關鍵字來源：Entity 名稱、API 名稱、業務邏輯名詞
   - 若找到相關歷史文件：讀取內容、比對提案是否符合歷史決策
   - 在提案中新增「## 歷史文件參照」區塊（若有找到相關文件）
   - 若發現與歷史決策矛盾：調整提案或標註需討論
9. 依照檢核規則檢查提案文件
```

### 預期效果

| 情況 | 修改前 | 修改後 |
|------|--------|--------|
| AI 執行步驟 5 | 看到「查 DB」就用 MCP | 看到明確指令和禁止事項 |
| AI 考慮用 MCP | 沒有任何提醒 | 載入的模組明確禁止 |
| 其他 skill 需要查 DB | 需要各自處理 | 引用同一個模組即可 |

### 實作狀態

- ✅ 創建 `db-connection-rules.md` 模組（2026-01-19）
- ✅ 更新 `debug.md` skill（新增模組引用 + 修改步驟 5）（2026-01-19）
- ✅ 更新 `CLAUDE.md` MCP 警告區塊（加入簡短提醒）（2026-01-19）
- [ ] 測試驗證

---

## 待解決問題：500 + PM2 條件流程執行不順（2026-01-25）

### 問題描述

使用 `/debugP` skill 時，500 + PM2 的條件流程沒有運作順暢。

### 設計確認

- ✅ 條件流程設計是正確的
- ✅ 500 + PM2 是 **optional** 的
- ✅ 只有當 bug spec 或 bug spec 的留言有提到 500 時，才需要走 PM2 流程
- ✅ 平常的 debug 流程不需要走 PM2

### 可能的問題方向

| 編號 | 可能問題 | 說明 |
|------|----------|------|
| A | 條件判斷失敗 | AI 沒有正確判斷「標題或內容包含 500」 |
| B | 執行順序錯誤 | AI 判斷到了，但沒有優先執行 PM2，而是先做步驟 4、5、6 |
| C | 結果未整合 | AI 執行了 PM2 查詢，但結果沒有用來指引後續分析 |
| D | 指令未執行 | AI 讀了 dev_server_debug_prompt.md，但沒實際跑 SSH 指令 |

### 待補充

**請遇到此問題的 AI 補充以下資訊：**

1. 具體是哪種情況（A/B/C/D 或其他）？
2. 當時的 bug spec 內容摘要？
3. AI 實際執行的順序是什麼？
4. 期望的正確流程是什麼？

```
遇到問題的 AI 請在此補充：
---
日期：2026-01-25
情況編號：B + C（執行順序錯誤 + 結果未整合）
具體描述：

### 實際發生的狀況

1. 用戶說「用 /debugP dev 去查 duplicate key 問題」（有提到 500）
2. 我沒有先查 PM2 日誌，而是**先去查 DB** 的 constraint 和 sequence
3. 用戶中斷：「你應該是先看 pm2」
4. 我去查 PM2，但**搜尋方式錯誤**：用 `grep "A0011886"` 試圖找特定編號
5. 用戶再次中斷：「不用這編號，直接看最近的 dev pm2 500 的原因」
6. 最後才正確查到 PM2 日誌和程式碼

### 錯誤的執行順序

```
❌ 我的順序：DB constraint → DB sequence → PM2 grep 特定編號 → PM2 grep 失敗 → 用戶指正 → PM2 最近錯誤
✅ 正確順序：PM2 最近錯誤 → stack trace 找程式碼位置 → 讀程式碼 → DB 驗證
```

### 根本原因

1. **沒有遵循 skill 的條件流程**：步驟 2 說「如果包含 500，先 SSH 查 PM2 錯誤日誌」，但我跳過了
2. **過度聚焦在用戶給的線索**：用戶提到 A0011886 和 duplicate key，我就先去查 DB，而不是「先看 PM2 找根本原因」
3. **搜尋策略錯誤**：試圖 grep 特定編號，而不是直接看最近的錯誤日誌

### 建議改進

1. **強化條件判斷提示**：把「先查 PM2」改成更強烈的語氣
2. **明確搜尋策略**：先看最近 N 行錯誤，不要一開始就 grep 特定關鍵字
3. **流程口訣**：500 問題 → PM2 日誌 → stack trace → 程式碼 → DB 驗證

---
```

### 解決方案：A + B + C 組合（2026-01-25 確認）

經過討論，採用三個方向的組合方案：

#### 方向 A：強化條件流程的優先級

把步驟 2 的條件判斷改成更強制的語氣，明確標示「必須優先於其他步驟」：

```markdown
2. **【強制條件 - 500 優先處理】** 如果標題或內容包含 "500"：
   - ⚠️ **此步驟必須在步驟 3-6 之前完成，不可跳過**
   - 讀取 @dev_server_debug_prompt.md
   - SSH 連進指定環境，查 PM2 錯誤日誌
   - 找出 500 的根本原因（stack trace）
   - 將 PM2 日誌分析結果作為後續步驟的指引
```

#### 方向 B：新增「PM2 搜尋策略」

在步驟 2 中明確寫出搜尋方法，避免 AI 用錯誤的搜尋策略：

```markdown
**PM2 錯誤日誌查詢流程**：
1. **先看最近錯誤**：`pm2 logs 0 --lines 50 --err`（不要先 grep 特定關鍵字）
2. **找 stack trace**：找到 Error 和 at xxx.ts:行數
3. **定位程式碼**：根據 stack trace 讀對應的程式碼
4. **再驗證 DB**：用程式碼邏輯去驗證 DB 狀態
```

#### 方向 C：加入「500 Debug 流程口訣」

用口訣強化記憶，避免被其他線索帶偏：

```markdown
## 500 Debug 流程口訣

PM2 日誌 → Stack Trace → 程式碼 → DB 驗證

❌ 錯誤順序：DB → grep 特定關鍵字 → ...
✅ 正確順序：PM2 最近錯誤 → 找 stack trace → 讀程式碼 → DB 驗證
```

### 修改後的 debugP.md 步驟 2（完整版）

```markdown
2. **【強制條件 - 500 優先處理】** 如果標題或內容包含 "500"：
   - ⚠️ **此步驟必須在步驟 3-6 之前完成，不可跳過**
   - 讀取 @/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/dev_server_debug_prompt.md
   - SSH 連進指定環境，執行 PM2 錯誤日誌查詢：
     1. **先看最近錯誤**：`pm2 logs 0 --lines 50 --err`（不要先 grep 特定關鍵字）
     2. **找 stack trace**：找到 Error 和 at xxx.ts:行數
     3. **定位程式碼**：根據 stack trace 讀對應的程式碼
     4. **再驗證 DB**：用程式碼邏輯去驗證 DB 狀態
   - 將 PM2 日誌分析結果作為後續步驟的指引

   > 💡 **500 Debug 流程口訣**：PM2 日誌 → Stack Trace → 程式碼 → DB 驗證
```

### 實作狀態

- ✅ 設計確認（2026-01-25）
- ✅ 更新 skill 定義檔（`backend-nestjs/.claude/commands/debugP.md`）（2026-01-25）
- ✅ 定義檔新增流程圖（2026-01-25）
- [ ] 測試驗證

---

## 功能擴充：定義檔加入流程圖（2026-01-25）

### 問題發現

檢查 `/debugP` 定義檔是否符合設計規則時，發現：
- 設計稿有流程圖（樹狀格式）
- 定義檔只有數字列表
- 兩者格式不一致

### 討論結論

採用 A+B 組合方案：
- **A（數字列表）**：詳細的執行步驟，AI 容易解析
- **B（樹狀流程圖）**：整體架構一目了然，條件分支清楚

兩者互相補充，讓 AI：
1. **先看流程圖**：快速理解整體架構、條件分支、優先級
2. **再看任務列表**：知道每一步的具體細節

### 定義檔新增內容

在「## 任務」之前，新增「## 執行流程」區塊：

```
/debugP 執行流程
│
├─ 1. 【讀取 Bug Spec】
│   └─ 理解問題內容
│
├─ 2. 【條件判斷】
│   ├─ 路徑含 frontPage_api/debug/ → 載入 frontPage 歷史開發紀錄
│   └─ 標題/內容含 "500" → ⚠️ 強制優先執行 PM2 流程
│       └─ PM2 日誌 → Stack Trace → 程式碼 → DB 驗證
│
├─ 3. 【分析階段】
│   ├─ 查看前端請求
│   ├─ 查看後端 API、程式碼、entity
│   ├─ 連線 DB 查詢（db-tunnel.sh）
│   └─ curl 打 API 驗證
│
├─ 4. 【產出提案】
│   └─ 搭配前後端程式碼與 DB 資料，產出修改建議文件
│
└─ 5. 【檢核階段】
    ├─ 歷史文件驗證（搜尋相關歷史決策）
    └─ 依照檢核規則檢查提案文件
```

### 設計經驗

| 經驗項目 | 說明 |
|----------|------|
| 流程圖用途 | 讓 AI 一眼看到整體架構和條件分支 |
| 數字列表用途 | 詳細的執行步驟，AI 容易解析 |
| 組合效果 | 兩者互補，比單獨使用更易理解 |

---

## 功能擴充：Debug 驗證流程強化（2026-01-26）

### 問題發現

在實際 debug 過程中發現以下問題：

| 編號 | 問題 | 實際發生狀況 |
|------|------|-------------|
| A | DB 連線確認不完整 | 執行 `db-tunnel.sh dev` 但沒確認 `.env` 是否切換，導致連到 local DB |
| B | Server 啟動流程混亂 | 沒有 kill 舊進程，多個 nest 進程同時跑，port 被佔用 |
| C | API endpoint 路徑錯誤 | 用了 `/api/dashboard/` 但正確的是 `/api/v1/` |

### 設計調整

#### A. DB 連線：新增「確認切換成功」步驟

**原設計**（步驟 6）：
```markdown
- 執行 `./scripts/db-tunnel.sh $1` 切換到目標環境
- 使用 psql 連線查詢
```

**調整後**：
```markdown
- 執行 `./scripts/db-tunnel.sh $1` 切換到目標環境
- ⚠️ **必須確認切換成功**：執行 `./scripts/db-tunnel.sh status`
  - 確認「目前 PostgreSQL DB 設定」顯示正確環境（不是「本地 DB」）
  - Tunnel 運行中 ≠ .env 已切換，這是兩件不同的事
- 使用 psql 連線查詢
```

#### B. Local Server 啟動：新增標準 SOP

**放置位置**：`curl-token.md` 模組（統一給 `/debugP` 和 `/check-result` 使用）

**設計決策**：
- `/debugP` 需要完整 SOP（先 kill 舊進程，避免多個進程衝突）
- `/check-result` 現有流程較簡單（檢查後啟動）
- **統一採用完整 SOP**，放到 `curl-token.md` 模組，兩個 skill 都引用

**SOP 內容**：

```markdown
### Local Server 啟動 SOP

1. **清理舊進程**：
   ```bash
   pkill -f "nest start"
   lsof -ti :3001 | xargs kill -9 2>/dev/null
   ```

2. **確認 port 可用**：
   ```bash
   lsof -i :3001  # 應該沒有輸出
   ```

3. **啟動並等待**：
   ```bash
   yarn start:dev > /tmp/nestjs-test.log 2>&1 &
   # 等待出現 "Nest application successfully started"
   ```

4. **確認啟動成功**：
   ```bash
   grep "Nest application successfully started" /tmp/nestjs-test.log
   ```
```

#### C. API 路徑格式：新增參考（更新 curl-token.md 模組）

**新增內容**：

```markdown
### API 路徑格式

| 專案 | Base Path | 範例 |
|------|-----------|------|
| Dashboard API | `/api/v1/` | `/api/v1/estate-listings` |
| Frontend API | `/frontend/v1/` | `/frontend/v1/house-prices` |

⚠️ 常見錯誤：不是 `/api/dashboard/`
```

### 實作狀態

- ✅ 設計確認（2026-01-26）
- ✅ 更新 db-connection-rules.md 模組（A 項）（2026-01-26）
- ✅ 更新 curl-token.md 模組（B、C 項）（2026-01-26）
- ✅ 更新 debug.md 定義檔（新增 api-response-index.md 引用）（2026-01-26）
- [ ] 測試驗證

---

## 功能擴充：API Response 結構索引（2026-01-26）

### 問題發現

在 debug 過程中用 curl + jq 驗證 API 時，AI 會用錯 jq 路徑：
- 用了 `.data.total` 但實際是 `.data.meta.total`
- 原因：adminApi 的 response 結構不統一

### 調查結果

adminApi 至少有 3-4 種不同的 response 格式：

| API | 回傳結構 | jq 路徑 |
|-----|----------|---------|
| estateListing, rolePermission | `{ items, meta }` | `.data.meta.total` |
| contract, approvement | `{ items, total }` | `.data.total` |
| transcript, estateTransaction | `{ data, total }` | `.data.total`（注意是 data 不是 items）|
| edm | `{ realEstates, total }` | `.data.total` |

**結論**：無法統一格式，需要建立索引表讓 AI 查詢。

### 設計方案

#### 使用流程

```
AI 執行 /debugP 或 /check-result
│
├─ 要用 curl + jq 驗證時
│   └─ 先查 api-response-index.md 找該 endpoint 的結構
│
└─ 用正確的 jq 路徑
```

#### 索引文件位置

依照 skill 模組設計規則，放在共用模組目錄：

```
/Users/nicholas/Desktop/Projects/.claude/modules/api-response-index.md
```

#### 維護機制：After Hook

```
Git Commit（dto 檔案有變動）
│
└─ After Hook 偵測到以下 pattern 被 commit：
    ├─ **/dto/*.ts
    ├─ **/*.response.ts
    └─ **/*.response.dto.ts
    │
    └─ 觸發 AI 分析該 dto 的 response 結構
        │
        └─ 更新 api-response-index.md
```

**Hook 設定位置**：

```
backend-nestjs/.claude/settings.json
```

⚠️ **重要**：Hook 必須放在 `backend-nestjs/.claude/settings.json`，這樣 `/know-cc-config` 讀取時才會知道有這個 hook。

**設計優點**：
- 不需要複雜的自動化腳本
- DTO 定義了 response 結構，DTO 改動時才需要更新索引
- 用 git commit hook 自然地觸發更新
- Hook 放在 backend-nestjs 專案，與 `/know-cc-config` 整合

#### 索引表格式

```markdown
## adminApi Response 結構索引

### 結構類型 A：{ items, meta }
| Endpoint | jq 總數 | jq 第一筆 |
|----------|---------|-----------|
| /api/v1/estate-listings | `.data.meta.total` | `.data.items[0]` |
| /api/v1/role-permissions | `.data.meta.total` | `.data.items[0]` |

### 結構類型 B：{ items, total }
| Endpoint | jq 總數 | jq 第一筆 |
|----------|---------|-----------|
| /api/v1/admins | `.data.total` | `.data.items[0]` |
| /api/v1/contracts | `.data.total` | `.data.items[0]` |

### 結構類型 C：{ data, total }
| Endpoint | jq 總數 | jq 第一筆 |
|----------|---------|-----------|
| /api/v1/transcripts | `.data.total` | `.data.data[0]` |
| /api/v1/estate-transactions | `.data.total` | `.data.data[0]` |
```

### Skill 引用方式

#### 現況分析

| Skill | 目前引用方式 | curl + jq 步驟 |
|-------|-------------|---------------|
| `/debugP` | `@curl-token.md` 模組 | 步驟 7：用 curl 打 API 驗證 |
| `/check-result` | `@curl_get_dashboard_token.md` 原始文件 | Step 4：使用 test-dashboard-api.sh |

**問題**：`/check-result` 沒有用模組，直接引用原始文件，導致無法統一擴充功能。

#### 設計決策：透過 curl-token.md 模組統一引用

```
curl-token.md 模組
│
├─ @curl_get_dashboard_token.md（Token 取得方式）
│
└─ @api-response-index.md（Response 結構索引）
```

**效果**：
- `/debugP` 引用 `curl-token.md` → 自動獲得 response 索引 ✅
- `/check-result` 改為引用 `curl-token.md` → 也自動獲得 ✅

**優點**：
- 不需要兩個 skill 各自引用 `api-response-index.md`
- 統一管理 curl 相關的工具（token + response 結構）
- 未來擴充只需更新 `curl-token.md` 模組

#### 需要的修改

1. **更新 `curl-token.md` 模組**：加入 `@api-response-index.md` 引用
2. **更新 `/check-result` skill**：改為引用 `@curl-token.md` 模組（取代直接引用原始文件）

### 實作狀態

- ✅ 設計討論（2026-01-26）
- ✅ 初始化：分析 adminApi response 結構，建立第一版索引表（2026-01-26）
- ✅ 建立 api-response-index.md 模組（2026-01-26）
- ✅ 更新 curl-token.md 模組（加入 API Response 結構參考區塊）（2026-01-26）
- ✅ 更新 /debugP skill 定義檔（新增 api-response-index.md 引用）（2026-01-26）
- ✅ 測試驗證：驗證 jq 路徑與 53 個 controller 的實際 DTO 一致（2026-01-26）
- ✅ 更新 /check-result skill（改用 curl-token.md + db-connection-rules.md + api-response-index.md 模組）（2026-01-26）
- [x] 建立 After Hook（偵測 dto commit）（2026-01-26）

### 功能改進：PreToolUse jq 偵測（2026-01-26）

#### 問題發現

**觸發情境**：AI 在 debug frontPage 時，用 curl + jq 驗證 API，持續用錯 jq 路徑（如 `.data.total` 而非 `.data.meta.total`），即使 `api-response-index.md` 模組已存在且 skill 有引用。

**根本原因分析**：

```
現有 Hook 設計
│
├─ dto-commit-detector.sh（PostToolUse Bash）
│   └─ 功能：commit 後偵測 DTO 變動 → 提醒更新索引
│   └─ 問題：這是「維護索引」，不是「使用時讀取索引」
│
└─ 缺少的機制 ↓
    │
    └─ AI 使用 jq 時，沒有強制讀取 api-response-index.md
```

**問題情境分析**：

| 情境 | 結果 |
|------|------|
| 正常執行 /check-result | skill 載入 → 模組被讀入 context → AI 看得到 jq 索引 ✅ |
| Conversation compaction 後 | context 被壓縮 → 模組內容被移除 → AI 沒有索引 ❌ |
| AI 自行驗證（沒有執行 skill） | 直接手動打 curl + jq → 完全沒有讀取索引 ❌ |

#### 改進方案

將現有的 `dto-commit-detector.sh` 擴充並重新命名為 `api-response-index-handler.sh`，同時處理「維護」和「使用」兩個時機：

```
改進後 Hook 架構
│
├─ api-response-index-handler.sh（合併版）
│   │
│   ├─ PreToolUse Bash 呼叫
│   │   └─ 偵測 jq 使用 → 提醒讀取 api-response-index.md
│   │
│   └─ PostToolUse Bash 呼叫
│       └─ 偵測 commit 包含 DTO → 提醒更新 api-response-index.md
│
└─ settings.json 註冊
    ├─ PreToolUse: Bash → api-response-index-handler.sh
    └─ PostToolUse: Bash → api-response-index-handler.sh
```

**設計決策**：
- 合併成一個 hook 檔案，減少維護成本
- 同一份 hook 在兩個時機被呼叫，內部判斷觸發來源
- 都是針對同一份 `api-response-index.md` 索引

**Hook 內部邏輯**：
```bash
# 判斷是 PreToolUse 還是 PostToolUse
# PreToolUse: 偵測 jq → 提醒讀取
# PostToolUse: 偵測 commit → 提醒更新
```

#### 實作狀態

- [x] 問題分析（2026-01-26）
- [x] 設計決議：合併成單一 hook 檔案（2026-01-26）
- [x] 建立 api-response-index-handler.sh（合併版 hook）（2026-01-26）
- [x] 更新 settings.json（PreToolUse + PostToolUse Bash 都指向新 hook）（2026-01-26）
- [x] 刪除舊的 dto-commit-detector.sh（2026-01-26）
- [ ] 測試驗證

---

## 功能擴充：Proposal 檔案偵測機制（2026-01-26）

### 問題描述

**現況**：AI 執行 `/debugP` 產出 proposal 時，有時會建立新的 proposal 檔案，而非更新已存在的 proposal。

**原因**：`debug.md` 和 `debug-output-rules.md` 沒有指示 AI 先檢查是否已有 proposal 存在。

### Proposal 命名規則

| 元素 | Bug Spec | Proposal |
|------|----------|----------|
| **完整前綴** | `0112_1_` | `0112_1_` ← **完全相同** |
| 描述 | `bug_spec` | `[任意描述]` |
| **後綴** | 無特定 | **`_proposal`** |

#### 範例

```
0112_1_bug_spec.md    → 0112_1_admin_status_proposal.md ✅
0112_2_bug_spec.md    → 0112_2_xxx_proposal.md ✅
0112_1_bug_spec.md    → 0112_2_xxx_proposal.md ❌ (前綴不符)
```

### 識別邏輯

> 📌 proposal 檔案不一定用 `_proposal` 結尾，也可能是 `_fix`、`_analysis` 等

```
從 bug spec 提取完整前綴
│
├─ bug_spec: 0112_1_bug_spec.md
├─ prefix: 0112_1_
│
└─ 依優先順序搜尋：
    │
    ├─ 順序 1：{prefix}*_proposal.md（優先找 _proposal）
    │
    └─ 順序 2：{prefix}*.md（排除 _bug_spec.md）
        │
        ├─ 找到 → 讀取現有檔案，進入「更新」模式
        └─ 沒找到 → 進入「新建」模式
```

### 設計決策

#### 1. 檢查邏輯放在 `debug-output-rules.md`

原因：
- 這是「輸出規則」的一部分
- 其他 skill 如果也需要產出 proposal，可以共用同一套規則
- 保持 `debug.md` 專注在流程，不處理檔案細節

#### 2. 兩階段搜尋優先順序

**問題**：proposal 檔案後綴不固定，可能是 `_proposal`、`_fix`、`_analysis` 等。

**決策**：採用兩階段搜尋

| 順序 | 搜尋 pattern | 說明 |
|------|-------------|------|
| 1 | `{前綴}*_proposal.md` | 優先找標準命名 |
| 2 | `{前綴}*.md`（排除 `_bug_spec.md`） | 相容非標準命名 |

**原因**：
- 優先找 `_proposal` 確保標準命名優先
- 若無 `_proposal`，仍能找到 `_fix`、`_analysis` 等變體
- 排除 `_bug_spec.md` 避免誤判輸入檔案為 proposal

### 需要的修改

| 項目 | 內容 |
|------|------|
| `debug-output-rules.md` | 新增「Proposal 檔案偵測」區塊，包含兩階段搜尋邏輯 |

### 實作狀態

- [x] 設計討論（2026-01-26）
- [x] 更新 `debug-output-rules.md` 模組（2026-01-26）

---

## 問題發現：非 Skill 調用時規則被忽略（2026-01-27）

### 問題描述

**觸發情境**：用戶說「請幫我看一下 dev db 有 12345678 這帳號了嗎」

**問題**：AI 直接使用 MCP `db_repl` 連線，而非 `db-tunnel.sh` + psql。

**弔詭之處**：設計稿和定義檔都有明確禁止 MCP 的規則：
- `debug.md` 第 73 行：⛔ **禁止使用 MCP `db_repl`**
- `db-connection-rules.md` 第 5 行：**禁止使用 MCP `db_repl` 進行開發/debug**

### 根本原因分析

```
規則被忽略的原因
│
├─ 1. 【Skill 未被調用】
│   ├─ 用戶說「幫我看 dev db」不是標準 skill 調用格式
│   ├─ 沒有傳入 bug spec 路徑參數
│   └─ AI 沒有意識到應該用 /debugP dev 流程
│
├─ 2. 【模組未被載入】
│   ├─ 調用 skill → 會載入 db-connection-rules.md 模組 ✅
│   └─ 手動執行 → 不會載入模組，依賴 context 記憶 ❌
│
└─ 3. 【Conversation Compaction 影響】
    ├─ context 被壓縮 → 模組內容被移除
    └─ AI 失去規則記憶，回到「預設行為」
```

### 相關經驗：已在設計稿記錄的類似問題

| 日期 | 問題 | 解決方案 | 是否覆蓋本次問題 |
|------|------|----------|------------------|
| 2026-01-19 | AI 用 MCP 查 dev/staging DB | 建立 db-connection-rules.md 模組 | ❌ 只在 skill 調用時載入 |
| 2026-01-26 | jq 路徑錯誤 | PreToolUse Hook 偵測 jq 使用 | ⚠️ 類似思路可參考 |

### 結論

**現有設計的盲點**：只處理了「skill 被正確調用」的情況，沒有處理「非 skill 調用」的情況。

---

## 改進提案：MCP 使用攔截機制（2026-01-27）

### 提案目標

無論是否透過 skill 調用，只要對話上下文涉及 dev/staging 環境，都應該阻止 MCP 使用。

### 執行流程圖

```
MCP 使用攔截機制
│
├─ 1. 【PreToolUse Hook 偵測】
│   └─ 偵測 AI 是否要調用 MCP db_repl
│
├─ 2. 【上下文關鍵字檢查】
│   ├─ 檢查對話是否包含：dev、staging、開發、測試
│   │
│   ├─ 【有關鍵字】→ 進入阻止流程
│   │   ├─ 輸出警告訊息
│   │   └─ 提示正確做法：db-tunnel.sh + psql
│   │
│   └─ 【無關鍵字】→ 放行（可能是合法的 production 查詢）
│
└─ 3. 【輸出格式】
    └─ ⛔ 偵測到 MCP 使用，但對話涉及 dev/staging
        └─ 請使用 ./scripts/db-tunnel.sh [env] + psql
```

### 技術實作

#### Hook 設定位置

```
backend-nestjs/.claude/settings.json
```

#### Hook 註冊

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__secure-proxy__db_repl",
        "script": ".claude/hooks/mcp-env-guard.sh"
      }
    ]
  }
}
```

#### Hook 腳本邏輯

**檔案位置**：`.claude/hooks/mcp-env-guard.sh`

```bash
#!/bin/bash

# 檢查對話上下文是否包含 dev/staging 關鍵字
# 如果有，阻止 MCP 使用並提示正確做法

# 關鍵字清單
KEYWORDS=("dev" "staging" "開發" "測試" "debug")

# 檢查邏輯（從環境變數或 stdin 讀取上下文）
# ...

# 輸出格式
echo "⛔ 偵測到 MCP db_repl 使用"
echo ""
echo "對話涉及 dev/staging 環境，請使用正確的連線方式："
echo ""
echo "  ./scripts/db-tunnel.sh dev    # 切換到 Dev DB"
echo "  ./scripts/db-tunnel.sh staging # 切換到 Staging DB"
echo ""
echo "然後用 psql 連線查詢（參考 db-connection-rules.md）"

exit 1  # 阻止工具執行
```

### 設計決策

| 問題 | 決策 | 原因 |
|------|------|------|
| 是否完全禁止 MCP？ | 否，只在有 dev/staging 關鍵字時阻止 | 保留合法的 production 查詢能力 |
| Hook 放在哪裡？ | backend-nestjs/.claude/settings.json | 與其他 Hook 統一管理 |
| 如何偵測上下文？ | 從 Claude Code Hook 環境變數讀取 | 標準 Hook 機制 |

### 預期效果

| 情境 | 現況 | 改進後 |
|------|------|--------|
| 用戶說「幫我看 dev db」，AI 用 MCP | MCP 執行成功（錯誤） | Hook 阻止 + 提示正確做法 |
| 用戶正式執行 `/debugP dev` | db-tunnel.sh + psql（正確） | 不變 |
| 用戶需要查 production DB | MCP 執行成功（正確） | 不變（無 dev/staging 關鍵字） |

### 待討論事項

1. **關鍵字清單是否足夠**：目前是 dev、staging、開發、測試、debug
2. ~~**誤攔截風險**~~：用戶確認如果要查 production 會明確說 production，誤攔截風險極低（2026-01-27）
3. ~~**Hook 技術可行性**~~：已確認可行，透過 `transcript_path` 讀取對話上下文（2026-01-27）

### 技術研究結果（2026-01-27）

#### Hook 輸入格式

PreToolUse Hook 從 stdin 接收 JSON：

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../xxx.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "PreToolUse",
  "tool_name": "mcp__secure-proxy__db_repl",
  "tool_input": { "environment": "production", "sql": "..." }
}
```

#### 關鍵欄位

| 欄位 | 說明 |
|------|------|
| `transcript_path` | 完整對話記錄的 JSONL 文件路徑 |
| `tool_name` | 被調用的工具名稱（用於 matcher） |
| `tool_input` | 工具參數（可看到 MCP 的 environment 參數） |

#### 技術實作流程圖

```
MCP 使用攔截機制（技術實作）
│
├─ 1. 【Hook 觸發】
│   ├─ Matcher: mcp__secure-proxy__db_repl
│   └─ 從 stdin 讀取 JSON 輸入
│
├─ 2. 【讀取對話上下文】
│   ├─ 從 JSON 取得 transcript_path
│   ├─ 讀取 JSONL 格式的對話記錄
│   └─ 解析最近 N 則訊息內容
│
├─ 3. 【關鍵字檢查】
│   ├─ 搜尋：dev、staging、開發、測試、debug
│   │
│   ├─ 【找到關鍵字】
│   │   ├─ 輸出警告訊息到 stderr
│   │   └─ exit 2（阻止工具執行）
│   │
│   └─ 【沒找到】
│       └─ exit 0（放行，執行 MCP）
│
└─ 4. 【輸出格式】
    └─ JSON: {"decision": "block", "reason": "..."}
```

#### Hook 腳本實作（Python）

**檔案位置**：`.claude/hooks/mcp-env-guard.py`

```python
#!/usr/bin/env python3
import json
import sys

def main():
    # 1. 讀取 stdin JSON
    input_data = json.load(sys.stdin)
    transcript_path = input_data.get('transcript_path')

    if not transcript_path:
        # 無法取得對話記錄，放行
        sys.exit(0)

    # 2. 讀取對話記錄（最近 50 行）
    keywords = ['dev', 'staging', '開發', '測試', 'debug']

    try:
        with open(transcript_path, 'r') as f:
            lines = f.readlines()[-50:]  # 只看最近 50 則
            content = ''.join(lines).lower()

            # 3. 檢查關鍵字
            for keyword in keywords:
                if keyword.lower() in content:
                    # 找到關鍵字，阻止執行
                    print(json.dumps({
                        "decision": "block",
                        "reason": f"對話涉及 {keyword} 環境，請使用 db-tunnel.sh + psql"
                    }))

                    # 輸出提示到 stderr（會顯示給用戶）
                    print("⛔ 偵測到 MCP db_repl 使用", file=sys.stderr)
                    print("", file=sys.stderr)
                    print("對話涉及 dev/staging 環境，請使用正確的連線方式：", file=sys.stderr)
                    print("", file=sys.stderr)
                    print("  ./scripts/db-tunnel.sh dev    # 切換到 Dev DB", file=sys.stderr)
                    print("  ./scripts/db-tunnel.sh staging # 切換到 Staging DB", file=sys.stderr)
                    print("", file=sys.stderr)
                    print("然後用 psql 連線查詢", file=sys.stderr)

                    sys.exit(2)  # 阻止工具執行

    except Exception as e:
        # 讀取失敗，放行（避免阻止正常操作）
        pass

    # 4. 沒找到關鍵字，放行
    sys.exit(0)

if __name__ == '__main__':
    main()
```

#### settings.json 設定

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__secure-proxy__db_repl",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/mcp-env-guard.py"
          }
        ]
      }
    ]
  }
}
```

### 實作狀態

- [x] 問題分析（2026-01-27）
- [x] 設計提案（2026-01-27）
- [x] 技術可行性研究（2026-01-27）
- [x] 用戶審核確認（2026-01-27）
- [x] 建立 Hook 腳本（2026-01-27）
- [x] 更新 settings.json（2026-01-27）
- [ ] 測試驗證

---

## 問題發現：無狀態設計導致重複切換 DB（2026-01-28）

### 問題描述

**觸發情境**：執行 `/debugP dev` 時，AI 嘗試執行 `./scripts/db-tunnel.sh dev all` 切換環境，但 dev DB 已經連線中。

**用戶回饋**：
> 「有點奇怪，/debugP dev 不是要你去直接打 dev api 嗎，我們現在又沒改程式，所以可以直接打 dev api 與進 dev 查 pm2 不就好了？」

### 問題分析

```
問題發生的流程
│
├─ 1. 【用戶執行】/debugP dev
│
├─ 2. 【AI 執行步驟 6】
│   └─ 執行 `./scripts/db-tunnel.sh dev` 切換到目標環境
│   └─ ⚠️ 問題：沒有檢查是否已經連線
│
├─ 3. 【AI 嘗試啟動本地 server】
│   └─ ⚠️ 問題：沒有程式碼變更，不需要啟動本地 server
│
└─ 4. 【正確做法】
    └─ 直接打遠端 API + SSH 看 PM2 日誌
```

### 根本原因

| 編號 | 問題 | 說明 |
|------|------|------|
| A | 無狀態設計 | skill 設計是「無狀態」的流程，每次執行都從頭走一遍，沒有「狀態感知」邏輯 |
| B | 場景未區分 | 沒有區分「有本地程式碼變更」vs「無本地程式碼變更」的場景 |
| C | 500 流程指引不足 | 設計稿說要「SSH 進去看 PM2 日誌」，但沒明確說「此時應該直接打遠端 API」 |

### 改進提案

#### 新增「場景判斷」與「連線狀態檢查」

```
/debugP 執行流程（改進版）
│
├─ 1. 【讀取 Bug Spec】
│
├─ 2. 【場景判斷】 ← 新增
│   ├─ 有本地程式碼變更 → 啟動本地 server + 切 DB
│   └─ 無本地程式碼變更 → 直接打遠端 API
│       └─ 500 錯誤 → SSH 看 PM2 日誌 + 連遠端 DB 查資料
│
├─ 3. 【連線狀態檢查】 ← 新增
│   ├─ 已連線目標環境 DB → 跳過切換
│   └─ 未連線或連錯環境 → 執行 db-tunnel.sh
│
└─ ...後續流程
```

#### 關鍵改動

| 項目 | 說明 |
|------|------|
| 場景判斷 | 區分有/無本地程式碼變更，決定打本地或遠端 API |
| 連線狀態檢查 | 避免重複切換 DB，先檢查當前狀態 |
| 500 流程明確化 | 直接打遠端 API + SSH 看日誌，不需啟動本地 server |

### 討論結論（2026-01-28）

#### 1. 場景判斷：根據 Skill 調用上下文（不用 git status）

**關鍵洞察**：`/implement` 完成後會用 `/check-result` 驗證，所以：

| 場景 | 判斷依據 | 正確做法 |
|------|----------|----------|
| 有改程式碼 | 前面有執行 `/implement` | 用 `/check-result`（本地 server + 遠端 DB）|
| 沒改程式碼 | 單獨執行 `/debugP` 查問題 | 直接打遠端 API + SSH 看 PM2 日誌 |

**流程分工**：
```
/implement → /check-result → 本地 server + 遠端 DB 驗證
               ↑
              這裡會切 DB、啟動 server

/debugP → 直接打遠端 API + SSH 看 PM2
         ↑
        不需要切 DB、不需要啟動 server
```

#### 2. 連線狀態檢查：用 `./scripts/db-tunnel.sh status`

**參考文件**：`local_remote_db_switch_proposal.md`

```bash
./scripts/db-tunnel.sh status

# 輸出範例：
# === SSH Tunnel 狀態 ===
# ✅ SSH Tunnel 運行中
#
# === 目前 DB 設定 ===
# 使用 .env.local 覆蓋設定：
# DB_HOST=localhost
# DB_PORT=5433
# DB_DATABASE=eagle
```

**AI 判斷邏輯**：
- 看「目前 DB 設定」是哪個環境
- 如果已經是目標環境 → 跳過切換
- 如果不是目標環境 → 執行 `db-tunnel.sh [env]`

#### 3. AI 智能判斷：不需要詢問用戶

**設計原則**：
- AI 根據上下文自動判斷場景
- 用戶不想介入，整個 debug 過程 AI 應自行做判斷
- 只有遇到無法判斷的情況才詢問

### 改進後的執行流程

```
/debugP 執行流程（改進版）
│
├─ 1. 【讀取 Bug Spec】
│
├─ 2. 【場景判斷】（AI 智能判斷）
│   ├─ 對話上下文有 /implement → 走 /check-result 驗證
│   └─ 單獨 /debugP 查問題 → 走遠端 API 驗證
│       │
│       ├─ 直接打遠端 API：https://api-{env}.<COMPANY_DOMAIN>
│       └─ SSH 看 PM2 日誌（如果是 500 錯誤）
│
├─ 3. 【條件：500 優先處理】（現有流程）
│   └─ PM2 日誌 → Stack Trace → 程式碼 → DB 驗證
│
├─ 4. 【分析階段】
│   ├─ 查看前端請求
│   ├─ 查看後端 API、程式碼、entity
│   ├─ 【條件】需要查 DB 時：
│   │   ├─ 檢查連線狀態：./scripts/db-tunnel.sh status
│   │   ├─ 已連線目標環境 → 跳過切換
│   │   └─ 未連線 → 執行 db-tunnel.sh [env]
│   └─ curl 打 API 驗證
│
└─ 5. 【產出與檢核】
    └─ ...後續流程不變
```

### 實作狀態

- [x] 問題記錄（2026-01-28）
- [x] 設計提案（2026-01-28）
- [x] 用戶審核確認（2026-01-28）
- [x] 更新 skill 定義檔（2026-01-28）
- [ ] 測試驗證

---

## 功能擴充：Task Tool 多步驟追蹤（2026-01-29）

### 問題發現

**觸發情境**：執行 `/debugP` 流程時，特別是複雜的 500 錯誤排查，步驟繁多且容易遺漏。

**問題**：
1. 用戶無法清楚看到 debug 進度
2. AI 可能跳過步驟或執行順序錯誤
3. Conversation compaction 後可能忘記已完成的步驟

### 設計分析

#### `/debugP` 與 `/check-result` 的差異

| 特性 | `/debugP` | `/check-result` |
|------|----------|-----------------|
| 步驟數量 | 5-9 步（視條件） | 4-6 步 |
| 條件分支 | 有（500、frontPage） | 少 |
| 追蹤需求 | 中等 | 高（驗證流程） |
| 現有 Task 使用 | ❌ 無 | ✅ 有 |

#### 何時需要 Task Tool

| 情境 | 使用 Task？ | 原因 |
|------|-------------|------|
| 簡單 debug（無 500、無條件分支） | 可選 | 步驟較少，線性流程 |
| 複雜 debug（有 500 + PM2） | ✅ 建議 | 步驟多、順序重要 |
| 需要用戶追蹤進度 | ✅ 建議 | 提升用戶體驗 |
| Conversation 可能 compact | ✅ 建議 | 避免遺漏步驟 |

### 設計決策

#### 採用「條件式 Task」策略

不是所有 `/debugP` 都需要 Task，只在特定條件下啟用：

```
/debugP 執行流程（Task 整合版）
│
├─ 1. 【讀取 Bug Spec】
│   └─ 判斷是否需要 Task 追蹤
│       ├─ 500 錯誤 / PM2 / frontPage / 複雜問題 → ✅ 啟用
│       └─ 簡單查詢 → ❌ 不啟用
│
├─ 2. 【Task 建立】（條件啟用時）
│   │
│   ├─ 500 錯誤 Task 清單（14 步）
│   │   ├─ Task 1: 讀取 Bug Spec
│   │   ├─ Task 2: SSH 查 PM2 日誌 (blockedBy: 1)
│   │   ├─ Task 3: 分析 Stack Trace (blockedBy: 2)
│   │   ├─ Task 4: 定位程式碼 (blockedBy: 3)
│   │   ├─ Task 5: 分析前端請求 (blockedBy: 4)
│   │   ├─ Task 6: 分析後端 API (blockedBy: 5)
│   │   ├─ Task 7: 連線 DB（db-tunnel.sh status → 切換）(blockedBy: 6)
│   │   ├─ Task 8: 查詢 DB 驗證 (blockedBy: 7)
│   │   ├─ Task 9: 取得 Token (blockedBy: 8)
│   │   ├─ Task 10: curl 打遠端 API 驗證 (blockedBy: 9)
│   │   ├─ Task 11: 判斷問題來源 (blockedBy: 10)
│   │   ├─ Task 12: 產出修改建議 (blockedBy: 11)
│   │   ├─ Task 13: 歷史文件驗證 (blockedBy: 12)
│   │   └─ Task 14: 檢核提案文件 (blockedBy: 13)
│   │
│   └─ 一般 Debug Task 清單（11 步）
│       ├─ Task 1: 讀取 Bug Spec
│       ├─ Task 2: 分析前端請求 (blockedBy: 1)
│       ├─ Task 3: 分析後端 API (blockedBy: 2)
│       ├─ Task 4: 連線 DB（db-tunnel.sh status → 切換）(blockedBy: 3)
│       ├─ Task 5: 查詢 DB 資料 (blockedBy: 4)
│       ├─ Task 6: 取得 Token (blockedBy: 5)
│       ├─ Task 7: curl 打遠端 API 驗證 (blockedBy: 6)
│       ├─ Task 8: 判斷問題來源 (blockedBy: 7)
│       ├─ Task 9: 產出修改建議 (blockedBy: 8)
│       ├─ Task 10: 歷史文件驗證 (blockedBy: 9)
│       └─ Task 11: 檢核提案文件 (blockedBy: 10)
│
├─ 3. 【執行分析】（逐步更新 Task 狀態）
│   └─ 每個步驟：開始 → in_progress → 結束 → completed
│
└─ 4. 【完成報告】
    └─ 確認所有 Task completed
```

### 實作方式

#### 1. Task 建立時機

**在讀取 Bug Spec 後，判斷是否需要建立 Task**：

```typescript
// AI 判斷邏輯（概念）
function shouldCreateTasks(bugSpec: string): boolean {
  const conditions = [
    bugSpec.includes('500'),           // 500 錯誤
    bugSpec.includes('PM2'),           // 需要查 PM2
    bugSpec.includes('frontPage'),     // frontPage debug
    bugSpec.includes('多步驟'),         // 明確多步驟
    bugSpec.split('\n').length > 20    // 複雜問題
  ]
  return conditions.some(c => c)
}
```

#### 2. Task 清單範本

**500 錯誤 Debug Task 清單（14 步）**：

| Task ID | Subject | activeForm | 依賴 |
|---------|---------|------------|------|
| 1 | 讀取 Bug Spec | 讀取 Bug Spec... | - |
| 2 | SSH 連線並查 PM2 日誌 | 查詢 PM2 錯誤日誌... | 1 |
| 3 | 分析 Stack Trace | 分析錯誤堆疊... | 2 |
| 4 | 定位程式碼位置 | 讀取相關程式碼... | 3 |
| 5 | 分析前端請求 | 分析前端請求... | 4 |
| 6 | 分析後端 API | 分析後端程式碼... | 5 |
| 7 | 連線 DB（db-tunnel.sh） | 切換 DB 環境... | 6 |
| 8 | 查詢 DB 驗證 | 驗證 DB 資料... | 7 |
| 9 | 取得 Token | 取得 API Token... | 8 |
| 10 | curl 打遠端 API 驗證 | 驗證遠端 API... | 9 |
| 11 | 判斷問題來源 | 判斷前端/後端... | 10 |
| 12 | 產出修改建議 | 撰寫提案文件... | 11 |
| 13 | 歷史文件驗證 | 搜尋歷史文件... | 12 |
| 14 | 檢核提案文件 | 檢核提案文件... | 13 |

**一般 Debug Task 清單（11 步）**：

| Task ID | Subject | activeForm | 依賴 |
|---------|---------|------------|------|
| 1 | 讀取 Bug Spec | 讀取 Bug Spec... | - |
| 2 | 分析前端請求 | 分析前端請求... | 1 |
| 3 | 分析後端 API | 分析後端程式碼... | 2 |
| 4 | 連線 DB（db-tunnel.sh） | 切換 DB 環境... | 3 |
| 5 | 查詢 DB 資料 | 查詢 DB 資料... | 4 |
| 6 | 取得 Token | 取得 API Token... | 5 |
| 7 | curl 打遠端 API 驗證 | 驗證遠端 API... | 6 |
| 8 | 判斷問題來源 | 判斷前端/後端... | 7 |
| 9 | 產出修改建議 | 撰寫提案文件... | 8 |
| 10 | 歷史文件驗證 | 搜尋歷史文件... | 9 |
| 11 | 檢核提案文件 | 檢核提案文件... | 10 |

#### 3. Task 更新時機

**每個步驟開始和結束時更新**：

```
步驟開始 → TaskUpdate(status: 'in_progress')
  │
  └─ 執行步驟內容
  │
步驟結束 → TaskUpdate(status: 'completed')
```

#### 4. 定義檔修改

**在 `debug.md` 新增 Task 相關指示**：

```markdown
## Task 追蹤機制（條件啟用）

### 啟用條件
當 Bug Spec 符合以下任一條件時，使用 Task 追蹤進度：
- 標題或內容包含 "500"
- 需要查 PM2 日誌
- 路徑含 frontPage_api/debug/
- Bug Spec 內容複雜（超過 20 行）

### Task 建立
使用 TaskCreate 建立以下追蹤項目：

**500 錯誤流程（14 步）**：
1. 讀取 Bug Spec
2. SSH 查 PM2 日誌
3. 分析 Stack Trace
4. 定位程式碼位置
5. 分析前端請求
6. 分析後端 API
7. 連線 DB（db-tunnel.sh status → 切換）
8. 查詢 DB 驗證
9. 取得 Token
10. curl 打遠端 API 驗證
11. 判斷問題來源（前端/後端/兩者）
12. 產出修改建議（含前端修改建議）
13. 歷史文件驗證
14. 檢核提案文件

**一般 Debug 流程（11 步）**：
1. 讀取 Bug Spec
2. 分析前端請求
3. 分析後端 API
4. 連線 DB（db-tunnel.sh status → 切換）
5. 查詢 DB 資料
6. 取得 Token
7. curl 打遠端 API 驗證
8. 判斷問題來源（前端/後端/兩者）
9. 產出修改建議（含前端修改建議）
10. 歷史文件驗證
11. 檢核提案文件

### Task 更新
- 開始步驟時：設為 in_progress
- 完成步驟時：設為 completed
- 遇到問題時：保持 in_progress 並說明問題
```

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 用戶追蹤進度 | 無法看到進度 | Task 清單顯示進度 |
| AI 執行順序 | 可能跳步驟 | Task 依賴確保順序 |
| Compact 後恢復 | 可能遺漏步驟 | Task 狀態保留 |
| 複雜 debug | 容易混亂 | 結構化追蹤 |

### 與其他 Skill 的一致性

| Skill | Task 使用 | 說明 |
|-------|-----------|------|
| `/debugP` | 條件式 | 複雜情境才啟用 |
| `/check-result` | 必定啟用 | 驗證流程需要追蹤 |
| `/implement` | 條件式 | 多檔案修改時啟用 |

### 實作狀態

- [x] 設計分析（2026-01-29）
- [x] 設計決策（2026-01-29）
- [x] 實作方式文件（2026-01-29）
- [x] 更新 skill 定義檔（2026-01-29）
- [ ] 測試驗證

---

## 功能擴充：前端修改建議規範（2026-01-29）

### 問題發現

**觸發情境**：執行 `/debugP` 產出 proposal 時，即使問題需要前端修改，AI 也沒有產出前端修改建議。

**問題分析**：

| 位置 | 現況 | 問題 |
|------|------|------|
| 定義檔 - 分析範圍 | 有列 dashboard-nuxt | ✅ 有提到前端專案 |
| 定義檔 - 步驟 5 | 「查看前端送了什麼請求」 | ⚠️ 只說查看，沒說要產出建議 |
| 定義檔 - 步驟 9 | 「產出修改建議文件」 | ❌ 沒說明要包含前端修改 |
| debug-output-rules.md | 只規定檔名格式 | ❌ 沒規定 proposal 內容格式 |

### 缺漏項目

1. **沒有判斷邏輯**：沒要求 AI 判斷問題是「前端問題」、「後端問題」還是「兩者都要改」
2. **沒有內容格式**：proposal 應該包含哪些區塊沒有明確定義
3. **沒有強制要求**：如果需要前端修改，必須產出前端修改建議

### 設計決策

#### 1. 在 `debug-output-rules.md` 新增 Proposal 內容格式規範

```markdown
### Proposal 內容格式（必要區塊）

| 區塊 | 必要性 | 說明 |
|------|--------|------|
| 問題分析 | ✅ 必要 | 問題原因、影響範圍 |
| 問題來源判斷 | ✅ 必要 | 明確標示：前端/後端/兩者 |
| 後端修改建議 | 條件必要 | 如需後端修改 |
| 前端修改建議 | 條件必要 | 如需前端修改 |
| 驗證方式 | ✅ 必要 | 如何驗證修復成功 |
```

#### 2. 在定義檔新增「判斷問題來源」步驟

原本步驟 9「產出修改建議」拆成：
- 步驟 9：判斷問題來源（前端/後端/兩者）
- 步驟 10：產出修改建議（含前端修改建議）

#### 3. 前端修改建議格式

```markdown
## 前端修改建議

### 修改檔案
- 專案：dashboard-nuxt / frontend-nuxt
- 檔案路徑：`pages/xxx.vue` 或 `components/xxx.vue`

### 現有程式碼
```vue
// 目前的程式碼
```

### 建議修改為
```vue
// 修改後的程式碼
```

### 修改原因
[說明為什麼需要這樣修改]
```

### Task 清單更新

因新增「判斷問題來源」步驟，Task 清單調整：
- 500 錯誤流程：13 步 → 14 步
- 一般 Debug 流程：10 步 → 11 步

### 實作狀態

- [x] 問題分析（2026-01-29）
- [x] 設計決策（2026-01-29）
- [x] 更新 debug-output-rules.md 模組（2026-01-29）
- [x] 更新 skill 定義檔（2026-01-29）
- [x] 更新設計稿（2026-01-29）
- [ ] 測試驗證

---

## 設計變更：Bug Fix 驗證三步法（2026-01-29）

### 問題發現

**觸發情境**：執行 `/debugP` 和 `/check-result` 驗證 bug fix 時，AI 直接打目標 API（如 POST），沒有先確認物件存在。

**用戶 feedback**：
> 應該是先撈 db 資料，然後打 findOne 然後再照著 bug spec 去打，不就知道了

**問題分析**：

| Skill | 缺陷 | 現況 |
|-------|------|------|
| `/debugP` | 缺少「中間確認步驟」 | 步驟 7 查 DB、步驟 8 直接打 API，沒有 findOne 確認 |
| `/debugP` | 缺少「模擬 bug spec」概念 | 只說「用 curl 打遠端 API 驗證」，沒有定義怎麼打 |
| `/check-result` | API 驗證步驟太籠統 | 只說「用特定 ID 打 API」，沒有區分 findOne vs 目標操作 |
| `/check-result` | 缺少「模擬 bug spec」概念 | 沒有提到要照著 bug spec 的操作去驗證 |

**根因**：缺少「**從 bug spec 操作步驟 → 對照前端程式碼 → 推導要打的 API**」這個環節。

### 設計決策：Bug Fix 驗證三步法

```
Bug Fix 驗證標準流程
│
├─ 1. 【推導 API 序列】從 bug spec 操作步驟找出要打的 API
│   ├─ 讀取 bug spec 的「重現步驟」
│   │   例如：「點擊成交物件 → 填寫資料 → 點擊儲存」
│   │
│   ├─ 對照前端專案，找出每個步驟對應的 API
│   │   ├─ 前端專案：dashboard-nuxt / frontend-nuxt
│   │   ├─ 找到對應的 Vue 檔案
│   │   └─ 看 handleSubmit() 或相關方法打的是什麼 API
│   │
│   └─ 產出 API 序列
│       例如：GET /estate-listings/{id} → POST /estate-transactions
│
├─ 2. 【存在性確認】先打 findOne/findAll 確認物件可查詢
│   ├─ 用 DB 查到的 ID 打查詢 API
│   ├─ 確認 API 正常回傳
│   └─ 比對 DB 預期值 vs API 回傳值
│
└─ 3. 【Bug Spec 模擬】照著 bug spec 操作打目標 API
    ├─ 根據 bug spec 描述的步驟
    ├─ 打對應的 API（POST/PUT/PATCH）
    └─ 驗證錯誤是否修復
```

### 需要修改的內容

#### 1. `/debugP` skill 定義檔

**位置**：`backend-nestjs/.claude/commands/debugP.md`

**修改內容**：在「curl 打遠端 API 驗證」步驟之前，新增「推導 API 序列」步驟。

**現有步驟**：
```markdown
7. **【條件】需要查 DB 時**（遵循 DB 連線規則）
8. **用 curl 打遠端 API 驗證**
```

**修改為**：
```markdown
7. **【條件】需要查 DB 時**（遵循 DB 連線規則）
8. **【Bug Fix 驗證三步法】**（遵循下方流程）
   - **Step 1 - 推導 API 序列**：
     1. 讀取 bug spec 的「重現步驟」
     2. 對照前端專案（dashboard-nuxt / frontend-nuxt），找出每個步驟對應的 API
     3. 記錄要打的 API 序列（如：GET → POST）
   - **Step 2 - 存在性確認**：
     1. 用 DB 查到的 ID 打 findOne/findAll API
     2. 確認物件存在且可查詢
     3. 比對 DB 預期值 vs API 回傳值
   - **Step 3 - Bug Spec 模擬**：
     1. 照著 bug spec 的操作步驟
     2. 打對應的目標 API（POST/PUT/PATCH）
     3. 驗證錯誤是否修復
```

#### 2. `/check-result` skill 定義檔

**位置**：`backend-nestjs/.claude/commands/check-result.md`

**修改內容**：在「API 驗證」步驟中，加入「Bug Fix 驗證三步法」。

**現有 Step 6**：
```markdown
### Step 6: API 驗證

**有測試資料時**：用 Step 3 找到的特定 ID 打 API
**無測試資料時**：一般驗證
```

**修改為**：
```markdown
### Step 6: API 驗證

#### 6.1 推導 API 序列（Bug Fix 場景必做）

如果是驗證 bug fix：
1. 讀取 bug spec 的「重現步驟」
2. 對照前端專案，找出每個步驟對應的 API
3. 記錄要打的 API 序列

#### 6.2 存在性確認

先打 findOne/findAll 確認物件存在：
```bash
# 用 Step 3 找到的 ID 打查詢 API
./.claude/scripts/test-dashboard-api.sh "/estate-listings/{id}" ".data"
```
- 確認 API 正常回傳
- 比對 DB 預期值 vs API 回傳值

#### 6.3 Bug Spec 模擬

照著 bug spec 操作打目標 API：
```bash
# 根據 bug spec 步驟打對應 API
./.claude/scripts/test-dashboard-api.sh "/estate-transactions" \
  -X POST -d '{"realEstateId": {id}, ...}'
```
- 驗證錯誤是否修復
- 記錄結果
```

#### 3. 流程圖更新

兩個 skill 的流程圖都需要更新，加入「Bug Fix 驗證三步法」的分支。

### 設計經驗

| 項目 | 說明 |
|------|------|
| 為什麼需要「推導 API 序列」？ | Bug spec 有操作步驟，這些步驟對應到前端程式碼，前端程式碼會打 API。直接看 bug spec 不夠，要找到實際打的 API |
| 為什麼先打 findOne？ | 確認物件存在、API 正常，才能驗證後續操作。如果 findOne 就失敗，問題在查詢不在操作 |
| 為什麼要「照著 bug spec 打」？ | 模擬用戶實際操作，才能驗證 bug 是否真的修復 |

### 實作狀態

- [x] 問題分析（2026-01-29）
- [x] 設計決策（2026-01-29）
- [x] 更新設計稿（2026-01-29）
- [x] 更新 `/debugP` skill 定義檔（2026-01-29）
- [x] 更新 `/check-result` skill 定義檔（2026-01-29）
- [ ] 測試驗證

---

## UI-API 索引整合（2026-01-30）

### 背景

「推導 API 序列」步驟原本需要手動搜尋前端專案，消耗大量 context。透過整合 `/build-ui-index` 產出的索引文件，可以直接查表取得 API 對應。

### 整合內容

| 項目 | 說明 | 狀態 |
|------|------|------|
| `ui-api-index.md` module | 提供索引查詢指引 | ✅ 完成 |
| `/debugP` 定義檔 | 新增 module 引用 + 修改 Step 5.1 | ✅ 完成 |
| `/build-ui-index` 設計稿 | 記錄整合決策 | ✅ 完成 |

### 相關文件

| 文件 | 位置 |
|------|------|
| Module | `Projects/.claude/modules/ui-api-index.md` |
| Dashboard 索引 | `prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md` |
| Frontend 索引 | `prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md` |
| `/build-ui-index` 設計稿 | `prompts/4_diary/debug/proposal/slash/build-ui-index_skill_proposal.md` |

### 效益

| 方式 | 操作次數 | Context 消耗 |
|------|----------|-------------|
| ❌ 手動搜尋前端 | 3-5 次 Grep + 2-3 次 Read | 高 |
| ✅ 查索引取得 API | 1 次 Read 索引 | 低 |

### 索引更新機制

```
/pull-frontend 有更新 → 提示執行 /build-ui-index → 更新索引 → /debugP 查表使用
```

---

## Task 追蹤強制啟用（2026-01-30）

### 問題發現

原設計的 Task 追蹤是「條件啟用」：
- 只在特定條件下（500 錯誤、frontPage 路徑、複雜 Bug）才啟用
- 其他情況不使用 Task 追蹤

**問題**：`/debugP` 流程步驟多（11-15 步），沒有 Task 追蹤很容易漏掉步驟。

### 設計決策

將 Task 追蹤從「條件啟用」改為「強制啟用」，與 `/check-result` 設計一致：

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| 啟用方式 | 條件啟用 | **強制啟用** |
| Step 0 | 無 | 建立進度追蹤（強制）|
| Step 8 | 無 | 結束前檢查（強制）|
| 500 錯誤流程 | 14 步 | **15 步** |
| 一般 Debug 流程 | 11 步 | **12 步** |

### 修改內容

1. **流程圖**：
   - 加入 Step 0：建立進度追蹤（強制）
   - 加入 Step 8：結束前檢查（強制）

2. **Task 追蹤機制**：
   - 標題從「條件啟用」改為「強制啟用」
   - 移除啟用條件判斷
   - 兩種流程都加入「結束前檢查」task

3. **結束前檢查邏輯**：
   - 執行 TaskList 確認所有 task 狀態
   - 全部 completed → 輸出結果
   - 有未完成 → 先補完成再輸出

### 設計優點

1. **與 /check-result 一致**：兩個 skill 使用相同的 Task 追蹤機制
2. **避免遺漏步驟**：強制 Task 追蹤 + 結束前檢查，確保每個步驟都執行
3. **視覺化進度**：用戶可以看到 AI 的執行進度

---

## 檔案可存取性驗證（2026-01-30）

### 問題發現

在 contractChange 檔案 bug 除錯過程中發現：
- API 回傳 200 + fileUrl **不等於** 檔案可用
- 可能情況：S3 物件不存在、權限問題、檔案損壞
- 用戶明確指出：「用用看那個 fileUrl 是否可以使用，只是 200 是指 api 能 work 而已」

### 設計決策

**觸發條件**：只要跟檔案有關的 bug 或是票就該觸發

**驗證層級**：完整驗證（下載 + file command + file size）

### 新增步驟：Step 5.4 檔案可存取性驗證

```
├─ 5. 【API 驗證 - Bug Fix 三步法】
│   ├─ 5.1 推導 API 序列
│   ├─ 5.2 存在性確認
│   ├─ 5.3 Bug Spec 模擬
│   └─ 5.4 檔案可存取性驗證（條件觸發）
│       ├─ 觸發條件：API 回傳含 fileUrl/files 欄位
│       ├─ 下載檔案：curl -o temp_file "{fileUrl}"
│       ├─ 檢查格式：file temp_file
│       ├─ 檢查大小：ls -la temp_file
│       └─ 清理暫存：rm temp_file
```

### 驗證流程

```
檔案可存取性驗證流程
│
├─ 1. 【條件檢測】
│   ├─ API 回傳含 fileUrl → 觸發驗證
│   ├─ API 回傳含 files[] → 逐一驗證
│   └─ 無檔案欄位 → 跳過此步驟
│
├─ 2. 【下載驗證】
│   ├─ curl -sS -o /tmp/verify_file "{fileUrl}"
│   ├─ 檢查 HTTP status
│   └─ 失敗 → 記錄「❌ 檔案無法下載」
│
├─ 3. 【格式驗證】
│   ├─ file /tmp/verify_file
│   ├─ 比對預期格式（PDF/JPEG/PNG 等）
│   └─ 格式不符 → 記錄「❌ 檔案格式異常」
│
├─ 4. 【完整性驗證】
│   ├─ ls -la /tmp/verify_file
│   ├─ 檢查 file size > 0
│   └─ 空檔案 → 記錄「❌ 檔案為空」
│
└─ 5. 【清理與報告】
    ├─ rm /tmp/verify_file
    └─ 輸出驗證結果表格
```

### 驗證結果輸出格式

```markdown
### 檔案可存取性驗證

| 檔案 | 下載 | 格式 | 大小 | 結果 |
|------|------|------|------|------|
| contract.pdf | ✅ 200 | ✅ PDF document | ✅ 50,898 bytes | ✅ 可用 |
| image.jpg | ✅ 200 | ❌ HTML document | - | ❌ 格式異常 |
| doc.pdf | ❌ 403 | - | - | ❌ 無法存取 |
```

### Task 追蹤整合

**500 錯誤流程（16 步）**：新增 Step 10.5
**一般 Debug 流程（13 步）**：新增 Step 7.5

| 原 Task | 新 Task | Subject | activeForm |
|---------|---------|---------|------------|
| 10 | 10 | curl 打遠端 API 驗證 | 驗證遠端 API... |
| - | 10.5 | 檔案可存取性驗證（條件） | 驗證檔案可存取... |
| 11 | 11 | 判斷問題來源 | 判斷前端/後端... |

### 設計優點

1. **完整驗證**：不只檢查 HTTP 200，還驗證檔案實際可用
2. **條件觸發**：只在有檔案欄位時執行，不影響一般 debug
3. **詳細報告**：提供每個檔案的驗證結果表格
4. **與 /check-result 一致**：兩個 skill 使用相同的驗證流程

---

## 2026-01-31 設計變更：帳號智能識別 + 多帳號驗證

### 問題描述

QA 在 Notion 票的留言中會指定要測試的帳號，例如：

```
帳號:
店長-seven02/test0000 顧店長
經紀人-seven04/test0000 張雅玲
```

目前 `/debugP` 和 `/check-result` 都使用預設帳號 `12345678` 取得 Token，但有時候需要用特定帳號才能重現問題（例如權限、分店關聯等）。

### 設計方案

1. **帳號智能識別**：掃描整份 bug spec，提取所有 `account/password` 格式的帳號
2. **多帳號迭代驗證**：有多個帳號時，逐一測試每個帳號
3. **更新時機差異**：
   - `/debugP`：所有帳號測完 → 統一產出提案
   - `/check-result`：每個帳號測完 → 立即更新 proposal

### /debugP 完整流程圖（v2）

```
/debugP 執行流程（v2 - 含帳號智能識別）
│
├─ 0. 【建立進度追蹤】（強制）
│   └─ 根據情境使用 TaskCreate 建立追蹤項目
│
├─ 1. 【讀取 Bug Spec】
│   └─ 理解問題內容
│
├─ 1.5 【帳號智能識別】（🆕 新增）
│   │
│   ├─ 掃描整份 Bug Spec（主內容 + 留言區塊）
│   │   └─ 正則匹配：account/password 格式
│   │
│   ├─ 識別結果：
│   │   ├─ 找到 1 個帳號 → 記錄，後續使用
│   │   ├─ 找到多個帳號 → 記錄所有，準備迭代驗證
│   │   └─ 沒找到 → 使用預設帳號 12345678
│   │
│   └─ 輸出：
│       └─ 「📌 發現 N 個測試帳號：{帳號列表}」
│
├─ 2. 【場景判斷】（AI 智能判斷，不需詢問用戶）
│   ├─ 對話上下文有 /implement → 改用 /check-result 驗證
│   └─ 單獨 /debugP 查問題 → 直接打遠端 API
│       ├─ API：https://api-{$1}.<COMPANY_DOMAIN>
│       └─ 不需要切 DB、不需要啟動本地 server
│
├─ 3. 【條件判斷】
│   ├─ 路徑含 frontPage_api/debug/ → 載入 frontPage 歷史開發紀錄
│   └─ 標題/內容含 "500" → ⚠️ 強制優先執行 PM2 流程
│       └─ PM2 日誌 → Stack Trace → 程式碼 → DB 驗證
│
├─ 4. 【分析階段】
│   ├─ 查看前端請求
│   ├─ 查看後端 API、程式碼、entity
│   └─ 【條件】需要查 DB 時：
│       ├─ 先檢查連線狀態：./scripts/db-tunnel.sh status
│       ├─ 已連線目標環境 → 跳過切換
│       └─ 未連線 → 執行 db-tunnel.sh $1
│
├─ 5. 【多帳號迭代驗證】（🆕 修改）
│   │
│   │   ┌─────────────────────────────────────────┐
│   │   │  迭代：對每個測試帳號執行 5.1 ~ 5.5      │
│   │   └─────────────────────────────────────────┘
│   │
│   ├─ 5.0 取得 Token（使用當前帳號）
│   │   ├─ 輸出：「📌 [{N}/{Total}] 驗證帳號：{account}（{角色}）」
│   │   └─ ./.claude/scripts/get-token.sh $1 {account/password}
│   │
│   ├─ 5.1 推導 API 序列
│   │   ├─ 讀取 bug spec 的「重現步驟」
│   │   ├─ 【優先】查詢 UI-API 索引
│   │   ├─ 【備用】手動搜尋前端專案
│   │   └─ 產出 API 序列
│   │
│   ├─ 5.2 存在性確認
│   │   ├─ 用 DB 查到的 ID 打 findOne/findAll API
│   │   └─ 比對 DB 預期值 vs API 回傳值
│   │
│   ├─ 5.3 Bug Spec 模擬
│   │   ├─ 照著 bug spec 的操作步驟
│   │   └─ 驗證現況（錯誤訊息、行為）
│   │
│   ├─ 5.4 檔案可存取性驗證（條件觸發）
│   │   └─ API 回傳含 fileUrl/files 欄位時執行
│   │
│   └─ 5.5 記錄當前帳號驗證結果
│       └─ 暫存結果，待產出提案時統一寫入
│   │
│   └─ ↺ 下一個帳號（如果有）
│
├─ 6. 【產出提案】
│   ├─ 搭配前後端程式碼與 DB 資料
│   └─ 包含所有帳號的驗證紀錄（🆕）
│
├─ 7. 【檢核階段】
│   ├─ 歷史文件驗證（搜尋相關歷史決策）
│   └─ 依照檢核規則檢查提案文件
│
└─ 8. 【結束前檢查】（強制）
    ├─ 執行 TaskList 確認所有 task 狀態
    ├─ 全部 completed → 輸出結果
    └─ 有未完成 → 先補完成再輸出
```

### 帳號識別正則

```bash
# 掃描整份 bug spec（主內容 + 留言）
grep -oE '[a-zA-Z0-9]+/[a-zA-Z0-9]+' bug_spec.md

# 常見格式範例
# 店長-seven02/test0000 顧店長
# 經紀人-seven04/test0000 張雅玲
# admin01/admin123
```

### 執行範例（多帳號）

```bash
# 1. AI 掃描 bug spec，發現多個帳號
📌 發現 2 個測試帳號：
   1. seven02/test0000（店長）
   2. seven04/test0000（經紀人）

# 2. 驗證帳號 1
📌 [1/2] 驗證店長帳號：seven02
./.claude/scripts/get-token.sh staging seven02/test0000
# ... 執行驗證 ...

# 3. 驗證帳號 2
📌 [2/2] 驗證經紀人帳號：seven04
./.claude/scripts/get-token.sh staging seven04/test0000
# ... 執行驗證 ...

# 4. 統一產出提案（包含所有帳號結果）
✅ 多帳號驗證完成（2/2）
```

### Proposal 驗證紀錄格式

```markdown
### API 驗證紀錄（{環境}）

**驗證時間**：YYYY-MM-DD

#### 帳號 1：seven02（店長）

| 測試案例 | API | 預期 | 結果 |
|----------|-----|------|------|
| 查看自己物件的客戶 | GET /customers/67173 | 200 | ✅ 200 |
| 編輯客戶 | PATCH /customers/67173 | 200 | ✅ 200 |

#### 帳號 2：seven04（經紀人）

| 測試案例 | API | 預期 | 結果 |
|----------|-----|------|------|
| 查看自己物件的客戶 | GET /customers/67174 | 200 | ✅ 200 |
| 編輯客戶 | PATCH /customers/67174 | 200 | ✅ 200 |

---

✅ 多帳號驗證完成（2/2 通過）
```

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/debugP` 設計稿 | 完整流程圖 v2 | ✅ 已完成 |
| `/check-result` 設計稿 | 完整流程圖 v2 | ✅ 已完成 |
| `/debugP` 定義檔 | 新增帳號識別 + 多帳號迭代 | ✅ 已完成 |
| `/check-result` 定義檔 | 新增帳號識別 + 多帳號迭代 | ✅ 已完成 |
| `curl-token.md` module | 新增帳號智能識別規則 | ✅ 已完成 |

---

## 功能擴充：檔案上傳輔助模式 `/debugP -f`（2026-02-01）

### 需求背景

在 debug 涉及檔案上傳的 bug 時，用戶目前的工作流程：

```
/guideA file          ← 載入 5-6 個檔案（架構文件 + 程式碼）~8,000 tokens
↓
閱讀 bug spec
↓
/debugP dev [path]     ← 執行 debug
↓
（如需要）/reviewDoc f ← 補充檔案上傳專屬檢核
```

**痛點**：
1. 容易忘記先執行 `/guideA file`，導致 debug 時缺少檔案上傳架構知識
2. 需要多步操作，流程繁瑣
3. debug 完可能忘記執行 `/reviewDoc f`，漏掉 6 項專屬檢核

### 設計討論（2026-02-01）

#### 方案比較

```
方案對比
│
├─ A. 維持現狀
│   ├─ 優點：/guideA file 已經很完整
│   └─ 缺點：需要多步操作，容易遺漏
│
├─ B. /debugP f dev [path]（類似 /reviewDoc f）
│   ├─ 格式：/debugP f dev /path/to/spec.md
│   ├─ 自動載入：檔案上傳架構知識
│   ├─ 自動執行：最後檢核時包含 6 項專屬檢核
│   ├─ 優點：一步到位
│   └─ 缺點：參數順序變化（f 在 env 前面），與現有格式不一致
│
├─ C. /debugP dev [path] -f（flag 風格）✅ 最終選擇
│   ├─ 格式：/debugP dev /path/to/spec.md -f
│   ├─ 優點：不影響現有格式，flag 放最後更直覺
│   └─ 缺點：需要解析 flag
│
└─ D. 智能檢測（自動判斷）
    ├─ /debugP 讀取 bug spec 後自動判斷是否涉及檔案上傳
    ├─ 關鍵字：file、upload、S3、圖片、附件、文件上傳
    ├─ 優點：無需額外參數
    └─ 缺點：可能誤判，不夠明確
```

#### 最終決議

**選擇方案 C**：`/debugP dev [path] -f`

**原因**：
1. 保持現有參數格式不變（`/debugP <env> <path>`）
2. `-f` flag 放最後，語意清楚：「這是個檔案相關的 debug」
3. 用戶可以選擇性使用，不影響一般 debug 流程

### 設計規格

#### 參數格式

```bash
# 一般 debug（不變）
/debugP dev /path/to/spec.md

# 檔案相關 debug（新增）
/debugP dev /path/to/spec.md -f
```

#### 執行流程（-f 模式）

```
/debugP dev [path] -f
│
├─ 1. 【檢測 -f flag】
│   └─ 解析參數，識別 -f flag
│
├─ 2. 【載入檔案上傳知識】（精簡版，約 2,500 tokens）
│   ├─ file_upload_architecture.md（架構文件）
│   ├─ file_upload_checklist.md（檢核清單）
│   └─ ❌ 不載入程式碼（debug 時不需要，省 token）
│
├─ 3. 【執行一般 debug 流程】
│   └─ 與現有流程相同（步驟 0-6）
│
└─ 4. 【最後檢核】（步驟 7）
    ├─ 執行一般檢核（review-proposal-rules.md）
    └─ 🆕 額外執行 6 項檔案上傳專屬檢核
        ├─ CUSTOM_PATH_PREFIX
        ├─ DOCUMENT_TYPE_MAPPING
        ├─ Module 設定
        ├─ Service 方法
        ├─ DTO 欄位
        └─ Entity 關聯
```

#### 與 /guideA file 的分工

| Skill | 用途 | 載入內容 | Token |
|-------|------|----------|-------|
| `/guideA file` | **開發前學習** | 完整知識（架構 + 程式碼） | ~8,000 |
| `/debugP -f` | **debug 時輔助** | 精簡知識（只載入架構文件） | ~2,500 |

**使用時機**：
- 要**開發**檔案上傳功能 → 用 `/guideA file` 載入完整知識
- 要 **debug** 檔案相關 bug → 用 `/debugP -f` 載入精簡知識

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `debug.md` 定義檔 | 新增 `-f` flag 解析邏輯 | ⬜ 待實作 |
| `debugP_flowchart.md` | 新增 `-f` 模式分支 | ⬜ 待實作 |
| 本設計稿 | 記錄設計討論與決議 | ✅ 已完成 |

### 實作狀態

- [x] 需求討論（2026-02-01）
- [x] 方案比較與決議（2026-02-01）
- [x] 更新設計稿（2026-02-01）
- [x] 更新 `debug.md` 定義檔（2026-02-01）
- [x] 更新 `debugP_flowchart.md` 流程圖（2026-02-01）
- [ ] 測試驗證
- [x] 修正按需載入寫法（2026-02-05 完成）

#### 實作注意事項（2026-02-05 補充）

⚠️ **`@` 是預處理指令，無法實現條件載入**

| 寫法 | 行為 | 結果 |
|------|------|------|
| `@` 寫在條件區塊內 | Skill 載入時**全部讀取** | ❌ 無法按需載入 |
| 任務步驟寫「讀取 xxx 文件」 | 執行到該步驟時才讀取 | ✅ 真正按需載入 |

**目前定義檔的錯誤寫法**（debugP.md）：

```markdown
### Step 0.5：-f / -p 模式載入知識（條件執行）

#### -f 模式（檔案上傳輔助）
檢測到 `-f` flag 時，載入檔案上傳架構知識（精簡版）：
- @/path/to/file_upload_architecture.md  ← 會被無條件載入！
- @/path/to/file_upload_checklist.md

#### -p 模式（權限輔助）
檢測到 `-p` flag 時，載入權限架構知識（精簡版）：
- @/path/to/2_permission_adjustment_rules.md  ← 會被無條件載入！
- @/path/to/permission-helper.md
```

**正確寫法**：

```markdown
### Step 0.5：-f / -p 模式載入知識（條件執行）

#### -f 模式（檔案上傳輔助）
檢測到 `-f` flag 時，執行以下步驟：
1. 讀取 `/path/to/file_upload_architecture.md`
2. 讀取 `/path/to/file_upload_checklist.md`
3. 輸出：「📁 檔案上傳輔助模式啟動」

#### -p 模式（權限輔助）
檢測到 `-p` flag 時，執行以下步驟：
1. 讀取 `/path/to/2_permission_adjustment_rules.md`
2. 讀取 `/path/to/permission-helper.md`
3. 輸出：「🔐 權限輔助模式啟動」
```

**另外**：500 錯誤條件中的 `@` 引用（第 246 行）也有同樣問題。

> ✅ **已修正**（2026-02-05）：定義檔 `debugP.md` 的 -f 模式、-p 模式、500 錯誤條件已改為正確的「任務步驟讀取」寫法。

---

## 🆕 多票 Bug Spec 問題盤點機制（2026-02-01）

### 問題發現

**觸發情境**：執行 `/debugP` 時，bug spec 包含多張票（用 `---` 分隔），但 AI 只處理了第一個問題，漏掉其他問題。

**用戶 feedback**：
> bug spec 不是兩個問題嗎？為何你只生出一個問題的 proposal？應該是一個 proposal 有兩個問題的解法吧？

**問題分析**：

| 現況設計 | 問題 |
|---------|------|
| 步驟 1：「讀取 bug spec，理解問題」 | 只說「理解問題」，沒說明要盤點所有問題 |
| proposal 輸出格式 | 沒有定義多問題的結構 |

**根因**：缺少「**問題盤點**」步驟，AI 沒有意識到需要處理 bug spec 中的所有問題。

### 設計決策：問題盤點機制（含 DB 需求分流）

```
多票 Bug Spec 問題盤點流程（完整版）
│
├─ 1. 【讀取 Bug Spec】
│   └─ 完整讀取檔案內容
│
├─ 2. 【問題盤點】（🆕 新增步驟）
│   │
│   ├─ 2.1 檢測多票結構
│   │   ├─ 計算 `---` 分隔線數量
│   │   ├─ 計算 `# [xxx]` 標題數量
│   │   └─ 判斷：分隔線 > 1 或 標題 > 1 → 多票 bug spec
│   │
│   ├─ 2.2 逐一盤點問題
│   │   ├─ 提取每張票的標題
│   │   ├─ 識別每張票的核心問題
│   │   ├─ 🆕 **分析錯誤訊息含義**（2026-02-01 新增）
│   │   │   ├─ 識別 bug spec 中的實際錯誤訊息
│   │   │   ├─ 區分「表象問題」vs「根因問題」
│   │   │   │   ├─ 表象：訊息是英文 → 需要中文化
│   │   │   │   └─ 根因：訊息內容暗示什麼問題？為什麼會觸發這個錯誤？
│   │   │   └─ 若根因問題與表象問題不同 → 視為獨立問題
│   │   ├─ 判斷問題是否相同或相關
│   │   └─ 🆕 判斷是否需要 DB 驗證（參考 DB 需求判斷規則）
│   │
│   └─ 2.3 輸出問題清單表格（含 DB 需求欄位）
│       │
│       │  | # | 票標題 | 核心問題 | 需要 DB | 是否相同根因 |
│       │  |---|--------|---------|---------|-------------|
│       │  | 1 | ... | ... | ❌ | - |
│       │  | 2 | ... | ... | ✅ | ✅/❌ |
│       │
│       └─ 後續分析必須涵蓋所有問題
│
├─ 3. 【分析與驗證 - 分流執行】🆕
│   │
│   ├─ 3.1 先處理：不需要 DB 的問題
│   │   ├─ 分析前端程式碼
│   │   ├─ 分析後端程式碼
│   │   └─ 產出解法（純程式碼修改）
│   │
│   ├─ 3.2 條件執行：DB 連線（只連一次）
│   │   ├─ 檢查：是否有任一問題需要 DB
│   │   ├─ 有 → 執行 `./scripts/db-tunnel.sh $ENV`
│   │   └─ 無 → 跳過 DB 相關步驟
│   │
│   └─ 3.3 後處理：需要 DB 的問題
│       ├─ 查詢相關資料表
│       ├─ 驗證資料狀態
│       ├─ 分析錯誤觸發原因
│       └─ 產出解法（含 DB 驗證結果）
│
└─ 4. 【產出 Proposal】
    │
    ├─ 4.1 問題清單表格（開頭）
    │   │
    │   │  ## 問題清單
    │   │  | # | 票標題 | 核心問題 | 需要 DB | 解法章節 |
    │   │  |---|--------|---------|---------|---------|
    │   │  | 1 | ... | ... | ❌ | § 解法 1 |
    │   │  | 2 | ... | ... | ✅ | § 解法 2 |
    │   │
    │   └─ 若問題有相同根因，標註「合併解法」
    │
    └─ 4.2 各問題解法（分章節）
        ├─ ## 解法 1：[問題 1 標題]
        │   └─ 具體修改內容（純程式碼）
        │
        └─ ## 解法 2：[問題 2 標題]
            ├─ DB 驗證結果
            └─ 具體修改內容（或標註「同解法 1」）
```

### DB 需求判斷規則

| 問題類型 | 需要 DB | 原因 |
|---------|---------|------|
| 錯誤訊息中文化 | ❌ | 純程式碼修改，看 service 即可 |
| 🆕 錯誤訊息內容暗示資料問題 | ✅ | 錯誤訊息的「內容」暗示資料/邏輯問題，需查 DB 驗證為何觸發此錯誤 |
| 資料顯示錯誤 | ✅ | 需查 DB 驗證資料狀態 |
| 儲存失敗 | ✅ | 需查 DB 驗證 ID 是否存在 |
| 權限問題 | ✅ | 需查 DB 驗證用戶權限 |
| UI 顯示異常（資料相關） | ✅ | 可能是欄位沒傳、格式錯誤，需查 DB |
| API 回傳格式錯誤 | ❌/✅ | 視情況，可能需查 DB 對比預期值 |

> ⚠️ **重要區分**（2026-02-01 新增）：
> - **錯誤訊息中文化**：只看訊息是中文還是英文
> - **錯誤訊息內容暗示資料問題**：分析訊息的「內容」是否暗示資料/邏輯問題
>
> **範例**：錯誤訊息 `Buyer customer must have at least one agent (adminStoreRelations)`
> - 表象問題：訊息是英文 → 需要中文化 → ❌ 不需 DB
> - 根因問題：為什麼 adminStoreRelations 驗證會失敗？ → ✅ 需要 DB

### 問題識別規則

#### 多票 Bug Spec 結構識別

```
多票 bug spec 典型結構
│
├─ # [分類]票標題 1
│   ├─ 網址：...
│   ├─ 問題描述
│   └─ 重現步驟
│
├─ ---（分隔線）
│
├─ # [分類]票標題 2
│   ├─ 網址：...
│   ├─ 問題描述
│   └─ 重現步驟
│
├─ ---（分隔線）
│
└─ ## 留言
    └─ （目前無留言）
```

**識別條件**（滿足任一）：
1. 檔案中有 2 個以上的 `# [xxx]` 一級標題（排除 `## 留言`）
2. 檔案中有 2 個以上的 `---` 分隔線（排除留言區塊前的分隔線）
3. 🆕 **留言區塊中有多問題描述**（2026-02-01 新增）：
   - 數字列表：「1. xxx 2. xxx」或「有兩個/三個地方」
   - 連接詞：「另外」「還有」「以及」「除此之外」
   - 明確陳述：「這邊有 N 個問題」

> ⚠️ **設計理由**：單票 bug spec 的留言中，同事可能會補充額外發現的問題。若只看標題會遺漏這些補充問題。

#### 相同根因判斷

| 情況 | 處理方式 |
|------|----------|
| 錯誤訊息相同 | 可能同根因，需驗證 |
| 錯誤發生位置相同 | 可能同根因，需驗證 |
| 問題描述不同但修改位置相同 | 合併解法，分別說明 |
| 完全不同的問題 | 分開解法章節 |

### Proposal 輸出格式（多問題）

```markdown
# [主題] 提案

## 問題清單

| # | 票標題 | 核心問題 | 需要 DB | 解法章節 |
|---|--------|---------|---------|---------|
| 1 | toast提示沒中文訊息 | 錯誤訊息沒有中文化 | ❌ | § 解法 1 |
| 2 | 儲存會跳error code | 為什麼會觸發此錯誤 | ✅ | § 解法 2 |

> 💡 **根因關聯**：問題 1、2 都涉及同一個錯誤訊息，但問題不同：
> - 問題 1：訊息沒中文化（修改 message）
> - 問題 2：為什麼會觸發錯誤（分析業務邏輯）

---

## 解法 1：錯誤訊息中文化

### 問題來源
| 來源 | 需要修改 | 說明 |
|------|----------|------|
| 前端 | ❌ | ... |
| 後端 | ✅ | ... |

### 修改內容
...

---

## 解法 2：錯誤觸發原因分析

### 問題來源
| 來源 | 需要修改 | 說明 |
|------|----------|------|
| 前端 | ❌/✅ | ... |
| 後端 | ❌/✅ | ... |

### 修改內容
...
```

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `debug.md` 定義檔 | 步驟 1 後新增「問題盤點」步驟 | ⬜ 待實作 |
| `debugP_flowchart.md` | 新增問題盤點流程 | ⬜ 待實作 |
| `debug-output-rules.md` 模組 | 新增多問題 proposal 格式 | ⬜ 待實作 |
| 本設計稿 | 記錄設計討論與決議 | ✅ 已完成 |

### 實作狀態

- [x] 問題發現（2026-02-01）
- [x] 設計決策（2026-02-01）
- [x] 更新設計稿（2026-02-01）
- [ ] 更新 `debug.md` 定義檔
- [ ] 更新 `debugP_flowchart.md` 流程圖
- [ ] 更新 `debug-output-rules.md` 模組
- [ ] 測試驗證

---

## 功能擴充：權限輔助模式 `/debugP -p`（2026-02-01）

### 需求背景

**關鍵工作流程問題**：

```
用戶 debug 權限相關 bug 的現有流程：
│
├─ /debugP dev [path]
│   └─ AI 缺少權限架構知識
│       └─ 產出的 proposal 可能遺漏權限相關修改
│
└─ /reviewDoc p
    └─ 檢核到問題，但 proposal 已經寫錯了
        └─ 需要重新來過
```

**核心問題**：如果 `/debugP` 不具備權限知識，產出的 proposal 從一開始就會不完整或錯誤。等到 `/reviewDoc p` 檢核時才發現問題，為時已晚。

**痛點**：
1. debug 權限 bug 時，AI 不知道要修改哪些權限相關檔案
2. 產出的 proposal 遺漏 `apiPermissions.constant.ts`、`permissions.constant.ts` 等關鍵檔案
3. 需要手動來回修改，流程繁瑣

### 設計討論（2026-02-01）

#### 與 `-f` 模式的一致性

採用與 `/debugP -f` 相同的設計模式：

| 面向 | `/debugP -f` | `/debugP -p` |
|------|-------------|-------------|
| 觸發方式 | `-f` flag 放最後 | `-p` flag 放最後 |
| 知識載入 | 精簡版檔案上傳知識 (~2,500 tokens) | 精簡版權限知識 (~3,000 tokens) |
| 專屬檢核 | 6 項檔案上傳專屬檢核 | 6 項權限專屬檢核 |
| 使用時機 | 檔案相關 bug | 權限相關 bug |

### 設計規格

#### 參數格式

```bash
# 一般 debug（不變）
/debugP dev /path/to/spec.md

# 權限相關 debug（新增）
/debugP dev /path/to/spec.md -p

# 同時涉及檔案和權限（可組合）
/debugP dev /path/to/spec.md -f -p
```

#### 執行流程（-p 模式）

```
/debugP dev [path] -p
│
├─ 0. 【建立進度追蹤】（強制）
│
├─ 0.5 【-p 模式：載入權限知識】（條件執行）
│   │
│   ├─ 檢測參數是否包含 -p flag？
│   │   ├─ 否 → 跳過此步驟
│   │   └─ 是 → 載入精簡知識（~3,000 tokens）
│   │       └─ 2_permission_adjustment_rules.md
│   │
│   └─ 輸出：「🔐 權限輔助模式啟動」
│
├─ 1. 【讀取 Bug Spec】
│
├─ 🆕 3.5 【-p 模式專屬分析】（僅 -p 模式執行）
│   │
│   ├─ 3.5.1 分析權限配置（必做）
│   │   │
│   │   ├─ 讀取三個權限相關檔案：
│   │   │   ├─ permissions.constant.ts（路由有沒有設權限）
│   │   │   ├─ apiPermissions.constant.ts（權限有沒有定義）
│   │   │   └─ rolePermissionMapping.constant.ts（角色有沒有被授權）
│   │   │
│   │   └─ 分析重點：
│   │       ├─ 該 API 路由是否有設定權限？
│   │       ├─ 設定的權限是否有定義？
│   │       └─ 哪些角色有被授予該權限？
│   │
│   ├─ 3.5.2 判斷權限問題類型（基於配置分析 + 錯誤訊息）
│   │   │
│   │   ├─ A. 沒權限（配置缺失或沒授權）
│   │   │   ├─ 特徵：403、"permission"、"forbidden"
│   │   │   ├─ 配置分析結果：
│   │   │   │   ├─ 路由有設權限，但權限沒定義
│   │   │   │   ├─ 或：權限有定義，但角色沒授權
│   │   │   │   └─ 或：路由不該設權限（應放行）
│   │   │   └─ 後續：直接產出解法，跳過 DB/API 驗證
│   │   │
│   │   └─ B. 有權限卻被擋（配置正確但還是 403）
│   │       ├─ 特徵：資料被過濾、看不到特定資料
│   │       ├─ 配置分析結果：
│   │       │   └─ 權限配置正確，角色有授權
│   │       └─ 後續：繼續走 DB + API 驗證流程
│   │
│   └─ 輸出：
│       ├─ A 類型 →「🔐 權限配置問題，跳過 DB 驗證」
│       └─ B 類型 →「🔐 需要 DB 驗證資料隔離邏輯」
│
├─ 4-6. 【分析與驗證】（根據問題類型分流）
│   │
│   ├─ A 類型（沒權限）：
│   │   ├─ 跳過 DB 連線
│   │   ├─ 跳過 API 驗證
│   │   └─ 直接產出權限配置修改方案
│   │
│   └─ B 類型（有權限卻被擋）：
│       ├─ 執行 DB 連線與資料查詢
│       ├─ 執行 API 驗證
│       └─ 分析資料隔離邏輯問題
│
├─ 7. 【檢核階段】
│   │
│   ├─ 7.1 一般檢核（review-proposal-rules.md）
│   ├─ 7.2 歷史文件驗證
│   │
│   └─ 7.3 【-p 模式專屬檢核】（條件執行）
│       │
│       └─ 執行 6 項權限專屬檢核：
│           ├─ 1. apiPermissions.constant.ts
│           │   └─ 權限項目定義、命名格式、label
│           ├─ 2. permissions.constant.ts
│           │   └─ 路由權限對應、Method + Path
│           ├─ 3. rolePermissionMapping.constant.ts
│           │   └─ 角色集合、權限分配
│           ├─ 4. Controller Guards
│           │   └─ @UseGuards 裝飾器、順序
│           ├─ 5. Module 依賴
│           │   └─ Entity、RedisModule、PermissionGuard
│           └─ 6. 輔助性 API 豁免
│               └─ simple-list 等不設權限
│
└─ 8. 【結束前檢查】（強制）
```

#### 載入的知識內容

**主要知識檔**：
1. `2_permission_adjustment_rules.md` - 權限配置規則
2. `permission-helper.md` - 權限 DB 結構與查詢模板（**2026-02-01 新增**）

**`2_permission_adjustment_rules.md` 包含**：
- 快速檢查清單
- API 權限豁免原則
- 詳細實作步驟（Step 1-6）
- 常見錯誤與解決方案
- 測試驗證步驟

**`permission-helper.md` 包含**（與 `/check-result -p` 共用）：
- 權限 DB 結構（storeData.id vs storeData.storeId 對應）
- dataScope 查詢模板（allStores / ownStore / ownData）
- 測試資料自動查詢 SQL
- 測試帳號快速參考

**不載入**（節省 token）：
- `1_permission_architecture.md`（完整架構，太大）
- 實際程式碼檔案（debug 時現讀即可）

#### 🆕 流程改進說明（2026-02-01 Case Study）

**問題發現**：

透過實際 debug 案例（物調表權限問題）發現原本流程有問題：

```
❌ 原本錯誤的流程：
/debugP -p 啟動
│
├─ 載入知識
├─ 讀取 bug spec
├─ 連 DB、打 API 驗證 ← 根本不需要！
└─ 分析權限配置
```

**核心問題**：權限問題有兩種類型，處理方式完全不同：

| 類型 | 特徵 | 處理方式 |
|------|------|----------|
| A. 沒權限 | 配置缺失、權限沒定義、角色沒授權 | 看權限配置即可，**不需要 DB/API** |
| B. 有權限卻被擋 | 配置正確但還是被擋、資料被過濾 | 需要 DB + API 驗證資料隔離邏輯 |

**改進後的流程**：

```
✅ 改進後正確的流程：
/debugP -p 啟動
│
├─ 載入知識
├─ 讀取 bug spec
│
├─ 🆕 Step 3.5：-p 模式專屬分析
│   │
│   ├─ 3.5.1 分析權限配置（必做）
│   │   └─ 讀取三個權限檔案，分析配置狀態
│   │
│   └─ 3.5.2 判斷權限問題類型（基於配置分析結果）
│       ├─ A 類型 → 跳過 DB/API，直接產出解法
│       └─ B 類型 → 繼續走 DB + API 驗證
```

**關鍵設計原則**：
1. **先分析配置，再判斷類型**：必須先讀取三個權限檔案，才能判斷是 A 還是 B
2. **分流執行**：A 類型不做無謂的 DB/API 操作，節省時間
3. **配置分析優先**：權限問題的根源在配置，應先看配置再驗證

**實際案例驗證**：

```
物調表權限問題分析：
│
├─ permissions.constant.ts
│   └─ 有配置：GET :realEstateId → caseStudy.detail.view
│
├─ apiPermissions.constant.ts
│   └─ ❌ 沒有定義 caseStudy.detail.view
│
├─ rolePermissionMapping.constant.ts
│   └─ ❌ 沒有任何角色被授予此權限
│
└─ 結論：A 類型（沒權限）→ 直接產出解法，不需要 DB
```

#### 與 /guideA permission、/reviewDoc p 的分工

| Skill | 用途 | 載入內容 | Token |
|-------|------|----------|-------|
| `/guideA permission` | **開發前學習** | 完整知識（架構 + 規則） | ~5,000+ |
| `/debugP -p` | **debug 時輔助** | 精簡知識（只載入規則文件） | ~3,000 |
| `/reviewDoc p` | **檢核提案** | 精簡知識 + 6 項專屬檢核 | ~3,000 |

**工作流程建議**：

```
權限相關工作流程
│
├─ 【開發新功能】
│   └─ /guideA permission → 寫提案 → /reviewDoc p
│
└─ 【Debug 權限 bug】
    └─ /debugP -p → (產出含權限修改的 proposal) → /reviewDoc p
                                                    ↑
                                               檢核更順利
                                            （因為 proposal 已正確）
```

### 6 項權限專屬檢核詳細說明

| # | 項目 | 檢核內容 | 參考來源 |
|---|------|----------|----------|
| 1 | apiPermissions.constant.ts | 權限項目定義、命名格式 `MODULE_ACTION`、label 對應 | Step 1 |
| 2 | permissions.constant.ts | 路由權限對應、HTTP Method + Path 正確性 | Step 2 |
| 3 | rolePermissionMapping.constant.ts | 角色集合分配、各角色權限是否合理 | Step 3 |
| 4 | Controller Guards | `@UseGuards(JwtGuard, RoleGuard, PermissionGuard)` 順序 | Step 4 |
| 5 | Module 依賴 | Permission Entity、RedisModule、PermissionGuard Provider | Step 5 |
| 6 | 輔助性 API 豁免 | simple-list、enum 等輔助性 API 不應設權限 | 豁免原則 |

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `debug.md` 定義檔 | 新增 `-p` flag 解析邏輯 | ✅ 已完成 |
| `debugP_flowchart.md` | 新增 `-p` 模式分支 | ✅ 已完成 |
| 本設計稿 | 記錄設計討論與決議 | ✅ 已完成 |

### 實作狀態

- [x] 需求討論（2026-02-01）
- [x] 方案比較與決議（2026-02-01）
- [x] 更新設計稿（2026-02-01）
- [x] 更新 `debug.md` 定義檔（2026-02-01）
- [x] 更新 `debugP_flowchart.md` 流程圖（2026-02-01）
- [ ] 測試驗證

---

## 設計修正：帳號驗證策略與已有 Proposal 參考（2026-02-02）

### 問題發現

透過實際執行 `/debugP dev -p` 發現 AI 執行流程有誤：

```
❌ 錯誤的執行流程：
/debugP dev -p
│
├─ 讀取 bug spec
├─ 直接連 DB（db-tunnel.sh dev）  ← 不應該先做
├─ 用 psql 查帳號資料            ← 跳過打 API
└─ ...
```

**AI 犯的錯誤**：
1. 沒有參考已有的 proposal（之前已分析過並修正）
2. 沒有查前端索引表找 API
3. 直接跳到連 DB，跳過「打遠端 API」步驟
4. 誤以為要「多帳號全部迭代驗證」

### 根因分析

**流程圖步驟 5「多帳號迭代驗證」的描述有問題**：

```
# 原本的描述（有問題）
├─ 5. 【多帳號迭代驗證】
│   │   ┌─────────────────────────────────────────┐
│   │   │  迭代：對每個測試帳號執行 5.1 ~ 5.5      │  ← 暗示「全部都打一輪」
│   │   └─────────────────────────────────────────┘
│
│   ├─ 5.2 存在性確認
│   │   ├─ 用 DB 查到的 ID 打 findOne/findAll API  ← 暗示「先查 DB 才能打 API」
```

**問題 1**：「對每個測試帳號執行」讓 AI 誤以為不管 bug spec 指定誰，都要全部打一輪
**問題 2**：「用 DB 查到的 ID」讓 AI 誤以為要先連 DB 才能打 API
**問題 3**：沒有提到「參考已有 proposal」的流程

### 設計修正

#### 修正 1：帳號驗證策略

```
# 修正後的描述
├─ 5. 【帳號驗證】（修正策略）
│   │
│   ├─ 5.0 判斷驗證範圍
│   │   ├─ bug spec 有指定帳號 → 只驗證指定的帳號
│   │   │   例：「店長進入物調表跳錯誤」→ 只驗證店長
│   │   └─ bug spec 沒指定（如「所有非總部帳號」）→ 全部 role 都驗一輪
│   │
│   ├─ 5.1 查前端索引表（ui-api-index）
│   │   ├─ Dashboard 相關 → 查 ui-api-index-dashboard.md
│   │   └─ Frontend 相關 → 查 ui-api-index-frontend.md
│   │
│   └─ 5.2 打遠端 API 驗證
│       ├─ 用 bug spec 提供的帳號取得 token
│       ├─ curl https://api-{env}.<COMPANY_DOMAIN>/...
│       └─ 從 API 回傳值判斷現況
```

#### 修正 2：已有 Proposal 參考（新增步驟 1.8）

```
├─ 1.8 【檢查已有 Proposal】（🆕 新增）
│   │
│   ├─ 搜尋 bug spec 同目錄是否有 *_proposal.md
│   │   └─ 執行 ls $(dirname bug_spec_path)/*_proposal.md
│   │
│   ├─ 有找到 → 讀取 proposal
│   │   ├─ 了解之前的分析結果
│   │   ├─ 了解之前的修改方案
│   │   └─ 了解驗證結果（成功/失敗）
│   │
│   └─ 後續分析時參考 proposal 內容
│       └─ 避免重複分析已知的問題
```

#### 修正 3：打 API 優先，DB 備用

```
├─ 5.2 驗證方式（修正順序）
│   │
│   ├─ 【優先】打遠端 API
│   │   ├─ 用 bug spec 的帳號/ID
│   │   ├─ curl https://api-{env}.<COMPANY_DOMAIN>/...
│   │   └─ 從回傳值判斷問題
│   │
│   └─ 【備用】查 DB（需要時才做）
│       ├─ 需要理解資料狀態時
│       ├─ 方式 1：SSH 進機器查
│       └─ 方式 2：本地 db-tunnel.sh 連遠端 DB
```

### 完整修正後流程圖

```
/debugP dev -p 正確執行流程
│
├─ 0. 【建立進度追蹤】
│
├─ 0.5 【-p 模式：載入權限知識】
│
├─ 1. 【讀取 Bug Spec】
│   └─ 理解問題、識別帳號
│
├─ 🆕 1.8 【檢查已有 Proposal】
│   ├─ 有 proposal → 讀取，了解歷史分析
│   └─ 沒有 → 繼續
│
├─ 2. 【帳號識別】
│   ├─ bug spec 指定帳號 → 記錄指定的帳號
│   └─ 沒指定 → 準備驗證全部 role
│
├─ 3. 【-p 模式專屬分析】
│   ├─ 分析權限配置（三個權限檔案）
│   └─ 判斷問題類型（A 沒權限 / B 有權限卻被擋）
│
├─ 4. 【查前端索引表】
│   └─ 找到 bug spec 操作對應的 API
│
├─ 5. 【帳號驗證】（🆕 修正策略）
│   │
│   ├─ 5.0 判斷驗證範圍
│   │   ├─ 有指定帳號 → 只驗證指定的
│   │   └─ 沒指定 → 全部 role 驗一輪
│   │
│   ├─ 5.1 取得 Token
│   │   └─ ./.claude/scripts/get-token.sh {env} {account/password}
│   │
│   ├─ 5.2 打遠端 API 驗證（優先）
│   │   ├─ curl https://api-{env}.<COMPANY_DOMAIN>/...
│   │   └─ 分析回傳結果
│   │
│   └─ 5.3 查 DB（備用，需要時才做）
│       └─ SSH 進機器 或 本地 db-tunnel.sh
│
├─ 6. 【產出提案】
│
├─ 7. 【檢核階段】
│
└─ 8. 【結束前檢查】
```

### 需要同步更新的檔案

| 項目 | 內容 | 狀態 |
|------|------|------|
| `debugP_flowchart.md` | 更新步驟 5 帳號驗證策略 | ⏳ 待更新 |
| `debug.md` 定義檔 | 新增步驟 1.8 檢查已有 Proposal | ⏳ 待更新 |

### 設計原則總結

| 原則 | 說明 |
|------|------|
| **參考已有 Proposal** | 避免重複分析已知問題 |
| **查前端索引表** | 快速找到 API，不用手動搜尋 |
| **有指定驗指定** | bug spec 指定誰有問題，就驗誰 |
| **沒指定驗全部** | 沒指定帳號時，全部 role 驗一輪 |
| **打 API 優先** | 先打遠端 API，需要時才查 DB |

---

### 2026-02-03：修正定義檔 Token 取得方式說明

**問題發現**：

Conversation Compaction 後，AI 沒有按照流程圖指定的方式取得 token，而是直接使用 curl 登入。

| 檔案 | Token 取得方式 | 狀態 |
|------|----------------|------|
| 流程圖 5.2 | `./.claude/scripts/get-token.sh $1 {account/password}` | ✅ 明確 |
| 定義檔 8.2 | 「用 bug spec 提供的帳號取得 token」 | ❌ 模糊 |

**問題根因**：

- 流程圖明確指定了 `get-token.sh` 腳本
- 但定義檔只說「取得 token」，沒有指定具體方法
- Compact 後 AI 只讀取定義檔時，會自行發揮取得 token 的方式

**解決方案**：

更新定義檔 Step 8.2，明確指定 token 取得方式：

```markdown
**8.2 打遠端 API 驗證**（優先）：
   - **取得 Token**：`./.claude/scripts/get-token.sh $1 {account/password}`
   - 用取得的 token 打遠端 API：`curl https://api-{env}.<COMPANY_DOMAIN>/api/v1/...`
   - 分析回傳結果，驗證現況（錯誤訊息、行為）
```

**同步更新清單**：

| 檔案 | 變更內容 | 狀態 |
|------|----------|------|
| debug.md 定義檔 | Step 8.2 新增明確 token 取得方式 | ✅ 已更新 |
| debugP_flowchart.md | 無需更新（原本就正確） | ✅ |
| debugP_skill_proposal.md | 新增設計變更記錄 | ✅ 已更新 |

---

## 設計修正：預設帳號密碼格式防呆（2026-02-03）

### 問題發現

AI 在帳號智能識別時，沒找到帳號卻錯誤地組合密碼格式：

```bash
❌ get-token.sh dev 12345678/test0000  → password = test0000 → 401 Invalid password
✅ get-token.sh dev 12345678           → password = 12345678 → 成功
✅ get-token.sh dev                    → password = 12345678 → 成功
```

### 根因分析

`get-token.sh` 的密碼規則（`get-token.sh:55-61`）：
- 含 `/` → 拆分為 account/password（QA 格式，如 `seven02/test0000`）
- 不含 `/` → 帳號密碼相同（如 `12345678` → account=12345678, password=12345678）

設計稿、流程圖、curl-token module 的帳號識別流程只寫：
```
沒找到 → 使用預設帳號 12345678
```
沒有明確說明預設帳號**禁止加 /password**，導致 AI 看到 bug spec 中其他帳號的 QA 格式（如 `seven02/test0000`）後，誤以為預設帳號也要套用相同格式。

### 設計修正

在帳號智能識別的「沒找到」分支加入防呆：

```
├─ 3. 【識別結果】
│   ├─ 找到帳號 → 使用 bug spec 提供的完整格式（如 seven02/test0000）
│   └─ 沒找到 → 使用預設帳號
│       ├─ 指令：get-token.sh $1 12345678
│       └─ ⚠️ 預設帳號帳密相同，直接傳帳號，禁止加 /password
```

**防呆規則表**：

| 情況 | 正確指令 | 錯誤指令 |
|------|----------|----------|
| 沒找到帳號（使用預設） | `get-token.sh dev 12345678` | ❌ `get-token.sh dev 12345678/test0000` |
| 沒找到帳號（使用預設） | `get-token.sh dev` | ❌ `get-token.sh dev 12345678/12345678` |
| 找到 QA 帳號 | `get-token.sh dev seven02/test0000` | - |

### 需要同步更新的檔案

| 檔案 | 變更內容 | 狀態 |
|------|----------|------|
| `debugP_skill_proposal.md` | 新增此設計變更記錄 | ✅ 已更新 |
| `curl-token.md` module | 帳號識別流程加入防呆警告 | ⏳ 待 review 後更新 |
| `debugP_flowchart.md` | 步驟 5.2 加入預設帳號格式提醒 | ⏳ 待 review 後更新 |

---

## 功能擴充：分析階段整合 API Data Flow 文件（2026-02-07）

### 問題描述

`/api-flow-architecture` 和 `/review-api-flow` 已建立完成，`prompts/6_api_data_flow/` 目錄下已有 API 的結構化文件（Entity、DTO、Service、Controller），但 `/debugP` 在分析階段仍然每次從零搜尋程式碼，沒有利用已有的 data-flow 文件。

### 設計目標

在 `/debugP` 的分析階段（Step 4）開頭，先查詢是否有對應的 API Data Flow 文件：
- **有文件** → 讀取作為分析基礎，後續只需針對 bug 相關部分深入讀程式碼
- **沒文件但是 API 相關 bug** → 中斷，提示先執行 `/api-flow-architecture {apiName}`
- **非 API 相關 bug** → 跳過，維持現有行為

### 設計決策

#### 位置：Step 4.0（分析階段最前面）

不放在 Step 1 附近的原因：Step 1-3 都在做「理解問題 + 條件判斷」，還不知道要分析哪個 API。到 Step 4 進入分析階段時，已經知道涉及哪個 API module，這時查 data-flow 才有意義。

#### 判斷邏輯

先判斷 bug 是否為 API 相關，再決定是否查 data-flow 文件：

```
├─ 4.0 【查 API Data Flow 文件】（條件）
│   │
│   ├─ 判斷是否為 API 相關 bug
│   │   ├─ 判斷依據：bug spec 內容中的 API 路徑、endpoint、
│   │   │   controller 名稱、前端打的 API 等
│   │   │
│   │   ├─ 【是 API 相關】→ 提取 apiName
│   │   │   ├─ 搜尋 6_api_data_flow/adminApi/{apiName}-data-flow.md
│   │   │   ├─ 搜尋 6_api_data_flow/publicApi/{apiName}-data-flow.md
│   │   │   │
│   │   │   ├─ 找到 → 讀取，作為後續分析的基礎知識
│   │   │   │   ├─ Entity 結構（欄位、關聯）
│   │   │   │   ├─ DTO 欄位定義
│   │   │   │   ├─ Service select/relations、業務邏輯
│   │   │   │   └─ Controller 路由結構
│   │   │   │
│   │   │   └─ 沒找到 → ⚠️ 中斷
│   │   │       └─ 提示：請先執行 /api-flow-architecture {apiName}
│   │   │
│   │   └─ 【非 API 相關】→ 跳過，維持現有行為（從零分析）
│   │       └─ 例如：migration、config、共用 util 等問題
```

#### 中斷而非跳過的原因

API 相關 bug 如果沒有 data-flow 文件就繼續分析，會：
1. 從零搜尋 Entity/DTO/Service，浪費大量 token
2. 分析結果沒有持久化，下次又要重來
3. 與 `/review-api-flow` 的閉環設計脫節

先建立 data-flow 文件（一次性成本），後續所有 debug 都能受益。

### 與現有流程的關係

```
/api-flow-architecture {apiName}    ← 建立 data-flow 文件（前置）
        ↓
/debugP dev [path]                  ← Step 4.0 讀取 data-flow 文件
        ↓
/implement → /gcommit-push          ← Step 13.5 更新 scan-meta
        ↓
/review-api-flow {apiName}          ← 用最新 scan-meta 做對齊檢查
```

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `debugP_skill_proposal.md` | 記錄設計討論與決議 | ✅ 已完成 |
| `debugP_flowchart.md` | Step 4 前新增 Step 4.0 | ✅ 已完成 |
| `debugP.md` 定義檔 | Step 4 前新增查 data-flow 步驟 | ✅ 已完成 |

### 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 記錄到設計稿（2026-02-07）
- [x] 更新 `debugP_flowchart.md` 流程圖（2026-02-07）
- [x] 更新 `debugP.md` 定義檔（2026-02-07）
- [ ] 測試驗證

---

## 功能擴充：Proposal 輸出加入 API Data Flow 參照（2026-02-07）

### 需求背景

上一個功能擴充（Step 4.0/4.5）讓 debugP 在分析階段讀取 data-flow 文件。但 proposal 輸出中**沒有記錄**這個資訊，導致：
1. 後續看 proposal 的人/AI 不知道分析基於哪個版本的 API 結構
2. `/reviewDoc` 檢核時無法利用 data-flow 作為對照基礎
3. `/implement` 執行時也缺少結構參照

### 設計決策：B 方案

> 詳細方案比較見 `check_result_field_verification_gaps.md` — 「Proposal 輸出整合 API Data Flow — B 方案設計」

| 方案 | 做法 | 結論 |
|------|------|------|
| A | Proposal + Bug Spec 都放 | ❌ 不採用：bug spec 時序上已寫完，要回頭改；且 bug spec 定位是描述問題 |
| **B** | **Proposal 最前面放 + /reviewDoc 強調檢核** | ✅ 採用：職責清楚，不改 bug spec |

### 輸出格式定義

在 proposal 文件**最前面**（標題之後、問題描述之前）新增：

```markdown
## API Data Flow 參照

| 項目 | 內容 |
|------|------|
| 文件路徑 | `prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md` |
| scan-meta | commit=`{hash}`, date=`{YYYY-MM-DD}` |
| 涵蓋範圍 | Entity / DTO / Service / Controller |

### 關鍵結構摘要
- **Entity**: {主要欄位、關聯}
- **DTO**: {與 bug 相關的欄位}
- **Service**: {select/relations 重點}
- **Controller**: {相關路由}

> ⚠️ 以上結構基於 data-flow 文件記錄的版本，若程式碼已有後續修改，以實際程式碼為準。
```

**觸發條件**：僅當 Step 4.5 有讀取 data-flow 文件時才輸出此區塊。非 API 相關 bug（Step 4.5 跳過）不需要。

### 與 /reviewDoc 的聯動

`/reviewDoc` 檢核時看到「API Data Flow 參照」區塊：
- **有** → 讀取對應 data-flow 文件，作為檢核基礎，比對 proposal 的欄位分析是否一致
- **沒有 + API 相關 bug** → 警告：缺少 Data Flow 參照
- **沒有 + 非 API bug** → 正常，跳過

> 📋 `/reviewDoc` 的對應設計變更見 `review_skill_proposal.md` 同日期的功能擴充

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `debugP_skill_proposal.md` | 記錄 B 方案設計與輸出格式 | ✅ 已完成 |
| `debugP.md` 定義檔 | Proposal 輸出格式加入 Data Flow 參照區塊 | ✅ 已完成 |
| `debugP_flowchart.md` | 不需修改（輸出格式不影響流程圖步驟） | — 不需要 |
| `review_skill_proposal.md` | 新增檢核規則 | ✅ 已完成 |

### 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 記錄到 debugP 設計稿（2026-02-07）
- [x] 記錄到 reviewDoc 設計稿（2026-02-07）
- [x] 更新 `debugP.md` 定義檔 — Proposal 輸出格式（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔 — 檢核規則（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

## 寫入策略：分段 Write 機制（2026-02-08）

### 背景

`/debugP` Step 10 產出 proposal 時，是**新建檔案**。由於 proposal 內容量大（通常 500-3000+ 行），單次 Write 可能因 context 限制導致內容截斷或遺漏。需要明確的分段寫入機制確保完整性。

### 核心方案

**分段 Write（新建）**：按 Proposal 標準結構分段，依序寫入同一檔案。

| 項目 | 說明 |
|------|------|
| 觸發者 | `/debugP` Step 10（產出 proposal） |
| 寫入對象 | 新檔案（不存在的 proposal） |
| 工具 | Write tool（第一段）→ Edit tool（後續段落追加） |
| 策略 | 按章節順序分段寫入 |

### 章節分段規則

Proposal 標準結構按以下順序分段寫入：

```
段落 1（Write tool 建立檔案）：
├─ # 標題
├─ ## API Data Flow 參照（如有）
└─ ## 概述 / 問題描述

段落 2（Edit tool 追加）：
└─ ## 問題分析（含根因、影響範圍）

段落 3（Edit tool 追加）：
└─ ## 修改方案（含每個修改項目的詳細步驟）

段落 4（Edit tool 追加）：
└─ ## 實作步驟（含檔案清單、修改順序）

段落 5（Edit tool 追加）：
└─ ## 驗證方式（含測試 cases、curl 指令）

段落 6（Edit tool 追加，如有）：
├─ ## 待確認問題
└─ ## 前端修改建議（如有）
```

### 寫入順序與銜接

1. **第一段用 Write tool**：建立檔案，寫入標題 + 參照 + 概述
2. **後續段落用 Edit tool**：在檔案末尾追加（`old_string` 匹配上一段的最後幾行，`new_string` 包含上一段末尾 + 新段落）
3. **段落銜接**：每段開頭包含 `---` 分隔線或 `##` 標題，確保上下文清晰
4. **不跨段拆分**：同一個 `##` 區塊不拆到兩段，保持語意完整

### 驗證檢查

寫入完成後執行完整性檢核：

| 檢查項目 | 方法 |
|---------|------|
| 章節完整性 | 確認所有必要的 `##` 標題都存在 |
| 內容連貫性 | 確認段落之間沒有重複或遺漏 |
| 格式正確性 | 確認 markdown 格式（表格、code block）沒有被截斷 |
| 檔名規則 | 確認符合 `debug-output-rules.md` 的命名規範 |

### 與 `debug-output-rules.md` 的關係

`debug-output-rules.md` 已定義檔案偵測（新建 vs 更新）和命名規則。本寫入策略是**補充**其中「新建模式」的具體寫入機制：

- `debug-output-rules.md`：決定**是否新建**、**檔名怎麼取**
- 本寫入策略：決定新建時**怎麼分段寫入**、**寫入順序**、**驗證方式**

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `debugP_skill_proposal.md` | 記錄分段 Write 設計 | ✅ 已完成 |
| `debug-output-rules.md` | 補充分段寫入規則 | ⬜ 待 /updateDesign |
| `debugP.md` 定義檔 | Step 10 引用分段寫入規則 | ⬜ 待 /updateDesign |
| `debugP_flowchart.md` | 不需修改（寫入細節不影響流程步驟） | — 不需要 |

### 實作狀態

- [x] 設計討論（2026-02-08）
- [x] 記錄到 debugP 設計稿（2026-02-08）
- [ ] 更新 `debug-output-rules.md`
- [ ] 更新 `debugP.md` 定義檔
- [ ] 測試驗證

---

### 2026-02-09 設計變更：新增最終步驟「更新進度表」

**變更內容**：在 skill 最後步驟完成後，自動執行 `@.claude/flowcharts/update-progress.md` 共用模組，將 proposal 進度表中 `/debugP` 對應的行標記為 ✅。

**設計背景**：見 `showFlow_skill_proposal.md`「2026-02-09 設計變更」。

**影響**：
- 流程圖：最後節點後新增「更新進度表」
- 定義檔：最後 Step 後新增引用 `@.claude/flowcharts/update-progress.md`
- TaskCreate：如有，新增一行

---

## 設計變更：API 呼叫統一使用 test-dashboard-api.sh（2026-02-10）

### 問題發現

`/debugP` Step 8.2「打遠端 API 驗證」使用裸 `curl https://api-{env}.<COMPANY_DOMAIN>/api/v1/...` 命令，這有兩個問題：

1. **權限提示**：裸 `curl` + `TOKEN=$(cat ...)` 複合命令每次都觸發 Claude Code 權限提示
2. **不一致**：`/check-result` 已統一使用 `test-dashboard-api.sh`（2026-02-10），但 `/debugP` 還在用裸 curl

### 背景

`test-dashboard-api.sh` 已擴充支援三種環境：

```bash
# 本地（/check-result 使用）
./test-dashboard-api.sh "/transcripts/1" ".data"

# 遠端 Dev（/debugP 可用）
./test-dashboard-api.sh dev "/transcripts/1" ".data"

# 遠端 Staging（/debugP 可用）
./test-dashboard-api.sh staging "/transcripts/1" ".data"

# 全 HTTP verb 支援
./test-dashboard-api.sh dev "/transcripts" -X POST -d '{"realEstateId":1}' ".data"
./test-dashboard-api.sh staging "/transcripts/123" -X PATCH -d '{"areaSqm":100}'
./test-dashboard-api.sh dev "/transcripts/land/456" -X DELETE
```

### 解法

將 `/debugP` Step 8.2 的裸 curl 替換為 `test-dashboard-api.sh`，加上 `$1`（環境參數）即可。

#### 定義檔變更（`debugP.md`）

**Step 8.2 現有寫法**：
```markdown
**8.2 打遠端 API 驗證**（優先）：
   - **取得 Token**：`./.claude/scripts/get-token.sh $1 {account/password}`
   - 用取得的 token 打遠端 API：`curl https://api-{env}.<COMPANY_DOMAIN>/api/v1/...`
```

**改為**：
```markdown
**8.2 打遠端 API 驗證**（優先）：
   - ⚠️ **【強制規則】所有 API 呼叫統一使用 test-dashboard-api.sh**
     - ❌ 禁止裸 curl + TOKEN=$(...) 複合命令（會觸發權限提示）
   - **取得 Token**：`./.claude/scripts/get-token.sh $1 {account/password}`
   - 用腳本打遠端 API：`./.claude/scripts/test-dashboard-api.sh $1 "/path" ".jq"`
```

**API 位置區塊現有寫法**：
```markdown
**API 位置**：
   - Dev：`curl https://api-dev.<COMPANY_DOMAIN>/api/v1/...`
   - Staging：`curl https://api-staging.<COMPANY_DOMAIN>/api/v1/...`
```

**改為**：
```markdown
**API 呼叫方式**：
   - GET：`./.claude/scripts/test-dashboard-api.sh $1 "/path" ".jq"`
   - POST：`./.claude/scripts/test-dashboard-api.sh $1 "/path" -X POST -d '{json}' ".jq"`
   - PATCH：`./.claude/scripts/test-dashboard-api.sh $1 "/path" -X PATCH -d '{json}' ".jq"`
   - DELETE：`./.claude/scripts/test-dashboard-api.sh $1 "/path" -X DELETE`
   - ❌ 禁止裸 curl + TOKEN=$(...) 複合命令（會觸發權限提示）
```

#### 流程圖變更（`debugP_flowchart.md`）

**Step 5.3 現有寫法**：
```
│   ├─ 5.3 打遠端 API 驗證（優先）
│   │   ├─ curl https://api-{env}.<COMPANY_DOMAIN>/...
```

**改為**：
```
│   ├─ 5.3 打遠端 API 驗證（優先）
│   │   ├─ ⚠️ 統一使用 test-dashboard-api.sh（禁止裸 curl）
│   │   ├─ ./.claude/scripts/test-dashboard-api.sh $1 "/path" ".jq"
```

#### curl-token.md module 變更

在 `curl-token.md` 現有的「📚 Token 取得與 API 測試」和「🚀 Server 啟動 SOP」之間，新增統一規則區塊：

```markdown
### 📋 統一 API 呼叫規則

> ⚠️ **強制規則**：`/debugP` 和 `/check-result` 的所有 API 呼叫都必須使用 `test-dashboard-api.sh`

| 場景 | 指令 |
|------|------|
| `/check-result`（本地 API） | `./.claude/scripts/test-dashboard-api.sh "/path" ".jq"` |
| `/debugP`（遠端 API） | `./.claude/scripts/test-dashboard-api.sh $1 "/path" ".jq"` |

**好處**：
- 腳本路徑被 `.claude/scripts/*` 通配符覆蓋，不觸發權限提示
- 環境 URL 由腳本自動處理（local/dev/staging）
- Token 由腳本自動讀取，不需 `TOKEN=$(cat ...)` 複合命令

❌ **禁止**：裸 `curl` + `TOKEN=$(cat /tmp/dashboard_token.txt)` 複合命令
```

### 更新檔案

| 檔案 | 變更 | 狀態 |
|------|------|------|
| `debugP_skill_proposal.md` | 記錄設計變更 | ✅ 已完成 |
| `.claude/commands/debugP.md` | Step 8.2 改用 test-dashboard-api.sh + 禁止裸 curl | ✅ 已完成 |
| `.claude/flowcharts/debugP_flowchart.md` | Step 5.3 改用 test-dashboard-api.sh | ✅ 已完成 |
| `curl-token.md` module | 新增「統一 API 呼叫規則」區塊 | ✅ 已完成 |

### 實作狀態

- [x] 設計討論（2026-02-10）
- [x] 記錄到 debugP 設計稿（2026-02-10）
- [x] 更新 `debugP.md` 定義檔（2026-02-10）
- [x] 更新 `debugP_flowchart.md` 流程圖（2026-02-10）
- [x] 更新 `curl-token.md` module（2026-02-10）
- [ ] 測試驗證

---

### 2026-02-13 設計變更：Step 6 新增「分頁預設值檢查」（條件執行）

**變更動機**：

所有 findAll/list endpoint 的分頁預設值應為 10 筆。debugP 產出 proposal 時，如果涉及 findAll/list endpoint 的 bug，應順便檢查分頁預設值。

**變更內容**：

#### Step 6 新增：分頁預設值檢查（條件執行）

在 Step 6 產出提案的現有子步驟之後新增：

```
├─ 6. 【產出提案】
│   ├─ （現有 6.1 ~ 6.3...）
│   └─ 🆕 6.4 分頁預設值檢查（條件執行）
│       ├─ 涉及 findAll/list endpoint？
│       │   ├─ 否 → 跳過
│       │   └─ 是 → 檢查 DTO pageSize/limit 預設值
│       │       ├─ 不是 10 → 在 proposal 加入修改建議（@Transform default 10）
│       │       └─ 是 10 → 不提
```

**條件**：只在涉及 findAll/list endpoint 的 bug 時才執行，不影響非 findAll 的 bug 流程。

**歷史文件驗證**：debugP 已有 Step 7.1，不需改。

**與 dpf / reviewDoc 的關係**：

| Skill | 分頁預設值檢查位置 | 角色 |
|-------|-------------------|------|
| debugP | Step 6.4（🆕 條件執行） | 生產端 |
| dpf | Step 4.7（🆕 額外檢查） | 生產端 |
| reviewDoc | Step 12（🆕 檢核項） | 品質關卡 |

三者互補：debugP/dpf 產出時檢查 → reviewDoc 檢核時再次確認。

**影響**：
- 流程圖：Step 6 新增 6.4 條件子步驟
- 定義檔：Step 6 新增分頁預設值檢查邏輯

**實作狀態**：
- [x] 設計討論（2026-02-13）
- [x] 記錄到 debugP 設計稿（2026-02-13）
- [x] 更新 `debugP.md` 定義檔（2026-02-13 /updateDesign）
- [x] 更新 `debugP_flowchart.md` 流程圖（2026-02-13 /updateDesign）
- [ ] 測試驗證