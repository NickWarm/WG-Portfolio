---
name: ig
description: 指標繪圖提取。從 TradingView 拉取自己發佈指標的繪圖數據（盤整框、突破、亞當目標、Session 等），支援隱藏標記辨識。觸發條件：使用者說「拉指標」「指標繪圖」「indicator graphic」，或呼叫 /ig。
allowed-tools: Bash, Read, Glob
---

# IG — Indicator Graphic 指標繪圖提取

從 TradingView 拉取自己發佈指標的 box/label/line 繪圖數據，自動辨識隱藏標記（CONS_/BREAKOUT_/ADAM_/SESSION_/OPENK）。

## 參數

從使用者訊息中解析以下資訊：

| 參數 | 必填 | 說明 |
|------|------|------|
| name | 是 | 指標名稱（模糊匹配）。常用：`"WG sop mtf"`、`"WG-SOP v1"` |
| from | 否 | 起始時間 UTC+8（例：`2026-04-14 22:45`） |
| to | 否 | 結束時間 UTC+8（例：`2026-04-15 02:15`） |
| tf | 否 | 時間週期，預設 15。可選：5、15、60、240 |
| type | 否 | 只看特定類型：`box`、`label`、`line` |
| text | 否 | 文字過濾（label/box 的 text 或 tag 包含此字串） |
| json | 否 | 使用者說「JSON」「程式用」時加 --json |

## 指標名稱速記

| 速記 | 展開 |
|------|------|
| `mtf` | `"WG sop mtf"` |
| `gen`、`一般` | `"WG-SOP v1"` |
| 其他 | 直接當名稱傳入 |

## 執行流程

### Step 1：組合參數並執行 script

```bash
# 列出所有 private 指標
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/fetch-indicator-graphic.mjs --list

# 基本用法
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15

# 指定時間範圍
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15 --from "2026-04-14 22:45" --to "2026-04-15 02:15"

# 只看盤整框
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15 --type box --text "CONS_"

# 只看突破和亞當
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15 --type label

# JSON 輸出
node /Users/nicholas/Desktop/Trading/Forex_program/tools/pine-validator/fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15 --json
```

### Step 2：整理結果

將 script 輸出**依隱藏標記分類**整理回報：

#### 盤整框（CONS_）
- box text 以 `CONS_` 開頭
- 回報：時區、top（consHigh）、bottom（consLow）、時間範圍

#### 突破（BREAKOUT_）
- label tooltip 以 `BREAKOUT_` 開頭
- 回報：時區、方向（UP/DOWN）、價位、時間

#### 亞當目標（ADAM_）
- label tooltip 以 `ADAM_` 開頭
- 回報：時區、目標價、時間
- 配對亞當目標線：同 y 值的水平虛線

#### Session（SESSION_）
- box text 以 `SESSION_` 開頭
- 回報：名稱、高/低、時間範圍
- 配對高低線：同時間範圍 + y=box top/bottom 的實線

#### 首K（OPENK）
- box text = `OPENK`
- 回報：boxHigh、boxLow、起始時間

### Step 3：互動討論

整理完後詢問使用者要做什麼：
- 「跟使用者繪圖比對」→ 呼叫 `/draw-verify` 拉使用者繪圖
- 「跟 context JSON 比對」→ 讀取對應的 context JSON
- 「看其他時間範圍」→ 調整 --from/--to 再拉一次
- 「看其他時區」→ 調整 --tf 再拉一次

## 隱藏標記對照表（完整規範見 `docs/learning/indicator-value-extraction-via-graphics.md`）

| 標記 | 物件 | 數據 |
|------|------|------|
| `CONS_{tf}` | box text | top=consHigh, bottom=consLow |
| `BREAKOUT_{tf}_{UP\|DOWN}` | label tooltip | y=突破價位 |
| `ADAM_{tf}_{price}` | label tooltip | y=目標價 |
| `OPENK` | box text | top=首K高, bottom=首K低 |
| `SESSION_{name}` | box text / label tooltip | box: top=高, bottom=低; label: y=session高 |
| `SR_{tf}_{PH\|PL\|PrevH\|PrevL}_{price}` | label tooltip | y=支撐壓力價位 |

### 規範

- 所有 TYPE 全大寫
- 無空格（`Pivot High` → `PH`）
- `_` 當分隔符
- `--text` filter 會同時檢查 label 的 `text` 和 `toolTip`

## 注意事項

- 所有時間輸出固定 UTC+8
- 指標必須已發佈到 TradingView（private/invite-only 皆可）
- `max_lines_count=500` 限制：較舊的 line 可能被丟棄，用 --from/--to 縮小範圍可避免
- Line 沒有標記，靠空間配對辨識（同 y 值或同 x 時間對應 tagged box/label）
- Script 位置：`Forex_program/tools/pine-validator/fetch-indicator-graphic.mjs`
