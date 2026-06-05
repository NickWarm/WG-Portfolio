# WG-SOP MTF — 支撐壓力線 & 開盤首K 開發歷程


Eli 老師有兩個官方看不到程式碼，用授權的 TradingView 指標
- [破框策略指標](https://www.youtube.com/watch?v=UPiurxFL-qc)
- [首Ｋ策略指標](https://youtu.be/4oAKOBbKmBk?si=h0J1MWC1Vpc5QKxe)


我們透過截圖觀察、設定面板逆向、Bar Replay 回放比對、NLM 課程逐字稿查詢等方式研究其行為，再用自己的方式在 WG-SOP MTF 中重現。



本文聚焦在 WG-SOP MTF 中 S/R 撐壓線和開盤首K 的**實作開發歷程**。

---

## 第零階段：從社群 Open Source 出發

在動手寫之前，我先用 `gh` 搜尋 TradingView 社群和 GitHub 上的開源 Pine Script，找到功能相近的參考程式碼：

| 功能 | 參考來源 | GitHub |
|------|---------|--------|
| S/R 撐壓線 | mitchell-917 / `support-resistance-zones.pine` | [tradingview-pinescript-lab](https://github.com/mitchell-917/tradingview-pinescript-lab) |
| 開盤首K | mitchell-917 / `session-high-low-indicator.pine` | 同上 |

**S/R 參考程式碼提供了**：Pivot 偵測（`ta.pivothigh` / `ta.pivotlow`）、S/R 線繪製、合併邏輯的通用寫法。

**首K 參考程式碼提供了**：`input.session()` + `time()` 的 Session 時間判定模式、高低點追蹤。

這些是通用的 Pine Script 寫法，我保留了這些架構，再根據 Eli 官方指標的行為（截圖觀察、設定面板逆向、Bar Replay 回放比對、NLM 課程查詢）改成 Eli 的規則 — 不同的時區數量、不同的 PivotLen、不同的合併邏輯、不同的時間定義。

---

## 第一階段：首K 首次實作（2026-04-15，MTF v3.1）

### 做了什麼

在 WG-SOP MTF 加入開盤首K功能，基於修正後的認知（只有一個，06:00-07:00）。

### 實作方式

- 用 `request.security("15", calcOpeningK())` 強制在 15M 時區上算
- 4 根 15M K 棒（06:00~07:00）的高低點組成首K框
- 粉紅框 + 紫色底色，永久畫（`box.new()` 一次，不重畫）
- `OpeningK` UDT 封裝 startTime / boxHigh / boxLow

### 踩到的坑

後來發現 `request.security("15", ...)` 在非 15M 圖表上的 `[1]` 偏移語義不同：
- 15M 圖表：`[1]` = 上一根 15M bar ✅
- 1H 圖表：`[1]` = 上一根 1H bar ❌（不是上一根 15M）
- 導致 `openK_count == 4 and nz(openK_count[1]) != 4` 在 1H 圖表永遠不觸發

---

## 第二階段：S/R 撐壓線實作（2026-04-17 ~ 04-18，MTF v3.7）

### 做了什麼

根據 Eli 的 L1-L5 五色五層設計，實作多時區支撐壓力線。

### 實作方式

- 6 個時區（比 Eli 多一層 1W）：1W / 1D / 4H / 1H / 15m / 5m
- 每時區獨立開關 + Prev toggle + 顏色
- PivotLen：1W/1D/4H 用 3，1H/15m/5m 用 5（對齊 Eli 設定）
- 用 `request.security` 取各時區的 `ta.pivothigh/low`
- 小時區接近大時區時自動隱藏（合併顯示），大時區 label 顯示合併文字

### 跟 Eli 官方的差異（有意為之）

| 項目 | Eli 官方 | WG-SOP MTF | 原因 |
|------|---------|------------|------|
| 時區數 | 5（5M ~ 1D） | 6（加 1W） | WG 交易需要看週線壓力 |
| 線寬 | 7（寬帶） | 1-2（細線） | 寬帶在多時區同時開時太雜亂 |
| 透明度 | 77% | 0%（純色） | 配合細線，純色更清楚 |
| 合併容許 | 不明 | 可調（預設 $0） | 讓使用者自己決定合併敏感度 |
| Prev 線 | 不明 | 有（獨立 toggle） | 看前一組 pivot 位置 |

### Code Review 發現的問題

v3.7 第一版有嚴重的 DRY 違反：
- 48 個散落的 `var` 變數（沒有 UDT）
- 合併邏輯重複 6 次
- 繪圖 code 重複 6 次
- 加一個新時區要改 20+ 處

### 五階段重構

| Stage | 改動 | 行數 |
|-------|------|------|
| 1 | 加 `PivotLevels` UDT + `srLevels` array | +100 |
| 2 | 合併 _draw + merge text 改迴圈 | -13 |
| 3 | 繪圖改迴圈 + `map<string,line>` 管理 | -52 |
| 4+5 | 清理相容層 + 精簡 updateLevel | -55 |
| **合計** | 1159 → 1054 行（-9%） | -105 |

重構後加新時區只需改 2 處。

### Pine Script 踩坑記錄

| 坑 | 症狀 | 解法 |
|----|------|------|
| 函數隱式 return 型別不一致 | CE10163 | 函數尾加 `int(0)` 統一 |
| `map.remove()` 對不存在的 key | runtime error | 先 `map.contains()` |
| `array.from()` 每 bar 建新 array | 記憶體洩漏 | 用 `var` + `.set()` |

---

## 第三階段：首K 修正 + S/R 微調（2026-04-19 ~ 04-28）

### 首K 回放閃爍修復（v3.8，04-19）

- 問題：回放模式下首K框忽然消失再出現
- 根因：每 bar 全砍重畫 → 改為「畫一次就持久」（`box.new()` 一次，靠 `max_boxes_count=500` 自動管理）

### 首K 跨時區 bug 修復（v3.21，04-28）

- 問題：1H 圖表看不到首K框
- 根因：`request.security("15", ...)` 的 `[1]` 語義（見第一階段踩坑）
- 修正：拿掉 `request.security`，改用 `hour(time, "UTC+8") == 6` 直接判斷 1H bar
- 效果：所有圖表時區（5m ~ 4H）都能正確顯示首K

### S/R 微調

| 版本 | 改動 |
|------|------|
| v3.21 | 1H pivot 從 `close` 改用 `high/low`（對齊 Eli 設定） |
| v3.21 | 合併容許 $5 → $0（預設不合併，使用者自訂） |
| v3.21 | SR Prev 預設全部關閉（減少畫面雜訊） |
| v3.22 | 抽 `drawAllSR` helper 消除三處繪圖重複 |
| v3.22 | z-order 優化：只在 pivot 變化時重建線條（不再每 bar 重畫 24 條線） |

### S/R z-order 問題

- 問題：5m 的線永遠畫在最上面（蓋住大時區）
- 根因：Pine Script z-order 取決於物件建立順序，5m 每 bar 重建所以永遠最新
- 解法：在 `barstate.islast` 時按 5m → 15m → 1H → 4H → 1D → 1W 順序重建所有線條

---

## 第四階段：Bar Aggregation — 消除 request.security（2026-04-29，v3.23 ~ v3.24）

### 為什麼要做

- MTF 版用了 12 個 `request.security`（S/R 6 個 + 首K 1 個 + calcCore 5 個）
- 大時區看小時區（如 1H 圖看 5m）會 memory limit exceeded
- `request.security` 載入整個目標時區歷史到記憶體

### 怎麼做

分三個 Phase 逐步消除：

| Phase | 功能 | RS 數量 | 做法 |
|-------|------|---------|------|
| 1 | 開盤首K | 12→11 | `hour(time)==6` 本地判斷，不再 RS("15") |
| 2 | S/R Pivot | 11→5 | `PivotAggState` UDT + 手動 OHLC 合成 + 手動 pivot 偵測 |
| 3 | calcCore×5 | 5→0 | `CoreAggState` UDT + array-based zigzag/cons/breakout |

### Phase 2 的核心概念（S/R 相關）

取代 `request.security("60", ta.pivothigh(high, 5, 5))` 的方式：

1. 在每根 chart bar 上手動合成目標時區的 OHLC（用 `timeframe.change()` 偵測新 bar）
2. 合成的 OHLC 存進 array（歷史 1002 根）
3. 用 array 回溯取代 `ta.pivothigh`（找左邊 N 根 + 右邊 N 根的最高/最低）

### 本地驗證

每個 Phase 都有 JS 模擬腳本驗證準確度：

| 腳本 | 驗證內容 | 結果 |
|------|---------|------|
| `sim-bar-aggregation.mjs` | OHLC 合成 | 15m 99.9%、1H 99.1% |
| `sim-pivot-aggregation.mjs` | Pivot 偵測 | 15m/1H 100%、4H 95% |
| `sim-core-aggregation.mjs` | calcCore 完整邏輯 | OHLC 100%、zigzag 100% |

4H 的 95% 差異來自 bar 邊界對齊（手動計算 vs TradingView 內部對齊的微小差異）。

---

## 第五階段：Code Review + 最終修正（2026-04-30 ~ 05-06，v3.25 ~ v3.26）

### v3.25 Code Review 清理

基於 `/psbp review-only` 的 6 項發現：

| 項目 | 改動 |
|------|------|
| 刪 8 個死函數 | -270 行（Bar Aggregation 後舊函數不再使用） |
| bar 邊界修正 | 手動 `hour%4` → `timeframe.change("240")`（修復 4H pivot 跨時區不一致） |
| 抽 `runTfCore` helper | 5 塊重複的 CALL CORE → 5 行呼叫 |
| 抽 `findClusterEdge` | 重複的邊界計算邏輯合併 |

總計 1692 → 1355 行（-20%）。

### v3.26 大時區 Pivot 修正

- 問題：1H 圖表看不到 1D Pivot Low（Eli 指標有顯示 D Pivot Low 4643.3）
- 根因：使用者設「最近 7 天」+ 7 天 buffer = 14 天。但 1D pivotLen=3 需要右邊 3 根日線確認，4/13 的 pivot low 在 4/16 才確認，4/16 在 14 天前之外
- 修正：1W/1D 的 `aggPivotBar`/`directPivotUpdate` 永遠傳 `true`，不受 `inCalcRange` 限制
- 理由：大時區 pivot 變化慢（1D 一天最多 1 次），計算量極小不需過濾

---

## 現狀總結（v3.26）

### S/R 撐壓線

- 6 個時區（1W/1D/4H/1H/15m/5m），每個獨立開關 + Prev + 顏色
- 0 個 `request.security`（全 Bar Aggregation）
- `PivotLevels` UDT + `srLevels` array + `drawAllSR` helper
- z-order：大時區線在上，5m 在最下
- 合併：可調容許值，大時區 label 顯示合併文字
- 1W/1D pivot 永遠計算，不受「最近 N 天」限制

### 開盤首K

- 唯一（06:00-07:00 UTC+8），1H bar 直接判斷
- 0 個 `request.security`
- 永久框（畫一次不刪），所有圖表時區可見
- `OpeningK` UDT 封裝

### 數字

| 指標 | 初版行數 | 現在行數 | request.security |
|------|---------|---------|-----------------|
| S/R | ~300（v3.7） | ~200（v3.26） | 6 → 0 |
| 首K | ~80（v3.1） | ~50（v3.26） | 1 → 0 |
