# AI 協作 / Agent 設計作品集

我設計 Claude Code Skills、Hooks 與工作流，把「需要記憶、容易漏步驟、品質不一」的工作，
工程化成可重複、有護欄、可交接的標準管線。

本資料夾分兩類：

## experience/ — 實戰案例（已驗證）

我親自設計並在真實工作中使用過的系統，有具體成果。

- **[eagle/](experience/eagle/)** — 房地產 SaaS NestJS 後端：35 個 Skills + Hooks 自動護欄，把 bug 修復、API 對齊、部署流程標準化。
- **[trading/](experience/trading/)** — 個人交易學習與 Pine Script 開發：24 個 Skills 串成「知識萃取 → 策略研究 → 指標開發 → 驗證」全鏈路。

## skills/ — 本 repo 實際掛載運作的 skill

不是展示素材，是這個 repo 自己在用的 skill（真檔放這、靠 symlink 掛到 `~/.claude`）。

- **[compress-img/](skills/compress-img/)** — 依副檔名自動路由的圖片壓縮（PNG 無損 / JPG 有損）。
- **[fetch-jd/](skills/fetch-jd/)** — 抓 104 職缺 JD 寫成結構化 Markdown。

> 針對目標公司的概念設計（proposals，未驗證）已移到 `workspace/proposals/`，本機留存、不版控。

---

## 設計方法論

（暫留空——等 experience 內容夠厚後，再從中萃取共通哲學。
寫得太早會變空泛口號，等內容夠厚再回頭寫）
