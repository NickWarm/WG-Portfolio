# sm（sessionMemory）設計稿

> 📅 建立日期：2026-02-13

---

## 問題描述

**現況痛點**：
- 所有 session 共用同一份 `MEMORY.md`，session-specific 的工作進度（當前工作 A/B、流程進度表）會互相覆蓋
- MEMORY.md 被大量 session 狀態佔據，跨 session 的穩定規則反而被淹沒
- Compact 後需要手動回憶進度，或從 MEMORY.md 中找出屬於自己 session 的資訊

**預期效益**：
- 每個 session 有獨立的 memory 檔案，互不干擾
- MEMORY.md 只保留跨 session 的穩定規則和偏好
- Compact 後用 `/sm load` 快速恢復狀態

---

## 執行流程圖

```
/sm 執行流程
│
├─ 1. 【取得 Session ID】
│   ├─ Primary：從父程序 command line 提取 UUID
│   │   └─ `ps -o command= -p $PPID` → `claude --resume {UUID}`
│   ├─ Fallback：父程序無 --resume 時用 ls -t
│   │   └─ `ls -t *.jsonl | head -1`（僅限全新 session）
│   ├─ 組合檔案路徑：memory/session-{uuid-prefix}.md
│   │   └─ uuid-prefix = UUID 前 8 碼（避免檔名過長）
│   └─ 記錄 session 檔案路徑
│
├─ 2. 【參數分派】
│   ├─ $1 = load → 進入 Step 3（載入模式）
│   ├─ $1 = save → 進入 Step 4（儲存模式）
│   ├─ $1 = read → 進入 Step 5（讀取模式）
│   └─ 無參數 / 無效參數 → 顯示用法說明
│
├─ 3. 【Load 模式】— Session 開始 / Compact 後
│   ├─ 檔案存在 → Read 載入內容到上下文
│   │   └─ 輸出：「📂 Session memory 已載入（{date}）」
│   └─ 檔案不存在 → 建立空模板
│       └─ 輸出：「📂 新 session memory 已建立」
│
├─ 4. 【Save 模式】— Compact 前
│   ├─ 4.1 收集當前 session state
│   │   ├─ 從對話上下文整理：
│   │   │   ├─ 當前工作（Proposal 路徑、Branch、目標環境）
│   │   │   ├─ 流程進度表（各 skill 執行狀態）
│   │   │   ├─ 已完成事項
│   │   │   └─ 待辦 / 注意事項
│   │   └─ 檢查 TaskList 取得 task 進度
│   │
│   ├─ 4.2 寫入 session memory 檔案
│   │   └─ Write → memory/session-{uuid-prefix}.md
│   │
│   └─ 4.3 輸出摘要
│       └─ 「💾 Session memory 已儲存（{N} 個區塊）」
│
├─ 5. 【Read 模式】— 隨時查看
│   ├─ 檔案存在 → 顯示內容
│   └─ 檔案不存在 → 「❌ 此 session 尚無 memory」
│
└─ 6. 【無參數】
    └─ 顯示用法：
        /sm load  — 載入 session memory
        /sm save  — 儲存當前進度
        /sm read  — 查看 session memory
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 否 | 操作模式：`load` / `save` / `read` | `/sm save` |

---

## Session Memory 檔案格式

**檔案位置**：`/Users/nicholas/.claude/projects/-Users-nicholas-Desktop-Projects/memory/session-{uuid-prefix}.md`

**uuid-prefix**：transcript UUID 的前 8 碼（如 `d7fa8253`）

### 模板

```markdown
# Session Memory

> 📅 最後更新：YYYY-MM-DD HH:MM
> 🔑 Session ID：{uuid-prefix}

## 當前工作
- **Proposal**: [路徑]
- **Branch**: [branch name]
- **目標環境**: [dev/staging/local]

## 流程進度
| 階段 | 狀態 | 備註 |
|------|------|------|
| /dpf | ✅/⏳/⏸️ | [備註] |
| /reviewDoc | ✅/⏳/⏸️ | [備註] |
| /implement | ✅/⏳/⏸️ | [備註] |
| /check-result | ✅/⏳/⏸️ | [備註] |

## 已完成事項
- [完成項目清單]

## 待辦 / 注意事項
- [待辦項目清單]
```

---

## 輸出格式

### Load 成功（檔案存在）

```markdown
📂 Session memory 已載入

> Session ID：d7fa8253
> 最後更新：2026-02-13 15:30

## 當前工作
- **Proposal**: prompts/4_diary/propertyOwner_api/...
- **Branch**: adminApi
...
```

### Load 成功（新建）

```markdown
📂 新 session memory 已建立

> Session ID：d7fa8253
> 檔案：memory/session-d7fa8253.md

💡 使用 `/sm save` 儲存當前進度
```

### Save 成功

```markdown
💾 Session memory 已儲存

> Session ID：d7fa8253
> 更新時間：2026-02-13 15:30

已記錄：
- 當前工作：propertyOwner 修復
- 流程進度：4 個階段
- 待辦事項：2 項
```

### Read（無檔案）

```
❌ 此 session 尚無 memory（Session ID：d7fa8253）
💡 使用 `/sm load` 建立
```

### 無參數

```
📋 /sm 用法：

| 指令 | 說明 | 時機 |
|------|------|------|
| /sm load | 載入 session memory | Session 開始 / Compact 後 |
| /sm save | 儲存當前進度 | Compact 前 |
| /sm read | 查看 session memory | 隨時 |
```

---

## 實作細節

### Session ID 取得方式

**Primary：從父程序 command line 提取**

```bash
# Claude Code 的 Bash 工具啟動 shell 時，$PPID 指向 `claude` 程序
# 如果是 resumed session，command line 會包含 --resume {UUID}
ps -o command= -p $PPID 2>/dev/null | grep -o '[0-9a-f\-]\{36\}' | head -1 | cut -c1-8
```

**Fallback：全新 session（無 --resume）時**

```bash
# 全新 session 的 claude 程序沒有 --resume 參數
# 此時用 ls -t 找最近建立的 .jsonl（新 session 通常是最新的）
basename "$(ls -t /Users/nicholas/.claude/projects/-Users-nicholas-Desktop-Projects/*.jsonl | head -1)" .jsonl | cut -c1-8
```

**完整偵測邏輯**：

```bash
# 1. 嘗試從父程序取 session UUID
SESSION_ID=$(ps -o command= -p $PPID 2>/dev/null | grep -o '[0-9a-f\-]\{36\}' | head -1 | cut -c1-8)

# 2. 若無 --resume，fallback 到 ls -t
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(basename "$(ls -t /Users/nicholas/.claude/projects/-Users-nicholas-Desktop-Projects/*.jsonl | head -1)" .jsonl | cut -c1-8)
fi

echo "$SESSION_ID"
```

**為什麼改用 ps 取代 ls -t**：
- `ls -t` 取「最近修改」的 .jsonl，多 session 並存時會拿到別的 session 的檔案
- `ps -o command= -p $PPID` 直接從當前 claude 程序的 command line 取 UUID，不受其他 session 影響
- Compact 後 session 一定是 `--resume` 啟動，Primary 方法一定有效

**為什麼用前 8 碼**：
- 完整 UUID（36 字元）做檔名太長
- 前 8 碼（十六進位）= 4,294,967,296 種組合，碰撞機率極低
- 檔名可讀性好：`session-d7fa8253.md`

### 需要讀取/寫入的檔案

| 檔案 | 操作 | 用途 |
|------|------|------|
| 父程序 command line | Bash `ps -o command=` | Primary：取得 session UUID |
| `~/.claude/projects/{hash}/*.jsonl` | Bash `ls -t` | Fallback：全新 session 時取得 ID |
| `memory/session-{id}.md` | Read / Write | session memory 本體 |

### 注意事項

1. **不動 MEMORY.md**：此 skill 只操作 `session-*.md`，不修改 `MEMORY.md`
2. **不自動清理**：舊 session 檔案保留，用戶需要時手動清理
3. **Save 是覆蓋寫入**：每次 save 用 Write 覆蓋整個檔案（不是追加）
4. **Load 後要唸出內容**：載入後把 session state 顯示在對話中，讓 AI 上下文有這些資訊
5. **transcript 路徑依賴**：如果 Claude Code 改變 transcript 存放路徑，需要同步更新

---

## 與 Compact Instructions 的關係

目前 CLAUDE.md 的 Compact Instructions 定義了 session state 摘要模板。兩者的分工：

| 機制 | 用途 | 觸發時機 |
|------|------|----------|
| Compact Instructions | 告訴 AI compact 時要保留哪些資訊 | 自動（compact 時） |
| `/sm save` | 持久化儲存 session state 到檔案 | 手動（用戶呼叫） |

**互補關係**：
- Compact Instructions 確保 compact 後的 summary 包含關鍵資訊
- `/sm save` 額外備份到檔案，即使跨多次 compact 也不會遺失

---

## Skill 定義檔

**檔案位置**: `backend-nestjs/.claude/commands/sm.md`

```markdown
---
description: 管理 session 獨立的 memory（load/save/read）
argument-hint: <load|save|read>
design-doc: prompts/4_diary/debug/proposal/slash/sm_skill_proposal.md
---

## 參數

- `$1`：操作模式（load / save / read），無參數顯示用法

## 任務

### Step 0: 取得 Session ID

（取 transcript UUID 前 8 碼，組合檔案路徑）

### Step 1: 參數分派

（依 $1 進入對應模式）

### Step 2: Load / Save / Read

（各模式的執行邏輯）
```

---

## 設計變更

### 2026-02-13 設計變更：Session ID 偵測機制修正

**問題描述**：

原本的 Session ID 偵測使用 `ls -t *.jsonl | head -1`，取「最近修改時間最新的 transcript 檔案」。
多個 session 同時存在時，`ls -t` 會拿到最近有活動的其他 session 的 transcript，導致：
1. `/sm save` 存到別的 session 的 memory 檔案
2. `/sm load` 載入不屬於自己的 session memory
3. 不同 session 的進度互相覆蓋

**設計決策**：

改用兩層偵測機制：

| 優先級 | 方法 | 指令 | 適用場景 |
|--------|------|------|----------|
| Primary | 從父程序 command line 提取 UUID | `ps -o command= -p $PPID \| grep UUID` | Compact 後（`claude --resume {UUID}`） |
| Fallback | 找最近修改的 .jsonl | `ls -t *.jsonl \| head -1` | 全新 session（無 `--resume`） |

**原理**：Claude Code 的 Bash 工具啟動 shell 時，`$PPID` 指向 `claude` 程序。
若是 resumed session，其 command line 為 `claude --resume {UUID}`，可直接提取 UUID。

**修改內容**：
- 流程圖 Step 1：更新偵測方式描述（Primary + Fallback）
- 實作細節 > Session ID 取得方式：替換為新的偵測邏輯
- 定義檔 Step 1：待 `/updateDesign` 同步更新
