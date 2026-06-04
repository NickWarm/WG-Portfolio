# /fxxxf2e 執行流程

```
/fxxxf2e 執行流程（v1.1 — 支援主動修復模式）
│
├─ 1. 【定位前端修改來源 + 模式偵測】
│   ├─ 從對話上下文取得 proposal 路徑
│   ├─ 搜尋 proposal 中的「# 前端修改」或「前端修改建議」區塊
│   │   ├─ 找到 → 提取內容
│   │   └─ 找不到 → 提示「此 proposal 沒有前端修改建議」→ 結束
│   ├─ 🆕 偵測模式：proposal 路徑含 `debug/potential-fix/`？
│   │   ├─ 是 → 標記「主動修復模式」，從檔名提取 {MMDD}_{apiName}
│   │   └─ 否 → 維持「Bug Fix 模式」，提取前綴 {MMDD}_{N}
│   └─ Bug Fix 模式：判斷 Proposal N（無後綴=1、_2_=2、_4_=4）
│
├─ 2. 【收集必要資訊】
│   ├─ 後端 commit hash
│   │   ├─ 從 proposal「## 實作完成紀錄」→ grep Commit Hash
│   │   └─ 找不到 → 標記「⚠️ 尚未 commit」
│   ├─ 🆕 模式分支：
│   │   ├─ 【Bug Fix 模式】
│   │   │   ├─ 對應 Issue # + Notion 票（從 proposal 或 bug spec）
│   │   │   └─ Bug 簡述（從 bug spec 標題或 proposal 標題）
│   │   └─ 【主動修復模式】
│   │       ├─ Notion 票 / Issue # → 標記 N/A
│   │       └─ 簡述 → 從 proposal 標題提取
│   ├─ 驗證資料 DB ID + 環境
│   │   └─ 從 proposal「API 驗證結果」或「DB 測試資料」或「驗證建議」提取
│   ├─ 前端專案名
│   │   └─ 從「# 前端修改（{project}）」括號內提取
│   └─ API 驗證範例（從 /check-result 驗證紀錄提取）
│       ├─ 從前端修改項目提取 endpoint + 欄位
│       ├─ 搜尋 proposal 驗證紀錄，比對 curl URL
│       ├─ 只提取前端修改用到的 endpoint（跳過純後端驗證）
│       └─ 找不到 → 不附
│
├─ 3. 【判斷：新建 or 追加】
│   ├─ 🆕 模式分支：
│   │   ├─ 【Bug Fix 模式】→ 檢查 {MMDD}_{N}_frontend_fix.md
│   │   └─ 【主動修復模式】→ 檢查 {MMDD}_{apiName}_frontend_fix.md
│   ├─ 不存在 → 新建模式
│   ├─ 已存在 → 追加模式
│   └─ 追加模式：wc -l 記錄當前行數 → start_line
│
├─ 4. 【寫入】
│   ├─ 🆕 模式分支（header 差異）：
│   │   ├─ 【Bug Fix 模式】
│   │   │   ├─ header：📋 Bug Spec + 前端專案
│   │   │   └─ 對應問題表：Notion 票 + Bug Spec Issue
│   │   └─ 【主動修復模式】
│   │       ├─ header：📋 來源：Data Flow 主動檢查 + 前端專案
│   │       └─ 對應問題表：Data Flow 問題編號（DF-N）+ 類型
│   ├─ 新建模式
│   │   ├─ header + --- 分隔線
│   │   ├─ 來源標記 + commit + 日期
│   │   ├─ 驗證資料表
│   │   ├─ 對應問題表
│   │   ├─ API 驗證範例（僅前端修改用到的 endpoint）
│   │   └─ 修改項目（檔案 + 問題 + 修改方式）
│   └─ 追加模式
│       ├─ --- 分隔線
│       ├─ 來源標記 + commit + 日期
│       ├─ 驗證資料表 + 對應問題表 + API 驗證範例
│       └─ 修改項目
│
├─ 5. 【sed + pbcopy】
│   ├─ end_line = wc -l（寫入後）
│   ├─ 新建模式：start_line = 1
│   ├─ 追加模式：start_line = 追加前行數 + 1
│   └─ sed -n '{start},{end}p' {file} | pbcopy
│       └─ 「✅ 本次新增內容已複製到剪貼簿」
│
├─ 6. 【更新 Bug Spec 索引】
│   ├─ 🆕 模式分支：
│   │   ├─ 【Bug Fix 模式】→ 找 {MMDD}_{N}_bug_spec.md
│   │   │   ├─ 有「## Proposal 索引」→ 新增/更新「前端修改建議」行
│   │   │   └─ 沒有 → 跳過
│   │   └─ 【主動修復模式】→ 跳過（沒有 bug spec）
│   └─ 已有前端修改建議行 → 更新項目數量
│
└─ 7. 【輸出】
    ├─ 文件路徑
    ├─ 本次新增 N 項修改
    └─ 🆕 罐頭留言（模式分支）：
        ├─ 【Bug Fix 模式】→ 現有罐頭留言
        └─ 【主動修復模式】→ 主動修復版罐頭留言（不含 Notion 票）
│
└─ 8. 【更新進度表】（@update-progress.md）
    └─ 將 /fxxxf2e 標記為 ✅
```
