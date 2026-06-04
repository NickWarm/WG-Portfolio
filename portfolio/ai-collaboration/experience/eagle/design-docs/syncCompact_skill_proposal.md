# syncCompact Skill 設計稿

> 建立日期：2026-02-01
> 狀態：實作完成

---

## 問題描述

### 背景

在實際開發流程中，使用者會依序執行多個 skill：

```
開發流程
│
├─ 1. /debugP → 產生 bug spec + proposal
├─ 2. /reviewDoc → 檢核提案文件
├─ 3. /rrDoc → 根據檢核結果更新文件
├─ 4. /implement → 實作程式碼
├─ 5. /check-result → 驗證實作結果
└─ 6. /gcommit-push → commit 並推送
```

**問題根源**：

當對話過長時，Claude Code 會執行 **Conversation Compaction**（對話壓縮），導致：

| 問題 | 影響 |
|------|------|
| Skill 模組內容被移除 | AI 忘記 DB 連線規則、輸出格式要求 |
| 上下文資訊被摘要 | 遺失 proposal 路徑、測試帳號、驗證結果 |
| 流程狀態被壓縮 | 不記得已完成哪些步驟、哪些還沒做 |

### 已知問題案例

| Skill | 問題 | 記錄日期 |
|-------|------|----------|
| `/debugP` | AI 用 MCP 查 dev/staging DB（應該用 db-tunnel.sh） | 2026-01-19 |
| `/debugP` | 500 Debug 流程沒有優先執行 PM2 查詢 | 2026-01-25 |
| `/check-result` | 遺漏 Step 8（更新提案文件） | 2026-01-27 |
| `/check-result` | 使用 cp .env.dev 手動切換環境 | 2026-01-28 |
| `/gcommit-push` | commit 了非 backend-nestjs 專案的檔案 | 2026-01-19 |

### 解決方案

建立 `/syncCompact` skill，實現「單一真相來源」模式：

- **定義檔**（真相來源）：`backend-nestjs/.claude/commands/syncCompact.md` 的「## 建議的 Compact Instructions」區塊
- **實作檔案**（同步目標）：`Projects/.claude/CLAUDE.md` 的 `## Compact Instructions` 區塊

修改流程：
1. 先修改定義檔的「## 建議的 Compact Instructions」區塊
2. 執行 `/syncCompact` 同步到 CLAUDE.md
3. Git commit 記錄變更

---

## 分析

### 各階段關鍵資訊

#### 必須在 Compact 後保留的資訊

| 類別 | 資訊 | 來源 | 用途 |
|------|------|------|------|
| **路徑** | bug spec 路徑 | `/debugP` | 定位問題描述 |
| **路徑** | proposal 路徑 | `/debugP` 產出 | 後續所有流程需要 |
| **環境** | 目標環境（dev/staging） | 用戶指定 | DB 連線、API 驗證 |
| **帳號** | 測試帳號清單 | bug spec 留言 | 多帳號驗證 |
| **狀態** | 已完成步驟 | Task 追蹤 | 避免重複執行 |
| **狀態** | 驗證結果（通過/失敗） | `/check-result` | 決定是否可 commit |
| **檔案** | 預期修改檔案清單 | proposal | `/gcommit-push` 比對 |

#### 可以被摘要的過程性資訊

| 類別 | 資訊 | 可摘要方式 |
|------|------|------------|
| DB 查詢結果 | 具體資料內容 | 保留「查詢了 X 表，找到 Y 筆測試資料」 |
| API 驗證細節 | curl 完整輸出 | 保留「API 驗證：通過/失敗，原因：...」 |
| 程式碼分析 | 完整程式碼區塊 | 保留「分析了 X.service.ts 的 Y 方法」 |
| 歷史文件搜尋 | 搜尋過程細節 | 保留「找到 N 份相關歷史文件」 |

### 開發流程中的 Compact 時機

```
完整開發流程與 Compact 時機
│
├─ /debugP（長時間執行，高機率觸發 Compact）
│   ├─ 分析前端 → 分析後端 → 查 DB → 驗證 API
│   ├─ 🔄 可能在此觸發 Compact
│   └─ 產出 proposal
│
├─ /reviewDoc + /rrDoc（相對快速）
│   └─ 通常不會觸發 Compact
│
├─ /implement（中等時間）
│   ├─ 逐步修改多個檔案
│   └─ 🔄 可能在此觸發 Compact
│
├─ /check-result（中等時間）
│   ├─ 切 DB → 啟 server → 驗證
│   └─ 🔄 可能在此觸發 Compact
│
└─ /gcommit-push（相對快速）
    └─ 通常不會觸發 Compact
```

---

## 執行流程圖

```
/syncCompact 執行流程
│
├─ 1. 【提取內容】
│   ├─ 從定義檔提取「## 建議的 Compact Instructions」區塊
│   ├─ 起點：標題之後
│   └─ 終點：`---` 分隔線之前
│
├─ 2. 【讀取目標】
│   ├─ 目標路徑：Projects/.claude/CLAUDE.md
│   ├─ 檔案存在 → 繼續
│   └─ 檔案不存在 → 報錯並終止
│
├─ 3. 【更新目標】
│   ├─ 搜尋「## Compact Instructions」區塊
│   │   ├─ 存在 → 替換該區塊內容
│   │   └─ 不存在 → 在檔案末尾新增區塊
│   │
│   └─ 內容格式：
│       ├─ <!-- 同步自: backend-nestjs/.claude/commands/syncCompact.md -->
│       ├─ <!-- 修改請先更新定義檔，再執行 /syncCompact -->
│       └─ {提取的內容}
│
└─ 4. 【輸出結果】
    ├─ 顯示變更摘要
    ├─ ✅ 同步完成
    └─ 💡 提示：記得 commit 變更
```

---

## 輸出格式

### 成功時

```
✅ Compact Instructions 同步完成

📄 來源：backend-nestjs/.claude/commands/syncCompact.md
📄 目標：Projects/.claude/CLAUDE.md

📝 變更摘要：
- [描述主要變更內容]

💡 記得執行 git commit 記錄變更
```

### 失敗時

```
❌ 同步失敗：{錯誤原因}

可能原因：
- CLAUDE.md 不存在
```

---

## 相關檔案

| 檔案類型 | 路徑 |
|----------|------|
| 設計稿 | `prompts/4_diary/debug/proposal/slash/syncCompact_skill_proposal.md` |
| 定義檔 | `backend-nestjs/.claude/commands/syncCompact.md` |
| 流程圖 | `backend-nestjs/.claude/flowcharts/syncCompact_flowchart.md` |
| 目標文件 | `Projects/.claude/CLAUDE.md` |

---

## 設計決策記錄

### 2026-02-02：新增 Skill 延續規則

**問題發現**：

Conversation Compaction 後繼續執行 skill 時，發生以下問題：

| 問題 | 影響 |
|------|------|
| Skill 流程圖未重載 | AI 不知道正確的執行步驟 |
| 沒有檢查 TaskList | AI 不知道進行到哪個步驟 |
| 使用錯誤的工具/方法 | 例如：應該用 `get-token.sh` 卻直接用 `curl` |

**問題根因**：
- Compact Instructions 有記錄「當前正在執行的 skill」
- 但沒有規定 compact 後要「重載 skill 流程圖」和「檢查 Task 狀態」
- Hook 只在 skill invoke 時觸發，continuation 不會觸發

**解決方案**：

在 Compact Instructions 新增「Skill 延續規則」區塊：

```markdown
### Skill 延續規則（Compact 後強制執行）

若流程進度顯示有 ⏳ 進行中的 skill：

1. **檢查 Task 狀態**：執行 `TaskList` 查看當前進度
2. **重載 Skill 流程圖**：讀取 `.claude/flowcharts/{skill}_flowchart.md`
3. **定位當前步驟**：找到最後一個 `in_progress` 或第一個 `pending` 的 Task
4. **確認後繼續**：輸出當前位置和下一步驟，再繼續執行
```

**設計原則**：
- 利用現有的 Task 系統追蹤進度
- Compact 後強制重載 skill 定義，確保按流程執行
- 兩者結合：Task 知道「在哪」，流程圖知道「怎麼做」

---

### 2026-02-01：架構調整

**原設計**：
- 來源：獨立的設計文件 `compact-instructions-design.md`
- 定義檔只負責同步機制

**新設計**：
- 來源：定義檔本身的「## 建議的 Compact Instructions」區塊
- 設計稿只保留討論記錄

**原因**：
- 設計稿是討論階段，定義檔是執行階段與正式準則
- 單一真相來源更徹底，不需要維護兩份內容
