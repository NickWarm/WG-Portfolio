# /updateDesign 執行流程

```
/updateDesign 執行流程（v3 - 移除用戶確認步驟）
│
├─ 1. 【參數解析】
│   ├─ 有 $1 → 使用指定的 skill 名稱
│   └─ 無 $1 → 從上下文判斷（按優先順序）
│       ├─ 【優先】檢查 prompts 專案未 commit 的設計稿
│       │   └─ git status prompts/4_diary/debug/proposal/slash/
│       ├─ 找最近讀取的 *_skill_proposal.md / *_flowchart.md
│       ├─ 找最近執行的 /readDesign {skill}
│       ├─ 找對話中提到的 skill 名稱
│       └─ 都找不到 → 提示用戶指定
│
├─ 2. 【載入現有文件】
│   ├─ 2.1 讀取定義檔：commands/{skill}.md
│   ├─ 2.2 讀取流程圖：flowcharts/{skill}_flowchart.md（如存在）
│   ├─ 2.3 從 frontmatter 取得 design-doc 路徑
│   ├─ 2.4 讀取設計稿：{design-doc 路徑}
│   └─ 大檔案讀取規則（> 2000 行時）
│       ├─ wc -l 確認行數
│       ├─ ≤ 2000 行 → 直接 Read
│       └─ > 2000 行 → 分段 Read（offset + limit=2000）
│
├─ 3. 【分析現有結構】
│   ├─ 3.1 解析定義檔的步驟結構（Step 1, 2, 3...）
│   ├─ 3.2 解析流程圖的步驟結構
│   ├─ 3.3 解析 TaskCreate 列表（Step 0）
│   └─ 3.4 比對三者是否一致
│       ├─ 一致 → 顯示「✅ 文件同步狀態良好」
│       └─ 不一致 → 顯示差異報告
│
├─ 4. 【收集變更需求】
│   ├─ 從對話上下文理解變更內容
│   └─ 產出變更規格：
│       ├─ 新增/修改/刪除哪些步驟
│       ├─ 是否需要新增子步驟
│       └─ 是否影響 Task 粒度
│
├─ 5. 【生成更新提案】
│   │
│   ├─ 5.1 【設計稿更新】
│   │   ├─ 新增「設計變更」區塊
│   │   ├─ 記錄變更日期、問題描述、設計決策
│   │   └─ 更新流程圖（如有變更）
│   │
│   ├─ 5.2 【流程圖更新】
│   │   ├─ 更新步驟結構
│   │   └─ 更新 Task 表格
│   │
│   ├─ 5.3 【定義檔更新】
│   │   ├─ 更新任務步驟
│   │   └─ 更新 TaskCreate 列表（Step 0）
│   │
│   └─ 5.4 【一致性檢查】
│       ├─ 確認三份文件的步驟數量一致
│       ├─ 確認 TaskCreate 包含所有需追蹤的步驟
│       └─ 產出同步報告
│
├─ 6. 【執行更新】（生成提案後直接執行，不需用戶確認）
│   ├─ 6.1 更新設計稿
│   ├─ 6.2 更新流程圖
│   ├─ 6.3 更新定義檔
│   ├─ 6.4 輸出完成報告
│   └─ 大區塊寫入規則（替換區塊 > 200 行時）
│       ├─ Write → /tmp/section-updateDesign-{skill}-{target}.md
│       ├─ Bash: replace-section.sh 替換區塊
│       ├─ Read 驗證替換結果
│       └─ rm 清理暫存檔
│
└─ 7. 【Commit 設計稿】
    ├─ cd /Users/nicholas/Desktop/Projects/prompts
    ├─ git add 4_diary/debug/proposal/slash/{skill}_skill_proposal.md
    ├─ git commit -m "updateDesign: {skill} 文件同步完成"
    └─ 輸出：「✅ 設計稿已 commit」
```

## 上下文判斷優先順序

```
上下文判斷 Skill 名稱（無參數時）
│
├─ 優先級 0：prompts 專案中有未 commit 的設計稿
│   ├─ git status prompts/4_diary/debug/proposal/slash/
│   ├─ 找到 *_skill_proposal.md 有變更 → 使用該 skill
│   └─ 【設計理由】未 commit 的設計稿代表有待同步的設計變更
│
├─ 優先級 1：最近讀取的設計相關檔案
│   ├─ *_skill_proposal.md → 提取 skill 名稱
│   └─ *_flowchart.md → 提取 skill 名稱
│
├─ 優先級 2：最近執行的相關指令
│   └─ /readDesign {skill} → 使用該 skill
│
├─ 優先級 3：對話中明確提到的 skill
│   └─ 「討論 check-result...」→ check-result
│
└─ 都找不到 → 提示用戶指定
```

## 文件位置對照表

| 文件類型 | 路徑格式 | 範例 |
|----------|----------|------|
| 定義檔 | `backend-nestjs/.claude/commands/{skill}.md` | `commands/check-result.md` |
| 流程圖 | `backend-nestjs/.claude/flowcharts/{skill}_flowchart.md` | `flowcharts/check-result_flowchart.md` |
| 設計稿 | `prompts/4_diary/debug/proposal/slash/{skill}_skill_proposal.md` | `check-result_skill_proposal.md` |

## 一致性檢查規則

| 規則 | 說明 | 檢查方式 |
|------|------|----------|
| 主步驟數量一致 | 定義檔、流程圖的 Step N 數量相同 | 比對步驟編號 |
| 子步驟覆蓋完整 | 流程圖有 6.1, 6.2 → TaskCreate 也要有 | 檢查 TaskCreate 表格 |
| 命名一致 | 三份文件的步驟名稱相同或相近 | 字串比對 |

## 設計稿 Commit 機制

**核心概念**：
- 設計稿有 uncommitted changes → 代表該 skill 有待同步的設計變更
- `/updateDesign` 完成後 commit → 標記該 skill 已同步
- 下次執行時，用 `git status` 找未 commit 的設計稿 → 自動判斷要更新哪個 skill

**好處**：
- 避免設計稿內容太多時找不到要更新哪個 skill
- 每次更新都有 commit 記錄，可追溯變更歷史
