---
description: 將 Compact Instructions 同步到 CLAUDE.md
design-doc: prompts/4_diary/debug/proposal/slash/syncCompact_skill_proposal.md
---

@.claude/flowcharts/syncCompact_flowchart.md

## 建議的 Compact Instructions

⚠️ **重要**：當執行 Conversation Compaction 時，必須保留以下關鍵資訊

### 必須保留的 Session State

1. **工作路徑**
   - Bug Spec 路徑（如果有）
   - Proposal 路徑（如果有）
   - 當前工作目錄

2. **環境設定**
   - 目標環境（dev / staging / local）
   - 測試帳號清單

3. **流程狀態**
   - 已完成的 skill 執行紀錄
   - 當前正在執行的 skill 和步驟
   - Task 追蹤狀態

4. **檔案清單**
   - 預期修改的檔案清單（來自 proposal）
   - 已修改的檔案清單

5. **驗證結果**
   - 各帳號的驗證結果
   - 失敗原因摘要

### 規則提醒（Compact 後必須在開頭提醒）

```
【規則提醒】
- DB 連線：db-tunnel.sh + psql（禁止 MCP db_repl）
- Server Port：3001（禁止其他 port）
- Commit 範圍：僅 backend-nestjs（禁止其他專案）
- 環境切換：禁止手動 cp .env
```

### Session State 摘要模板

```markdown
## 🔄 Session State (Compact Summary)

### 當前工作
- **Bug Spec**: [路徑]
- **Proposal**: [路徑]
- **目標環境**: [dev/staging]
- **測試帳號**: [帳號清單]

### 流程進度
| 階段 | 狀態 | 備註 |
|------|------|------|
| /debugP | ✅/⏳/⏸️ | [備註] |
| /reviewDoc | ✅/⏳/⏸️ | [備註] |
| /implement | ✅/⏳/⏸️ | [備註] |
| /check-result | ✅/⏳/⏸️ | [備註] |
| /gcommit-push | ✅/⏳/⏸️ | [備註] |

### 預期修改檔案
- [檔案清單]

### 驗證結果摘要
- [帳號驗證結果]
```

### Skill 延續規則（Compact 後強制執行）

若流程進度顯示有 ⏳ 進行中的 skill：

1. **檢查 Task 狀態**
   ```
   執行 TaskList 查看當前進度
   ```

2. **重載 Skill 流程圖**
   ```
   讀取 .claude/flowcharts/{skill}_flowchart.md
   ```

3. **定位當前步驟**
   - 找到最後一個 `in_progress` 或第一個 `pending` 的 Task
   - 從該步驟繼續執行

4. **繼續執行前確認**
   ```
   📍 當前位置：Task {N} - {subject}
   📋 下一步驟：{根據流程圖描述}
   ```

---

## 任務

### Step 1: 提取內容

從本定義檔提取「## 建議的 Compact Instructions」區塊內容：

- 起點：`## 建議的 Compact Instructions` 標題之後
- 終點：`---` 分隔線之前

### Step 2: 讀取目標

讀取目標檔案：`/Users/nicholas/Desktop/Projects/.claude/CLAUDE.md`

如果檔案不存在，報錯並終止：
```
❌ CLAUDE.md 不存在：/Users/nicholas/Desktop/Projects/.claude/CLAUDE.md
```

### Step 3: 更新目標

在 CLAUDE.md 中找到或新增 `## Compact Instructions` 區塊：

**如果區塊已存在**：替換整個區塊內容

**如果區塊不存在**：在檔案末尾新增

**內容格式**：
```markdown
## Compact Instructions

<!-- 同步自: backend-nestjs/.claude/commands/syncCompact.md -->
<!-- 修改請先更新定義檔的「## 建議的 Compact Instructions」，再執行 /syncCompact -->

{Step 1 提取的內容}
```

### Step 4: 輸出結果

```
✅ Compact Instructions 同步完成

📄 來源：backend-nestjs/.claude/commands/syncCompact.md
📄 目標：Projects/.claude/CLAUDE.md

📝 變更摘要：
- [描述主要變更內容]

💡 記得執行 git commit 記錄變更
```
