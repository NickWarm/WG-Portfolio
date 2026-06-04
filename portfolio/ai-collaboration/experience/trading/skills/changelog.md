---
description: 更新 WG-SOP CHANGELOG 索引文件進度
---

## 固定路徑

- CHANGELOG：`Forex_program/pinescript/indicators/wg-sop/CHANGELOG.md`

## 任務

根據對話上下文中已完成的工作，更新 CHANGELOG。步驟：

1. 讀 CHANGELOG（只讀前 20 行拿「待實作提案」表格 + 確認插入點）
2. 從 `git log --oneline -10` 抓本次相關 commit hash
3. 判斷需要哪些更新：
   - **新版本段落**：插在第一個 `---` 分隔線之後（待實作提案表格下方）
   - **待實作提案狀態**：更新表格中對應提案的狀態欄
   - **舊版本的「下一步」**：把已完成項目標記 ✅
4. 執行 Edit，然後 commit

## 新版本段落模板

```markdown
## {一般版/MTF} v{版號} — {一行標題}（{YYYY-MM-DD}）✅

{2-4 句描述核心改動與動機}

### Commits

- `{hash}` {commit message 簡述}

### 相關文件

- `debug/{file}` — {一行說明}

### 下一步

- [ ] {待辦項目}
```

## 規則

- 版號規則：MTF 用 v3.x，一般版用 v1.x
- 不讀 DEVELOPMENT.md（那個檔案與本 skill 無關）
- 不搜尋檔案位置（路徑已固定）
- 如果只是 bugfix 不需要新版號，附加到最近的版本段落即可
- commit message 風格：`docs(wg-sop): CHANGELOG 更新 v{版號} 進度`
