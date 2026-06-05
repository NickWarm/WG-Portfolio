# exportN 執行流程

```
/exportN 執行
│
├─ 1. 【呼叫 Wrapper 腳本】
│   └─ 回傳 JSON（含 existing_tickets, new_tickets, content_diff）
│
├─ 2. 【處理已存在的票 - 留言更新】
│   ├─ file 包含 "1_discuss.md" → 跳過，回報「索引檔略過」
│   ├─ 補寫 ticket_number（Step 2/3 共用前置）
│   │   ├─ 檢查 bug_spec header 是否有 Ticket: 行
│   │   ├─ 沒有 + ticket_number 不為 null → 在「網址：」行後插入
│   │   └─ 已有或 null → 跳過
│   └─ has_new_comments: true → 追加到「## 留言」區塊
│
├─ 3. 【處理已存在的票 - 同事補充內容】
│   ├─ file 包含 "1_discuss.md" → 跳過，回報「索引檔略過」
│   ├─ 補寫 ticket_number（同 Step 2，若已補寫則跳過）
│   └─ has_content_update: true
│       ├─ 比對 content_diff.new_content 與 bug_spec 現有內容
│       │   ├─ 實質相同（只有格式差異）→ 跳過，回報「內容無變更」
│       │   └─ 有新內容 → 執行兩階段更新
│       │       ├─ 階段 1：更新 bug_spec（追加「### 同事補充」）
│       │       └─ 階段 2：AI 智能分派到 proposal
│       │           ├─ 只有一份 proposal → 直接使用
│       │           └─ 多份 proposal → 選「進行中」或編號最大的
│
├─ 4. 【處理新票】
│   ├─ 合併到 {MMDD}_1_bug_spec.md
│   └─ 每張票 header 包含 Ticket: #{ticket_number}（null 時省略）
│
├─ 5. 【更新 index.md】
│
├─ 6. 【列出 proposal 檔案】
│
├─ 7. 【回報結果】
│   └─ 更新 X 張（留言）、內容更新 X 張、內容相同 X 張（跳過）、新增 X 張、跳過 X 張、補寫 Ticket X 張
│
└─ 8. 【QA retest 不通過偵測】
    ├─ 掃描 new_comments 是否包含「測試不通過」
    │   ├─ 沒有 → 結束
    │   └─ 有 → 繼續
    ├─ 用 glob 找現有 proposal 數量，計算下一個編號
    ├─ 從留言提取未解決問題清單
    └─ 輸出提示：問題清單 + 「建議執行 /splitP -n {proposal_path}」
```

## 輸入判斷

```
if $1 starts with "https://www.notion.so/" or "notion.so/":
    → 方式二：從 URL 提取 page_id → 取得票標題 → 提取分類
else:
    → 方式一：直接使用 $1 作為分類
```

## content_diff 判斷流程

```
content_diff 判斷流程
│
├─ 1. 比對 Notion 與 bug_spec 內容差異
│
├─ 2. 如果有差異 → 讀取對應的 proposal 檔案
│
└─ 3. 檢查差異內容是否已存在於 proposal
    ├─ 已存在 → 跳過（是我們寫的，不需要同步）
    └─ 不存在 → 保留（是同事補充的新內容）
```
