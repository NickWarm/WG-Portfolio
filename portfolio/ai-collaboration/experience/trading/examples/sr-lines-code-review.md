# S/R 線 Code Review

> 日期：2026-04-18
> 對象：v1.7 + MTF v3.7 的 S/R 線（calcPivotLines + updateSRLine + 合併邏輯）
> 參考標準：`docs/learning/pinescript-design-patterns.md`（WTT_Bias + Dskyz DAFE）
> 目的：效能 + 社群慣例檢查

## 符合規範的部分 ✅

### 檔案結構
- Input 按群組（`GRP_SR`）✅
- 常數與設定區隔開 ✅
- Helper 函數集中（`calcPivotLines`, `isNearAny`, `isNear`, `updateSRLine`）✅
- 視覺輸出分 SECTION 9 ✅

### 命名規範
- Boolean 有前綴：`i_showSR`, `_is5mChart`（舊）✅
- Input 描述性：`i_srMergeTol`, `i_srWPrev` ✅
- camelCase：`calcPivotLines`, `updateSRLine` ✅
- `var` 變數 scope 用底線前綴（`_h1`, `_l1t`）✅

### 安全檢查
- na 防護：`not na(price)`, `not na(pivotTime)` ✅
- Label 記憶體管理：`label.delete` + 重建 ✅
- 函數封裝：`calcPivotLines` / `updateSRLine` ✅

## 需要改進的部分 ⚠️

### 1. 重複 code（Critical - DRY 違反）

**問題**：合併 `_draw` 變數（16 行）+ merge text（~100 行）高度重複，每個時區寫一次。

**影響**：
- 加新時區（如 30m）需要改 10+ 處
- bug 風險高（改一處漏改另一處）
- 維護成本高

**建議**：用 UDT 封裝每個時區狀態 + 迴圈處理
```pinescript
type SRLevel
    string name
    float h1
    float l1
    int h1t
    int l1t
    color c
    bool enabled
    bool prev
```

### 2. var line/label 太多（Major）

**問題**：40+ 個 `var line` / `var label` 散落在 Section 9 開頭。

```pinescript
var line srWH = na, var line srWL = na, var label srLblWH = na, var label srLblWL = na
var line srWH2 = na, var line srWL2 = na, var label srLblWH2 = na, var label srLblWL2 = na
... (10 行)
```

**建議**：用 `array<line>` + `array<label>`，或 `map<string, line>`：
```pinescript
var map<string, line> srLines = map.new<string, line>()
var map<string, label> srLabels = map.new<string, label>()
```

### 3. `isNearAny` 設計不夠彈性（Major）

**問題**：固定 8 個參數，不能擴展。未來加更多時區或跨 h2/l2 比較會超過。

**建議**：改成 array 參數
```pinescript
isNearAny(float price, array<float> others, float tol) =>
    bool _r = false
    for v in others
        if not na(v) and math.abs(price - v) <= tol
            _r := true
            break  // 早退出效能更好
    _r
```

### 4. 效能隱憂（Minor）

**6 個 request.security**：目前 S/R 用 6 個（1W/1D/4H/1H/15m/5m），加上 calcCore 的 4 個（MTF 版）、calcOpeningK 的 1 個 = **MTF 版共 11 個**。Pine Script 上限 40 個，還有空間但接近中段。

**合併判斷每根 bar 都跑**：16 個 `_draw` 變數 + ~50 個 `isNear` 呼叫 per bar。實測應該沒問題但可優化。

**建議**：`isNear` / `isNearAny` 改成 `inline` 或早退出 break。

### 5. SECTION 註解不一致（Minor）

一般版有 `// SECTION 4/5/6...`，但 Section 9 的 S/R 沒用 `// SECTION` 前綴，而是用 `// ============= 視覺化 — 支撐壓力線 =============`。

**建議**：統一用 `// SECTION 9: 視覺化 — 支撐壓力線`。

### 6. 沒有 UDT（Major）

calcCore 有 `AdamTarget`, `Consolidation` UDT，但 S/R 沒有。散落的 `pv{tf}_h1/h2/l1/l2 + _h1t/...` 變數多達 48 個。

**建議**：定義 `PivotLevels` UDT：
```pinescript
type PivotLevels
    float h1
    float h2
    float l1
    float l2
    int h1t
    int h2t
    int l1t
    int l2t
```

## 總結

| 項目 | 狀態 |
|------|------|
| 編譯 / 執行 | ✅ 正常 |
| 視覺正確性 | ✅ 已驗證 |
| 效能 | 🟡 接近 request.security 中段，目前可用 |
| DRY | ❌ 高度重複，急需用 UDT + 迴圈重構 |
| 擴展性 | ❌ 加新時區要改很多處 |
| UDT 使用 | ❌ 完全沒用 |
| var 管理 | ❌ 40+ 個 var 散落 |

## 重構優先順序

1. **先用 UDT 封裝** `PivotLevels`（最有價值）
2. **`isNearAny` 改 array 參數**（彈性）
3. **var line/label 改 map 或 array**（可讀性）
4. **合併文字改迴圈生成**（DRY）
5. **SECTION 註解統一**（整潔）

## 風險

目前 code 可用但已接近「複製貼上 code」的臨界點。再加一個時區（如 30m）會讓維護負擔爆炸。建議下次開發新功能前先重構。

## ✅ MTF 版 refactor 完成（2026-04-18）

分 5 個 Stage 執行：

- ✅ Stage 1: PivotLevels UDT + srLevels array + isNearAnyArr
- ✅ Stage 2: merge _draw + merge text 改迴圈
- ✅ Stage 3: 繪圖 code 改迴圈 + map 管理 line/label
- ✅ Stage 4+5: 清理相容層 + updateLevel 輔助函數 + SECTION 統一

**成果**：
- 1159 行 → 1054 行（-105 行 / -9%）
- 加新時區只要改 2 處
- UDT 封裝 + map 管理 + 迴圈取代重複 code

**MTF Commits**: `50ad6d5` → `e7f393d` → `48ee662` → `92ad026`

## ✅ 一般版 v1.7 refactor 完成（2026-04-18）

因為邏輯已在 MTF 驗證過，一般版一次完成：

| | MTF | 一般版 |
|--|-----|--------|
| 原行數 | 1159 | 1126 |
| refactor 後 | 1054 | 1002 |
| 減少 | -105 (-9%) | -124 (-11%) |

**一般版 Commit**: `860bbb9`

## 最終成果對照

| 指標 | 兩版一致性 |
|------|-----------|
| PivotLevels UDT | ✅ 完全相同 |
| srLevels array 結構 | ✅ 完全相同 |
| updateLevel 函數 | ✅ 完全相同 |
| drawSRByLevel 函數 | ✅ 完全相同 |
| isNearAnyArr 函數 | ✅ 完全相同 |
| 合併 _draw 迴圈 | ✅ 完全相同 |
| 合併 merge text 迴圈 | ✅ 完全相同 |

兩版共用的 S/R 邏輯 100% 一致，差異只在盤整/突破/翻亞當的架構（一般版 inline vs MTF request.security）。

## Refactor 過程踩到的 Pine Script 坑

### 1. 函數隱式 return 型別不一致（CE10163）

**症狀**：函數內有多個 `if/else` 分支，最後一個表達式型別不同 → 編譯失敗。

```pinescript
drawSRByLevel(...) =>
    if condition1
        line.delete(...)
        map.remove(srLinesMap, key)  // 回傳 bool
    else
        if condition2
            newLine = line.new(...)
            map.put(srLinesMap, key, newLine)  // 回傳 bool
        else
            label.set_x(...)
            label.set_text(...)  // 回傳 void
    // ↑ 編譯器嘗試推斷 return 型別，失敗
```

**解法**：在函數尾加明確的 return 值統一型別：
```pinescript
drawSRByLevel(...) =>
    if ...
        ...
    else if ...
        ...
    int(0)  // 統一回傳 int(0)，所有路徑型別一致
```

### 2. `map.remove` 需要先 `map.contains` 檢查

**症狀**：對不存在的 key 呼叫 `map.remove` 會造成不可預期行為。

**解法**：
```pinescript
if map.contains(srLinesMap, key)
    map.remove(srLinesMap, key)
```

### 3. `var` array 初始化要用 `barstate.isfirst`

**常見錯誤**：直接在宣告時 push 初始元素，但 `var` 只在第一根 bar 宣告一次，之後會被重新宣告覆蓋（不會，但 push 邏輯會在每根 bar 重跑）。

**正確做法**：
```pinescript
var srLevels = array.new<PivotLevels>()
if barstate.isfirst
    array.push(srLevels, PivotLevels.new(...))
    // ... 一次初始化
```

### 4. UDT 物件「pass by reference」

**重要特性**：Pine Script 的 UDT 物件在函數間傳遞時是 by reference，所以輔助函數可以直接修改物件欄位：

```pinescript
updateLevel(PivotLevels lvl, ...) =>
    lvl.enabled := enabled  // 直接改 array 裡的物件
    lvl.h1 := h1
    ...
```

`array.get(srLevels, 0)` 拿到的是物件本身，改它就等於改 array 裡的那個物件。

### 5. 輔助函數取代超長行

**問題**：Pine Script 不支援多行參數（每個 `=` 賦值語句要在同一行），導致單行超長。

**解法**：把超長賦值拆成輔助函數 + 短呼叫，比 Stage 1 原本 60 行的超寬賦值清爽很多：

```pinescript
// 舊（每行 200+ 字元）：
_lW.enabled := i_srW, _lW.h1 := pvW_h1, _lW.h2 := pvW_h2, ...

// 新（每行 80 字元）：
updateLevel(array.get(srLevels, 0), i_srW, i_srWPrev, pvW_h1, pvW_h2, ...)
```

## 給 Pine Script 常見坑文件補充

以下三條建議加到 `docs/proposals/concept-learn-skill-proposal.md`：

1. 函數隱式 return 型別不一致 → 尾加 `int(0)` 統一
2. `map.remove` 要先 `map.contains` 檢查
3. UDT 物件 pass by reference → 可用輔助函數修改
4. `array.from()` 不加 `var` 在迴圈內 = memory leak → 用 `var` + `.set()` 覆寫
5. `str.split()` 回傳新 array，每根 bar 呼叫 = memory leak → 用 `var` 只算一次

**下一步**：一般版 v1.7 同步 refactor

---

## Refactor 修改提案

### 1. UDT 封裝 — `PivotLevels`

```pinescript
type PivotLevels
    string name            // 時區名稱（1W/1D/4H/1H/15m/5m）
    color col              // 線的顏色
    bool enabled           // 是否啟用（繪圖開關）
    bool showPrev          // 是否顯示 Prev
    float h1               // 最新 pivot high
    float h2               // 前一個 pivot high
    float l1               // 最新 pivot low
    float l2               // 前一個 pivot low
    int h1t                // h1 時間
    int h2t                // h2 時間
    int l1t                // l1 時間
    int l2t                // l2 時間
```

**好處**：
- 48 個散落變數 → 6 個物件（每時區一個）
- 加新時區只要 push 一個新物件到 array
- 交集判斷可以用 `for level in levels` 迴圈處理

### 2. `isNearAny` 改 array + 早退出

```pinescript
isNearAny(float price, array<float> others, float tol) =>
    bool _r = false
    if array.size(others) > 0
        for v in others
            if not na(v) and math.abs(price - v) <= tol
                _r := true
                break  // 早退出
    _r
```

**好處**：
- 不受 8 個參數限制
- 早退出提升效能（遇到第一個接近的就停）

### 3. 合併邏輯用迴圈

**舊**：每個時區手寫 8 個 `_draw` 變數 + 4 個 merge text

**新**：
```pinescript
// 產生每個小時區的 _draw（迴圈處理）
for i = 0 to array.size(srLevels) - 1
    level = array.get(srLevels, i)
    // 收集所有比它大的時區的 h1/l1 到 largerValues array
    array<float> largerValues = array.new<float>()
    for j = i + 1 to array.size(srLevels) - 1
        larger = array.get(srLevels, j)
        array.push(largerValues, larger.h1)
        array.push(largerValues, larger.l1)
    // isNearAny 判斷
    level.h1Draw := isNearAny(level.h1, largerValues, tol) ? na : level.h1
    ...
```

**好處**：
- 新增時區只要 push，不改迴圈
- 可讀性高

### 4. var line/label 改 map 或 array

```pinescript
var map<string, line> srLines = map.new<string, line>()
var map<string, label> srLabels = map.new<string, label>()

// 使用時：
line.delete(srLines.get("1W_h1"))
srLines.put("1W_h1", line.new(...))
```

**好處**：
- 不用 40+ 個 var 宣告
- 可動態管理（按時區 + h1/h2/l1/l2 生成 key）

### 5. 統一 SECTION 註解

`// SECTION 9: 視覺化 — 支撐壓力線`（加上 SECTION 前綴）

### 不會動到的部分

- `calcPivotLines` 函數邏輯（已驗證正確）
- `request.security` 呼叫（6 個）
- 隱藏標記（box text + label tooltip）
- 低時區防護（_chartSecs 判斷）
- 5m 特殊處理（barstate.islast + line.new + extend.both）

### 實作步驟（先 MTF 版）

1. 定義 `PivotLevels` UDT
2. 改 `isNearAny` 為 array 版本
3. 初始化 6 個 `PivotLevels` 物件（1W/1D/4H/1H/15m/5m）
4. `request.security` 填入每個物件的 h1/h2/l1/l2/時間
5. 合併邏輯用迴圈處理
6. 繪圖迴圈（從小到大時區）
7. 本地驗證 → commit

### 風險控制

- 保留舊版 code（註解）做 rollback 參考
- 先做 MTF 版，驗證 OK 再做一般版
- 每一步都用 `/ig` 拉指標繪圖比對重構前後一致

## Refactor 本地驗證計畫

用 JS 模擬驗證：
1. 驗證 6 個 PivotLevels 物件的資料跟散落變數一致
2. 驗證 `isNearAny` array 版本跟原版結果一致
3. 驗證迴圈生成的 `_draw` 跟散落 `_draw` 一致
4. 驗證合併文字生成結果一致

---

## v3.21 SR 修復記錄（2026-04-29）

### 修復 0：Memory leak — parseSessionStr 每根 bar 建 9 個臨時 array

**問題**：1H 回放模式跑幾根 K 棒就 memory limit exceeded。v3.21 就存在，v3.22 才發現。

**根因**：`parseSessionStr(i_timeSA/SB/SC)` 在全域作用域每根 bar 呼叫 3 次。每次內部：
- `str.split(s, "-")` 建 1 個 array
- `parseTimeStr` 呼叫 2 次，各 `str.split(s, ":")` 建 1 個 array
- 小計：3 個 array × 3 個 session = **每根 bar 9 個新 array**

Pine Script 沒有 GC，這些 array 永遠不會被回收。

**修正**：待實作（見下方解法討論）

### 修復 1：SR 線 z-order — 大時區在上（`14f92fa`）

**問題**：5m 的 SR 線蓋在 1W/1D/4H 等大時區線的上面。

**原因分析**：
Pine Script 的 z-order 由物件**建立順序**決定（後建立 = 在上面）。`drawSRByLevel` 的優化邏輯「價格沒變就不重建 line，只移動 label」破壞了 z-order 控制 — 5m 用 `extend.both` 每根 bar 都重建（永遠是最新物件），而其他 TF 的線只在價格變化時重建。

**修正**：
1. `drawSRByLevel` 加 `forceRedraw` 參數
2. `barstate.islast` 時強制重建所有線，順序：5m 先（底層）→ 15m~1W 後（頂層）
3. 非 `islast` 時維持原本的效能優化（價格沒變不重建）

```pinescript
bool needRedraw = useBothExtend or forceRedraw or na(prevLine) or (not na(prevPrice) and prevPrice != price)
```

**繪圖邏輯三段式**：
- `_pivotChanged and not barstate.islast`：pivot 變化時正常更新（不強制重建）
- `barstate.islast`：5m 先、15m~1W 後，全部 `forceRedraw=true`
- `not _pivotChanged`：只移動 label x 座標

### 修復 2：1H pivot 改用 high/low（`500439b`）

**問題**：1H `calcPivotLines` 用了 `useClose=true`（用 close 算 pivot），Eli 用 high/low。

**修正**：`calcPivotLines(5, true, inCalcRange)` → `calcPivotLines(5, false, inCalcRange)`

### 修復 3：合併容許改 $0（`d890b73`）

**問題**：預設 $5 太寬，不同 TF 的 pivot 被錯誤合併（如 4H+1H 差 $4.9 被合在一起）。

**修正**：`i_srMergeTol` 預設 5.0 → 0.0，使用者自行決定是否合併。

### 修復 4：SR Prev 預設關閉（`fdd0dca`）

`i_srWPrev/i_srDPrev/i_sr4HPrev/i_sr1HPrev/i_sr15mPrev` 全部 true → false。

---

## ✅ v3.22 重構完成（2026-04-29）

三項改進全部完成，commit `851208e`。

### ✅ Major — `drawAllSR` helper 消除 call site 重複

**問題**：line 1099-1125，四行 `drawSRByLevel(H1/L1/H2/L2)` 呼叫重複三處（`_pivotChanged` 時、`islast` 5m、`islast` 15m~1W），只差 `useBothExtend` 和 `forceRedraw` 參數。

**建議**：
```pinescript
drawAllSR(PivotLevels lvl, bool bothExtend, bool force) =>
    drawSRByLevel(lvl, "H1", lvl.h1Draw, lvl.h1t, lvl.col, "Pivot High", "PH", lvl.h1Merge, bothExtend, force)
    drawSRByLevel(lvl, "L1", lvl.l1Draw, lvl.l1t, lvl.col, "Pivot Low", "PL", lvl.l1Merge, bothExtend, force)
    drawSRByLevel(lvl, "H2", lvl.showPrev ? lvl.h2Draw : na, lvl.h2t, color.new(lvl.col, 40), "Prev High", "PrevH", "", bothExtend, force)
    drawSRByLevel(lvl, "L2", lvl.showPrev ? lvl.l2Draw : na, lvl.l2t, color.new(lvl.col, 40), "Prev Low", "PrevL", "", bothExtend, force)
    int(0)
```

12 行 × 3 處 → 每處 1 行，省約 24 行。

### ✅ Major — z-order forceRedraw 效能優化

**問題**：`barstate.islast` 每根 bar 都觸發，目前每根 bar 都刪除重建全部 24 條 SR 線 + label（6 TF × 4 levels）。但 z-order 只有在 `_pivotChanged` 時才會亂掉（某條線被重建跑到最上面），大部分 bar 根本不需要 forceRedraw。

**現狀**：
```pinescript
if _pivotChanged and not barstate.islast
    // 正常更新
if barstate.islast
    // 每根 bar 都 forceRedraw 全部 24 條線
else if not _pivotChanged
    // 只移動 label
```

**建議**：只在 `_pivotChanged and barstate.islast` 時 forceRedraw：
```pinescript
if _pivotChanged and not barstate.islast
    // 正常更新
if _pivotChanged and barstate.islast
    // forceRedraw 確保 z-order（只有 pivot 變才需要）
else if not _pivotChanged
    // 只移動 label x（包含 islast 的情況）
```

大部分 bar 只做 label 移動，不會每根 bar 重建 24 條線。

**踩坑**：5m 用 `extend.both`（跟隨 bar_index），即使 `not _pivotChanged` 也需要每根 bar 重建，不能只移動 label。最終邏輯：
```pinescript
if _pivotChanged
    if barstate.islast
        drawAllSR(5m, true, true)   // 5m 先（底層）
        for 15m~1W: drawAllSR(lvl, false, true)  // 大時區後（頂層）
    else
        for 15m~1W: drawAllSR(lvl, false, false)
else
    drawAllSR(5m, true, false)      // 5m 每 bar 重建
    for labels: label.set_x(...)    // 其他只移動 label
```

### ⚠️ Minor → 實作後 revert — merge text 的 isNear 改用 array 迴圈

**問題**：line 1033-1050，每個 smaller TF 的四個值（h1/h2/l1/l2）對 current 的 h1 和 l1 各做 4 次 `isNear`，共 8 行。這 8 行的 pattern 完全相同：`isNear(current.X, smaller.Y, tol)` → 加對應文字。

**現狀**：
```pinescript
if isNear(current.h1, smaller.h1, i_srMergeTol)
    h1m += " " + smaller.name + " Pivot High"
if isNear(current.h1, smaller.h2, i_srMergeTol)
    h1m += " " + smaller.name + " Prev High"
if isNear(current.h1, smaller.l1, i_srMergeTol)
    h1m += " " + smaller.name + " Pivot Low"
if isNear(current.h1, smaller.l2, i_srMergeTol)
    h1m += " " + smaller.name + " Prev Low"
// l1 也一樣 4 行...
```

**可改成**：把 smaller 的四個值 + 名稱放 array，用迴圈：
```pinescript
array<float> vals = array.from(smaller.h1, smaller.h2, smaller.l1, smaller.l2)
array<string> names = array.from("Pivot High", "Prev High", "Pivot Low", "Prev Low")
for k = 0 to 3
    if isNear(current.h1, vals.get(k), i_srMergeTol)
        h1m += " " + smaller.name + " " + names.get(k)
    if isNear(current.l1, vals.get(k), i_srMergeTol)
        l1m += " " + smaller.name + " " + names.get(k)
```

8 行 → 4 行，但需要每次建 2 個臨時 array。效能影響不大（只在 `_pivotChanged` 時跑），可讀性見仁見智。標 Minor 是因為改動不大、收益也不大。

**⚠️ 實作後發現 memory leak → revert**

`array.from()` 不加 `var` 會在每根 bar 的每次迴圈建新 array，Pine Script 沒有 GC 回收機制：
- 外迴圈 5 次 × 內迴圈最多 5 次 = 每根 bar 最多 25 個臨時 `array<float>`
- 回放模式跑幾根 bar 就 memory limit exceeded

**解法**：用 `var` array + `.set()` 覆寫值，避免建新 array：
```pinescript
var array<float> _vals = array.new<float>(4)
var array<string> _mergeNames = array.from("Pivot High", "Prev High", "Pivot Low", "Prev Low")
// 迴圈內：
_vals.set(0, smaller.h1)
_vals.set(1, smaller.h2)
_vals.set(2, smaller.l1)
_vals.set(3, smaller.l2)
for k = 0 to 3
    if isNear(current.h1, _vals.get(k), i_srMergeTol)
        h1m += " " + smaller.name + " " + _mergeNames.get(k)
    if isNear(current.l1, _vals.get(k), i_srMergeTol)
        l1m += " " + smaller.name + " " + _mergeNames.get(k)
```

`var` 只在第一根 bar 建一次，之後 `.set()` 覆寫，記憶體不會累積。待驗證。
