# 概念學習 Skill 提案（通用流程版）

> 提案日期：2026-04-08（初版）
> 更新日期：2026-04-15（v2 — 整理完整開發流程）
> 狀態：提案中（v1.2 一般版 + MTF v3.0 已完成首個完整驗證）
> 前身：draw-verify-skill-proposal.md
> 實戰驗證：consolidation_adam（v0.1 → v1.2 → MTF v3.0）

---

## 問題摘要

**核心問題**：交易概念（盤整、翻亞當、兩條線、撐壓線、亞當等）的開發需要經過「使用者畫圖教 AI → 研究演算法 → 寫 Pine Script → 驗證 → 迭代」的完整流程。這套流程會重複多次（每個新概念都要走一遍），如何設計成 skill 讓每次都有一致步驟與完整記錄？

**關鍵條件**：
- 通用流程，不綁定特定概念（不只是盤整）
- 每個階段都有產出物（文件、數據、程式碼）
- 失敗的嘗試也要紀錄（保留 debug 脈絡）
- 最終產物：可用的 Pine Script 指標 + 完整設計決議文件

---

## 通用開發流程（8 階段）

基於 consolidation_adam 的實戰經驗歸納。

**快速迭代期**（階段 1-7）先求功能可用，**穩定期**（階段 8）用 `/psbp` refactor 保持 code 品質。

### 階段 1：概念定義

**目的**：確認要學什麼概念、建立主文件。

**步驟**：
1. 使用者指定概念名稱（例：consolidation、support-resistance、two-lines、trendline）
2. 建立 `wg-concepts/XX-<concept>.md` 主文件
3. 紀錄：概念來源（老師、書、影片）、預期用途、相關概念

**產出**：概念主文件（骨架，後續持續補充）

---

### 階段 2：圈區域（一次做，後續共用）

**目的**：準備 K 線數據供演算法驗證用。

**步驟**：
1. 使用者指定：商品 + 時間範圍（例：FX:XAUUSD, 3/20-4/1）
2. `fetch-context.mjs` 一次拉 4H + 1H + 15m + 5m
3. 存成 `context-{symbol}-{from}-{to}.json`

**產出**：context JSON（多個案例共用）

---

### 階段 3：使用者畫圖 + AI 紀錄案例

**目的**：建立「視覺範例 → 數據定義」的對應。

**每個案例的步驟**：
1. 使用者在 TradingView 畫圖（說明哪個時間週期）
2. AI 用 `/draw-verify` 拉繪圖數據
3. 使用者口頭說明視覺特徵
4. AI 用 context JSON 交叉比對
5. 存成 `XX-<concept>-<tf>-<desc>.json + .md`

**累積多個案例**：
- 不同時間週期（1H、15m、5m）
- 不同方向（上/下）
- 不同 range 大小

**產出**：案例檔案（每個步驟 JSON + MD）

---

### 階段 4：Open Source 演算法研究

**目的**：找已有方案作為參考，不從零開始。

**步驟**：
1. 用 `gh` CLI 搜尋相關 Pine Script repo
2. 關鍵詞：概念英文（consolidation、support-resistance、zigzag）
3. 看 3-5 個實作方案，比對差異
4. 紀錄每個方案的優缺點

**產出**：`debug/<concept>-opensource-survey.md`（方案比較表）

**實戰教訓**：
- 第一個看到的方案未必最好（consolidation_adam 從 encoded-evolution 試起，最後用 LonesomeTheBlue）
- 要用使用者範例驗證每個方案（不同方案可能適合不同情境）

---

### 階段 5：演算法決議 + 本地 JS 模擬

**目的**：在寫 Pine Script 前，先用 JS 驗證邏輯是否正確。

**步驟**：
1. 從階段 4 選一個方案作為基準
2. 寫 JS 實作（對應 Pine Script 的邏輯）
3. 用 context JSON 跑模擬
4. 比對：JS 結果 vs 使用者畫的案例
5. 不符合就調整演算法 → 再跑 → 再比

**產出**：
- `debug/<concept>-decision.md`（為何選 X 不選 Y）
- 本地 JS 模擬結果

**實戰教訓**：
- JS 模擬是**快速迭代的關鍵**（秒級驗證，不用開 TradingView）
- 使用者的繪圖是 ground truth，用 `/draw-verify` 拿到精確數值做比對
- 差 N 點就找原因（例如 bodyMid vs Close、boxHigh vs box midpoint）

---

### 階段 6：Pine Script 實作 + 迭代

**⚠️ 新功能必須遵循隱藏標記規範**（見 `docs/learning/indicator-value-extraction-via-graphics.md`）：
- 每個 box 加 `text="{TYPE}_{MOD}"` + 透明 text_color
- 每個 label 加 `tooltip="{TYPE}_{MOD}_{VAL}"`
- TYPE 全大寫、無空格、用 `_` 分隔
- 新 TYPE 要加到規範文件的清單

這讓 `/ig` 可以用 `--text "{TYPE}_"` 抓到數據做交集判斷。



**目的**：把 JS 邏輯轉 Pine Script，在 TradingView 上驗證。

**三步驗證循環**（每次改 code 都走一遍）：
```
1. 本地 JS 模擬 → 確認結果預期
2. 改完自動 pbcopy 到剪貼簿（跟 commit 一起做，不等使用者要）
3. 使用者貼上 → 目視確認 → 回報差異
```

**自動化原則**：以下事情不用等使用者要，改完就做：
- `git add` + `git commit`（描述改了什麼、為什麼）
- `pbcopy` 到剪貼簿
- 本地 JS 模擬（改邏輯時）

**版本管理**：
- `consolidation_adam.pine v0.1` → `v1.2`（多個版本迭代）
- 每個版本的失敗原因和解法都 commit
- `CHANGELOG.md` 記錄版本演進 + commit hash

**設計模式套用**（v1.0+）：
- UDT 封裝狀態
- calcCore() 函數封裝核心演算法
- 分 SECTION（關注點分離）
- 計算範圍優化（跟過濾設定連動）
- K 棒收盤確認（barstate.isconfirmed）
- 記憶體管理（array.shift）

**產出**：
- `.pine` 檔案（可用）
- `CHANGELOG.md`（版本歷史）
- `debug/*.md`（每次失敗的 debug 紀錄）

**實戰教訓**：
- 邊界情況很多（historical buffer、resample、var 狀態、xloc）
- Pine Script 文件必須**每次改完就用 JS 再驗一次**，再貼上 TV（省重複失敗的時間）
- 所有失敗都留紀錄（debug/ 資料夾）
- **改完 Pine Script 就自動 `pbcopy` 到剪貼簿**（不用等使用者要），commit + copy 一起做
- 指標名稱只寫版號（`WG-SOP v1.4`），細節放版本歷史註解，不要把功能列在名稱
- 加新功能時**不改核心邏輯**（calcCore / calcOpeningK 完全不動），純新增方式
- UDT 封裝新功能（Session / OpeningK / AdamTarget），單一 array，跟既有結構一致

### Pine Script 常見坑（實戰遇到）

| 坑 | 症狀 | 解法 |
|----|------|------|
| Historical buffer 超限 | `offset N beyond limit` | `max_bars_back=1100` + 限制回溯 |
| 垂直線 `extend=extend.both` 不顯示 | 線看不到 | 改用 `y1=0, y2=1000000` 大 y 範圍 |
| request.security 傳 series | 多時區拿到同一份 | 改傳函數呼叫（calcCore 封裝） |
| 跨時區 bar_index 不同 | 框時間範圍錯 | 用 `xloc.bar_time` + 存時間戳 |
| Label 文字沒有 8px | Pine 沒有 px 單位 | `size.tiny`（最小，~10px） |
| 跨日 session 在 00:00 斷 | 框不連續 | `curMin >= start OR curMin < end` |
| DST 夏冬令切換 | 手動改痛苦 | 用月份日期自動判斷（簡化版 3/15-10/31） |
| MTF 畫圖用 bar_index 撞 buffer | 切低時區後報 `offset N beyond buffer's limit` | 所有 label/line 改 `xloc.bar_time`，UDT 存 `time` 不是 `bar_index` |
| 垂直線用極大 y 值 | 切時區後 K 棒被壓縮成一條線 | 用合理 y + `extend=extend.both`（overlay 指標的 y 值會影響 chart 縮放） |
| request.security `[1]` 偵測突破丟失 | 1H 圖看 15m 突破漏 74%（8/31） | 在 calcCore 內用遞增計數器（`breakUpCount++`），外部用 `count > count[1]` 偵測 |
| `na` 值推入 zone array 後畫 box | 切時區後 K 棒被壓縮（box y=na→0） | 所有 array.push 前加 `not na()` 防護，drawZones/drawAdamTargets 也加 |
| box `textcolor` vs label `textcolor` | box 用 `text_color`（有底線），label 用 `textcolor`（沒底線），Pine Script 命名不一致 | 注意兩者參數名不同 |
| `switch` 結果直接串接字串 | `"CONS_" + switch ...` 編譯失敗（CE1015） | 先存變數再串：`_tfName = switch ... ; _tag = "CONS_" + _tfName` |
| `request.security` 取低時區數據 | pivot/indicator 值 na 或不正確（5m on 15m chart） | 只對 ≥ 圖表時區的目標使用；低時區用 `request.security_lower_tf`（回傳 array）或條件跳過 |
| 函數隱式 return 型別不一致 | CE10163（if/else 分支回傳不同型別） | 函數尾加明確值統一，如 `int(0)` |
| `map.remove` 對不存在 key | 不可預期行為 | 先 `if map.contains(m, key)` 檢查 |
| UDT 物件 pass by reference | 修改函數內的參數會影響 array 裡的物件 | 可善用此特性寫輔助函數精簡程式 |
| 函數前向引用 | CE10271 `Could not find function or function reference 'xxx'` | Pine 不允許呼叫定義在後面的函數。把被呼叫的函數移到呼叫點之前 |
| 「畫一次就持久」vs「每 bar 重畫」設計選擇 | 每 bar 全砍重畫的標示在回放會閃爍/消失 | 靜態物件（label/line 位置固定）用 `label.new`/`line.new` 一次畫好，靠 `max_*_count` 自動管理；動態物件（box 邊界會擴張）才用 array + 重畫 |
| Bar 邊界手動算 `hour%4` 跟 TV 不對齊 | 15m 圖的 4H Pivot Low ≠ 4H 圖的值（差 ~$15） | 用 `timeframe.change("240")` 取代手動算；Session/開盤時間才用 `"UTC+8"` |
| `inCalcRange` 過濾掉大時區 pivot | 1D Pivot Low 消失（確認日在 calcBuffer 外） | 1W/1D 的 `aggPivotBar` 永遠傳 `true`，大時區計算量極小不需過濾 |

---

### 階段 7：MTF 擴展（選做）

**目的**：當需要跨時區資訊時擴展。

**步驟**：
1. 基於一般版的 `calcCore()` 函數
2. `request.security(tf, calcCore(...))` 取其他時區結果
3. 視覺化用 `xloc.bar_time` 畫框（跨時區時間對齊）
4. 每個時區獨立的 zone/target array
5. 跨時區校準標記

**產出**：`*_mtf.pine`（MTF 版，跟一般版同步維護）

**實戰教訓**：
- MTF 踩了好幾版才成功（v2.0/v2.1 失敗，v3.0 成功）
- request.security + var 狀態 + resample 有很多坑，必須實測
- 不能盲信本地 JS 模擬（Pine Script 實際行為可能不同）

---

### 階段 8：Refactor（穩定期，用 `/psbp`）

**目的**：功能穩定後做 code 品質檢查與重構，避免累積技術債。

**觸發時機**：
- 某個功能快速迭代多次（例如 S/R 線踩了多個 bug 才定版）
- 準備加新時區 / 新模組但發現要改很多處
- Review 發現 DRY 嚴重違反
- 行數超過 1000 行且重複 code 多

**步驟**：
1. 呼叫 `/psbp {target.pine}`
2. AI 依 WTT_Bias + Dskyz DAFE 規範審查 → 產出 review 文件
3. AI 提 refactor 計畫（拆 Stage）
4. AI 寫本地 JS 模擬驗證邏輯一致性
5. 分 Stage 執行：每 Stage 改完 → pbcopy → 使用者 TradingView 驗證 → commit
6. 踩到新坑加到常見坑表
7. 雙版本（一般 + MTF）同步

**實戰範例**：v1.7 + MTF v3.7 S/R 線 refactor
- MTF: 1159 → 1054 行（-9%）
- 一般版: 1126 → 1002 行（-11%）
- 加新時區從改 20+ 處降到改 2 處

**產出**：
- `debug/{target}-code-review.md`（review + refactor 計畫）
- `debug/sim-{target}-refactor.mjs`（本地驗證）
- 多個 commit（一個 stage 一個）
- 常見坑表更新

**詳細設計**：`docs/proposals/psbp-skill-proposal.md`

---

## 實戰案例：consolidation_adam（參考範本）

| 階段 | 實際做了什麼 | 產出 |
|------|-------------|------|
| 1 概念定義 | 盤整 + 翻亞當（從老余 WG-SOP） | `wg-concepts/01-consolidation.md` |
| 2 圈區域 | XAUUSD 3/20-4/1、4/3-4/14 兩組 | 2 個 context JSON |
| 3 畫圖案例 | 6 個範例（步驟 01-06） | `examples/0X-*.json + .md` |
| 4 Open source 研究 | encoded-evolution、LonesomeTheBlue、ATR Percentile 等 | `debug/consolidation-opensource-survey.md` |
| 5 演算法決議 + JS 模擬 | 選 LonesomeTheBlue zigzag | `debug/mtf-v3-proposal.md` 等 |
| 6 Pine Script 迭代 | v0.1 → v1.2（9 個版本） | `consolidation_adam.pine`、`CHANGELOG.md` |
| 7 MTF 擴展 | v3.0 成功（v2.0/v2.1 失敗） | `consolidation_adam_mtf.pine` |

**總計產出**：
- 1 個一般版 + 1 個 MTF 版 Pine Script
- 1 個 CHANGELOG + 10+ 個 debug 文件
- 6 個畫圖範例 + 2 個 context JSON
- 完整的設計決議脈絡

---

## 檔案結構（通用）

```
wg-concepts/
├── XX-<concept>.md                    # 概念主文件（階段 1）
├── examples/
│   ├── context-{symbol}-{date}.json   # 階段 2
│   ├── YY-<concept>-<tf>-<desc>.json  # 階段 3
│   └── YY-<concept>-<tf>-<desc>.md
└── ... （其他概念）

pinescript/indicators/wg-sop/
├── <concept>.pine                     # 階段 6 一般版
├── <concept>_mtf.pine                 # 階段 7 MTF 版（選做）
├── CHANGELOG.md                       # 版本演進 + commit hash
└── debug/
    ├── <concept>-opensource-survey.md   # 階段 4
    ├── <concept>-decision.md            # 階段 5
    ├── vXX-issue.md                     # 階段 6 debug
    └── mtf-<concept>-proposal.md        # 階段 7
```

---

## Skill 設計

```yaml
---
name: concept-learn
description: 交易概念開發流程 skill。從概念定義、畫圖範例、open source 研究、演算法決議、Pine Script 實作到 MTF 擴展，全流程有一致步驟與完整記錄。觸發條件：使用者說「開始學習概念」「開發新概念」「concept learn」，或呼叫 /concept-learn。
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---
```

### 7 個階段的子命令

| 階段 | 子命令 | 自動化程度 |
|------|--------|----------|
| 1 概念定義 | `/concept-learn init <name>` | 建主文件骨架 |
| 2 圈區域 | `/concept-learn fetch <symbol> <from> <to>` | 呼叫 fetch-context.mjs |
| 3 畫圖案例 | `/concept-learn record <concept> <tf>` | 呼叫 draw-verify + 互動記錄 |
| 4 Open source 研究 | `/concept-learn research <concept>` | 用 Agent 去 gh 搜尋 + 整理 |
| 5 JS 模擬 | `/concept-learn simulate <concept>` | 跑 JS 模擬並比對範例 |
| 6 Pine Script 迭代 | `/concept-learn pine <concept>` | 從 JS 產生 Pine Script 骨架 |
| 7 MTF 擴展 | `/concept-learn mtf <concept>` | 基於一般版加 request.security |

### 階段 3 互動流程範例

```
使用者: /concept-learn record consolidation 60

AI:
1. 呼叫 draw-verify 拉當前繪圖
2. 顯示數據，詢問使用者：
   「這個 Rectangle 4699 → 4733 是什麼？（盤整/突破/其他）」
3. 使用者回答後，存成 XX-consolidation-1H-<desc>.json + md
4. 更新主文件的案例清單
```

---

## 關鍵原則

1. **通用流程，不綁定特定概念**：盤整、撐壓、兩條線、亞當都走同一套
2. **每階段都有產出**：不是做完才記錄，是**邊做邊記**
3. **失敗也要記錄**：debug 文件是未來 debug 的關鍵脈絡
4. **本地 JS 模擬優先**：在貼 Pine Script 前先 JS 驗證，節省時間
5. **使用者繪圖 = ground truth**：用 `draw-verify` 拿價格/時間、`fetch-drawing-colors` 拿顏色
6. **版本管理**：Pine Script 有 v0.x 迭代歷史，CHANGELOG 紀錄每版的原因
7. **設計決議有文件**：為何選 X 不選 Y，未來看得懂
8. **核心邏輯保護**：加新功能不改既有 code（純新增），用 UDT + 獨立 array + 獨立視覺化
9. **Pine Script 名稱簡潔**：只寫版號（`v1.4`），細節放版本歷史註解
10. **自動化標準流程**：改完 commit + pbcopy 一起做，不等使用者要

## 工具清單（通用）

| 工具 | 用途 | 狀態 |
|------|------|------|
| `fetch-context.mjs` | 拉 OHLCV（4H+1H+15m+5m） | ✅ |
| `draw-verify.mjs` | 拉使用者繪圖位置（價格/時間） | ✅ |
| `fetch-drawing-colors.mjs` | 拉使用者繪圖顏色/樣式（讓指標預設 = 使用者手繪） | ✅ |
| `fetch-indicator-graphic.mjs` | 拉自己發佈的指標繪圖（box/label/line），支援 `--name`/`--from`/`--to`/`--type`/`--text`/`--json` | ✅ 已驗證 |
| 本地 JS 模擬 | 改 Pine Script 前驗證 | ✅ |

### 指標繪圖提取（2026-04-16 驗證通過）

`fetch-indicator-graphic.mjs` 已驗證能取得自己發佈指標的所有繪圖物件。搭配**隱藏標記**（box `text` 透明 + label `tooltip`），外部程式能直接辨識繪圖類型（`CONS_15m`、`BREAKOUT_15m_UP`、`ADAM_15m_4834.74`、`SESSION_亞洲盤`、`OPENK` 等），不用靠 color code 猜。MTF v3.6 已加入標記並驗證通過。

詳見：
- `docs/learning/tradingview-indicator-graphic-extraction.md`（取得繪圖能力）
- `docs/learning/indicator-value-extraction-via-graphics.md`（隱藏標記方案 + 交集應用）

---

## 待釐清

1. **Skill 是否分成多個 sub-command** 還是單一 skill 內部引導？
2. **階段 4 的 open source 搜尋**要不要預設某些 keyword？還是 AI 自己決定？
3. **階段 5 的 JS 模擬**要不要建共用模板？（pine-validator 可能可以擴充）
4. **階段 6 的 Pine Script 骨架**能不能從 JS 自動轉？

---

## 下一步

- [x] 確認提案方向（v1 提案）
- [x] 第一組完整實戰（consolidation_adam v1.2 + MTF v3.0 全流程走完）
- [x] 歸納通用流程（本文件 v2）
- [ ] 開始第二個概念（例如撐壓線、兩條線）驗證流程通用性
- [ ] 第二個概念完成後再實作 `/concept-learn` skill（有 2 個完整範例再寫 skill 才穩）

---

> **決議原則**：先用「手動操作流程」做 2-3 個概念，確認流程真的通用，再寫成 skill。不要過早自動化。
