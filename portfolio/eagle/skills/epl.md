---
description: 摘要問題並用流程圖說明解法（explain proposal）
design-doc: prompts/4_diary/debug/proposal/slash/epl_skill_proposal.md
---

@.claude/flowcharts/epl_flowchart.md

## 任務

1. 分析當前對話上下文，識別正在討論的核心問題
2. 整理問題摘要：一句話描述 + 關鍵條件
3. 設計解法流程圖（有序樹狀格式）
4. 按以下格式輸出：

```markdown
## 🎯 問題摘要

**核心問題**：[一句話描述]

**關鍵條件**：
- [條件 1]
- [條件 2]

## 📊 解法流程圖

[有序樹狀流程圖]
```

## 格式規範

- ✅ 流程圖使用有序樹狀格式
- ✅ 問題摘要簡潔（≤3 個關鍵條件）
- ✅ 流程圖層級 2-4 層
- ❌ 禁止箭頭式流程圖（↓ 連續使用）
- ❌ 禁止純文字段落描述流程
