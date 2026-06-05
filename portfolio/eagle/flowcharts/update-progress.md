# 進度表更新共用模組

> 被各 skill 用 `@.claude/flowcharts/update-progress.md` 引用
> 在 skill 最終步驟完成後自動執行

## 執行流程

```
進度表更新模組
│
├─ 1. 【定位 Proposal】
│   ├─ 從對話上下文找到當前 proposal 路徑
│   └─ 找不到 → 跳過更新，不報錯
│
├─ 2. 【檢查進度表存在】
│   ├─ 讀取 proposal，搜尋「## 工作流程進度」
│   ├─ 不存在 → 跳過更新，不報錯
│   └─ 存在 → 繼續
│
├─ 3. 【比對 Skill 名稱】
│   ├─ 精確匹配優先（如 /reviewDoc -data）
│   ├─ 再基礎匹配（如 /reviewDoc）
│   └─ 找不到對應行 → 跳過
│
├─ 4. 【更新狀態】
│   └─ Edit：將該行的 ⏸️ 改為 ✅
│
└─ 5. 【更新時間戳】
    └─ Edit：「> 最後更新：」→ 當前日期 + skill 名稱
```

## Skill ↔ 進度表匹配規則

| Skill 名稱 | 匹配關鍵字 | 備註 |
|------------|-----------|------|
| debugP | `/debugP` | Bug Fix 流程起點 |
| dpf | `/dpf` | Data Flow 流程起點 |
| add-pi | `/add-pi` | Bug Fix 流程 |
| reviewDoc | `/reviewDoc` | 共用，需排除 -data |
| reviewDoc -data | `/reviewDoc -data` | 精確匹配優先 |
| implement | `/implement` | |
| check-result | `/check-result` | |
| gcommit-push | `/gcommit-push` | |
| fxxxf2e | `/fxxxf2e` | |

## 匹配邏輯

1. **精確匹配優先**：先在進度表中搜尋完整 skill 名稱（含參數，如 `/reviewDoc -data`）
2. **基礎匹配**：精確匹配失敗時，搜尋基礎名稱（如 `/reviewDoc`）
3. **跳過條件**：找不到對應行就跳過，不報錯

## 注意事項

1. **不強制**：proposal 沒有進度表時，靜默跳過
2. **純更新狀態**：只改自己那行的 ⏸️ → ✅ 和時間戳，不動其他內容
3. **冪等**：已經是 ✅ 的行不會重複更新
4. **不建立進度表**：建立進度表是 `/showFlow u` 的職責，本模組只負責更新

## 各 Skill 引用方式

在定義檔最後一個 Step 之後加上：

```markdown
### 最終步驟：更新進度表

@.claude/flowcharts/update-progress.md

執行進度表更新：將本 skill 對應的步驟標記為 ✅
```
