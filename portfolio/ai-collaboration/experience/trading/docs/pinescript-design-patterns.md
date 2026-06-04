# Pine Script 設計模式與最佳實踐

> 來源：GitHub 社群研究（2026-03-31）
> 主要參考：
>   - **⭐ [williamskrzypczak/WTT_Bias](https://github.com/williamskrzypczak/WTT_Bias)** — 完整的 Pine Script 軟體工程規範（10 章）
>   - [Electrified-Trading/Libraries](https://github.com/Electrified-Trading/Libraries) — 高品質 PineScript 函式庫集合
>   - [Dskyz DAFE Collection](https://github.com/ainell-owi/Dskyz-DAFE-open-source-collection-) — 進階架構教學（LEARNING_GUIDE.md）
>   - [TradersPost/pine-mcp](https://github.com/TradersPost/pine-mcp) — Pine Script 官方文檔整理

---

## ⭐ 軟體工程最佳實踐（來源：WTT_Bias）

完整的 Pine Script 開發規範，10 個章節，涵蓋軟體工程核心原則：

### 檔案結構（標準順序）

```
1. 版本宣告 + indicator/strategy
2. 版權 + 版本歷史 + 描述
3. Input 參數（按群組）
4. 常數與設定
5. Helper 計算
6. 主邏輯與條件
7. 視覺輸出（plot/shape/table）
8. Alerts
```

### 命名規範

| 類型 | 規範 | 範例 |
|------|------|------|
| 變數 | camelCase | `atrValue`, `movementRatio` |
| Boolean | 前綴動詞 | `isUptrend`, `hasVolume`, `shouldAlert`, `canTrade` |
| 常數 | UPPERCASE | `MAX_BARS`, `DEFAULT_COLOR` |
| 顏色 | 後綴 Color | `bullishColor`, `bearishColor` |
| Input | 描述性名稱 | `atrPeriod`（不是 `atr`） |

### Separation of Concerns（關注點分離）

```pinescript
// ============= CALCULATIONS - TREND =============
smaTrend = ta.sma(close, 20)
isUptrend = close > smaTrend

// ============= CALCULATIONS - VOLATILITY =============
atrValue = ta.atr(14)

// ============= VISUAL ELEMENTS =============
// 只有 plot，不做計算
plot(smaTrend, color = isUptrend ? color.green : color.red)
```

### 模組化封裝（OOP-Inspired）

```pinescript
// ============= MODULE: VOLUME ANALYSIS =============
// Inputs
volumeLookback = input.int(20, "Volume Lookback", group = "Volume")
useVolumeFilter = input.bool(true, "Use Volume Filter", group = "Volume")

// Calculations
avgVolume = ta.sma(volume, volumeLookback)
volumeConfirm = not useVolumeFilter or (volume > avgVolume)

// 結果：volumeConfirm 供其他模組使用
```

### 必做的安全檢查

```pinescript
// 除以零保護
ratio = denominator > 0 ? numerator / denominator : 0

// NA 值處理
validData = not na(close) and not na(close[1])

// 歷史資料足夠性
hasEnoughBars = bar_index >= lookbackPeriod

// Label 記憶體管理（刪舊建新）
var label myLabel = na
if condition
    label.delete(myLabel)
    myLabel := label.new(...)
```

### 註解原則

```pinescript
// ✅ 解釋「為什麼」
ratio = atrValue > 0 ? movement / atrValue : 1.0  // 避免除以零

// ❌ 解釋「什麼」（多餘）
ratio = movement / atrValue  // 計算比率
```

### 測試 Checklist

- [ ] 編譯無錯誤
- [ ] 不同時區都能用
- [ ] 低流動性商品能用
- [ ] 無記憶體洩漏（label/line 有刪除）
- [ ] Alert 正常
- [ ] Input 有 min/max 驗證
- [ ] 亮色/暗色主題都清楚
- [ ] Tooltip 有用
- [ ] 早期 bar 不 runtime error

---

---

## 1. Library 模式（最重要的重構工具）

Pine Script v5/v6 支援 **library** — 可以把常用的函數和類型獨立發布，其他腳本 import 使用。

```pinescript
//@version=6
library("MyLib", overlay=true)

// 匯出類型
export type Trade
    float size
    float price
    int time

// 匯出函數
export hi(float val = high) =>
    var float ath = val
    ath := math.max(ath, val)
```

使用時：
```pinescript
import username/MyLib/1 as Lib
myTrade = Lib.Trade.new(0.01, close, time)
```

**對我們的價值**：
- 風控計算機可以做成 library（任何腳本 import）
- 撐壓線計算可以做成 library
- deprecated-eli-master 可以拆成多個 library 組合

---

## 2. User-Defined Types（UDT）

用 `type` 定義資料結構，讓程式碼更清晰：

```pinescript
// 來源：Electrified-Trading/Libraries/Position.pine
export type Position
    float size
    float price
    float value
    int start
    float net
    Trade[] history
```

**對我們的價值**：
- `BoxState` 類型（boxHigh, boxLow, resistBot, supportTop, isValid）
- `SessionState` 類型（首K高低、偏向、是否突破）
- 取代散落的 var float 變數，一個 type 包起來

---

## 3. Signal Filter Pipeline（信號過濾管道）

來源：Dskyz DAFE Collection §15

不要在一個大 if 裡放所有條件。拆成獨立的 filter，各自回傳 bool：

```pinescript
// 每個 filter 獨立計算
bool vol_ok = volume > ta.sma(volume, 20)
bool trend_ok = trendBias != 0
bool rr_ok = longRR >= 1.5
bool ok_bias = okBias != 0

// 最後組合
bool canEntry = vol_ok and trend_ok and rr_ok and ok_bias
```

**對我們的價值**：
- Eli 系統的「三位一體」（首K + 撐壓 + PLT）就是 filter pipeline
- 每個子流程的判斷結果可以是獨立的 bool filter
- 容易開關（debug toggle）和擴充

---

## 4. Modular Algorithm Selection（模組化演算法選擇）

來源：Dskyz DAFE Collection §14

用 `input.string` 下拉選單選擇不同演算法：

```pinescript
maType = input.string("EMA", options=["SMA","EMA","WMA","Hull"])

getMA(src, len) =>
    switch maType
        "SMA" => ta.sma(src, len)
        "EMA" => ta.ema(src, len)
        "WMA" => ta.wma(src, len)
        "Hull" => ta.hma(src, len)
```

**對我們的價值**：
- 盤整偵測方式可以選擇（pivot based vs range based）
- 撐壓線類型可以選擇
- 進場方式可以選擇（B 回測 vs C 掛單）

---

## 5. Multi-Timeframe Architecture（多時區架構）

來源：Dskyz DAFE Collection §18

用 UDT 封裝每個時區的狀態：

```pinescript
export type TimeframeStructure
    string tf
    float poc
    float vah
    float val_
    array<StructureLevel> levels
```

**對我們的價值**：
- 4H/1H/15M 框的狀態可以用同一個 type
- `FrameState` 類型包含 boxH/boxL/pivots/cons 等
- 減少重複 code（目前 4H 和 1H 的邏輯幾乎一樣但各寫一遍）

---

## 6. Layered Architecture（分層架構）

來源：Dskyz DAFE Collection §20

```
┌─────────────────────────────────────────────┐
│ LAYER 1: RAW DATA                           │
│ OHLCV + request.security()                  │
├─────────────────────────────────────────────┤
│ LAYER 2: FEATURE ENGINEERING                │
│ Pivot detection, ATR, session time          │
├─────────────────────────────────────────────┤
│ LAYER 3: STRUCTURAL ANALYSIS                │
│ Box detection, trend bias, PLT             │
├─────────────────────────────────────────────┤
│ LAYER 4: SIGNAL GENERATION                  │
│ Entry/exit signals, R:R check              │
├─────────────────────────────────────────────┤
│ LAYER 5: VISUALIZATION                      │
│ Boxes, lines, labels, dashboard            │
└─────────────────────────────────────────────┘
```

**對我們的價值**：
- deprecated-eli-master.pine 目前是「全部混在一起」
- 應該拆成清楚的層次：數據 → 分析 → 信號 → 視覺
- 每層可以獨立測試

---

## 7. Theme / Visualization Engine（視覺引擎）

來源：Dskyz DAFE Collection §16

用 UDT 封裝視覺設定：

```pinescript
export type Theme
    color primary
    color secondary
    color alert
    color bullish
    color bearish
```

**對我們的價值**：
- 統一管理所有顏色（目前散落在各 box.new/plot 裡）
- 切換主題只改一個 Theme 物件

---

## 對 deprecated-eli-master.pine 重構的建議

### 短期（不改架構）
1. 把重複的 4H/1H 框邏輯用函數封裝
2. 用 Signal Filter Pipeline 組合進場條件
3. 統一顏色管理

### 中期（拆 library）
1. 風控計算機 → 獨立 library（invite-only）
2. 撐壓線計算 → 獨立 library
3. 首K/時區 → 獨立 library

### 長期（完整重構）
1. 用 UDT 封裝每個子流程的狀態
2. 分層架構（數據 → 分析 → 信號 → 視覺）
3. 主腳本只做組合，邏輯在 library 裡
