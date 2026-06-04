---
name: ns
description: Note Sync — 漸進式同步 NotebookLM 筆記到本地，自動歸類到流程圖節點。觸發條件：使用者說「同步筆記」「拉筆記」「sync notes」，或呼叫 /ns。
---

# NS — Note Sync

漸進式同步 NotebookLM 筆記到本地，由 Claude 自動歸類到對應的流程圖節點。只拉新的，不覆寫已有的。

## 路徑常數

```
NOTES_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/nlm-queries/eli/notes
FLOWCHARTS_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/flowcharts
MAIN_FLOW = {FLOWCHARTS_DIR}/00-main-flow.md
README = {FLOWCHARTS_DIR}/README.md
SYNC_LOG = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/nlm-queries/eli/notes-sync-log.md
```

## 參數

| 參數 | 必填 | 說明 |
|------|------|------|
| notebook | 否 | 指定 notebook ID，預設：`3c06006b-1d2e-454e-8a69-ebffb61f7149`（Eli 直播回放 (1)） |

## 執行流程

### Step 1：差異比對

1. 呼叫 `mcp__notebooklm-mcp__note(action="list", notebook_id="{notebook}")` 取得 NLM 所有筆記的 id + title
2. 掃描本地 `{NOTES_DIR}/` 所有 .md 檔案，提取每個檔案中的 `Note ID` 欄位

```bash
Grep(pattern="Note ID", path=NOTES_DIR, glob="*.md", output_mode="content")
```

3. 計算差集：NLM 有但本地沒有的 = 新筆記清單
4. 如果沒有新筆記 → 回報「已是最新，共 {N} 則筆記同步中」→ 結束

### Step 2：拉取新筆記

對每則新筆記，直接拉取（不需確認）：

1. 從 Step 1 的 NLM 回傳中取得完整 content（note list 已包含內容）
2. 生成 kebab-case 檔名
3. 存檔到 `{NOTES_DIR}/{filename}.md`

檔案格式：
```markdown
# {title}

> 來源：NotebookLM 筆記（Eli 直播回放 (1)）
> Note ID：{note_id}

---

{content}
```

### Step 3：Claude 歸類

對每則新筆記，Claude 直接判斷歸類：

1. 讀取新筆記完整內容
2. 比對以下 19 個流程圖節點，判斷最相關的節點（可多個）：

| 編號 | 節點 | 流程圖檔案 |
|------|------|-----------|
| 0 | TradingView 配置 | — |
| 1 | 盤前規劃 | 01-pre-market/ |
| 2 | 時區判斷 | 01-pre-market/01-timezone-planning.md |
| 3 | 畫框 | 01-pre-market/02-box-drawing.md |
| 4 | 開盤首K | 01-pre-market/03-opening-k.md |
| 5 | 趨勢判斷 | 01-pre-market/04-trend-bias.md |
| 6a | 框外策略 | 02-entry/01-breakout-outside.md |
| 6b | 框內策略 | 02-entry/02-inside-box.md |
| 6c | 逆勢判斷 | 02-entry/03-counter-trend.md |
| 6d | 框邊等待 | 02-entry/04-box-edge-wait.md |
| 7 | 部位管理 | 03-position/01-scaling-in.md |
| 8 | 目標計算 | 03-position/03-satisfaction-zone.md |
| 9 | 風控停損 | 03-position/02-risk-control.md |
| 10 | 出場 | 04-exit/01-exit-sop.md |
| 11 | 盤後檢討 | 04-exit/02-post-review.md |
| A | 美元濾網 | modules/usd-index-filter.md |
| B | 支撐壓力互換 | modules/support-resistance-flip.md |
| C | 真假突破 | modules/true-false-breakout.md |
| D | 收盤價確認 | modules/close-confirmation.md |
| E | 破框指標 | modules/breakout-indicator.md |
| F | 交易成本 | — |
| G | 心態與常見錯誤 | — |

3. 判斷結果分流：
   - **屬於現有節點** → Step 4a
   - **不屬於任何現有節點** → Step 4b

### Step 4a：更新現有流程圖

1. 讀取對應節點的流程圖 .md 檔案
2. 在 `> ref:` 區塊新增一行引用：`> ref: {筆記檔名}.md`
3. **檢查筆記內容是否有新洞見**：比對筆記內容 vs 流程圖現有內容，若有流程圖尚未覆蓋的新邏輯/規則/條件，更新流程圖的決策樹
4. **同步更新完整流程圖**：`{FLOWCHARTS_DIR}/01-main-flow-all.md`（所有子流程展開版）
5. 更新 `{README}` 附錄的筆記對應表，新增一行：
   ```
   | {N+1} | `{filename}.md` | {節點編號}.{節點名} |
   ```

### Step 4b：建立新流程圖節點

當筆記內容不屬於任何現有節點時：

1. **判斷階段**：從筆記內容判斷屬於交易流程的哪個階段
   - 盤前規劃相關 → `01-pre-market/`
   - 進場條件相關 → `02-entry/`
   - 部位管理相關 → `03-position/`
   - 出場檢討相關 → `04-exit/`
   - 跨階段通用 → `modules/`

2. **建立新檔案**：
   - 決定順序編號（該資料夾內的下一個編號）
   - 建立 `{NN}-{topic}.md`
   - 包含：epl 格式決策樹 + ref 引用新筆記 + return 值定義

3. **更新主流程圖**：
   - 在 `00-main-flow.md` 的對應階段加入 `call {新節點}() → {路徑}`
   - **同步更新** `01-main-flow-all.md`（完整流程圖）

4. **更新 README**：
   - 流程圖檔案索引表加一行
   - 附錄對應表加一行

### Step 5：記錄 + 回報

1. 更新 `{SYNC_LOG}`（如不存在則建立）：

```markdown
# NLM 筆記同步記錄

| 日期 | 動作 | 筆記標題 | 歸類節點 |
|------|------|---------|---------|
```

每則新筆記加一行：
```
| {YYYY-MM-DD} | 新增 | {title} | {節點編號}.{節點名} |
```

2. 回報結果：
```
同步完成：新增 N 則
- {title} → {節點}
- {title} → {節點}
```

## 注意事項

- 只拉新的，不覆寫已有的筆記（本地可能有手動標注如 ⭐）
- 不處理 NLM 上刪除的筆記（本地永遠保留）
- 歸類由 Claude 直接判斷（不用 gemma2），因為：
  - Claude 有全局策略理解
  - 歸類結果累積策略知識，有助後續 Pine Script 開發
  - 新筆記數量少，不需要本地模型的批次處理
- 一則筆記可歸類到多個節點
- 建立新節點時，流程圖要符合 epl 風格（樹狀決策圖 + ref + return）
