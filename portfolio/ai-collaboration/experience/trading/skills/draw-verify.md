---
name: draw-verify
description: 繪圖數據驗證。從 TradingView 拉繪圖報價 + OHLCV K 線數據，讓使用者目視比對是否與畫面一致。觸發條件：使用者說「驗證繪圖」「確認報價」「draw verify」，或呼叫 /draw-verify。
allowed-tools: Bash, Read, Glob
---

# Draw Verify — 繪圖數據驗證

從 TradingView 拉取使用者畫的繪圖報價 + OHLCV K 線數據，輸出到終端讓使用者目視比對畫面。

## 參數

從使用者訊息中解析以下資訊：

| 參數 | 必填 | 說明 |
|------|------|------|
| keyword | 是（除非有 symbol） | 商品關鍵字（例：XAUUSD、NQ、黃金） |
| symbol | 否 | 直接指定券商代號（例：OANDA:XAUUSD），有的話跳過搜尋 |
| timeframe | 否 | K 線週期，預設 15。可選：5、15、60、240、1D |
| bars | 否 | 取幾根 K 線，預設 5 |
| from | 否 | 日期範圍起始（例：2026-04-01） |
| to | 否 | 日期範圍結束（例：2026-04-07） |

## 執行流程

### Step 1：組合參數並執行 script

根據使用者提供的資訊，組合 `draw-verify.mjs` 的參數：

```bash
# 基本用法（互動選擇券商）
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/draw-verify.mjs XAUUSD

# 直接指定券商
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/draw-verify.mjs --symbol FX:XAUUSD

# 指定週期和根數
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/draw-verify.mjs --symbol FX:XAUUSD --timeframe 60 --bars 10

# 指定日期範圍
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/draw-verify.mjs --symbol FX:XAUUSD --from 2026-04-01 --to 2026-04-07
```

如果使用者說了券商名但不知道代號，先用關鍵字搜尋：
- 使用者說「FXCM 的黃金」→ 搜尋 XAUUSD，結果中找 FX:XAUUSD（FXCM）
- 使用者說「OANDA 的 NQ」→ 搜尋 NQ，結果中找 OANDA 開頭的

如果需要互動選擇，用 `echo "編號" | node draw-verify.mjs` 帶入選擇。

### Step 2：回報結果

將 script 輸出整理回報給使用者：

1. **繪圖報價** — 列出該 symbol 的所有繪圖：類型、價格、時間（UTC+8）
2. **OHLCV K 線** — 列出 K 線數據：時間、Open、High、Low、Close、Volume（UTC+8）
3. 請使用者對照 TradingView 畫面確認數據一致

### Step 3：確認結果

- 使用者說「對」「一致」→ 數據源可信，可以進行下一步
- 使用者說「不對」→ 詢問哪裡不一致，排查問題（cookie 過期？symbol 錯誤？layout 不對？）

## 注意事項

- 所有時間輸出固定為 UTC+8（台灣），與使用者 TradingView 圖表時區一致
- 繪圖三層過濾：symbol → visible（隱藏/顯示）→ --from/--to（時間範圍）
- 使用 --from/--to 可以專注在特定時間段，避免不同主題的繪圖互相干擾（概念教學時很重要）
- K 線週期對照：5m=5、15m=15、1H=60、4H=240、1D=1D
- Script 位置：`Forex_program/tools/pine-validator/draw-verify.mjs`
