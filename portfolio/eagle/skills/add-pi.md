---
description: 將 Data Flow 潛在問題納入 Proposal，一次修完
argument-hint:
design-doc: prompts/4_diary/debug/proposal/slash/add-pi_skill_proposal.md
---

@.claude/flowcharts/add-pi_flowchart.md

## 參數

- 無參數，從對話上下文自動判斷 proposal

## 任務

1. **定位來源**
   - 從對話上下文取得 proposal 路徑（最近執行的 `/debugP`，或用戶指定的 proposal）
   - 讀取 proposal，搜尋「## API Data Flow 參照」區塊
     - **有** → 提取 data-flow 文件路徑
     - **沒有** → 從 proposal 路徑或內容推斷 apiName，然後精確搜尋 data-flow 文件
       - **apiName 推斷規則**：
         - proposal 路徑含 `{xxx}_api/` → apiName = `{xxx}`（例：`transcript_api/` → `transcript`）
         - proposal 內容的 API 路徑含 `/api/v1/{xxx}` → apiName = `{xxx}`
       - **搜尋順序**（精確檔名，不用 Glob）：
         1. `prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md`
         2. `prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md`
       - 找到 → 繼續
       - 沒找到 → 提示「請先執行 /api-flow-architecture {apiName}」→ 結束
   - ⚠️ **搜尋路徑強制約束**：
     - ✅ 唯一搜尋目錄：`prompts/6_api_data_flow/adminApi/` 和 `prompts/6_api_data_flow/publicApi/`
     - ❌ 禁止在 `4_diary/` 底下搜尋 data-flow 文件
     - ❌ 禁止用 Glob 模糊搜尋 `*data*flow*`，必須用精確檔名 `{apiName}-data-flow.md`
   - 讀取 data-flow 文件

2. **提取所有已知問題**
   - 搜尋並提取以下區塊（找不到的就跳過，不報錯）：
     - **「## 問題清單」**：底下所有 `### ❌` 和 `### ⚠️` 子表格的每一行
     - **「## 500 防護檢查 → 500 路徑清單」**：表格中 ⚠️ 項目
     - **「## 資料流驗證 → 資料流斷點彙總」**：表格中 ❌ 和 ⚠️ 項目
     - **「-c 檢查發現的問題」**：表格中所有問題
     - **「-s 檢查發現的問題」**：表格中所有問題
   - **合併去重**：以「問題描述 + 位置」為唯一鍵，重複時保留嚴重度最高的（❌ > ⚠️ > ℹ️）
   - 無任何問題 → 顯示「ℹ️ data-flow 文件沒有已知問題」→ 結束

2.5 **【⚠️ 問題篩選】**（v1.1 新增）
   - **❌ 問題**：全部保留，不篩選
   - **⚠️ 問題**：逐一判斷是否為「真正的潛在問題」
     - **排除**：前端已防護（描述含 catch/fallback/disabled/v-if 防護）
     - **排除**：無人使用（標註「無前端頁面」「前端未使用」的 API/欄位）
     - **排除**：冗餘欄位（類型為「API 回傳但前端未使用」）
     - **保留**：可能導致錯誤、500、資料不正確的問題
   > 💡 **設計理由**：data-flow 的 ⚠️ 包含大量觀察/記錄性質內容（如「前端已有 fallback」「API 回傳但前端未使用」），這些不是需要處理的潛在問題。不篩選會增加 proposal 噪音。

3. **比對 proposal 現有內容**
   - 掃描 proposal 中的以下區塊：
     - `## 解法 N`
     - `## 後端修改`
     - `## 前端修改`
     - `## Data Flow 交叉檢核發現`
   - 比對方式：問題描述的關鍵字（欄位名、檔案路徑）是否出現在上述區塊中
   - 已涵蓋 → 標記「✅ 已涵蓋於 § 解法 N」
   - 未涵蓋 → 標記「🆕 需新增」

4. **寫入 proposal**
   - **全部已涵蓋** → 不新增區塊，顯示「✅ 已涵蓋所有已知問題」→ 跳到 Step 5
   - **有未涵蓋** → 新增或覆蓋「## 已知潛在問題（Data Flow）」
     - 寫入位置：proposal 末尾（若有「## 修改檔案清單」則放在它之前）
     - 已有此區塊 → 覆蓋更新
     ```markdown
     ## 已知潛在問題（Data Flow）

     > 📊 來源：`{data-flow 文件路徑}`
     > 🎯 目標：與本次 bug 修復一併處理

     ### ❌ 需修正（N 項）

     | # | 類型 | 問題描述 | 位置 | 狀態 |
     |---|------|---------|------|------|
     | DF-1 | {類型} | {描述} | {位置} | 🆕 需新增 |
     | DF-2 | {類型} | {描述} | {位置} | ✅ 已涵蓋於 § 解法 1 |

     #### DF-1：{問題標題}

     **問題**：{問題描述}

     **建議修改**：
     - {建議修改方式}

     （每個 🆕 的 ❌ 問題一個子章節，含問題描述 + 建議修改方式）

     ### ⚠️ 注意事項（K 項）

     | # | 類型 | 問題描述 | 位置 |
     |---|------|---------|------|
     | {#} | {類型} | {描述} | {位置} |
     ```

5. **輸出**
   - 顯示 proposal 路徑
   - 顯示 data-flow 來源路徑
   - 顯示納入的問題數量和涵蓋情況
   - 提示：「請執行 /reviewDoc 統一檢核」

### Step 6：更新進度表

@.claude/flowcharts/update-progress.md

執行進度表更新：將 `/add-pi` 對應的步驟標記為 ✅。

## 注意事項

- **❌ 全部納入，⚠️ 需經篩選**：排除已防護/無人用/冗餘，只保留真正可能出錯的問題
- **建議修改方式只針對 ❌ 問題**：⚠️ 問題只列表，不寫建議修改
- **不修改 data-flow 文件**：只讀取，不寫入
- **可重複執行**：重跑時覆蓋更新已有的「## 已知潛在問題」區塊
- **前後端欄位名不匹配的修法方向**：後端加開 alias 相容前端，保留原本參數名，不改前端。Input/Output 都要處理，同 API module 中所有同類問題統一處理。詳見 `/dpf` 定義檔「欄位名不匹配統一修法規則」
