---
description: 從 proposal 提取前端修改建議，生成/追加到 frontend_fix 文件
argument-hint:
design-doc: prompts/4_diary/debug/proposal/slash/fxxxf2e_skill_proposal.md
---

@.claude/flowcharts/fxxxf2e_flowchart.md

## 參數

- 無參數，從對話上下文自動判斷 proposal

## 任務

1. **定位前端修改來源 + 模式偵測**
   - 從對話上下文取得 proposal 路徑（最近執行的 `/gcommit-push` 或 `/implement`）
   - 搜尋 proposal 中的「# 前端修改」或「前端修改建議」區塊
   - 找不到 → 提示「此 proposal 沒有前端修改建議」→ 結束
   - 🆕 **偵測模式**：proposal 路徑含 `debug/potential-fix/`？
     - **是** → 標記「主動修復模式」（dpf 產出），從檔名提取 `{MMDD}_{apiName}`
     - **否** → 維持「Bug Fix 模式」（debugP 產出），提取前綴 `{MMDD}_{N}`
   - Bug Fix 模式：判斷 Proposal N：檔名無數字後綴=1、`_2_`=2、`_4_`=4

2. **收集必要資訊**
   - **後端 commit hash**：從 proposal「## 實作完成紀錄」的 `Commit Hash` 提取
     - 找不到 → 標記「⚠️ 尚未 commit」
   - 🆕 **模式分支**：
     - **【Bug Fix 模式】**
       - **對應 Issue #**：從前端修改區塊的「對應 Issue #N」或「對應 QA 票」提取
       - **Notion 票標題與 URL**：從 proposal 內搜尋 `notion.so` 連結，匹配對應 Issue
         - proposal 找不到 → 從 `{MMDD}_{N}_bug_spec.md` 提取
       - **Bug 簡述**：從 bug spec 標題或 proposal 標題提取
     - **【主動修復模式】**
       - **Notion 票 / Issue #** → 標記 `N/A - 主動修復，非 QA 開票`
       - **簡述** → 從 proposal 標題提取（如「transcript 潛在問題修復提案」）
   - **驗證資料 DB ID + 環境**：從 proposal「API 驗證結果」或「DB 測試資料」或「驗證建議」提取
   - **前端專案名**：從「# 前端修改（{project}）」括號內提取
   - **API 驗證範例**：從 proposal 的 `/check-result` 驗證紀錄提取
     - 從每個前端修改項目的「問題」和「修改方式」提取 API endpoint + 欄位
     - 搜尋 proposal「### API 驗證紀錄」或「## `/check-result` 驗證紀錄」
     - 用 endpoint path 比對 curl URL，只提取前端修改用到的
     - 純後端驗證（FK 400、DELETE 成功）→ 跳過
     - 找不到驗證紀錄 → 不附 API 驗證範例區塊

3. **判斷新建或追加**
   - 🆕 **模式分支**：
     - **【Bug Fix 模式】** → 檢查同目錄是否已有 `{MMDD}_{N}_frontend_fix.md`
     - **【主動修復模式】** → 檢查同目錄是否已有 `{MMDD}_{apiName}_frontend_fix.md`
   - **不存在** → 新建模式
   - **已存在** → 追加模式
   - 追加模式：先用 `wc -l` 記錄當前行數作為 start_line

4. **寫入文件**
   - 🆕 **模式分支（header 差異）**：
   - **【Bug Fix 模式】新建**：寫入完整文件（header + 第一批修改項目）
     ```markdown
     # 前端修改建議 — {bug 簡述}

     > 📋 Bug Spec：`{MMDD}_{N}_bug_spec.md`
     > 🎯 前端專案：{project}

     ---

     ## 來源：Proposal {N}（`{proposal_filename}`）
     > 🏷️ 後端 Commit：`{hash}`
     > 📅 {YYYY-MM-DD}

     ### 驗證資料

     | 環境 | 資料 ID | 用途 |
     |------|---------|------|
     | {env} | #{id} | {用途} |

     ### 對應問題

     | # | Notion 票 | Bug Spec Issue | 問題摘要 |
     |---|----------|---------------|---------|
     | 1 | [{票標題}]({notion_url}) | Issue #{N} | {摘要} |

     ### API 驗證範例

     > 以下從 proposal `/check-result` 驗證紀錄提取，僅包含前端修改用到的 endpoint

     #### {METHOD} /api/v1/{endpoint}

     **Request**：
     ```bash
     curl -s http://localhost:3001/api/v1/{endpoint}/{id} \
       -H "Authorization: Bearer $TOKEN"
     ```

     **Response**（前端用到的欄位）：
     ```json
     {精簡 JSON，只保留前端修改用到的欄位}
     ```

     > 📌 前端修改 #{N} 需讀取 `{欄位路徑}`

     ### 修改項目

     #### 1. {標題}

     **檔案**：`{file_path}`

     **問題**：
     {問題描述 + 現有程式碼}

     **修改方式**：
     {修改建議 + 建議程式碼}
     ```
   - **【Bug Fix 模式】追加**：在文件末尾追加
     ```markdown

     ---

     ## 來源：Proposal {N}（`{proposal_filename}`）
     > 🏷️ 後端 Commit：`{hash}`
     > 📅 {YYYY-MM-DD}

     ### 驗證資料
     ...
     ### 對應問題
     ...
     ### API 驗證範例
     ...
     ### 修改項目
     ...
     ```
   - 🆕 **【主動修復模式】新建**：
     ```markdown
     # 前端修改建議 — {apiName} 潛在問題修復

     > 📋 來源：Data Flow 主動檢查（非 QA 開票）
     > 🎯 前端專案：{project}

     ---

     ## 來源：{apiName} 潛在問題修復（`{proposal_filename}`）
     > 🏷️ 後端 Commit：`{hash}`
     > 📅 {YYYY-MM-DD}

     ### 驗證資料

     | 環境 | 資料 ID | 用途 |
     |------|---------|------|
     | {env} | #{id} | {用途} |

     ### 對應問題

     | # | Data Flow 問題 | 類型 | 問題摘要 |
     |---|---------------|------|---------|
     | 1 | DF-1 | {類型} | {摘要} |

     ### API 驗證範例
     > （同 Bug Fix 模式格式）

     ### 修改項目
     ...
     ```
   - 🆕 **【主動修復模式】追加**：
     ```markdown

     ---

     ## 來源：{apiName} 潛在問題修復 第 N 批（`{proposal_filename}`）
     > 🏷️ 後端 Commit：`{hash}`
     > 📅 {YYYY-MM-DD}

     ### 驗證資料
     ...
     ### 對應問題
     ...
     ### API 驗證範例
     ...
     ### 修改項目
     ...
     ```

5. **sed + pbcopy 複製本次新增區塊**
   - 計算 end_line：`wc -l < {file}`
   - 新建模式：start_line = 1
   - 追加模式：start_line = 追加前行數 + 1
   - ⚠️ **必須使用 Bash 工具**執行：
     ```bash
     sed -n '{start_line},{end_line}p' {file} | pbcopy
     ```
   - 顯示「✅ 本次新增內容已複製到剪貼簿（第 {start_line} ~ {end_line} 行）」

6. **更新 Bug Spec 索引**
   - 🆕 **模式分支**：
     - **【Bug Fix 模式】**：
       - 從 proposal 同目錄找 `{MMDD}_{N}_bug_spec.md`
       - 讀取是否有「## Proposal 索引」區塊
       - **有索引** → 在底部新增或更新：
         ```markdown
         ### 前端修改建議：`{MMDD}_{N}_frontend_fix.md`（{N} 項）
         ```
         - 已有此行 → 更新項目數量
         - 沒有此行 → 新增
       - **沒有索引** → 跳過
     - **【主動修復模式】** → 跳過（沒有 bug spec）

7. **輸出**
   - 顯示文件路徑
   - 顯示本次新增 N 項修改
   - 🆕 **罐頭留言（模式分支）**：
     - **【Bug Fix 模式】**：
       ```
       📋 罐頭留言（可直接複製到 Notion）：
       ────────────────────────────────────
       後端修正已進 dev/staging，commit `{hash}`
       前端修改建議請參考：{frontend_fix_path}

       📍 本次新增：第 {start_line} 行 ~ 第 {end_line} 行
       ────────────────────────────────────
       ```
     - **【主動修復模式】**：
       ```
       📋 罐頭留言（主動修復版，可直接複製到 Notion）：
       ────────────────────────────────────
       後端主動修復已進 dev/staging，commit `{hash}`
       來源：Data Flow 主動檢查（非 QA 開票）
       前端修改建議請參考：{frontend_fix_path}

       📍 本次新增：第 {start_line} 行 ~ 第 {end_line} 行
       ────────────────────────────────────
       ```

### Step 8：更新進度表

@.claude/flowcharts/update-progress.md

執行進度表更新：將 `/fxxxf2e` 對應的步驟標記為 ✅。
