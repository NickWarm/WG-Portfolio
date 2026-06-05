# gcommit-push 執行流程

```
/gcommit-push 執行流程
│
├─ 1. 【讀取提案文件】
│   ├─ 讀取 $1 提案文件
│   └─ 提取「修改檔案清單」區塊
│
├─ 2. 【檔案一致性檢查】
│   ├─ 執行 git status（僅 backend-nestjs 目錄）
│   ├─ 比對預期修改 vs 實際修改
│   │   ├─ 遺漏 → 警告並詢問是否繼續
│   │   └─ 額外 → 列出提醒，不納入 commit
│   └─ 非 backend-nestjs 的修改 → 自動忽略
│
├─ 3. 【更新提案文件】
│   └─ 新增「## 實作完成紀錄」區塊
│       ├─ 完成時間
│       ├─ 修改檔案列表
│       └─ Commit message
│
├─ 4. 【決定 Commit Message】
│   ├─ 判斷前綴：fix: / feat: / refactor:
│   ├─ 純後端 → 單行英文訊息
│   └─ 有前端修改 → 加上 Frontend changes 摘要
│
├─ 5. 【執行 Git 操作】
│   ├─ git add（指定檔案，禁止 git add .）
│   ├─ git commit
│   └─ 取得 commit hash → 更新提案文件
│
├─ 5.5 【更新 Bug Spec 索引進度】（若有多份 proposal）
│   ├─ 從 proposal 路徑提取 {MMDD}_{N} 前綴
│   ├─ glob 計算同前綴 proposal 數量
│   │   └─ 1 份 → 跳過
│   ├─ 2 份以上 → 讀取 bug_spec「## Proposal 索引」
│   ├─ 比對本次完成項目，⏳ → ✅ + commit hash
│   └─ 更新 Proposal 標題行數和整體狀態
│
├─ 6. 【推送到遠端】
│   └─ git push origin adminApi
│
├─ 6.1 【建立/更新 ticket branch】
│   ├─ 決定 branch name
│   │   ├─ 有 $2（ticket-number）→ ticket/{number}-{slug}
│   │   └─ 無 $2 → {slug}
│   │   └─ slug：從 commit message 提取（去前綴，空格轉 -，全小寫）
│   ├─ 檢查 branch 是否存在（git branch -r --list）
│   │   ├─ 不存在 → git branch + git push origin
│   │   └─ 已存在 → git checkout + cherry-pick + push + checkout adminApi
│   └─ 輸出：🎫 {branch-name} 已建立/已更新
│
├─ 6.5 【更新 API Data Flow scan-meta】（若有對應文件）
│   ├─ 從 commit 檔案提取 apiName（src/api/**/{apiName}/）
│   │   └─ 無 API 檔案 → 跳過
│   ├─ 搜尋 data-flow 文件
│   │   ├─ prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md
│   │   ├─ prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md
│   │   └─ 找不到 → 跳過（不報錯）
│   ├─ 取得 push 後的 commit hash
│   ├─ 分類 commit 檔案，精準更新對應區塊的 scan-meta
│   │   ├─ *.entity.ts 變更 → 更新 Entity 區塊 scan-meta
│   │   ├─ *.dto.ts 變更 → 更新 DTO 區塊 scan-meta
│   │   ├─ *.service.ts 變更 → 更新 Service 區塊 scan-meta
│   │   └─ *.controller.ts 變更 → 更新 Controller 區塊 scan-meta
│   └─ 顯示更新結果
│
├─ 6.7 【更新 fixPermissionError 追蹤表】（若 proposal 路徑含 role_and_permission）
│   ├─ 偵測：proposal 路徑匹配 role_and_permission/debug/*_permission_error_fix_proposal.md
│   │   └─ 不匹配 → 跳過
│   ├─ 從路徑提取 apiName
│   ├─ 更新追蹤表：掃描 ✅ + 結果 ✅ 已修正 + 日期
│   └─ 重算統計數字
│
├─ 6.8 【更新 fix-id-string-number 追蹤表】（若 proposal 路徑含 _id_type_fix_proposal.md）
│   ├─ 偵測：proposal 路徑匹配 *_id_type_fix_proposal.md
│   │   └─ 不匹配 → 跳過
│   ├─ 從路徑提取 apiName（格式：{MMDD}_{apiName}_id_type_fix_proposal.md）
│   ├─ 更新追蹤表：Commit 欄位 → commit hash
│   └─ 重算統計數字
│
├─ 7. 【Migration 執行提醒】（若有 migration 檔案）
│   ├─ 從提案提取 table/column 資訊
│   ├─ 查詢 dev/staging DB 欄位是否存在
│   └─ 顯示各環境狀態提醒
│
├─ 8. 【生成罐頭留言】
│   ├─ 純後端 → 「交接給QA測試」
│   ├─ 有前端修改 → 「交接給前端處理」+ 提案路徑 + 行數範圍
│   ├─ 附加 🎫 Branch: {branch-name}（來自 Step 6.1）
│   └─ 多份 proposal → 標明「（Proposal N）」
│
├─ 8.5 【複製前端修改到剪貼簿】
│   ├─ 無前端修改 → 跳過
│   └─ 有前端修改 → sed + pbcopy → 顯示確認訊息
│
├─ 9. 【Proposal 行數檢查提醒】
│   ├─ <= 3000 行 → 不顯示
│   └─ > 3000 行 → 提醒：先 /compact 再 /splitP
│
├─ 9.5 【API Data Flow 更新提醒】（若 Step 6.5 有偵測到 API 變更）
│   ├─ Step 6.5 無 API 檔案 → 不顯示
│   └─ Step 6.5 有 apiName → 顯示提醒（依序執行）
│       ├─ 有 data-flow：
│       │   ├─ ▸ /api-flow-architecture {apiName}    ← 更新後端結構
│       │   └─ ▸ /review-api-flow {apiName}          ← 重新對齊前後端
│       └─ 無 data-flow：
│           ├─ ▸ /api-flow-architecture {apiName}    ← 建立後端結構（尚未建立）
│           └─ ▸ /review-api-flow {apiName}          ← 對齊前後端
│
└─ 9.7 【前端修改建議提醒】（若 Step 8 有取得行數範圍）
    ├─ Step 8 grep -n 未找到前端修改行數 → 不顯示
    └─ Step 8 有行數 + Step 8.5 已 sed + pbcopy → 顯示提醒：▸ /fxxxf2e
│
└─ 10. 【更新進度表】（@update-progress.md）
    └─ 將 /gcommit-push 標記為 ✅
```

## 專案範圍

⚠️ **此 skill 僅處理 backend-nestjs 專案的 commit**

- 工作目錄：`/Users/nicholas/Desktop/Projects/backend-nestjs`
- 非此專案的檔案修改會被自動忽略

## 驗證結果處理

| 情況 | 處理方式 |
|------|----------|
| 完全一致 | 直接進入 commit 流程 |
| 有遺漏 | 警告用戶，詢問是否繼續 |
| 有額外修改 | 列出提醒，不納入 commit（不詢問） |
| 兩者皆有 | 遺漏詢問；額外僅提醒 |

## Commit Message 格式

| 類型 | 格式 |
|------|------|
| 純後端 | `{prefix}: {apiName} {英文摘要}` |
| 含前端 | 主訊息 + `Frontend changes (xxx-nuxt):` 區塊 |
