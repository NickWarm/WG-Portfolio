# syncCompact 流程圖

將 Compact Instructions 從定義檔同步到 CLAUDE.md

## 檔案路徑

| 類型 | 路徑 |
|------|------|
| 來源（定義檔） | `backend-nestjs/.claude/commands/syncCompact.md` 的「## 建議的 Compact Instructions」區塊 |
| 目標（實作檔案） | `Projects/.claude/CLAUDE.md`（即 `/Users/nicholas/Desktop/Projects/.claude/CLAUDE.md`） |

## 執行流程

```
/syncCompact
│
├─ 1. 【提取內容】
│   ├─ 從定義檔提取「## 建議的 Compact Instructions」區塊
│   ├─ 起點：標題之後
│   └─ 終點：`---` 分隔線之前
│
├─ 2. 【讀取目標】
│   ├─ 讀取 .claude/CLAUDE.md
│   ├─ 存在 → 繼續
│   └─ 不存在 → ❌ 報錯終止
│
├─ 3. 【更新目標】
│   ├─ 搜尋「## Compact Instructions」
│   │   ├─ 存在 → 替換內容
│   │   └─ 不存在 → 末尾新增
│   │
│   └─ 加入同步註解
│       ├─ <!-- 同步自: backend-nestjs/.claude/commands/syncCompact.md -->
│       └─ <!-- 修改請先更新定義檔，再執行 /syncCompact -->
│
└─ 4. 【輸出結果】
    ├─ 顯示變更摘要
    ├─ ✅ 同步完成
    └─ 💡 提示 commit
```

## 內容格式

同步後的 `## Compact Instructions` 區塊格式：

```markdown
## Compact Instructions

<!-- 同步自: backend-nestjs/.claude/commands/syncCompact.md -->
<!-- 修改請先更新定義檔的「## 建議的 Compact Instructions」，再執行 /syncCompact -->

{從定義檔提取的內容}
```
