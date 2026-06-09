# 「飛鷹地產」後端開發的 Claude Code skill workflow

把 [飛鷹地產](https://www.eagle111.com/) 的後端從 [ASP.NET](https://dotnet.microsoft.com/en-us/apps/aspnet) + [MSSQL](https://www.microsoft.com/zh-tw/sql-server) 重寫成 [NestJS](https://nestjs.com/) + [PostgreSQL](https://www.postgresql.org/)。

這是一個大工程，在這過程中，我把日常開發重複性的工作拆成數個 Claude Code skills，讓我的開發像是工廠的自動化生產線一樣，每個環節都是可控，我只專注在核心的大方向是否正確，與是否符合該功能的業務需求。

在這邊舉個例子，說明我如何拆解日常的開發工作

一個需求下來後

需要

```
匯出 notion 的票到本地的 Claude Code 理解需求 → 連開發資料庫做資料分析 → 寫修復提案 → 檢核提案 
→ 實作 → 驗證 → commit → 有時前端有問題，要回報前端修正
```

每次都走類似的流程，把這些開發過程拆解成 **可重複呼叫、可像積木組合的指令（Claude Code Skills）**，再依不同工作把它們串成流程，這其實就是一種 SOP 與自動化的過程。


## 依不同需求，打造不同的工廠生產線

最初只有一條功能開發的生產線，隨著專案進行，可能會有修 bug 票，可能會有跟原本常做的完全不同項目的需求

像是把官網原本接舊資料庫的舊版 API（v1），改成接新資料庫的新版 API（v2）

主要有幾個大方向：

- 新功能/修 bug 票，重點是「分析 → 提案 → 實作 → 驗證」
- 把官網 API 從 v1 重寫成 v2，重點是「**證明 v2 沒有改壞任何東西**」，幾乎不寫新功能；
- 幫前端 debug，重點是「**對齊前端畫面 ↔ 後端 API**」；
- 同一種寫錯的毛病散在幾十個模組，重點是「**整批掃過、分批修完**」。

所以我把它設計成**四條獨立的總流程**，每條解決一種工作：

- **A. 後台 API 開發／修復** — 修 bug 或主動修，要可重複、有把關
- **B. 官網 API v2 遷移驗證** — v1 重寫成 v2，要證明沒改壞
- **C. 前後端同步／幫前端 debug** — 對齊「畫面 ↔ API」
- **D. 同類問題、整批掃修** — 一種寫錯的毛病可能散在幾十個模組，系統化掃過全部、分批修完並追蹤進度

每條流程用到哪些 skill、為什麼這樣設計，下面一條一條說。另外還有一層**貫穿四條流程的支撐層**，讓它們「不靠人記、可交接」，最後再談。

開發時我也常用 [`/showFlow`](skills/showFlow.md) 隨時印出某條流程**依序會用到哪些 skill**，例如開票後修 bug 的流程：

[`/exportN`](skills/exportN.md) → [`/debugP`](skills/debugP.md) → [`/add-pi`](skills/add-pi.md) → [`/reviewDoc`](skills/reviewDoc.md) → [`/implement`](skills/implement.md) → [`/check-result`](skills/check-result.md) → [`/gcommit-push`](skills/gcommit-push.md) → [`/fxxxf2e`](skills/fxxxf2e.md)

每個 skill 的縮寫與用途：

1. [`/exportN`](skills/exportN.md)：**export N**otion 的縮寫，把 Notion 票匯出成本地檔案，讓 AI 讀懂需求
2. [`/debugP`](skills/debugP.md)：**debug + Proposal** 的縮寫，連上開發資料庫分析 bug，直接產出修復提案
3. [`/add-pi`](skills/add-pi.md)：**add Potential Issue** 的縮寫，把該模組潛在問題篩選後納入提案，一次修完
4. [`/reviewDoc`](skills/reviewDoc.md)：**review Document** 的縮寫，檢核提案品質，能自動補的補、要判斷的停下等我確認
5. [`/implement`](skills/implement.md)：依提案實作程式碼，自動檢核 + build 驗證
6. [`/check-result`](skills/check-result.md)：切到 dev/staging 資料庫，用本機 API 驗證修正結果對不對
7. [`/gcommit-push`](skills/gcommit-push.md)：**git commit + push** 的縮寫，更新提案、提交並推送，順帶確保「提案＝實作＝commit」一致
8. [`/fxxxf2e`](skills/fxxxf2e.md)：給前端（**f2e**＝front-end）的修改建議，整理成可直接動工的交接留言

> 說明：以下展示工作流程的邏輯、資料表與函式名稱、文字流程圖，不含實際程式碼、資料庫連線方式與真實 API 路徑。adminApi＝後台管理 API、publicApi＝官網前台 API。

## 每個 skill 執行的詳細流程圖

開發時，直接讀 claude code 提出的 markdown 提案，字數會太多，所以我喜歡 AI 做出文字流程圖，

在 skill 的設計上，也會採用這種設計模式

在「飛鷹地產」開發時所用到的 skill 的設計，整理到 [`flowcharts`](flowcharts/) folder 裡面去，有興趣可以參閱。

---

## 總流程 A：後台 API 開發／修復

### 要解決的目標

修一張後台 bug 票，要走「匯出工單 → 分析 → 寫提案 → 檢核 → 實作 → 驗證 → commit → 回報前端」八九個步驟。每次靠記憶容易漏步驟；錯誤處理怎麼寫、回傳的資料格式、資料一多時的防護，又每個人習慣都不同。目標是**把這類多步工作變成可重複、有護欄、可交接的標準管線**。

### workflow 怎麼設計（為何這樣設計）

- **先歸納再復用**：十幾種開發情境（新功能、調整、改寫、修 bug、對應欄位……）最後都收斂成「產出一份 proposal → 依 proposal 修改 → 驗證 → 收尾」。差別只在**前段怎麼生出 proposal**。
- **抽出共用核心段**：把後段設計成同一段復用——`reviewDoc → reviewDoc -data → implement → check-result → gcommit-push → fxxxf2e`。維護一次，多條主線同時受益。
- **只在「進入點」分叉**：工單開票前用 `/dpf`（吃主動掃描的問題清單），開票後用 `/exportN`→`/debugP`（吃工單）。
- **檢核循環刻意拆成獨立 skill**：`/reviewDoc`（檢核）和 `/rrDoc`（依建議修正後再檢核）各自獨立、可重複呼叫。`/reviewDoc` **能自動補的（格式、驗證欄位）就直接補，但牽涉業務／架構判斷的就停下來等我確認、不擅自改**。循環由我手動驅動，確保每一輪關鍵修改都經過人工把關。

### 單行文字流程圖

A-1 結構建立（先畫地圖）

```
/pull-frontend → /build-ui-index → /api-flow-architecture → /review-api-flow
```

A-2 開 bug 票就先發現問題主動修正問題

```
/dpf → /reviewDoc → /reviewDoc -data → /implement → /check-result → /gcommit-push → /fxxxf2e
```

A-3 QA 發現 bug 開票後檢查與修正問題

```
/exportN → /debugP → /add-pi → /reviewDoc → /reviewDoc -data → /implement → /check-result → /gcommit-push → /fxxxf2e
```

> A-2 與 A-3 只有「進入點」不同，灰底的 `reviewDoc → … → fxxxf2e` 是兩條共用的核心段。

### 各 skill 用途

- [`/pull-frontend`](skills/pull-frontend.md)：拉兩個前端專案（官網、後台）最新進度
- [`/build-ui-index`](skills/build-ui-index.md)：掃前端程式碼，建立「畫面操作 ↔ 後端 API」索引
- [`/api-flow-architecture`](skills/api-flow-architecture.md)：建立後端 API 結構文件（Entity / DTO / Service / Controller）
- [`/review-api-flow`](skills/review-api-flow.md)：前後端對齊檢查，產出問題清單（❌/⚠️），當作 A-2 的彈藥庫
- [`/dpf`](skills/dpf.md)：開票前主動修的進入點——吃 `/review-api-flow` 的問題清單，直接生 proposal（不需工單規格）
- [`/exportN`](skills/exportN.md)：把工單匯出成本地 bug 規格
- [`/debugP`](skills/debugP.md)：連上資料庫分析 bug，產出 proposal
- [`/add-pi`](skills/add-pi.md)：把該模組潛在問題**篩選後**納入 proposal（排除前端已防護、沒人用的，只留真會出錯的）
- [`/reviewDoc`](skills/reviewDoc.md)：檢核提案品質（含程式碼品質、跟資料流向互相對照檢查），報告後停下等確認
- [`/rrDoc`](skills/rrDoc.md)：依檢核建議修正提案後再檢核一次
- [`/implement`](skills/implement.md)：依 proposal 實作，自動檢核 + build 驗證
- [`/check-result`](skills/check-result.md)：切到 dev/staging DB，用 local API 驗證修正結果
- [`/gcommit-push`](skills/gcommit-push.md)：更新 proposal + commit + 推送
- [`/fxxxf2e`](skills/fxxxf2e.md)：從 proposal 抽出前端要怎麼改，整理成可直接動工的交接留言（含 commit、驗證範例）

---

## 總流程 B：官網 API v2 遷移驗證

### 要解決的目標

官網 API 從 v1 重寫成 v2，重點不是寫新功能，而是**證明「v2 沒有改壞任何東西」**。過去要人工開官網跟大後台兩個畫面肉眼比對，費時又容易漏，而且沒有紀錄、改完無法快速重跑。

### workflow 怎麼設計（為何這樣設計）

- **設計成兩層驗證金字塔**：先確認「v2 跟舊版 v1 輸出一致」，再確認「整條資料鏈（API ↔ 大後台 ↔ DB）一致」。兩層各管一件事，問題出在哪一層一翻就知道。
- **純程式碼 + DB 查詢驗證，不開瀏覽器**：用程式打 API、查 DB，把三邊的值列成一張表自動標 ✅/❌，而且**過程寫成文件，下次改完可以直接重跑**。
- **以「前端實際顯示的欄位」為基準**：先讀前端 Vue 程式碼，抽出畫面真正用到的欄位，再回頭比對——避免浪費時間驗證一堆前端根本沒用到的欄位。

### 單行文字流程圖

```
/verifyOWS {module} → /verify-QA {module}
（v2 與 v1 比對）      （v2 ↔ 大後台 ↔ DB 三方比對）
```

### 各 skill 用途

- [`/verifyOWS`](skills/verifyOWS.md)：v2 實作後，把 v1 API 與 v2 API 逐欄位比對，確認輸出一致
- [`/verify-QA`](skills/verify-QA.md)：欄位映射修好後，三方比對「v2 API ↔ 大後台 API ↔ DB 原始值」，以官網實際顯示的欄位為基準，逐欄位標結果並寫成驗證文件

---

## 總流程 C：前後端同步／幫前端 debug

### 要解決的目標

前端有兩個專案（官網、後台）。後端改了東西、或前端回報畫面怪怪的時，需要快速對齊「**畫面 ↔ API**」。但畫面顯示錯了，問題可能出在後端 API 或前端任一層，常常變成前後端互相甩鍋。

### workflow 怎麼設計（為何這樣設計）

- **UI-API 索引當橋樑，用後端的能力幫前端 debug**：`/build-ui-index` 掃前端 Vue 程式碼，把每個**畫面操作（頁面載入 / Tab 切換 / 彈窗送出）對應到哪支後端 API** 建成索引。畫面壞了，我能從「哪個畫面、哪個操作怪」直接反查到是哪支 API，即使不是前端專家，也能判斷是後端給錯還是前端用錯。（至於欄位值對不對、追到 DB，由總流程 B 的 `/verify-QA` 讀前端綁定 + 三方比對把關。）
- **把跨團隊溝通也自動化**：修完之後 `/fxxxf2e` 把「前端該配合改什麼」整理成可直接貼給前端工程師的留言。

### 單行文字流程圖

```
/pull-frontend → /build-ui-index → /run-frontend → /fxxxf2e
```

### 各 skill 用途

- [`/pull-frontend`](skills/pull-frontend.md)：拉兩個前端專案最新進度
- [`/build-ui-index`](skills/build-ui-index.md)：掃前端，建立「畫面操作 ↔ 後端 API」索引（那座橋）
- [`/run-frontend`](skills/run-frontend.md)：本地啟／停前端 dev server，重現問題
- [`/fxxxf2e`](skills/fxxxf2e.md)：抽出前端要怎麼改，整理成可直接動工的交接留言（含 commit、驗證範例）

---

## 總流程 D：同類問題、整批掃修

### 要解決的目標

有些問題不是單一 bug，而是**一整類、散在 51 個 API 模組裡的共通漏洞**——例如某種 DTO 欄位型別寫法、某種權限錯誤訊息處理。這種要的不是「修一個」，而是「系統化掃完所有模組、還要記得哪些掃過」。

### workflow 怎麼設計（為何這樣設計）

- **複雜度決定自動化程度**：單純、機械式的（欄位缺型別轉換），就讓 skill 直接改完跑 build；牽涉判斷的（權限不足該回『沒權限』還是『找不到』、錯誤訊息一路傳遞會不會走樣），就只生 proposal，回到總流程 A 的核心段讓我人工確認。**該自動的自動、該把關的把關。**
- **追蹤表 + `-list` 讓 51 個模組可以分批掃**：每個 skill 配一張進度追蹤表（記錄掃過哪些、結果、commit），下 `-list` 就印出「已掃 N/51、還剩哪些、建議下一個掃誰」。把一個大到做不完的工作，**變成可隨時中斷、隨時接續的分批任務**。

### 單行文字流程圖

```
（輕量・自動修）  /fix-id-string-number {api} → 自動修正 + build → /gcommit-push
（重量・人工把關）/fixPermissionError {api} → /reviewDoc → /rrDoc → /implement → /check-result → /gcommit-push
進度查詢          /fix-id-string-number -list   /fixPermissionError -list
```

### 各 skill 用途

- [`/fix-id-string-number`](skills/fix-id-string-number.md)：掃 DTO 的 id 欄位是否缺型別轉換，直接自動修正 + build 驗證（低複雜度）
- [`/fixPermissionError`](skills/fixPermissionError.md)：掃 Service + Controller 的權限錯誤處理，產出修復 proposal，再走核心段人工把關（高複雜度）
- 兩者皆支援 `-list`：讀追蹤表，輸出整體掃描進度與下一個建議掃描對象

---

## 支撐層（貫穿四條流程）

上面四條流程能「不靠人記、可交接」，靠的是底下這層基礎建設。

### Hook 護欄——品質與安全從「靠人記」變成「系統強制」

最危險的不是不會做，而是「明明知道規則，某次忘了」。我把這些規範做成 **20+ 個 Claude Code Hook**，在動作發生的前一刻／後一刻自動攔截，而不是等事後 code review 才抓（下表列幾個代表）：

| Hook | 觸發時機 | 自動做什麼 |
|------|---------|-----------|
| local DB 檢查 | 跑 Bash 指令時 | 偵測到 migration 但連的是遠端 DB → 直接擋下 |
| DB 環境語意守衛 | 用 DB 工具時 | **讀對話最近的語意**，發現其實在操作正式環境卻要連 DB → 擋下，強迫改用安全通道 |
| Git 身份守衛 | `git commit` 時 | 套正確身份 ＋ **擋掉 AI 簽名、強制英文 commit** |
| worktree 守衛 | Edit/Write 時 | 有 active worktree 卻想改主專案 → 擋下並提示 |
| 自動 Prettier | 存 `.ts/.js` 時 | 自動格式化，不必手動跑 |
| 依階段載入規範 | 寫 `*.dto/service/controller.ts` 時 | 依當下在寫哪種檔，自動載入對應的開發規範 |
| 規劃文件攔截 | 讀到規劃文件時 | 提示改用「先讀規劃、再逐步實作」的模式 |

### 其他支撐

- **[`/showFlow`](skills/showFlow.md) + proposal 置頂進度表**：流程隨時可視化；進度表由各 skill 自動更新 ✅/👉，接手的人一眼看到走到哪。
- **設計稿維護（[`/updateDesign`](skills/updateDesign.md)）**：改動一個 skill 時，一併同步它的定義檔、流程圖與設計稿——確保這套系統「不是只有我會用」。
- **對話壓縮防護（[`/syncCompact`](skills/syncCompact.md)）**：長對話被 AI 自動壓縮時容易遺失上下文，這個 skill 把「壓縮後必須保留的關鍵資訊（工作路徑、流程狀態、規則提醒）」同步進 CLAUDE.md，避免接續工作時失憶。
- **架構知識按需載入（[`/guideArchitecture`](skills/guideArchitecture.md)）**：開發前才載入對應領域的架構知識（權限、檔案上傳、異動紀錄等），用完即丟，也讓同一套知識能跨專案共用。
- **查工單與文件（[`/findDoc`](skills/findDoc.md)）**：給一張工單，快速查出它的討論進度、提案摘要、實作狀態與相關技術文件。

---

