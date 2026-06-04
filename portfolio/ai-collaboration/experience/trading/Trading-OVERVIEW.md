# Trading 專案

這是我把我的兩個交易的老師

- [老余的金融筆記](https://www.youtube.com/@KevinYuFutures)
- [Eli 伊萊](https://www.youtube.com/@Eli.ai.trades)

> 個人專案：用 Claude Code Skills 打造交易學習 + Pine Script 開發的完整工作流。
> 24 個 Skills，涵蓋「知識萃取 → 策略研究 → 指標開發 → 驗證部署」全鏈路。

他們的學習資源與交易策略，寫成指標
最初目標是完全自動化，但受限於 TradingView 的限制，只能做得到半自動化的指標
這邊不會透露 pine script 的程式碼，但會說明我在學習與實作時的思路

---

## AI 時代如何學習

> 最初的最初，闡述我如何思考與使用 AI 輔助我學習，以及我如何把這些流程自動化

### 情境 1: 快速學習

我為了要學習我不熟的外匯與期貨交易。

我直覺想到的是用 [NotebookLM](https://notebooklm.google.com/) 把，我購買的教學影片與直撥影片丟到 NotebookLM，然後來提問，快速理解概念

但我這邊遇到的第一個痛點：影片非常的多，我不想一個一個網址複製，然後去 NotebookLM 貼上，這件事應該要自動化才對

![img](../../../imgs/Trading/1_live_stream.jpg)


### 思考與操作方式

在 AI 時代，軟體開發會用終端機 (terminal) 跟 Claude Code 協作。

![img](../../../imgs/Trading/0_terminal.jpg)

軟體工程師在開發程式時，都會 GitHub 的 open source，像我最熟悉的程式語言 Ruby，與 Ruby On Rails 框架，都是可以看得到程式碼的 open source。 

在沒有 AI 的年代，針對要研究與開發的項目，我們會習慣用 google 去找各種文獻與 open source。

但是現在既然 AI 可以搜尋與閱讀，應該先透過 AI 去研究，然後我們再與 AI 討論各種可能性，然後再決定實作的方向與細節。

在開發時這樣，學習時，也該這樣。

關鍵：我應該 **在 terminal 讓 AI 自己去 github 搜尋，而不是讓 AI 像人一樣打開瀏覽器，去 google 上面搜尋**

所以我會安裝 [Github CLI](https://cli.github.com/) (簡稱 `gh`) 然後，我就可以在 terminal 
1. 叫 Claude Code 透過 `gh` 找到 [notebooklm-mcp-cli](https://github.com/jacob-bd/notebooklm-mcp-cli) 這套工具，來讓我在 terminal 用 cli 跟 notebookLM 的 api 溝通
2. 接著，我只要直接丟 eli 與 老余 的直撥網址到 terminal，然後 claude Code 就會幫我找到跟 NotebookLM 溝通的工具，把直撥影片丟到 notebookLM

![img](../../../imgs/Trading/3_eli_nlm.jpg)

然後我就能在 notebookLM 上面問各種問題，快速理解概念後，再回去看直撥影片，讓我對這些概念的理解更透徹

## 情境 2: 自動化偵測最新直撥與同步 notebookLM



## 一句話定位

把散落在 YouTube 影片、付費課程、NLM 筆記中的交易知識，用 **24 個 AI 指令（Skills）** 串成一條「學習 → 整理 → 開發 → 驗證」的自動化管線，讓交易策略的開發從「腦中想法」到「TradingView 上跑的指標」有標準流程。

---

## 背景與問題

交易學習涉及多位老師（Eli、老余）、數百部影片、多套策略系統。開發 Pine Script 指標時需要反覆查閱學習資料。痛點：

1. **知識分散** — 影片逐字稿、NLM 筆記、流程圖、概念文件散落各處，查一個概念要翻多處
2. **影片定位難** — 「哪部影片講過破底翻？在幾分幾秒？」靠記憶不可能
3. **Pine Script 開發品質不一** — 沒有標準 review 流程，refactor 容易引入 bug
4. **驗證缺乏標準** — 指標改了之後，怎麼確認視覺結果跟改之前一致？

---

## 系統架構

```
AI 輔助交易開發系統
│
├─ 1.【知識萃取層】影片 → 結構化知識
│     └─ 影片下載 → 逐字稿 → NLM 查詢 → 筆記同步 → 流程圖歸類
│
├─ 2.【策略研究層】知識 → 可執行策略
│     └─ 概念文件 → 影片定位 → 截圖分類 → 對錯範例提取
│
├─ 3.【指標開發層】策略 → Pine Script
│     └─ 規劃 → 模板 → 實作 → Review → Refactor → 同步
│
└─ 4.【驗證部署層】指標 → TradingView 驗證
      └─ K 線歸檔 → 繪圖提取 → 數據比對 → Cookie 維護
```

---

## 四條工作流程

### 流程 A：知識萃取（影片 → 結構化知識）

```
/yt-sync → /yt-enrich → /transcribe → /vck → /kvs → /ns
偵測新直播   下載+SRT     音訊轉逐字稿   影片定位  截圖+概念文件  同步筆記到流程圖
```

**產出**：逐字稿（SRT）、影片定位文件、截圖概念文件、NLM 筆記、流程圖更新

### 流程 B：策略研究（查詢 + 定位 + 範例）

```
/nq "概念" → /vck "概念" → /pv {#編號} → /tee → /rwp
NLM 查詢     影片定位       播放影片      提取對錯範例  審閱交易練習
```

**產出**：NLM 查詢記錄（raw + summary）、影片時間片段、對/錯交易範例

### 流程 C：Pine Script 開發（策略 → 指標）

```
/pine-manager → /pine-patterns → 實作 → /psbp → /pine-sync → /changelog
規劃開發        模板             寫code  Review+Refactor  雙層同步    更新版本
```

**產出**：Pine Script 指標、Code Review 文件、CHANGELOG

### 流程 D：驗證與數據（指標 → 確認正確）

```
/chart-archive → /ig → /draw-verify → /tv-cookie-refresh
K線歸檔          拉繪圖數據  報價比對驗證    Cookie 更新
```

**產出**：OHLCV 歸檔、繪圖數據、驗證結果

---

## 24 個 Skill 分類

### 知識萃取（10 個）

| Skill          | 用途                             | 串接位置    |
| -------------- | -------------------------------- | ----------- |
| `/nq`          | 查 NotebookLM，存 raw + summary  | 流程 B 起點 |
| `/ns`          | 同步 NLM 筆記，自動歸類到流程圖  | 流程 A 末端 |
| `/vck`         | SRT 搜尋定位影片時間片段         | 流程 A/B    |
| `/kvs`         | 影片截圖 + llava 分類 + 概念文件 | 流程 A      |
| `/tee`         | 從 SRT 提取對/錯交易範例         | 流程 B      |
| `/rwp`         | 審閱交易練習截圖                 | 流程 B      |
| `/rwp-prepare` | 載入審閱知識（RAG 搜尋規則）     | 流程 B 前置 |
| `/pv`          | mpv 播放影片（跳轉時間點）       | 流程 B      |
| `/transcribe`  | 音訊轉 SRT（mlx_whisper）        | 流程 A      |


### YouTube 同步（2 個）

| Skill        | 用途                                | 串接位置    |
| ------------ | ----------------------------------- | ----------- |
| `/yt-sync`   | 偵測新直播 + NLM 差異分析           | 流程 A 起點 |
| `/yt-enrich` | 下載音訊 + SRT + VCK + KVS + 流程圖 | 流程 A      |

### Pine Script 開發（5 個）

| Skill                | 用途                                   | 串接位置    |
| -------------------- | -------------------------------------- | ----------- |
| `/pine-manager`      | 複雜開發規劃                           | 流程 C 起點 |
| `/pine-patterns`     | Pine Script v6 標準模板                | 流程 C      |
| `/pine-sync`         | 子指標 / master / strategy 三層同步    | 流程 C      |
| `/psbp`              | 按社群規範 Review + Refactor（6 階段） | 流程 C      |
| `/tv-cookie-refresh` | 更新 TradingView session cookie        | 流程 D      |

### 資料與驗證（3 個）

| Skill            | 用途                            | 串接位置    |
| ---------------- | ------------------------------- | ----------- |
| `/chart-archive` | 每日增量 OHLCV K 線歸檔（7 TF） | 流程 D 起點 |
| `/draw-verify`   | 繪圖報價 + OHLCV 比對驗證       | 流程 D      |
| `/ig`            | 從 TradingView 拉指標繪圖數據   | 流程 D      |

### 工具（4 個）

| Skill           | 用途                     | 串接位置    |
| --------------- | ------------------------ | ----------- |
| `/epl`          | 摘要問題 + 流程圖說明    | 任何流程    |
| `/rat`          | 搜尋 WG-SOP 研究文件索引 | 任何流程    |
| `/changelog`    | 更新 WG-SOP CHANGELOG    | 流程 C 末端 |
| `/toggle-model` | 切換 Claude Code 模型    | 任何時候    |

---

## MCP Server 整合

| Server              | 用途                                  | 搭配 Skill            |
| ------------------- | ------------------------------------- | --------------------- |
| `notebooklm-mcp`    | NotebookLM 查詢、source 管理          | `/nq`、`/ns`          |
| `pinescript-server` | Pine Script 驗證、修正、生成          | `/psbp`               |
| `pinescript-docs`   | Pine Script v6 離線文件 + code review | `/psbp`               |
| `tradingview-chart` | TradingView 圖表截圖                  | `/draw-verify`、`/ig` |

---

## CLI 工具鏈

| 工具                   | 用途                          | 搭配 Skill                |
| ---------------------- | ----------------------------- | ------------------------- |
| `mpv`                  | 影片播放（時間跳轉）          | `/pv`                     |
| `yt-dlp`               | YouTube 音訊/片段下載         | `/yt-enrich`、`/dl-video` |
| `ffmpeg`               | 截圖、音訊轉檔                | `/kvs`、`/transcribe`     |
| `mlx_whisper`          | 音訊 → SRT（Apple Silicon）   | `/transcribe`             |
| `ollama` + `gemma2:9b` | 文字 LLM（時間區段分析）      | `/vck`                    |
| `ollama` + `llava:13b` | 視覺 LLM（截圖分類）          | `/kvs`                    |
| `rtk`                  | Bash 輸出壓縮（省 80% token） | 所有 Bash 操作            |

---

## 設計方法論

1. **全鏈路覆蓋** — 從「看影片學」到「寫出指標跑在 TradingView」，每個環節都有對應 skill，不靠人記流程。
2. **單一職責 + 可組合** — 每個 skill 做一件事，靠串接組出不同流程。`/vck` 單獨用也行，接在 `/yt-enrich` 後面也行。
3. **多工具協作** — 一個 skill 可能調用 NLM MCP + ollama + ffmpeg + git，Claude Code 當中控，統一指揮。
4. **漸進式知識累積** — 每次 `/yt-sync` 偵測新影片 → `/yt-enrich` 豐富知識 → `/ns` 歸類到流程圖，知識體系自動生長。
5. **開發驗證閉環** — `/psbp` Review → Refactor → 本地 JS 驗證 → TradingView 視覺確認 → commit，每步都有檢查點。

---

## 成果

- 5 位老師的影片知識結構化：Eli（77+ 部直播 + 本地課程）、老余、Riley、Sky 等
- 93 則 NLM 筆記自動歸類到 16 個流程圖節點 + 7 個模組
- 3,500+ 個影片時間片段定位（16 個主題）
- 16 份圖文概念文件（含實盤驗證截圖）
- WG-SOP Pine Script 指標（盤整框 + 亞當目標 + S/R，MTF 版 1,400+ 行）
- 每日增量 K 線歸檔（7 個時間週期，多商品）

---

## 履歷 Bullet

- 設計 24 個可組合的 AI 指令，串成「知識萃取 → 策略研究 → 指標開發 → 驗證」四條自動化工作流
- 整合 4 個 MCP Server + 6 個 CLI 工具，讓 Claude Code 統一調度影片處理、NLM 查詢、Pine Script 驗證、圖表截圖
- 將 5 位老師的數百部影片結構化為可查詢的知識體系（3,500+ 時間片段、93 則筆記、16 份概念文件）
- 體現能力：AI 工程、流程自動化、多工具整合、領域知識工程化
