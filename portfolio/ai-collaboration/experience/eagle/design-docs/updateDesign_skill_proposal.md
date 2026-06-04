# updateDesign Skill 設計稿

> 📅 建立日期：2026-02-01

---

## 問題描述

### 現況痛點

當修改 skill 時（例如新增步驟、調整流程），需要同步更新多份文件：

| 文件 | 位置 | 用途 |
|------|------|------|
| 定義檔 | `commands/{skill}.md` | AI 執行時載入 |
| 流程圖 | `flowcharts/{skill}_flowchart.md` | 視覺化執行流程 |
| 設計稿 | `*_skill_proposal.md` | 設計決策記錄 |
| TaskCreate 列表 | 定義檔 Step 0 | Task 追蹤粒度 |

**問題案例**（2026-02-01）：
- `/check-result` 定義檔新增了 6.1, 6.2, 6.3, 6.4 子步驟
- 但 TaskCreate 列表沒有同步更新（仍是粗粒度的 "Step 5-7"）
- 導致 AI 執行時跳過子步驟

### 預期效益

1. **統一更新入口**：透過 `/updateDesign` 確保所有文件同步
2. **防止遺漏**：強制檢查所有相關文件
3. **版本追蹤**：在設計稿記錄每次變更

---

## 參數模式設計（模式 C：兩者都支援）

### 使用方式

| 指令 | 行為 |
|------|------|
| `/updateDesign check-result` | 明確指定 → 更新 check-result |
| `/updateDesign` | 從上下文找「最近討論的 skill」 |

### 上下文判斷邏輯

當無參數時，按優先順序判斷目標 skill：

1. **【新增】prompts 專案中有未 commit 的設計稿**
   - 執行 `git status` 檢查 `prompts/4_diary/debug/proposal/slash/`
   - 找到 `*_skill_proposal.md` 有變更 → 使用該 skill
   - **設計理由**：未 commit 的設計稿代表有待同步的設計變更

2. **最近讀取的設計相關檔案**
   - `*_skill_proposal.md` → 提取 skill 名稱
   - `*_flowchart.md` → 提取 skill 名稱

3. **最近執行的相關指令**
   - `/readDesign {skill}` → 使用該 skill

4. **對話中明確提到的 skill**
   - 「我們剛剛討論 check-result...」→ check-result

5. **都找不到**
   - 提示用戶指定 skill 名稱

### 設計稿 Commit 機制

**核心概念**：
- 設計稿有 uncommitted changes → 代表該 skill 有待同步的設計變更
- `/updateDesign` 完成後 commit → 標記該 skill 已同步
- 下次執行時，用 `git status` 找未 commit 的設計稿 → 自動判斷要更新哪個 skill

**好處**：
- 避免設計稿內容太多時找不到要更新哪個 skill
- 每次更新都有 commit 記錄，可追溯變更歷史

---

## 執行流程圖

```
/updateDesign 執行流程（v2 - 含設計稿 Commit）
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
│   └─ 2.4 讀取設計稿：{design-doc 路徑}
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
├─ 6. 【用戶確認】
│   ├─ 顯示變更摘要
│   ├─ 列出將修改的檔案
│   └─ 等待用戶 approve
│
├─ 7. 【執行更新】（用戶確認後）
│   ├─ 7.1 更新設計稿
│   ├─ 7.2 更新流程圖
│   ├─ 7.3 更新定義檔
│   └─ 7.4 輸出完成報告
│
└─ 8. 【Commit 設計稿】（新增）
    ├─ cd /Users/nicholas/Desktop/Projects/prompts
    ├─ git add 4_diary/debug/proposal/slash/{skill}_skill_proposal.md
    ├─ git commit -m "updateDesign: {skill} 文件同步完成"
    └─ 輸出：「✅ 設計稿已 commit」
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 否 | 目標 skill 名稱（無則從上下文判斷） | `check-result`、`debug` |

### 使用範例

```bash
# 明確指定要更新的 skill
/updateDesign check-result

# 從上下文判斷（剛討論完某 skill 的設計變更）
/updateDesign

# 檢查 debug 的文件同步狀態
/updateDesign debug
```

---

## 輸出格式

### 同步檢查結果

```markdown
# 📋 {skill} 文件同步檢查

## 目標 Skill
- **名稱**: {skill}
- **來源**: 參數指定 / 上下文判斷（從 {來源} 識別）

## 文件位置
| 文件 | 路徑 | 狀態 |
|------|------|------|
| 定義檔 | commands/{skill}.md | ✅ 存在 |
| 流程圖 | flowcharts/{skill}_flowchart.md | ✅ 存在 |
| 設計稿 | prompts/.../{skill}_skill_proposal.md | ✅ 存在 |

## 步驟結構比對

| 步驟 | 定義檔 | 流程圖 | TaskCreate |
|------|--------|--------|------------|
| Step 1 | ✅ | ✅ | ✅ |
| Step 2 | ✅ | ✅ | ✅ |
| Step 6.1 | ✅ | ✅ | ❌ 缺少 |
| Step 6.2 | ✅ | ✅ | ❌ 缺少 |

## 同步狀態
❌ 發現 2 處不一致

## 建議修正
1. 在 TaskCreate 列表新增 Step 6.1
2. 在 TaskCreate 列表新增 Step 6.2
```

### 更新提案

```markdown
# 📝 {skill} 更新提案

## 變更摘要
- 新增 Step 6.1「推導 API 序列」
- 新增 Step 6.2「存在性確認」

## 將修改的檔案

### 1. 設計稿
**檔案**: `prompts/.../{skill}_skill_proposal.md`
**新增區塊**:
- 「2026-02-01 設計變更：XXX」

### 2. 流程圖
**檔案**: `flowcharts/{skill}_flowchart.md`
**修改內容**:
- Step 6 展開為 6.1, 6.2, 6.3, 6.4

### 3. 定義檔
**檔案**: `commands/{skill}.md`
**修改內容**:
- Step 0 TaskCreate 列表新增 4 個 task

---

⏸️ 請確認是否執行更新？
```

---

## 實作細節

### 步驟解析邏輯

**從定義檔解析**：
- 匹配 `### Step N:` 或 `#### N.N` 格式
- 提取步驟編號和名稱

**從流程圖解析**：
- 匹配 `├─ N. 【xxx】` 或 `│   ├─ N.N xxx` 格式
- 提取步驟編號和名稱

**從 TaskCreate 解析**：
- 匹配 Task 表格中的 Subject 欄位
- 提取 "Step N" 或 "Step N.N" 編號

### 一致性檢查規則

| 規則 | 說明 |
|------|------|
| 主步驟數量一致 | 定義檔、流程圖的 Step N 數量相同 |
| 子步驟覆蓋完整 | 流程圖有 6.1, 6.2 → TaskCreate 也要有 |
| 命名一致 | 三份文件的步驟名稱相同或相近 |

---

## 與現有 Skill 的關係

| Skill | 用途 | 與 updateDesign 的關係 |
|-------|------|------------------------|
| `/readDesign` | 讀取設計規則或設計稿 | 互補：read 讀、update 寫 |
| `/implement` | 依提案實作程式碼 | 無關：不同層面 |
| 其他 skill | - | updateDesign 可更新它們的文件 |

---

## 待辦事項

- [x] 用戶確認設計稿（2026-02-01）
- [x] 建立 `updateDesign_flowchart.md`（2026-02-01）
- [x] 建立 `updateDesign.md` 定義檔（2026-02-01）
- [x] 測試：檢查 check-result 的同步狀態（2026-02-01）
- [x] 測試：為 check-result 補齊 TaskCreate（2026-02-01）
- [x] v2 更新：加入設計稿 Commit 機制（2026-02-01）
- [x] v2 更新：上下文判斷優先檢查未 commit 的設計稿（2026-02-01）

### 2026-02-13 設計變更：大檔案讀取 + 大區塊寫入規則

**問題**：
1. 讀取：設計稿可能超過 2000 行，Read 工具預設只讀 2000 行，導致截斷
2. 寫入：當需要替換的區塊超過 200 行時，Edit 工具可能觸發 400 error

**修正**：
- Step 2（載入文件）：新增大檔案讀取規則（wc -l → 分段 Read）
- Step 6（執行更新）：新增大區塊寫入規則（> 200 行改用 replace-section.sh）

**影響檔案**：
1. `updateDesign.md` - 定義檔 Step 2 + Step 6 新增規則
2. `updateDesign_flowchart.md` - 流程圖 Step 2 + Step 6 新增分支
