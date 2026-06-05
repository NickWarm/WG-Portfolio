---
description: "抓網頁背後的 API：開獨立 Chrome 錄 network，操作後分析出真正的 endpoint / payload"
allowed-tools: Bash, Read, Edit, Write
---

# sniff - 網頁 API 嗅探器

逆向分析網頁背後打了哪些 API。流程：開獨立 Chrome → 使用者操作目標按鈕 → 關視窗 → 讀 JSON → 告訴使用者真正的 endpoint。

設計與背景見：
- `~/claude_work/tech-notes/web-reverse-engineering-toolkit.md`（主設計）
- `~/claude_work/tech-notes/sniff-experiment-tradovate.md`（首次驗證紀錄、噪音域名清單）

**輸入**: `$ARGUMENTS`
**語法**: `<URL> [--profile <key>] [--no-filter] [--no-body] [--out <file>]`

## 工作流程

### 步驟 1：解析參數

從 `$ARGUMENTS` 解析 URL（必填）與選項：
- `--profile <key>`：持久化 user-data-dir 到 `~/.claude/browser-profiles/chrome-<key>/`
  - 不給 → 用暫存 profile（**預設**）
  - `--profile google` 可借用 /dlv 已登入的 Google profile（注意：唯讀心態，別亂動該 profile 的登入狀態，否則影響 /dlv）
- `--no-filter`：不過濾，記全部請求（預設只記 `xhr,fetch`，業務 API 通常在此）
- `--no-body`：不抓 response body（預設會抓）
- `--no-redact`：不遮蔽敏感資料。**預設會遮蔽**：
  - body 內的 key 含 password/token/secret/apikey/otp/cvv/ssn/auth/session/pin（含 camelCase 如 mdAccessToken）
  - headers：`Cookie` / `Set-Cookie` / `Authorization` / `Proxy-Authorization` / `x-api-key` / `x-auth-token` / `x-access-token`
- `--out <file>`：輸出 JSON 路徑（預設 `sniff-<timestamp>.json`）

### 步驟 2：啟動 capture

```bash
cd ~/claude_work/commands/sniff
unset NODE_EXTRA_CA_CERTS
node capture.mjs "<URL>" --filter xhr,fetch --body --out <OUTFILE> [--profile <key>]
```

**必須 `run_in_background: true`，timeout 1800000**（30 分鐘，給使用者操作時間）。

`--no-filter` → 拿掉 `--filter xhr,fetch`；`--no-body` → 拿掉 `--body`。

若 `npm i` 還沒跑過（`commands/sniff/node_modules` 不存在），先：
```bash
cd ~/claude_work/commands/sniff && unset NODE_EXTRA_CA_CERTS && npm i --strict-ssl=false
# Mac/Linux 上通常不需 --strict-ssl=false 與 unset NODE_EXTRA_CA_CERTS；該雷是 Windows 環境特定
```
SSL 問題見 `tech-notes/npm-ssl-cert-windows.md`。

### 步驟 3：提示使用者操作

明確告知（**很重要，別讓使用者按 Ctrl+C**）：

> 已開獨立 Chrome 視窗，正在錄製 network。請：
> 1. 在那個視窗操作你要分析的目標（點按鈕、填表單等）
> 2. 等網頁有反應（成功訊息、跳轉、錯誤都行）
> 3. **直接按 Chrome 視窗右上角 X 關掉**（不要按 Ctrl+C，也不要叫我停）
> 4. 然後回來說「關了」

理由：強砍 node 會跳過 SIGINT handler 導致 JSON 沒寫出；關視窗才會觸發 `browser.on('disconnected')` 乾淨收尾。詳見 `tech-notes/sniff-experiment-tradovate.md`。

### 步驟 4：分析 JSON

收到使用者「關了」通知後，讀 JSON 並分析。**關鍵：過濾噪音**。

預設先過濾掉這些埋點 host（業務 API 幾乎不會在這）：
- `*.google.com` / `google-analytics.com` / `googletagmanager.com` / `googleadservices.com`
- `sessions.bugsnag.com`
- `events.launchdarkly.com`
- `c.contentsquare.net`
- `siteintercept.qualtrics.com`
- `play.google.com/log`
- heap、segment、mixpanel、amplitude、hotjar、newrelic、datadog 等 telemetry

業務 API 的特徵：
- domain 與主站相近（例：`live.tradovateapi.com` 對應 `trader.tradovate.com`）
- path 含 `/v1/`、`/api/`、`/auth/`、`/graphql` 等
- payload 是業務語意明確的 JSON（含 email、id、表單欄位等）

用 Read 或 `node -e` 從 JSON 撈出 request/response。配對方式：同一個 `id` 表示 request 與其 response。

### 步驟 5：報告

給使用者：
1. **真正的業務 API**：method、URL、headers、payload、response status & body
2. **CORS 狀態**：response 有沒有 `Access-Control-Allow-Origin`、限不限制 origin
3. **可直接重放的 curl**：拼好讓使用者可貼 terminal 跑
4. **noise 統計**：「總共 N 筆，過濾掉 M 個埋點，剩 K 個業務相關」
5. （可選）若有多個業務 endpoint，逐個列出並猜測各自用途

## 注意事項

- 第一次跑某個 profile 時可能需要先用 `cookie-refresh.sh login` 登入（若要 sniff 需登入的網站）
- 同一個 profile 不可同時被 sniff 和 /dlv 開啟（Chrome 限制單 user-data-dir 單實例）
- JSON 可能很大（含 response body），分析時優先看 POST/PUT/PATCH、status >= 400、或 url 含明顯業務關鍵字的請求
- 若使用者沒指定 `--out`，提醒他 JSON 落點以便日後查
