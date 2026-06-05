# /splitP 設計稿

> 📅 建立日期：2026-02-04

---

## 問題描述

### 現況痛點

- 單一 proposal 檔案可能成長到 4,000+ 行（實際案例：`1228_1_transcript_findone_empty_response.md` 達 4,572 行）
- 過大的 proposal 導致 AI 讀取時 context 消耗過高，影響效能
- 現有流程（`/exportN`、`/gcommit-push`、`/findDoc`）都假設一張票只有一份 proposal
- 當有新問題需要提案時，只能繼續往已經很大的 proposal 裡面加

### 預期效益

- 超過 3000 行的 proposal 可以拆分為多份，降低單檔大小
- proposal 2 包含 proposal 1 的快速索引，方便查歷史
- bug_spec 作為導航中心，記錄所有 proposal 的索引
- 相關 skill 能正確處理多份 proposal 的情境

---

## 整體設計架構

### 涉及的變更範圍

```
/splitP（新建）
│
├─ 本體：建立 proposal 2 + 更新 bug_spec 索引
│
├─ Hook（新建）：PostToolUse 偵測 proposal 行數 > 3000 時提醒
│
└─ 連動調整（既有 skill）
    ├─ /gcommit-push：新增 Step 3.5 更新 bug_spec 索引
    ├─ /exportN：content_diff 遍歷所有 proposal 比對
    └─ /findDoc：不用改（glob 已能找到 proposal 2）
```

### 檔案命名規則

```
同一天、同分類的第一張票
├─ {MMDD}_1_bug_spec.md                        ← bug spec
├─ {MMDD}_1_{描述}_proposal.md                  ← proposal 1（無編號）
└─ {MMDD}_1_2_{描述}_proposal.md                ← proposal 2

同一天、同分類的第二張票
├─ {MMDD}_2_bug_spec.md                        ← bug spec
├─ {MMDD}_2_{描述}_proposal.md                  ← proposal 1
└─ {MMDD}_2_2_{描述}_proposal.md                ← proposal 2
```

**Glob 搜尋**：用 `{MMDD}_{N}_*` 找到一組完整文件（bug_spec + 所有 proposal）

---

## 執行流程圖

```
/splitP 執行流程
│
├─ 1. 【定位 Proposal】（Task 1 的一部分）
│   ├─ 優先：從對話上下文取得 proposal 路徑
│   │   └─ 前面的 /debugP、/implement、/gcommit-push 已經用過的路徑
│   ├─ 次選：$1 有提供 → 使用 $1
│   └─ 都沒有 → 詢問用戶
│
├─ 2. 【驗證與分析】（Task 1）
│   ├─ 檢查檔案存在
│   ├─ 計算行數
│   │   ├─ < 3000 → 提醒「尚未超過門檻，確定要拆分嗎？」
│   │   └─ >= 3000 → 繼續
│   ├─ 解析檔名，提取 {MMDD}_{N} 前綴
│   └─ 判斷 proposal 編號（是否已有 proposal 2）
│       ├─ 無 proposal 2 → 新建 _2_ 檔案
│       └─ 已有 proposal 2 → 新建 _3_ 檔案（依序遞增）
│
├─ 3. 【分析 Proposal 結構】（Task 2）
│   ├─ 讀取全文，解析各章節標題與行數範圍
│   ├─ 掃描狀態標記（✅ 已完成 / ⏳ / 無標記）
│   └─ 列出章節清單
│
├─ 4. 【確認搬移內容】（Task 3）
│   ├─ 情況 A：有明確的未處理章節
│   │   └─ 把所有未處理的章節搬到 proposal 2
│   ├─ 情況 B：沒有明確標記
│   │   └─ 把最後一個章節搬到 proposal 2
│   └─ 顯示搬移預覽，等待用戶確認
│
├─ 5. 【建立 Proposal 2 並更新 Proposal 1】（Task 4，blockedBy Task 3）
│   ├─ 生成 Proposal 1 快速索引表（主題 + 行數範圍 + 狀態）
│   ├─ 建立 Proposal 2 檔案
│   │   ├─ 命名：{MMDD}_{N}_2_{描述}_proposal.md
│   │   ├─ 寫入檔頭：延續自 + Proposal 1 快速索引
│   │   └─ 寫入搬移的章節內容
│   └─ 從 proposal 1 中刪除已搬移的章節
│
├─ 6. 【驗證內容完整性】（Task 5，blockedBy Task 4）
│   ├─ 記錄：原始 proposal 1 行數（拆分前已在 Step 1 取得）
│   ├─ 計算：拆分後 proposal 1 行數 + 搬移內容行數（不含 proposal 2 檔頭）
│   ├─ 比對
│   │   ├─ 一致 → ✅ 繼續
│   │   └─ 不一致 → ❌ 停止，回報差異行數，不繼續後續步驟
│   └─ 注意：proposal 2 檔頭（延續自 + 快速索引）是新增的，不計入搬移內容
│
├─ 7. 【更新 Bug Spec 索引】（Task 6，blockedBy Task 5）
│   ├─ 用 {MMDD}_{N}_ glob 找到 bug_spec
│   ├─ 檢查是否有「## Proposal 索引」區塊
│   │   ├─ 沒有 → 建立，同時寫入 proposal 1 和 2 的條目
│   │   └─ 有 → 新增 proposal 2 的條目
│   └─ 索引格式：條列式（每個 proposal 一個 ### 標題 + 具體問題條列）
│
├─ 8. 【Commit 拆分結果】（Task 7，blockedBy Task 6）
│   ├─ git add proposal 1、proposal 2、bug_spec
│   └─ git commit -m "splitP: {MMDD}_{N} 拆分 proposal 2"
│
└─ 9. 【回報結果】（Task 8，blockedBy Task 7）
    ├─ proposal 1：{搬移後行數} 行
    ├─ proposal 2：{新行數} 行
    ├─ 內容完整性：✅ 已驗證
    ├─ bug_spec 索引已更新
    ├─ commit hash
    └─ 顯示 proposal 2 檔案路徑
```

## Task 追蹤

使用 TaskCreate / TaskUpdate 追蹤執行進度，方便 compaction 後繼續。

| Task | 名稱 | activeForm | blockedBy | 說明 |
|------|------|------------|-----------|------|
| 1 | 定位 Proposal 並驗證 | 定位並驗證 Proposal | — | 智能定位 proposal 路徑、確認檔案存在、計算行數、提取前綴、判斷編號 |
| 2 | 分析 Proposal 結構 | 分析 Proposal 章節結構 | — | 讀取全文、解析章節標題與行數範圍、掃描狀態標記 |
| 3 | 確認搬移內容 | 等待用戶確認搬移內容 | — | 判斷搬移章節、顯示預覽、等待用戶確認 |
| 4 | 建立 Proposal 2 並更新 Proposal 1 | 建立 Proposal 2 並搬移章節 | Task 3 | 原子操作：建立新檔 + 從舊檔刪除，避免中斷導致內容重複或遺失 |
| 5 | 驗證內容完整性 | 驗證內容完整性 | Task 4 | 比對原始行數 vs 拆分後行數，確認無遺失 |
| 6 | 更新 Bug Spec 索引 | 更新 Bug Spec 索引 | Task 5 | 建立/更新 Proposal 索引區塊 |
| 7 | Commit 拆分結果 | Commit 拆分結果 | Task 6 | git add + commit（proposal 1、proposal 2、bug_spec） |
| 8 | 回報結果 | 回報拆分結果 | Task 7 | 顯示拆分摘要 + commit hash |

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 否 | proposal 路徑 或 Notion URL（可選） | `prompts/4_diary/.../1228_1_xxx_proposal.md` 或 `https://www.notion.so/xxxxx` |

### 智能定位邏輯

一個對話窗通常只處理一張票，因此 `/splitP` 不強制要求參數。

**定位優先順序**：

| 優先級 | 來源 | 說明 |
|--------|------|------|
| 1 | 對話上下文 | 前面的 `/debugP`、`/implement`、`/gcommit-push` 已經操作過的 proposal 路徑 |
| 2 | `$1` 參數 — 檔案路徑 | 用戶明確指定 proposal 路徑（適用於新開對話窗的情境） |
| 3 | `$1` 參數 — Notion URL | 用 `/findDoc` 邏輯找到 bug_spec + proposals，再判斷哪個需要拆分 |
| 4 | 詢問用戶 | 以上都沒有時，請用戶提供路徑 |

#### Notion URL 輸入流程

```
$1 是 Notion URL
│
├─ 1. 從 URL 提取 page_id（32 字元 hex）
├─ 2. 用 rg 搜尋 page_id → 找到 bug_spec
├─ 3. 從 bug_spec 路徑提取 {MMDD}_{N} 前綴
├─ 4. 用 glob {MMDD}_{N}_*_proposal.md 找到所有 proposal
│
├─ 5. 逐一檢查行數
│   ├─ 有超過 3000 行的 → 選該 proposal 進入拆分流程
│   ├─ 多份都超過 → 列出清單，詢問用戶要拆哪份
│   └─ 都沒超過 → 回報「目前不需要拆分」
│
└─ 6. 沒找到 proposal → 提示先用 /exportN 匯出並建立 proposal
```

**使用範例**：
```bash
# 情境 A：對話中已經在處理某張票（最常見）
/splitP

# 情境 B：新開對話窗，指定 proposal 路徑
/splitP prompts/4_diary/transcript_api/debug/1228_1_transcript_findone_empty_response.md

# 情境 C：用 Notion URL 自動找到 proposal 並檢查
/splitP https://www.notion.so/xxxxx-abc123def456
```

---

## 輸出格式

### 成功時

```markdown
✅ Proposal 拆分完成

## 拆分結果

| 檔案 | 行數 | 狀態 |
|------|------|------|
| 1228_1_transcript_findone_empty_response.md | 2,200 行 | 已完成項目 |
| 1228_1_2_transcript_batch_query.md | 2,372 行 | 未處理項目 |

## 搬移的章節

- 批次查詢效能優化（原 L2201-L3400）
- 分頁邏輯重構（原 L3401-L4572）

## Bug Spec 索引已更新

📄 1228_1_bug_spec.md 新增「## Proposal 索引」區塊
```

### 行數未達門檻時

```
⚠️ 此 proposal 目前 {N} 行，尚未超過 3000 行門檻
確定要拆分嗎？（Y/N）
```

### 失敗時

```
❌ 找不到指定的 proposal 檔案：{path}
```

---

## 實作細節

### Proposal 2 檔頭格式

```markdown
# {票標題} - Proposal 2

> 延續自：`{MMDD}_{N}_{描述}_proposal.md`（{原始行數} 行）
> 建立日期：YYYY-MM-DD

## Proposal 1 快速索引

| # | 主題 | 行數範圍 | 狀態 |
|---|------|----------|------|
| 1 | findOne 空回應修復 | L121-L800 | ✅ 已完成 |
| 2 | 關聯資料載入異常 | L801-L1500 | ✅ 已完成 |
| 3 | 權限檢查邏輯調整 | L1501-L2200 | ✅ 已完成 |

---

（以下為 proposal 2 的內容）
```

### Bug Spec 索引格式

```markdown
## Proposal 索引

### Proposal 1：`1228_1_transcript_findone_empty_response.md`（2,200 行，✅ 已完成）

- ✅ findOne 空資料回應修復
- ✅ POST 回傳資料不完整修復
- ✅ findOne 回傳結構不符合 DTO
- ✅ 建物新增謄本缺少 realEstateIdentifierId
- ✅ 成屋物件新增土地謄本 Land DTO 必填衝突

### Proposal 2：`1228_1_2_transcript_batch_query.md`（2,372 行，⏳ 進行中）

- ⏳ 批次查詢效能優化
- ⏳ 分頁邏輯重構
```

**狀態標記規則**：
- 從 proposal 的章節狀態標記提取（Step 2 已掃描）
- `✅`：該章節標記為已完成 / 已修復
- `⏳`：該章節標記為進行中或無標記

### 搬移內容判斷邏輯

```
掃描 proposal 各章節
│
├─ 辨識狀態標記
│   ├─ ✅ / 已完成 / 已修復 → 標記為「已完成」
│   ├─ ⏳ / 進行中 → 標記為「未處理」
│   └─ 無標記 → 標記為「未處理」
│
├─ 情況 A：有「已完成」與「未處理」的明確分界
│   └─ 未處理的章節全部搬到 proposal 2
│
└─ 情況 B：無明確標記
    └─ 最後一個章節搬到 proposal 2
```

### 需要讀取的檔案

| 檔案 | 用途 |
|------|------|
| `$1`（proposal 路徑） | 分析結構、提取章節、計算行數 |
| `{MMDD}_{N}_bug_spec.md` | 更新 Proposal 索引區塊 |

### 需要執行的指令

```bash
# 計算行數
wc -l {proposal_path}

# 找到同組的 bug_spec
ls {目錄}/{MMDD}_{N}_bug_spec.md

# 找到已有的 proposal 數量（判斷新 proposal 編號）
ls {目錄}/{MMDD}_{N}_*_proposal.md
```

### 注意事項

- proposal 1 的「問題描述」區塊（通常是第一個章節）不搬移，留在 proposal 1 作為共用背景
- 搬移前要顯示預覽，等待用戶確認才執行
- 如果 proposal 1 沒有明顯的章節結構，提醒用戶手動指定搬移範圍

---

## Hook 設計：Proposal 行數偵測

### 觸發條件

- PostToolUse Hook
- Edit 或 Write 工具修改了 `*_proposal.md` 檔案

### 行為

```
Hook 偵測流程
│
├─ 檢查修改的檔案是否為 *_proposal.md
│   ├─ 否 → 靜默退出
│   └─ 是 → 計算行數
│
└─ 行數判斷
    ├─ < 3000 → 靜默，不輸出
    └─ >= 3000 → 顯示提醒：
        ⚠️ 此 proposal 已達 {N} 行（超過 3000 行門檻）
        💡 建議執行 /splitP {proposal路徑} 拆分到 proposal 2
```

### 設計原則

- 平常完全不干擾，只在超過門檻時顯示一行提醒
- 不阻擋操作，只是提醒

---

## 連動調整：/gcommit-push

> ⚠️ **不自動維護 Bug Spec 索引**：原設計有 Step 3.5 自動更新索引，但考慮到 commit 時 context 可能已經很長（需要先 compact），改為只在流程最後提醒用戶手動執行 /splitP。

### 修改 Step 8：罐頭留言標明 proposal 來源

若存在多份 proposal，罐頭留言標明是哪份的修正：

```
📋 罐頭留言（可直接複製到 Notion）：
────────────────────────────────────
修正已經進 dev/staging，commit `{hash}` 交接給QA測試

📄 提案文件：{proposal_2_path}（Proposal 2）
────────────────────────────────────
```

### 新增 Step 9：Proposal 行數檢查提醒

在所有流程結束後，檢查 proposal 行數並提醒：

```
└─ 9. 【Proposal 行數檢查提醒】
    ├─ <= 3000 行 → 不顯示，結束
    └─ > 3000 行 → 顯示提醒：
        ⚠️ 此 proposal 已達 {N} 行（超過 3000 行門檻）
        💡 建議先執行 /compact 再執行 /splitP 拆分
```

---

## 連動調整：/exportN

### 修改 Step 3：content_diff 比對遍歷所有 proposal

**現有邏輯**：
```
content_diff 判斷流程
│
├─ 2. 如果有差異 → 讀取對應的 proposal 檔案（單數）
└─ 3. 檢查差異內容是否已存在於 proposal
```

**修改為**：
```
content_diff 判斷流程
│
├─ 2. 如果有差異 → 用 {MMDD}_{N}_ glob 找到所有 proposal
│   └─ 逐一讀取每份 proposal
│
└─ 3. 檢查差異內容是否已存在於任一 proposal
    ├─ 任一 proposal 中已存在 → 跳過（是我們寫的）
    └─ 所有 proposal 都不存在 → 保留（是同事補充的新內容）
```

### 修改流程圖

**現有**（流程圖 L49）：
```
├─ 2. 如果有差異 → 讀取對應的 proposal 檔案
```

**修改為**：
```
├─ 2. 如果有差異 → 讀取所有對應的 proposal 檔案（{MMDD}_{N}_*_proposal.md）
```

---

## 連動調整：/findDoc

**不需要修改**。

原因：`/findDoc` 的關聯文件發現（Step 4）已使用 `{MMDD}_{N}_*` glob 搜尋，proposal 2 的命名（`{MMDD}_{N}_2_xxx_proposal.md`）會被自動找到。

---

## Bug Spec 索引的生命週期

| 時機 | 寫入者 | 動作 |
|------|--------|------|
| 首次拆分 proposal | `/splitP` | 建立「## Proposal 索引」區塊，寫入 proposal 1 摘要 + proposal 2 條目 |
| 後續拆分 | `/splitP` | 新增 proposal 3+ 條目、更新既有條目 |
| 每次 commit | `/gcommit-push` | 只提醒用戶執行 /splitP（不自動更新索引） |

**索引建立者與維護者**：`/splitP`（統一管理）

---

## 設計決策記錄

### 2026-02-04：初始設計

**設計背景**：
- 實際案例 `1228_1_transcript_findone_empty_response.md` 達 4,572 行
- 原有流程假設一張票只有一份 proposal，無法處理超大 proposal 的情境

**關鍵設計決策**：

1. **bug_spec 作為導航中心**：索引集中在 bug_spec，而非修改留言或 proposal
   - 理由：`/findDoc`、`/debugP` 等 skill 都會先讀 bug_spec，自然看到索引

2. **Hook 偵測 + Skill 操作兩層分工**：
   - Hook 只負責提醒（>3000 行），不阻擋操作
   - `/splitP` 負責實際拆分，需要用戶主動觸發
   - 理由：拆分是重大操作，不應自動執行

3. **搬移邏輯簡化**：未處理章節搬走，或最後一節搬走
   - 不提供自由選擇章節的 UI
   - 理由：降低互動複雜度，用戶如需微調可事後手動處理

4. **`/gcommit-push` 只提醒，不自動維護索引**：
   - 每次 commit 時檢查行數，超過 3000 行提醒用戶執行 /splitP
   - 理由：commit 時 context 可能已經很長，自動化會增加 context 消耗，且可能需要先 compact
   - Bug Spec 索引的建立和維護統一由 /splitP 負責，職責更清晰

5. **`/exportN` content_diff 遍歷所有 proposal**：
   - 修改為 glob 找到所有 proposal 再逐一比對
   - 理由：避免同事補充的內容在 proposal 2 裡被誤判為「不存在」

6. **智能定位，參數可選**：
   - 一個對話窗只處理一張票，AI context 已知道當前的 proposal 路徑
   - 優先從對話上下文定位，`$1` 參數為備用（新開對話窗時使用）
   - 理由：減少用戶輸入負擔，避免複製貼上長路徑

7. **拆分後驗證內容完整性**（2026-02-04）：
   - 比對「原始 proposal 1 行數」vs「拆分後 proposal 1 行數 + 搬移內容行數」
   - proposal 2 的檔頭（延續自 + 快速索引）是新增的，不計入搬移內容
   - 不一致時立即停止，不繼續後續步驟（更新索引、commit）
   - 理由：拆分是不可逆操作，內容遺失比流程中斷更嚴重，必須在 commit 前攔截

8. **拆分完成後自動 commit**（2026-02-04）：
   - 拆分修改的三個檔案（proposal 1、proposal 2、bug_spec）自動 commit 到 prompts 專案
   - commit message：`splitP: {MMDD}_{N} 拆分 proposal 2`
   - 理由：拆分是確定性操作（用戶已確認搬移內容），不 commit 容易遺忘，且後續 `/exportN`、`/gcommit-push` 都依賴正確的檔案狀態

8. **Bug Spec 索引改用條列式格式**（2026-02-04）：
   - 原本用表格一行壓縮主題（如「問題一～六：findOne 空回應、POST 回傳不完整...」），資訊太簡略
   - 改為每個 proposal 用 `### Proposal N` 標題 + 條列具體處理的問題
   - 理由：索引的意義是讓人快速理解每份 proposal 做了什麼，只寫編號沒有參考價值

9. **支援 Notion URL 輸入**（2026-02-04）：
   - `$1` 可接受 Notion URL，自動用 `/findDoc` 邏輯找到 bug_spec → 提取前綴 → glob 找所有 proposal
   - 逐一檢查行數，超過 3000 行的才進入拆分流程
   - 理由：用戶常見流程是 `/findDoc <URL>` → 看到 proposal 很大 → 想拆分，直接支援 URL 省去手動複製路徑
   - bug_spec 不拆分，只拆 proposal；bug_spec 的索引由 Step 5 維護

---

## 待實作：新建模式 — `-n` 參數建立新 Proposal（2026-02-08）

> **發現日期**：2026-02-08
> **問題**：現有 `/splitP` 只支援「搬移模式」（行數 >3000 時搬移章節），無法處理「前一份 Proposal 已完成，需要建立全新 Proposal 處理新問題」的情境

### 問題分析

**場景**：
1. Proposal 4 已完成（後端修好），行數未超過 3000
2. QA retest 不通過，發現是前端問題
3. 需要建立 Proposal 5 來處理這些前端問題
4. Proposal 4 不需要搬移任何內容
5. 現有 `/splitP` 會提示「尚未超過 3000 行門檻，確定要拆分嗎？」→ 語意不對，這不是拆分，是新建

**根因**：
- `/splitP` 只有一種模式：從大 proposal 搬移章節到新 proposal
- 沒有「從零建立新 proposal，指定要處理的問題」的模式

### 解決方案

**新增 `-n` 參數**，觸發「新建模式」：

```
/splitP 兩種模式
│
├─ 搬移模式（現有，無 -n）
│   ├─ 觸發：/splitP [proposal-path]
│   ├─ 動作：從 proposal N 搬移未處理章節到 proposal N+1
│   └─ 結果：proposal N 變小，proposal N+1 接手未完成的工作
│
└─ 新建模式（新增，有 -n）
    ├─ 觸發：/splitP -n [proposal-path]
    ├─ 動作：建立空的 proposal N+1，指定要處理的問題
    ├─ 結果：proposal N 不動，proposal N+1 從零開始
    └─ 寫入規則：強制分段寫入（每段 ≤300 行）
```

### 模式判斷邏輯

```
/splitP 執行
│
├─ 有 -n 參數 → 新建模式（直接進入，不檢查行數）
│
└─ 沒有 -n → 搬移模式（現有流程不變）
    └─ < 3000 行 → 提醒「尚未超過門檻，確定要拆分嗎？」
```

### 新建模式流程

```
新建模式（/splitP -n）
│
├─ Step A：定位 + 判斷編號
│   ├─ 定位 proposal（現有智能定位邏輯）
│   ├─ 用 glob `{MMDD}_{N}_*_proposal.md` 找現有 proposal 數量
│   └─ 計算下一個編號
│
├─ Step B：收集問題清單
│   ├─ 讀取 bug_spec，找出未解決的問題
│   │   ├─ 有「## Proposal 索引」→ 比對索引，找出未被任何 proposal 覆蓋的問題
│   │   └─ 沒有索引 → 從留言中提取「測試不通過」相關的問題
│   ├─ 列出問題清單，等待用戶確認
│   └─ 用戶可以增減問題
│
├─ Step C：建立新 Proposal（強制分段寫入）
│   │
│   ├─ C-1：Write header（≤300 行）
│   │   └─ 內容：
│   │       ├─ 標題：# {票標題} - Proposal {N}
│   │       ├─ 延續自：`{前一份 proposal 檔名}`
│   │       ├─ 建立日期
│   │       ├─ 前 Proposal 快速索引表
│   │       └─ 當前問題快速索引表
│   │
│   ├─ C-2：逐段追加 Issue 內容（每段 ≤300 行）
│   │   └─ 對每個 Issue：
│   │       ├─ 讀取 bug_spec 中對應的 QA 留言和同事補充
│   │       ├─ 讀取前一份 Proposal 中的相關分析（如有）
│   │       └─ Edit 追加：問題描述、根本原因、修改方式、驗證方式
│   │
│   └─ C-3：Edit 追加尾部（≤300 行）
│       └─ 修改檔案清單 + 參考資料
│
├─ Step D：更新 Bug Spec 索引
│   ├─ 沒有「## Proposal 索引」→ 建立，同時寫入所有 proposal 的條目
│   └─ 有 → 新增 proposal N+1 的條目
│
├─ Step E：Commit
│   └─ git add + commit（新 proposal + bug_spec）
│
└─ Step F：回報結果
```

### 參數設計

| 參數 | 說明 | 範例 |
|------|------|------|
| `-n` | 新建模式旗標 | `/splitP -n` |
| `$1`（可選） | proposal 路徑或 Notion URL | `/splitP -n prompts/4_diary/.../1228_1_xxx_proposal.md` |

**使用範例**：
```bash
# 新建模式（從對話上下文定位）
/splitP -n

# 新建模式（指定路徑）
/splitP -n prompts/4_diary/transcript_api/debug/1228_1_transcript_findone_empty_response.md

# 搬移模式（現有，不變）
/splitP
/splitP prompts/4_diary/transcript_api/debug/1228_1_transcript_findone_empty_response.md
```

### 強制分段寫入規則

- **每段不超過 300 行**
- **Step C-1 用 Write**（建立新檔案）
- **Step C-2、C-3 用 Edit**（追加到已建立的檔案）
- 理由：一次性組合大量內容會導致 context 壓力過大，AI 可能送出空的 Write tool call

### 設計決策

| 討論項目 | 決策 |
|---------|------|
| 觸發方式 | `-n` 參數（不靠行數判斷） |
| 與搬移模式的關係 | 並存，由 `-n` 參數決定 |
| 寫入方式 | 強制分段寫入，每段 ≤300 行 |
| 問題來源 | 從 bug_spec 留言提取，用戶可增減 |
| 前 Proposal 處理 | 不動，不搬移任何內容 |
| Bug Spec 索引 | 同搬移模式，由 Step D 維護 |
| `/exportN` 連動 | `/exportN` 偵測到 QA retest 不通過時，提示用戶執行 `/splitP -n` |

### 實作狀態

- [x] 設計討論（2026-02-08）
- [x] 記錄到 splitP 設計稿（2026-02-08）
- [x] 記錄到 exportN 設計稿（2026-02-08，提示連動）
- [x] 修改 `splitP.md`：新增 `-n` 參數 + 新建模式流程（2026-02-08）
- [x] 修改 `splitP_flowchart.md`：更新流程圖（2026-02-08）
- [x] 修改 `exportN.md`：新增步驟 8（QA retest 偵測 → 提示 `/splitP -n`）（2026-02-08）
- [x] 修改 `exportN_flowchart.md`：更新流程圖（2026-02-08）
- [ ] 測試驗證
