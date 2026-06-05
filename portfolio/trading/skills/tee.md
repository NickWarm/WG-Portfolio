---
name: tee
description: Trading Example Extraction — 從直播 SRT 提取對/錯交易範例，生成 Pine Script 測試案例。觸發條件：使用者說「提取範例」「找對錯範例」「trading examples」，或呼叫 /tee。
---

# TEE — Trading Example Extraction

從直播 SRT 逐字稿中提取 Eli 示範的正確/錯誤交易範例，整理成 Pine Script 可驗證的測試案例。

## 路徑常數

```
# SRT 來源
SRT_DIR = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/srt
INDEX_JSON = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/index.json

# Phase 1 輸出
CANDIDATES_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/example-candidates

# Phase 2/3 輸出
TEST_CASES_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/test-cases

# KVS 截圖（每個主題下有 screenshots/ 子目錄放 jpg）
STREAM_SCREENSHOTS = /Users/nicholas/Desktop/Trading/Eli_course/kvs-screenshots/youtube-streams

# 參考
FLOWCHARTS = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/flowcharts
CONCEPT_DOCS = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/concept-docs
```

## 參數

| 參數 | 必填 | 說明 |
|------|------|------|
| phase | 否 | `1`（搜尋+分析）、`2`（截圖+審閱）、`3`（彙整 test-cases）、`all`（全部，預設） |
| target | 否 | `all`（全部 82 部，預設）或 youtube_id（單部） |
| batch_size | 否 | Phase 1 每批平行 agent 數（預設 5） |

## 執行模式：三階段

- **Phase 1**：背景 sub-agent 平行（每批 5 個，~70 分鐘跑完 82 部）
- **Phase 2**：背景 sub-agent 串行（llava 截圖，18GB RAM 限制）
- **Phase 3**：前景對話（Claude 彙整 + 使用者確認）

---

## Phase 1：關鍵詞搜尋 + gemma2 段落分析

> 用 background sub-agent 平行執行，每批 5 個。

### Step 0：漸進式檢查（每批啟動前執行）

1. 讀取 `{CANDIDATES_DIR}/INDEX.md`（不存在則建立空表）
2. 列出 `{SRT_DIR}` 中所有 SRT 檔案
3. 比對 INDEX.md，找出 status 為 `pending` 或不在表中的 → 待處理清單
4. 沒有待處理 → 回報「Phase 1 已全部完成」→ 停止
5. 從待處理清單取前 {batch_size} 個（預設 5），啟動 background sub-agent

INDEX.md 格式：

```markdown
# Trading Example Extraction — Phase 1 進度

| youtube_id | 標題 | 狀態 | 命中 | 類型 | 最高分 | 日期 |
|-----------|------|------|------|------|--------|------|
| KuGkFquW0-c | FOMC 利率決議 | ✅ completed | 34 | 混合 | 4/5 | 2026-03-23 |
| PqRKWZ8Yv8A | 黃金新高 | ✅ completed | 59 | 正確為主 | 4/5 | 2026-03-23 |
| 4oAKOBbKmBk | 首K策略 | ⏳ pending | — | — | — | — |
```

每個 sub-agent 完成後：
- 寫入 `{CANDIDATES_DIR}/{youtube_id}.md`
- **更新 INDEX.md**：該 youtube_id 的狀態改為 `✅ completed`，填入命中數、類型、最高分、日期

一批完成後，主對話重新執行 Step 0 → 取下一批 pending → 直到全部 completed。

### 每個 agent 的任務

對 1 部 SRT 執行：

#### Step 1：搜尋 5 類標記詞

**A. 指示語（高信號，不需概念共現）**：
```
你看這邊|你看這個位置|你看這一根|你看這一段|你看哦|這一筆|剛剛那筆|這根K|畫面上|我們來看|各位來看|來看一下|切到
```

**B. 結果語（最強信號，不需概念共現）**：
```
打到TP|TP到了|達標|獲利出場|獲利收工|獲利平倉|被掃掉|被掃到|被點掉|停損收工|設保力|保力|入袋為安|反手|爆倉
```

**C. 動作語（中信號，需概念詞共現 ±5 blocks）**：
```
上車|補一筆|補單|加碼|分批進場|試一單|試個單|進場點|佈局
```

**D. 正確評價（中信號，需概念詞共現 ±5 blocks）**：
```
標準的|教科書|符合條件|符合我們要的|這就是我們要的|這就是我們在講的|測試合格|送分題|賺賠比
```

**E. 錯誤標記（高信號，不需概念共現）**：
```
亂做|亂衝|瞎搞|凹單|扛單|追單|接刀|摸頭|猜底|重倉|不能做|不該做|不划算|千萬不要|不是我們要的|穩死|多空雙巴|撞牆|陷阱|在賭|用眼睛交易
```

**F. 概念詞（共現檢查用）**：
```
破框|突破|框外|框內|盤整|畫框|首K|開盤|PLT|趨勢|慣性|高點|低點|多空|滿足區|目標位|力道|TP|停損|止損|風控|風險|出場|離場|加碼|分批|回測|回踩|站穩|支撐|壓力|收盤|確認|真假|假突破|時區|亞盤|歐盤|美盤|逆勢|反轉|爬樓梯|上樓梯|下樓梯
```

**規則**：
- A、B、E 類：直接算命中
- C、D 類：需 F 概念詞在 ±5 blocks 內共現才算命中

#### Step 2：段落分組

- Gap < 90 秒 → 合併為同一段落
- 段落超過 5 分鐘 → 自動拆分
- 需 2+ 不同標記類別才算有效段落

#### Step 3：gemma2 分析 top 段落

用 Ollama HTTP API（`http://localhost:11434/api/generate`，`stream: false`）對 top 3 段落評分：

提示詞要點：
- 評分 1-5（5 = 有具體進出場的完整交易範例）
- 分類為 ✅ 正確 / ❌ 錯誤 / ⚠️ 混合
- **「教學性的錯誤警告」也算有效的錯誤範例**（不要因為沒有具體進場價就扣分）

#### Step 4：標記直播類型

根據命中比例標記：
- 正確為主（E hits < 20%）
- 混合型（E hits 20-60%）
- 錯誤為主（E hits > 60%）

#### Step 5：輸出

寫入 `{CANDIDATES_DIR}/{youtube_id}.md`：

```markdown
# {youtube_id} — {影片標題}

> 類型：混合型 | 總命中：34 | ✅ 26 | ❌ 8
> 有效段落：6 | gemma2 最高分：4/5

## 段落 1（00:07:10 - 00:14:28）⭐ 4/5 ✅

標記：獲利平倉、我們來看、賺賠比
概念：回測、站穩、力道滿足區

| # | 時間 | 標記 | 內容 |
|---|------|------|------|
| 1 | 00:07:15 | B-獲利平倉 | ... |
| 2 | 00:08:30 | A-我們來看 | ... |

gemma2 分析：Eli 展示黃金交易，回測站穩後進場，TP1 達標獲利平倉...

## 段落 2 ...
```

### 平行執行策略

```
Batch 1:  SRT 01-05 → 5 background sub-agents → ~4 min
Batch 2:  SRT 06-10 → 5 background sub-agents → ~4 min
...
Batch 17: SRT 81-82 → 2 background sub-agents → ~2 min
總計：~70 分鐘
```

每批完成後自動啟動下一批，不卡對話。

---

## Phase 2：KVS 截圖 + llava 分類

> 背景 sub-agent 串行執行（18GB RAM 限制，llava 不可平行）。

### Step 0：漸進式檢查

1. 讀取 `{CANDIDATES_DIR}/INDEX.md`，篩選 `✅ completed` 且最高分 ≥ 3 的
2. 檢查哪些已有截圖（`{STREAM_SCREENSHOTS}/{topic}/` 下有對應檔案）
3. 未截圖的 → 待處理清單
4. 沒有待處理 → 回報「Phase 2 已全部完成」→ 停止

### 執行

從待處理的候選段落中，逐一串行：

1. `yt-dlp --download-sections` 下載影片片段
2. `ffmpeg` 每 5 秒截圖
3. `llava:13b` 分類（用 Ollama HTTP API）
4. 截圖存到 `{STREAM_SCREENSHOTS}/{topic}/`
5. 更新 INDEX.md 標記該段落截圖完成

---

## Phase 3：彙整 test-cases

> 前景對話，Claude 判斷 + 使用者確認。

1. 從 82 份 `example-candidates/` 按 16 個概念主題分組
2. Claude 審閱截圖（Read 圖片），確認對/錯
3. 生成 `{TEST_CASES_DIR}/{topic}.md`：

```markdown
# 破框（Breakout）— 對/錯交易範例

## ✅ 正確範例

### 正確 #1 — 回測站穩後標準進場
- 直播：{youtube_id}（{標題}）
- 時間：32:17 - 33:45
- 商品：XAUUSD 15M
- Eli 說：「符合條件，執行而已」
- 截圖：![K 線圖](screenshot.jpg)
> Pine Script 驗證：`breakoutCondition()` 應回傳 `true`

## ❌ 錯誤範例

### 錯誤 #1 — 追單（進場距離過大）
- 直播：{youtube_id}（{標題}）
- 時間：45:20 - 46:10
- Eli 說：「已經跑這麼遠了，追上去不划算」
- 截圖：![K 線圖](screenshot.jpg)
> Pine Script 驗證：`entryFilter()` 應回傳 `false`
```

4. 更新 `{TEST_CASES_DIR}/INDEX.md`

---

## 注意事項

- Phase 1 用 background sub-agent 平行（每批 5 個），不卡對話
- Phase 2 的 llava 必須串行（18GB RAM 限制）
- Phase 2 的 llava 必須用 Ollama HTTP API，不可用 CLI
- gemma2 prompt 要明確指示「教學式錯誤警告也算有效」
- 不同直播的對/錯比例不同，不強制每部都有對和錯
- 最終按概念主題跨直播彙整，自然收集到對和錯
- 已移除的噪音詞：漂亮、精準、精確、可以做（太泛）
