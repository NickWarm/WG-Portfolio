# 透過繪圖提取指標數值

> 日期：2026-04-15
> 更新：2026-04-16（決議隱藏標記方案 + 工具已驗證）
> 相關：`tradingview-indicator-graphic-extraction.md`
> 目的：繞過 Pine Script 沙盒限制，讓不同指標的邏輯可以比對交集

## Pine Script 的沙盒限制

Pine Script 指標之間**不能傳遞資料**：
- 每個 indicator 獨立執行，無法讀取其他 indicator 的變數
- 不能存到檔案 / DB / 外部儲存
- 唯一共享方式是發佈成 Library（需公開發佈）

## 繞過限制：透過繪圖編碼

Pine Script 的繪圖（box / label / line）**可以被外部 script 讀取**（透過 `@mathieuc/tradingview`，見 `tradingview-indicator-graphic-extraction.md`）。

指標的數值本身就編碼在繪圖座標中（box top/bottom = consHigh/consLow），加上隱藏標記即可讓外部程式直接辨識類型。

## 隱藏標記方案（2026-04-16 決議）✅

### 原則

在繪圖物件中加入**肉眼不可見、API 可讀取**的類型標記，不影響視覺。

### 三種物件的標記方式

| 物件 | 標記欄位 | 隱藏方式 | 視覺影響 |
|------|---------|---------|---------|
| box | `text` | `textcolor=color.new(color.white, 100)`（完全透明） | 無 |
| label | `tooltip` | 不 hover 不會顯示 | 無 |
| line | 不加標記 | 靠配對的 label tooltip 定位 | 無 |

### 為什麼不用其他方案

| 方案 | 問題 |
|------|------|
| 靠 color code 猜類型 | TradingView 的 color 內部編碼不穩定，且使用者改顏色就壞 |
| 靠 style (dashed/dotted) 猜 | 多種功能共用同一種 style，容易混淆 |
| 靠 id | TradingView 自動給的遞增編號，不可控 |
| label text 塞標記 | text 有顯示用途，會影響視覺 |

### 命名規則（強制規範）

**通用格式**：`{TYPE}_{MODIFIER1}_{MODIFIER2}_..._{VALUE}`

**規則**：
1. **用 underscore `_` 當分隔符**（絕對不能用空格）
2. **無空格**：如 `Pivot High` 要縮寫成 `PH`、`Pivot Low` → `PL`
3. **前綴固定**：`TYPE` 全大寫，方便用 `startsWith` filter
4. **欄位選擇**：
   - `box` 物件：用 `text` 欄位 + `text_color=color.new(color.white, 100)`（完全透明）
   - `label` 物件：用 `tooltip` 欄位（不 hover 不顯示）
   - `line` 物件：沒有 text/tooltip，靠配對的 box/label 的 tag 定位

### 已定義的 TYPE 清單

| TYPE | 物件 | 格式 | 範例 |
|------|------|------|------|
| `CONS` | box text | `CONS_{tf}` | `CONS_15m` |
| `OPENK` | box text | `OPENK` | `OPENK` |
| `SESSION` | box text + label tooltip | `SESSION_{name}` | `SESSION_亞洲盤` |
| `BREAKOUT` | label tooltip | `BREAKOUT_{tf}_{UP\|DOWN}` | `BREAKOUT_15m_UP` |
| `ADAM` | label tooltip | `ADAM_{tf}_{price}` | `ADAM_15m_4834.74` |
| `SR` | label tooltip | `SR_{tf}_{PH\|PL\|PrevH\|PrevL}_{price}` | `SR_1H_PH_4800.50` |

### Line 配對規則

Line 沒有 tooltip，靠空間配對：

| Line | 配對物件 | 配對方式 |
|------|---------|---------|
| 亞當目標線 | ADAM label | 同 y 值 |
| 測量線 | BREAKOUT label | 同 x 時間 |
| Session 高低線 | SESSION box | 同時間範圍 + y=box top/bottom |
| 06:00 垂直線 | OPENK box | 同 x 時間 |
| S/R 水平線 | SR label | 同 y 值 |

### 新功能加 TYPE 的規則

新功能要加 hidden tag 時：
1. 選一個未被占用的大寫 TYPE 名（如 `TREND`、`DIVERG`）
2. 確認格式符合「無空格、`_` 分隔」
3. 把 TYPE 加到上表
4. 用 `/ig --text "{TYPE}_"` 驗證能被抓到

### 外部解析（一行搞定）

```javascript
const consBoxes = boxes.filter(b => b.text.startsWith('CONS_'));
const adamLabels = labels.filter(l => l.toolTip.startsWith('ADAM_'));
const breakouts = labels.filter(l => l.toolTip.startsWith('BREAKOUT_'));
const srLabels = labels.filter(l => l.toolTip.startsWith('SR_'));
```

### 外部解析（一行搞定）

```javascript
const consBoxes = boxes.filter(b => b.text.startsWith('CONS_'));
const adamLabels = labels.filter(l => l.toolTip.startsWith('ADAM_'));
const breakouts = labels.filter(l => l.toolTip.startsWith('BREAKOUT_'));
```

## 限制

- **只能撈自己發佈的指標**（USER / PUB），Eli invite-only 不行
- **只能靜態讀取**（指標計算後的輸出），無法即時互動
- 需要指標發佈到 TradingView

## 應用：兩個邏輯的交集

目標：讓進場/出場位址更準確，結合多個指標的判斷。

### 範例場景

**場景 1：翻亞當目標 ≈ 撐壓線**
- 盤整指標算出亞當目標價 4765
- 撐壓線指標畫出 4763-4768 的壓力區
- 交集 → 高可信度的出場點

**場景 2：盤整框 ≈ Session 高/低**
- v1.4 盤整框 4700-4728
- 亞洲盤 high 4730
- 兩者接近 → 進場 / 出場參考點

**場景 3：MTF 校準**
- 1H 翻亞當目標 ≈ 15m 盤整邊緣
- 已在 MTF 版實作（⭐ 校準標記）

### 實作方式

**選項 A：合併到單一 indicator**（目前做法）
- 把所有邏輯寫在同一個 .pine 檔案
- 內部直接共享變數（`consHigh`、`adamTarget`、`sessionAZones` 等）
- 優點：簡單、即時
- 缺點：檔案會很大

**選項 B：多個 indicator + 外部整合**（已有工具基礎）
- 各自指標獨立發佈
- `fetch-indicator-graphic.mjs` 讀每個指標的 graphic（已驗證 ✅）
- 隱藏標記讓外部程式直接辨識類型（已決議 ✅）
- 程式算交集，再回饋到某個儀表板 / alert
- 優點：模組化、可組合
- 缺點：需要外部程式、不是即時

## 目前狀態

- 已實作 **選項 A**：`consolidation_adam.pine` 內部整合盤整/突破/翻亞當/首K/Session
- 選項 B 工具鏈已就緒：
  - ✅ `fetch-indicator-graphic.mjs` — 取得指標繪圖（指定名稱 + 時間範圍 + 類型/文字過濾 + JSON 輸出）
  - ✅ 隱藏標記方案已決議（box text 透明 + label tooltip）
  - ✅ MTF 版 Pine Script 已加入隱藏標記（v3.6）
  - ✅ 一般版 Pine Script 已加入隱藏標記（v1.6）
  - ✅ `fetch-indicator-graphic.mjs` 已能讀取 tag（box text + label toolTip）
  - ✅ `/ig` skill 已建立（指標繪圖提取，支援隱藏標記辨識）

## 全部完成 ✅
