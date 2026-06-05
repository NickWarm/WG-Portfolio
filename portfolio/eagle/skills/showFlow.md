---
description: 快速印出工作流程圖（API Data Flow / Data Flow 驅動 / Bug Fix）
argument-hint: [api|df|bug|u debug|u dpf]
design-doc: prompts/4_diary/debug/proposal/slash/showFlow_skill_proposal.md
---

@.claude/flowcharts/showFlow_flowchart.md

## 參數

- `$1`：可選，模式選擇
  - `u`：Update 模式 — 在 proposal 置頂建立進度表骨架
  - `api`：API Data Flow 建立流程（建立基礎資料）
  - `df`：Data Flow 驅動修復流程（QA 開票前）
  - `bug`：Bug Fix 流程（QA 開票後）
  - 無參數：三條流程總覽

- `$2`：僅 `u` 模式使用，流程類型
  - `debug`：Bug Fix 流程
  - `dpf`：Data Flow 驅動流程

## 任務

### Step 1：解析參數

- `$1 = u` → 進入 Update 模式（Step 2）
- 其他 → 進入顯示模式（Step 3）

### Step 2：Update 模式 — 建立進度表

**2.1 定位 Proposal**：
- 從對話上下文找到當前 proposal 路徑
- 找不到 → 提示用戶指定

**2.2 檢查置頂有無進度表**：
- 讀取 proposal 檔案，搜尋「## 工作流程進度」
- 已存在 → 回報「進度表已存在」，結束
- 不存在 → 繼續

**2.3 建立進度表骨架**：
- 插入位置：標題行之後、第一個 `## ` 正文區塊之前
- `$2 = debug` → 插入 Bug Fix 流程進度表：

```markdown
## 工作流程進度（Bug Fix）

> 最後更新：{YYYY-MM-DD} by /showFlow u

| # | 步驟 | 狀態 |
|---|------|------|
| 1 | /debugP | ⏸️ |
| 2 | /add-pi | ⏸️ |
| 3 | /reviewDoc | ⏸️ |
| 4 | /reviewDoc -data | ⏸️ |
| 5 | /implement | ⏸️ |
| 6 | /check-result | ⏸️ |
| 7 | /gcommit-push | ⏸️ |
| 8 | /fxxxf2e | ⏸️ |

---
```

- `$2 = dpf` → 插入 Data Flow 驅動流程進度表：

```markdown
## 工作流程進度（Data Flow 驅動）

> 最後更新：{YYYY-MM-DD} by /showFlow u

| # | 步驟 | 狀態 |
|---|------|------|
| 1 | /dpf | ⏸️ |
| 2 | /reviewDoc | ⏸️ |
| 3 | /reviewDoc -data | ⏸️ |
| 4 | /implement | ⏸️ |
| 5 | /check-result | ⏸️ |
| 6 | /gcommit-push | ⏸️ |
| 7 | /fxxxf2e | ⏸️ |

---

---
```

**2.4 輸出確認**：
```
✅ 進度表已建立於 {proposal 檔名}
```

### Step 3：顯示模式 — 印出流程圖（原有邏輯）

1. **解析參數 + 偵測進度 + 印出流程圖**

   **偵測當前進度**（best effort，從對話上下文）：
   - 搜尋最近執行的 skill 名稱（/exportN、/debugP、/dpf、/reviewDoc...）
   - 搜尋 proposal 路徑判斷流程類型：
     - 路徑含 `debug/potential-fix/` → Data Flow 流程
     - 其他 `debug/` 路徑 → Bug Fix 流程
   - 有 TaskList → 從 Task 狀態判斷
   - 找不到 → 不標記進度，只印流程圖

   **無參數模式**：印出三條流程總覽

   ```markdown
   # 🗺️ 工作流程總覽

   ## API Data Flow 建立流程（建立基礎資料）
   (/pull-frontend) → (/build-ui-index) → /api-flow-architecture → /review-api-flow

   ## Data Flow 驅動修復流程（QA 開票前）
   /dpf → /reviewDoc → /reviewDoc -data
   → /implement → /check-result → /gcommit-push → /fxxxf2e

   ## Bug Fix 流程（QA 開票後）
   /exportN → /debugP → /add-pi → /reviewDoc → /reviewDoc -data
   → /implement → /check-result → /gcommit-push → /fxxxf2e

   💡 執行 `/showFlow api`、`/showFlow df` 或 `/showFlow bug` 查看詳細步驟
   ```

   **api 模式**：印出 API Data Flow 建立詳細流程

   ```markdown
   # 🏗️ API Data Flow 建立流程（建立基礎資料）

   API Data Flow 建立流程
   │
   ├─ 1. /pull-frontend（optional，已拉過可跳過）
   │   └─ 拉取 dashboard-nuxt、frontend-nuxt 最新進度
   │
   ├─ 2. /build-ui-index（optional，已建過可跳過）
   │   └─ 掃描前端專案，建立 UI-API 索引
   │
   ├─ 3. /api-flow-architecture {apiName}
   │   └─ 建立後端 API 結構文件（Entity/DTO/Service/Controller）
   │
   └─ 4. /review-api-flow {apiName}
       └─ 前後端對齊檢查 → 產出問題清單（❌/⚠️）
   ```

   **bug 模式**：印出 Bug Fix 詳細流程

   ```markdown
   # 🐛 Bug Fix 流程（QA 開票後）

   Bug Fix 標準流程
   │
   ├─ 1. /exportN [Notion 票]
   │   └─ 匯出 Notion 票 → 建立 bug spec
   │
   ├─ 2. /debugP {env}
   │   └─ 分析 bug spec → 建立 proposal（含 API Data Flow 參照）
   │
   ├─ 3. /add-pi
   │   └─ 將 data-flow 已知潛在問題全部納入 proposal
   │
   ├─ 4. /reviewDoc
   │   ├─ 一般檢核（v3 自動驗證）
   │   ├─ Step 1.7A 程式碼品質檢核（500 防護 + 回傳型別）
   │   └─ Step 1.7B Data Flow 交叉檢核（有 data-flow 時）
   │
   ├─ 5. /reviewDoc -data {env}
   │   └─ 從 data-flow 推導 cases + 撈 DB 測試資料
   │
   ├─ 6. /implement
   │   └─ 依照 proposal 實作修正
   │
   ├─ 7. /check-result {env}
   │   └─ 使用 proposal 已準備好的資料驗證
   │
   ├─ 8. /gcommit-push
   │   └─ 更新 proposal 並提交 + 更新 scan-meta
   │
   └─ 9. /fxxxf2e
       └─ 提取前端修改建議 + 罐頭留言（含 Notion 票）
   ```

   **df 模式**：印出 Data Flow 驅動修復詳細流程

   ```markdown
   # 🔍 Data Flow 驅動修復流程（QA 開票前主動修復）

   Data Flow 驅動修復流程
   │
   ├─ 1. /dpf {apiName}
   │   └─ 從問題清單生 proposal（不需要 bug spec）
   │
   ├─ 2. /reviewDoc
   │   ├─ 一般檢核（v3 自動驗證）
   │   └─ ⏭️ 跳過 /add-pi（dpf 已納入所有問題）
   │
   ├─ 3. /reviewDoc -data {env}
   │   └─ 從 data-flow 推導 cases + 撈 DB 測試資料
   │
   ├─ 4. /implement
   │   └─ 依照 proposal 實作修正
   │
   ├─ 5. /check-result {env}
   │   └─ 驗證（帳號從 proposal「驗證建議」取得）
   │
   ├─ 6. /gcommit-push
   │   └─ 更新 proposal 並提交 + 更新 scan-meta
   │
   └─ 7. /fxxxf2e
       └─ 提取前端修改建議 + 罐頭留言（Notion 票 = N/A）
   ```

   **有進度時的標記**：用 ✅ 標記已完成、👉 標記當前步驟，最後提示下一步指令

   ```
   📍 當前進度：Step N {skill}
   ▸ 下一步：/{next-skill}
   ```

## 注意事項

1. **顯示模式為純輸出**：`api`/`df`/`bug`/無參數模式不修改任何檔案
2. **Update 模式會寫檔**：`u` 模式會修改 proposal 檔案（插入進度表）
3. **不需要 TaskCreate**：執行瞬間完成，不需要進度追蹤
4. **進度偵測是 best effort**：找不到上下文就不標記，不要猜測
5. **進度表由各 skill 更新**：`/showFlow u` 只建立骨架，後續由各 skill 透過 `@.claude/flowcharts/update-progress.md` 共用模組自動更新
