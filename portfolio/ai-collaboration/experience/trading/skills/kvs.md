---
name: kvs
description: Know Video and turn to Screenshot — 從 VCK 時間區段自動截圖，llava:13b 分類，Claude 審閱生成圖文概念文件。觸發條件：使用者說「截圖」「擷取影片畫面」「生成概念文件」，或呼叫 /kvs。
---

# KVS — Know Video and turn to Screenshot

從 VCK 時間區段自動擷取影片截圖，用 llava:13b 分類，Claude 審閱決定保留/丟棄，最終生成圖文概念文件。

## 路徑常數

```
# VCK 定位文件
COURSE_VCK_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/video-clips/local-course
STREAM_VCK_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/video-clips/youtube-streams

# 流程圖
FLOWCHARTS_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/flowcharts

# NLM 筆記
NOTES_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/nlm-queries/eli/notes

# 影片根目錄
VIDEO_BASE = /Users/nicholas/Desktop/Trading/Eli_course

# 輸出
CONCEPT_DOCS_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/concept-docs

# 截圖存放（每個主題下有 screenshots/ 子目錄放 jpg）
COURSE_SCREENSHOTS_DIR = /Users/nicholas/Desktop/Trading/Eli_course/kvs-screenshots
STREAM_SCREENSHOTS_DIR = /Users/nicholas/Desktop/Trading/Eli_course/kvs-screenshots/youtube-streams
# 結構：{COURSE_SCREENSHOTS_DIR}/kvs-{topic}/screenshots/*.jpg
#        {COURSE_SCREENSHOTS_DIR}/kvs-{topic}/classification.txt

# 暫存
TMP_DIR = /tmp/kvs-{topic}
```

## 參數

| 參數 | 必填 | 說明 |
|------|------|------|
| topic | 是 | 概念主題（對應 VCK 定位文件名，如 `opening-k`） |
| mode | 否 | `full`（全量，預設首次）或 `incremental`（漸進，概念文件已存在時預設） |

## 執行流程

### Step 0：判斷模式（全量 or 漸進）

檢查概念文件是否已存在：`{CONCEPT_DOCS_DIR}/{topic}.md`

**不存在** → 全量模式（從頭生成）
**已存在** → 漸進模式：

1. 讀取概念文件 header 的 metadata：
   ```
   > 最後更新：{YYYY-MM-DD}
   > 已處理影片：{影片 1, 影片 2, ...}
   > 截圖數：本地 {N} + 直播 {M}
   ```

2. 比對 VCK 定位文件中的所有影片，找出新增的：
   - VCK 有但 metadata 裡沒有的 = 新片段

3. 沒有新片段 → 回報「已是最新」→ 停止
4. 有新片段 → 只對新片段執行 Step 2-4

5. 新截圖追加到概念文件的「實盤驗證」段落：
   ```markdown
   ## 實盤驗證（YouTube 直播，漸進追加）

   > 以下截圖來自新直播，作為教學內容的實盤驗證。

   ### {直播標題}（{日期}追加）

   ![描述](screenshot.jpg)
   > Claude 描述
   ```

   教學截圖段落不動。

6. 更新 metadata

### Step 1：準備（讀取已有資源）

1. 讀取 VCK 定位文件，取得 gemma2 時間區段：
   - `{COURSE_VCK_DIR}/{NN}-{topic}.md` — 本地課程
   - `{STREAM_VCK_DIR}/{NN}-{topic}.md` — YouTube 直播（本階段先處理本地課程）

2. 從 VCK 的 LLM 時間區段分析表提取：
   - 時間範圍（開始 - 結束）
   - 重要性（核心 / 實戰 / 補充）
   - 影片路徑（從 mpv 播放指令提取）

3. 讀取對應的 NLM 筆記摘要（從 flowcharts/README.md 查該節點引用了哪些筆記）
   - 取前 200 字作為 llava 的上下文

4. 讀取對應的流程圖節點（知道 return 值和判斷邏輯）

5. 確認工具就緒：
   ```bash
   which ffmpeg && ollama list | grep llava:13b
   ```

### Step 2：ffmpeg 批次截圖

對每個 gemma2 時間區段：

```bash
# 建立暫存目錄
mkdir -p {TMP_DIR}

# 每 5 秒截一張
for i in $(seq 0 5 {duration_seconds}); do
  ts=$((start_seconds + i))
  h=$(printf "%02d" $((ts / 3600)))
  m=$(printf "%02d" $(((ts % 3600) / 60)))
  s=$(printf "%02d" $((ts % 60)))
  ffmpeg -ss "$h:$m:$s" -i "{video_path}" -vframes 1 -q:v 2 \
    "{TMP_DIR}/frame_${h}-${m}-${s}.jpg" -y 2>/dev/null
done
```

- 檔名格式：`frame_{HH-MM-SS}.jpg`
- 只處理核心和實戰區段（補充區段可選跳過以節省時間）

### Step 3：llava:13b 分類

**必須使用 Ollama HTTP API**（不用 `ollama run` CLI）。

寫一個獨立 Python 腳本 `/tmp/classify-{topic}.py` 批次處理：

```python
# 核心：用 Ollama API 呼叫 llava:13b
import json, urllib.request, base64, re

with open(img_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

payload = json.dumps({
    "model": "llava:13b",
    "prompt": "Classify this trading education screenshot:\n"
              "A=Slide (text/bullet points), B=Chart (candlesticks/indicators), C=Other (face/chat).\n"
              "Answer: Type: X\nDescription: one sentence.",
    "images": [b64],
    "stream": False
}).encode()

req = urllib.request.Request("http://localhost:11434/api/generate",
                              data=payload, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req, timeout=180)
text = json.loads(resp.read()).get("response", "")

# 解析：先找 Type: X，找不到就從內容推斷
type_match = re.search(r'[Tt]ype:\s*([ABCabc])', text)
type_letter = type_match.group(1).upper() if type_match else infer_from_text(text)
```

執行方式：`python3 /tmp/classify-{topic}.py`（背景執行）

**禁止事項**：
- ❌ 不可用 `ollama run` CLI（背景任務產生終端控制字元，破壞輸出解析）
- ❌ 不可在 Claude agent 內用 while 迴圈跑（subshell 變數遺失）
- ❌ 不可平行跑多個 llava 分類（18GB RAM 不夠，exit code 144）

**重要規則**：
- llava 只分類 + 描述，**不做丟棄決策**
- 所有類別（A + B + C）都保留，交給 Claude 審閱
- 產出分類結果清單：`{TMP_DIR}/classification.txt`
  - 格式：`{filename}|{type}|{description}`

### Step 3.5：去重

連續相同畫面只保留一張：
- 如果連續 3+ 張截圖的 llava 描述高度相似 → 只保留第一張
- 投影片類（A）尤其容易重複（同一頁停留很久）

### Step 4：Claude 審閱

Claude 讀取所有截圖（使用 Read 工具讀取圖片）+ 分類結果：

1. **A 類（投影片）**→ 通常保留，確認文字內容跟概念相關
2. **B 類（TradingView 圖表）**→ 通常保留，補充：
   - 商品名稱和時區（如 XAUUSD 15M）
   - 畫線工具（矩形框顏色、水平線位置）
   - 指標設定
   - 價格數值
3. **C 類（其他）**→ 逐張判斷：
   - 有教學價值（手勢指重點、白板說明）→ 保留
   - 確實無關（等待畫面、廣告）→ 丟棄
4. **修正 llava 描述錯誤**
5. **比對流程圖確認一致性**

### Step 5：生成概念文件

路徑：`{CONCEPT_DOCS_DIR}/{topic}.md`

```markdown
# {概念中文名} — 視覺參考文件

> 流程圖節點：{flowchart_path}
> NLM 筆記：{引用的筆記列表}
> VCK 定位：{vck_path}
> 生成日期：{YYYY-MM-DD}
> 截圖來源：{影片名}

---

## 1. {子概念標題}

{NLM 筆記的文字內容}

![{Claude 修正後的描述}]({screenshot_filename})
> {Claude 的詳細描述：商品、時區、畫線操作、指標參數}
> 分類：{slide/chart} | 時間：{HH:MM:SS} | 影片：{影片名}

---

## 2. {下一個子概念}

...
```

### Step 6：存檔 + 索引

1. **截圖存檔**：保留的截圖從 TMP 複製到截圖目錄
   ```
   {COURSE_SCREENSHOTS_DIR}/kvs-{topic}/screenshots/{影片名}_{HH-MM-SS}.jpg
   ```

2. **概念文件存檔**：
   ```
   {CONCEPT_DOCS_DIR}/{topic}.md
   ```

3. **更新索引** `{CONCEPT_DOCS_DIR}/INDEX.md`：
   ```markdown
   # 概念文件索引

   | 日期 | 概念 | 流程圖節點 | 截圖數 | 檔案 |
   |------|------|-----------|--------|------|
   | {date} | {topic} | {node} | {N} | [{topic}.md]({topic}.md) |
   ```

4. **清理暫存**：刪除 `{TMP_DIR}`

### Step 7：回報結果

向使用者顯示：
- 截圖總數 / 保留數
- 分類統計（A 幾張 / B 幾張 / C 保留幾張 / C 丟棄幾張）
- 概念文件路徑
- 精選 2-3 張截圖預覽

## 注意事項

- **llava 只分類，Claude 做決策** — llava 不丟棄任何截圖
- **每次只處理單一概念** — 避免 context 爆炸
- **先處理核心區段** — 補充區段可選擇跳過
- **本地課程優先** — YouTube 直播的截圖品質較差，之後再處理
- 需要 ollama + llava:13b 已安裝（`ollama list` 確認）
- 如果 llava 不可用，跳過 Step 3，直接讓 Claude 審閱所有截圖（但會很慢）
- 截圖為 jpg 格式（比 png 小，節省空間）
- 每 5 秒截一張，確保不遺漏重要畫面轉換

### llava 操作限制（實戰教訓）

1. **必須用 Ollama HTTP API**（`http://localhost:11434/api/generate`），不可用 `ollama run` CLI
   - CLI 在背景任務產生終端控制字元（spinner），破壞輸出解析
2. **批次分類用獨立腳本**（`.py`），不可在 Claude agent 內用 shell while 迴圈
   - agent subshell 會導致迴圈變數遺失
3. **禁止平行**：18GB RAM 下同時跑 llava + yt-dlp 會 OOM（exit code 144）
   - 同時間最多 1 個 llava 任務
4. **ollama 異常處理**：如果 ollama 卡住或回應異常，完全重啟：
   ```bash
   pkill -9 ollama && sleep 2 && ollama serve &
   ```
   不要反覆 pkill，會讓模型進入壞狀態
