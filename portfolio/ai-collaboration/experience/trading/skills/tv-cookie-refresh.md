---
name: tv-cookie-refresh
description: 當 TradingView Chart Scraper MCP 回傳認證錯誤（session expired、invalid session、authentication failed）時觸發。自動檢查並更新 TradingView session cookie。也可由使用者主動要求「更新 TradingView cookie」時觸發。
allowed-tools: Bash, Read, Edit
---

# TradingView Cookie 自動更新

當 TradingView Chart Scraper MCP 因 cookie 過期報錯時，執行以下修復流程。

## 步驟一：診斷

確認錯誤訊息包含以下關鍵字之一，確定是 cookie 過期問題：
- `session expired`
- `invalid session`
- `authentication failed`
- `Wrong or expired sessionid`

如果錯誤訊息不符合以上，告知使用者這可能不是 cookie 問題，不執行後續步驟。

## 步驟二：檢查 Chrome cookie

執行以下指令檢查本地 Chrome 是否有 TradingView cookie：

```bash
/Users/nicholas/Desktop/Trading/Forex_program/tradingview-chart-mcp/.venv/bin/python3 -c "
import rookiepy
cookies = rookiepy.chrome(domains=['tradingview.com'])
session_id = [c for c in cookies if c.get('name') == 'sessionid']
session_id_sign = [c for c in cookies if c.get('name') == 'sessionid_sign']
if session_id and session_id_sign:
    print('COOKIE_FOUND')
    print(f'sessionid length: {len(session_id[0][\"value\"])}')
    print(f'sessionid_sign length: {len(session_id_sign[0][\"value\"])}')
else:
    missing = []
    if not session_id: missing.append('sessionid')
    if not session_id_sign: missing.append('sessionid_sign')
    print(f'COOKIE_MISSING: {', '.join(missing)}')
"
```

### 如果 COOKIE_FOUND

Cookie 存在但已過期。請使用者：
1. 開啟 Chrome
2. 前往 https://www.tradingview.com/
3. 如果已登出，重新登入
4. 如果已登入，登出後重新登入（強制更新 cookie）
5. 確認登入成功後通知 Claude

### 如果 COOKIE_MISSING

Cookie 不存在。請使用者：
1. 開啟 Chrome
2. 前往 https://www.tradingview.com/
3. 登入帳號
4. 確認登入成功後通知 Claude

## 步驟三：驗證 cookie 已更新

使用者確認已重新登入後，再次執行步驟二的指令。

- 如果 `COOKIE_FOUND` → 繼續步驟四
- 如果 `COOKIE_MISSING` → 告知使用者 cookie 仍未取得，請確認是否登入成功

## 步驟四：重載 MCP server

告知使用者：

> 請在 Claude Code 中執行 `/mcp` 指令重載 MCP 設定，讓 Chart Scraper 讀取新的 cookie。

## 步驟五：驗證修復

使用者重載 MCP 後，嘗試執行一次 Chart Scraper 請求（例如取得任意 ticker 的圖表）。

- 成功 → 告知使用者問題已修復
- 失敗 → 回報錯誤訊息，可能是其他問題（網路、TradingView 服務異常等）
