---
name: yt-enrich
description: YouTube 直播知識豐富 — 下載音訊、轉 SRT、更新 VCK/KVS/流程圖/概念文件。觸發條件：使用者說「豐富知識」「更新知識體系」「enrich」，或呼叫 /yt-enrich。前提：先執行過 /yt-sync。
---

# YT-ENRICH — YouTube 直播知識豐富

用 /yt-sync 取得的新直播資料，豐富整個知識體系。耗時操作，背景執行。

**前提**：先執行過 `/yt-sync`，有差異分析報告。

## 路徑常數

```
# /yt-sync 產出
INSIGHTS_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/nlm-queries/eli
URLS_FILE = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/urls.txt

# 音訊 + SRT
AUDIO_DIR = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/audio
SRT_DIR = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/srt
INDEX_JSON = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/index.json
GENERATE_SRT = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/generate-srt.sh
UPDATE_INDEX = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/update-index.sh

# VCK
COURSE_VCK = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/video-clips/local-course
STREAM_VCK = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/video-clips/youtube-streams

# KVS（每個主題下有 screenshots/ 子目錄放 jpg）
STREAM_SCREENSHOTS = /Users/nicholas/Desktop/Trading/Eli_course/kvs-screenshots/youtube-streams

# 概念文件 + 流程圖
CONCEPT_DOCS = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/concept-docs
FLOWCHARTS = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/flowcharts
```

## 執行模式：兩階段（背景 + 前景）

yt-enrich 耗時長（30 分鐘 ~ 數小時），分兩階段執行，不卡對話：

- **Phase A（背景 sub-agent）**：Step 1-4，純重工，不需要對話互動
- **Phase B（前景對話）**：Step 5-7，需要 Claude 判斷 + 使用者確認

Phase A 完成後自動通知，主對話再繼續 Phase B。

---

## Phase A：背景處理（用 background sub-agent 執行）

> 啟動方式：用 `Agent` 工具，設定 `run_in_background: true`，將 Step 1-4 的完整指令交給 sub-agent。

### Step 1：讀取差異分析報告

讀取最新的 `/yt-sync` 產出：
- `{INSIGHTS_DIR}/eli-new-insights-{date}-summary.md`
- 確認有哪些新洞見需要處理
- 如果是手動加入的影片（非 /yt-sync），跳過此步

### Step 2：下載音訊 + 轉 SRT

對每部新直播（從 urls.txt 或 index.json 找 status: pending 的）：

```bash
# 下載音訊
yt-dlp -x --audio-format mp3 -o "{AUDIO_DIR}/{id} - {title}.mp3" "https://youtube.com/watch?v={id}"

# 轉 SRT（mlx_whisper medium，每部 15-40 分鐘）
{GENERATE_SRT} "{AUDIO_DIR}/{id} - {title}.mp3"

# 更新索引
{UPDATE_INDEX}
```

逐一處理，不平行。

### Step 3：/vck 漸進式搜尋

**只搜新增的 SRT**（不重跑舊的）：

1. 從 `{INDEX_JSON}` 找出新完成的 SRT 檔案
2. 對 16 個主題關鍵詞搜尋新 SRT
3. 新命中的片段**追加**到現有定位文件（不覆蓋舊的）：
   - `{STREAM_VCK}/{topic}.md` → 追加新片段
4. 高命中（>= 10）的新影片 → gemma2 時間區段分析

**重要**：漸進式追加，不覆蓋。

### Step 4：/kvs 新直播截圖

從 Step 3 新增的 VCK 片段取得時間區段：

1. `yt-dlp --download-sections` 下載片段（保留影片）
2. `ffmpeg` 每 5 秒截圖
3. `llava:13b` 分類（先預習 NLM 筆記 + 流程圖 + 已有概念文件）
4. 截圖 + 影片存到 `{STREAM_SCREENSHOTS}/{topic}/`

逐一處理不平行。

### Phase A 完成時

Sub-agent 回傳摘要：
- SRT 轉檔完成 N 部
- VCK 新增 M 個片段（列出哪些主題命中）
- KVS 截圖 N 張 + llava 分類結果

---

## Phase B：前景審閱（收到 Phase A 通知後，在主對話執行）

### Step 5：Claude 審閱截圖

讀取 Phase A 的 llava 分類結果，Claude 審閱決定保留/丟棄：
- A 類（投影片）→ 通常保留
- B 類（圖表）→ 通常保留，補充商品/時區/指標資訊
- C 類（其他）→ 逐張判斷

### Step 6：更新流程圖

根據 Step 1 的差異分析（或新影片內容），Claude 判斷：

- **新概念** → 在對應的流程圖新增節點或子節點
- **新資料** → 在對應節點的 ref 區塊新增引用
- **策略調整** → 修改流程圖邏輯
- 更新 `{FLOWCHARTS}/README.md` 附錄

### Step 7：更新概念文件 + 回報

- 新直播截圖加入對應的 `{CONCEPT_DOCS}/{topic}.md`
  - 標記為「實盤驗證」段落，跟教學截圖區分
- 差異分析中的新範例加入相關概念文件

向使用者顯示：
- SRT 轉檔完成 N 部
- VCK 新增 M 個片段
- 概念文件更新 K 個
- 流程圖更新 L 處
- Pine Script 影響提醒（如有）

## 注意事項

- **所有步驟逐一不平行**（18GB RAM 限制，見下方）
- SRT 轉檔最耗時（15-40 分鐘/部），背景執行
- /vck 必須是漸進式（只搜新 SRT，追加不覆蓋）
- /kvs 只處理新直播片段，不重跑舊的
- 影片片段保留不刪除（供 llava/Claude 看前後文）
- 流程圖更新由 Claude 判斷，不自動覆蓋

### 記憶體與 Agent 指派規則（實戰教訓）

18 GB RAM 環境下的硬性限制：

| 同時執行 | 結果 |
|---------|------|
| 1 yt-dlp + 1 llava | ❌ OOM killed（exit code 144） |
| 多個 yt-dlp agent | ❌ OOM killed |
| 1 llava + 1 非 GPU 任務 | ✅ 可行 |
| 1 yt-dlp → 完成後 → 1 llava | ✅ 串行可行 |

**Claude agent 指派方式**：
- yt-dlp 下載：逐一串行（一個完成再下一個）
- llava 分類：用獨立 Python 腳本（不用 Claude agent 內的 shell 迴圈）
- llava 必須用 Ollama HTTP API（`http://localhost:11434/api/generate`），不可用 `ollama run` CLI
- 詳見 `/kvs` SKILL.md 的「llava 操作限制」段落
