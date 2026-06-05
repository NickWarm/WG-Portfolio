---
description: 批次生成影片逐字稿（srt + txt），支援背景執行與進度追蹤
---

## 來源模式

本 skill 支援兩種來源：

| 模式 | 觸發 | 輸入 | 來源目錄 | 輸出目錄 |
|------|------|------|----------|----------|
| **本地課程**（預設） | `/transcribe` | mp4 影片 | `Eli_course/各 STEP 資料夾/` | `transcripts/srt/` + `transcripts/txt/` |
| **YouTube 直播** | `/transcribe --streams` | mp3 音訊 | `transcripts/youtube-streams/audio/` | `transcripts/youtube-streams/srt/` |

## 設定

### 本地課程模式（預設）

- 影片目錄：`/Users/nicholas/Desktop/Trading/Eli_course`
- 逐字稿目錄：`/Users/nicholas/Desktop/Trading/Eli_course/transcripts`
- 腳本位置：`transcripts/generate-srt.sh`、`transcripts/srt-to-txt.sh`、`transcripts/update-index.sh`
- 索引文件：`transcripts/index.json`

### YouTube 直播模式（`--streams`）

- 音訊目錄：`/Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/audio`
- 逐字稿目錄：`/Users/nicholas/Desktop/Trading/Eli_course/transcripts/youtube-streams/srt`
- 腳本位置：`transcripts/youtube-streams/generate-srt.sh`
- 索引文件：`transcripts/youtube-streams/index.json`
- 音訊檔名格式：`{video_id} - {title}.mp3`（video_id 用於生成 YouTube URL）

## 參數解析

根據使用者輸入的參數 `$ARGUMENTS` 決定行為：

### --streams
範例：`/transcribe --streams`、`/transcribe --streams status`

切換為 YouTube 直播模式。後面可接與本地課程相同的子參數（status、index、指定檔案等）。流程與本地課程一致，差異：
- 輸入為 `.mp3`（非 `.mp4`）
- 使用 `youtube-streams/generate-srt.sh`
- 不需要 srt-to-txt 步驟（直播 SRT 不上傳 NLM，NLM 已有 YouTube 來源）
- index.json 額外記錄 `youtube_id` 欄位（從檔名解析）

### 無參數或指定子章節（本地課程模式）
範例：`/transcribe`、`/transcribe STEP 2.2`

1. 讀取 `transcripts/index.json`，篩出 `status: pending` 的影片
2. 如有指定子章節（如 "STEP 2.2"），只篩出檔名包含該關鍵字的影片
3. 用 `TaskCreate` 建立一個批次 task 追蹤進度
4. 從 index.json 取得每支影片的完整路徑（`source` 欄位），組成參數列表
5. 背景執行 `generate-srt.sh "路徑1.mp4" "路徑2.mp4" ...`（script 支援多參數）
6. 背景完成後執行 `srt-to-txt.sh`（無參數，自動轉換所有新 srt）
7. 用 `TaskUpdate` 將 task 標記為 completed
8. 回報結果與 index.json 的 summary

**重要**：呼叫 generate-srt.sh 時必須傳入完整的 .mp4 檔案路徑（相對於 transcripts 目錄，如 `"../STEP 2：學會核心技術 — 破框式交易法/STEP 2 | 2.3.0.mp4"`），不能只傳檔名前綴。

### 指定單一影片
範例：`/transcribe "STEP 1 | 1.1.mp4"`

1. 直接用 `generate-srt.sh` 處理該影片
2. 接著用 `srt-to-txt.sh` 轉換
3. 回報完成

### status
範例：`/transcribe status`

1. 讀取 `transcripts/index.json`
2. 回報 summary：已完成/總數、待處理數、總時長
3. 列出各資料夾的完成狀況

### index
範例：`/transcribe index`

1. 執行 `transcripts/update-index.sh` 重新掃描生成 index.json
2. 回報更新後的 summary

## 執行注意事項

- 使用 `run_in_background: true` 執行 whisper，不卡住對話
- 以子章節（子資料夾）為批次單位，一批跑完再通知
- generate-srt.sh 和 srt-to-txt.sh 跑完會自動呼叫 update-index.sh 更新索引
- 已存在的 srt/txt 會自動跳過，不重複處理
