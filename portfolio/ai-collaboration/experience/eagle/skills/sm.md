---
description: 管理 session 獨立的 memory（load/save/read）
argument-hint: <load|save|read>
design-doc: prompts/4_diary/debug/proposal/slash/sm_skill_proposal.md
---

## 參數

- `$1`：操作模式（`load` / `save` / `read`），無參數顯示用法

## 執行流程

```
/sm 執行流程
│
├─ 1. 【取得 Session ID】
│   ├─ Primary：ps -o command= -p $PPID → 從 --resume 提取 UUID
│   ├─ Fallback：ls -t 找最新 .jsonl（僅全新 session）
│   └─ 組合路徑 → memory/session-{id}.md
│
├─ 2. 【參數分派】
│   ├─ load → Step 3
│   ├─ save → Step 4
│   ├─ read → Step 5
│   └─ 無參數 → 顯示用法
│
├─ 3. 【Load】載入 session memory
│   ├─ 檔案存在 → Read 載入 → 顯示內容
│   └─ 檔案不存在 → Write 空模板
│
├─ 4. 【Save】儲存當前進度
│   ├─ 從對話上下文收集 session state
│   ├─ Write 覆蓋寫入 session-{id}.md
│   └─ 輸出儲存摘要
│
└─ 5. 【Read】查看 session memory
    ├─ 檔案存在 → 顯示內容
    └─ 檔案不存在 → 提示尚無 memory
```

## 任務

### Step 1: 取得 Session ID

執行以下指令取得當前 session 的 UUID 前 8 碼（兩層偵測機制）：

**Primary：從父程序 command line 提取 UUID**

```bash
SESSION_ID=$(ps -o command= -p $PPID 2>/dev/null | grep -o '[0-9a-f\-]\{36\}' | head -1 | cut -c1-8)
```

**Fallback：全新 session（無 --resume）時**

```bash
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(basename "$(ls -t /Users/nicholas/.claude/projects/-Users-nicholas-Desktop-Projects/*.jsonl | head -1)" .jsonl | cut -c1-8)
fi
```

組合 session memory 檔案路徑：

```
/Users/nicholas/.claude/projects/-Users-nicholas-Desktop-Projects/memory/session-{uuid-prefix}.md
```

輸出：`🔑 Session ID：{uuid-prefix}`

### Step 2: 參數分派

| `$1` 值 | 動作 |
|----------|------|
| `load` | 進入 Step 3 |
| `save` | 進入 Step 4 |
| `read` | 進入 Step 5 |
| 無參數 / 其他 | 顯示用法說明並結束 |

**無參數時輸出**：

```
📋 /sm 用法：

| 指令 | 說明 | 時機 |
|------|------|------|
| /sm load | 載入 session memory | Session 開始 / Compact 後 |
| /sm save | 儲存當前進度 | Compact 前 |
| /sm read | 查看 session memory | 隨時 |
```

### Step 3: Load 模式

**檔案存在時**：
1. 用 Read 工具讀取 `session-{id}.md`
2. 將內容顯示在對話中（讓 AI 上下文包含這些資訊）
3. 輸出：`📂 Session memory 已載入`

**檔案不存在時**：
1. 用 Write 工具建立空模板：

```markdown
# Session Memory

> 📅 最後更新：{YYYY-MM-DD}
> 🔑 Session ID：{uuid-prefix}

## 當前工作
（尚未記錄）

## 流程進度
| 階段 | 狀態 | 備註 |
|------|------|------|

## 已完成事項
（尚未記錄）

## 待辦 / 注意事項
（尚未記錄）
```

2. 輸出：`📂 新 session memory 已建立，使用 /sm save 儲存當前進度`

### Step 4: Save 模式

**4.1 收集 session state**：

從對話上下文整理以下資訊（有什麼寫什麼，沒有的省略）：

- **當前工作**：Proposal 路徑、Branch、目標環境、測試帳號
- **流程進度**：各 skill 的執行狀態（✅/⏳/⏸️）
- **已完成事項**：本次 session 完成的工作
- **待辦 / 注意事項**：未完成的工作、需要注意的事項

同時檢查 TaskList，如有 task 進度也一併記錄。

**4.2 寫入**：

用 Write 工具覆蓋寫入 `session-{id}.md`，格式：

```markdown
# Session Memory

> 📅 最後更新：{YYYY-MM-DD HH:MM}
> 🔑 Session ID：{uuid-prefix}

## 當前工作
- **Proposal**: {路徑}
- **Branch**: {branch name}
- **目標環境**: {dev/staging/local}

## 流程進度
| 階段 | 狀態 | 備註 |
|------|------|------|
| /{skill} | ✅/⏳/⏸️ | {備註} |

## 已完成事項
- {完成項目}

## 待辦 / 注意事項
- {待辦項目}
```

**4.3 輸出摘要**：

```
💾 Session memory 已儲存

> Session ID：{uuid-prefix}
> 更新時間：{YYYY-MM-DD HH:MM}

已記錄：
- 當前工作：{簡述}
- 流程進度：{N} 個階段
- 待辦事項：{N} 項
```

### Step 5: Read 模式

**檔案存在時**：
1. 用 Read 工具讀取 `session-{id}.md`
2. 顯示完整內容

**檔案不存在時**：
```
❌ 此 session 尚無 memory（Session ID：{uuid-prefix}）
💡 使用 /sm load 建立
```

## 注意事項

1. **不動 MEMORY.md**：此 skill 只操作 `session-*.md`，絕不修改 `MEMORY.md`
2. **Save 是覆蓋寫入**：每次 save 用 Write 覆蓋整個檔案（不是追加）
3. **Load 要顯示內容**：載入後必須把 session state 顯示在對話中，確保 AI 上下文包含這些資訊
4. **不自動清理**：舊 session 檔案保留，用戶需要時手動清理
