---
description: 每日增量 K 線歸檔（1W/1D/4H/1H/15m/5m/1m）
---

# Chart Archive — 每日增量 K 線歸檔

從 TradingView 撈 OHLCV K 線資料，增量存到本地 `data/archive/`。

## 參數

從使用者訊息解析：

| 參數 | 必填 | 說明 |
|------|------|------|
| mode | 否 | `init`（初次匯入）/ `status`（查狀態）/ 空（增量更新，預設） |
| symbol | 否 | 商品代號，預設 `FX:XAUUSD` |

## 執行流程

### 增量更新（預設）

```bash
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/chart-archive.mjs --symbol FX:XAUUSD
```

讀 `meta.json` 取各 TF 的 `lastBarTime`，只撈之後的新資料。新商品首次執行會自動從 2026-02-01 開始撈歷史，不需要先 init。

### 初次匯入（可選）

```bash
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/chart-archive.mjs --symbol FX:XAUUSD --init
```

將 `docs/strategies/wg-concepts/examples/context-*.json` 的現有資料匯入歸檔。僅用於有既存本地 JSON 時加速，非必要步驟。

### 查狀態

```bash
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/chart-archive.mjs --symbol FX:XAUUSD --status
```

## 回報結果

執行後回報：
1. 各 TF 新增幾根、總共幾根
2. 最早/最晚時間
3. 如有錯誤（cookie 過期等）提示使用者

## 儲存位置

- 歸檔目錄：`data/archive/FXXAUUSD/`
- 各 TF 分檔：`1W.json`、`1D.json`、`4H.json`、`1H.json`、`15m.json`、`5m.json`、`1m.json`
- 增量追蹤：`meta.json`
