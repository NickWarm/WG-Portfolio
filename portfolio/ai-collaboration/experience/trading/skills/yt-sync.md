---
name: yt-sync
description: YouTube 直播同步 — 偵測 Eli 新直播，加入 NLM，執行差異分析。觸發條件：使用者說「同步直播」「有新直播嗎」「check new streams」，或呼叫 /yt-sync。
---

# YT-SYNC — YouTube 直播同步

偵測 Eli 新直播，加入 NotebookLM，執行差異分析並出報告。輕量操作，幾分鐘完成。

## 路徑常數

```
CHANNEL_URL = https://www.youtube.com/@Eli.ai.trades/streams
URLS_FILE = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/urls.txt
INDEX_JSON = /Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/index.json
NQ_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/nlm-queries/eli
```

## NLM Notebooks

| Notebook | ID | 用途 |
|----------|-----|------|
| Eli 直播回放 (1) | `3c06006b-1d2e-454e-8a69-ebffb61f7149` | 前 39 部 |
| Eli 直播回放 (2) | `ac04959b-ab17-4131-9e51-920a284ee0eb` | 第 40 部起 |

上限 50 source/notebook。都滿了 → `notebook_create(title="Eli 直播回放 (N)")`。

## 執行流程

### Step 1：偵測新直播

```bash
yt-dlp --flat-playlist --print "%(id)s | %(title)s" "{CHANNEL_URL}"
```

比對本地 `{INDEX_JSON}` 的所有 `youtube_id`，計算差集。

- 有新的 → 列出標題，繼續
- 沒新的 → 回報「已是最新（N 部）」→ 停止

### Step 2：加入 NotebookLM

對每部新直播：

1. 用 `source_list_drive` 查各 notebook 的 source 數量
2. 選 source_count < 50 的 notebook
3. 都滿了 → `notebook_create(title="Eli 直播回放 (N)")` → 用新的
4. `source_add(notebook_id, source_type="url", url="https://youtube.com/watch?v={id}", wait=True)`
5. wait=True 確保 NLM 處理完成，可立即查詢

### Step 3：差異分析

加入 NLM 後立即執行：

```
notebook_query(
  notebook_id = "{加入的 notebook}",
  query = "比較最近新加入的直播影片和之前的影片，有沒有什麼新的洞見、觀點、概念、策略調整、或者之前直播沒有提到過的範例和想法？請具體指出哪些是新的內容。"
)
```

回傳包含 citations → 可追溯到具體 source_id。

存為 nq 格式：
- `{NQ_DIR}/eli-new-insights-{YYYY-MM-DD}-raw.md`
- `{NQ_DIR}/eli-new-insights-{YYYY-MM-DD}-summary.md`

Claude 判斷新內容影響範圍：
- 新概念 → 標記需更新流程圖
- 新範例 → 標記需更新概念文件
- 策略調整 → 標記 Pine Script 需修改

### Step 4：更新 URL 清單

```bash
echo "https://www.youtube.com/watch?v={id}" >> {URLS_FILE}
```

### Step 5：回報 + 停止

向使用者顯示：
- 新增 N 部直播標題
- 差異分析摘要（新洞見列表）
- 影響範圍（哪些流程圖/概念文件/Pine Script 可能需要更新）
- 「請審閱報告，需要豐富知識體系請執行 /yt-enrich」

## 注意事項

- 不下載音訊、不轉 SRT（由 /yt-enrich 處理）
- 一次可能偵測到 1-3 部新直播，逐一加入 NLM
- source_add 使用 wait=True，確保差異分析時新內容已索引
- 差異分析的 raw 檔完整保留 NLM 回傳，summary 由 Claude 整理
