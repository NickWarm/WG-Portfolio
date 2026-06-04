---
description: 同步更新 skill 的定義檔、流程圖、設計稿和 TaskCreate
argument-hint: [skill-name]
design-doc: prompts/4_diary/debug/proposal/slash/updateDesign_skill_proposal.md
---

@.claude/flowcharts/updateDesign_flowchart.md

## 參數

- `$1`：skill 名稱（可選，無則從上下文判斷）

## 任務

### Step 1: 判斷目標 Skill

**有參數時**：直接使用 `$1` 作為目標 skill

**無參數時**：按優先順序從上下文判斷：

1. **【優先】檢查 prompts 專案未 commit 的設計稿**
   ```bash
   cd /Users/nicholas/Desktop/Projects/prompts
   git status --porcelain 4_diary/debug/proposal/slash/*_skill_proposal.md
   ```
   - 找到有變更的 `*_skill_proposal.md` → 提取 skill 名稱
   - **設計理由**：未 commit 的設計稿代表有待同步的設計變更

2. 找最近讀取的 `*_skill_proposal.md` 或 `*_flowchart.md` → 提取 skill 名稱
3. 找最近執行的 `/readDesign {skill}` → 使用該 skill
4. 找對話中明確提到的 skill 名稱
5. 都找不到 → 提示用戶指定

輸出：`📌 目標 Skill：{skill}（來源：{參數指定/上下文判斷}）`

### Step 2: 載入現有文件

讀取目標 skill 的三份文件：

```
文件載入清單
├─ 定義檔：backend-nestjs/.claude/commands/{skill}.md
├─ 流程圖：backend-nestjs/.claude/flowcharts/{skill}_flowchart.md（可能不存在）
└─ 設計稿：從定義檔 frontmatter 的 design-doc 欄位取得路徑
```

**大檔案讀取規則**：
1. 先用 Bash `wc -l` 確認每份文件行數
2. **≤ 2000 行**：直接用 Read 工具讀取
3. **> 2000 行**：分段讀取
   - 第一段：`Read(offset=1, limit=2000)` 讀取前 2000 行
   - 後續段：`Read(offset=2001, limit=2000)` 依序讀取
   - 如果只需要找特定區塊，可用 `Grep` 定位行號後精準讀取

> ⚠️ 目前超過 2000 行的設計稿：review（4938 行）、debugP（3759 行）、check-result（2385 行）

**檢查結果輸出**：

| 文件 | 路徑 | 狀態 |
|------|------|------|
| 定義檔 | commands/{skill}.md | ✅/❌ |
| 流程圖 | flowcharts/{skill}_flowchart.md | ✅/❌/⚠️ 不存在 |
| 設計稿 | {design-doc 路徑} | ✅/❌ |

### Step 3: 分析現有結構

**3.1 解析定義檔步驟**：
- 找 `### Step N:` 或 `#### N.N` 格式
- 記錄所有步驟編號和名稱

**3.2 解析流程圖步驟**（如存在）：
- 找 `├─ N. 【xxx】` 或 `│   ├─ N.N xxx` 格式
- 記錄所有步驟編號和名稱

**3.3 解析 TaskCreate 列表**：
- 在定義檔中找 Step 0 的 TaskCreate 表格
- 提取每個 task 的 Subject 中的步驟編號

**3.4 比對一致性**：

輸出步驟結構比對表：

| 步驟 | 定義檔 | 流程圖 | TaskCreate |
|------|--------|--------|------------|
| Step 1 | ✅ | ✅ | ✅ |
| Step 6.1 | ✅ | ✅ | ❌ 缺少 |

### Step 4: 收集變更需求

從對話上下文理解：
- 用戶想新增/修改/刪除哪些步驟
- 是否有子步驟需要展開
- 是否需要調整 Task 粒度

**若無明確變更需求**（純檢查模式）：
- 輸出同步狀態報告
- 列出建議修正項目
- 結束執行

**若有變更需求**：
- 繼續 Step 5

### Step 5: 生成更新提案

**5.1 設計稿更新提案**：
- 在設計稿末尾新增「設計變更」區塊
- 格式：`### YYYY-MM-DD 設計變更：{變更標題}`
- 包含：問題描述、設計決策、修改內容

**5.2 流程圖更新提案**（如需要）：
- 更新步驟結構
- 新增/修改/刪除步驟節點

**5.3 定義檔更新提案**：
- 更新任務步驟說明
- **更新 Step 0 的 TaskCreate 列表**（重點！）

**5.4 一致性檢查**：
- 確認更新後三份文件步驟一致
- 確認 TaskCreate 覆蓋所有需追蹤的步驟

### Step 6: 執行更新

生成提案後直接執行更新（不需用戶確認，因為 `/updateDesign` 本質是同步已討論好的設計）：

1. **更新設計稿**：新增設計變更區塊
2. **更新流程圖**：修改步驟結構
3. **更新定義檔**：修改任務步驟和 TaskCreate 列表

**大區塊寫入規則**：

當需要用 Edit 工具替換的區塊超過 200 行時，改用 `replace-section.sh` 避免 400 error：

```
a. Write → /tmp/section-updateDesign-{skill}-{target}.md（含 ## 標題 + 內容，不含尾部 ---）
b. Bash: /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh {檔案路徑} "## {區塊標題}" /tmp/section-updateDesign-{skill}-{target}.md
c. Read 驗證替換結果（讀取區塊起始 5 行）
d. Bash: rm /tmp/section-updateDesign-{skill}-{target}.md
```

- `{target}` = proposal / flowchart / definition（對應三份文件）
- 設計稿末尾追加小區塊（設計變更記錄）→ 繼續用 Edit
- 定義檔/流程圖的小修改（< 200 行）→ 繼續用 Edit

**完成報告**：

```markdown
✅ {skill} 文件更新完成

## 已更新檔案
| 檔案 | 狀態 |
|------|------|
| 設計稿 | ✅ 已更新 |
| 流程圖 | ✅ 已更新 |
| 定義檔 | ✅ 已更新 |

## 同步狀態
✅ 三份文件步驟結構一致
✅ TaskCreate 覆蓋所有步驟
```

### Step 7: Commit 設計稿

> **設計理由**：commit 後的設計稿代表已同步，下次執行 `/updateDesign` 時可用 `git status` 找出有待同步的 skill

```bash
cd /Users/nicholas/Desktop/Projects/prompts
git add 4_diary/debug/proposal/slash/{skill}_skill_proposal.md
git commit -m "updateDesign: {skill} 文件同步完成"
```

**輸出**：`✅ 設計稿已 commit`

**完整完成報告**（含 commit）：

```markdown
✅ {skill} 文件更新完成

## 已更新檔案
| 檔案 | 狀態 |
|------|------|
| 設計稿 | ✅ 已更新 |
| 流程圖 | ✅ 已更新 |
| 定義檔 | ✅ 已更新 |

## 同步狀態
✅ 三份文件步驟結構一致
✅ TaskCreate 覆蓋所有步驟

## 版本控制
✅ 設計稿已 commit（prompts 專案）
```

## 輸出格式規範

### 純檢查模式（無變更需求）

```markdown
# 📋 {skill} 文件同步檢查

## 目標 Skill
- **名稱**: {skill}
- **來源**: 參數指定 / 上下文判斷

## 文件狀態
| 文件 | 路徑 | 狀態 |
|------|------|------|
| 定義檔 | ... | ✅ |
| 流程圖 | ... | ✅ |
| 設計稿 | ... | ✅ |

## 步驟結構比對
| 步驟 | 定義檔 | 流程圖 | TaskCreate |
|------|--------|--------|------------|
| ... | ... | ... | ... |

## 同步狀態
✅ 文件同步狀態良好 / ❌ 發現 N 處不一致

## 建議修正（如有不一致）
1. ...
2. ...
```

### 更新模式（有變更需求）

生成提案後直接執行更新，最後輸出完成報告。
