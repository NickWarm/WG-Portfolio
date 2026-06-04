---
description: Review Result + Update Doc - 按照檢核建議更新文件並再次檢核
design-doc: prompts/4_diary/debug/proposal/slash/rrDoc_skill_proposal.md
---

@.claude/flowcharts/rrDoc_flowchart.md

## 說明

讀取前一次 `/reviewDoc` 的檢核結果，根據改進建議更新 proposal，然後自動執行 `/reviewDoc again`。

## 前置條件

必須先執行過 `/reviewDoc`，對話上下文中要有檢核結果。

## 任務

1. **檢查前置條件**：確認對話上下文有 `/reviewDoc` 的檢核結果
   - 沒有 → 回應：「❌ 請先執行 `/reviewDoc` 進行檢核」並中止
   - 有 → 繼續

2. **提取修改建議**：從「❌ 發現的問題」區塊提取每個問題和建議

3. **逐項更新文件**：
   - 可直接修正的項目（DTO 補充、結構調整等）→ 執行修正
   - 需用戶確認的項目（業務邏輯、架構設計）→ 標註「⚠️ 待確認」，不修正

4. **記錄修正內容**：建立修正摘要表格

5. **執行 /reviewDoc again**：嵌套調用 `/reviewDoc` 進行再次檢核

6. **輸出結果**：使用以下格式

## 輸出格式

```markdown
📋 rrDoc 執行結果

### 本次修正摘要

| 項目 | 修正內容 | 狀態 |
|------|----------|------|
| DTO description | 補充 xxx 欄位說明 | ✅ 已修正 |
| 欄位一致性 | 在 update DTO 新增 xxx 欄位 | ✅ 已修正 |
| 業務邏輯 | xxx 問題 | ⚠️ 待確認 |

### 已更新文件

- `prompts/4_diary/xxx/1104_2_fix_proposal.md`

---

### /reviewDoc 檢核結果

[這裡會顯示 /reviewDoc 的完整輸出]

---
💡 如需繼續修正，請執行 `/rrDoc`
✅ 確認無誤後，請執行 `/implement` 開始實作
```
