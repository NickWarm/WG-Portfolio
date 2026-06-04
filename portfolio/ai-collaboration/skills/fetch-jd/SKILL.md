---
name: fetch-jd
description: 給 104 職缺網址（或 hashid）與 proposal 資料夾名，抓取 JD 並寫成 job_description.md 到該資料夾。優先用 104 公開 API（zero-token），被 Cloudflare 擋才接真實 Chrome 過 Turnstile。觸發：使用者貼 104 網址（含 /job/<hashid>）並提到「抓 JD」「fetch」「寫到 proposals」。
allowed-tools: Bash, Read, Write
---

# fetch-jd — 抓 104 職缺成 job_description.md

只負責三件事：**抓 JD → 格式化 → 落地**。不評分、不對齊履歷、不寫追蹤。
那些是另一支 skill（之後若需要再做）的事。

## 路徑常數

```
HONRUCH_REPO  = /Users/nicholas/Desktop/Projects/104-jobhunt
FETCH_SCRIPT  = $HONRUCH_REPO/scripts/job-detail.mjs
SHARED_DOC    = $HONRUCH_REPO/modes/_shared.md
PROPOSALS_DIR = /Users/nicholas/Desktop/WG-Portfolio/workspace/proposals
OUTPUT_PATH   = $PROPOSALS_DIR/<folder>/job_description.md
```

## 輸入

- `<url_or_hashid>`：104 職缺網址（如 `https://www.104.com.tw/job/91xmv?...`）或裸 hashid
- `<folder>`（選用）：proposal 資料夾名。若未提供，依以下規則自動生成：

### 資料夾命名規則

格式：`<n>_<company_slug>_<job_title_slug>`

- `<n>`：批次編號，掃描 `$PROPOSALS_DIR` 既有資料夾找最大編號 +1（跳過 `_template`）
- `<company_slug>`：從 `company` 中文名去除贅字（「股份有限公司」「有限公司」「股份」），保留主體
- `<job_title_slug>`：從 `title` 取主要職稱（去除括號內 EN、空白、特殊字元，用 `_` 連接）

例：
- `達特艾立股份有限公司` + `AI 自動化規劃師 ｜ AI Automation Planner` → `1_達特艾立_ai_自動化規劃師`
- `將能數位行銷有限公司` + `智慧自動化專家 (AI Agent Builder)` → `2_將能數位行銷_智慧自動化專家`

中文資料夾名 macOS 支援良好；使用者覺得不順可手動 rename。

若 `<folder>` 已存在，依「步驟 2 覆寫前檢查」處理。

## 流程

### Happy path（fast-path，zero-token）

```bash
node /Users/nicholas/Desktop/WG-Portfolio/portfolio/ai-collaboration/skills/fetch-jd/format-jd.mjs \
  "<url_or_hashid>" [--folder <name>] [--force]
```

這支腳本包了：呼叫 honruch 的 `job-detail.mjs` → 套用命名規則 → 寫成 `job_description.md`。
成功時 stdout 印 JSON 報告 `{ folder, target, company, title, jobUrl }`。

退出碼：
- `0` 成功
- `1` 參數錯誤
- `2` honruch fetch 非零（多半是 Cloudflare 擋 → 走步驟 1B）
- `3` 回傳非 JSON
- `4` `job_description.md` 已存在（加 `--force` 覆寫）

### Fallback：被 Cloudflare 擋才用

依 `$HONRUCH_REPO/modes/_shared.md` 的「接真實 Chrome 過 Cloudflare」流程：

1. 啟動獨立 profile 的 Chrome（`$HOME/.chrome-104debug`）開遠端除錯埠 9222，開該職缺頁。
2. `npx --yes agent-browser connect 9222`
3. `agent-browser get title` 確認標題不是「請稍候...」
4. 用 `agent-browser eval` 在頁面 context 注入 **ES5（IIFE）** 呼叫 `/job/ajax/content/<hashid>`，Referer 設為 `/job/<hashid>`
5. 完成後 `npx --yes agent-browser close --all`

具體 ES5 範例見 `_shared.md`，不重抄。

### 步驟 2：覆寫前檢查

若 `$OUTPUT_PATH` 已存在：
- Read 既有內容
- 顯示前 30 行給使用者
- 明確問「覆寫？」並等待確認，**不要預設覆寫**

### 步驟 3：寫入 job_description.md

對齊 `workspace/proposals/2_doctorally_ai_automation_planner/job_description.md` 的格式：

```
{title}

- {company}
- {jobUrl}
- 上班地點: {location}
- 工作待遇: {salary}
- 工時: {workPeriod.shifts 整理}
- 遠端工作: {從 jobDescription 萃取，找不到寫「JD 未明確說明」}
- 經歷／學歷: {workExp} / {education}
- 管理責任: {manageResp}
- 出差: {businessTrip}

---

# 工作內容

{jobDescription 全文，保留原始換行與條列}

---

【我們期待你擁有以下條件 / 加分條件】
{others 全文}

【福利】
{welfare 全文}
```

若 JD 文末含「履歷投遞方式」「面試流程」等補充段落（如 email 投遞、書審要求），
照搬寫進文末，**不要重新潤飾**。

## 規則

- **不捏造**：fast-path 與 fallback 都失敗時，回報錯誤、停手；不要憑空寫 JD。
- **不潤飾**：JD 原文、加分條件、福利照搬，這份檔的價值在「事實層」可被後續 `analysis.md`、`design.md` 引用。
- **不評分**：分數、A–F、契合度、紅旗——通通不寫；那是另一支 skill 的事。
- **遠端工作政策**：API 沒有結構化欄位，需從 `jobDescription` / `others` 內文萃取。找不到就誠實寫「JD 未明確說明」。
- **JD 全文必抓**：職缺頁面可能關閉，本地檔是永久單一真實來源。

## 為什麼這樣設計

- **借底層、不借評分**：honruch 的 `job-detail.mjs` 是社群已驗證的 104 抓取方案（含 Cloudflare fallback），重造輪子無意義。
- **只做一件事**：對齊 trading 專案的 skill 哲學——單一職責、可組合。後續若要評分／追蹤，是另一支 skill。
- **格式對齊 agent 設計流程**：產出是 `analysis.md` / `design.md` 的輸入，所以重事實、輕摘要。
