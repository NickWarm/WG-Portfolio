---
name: vck
description: Video Connect Knowledge — 搜尋本地 SRT 逐字稿定位影片時間片段，整理成可查閱的定位文件。觸發條件：使用者說「找影片」「哪部影片有講...」「定位影片」，或呼叫 /vck。
---

# VCK — Video Connect Knowledge

根據關鍵詞搜尋本地 SRT 逐字稿，定位 Eli 課程影片和 YouTube 直播中講解特定概念的時間片段，整理成結構化文件存檔。

## 路徑常數

```
# 本地課程
COURSE_SRT_DIR = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/srt
COURSE_INDEX = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/index.json
COURSE_VIDEO_BASE = /Users/nicholas/Desktop/Trading/Eli_course

# YouTube 直播
STREAM_SRT_DIR = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/srt
STREAM_INDEX = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/index.json

# 輸出
COURSE_OUTPUT_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/video-clips/local-course
STREAM_OUTPUT_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/video-clips/youtube-streams
```

## 參數

從使用者訊息中解析以下資訊：

| 參數 | 必填 | 說明 |
|------|------|------|
| keywords | 是 | 搜尋關鍵詞（一個或多個） |
| topic | 是 | 主題關鍵字，用於檔名（kebab-case），若使用者未指定則根據 keywords 自動產生 |
| mode | 否 | `full`（全量，預設首次）或 `incremental`（漸進，定位文件已存在時預設） |

## 執行流程

### Step 0：判斷模式（全量 or 漸進）

檢查定位文件是否已存在：
- `{COURSE_OUTPUT_DIR}/{topic}.md` 或 `{STREAM_OUTPUT_DIR}/{topic}.md`

**不存在** → 全量模式（Step 1 搜全部 SRT）
**已存在** → 漸進模式：

1. 讀取定位文件 header 的 metadata：
   ```
   > 最後搜尋：{YYYY-MM-DD HH:MM}
   > 搜尋時 SRT 數：本地 {N} + 直播 {M} = {total}
   ```

2. 比對目前的 SRT 數量，找出新增的：
   - 本地課程：`ls COURSE_SRT_DIR/*.srt | wc -l` vs metadata 的 N
   - YouTube 直播：`ls STREAM_SRT_DIR/*.srt | wc -l` vs metadata 的 M
   - SRT 只增不減，所以數量差就是新增的
   - 新 SRT = 排序後取最後幾個（最新加入的在最後）

3. 沒有新 SRT → 回報「已是最新」→ 停止
4. 有新 SRT → 只搜新增的（Step 1 只傳入新 SRT 路徑）

5. 新命中的片段**追加**到定位文件尾部：
   - 全域編號從現有最後一個 # 接續（用 `grep "^| [0-9]" file | tail -1` 取最後編號）
   - 不動舊片段、不重新排序

6. 更新 metadata

### Step 1：搜尋 SRT 逐字稿

對每個關鍵詞，**同時搜尋兩個 SRT 目錄**：

```
# 搜尋本地課程 SRT
Grep(
  pattern = "{keyword}",
  path = COURSE_SRT_DIR,
  glob = "*.srt",
  output_mode = "content",
  -B = 2,
  -A = 1
)

# 搜尋 YouTube 直播 SRT
Grep(
  pattern = "{keyword}",
  path = STREAM_SRT_DIR,
  glob = "*.srt",
  output_mode = "content",
  -B = 2,
  -A = 1
)
```

`-B 2` 確保能擷取到匹配行上方的 SRT 時間碼行。

兩個搜尋結果分開處理，最終產出**兩份定位文件**：
- `{COURSE_OUTPUT_DIR}/{topic}.md` — 本地課程影片
- `{STREAM_OUTPUT_DIR}/{topic}.md` — YouTube 直播影片

### Step 2：解析結果

從 Grep 結果中提取三個欄位：

1. **影片名**：從匹配的檔案路徑取得（去掉 `.srt` 後綴）
2. **時間碼**：從匹配行上方的時間戳行解析（格式 `HH:MM:SS,mmm --> HH:MM:SS,mmm`），取開始時間
3. **內容**：匹配的逐字稿文字

SRT 結構範例：
```
410
00:04:32,000 --> 00:04:35,000
滿足區往上計算的方向嘛對不對
```

所以匹配「滿足區」時，`-B 2` 會抓到 `00:04:32,000 --> 00:04:35,000` 這行。

### Step 3：整理與分組

1. **按影片分組**：同一個 SRT 檔的結果歸在一起
2. **合併相鄰片段**：同影片中時間差 < 30 秒的連續匹配合併為一個區段
3. **排序**：按命中次數多到少排列影片
4. **查 index.json**：用 SRT 檔名查出影片的完整路徑（`source` 欄位）和所屬章節（`folder` 欄位）
5. **編號**：每個片段給一個全域流水編號（#1, #2, #3...），供 `/pv` 引用

### Step 3.5：LLM 時間區段分析（高命中影片）

對於命中次數 >= 10 的影片，使用本地 LLM（gemma2 9B via Ollama）分析討論的時間區段。

**觸發條件**：單一影片命中 >= 10 次

**流程**：
1. 收集該影片所有命中點的「時間 + 內容」
2. 整理成精簡格式（每行一個：`MM:SS 內容`）
3. 呼叫 gemma2 進行分析（見下方 prompt）
4. gemma2 回傳：時間區段 + 內容摘要 + 重要性 + 建議觀看順序

**Ollama 呼叫方式**：
```bash
ollama run gemma2:9b "以下是一部交易教學影片中，所有提到「{keyword}」的時間點和對應內容。請完成以下分析：

1. 將這些時間點歸類成幾個「連續討論區段」（兩個命中點之間超過 3 分鐘沒有命中，視為不同區段）
2. 簡述每個區段在講什麼
3. 評估每個區段的重要性：
   - 核心：概念定義、計算方法、關鍵原則（必看）
   - 實戰：實盤操作示範、案例分析（進階學習）
   - 補充：順帶提及、重複說明（可選看）
4. 根據學習邏輯建議觀看順序（定義 → 方法 → 實戰 → 檢討）

回傳格式：
區段 1：HH:MM:SS - HH:MM:SS
內容：{簡述}
重要性：核心/實戰/補充
觀看順序：1

區段 2：HH:MM:SS - HH:MM:SS
內容：{簡述}
重要性：核心/實戰/補充
觀看順序：2

命中時間點：
{所有命中點，每行一個}"
```

**輸出**：在定位文件中，高命中影片的詳細列表之前，插入一個「LLM 時間區段分析」表格：

```markdown
### LLM 時間區段分析（{filename}）

| 觀看順序 | 區段 | 時間範圍 | 內容 | 重要性 | 播放指令 |
|----------|------|----------|------|--------|----------|
| 1 | 1 | 03:18 - 07:18 | 開盤首K 的定義與概念 | 核心 | `mpv --start=00:03:18 "..."` |
| 2 | 3 | 12:44 - 25:26 | 開盤首K 的繪製與應用 | 核心 | `mpv --start=00:12:44 "..."` |
| 3 | 2 | 08:36 - 14:58 | 首K 策略規劃方式 | 實戰 | `mpv --start=00:08:36 "..."` |
| 4 | 5 | 36:30 - 57:02 | 實例分析 | 實戰 | `mpv --start=00:36:30 "..."` |
| - | 4 | 25:26 - 36:38 | 注意事項補充 | 補充 | `mpv --start=00:25:26 "..."` |
```

此表格同時作為定位文件中「建議觀看順序」的依據，不需要另外手動編排。

**跨影片觀看順序**：當多部影片都有 LLM 分析結果時，定位文件頂部的「建議觀看順序」應綜合所有影片的分析，按以下優先級排列：
1. 核心區段（所有影片中標記為「核心」的，按觀看順序排）
2. 實戰區段
3. 補充區段

**注意**：
- 需要 Ollama 已安裝且 gemma2:9b 已下載（`ollama list` 確認）
- 如果 Ollama 不可用，跳過此步驟，不影響其他流程
- gemma2 的回傳需要解析，去掉 terminal 控制字元後提取各欄位

### Step 4：存檔

產出**兩份定位文件**（如果該來源有命中的話）：

#### 4a. 本地課程定位文件

路徑：`{COURSE_OUTPUT_DIR}/{topic}.md`

```markdown
# 影片定位：「{keyword}」（本地課程）

> 搜尋關鍵詞：{keywords}
> 搜尋日期：{YYYY-MM-DD}
> 命中影片數：{N}
> 總片段數：{total}

---

## 1. {folder} / {filename}（命中 {n} 次）

| # | 時間 | 內容 | 播放指令 |
|---|------|------|----------|
| 1 | 00:18 | ... | `mpv --start=00:00:18 "{COURSE_VIDEO_BASE}/{source}"` |
```

#### 4b. YouTube 直播定位文件

路徑：`{STREAM_OUTPUT_DIR}/{topic}.md`

```markdown
# 影片定位：「{keyword}」（YouTube 直播）

> 搜尋關鍵詞：{keywords}
> 搜尋日期：{YYYY-MM-DD}
> 命中影片數：{N}
> 總片段數：{total}

---

## 1. {youtube_id} - {title}（命中 {n} 次）

| # | 時間 | 內容 | 播放指令 |
|---|------|------|----------|
| 1 | 32:17 | ... | YouTube: `https://www.youtube.com/watch?v={youtube_id}&t={seconds}s` |
```

直播定位文件的播放指令使用 **YouTube URL + 時間戳**（從 SRT 檔名提取 youtube_id）。

每個片段的 `#` 編號是全域連續的（跨影片不重置），方便用 `/pv` 指定播放。

### Step 5：更新索引

分別更新兩個 INDEX.md：

- `{COURSE_OUTPUT_DIR}/INDEX.md` — 本地課程
- `{STREAM_OUTPUT_DIR}/INDEX.md` — YouTube 直播

在表格最上方新增一行（最新在上）：

```
| {YYYY-MM-DD} | {topic} | {keywords} | {N} 個影片 / {total} 個片段 | [{topic}.md]({topic}.md) |
```

如果 INDEX.md 不存在，先建立：

```markdown
# 影片定位索引（YouTube 直播）

> 使用 /vck 搜尋 YouTube 直播 SRT 逐字稿產出的定位文件。

| 日期 | 主題 | 關鍵詞 | 命中 | 檔案 |
|------|------|--------|------|------|
```

### Step 6：回報結果

向使用者顯示摘要：
- **本地課程**：命中幾個影片、幾個片段
- **YouTube 直播**：命中幾個影片、幾個片段
- 各列出前 5 個命中最多的影片
- 提示可用 `/pv {#}` 播放指定片段

## 注意事項

- 搜尋範圍涵蓋**兩個來源**：本地課程 SRT + YouTube 直播 SRT
- 關鍵詞直接用中文搜尋，不需轉換
- 若搜尋結果過多（> 50 筆），只顯示命中次數最多的前 10 個影片，但檔案中保留完整結果
- 若關鍵詞無結果，建議使用者嘗試同義詞（如「滿足區」↔「力道滿足」↔「目標價」）
- 本地課程：SRT 檔名對應 `COURSE_INDEX` 的 `srt` 欄位，查出 `source`（影片路徑）
- YouTube 直播：SRT 檔名格式為 `{youtube_id} - {title}.srt`，從檔名提取 youtube_id 生成 YouTube URL
- 同一個 topic 如果重複搜尋，用數字後綴區分：`{topic}-2.md`
- 檔名一律 kebab-case
