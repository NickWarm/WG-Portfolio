---
description: 依照提案文件實作程式碼（自動檢核 + build 驗證）
design-doc: prompts/4_diary/debug/proposal/slash/implement_skill_proposal.md
---

@.claude/flowcharts/implement_flowchart.md

@/Users/nicholas/Desktop/Projects/.claude/modules/implement-rules.md

## 執行環境

- **程式碼修改**：`/Users/nicholas/Desktop/Projects/backend-nestjs/`
- **Build 執行**：`cd /Users/nicholas/Desktop/Projects/backend-nestjs && yarn build`

### 🚫 禁止修改的專案

以下專案**絕對禁止修改**，即使提案文件中有相關建議：

| 專案 | 路徑 | 說明 |
|------|------|------|
| dashboard-nuxt | `/Users/nicholas/Desktop/Projects/dashboard-nuxt/` | 前端 Dashboard 專案 |
| frontend-nuxt | `/Users/nicholas/Desktop/Projects/frontend-nuxt/` | 前端官網專案 |

**處理方式**：
- 如提案包含前端修改建議 → 在輸出中標註「前端修改：待處理」
- 不執行任何前端檔案的修改
- 提醒用戶需要另外處理前端修改

## Task 追蹤機制（強制啟用）

> ⚠️ **所有 /implement 執行都必須使用 Task 追蹤**，確保不會遺漏任何步驟

### Step 0: 建立進度追蹤（強制）

執行開始時，使用 TaskCreate 建立所有步驟：

| Task | Subject | activeForm | blockedBy |
|------|---------|------------|-----------|
| 1 | 判斷提案文件 | 判斷提案文件... | - |
| 2 | 讀取提案文件 | 讀取提案文件... | 1 |
| 3 | 分類修改項目 | 分類修改項目... | 2 |
| 4 | 拆分實作段落 | 拆分實作段落... | 3 |
| 4a+ | Phase N: {動態建立} | 實作 Phase N... | 4 |
| 5 | 執行 Build 驗證 | 執行 Build... | 4 |
| 6 | 雙重檢核 | 檢核修改內容... | 5 |
| 7 | 更新提案文件 | 更新提案文件... | 6 |
| 8 | 結束前檢查 | 確認所有步驟完成... | 7 |
| 9 | Step 10: 更新進度表 | 更新進度表中 | 8 |

### Task 更新規則

- 開始步驟時：`TaskUpdate(status: 'in_progress')`
- 完成步驟時：`TaskUpdate(status: 'completed')`
- 遇到問題時：保持 `in_progress` 並說明問題

## 任務

0. **建立進度追蹤**（強制）：使用 TaskCreate 建立上述 8 個步驟
1. 從對話上下文判斷要實作的提案文件
2. 讀取提案文件，理解修改內容
3. **分類修改項目**：
   - 後端修改（backend-nestjs）→ 加入執行清單
   - 前端修改（dashboard-nuxt / frontend-nuxt）→ 加入「待處理」清單，**不執行**
4. **分段實作後端程式碼**（核心步驟）：

   **4a. 分析提案結構，拆分實作段落**：
   - 偵測 proposal 中的 Phase / 階段 / 區塊
   - 為每個段落建立 sub-task（使用 TaskCreate）
   - 每個 sub-task 的 subject 格式：`Phase N: {段落描述}`

   **4b. 逐段實作**（每個段落重複以下步驟）：
   - 讀取該段落的修改內容
   - 修改對應的程式碼檔案
   - 段落完成後立即 TaskUpdate(completed)

   **4c. 單一段落的 proposal**：
   - 如 proposal 沒有明確分段 → 按修改檔案拆分
   - 每個檔案的修改為一個 sub-task

   > ⚠️ **禁止行為**：讀完整份 proposal 後長時間分析不動工。讀完即動手，邊做邊驗證。
5. 執行 build 驗證：
   ```bash
   cd /Users/nicholas/Desktop/Projects/backend-nestjs && yarn build
   ```
   - 如有錯誤，立即修正後重新 build
6. **雙重檢核**（Build 成功後執行）：
   - **第一次檢核**：重新讀取提案文件，逐項對照每個修改項目
   - **第二次檢核**：確認沒有做提案範圍外的修改
7. **更新提案文件**（雙重檢核通過後執行）：
   - 將已完成的修改區塊標題加上 ✅ 和完成日期
   - 更新分析結果區塊的狀態（缺少 → 已新增）
   - 新增「實作進度」區塊
   - 標記已解決的問題
   - **前端修改標註為「待處理」**
8. **結束前檢查**（強制）：
   - 執行 `TaskList` 查看所有 task 狀態
   - 確認所有 task 都是 `completed`
   - 若有未完成的 task → **先補完成再輸出結果**
   - 全部完成 → 輸出結果
9. 報告執行結果：
   - ✅ 實作完成項目清單（後端）
   - 🚫 前端修改（待處理）- 列出需要前端團隊處理的項目
   - ✅ 雙重檢核結果
   - ✅ Build 結果
   - ✅ 提案文件更新摘要
   - ❌ 如有錯誤，說明問題並修正
10. **提醒後續步驟**（Build 成功後顯示）：
    ```
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ✅ 實作完成！後續步驟：

    1️⃣  /check-result - 切換到 dev/staging DB，用 local API 驗證實作結果
    2️⃣  /gcommit-push - 更新提案文件並 commit

    🚫 前端修改需另外處理（若有）
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ```

### Step 10：更新進度表

@.claude/flowcharts/update-progress.md

執行進度表更新：將 `/implement` 對應的步驟標記為 ✅。
