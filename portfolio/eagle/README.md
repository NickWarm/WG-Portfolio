# AI 輔助開發流程設計（去識別化版 · 可公開）

> 本檔為去識別化版本，可用於履歷／作品集（`portfolio/projects/`）。
> 已移除：真實 API route、伺服器 IP、資料庫帳密等敏感資訊。
> 對應內部完整版見 `../original/`（僅存本機，不公開）。

---

## 一句話定位

在**飛鷹地產**（房地產 SaaS）的 NestJS 後端專案中，我把團隊「靠資深工程師腦袋記住」的開發 SOP，
工程化成一套 **35 個可組合的 AI 指令（Claude Code Skills）+ 自動護欄（Hooks）+ 設計稿** 的系統，
讓「修 bug、API 對齊、部署」這類多步驟工作變成**可重複、有護欄、可交接**的標準管線。

---

## 背景與問題

後端是一套房地產 SaaS，分為兩塊 API：
- 後台管理 API（`adminApi`，對應後台前端）
- 官網前台 API（`publicApi`，對應官網前端）

開發上反覆出現幾個痛點：

1. **流程固定但靠人記** — 修一張 bug 票要走「匯出票 → 分析 → 寫提案 → 檢核 → 實作 → 驗證 → commit → 回報前端」八九個步驟，每次靠記憶，容易漏步驟。
2. **品質不一** — 錯誤處理寫法、回傳型別、資料量防護、多環境 DB 切換，每個人習慣不同。
3. **新人上手慢** — 流程知識散在資深工程師腦中，沒有可執行的標準。
4. **危險操作** — 誤連遠端 DB 跑 migration、commit 簽錯身份、誤改主專案（worktree 情境）。

---

## 系統架構（三層）

```
AI 輔助開發系統
│
├─ 1.【Skills 層】35 個 slash command
│     └─ 每個 skill 負責流程中的一個步驟，可像積木一樣串接
│
├─ 2.【Hooks 層】PreToolUse / PostToolUse 自動護欄
│     └─ 不靠人記、由系統強制
│
└─ 3.【設計稿層】每個 skill 一份設計稿 + 一張流程圖
      └─ 確保可維護、可交接
```

**配置管理**：實際配置集中於專案 `.claude/`，並透過 Hook 在修改時自動同步備份到獨立的文件庫專案。

---

## 三條工作流程（核心設計）

把所有開發工作歸納成 **3 條主線**，依「進入點」區分。可用 `/showFlow` 隨時印出流程圖。

### 流程 A：API 結構建立（建立基礎資料 / 地圖）

```
/pull-frontend → /build-ui-index → /api-flow-architecture {api} → /review-api-flow {api}
拉前端最新       建 UI-API 索引     建後端結構文件                 前後端對齊 → 產出問題清單(❌/⚠️)
```
產出的「問題清單／data-flow」是後續修復的參照地圖。

### 流程 B：Data Flow 驅動修復（工單「開票前」主動修）

```
/dpf {api} → /reviewDoc → /reviewDoc -data {env} → /implement → /check-result {env} → /gcommit-push → /fxxxf2e
從問題清單     一般檢核     推導 cases+撈 DB 資料      實作          切 DB 驗證            commit         前端建議
生 proposal   ⏭️跳過 add-pi
```
特點：**不等工單就主動修**，吃流程 A 的問題清單，不需要 bug spec。

### 流程 C：Bug Fix（工單「開票後」）

```
/exportN [工單] → /debugP {env} → /add-pi → /reviewDoc → /reviewDoc -data {env}
匯出工單→spec     分析→proposal    納入潛在問題  完整檢核    推導 cases+撈資料
  → /implement → /check-result {env} → /gcommit-push → /fxxxf2e
     實作            用備好的資料驗證      commit+更新進度       前端建議+罐頭留言
```

**B 與 C 的共同核心段**（設計上刻意復用）：
```
reviewDoc → reviewDoc -data → implement → check-result → gcommit-push → fxxxf2e
```

| | 進入點 | 起手 skill | 需 bug spec | add-pi |
|---|--------|-----------|------------|--------|
| B（開票前）| 主動掃描的問題清單 | `/dpf` | ❌ | ⏭️ 跳過 |
| C（開票後）| 工單系統 | `/exportN` | ✅ | ✅ |

---

## 35 個 Skill 分類

| 類別 | Skills | 作用 |
|------|--------|------|
| **流程編排** | showFlow | 印三條流程圖、在 proposal 置頂建進度表 |
| **入口/匯出** | exportN, debugP, dpf | 從工單或問題清單建立 proposal |
| **文件檢核** | reviewDoc, rrDoc, add-pi, splitP, read-data-flow | 提案品質檢核（自動驗證）、納入潛在問題、拆分過大提案 |
| **實作** | implement | 依提案實作 + 自動檢核 + build 驗證 |
| **驗證** | check-result, verify-QA, verifyOWS, review-api-flow | 切多環境 DB 驗證、三方欄位比對、v1↔v2 比對 |
| **部署** | gcommit-push, merge-to-deploy, runMigration, new-dashboardApi | commit、合併到 dev、遠端 migration、重建乾淨 branch |
| **前端銜接** | fxxxf2e, pull-frontend, run-frontend, build-ui-index | 前端修改建議、拉前端、啟前端 dev server、建 UI 索引 |
| **架構知識** | api-flow-architecture, guideArchitecture, guideA, findDoc, know-cc-config | 建/讀架構文件、載入架構知識、查文件、讀配置 |
| **修復工具** | fix-id-string-number, fixPermissionError | 掃 DTO id 型別、掃權限錯誤訊息自動生提案 |
| **Meta/維護** | updateDesign, syncCompact, sm, readDesign, epl | 同步 skill 設計稿、同步指令、session memory、讀設計規則、解釋提案 |
| **雜項** | dl-video | 下載串流影片 |

---

## Hook 護欄系統（品質從「靠人記」→「系統強制」）

| Hook | 觸發 | 作用 |
|------|------|------|
| local DB 檢查 | Bash | migration 前檢查是否連 local DB，誤連遠端會阻止 |
| DB 連線環境守衛 | DB REPL | 驗證連線環境正確 |
| Git 身份守衛 | git commit | 強制正確 commit 身份簽名 |
| 自動 Prettier | Write/Edit .ts/.js | 存檔後自動格式化 |
| UTF-8 編碼驗證 | Write | 中文檔案編碼自動檢測 |
| worktree 守衛 | Edit/Write | 有 active worktree 時阻止誤改主專案 |
| 階段記憶載入 | Write *.dto/service/controller/spec.ts | 偵測開發階段、自動載入對應記憶 |
| 規劃文件攔截 | Read | 讀到規劃文件時提示改用交替實作模式 |
| 程式碼品質驗證 | Write | 偵測不符規範的錯誤處理、迴圈內 save，自動修正 |
| 配置自動同步 | Edit 配置檔 | 自動同步備份到文件庫專案 |

---

## 設計方法論（履歷可講的「思考」）

1. **單一職責 + 可組合** — 每個 skill 只做一步，靠串接組出不同流程，而非寫一個巨大腳本。
2. **流程分層而非分散** — 把 N 條情境歸納成 3 條主線，找出共同核心段復用，降低維護面。
3. **護欄前移** — 把品質規範（DB 安全、格式、型別、身份）做成 Hook 在「動作發生前/後」自動攔截，而非事後 code review 才抓。
4. **可交接性** — 每個 skill 配設計稿 + 流程圖，整套配置版本控制 + 自動備份，確保不是「只有我會用」。
5. **去識別化意識** — 設計時就把「流程方法論」與「業務資料」分離，方法論可對外、業務細節留內部。

---

## 成果與價值

- 把只存在資深工程師腦中的流程，變成 **可重複執行、可被 review、可版本控制** 的標準管線。
- 降低漏步驟與人為失誤；新人照 `/showFlow` 就能走完整流程。
- 危險操作（誤連遠端 DB、簽錯身份、誤改主專案）由 Hook 自動擋下。
- 流程本身可持續演進（`updateDesign` 維護設計稿、`syncCompact` 同步指令）。

---

## 履歷 Bullet（可直接撈用）

- 設計並維護 ~35 個可組合的 AI 開發指令（Claude Code Skills），將團隊開發 SOP 工程化為 3 條可重複執行的自動化流程
- 建置 Hook 護欄系統（DB 環境檢查、Git 身份驗證、自動格式化、編碼驗證），將品質規範從「靠人記」轉為「系統強制」
- 每個流程附流程圖與設計稿，確保可維護、可交接、可持續演進
- 體現能力：流程設計、開發者工具、自動化、AI 工程、可維護性思考
