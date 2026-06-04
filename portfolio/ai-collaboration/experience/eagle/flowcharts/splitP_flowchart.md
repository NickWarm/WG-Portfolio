# splitP 執行流程

```
/splitP 執行流程
│
├─ 0. 【模式判斷】
│   ├─ 有 -n 參數 → 新建模式（見下方）
│   └─ 沒有 -n → 搬移模式（Step 1-8）
│
├─ 1. 【定位 Proposal 並驗證】
│   ├─ 定位來源
│   │   ├─ 對話上下文有 proposal 路徑 → 直接使用
│   │   ├─ $1 是檔案路徑 → 直接使用
│   │   ├─ $1 是 Notion URL → /findDoc 邏輯
│   │   │   ├─ 提取 page_id → rg 找 bug_spec → glob 找 proposals
│   │   │   ├─ 沒找到 proposal → 提示用 /exportN
│   │   │   ├─ 一份超過 3000 行 → 選該份
│   │   │   ├─ 多份超過 3000 行 → 詢問用戶要拆哪份
│   │   │   └─ 都沒超過 → 回報「目前不需要拆分」
│   │   └─ 無 $1 → 詢問用戶
│   ├─ 確認檔案存在
│   ├─ 計算行數
│   │   ├─ < 3000 → 提醒「尚未超過門檻，確定要拆分嗎？」
│   │   └─ >= 3000 → 繼續
│   ├─ 解析檔名，提取 {MMDD}_{N} 前綴
│   └─ 判斷 proposal 編號
│       ├─ 無 proposal 2 → 新建 _2_ 檔案
│       └─ 已有 proposal 2 → 新建 _3_ 檔案（依序遞增）
│
├─ 2. 【分析 Proposal 結構】
│   ├─ 讀取全文，解析各章節標題與行數範圍
│   ├─ 掃描狀態標記（✅ 已完成 / ⏳ / 無標記）
│   └─ 列出章節清單
│
├─ 3. 【確認搬移內容】
│   ├─ 情況 A：有明確的未處理章節
│   │   └─ 把所有未處理的章節搬到 proposal 2
│   ├─ 情況 B：沒有明確標記
│   │   └─ 把最後一個章節搬到 proposal 2
│   └─ 顯示搬移預覽，等待用戶確認
│
├─ 4. 【建立 Proposal 2 並更新 Proposal 1】（blockedBy Step 3）
│   ├─ 生成 Proposal 1 快速索引表（主題 + 行數範圍 + 狀態）
│   ├─ 建立 Proposal 2 檔案
│   │   ├─ 命名：{MMDD}_{N}_2_{描述}_proposal.md
│   │   ├─ 寫入檔頭：延續自 + Proposal 1 快速索引
│   │   └─ 寫入搬移的章節內容
│   └─ 從 Proposal 1 中刪除已搬移的章節
│
├─ 5. 【驗證內容完整性】（blockedBy Step 4）
│   ├─ 原始 proposal 1 行數 vs 拆分後 proposal 1 + 搬移內容行數
│   ├─ proposal 2 檔頭（快速索引）不計入
│   ├─ 一致 → ✅ 繼續
│   └─ 不一致 → ❌ 停止，不繼續後續步驟
│
├─ 6. 【更新 Bug Spec 索引】（blockedBy Step 5）
│   ├─ 用 {MMDD}_{N}_ glob 找到 bug_spec
│   ├─ 檢查是否有「## Proposal 索引」區塊
│   │   ├─ 沒有 → 建立，同時寫入 proposal 1 和 2 的條目
│   │   └─ 有 → 新增 proposal 2 的條目
│   ├─ 格式：條列式（每個 proposal 一個 ### 標題）
│   └─ 每個項目標記 ✅ 或 ⏳ 狀態
│
├─ 7. 【Commit 拆分結果】（blockedBy Step 6）
│   ├─ git add proposal 1、proposal 2、bug_spec
│   └─ git commit -m "splitP: {MMDD}_{N} 拆分 proposal 2"
│
└─ 8. 【回報結果】（blockedBy Step 7）
    ├─ proposal 1：{搬移後行數} 行
    ├─ proposal 2：{新行數} 行
    ├─ 內容完整性：✅ 已驗證
    ├─ bug_spec 索引已更新
    ├─ commit hash
    └─ 顯示 proposal 2 檔案路徑
```

## 搬移內容判斷邏輯

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

## 注意事項

- proposal 1 的「問題描述」區塊（通常是第一個章節）不搬移，留在 proposal 1 作為共用背景
- 搬移前要顯示預覽，等待用戶確認才執行
- 如果 proposal 1 沒有明顯的章節結構，提醒用戶手動指定搬移範圍

---

## 新建模式流程（-n 參數）

```
/splitP -n 新建模式
│
├─ 1N. 【定位 Proposal 並判斷編號】
│   ├─ 定位 proposal（同搬移模式智能定位邏輯）
│   ├─ 用 glob 找現有 proposal 數量
│   └─ 計算下一個編號
│
├─ 2N. 【收集問題清單】
│   ├─ 讀取 bug_spec
│   │   ├─ 有「## Proposal 索引」→ 比對索引，找未覆蓋的問題
│   │   └─ 沒有索引 → 從留言提取「測試不通過」相關問題
│   ├─ 列出問題清單
│   └─ 等待用戶確認（可增減）
│
├─ 3N. 【建立新 Proposal】（強制分段寫入，每段 ≤300 行）
│   ├─ 3N-1：Write header（標題、延續自、前 Proposal 索引、問題索引）
│   ├─ 3N-2：逐段 Edit 追加 Issue（問題描述、根因、修改方式、驗證）
│   └─ 3N-3：Edit 追加尾部（修改檔案清單 + 參考資料）
│
├─ 4N. 【更新 Bug Spec 索引】
│   ├─ 沒有「## Proposal 索引」→ 建立，寫入所有 proposal 條目
│   └─ 有 → 新增新 proposal 條目
│
├─ 5N. 【Commit】
│   └─ git add 新 proposal + bug_spec → commit
│
└─ 6N. 【回報結果】
    ├─ 新 proposal 檔名 + 行數
    ├─ 處理的問題清單
    ├─ bug_spec 索引已更新
    └─ commit hash + 檔案路徑
```
