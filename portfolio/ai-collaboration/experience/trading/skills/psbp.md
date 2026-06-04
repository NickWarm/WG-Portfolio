---
name: psbp
description: Pine Script Best Practice — 按社群規範（WTT_Bias + Dskyz DAFE）對 Pine Script code 做 review + refactor。觸發條件：使用者說「pine refactor」「pine review」「這段 code 可以優化嗎」「code review pine」，或呼叫 /psbp。
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# PSBP — Pine Script Best Practice

對 Pine Script code 做完整的 review + refactor，確保符合社群規範且好維護。

## 參數

從使用者訊息解析：

| 參數 | 必填 | 說明 |
|------|------|------|
| target | 是 | 檔案路徑，例：`pinescript/indicators/wg-sop/consolidation_adam.pine` |
| mode | 否 | `review-only`（只審查）/ `full`（全流程，預設） |
| scope | 否 | 範圍關鍵字（SECTION 名或函數名） |

## 前提：讀取規範文件

執行前先讀：
- `docs/learning/pinescript-design-patterns.md`（WTT_Bias + Dskyz DAFE 規範）
- `docs/proposals/concept-learn-skill-proposal.md` 的 Pine Script 常見坑表
- 同目錄下既有的 `debug/*-code-review.md`（學習範本）

## 標準流程（6 階段）

### Phase 1：Review（審查）

讀目標 pine 檔，對照 `pinescript-design-patterns.md` 的 10 章規範檢查：

| 檢查面向 | 檢查點 |
|---------|--------|
| 檔案結構 | 版本宣告 / Input 群組 / SECTION 分離 / 註解原則 |
| 命名規範 | camelCase / is/has 前綴 / Input 描述性 / 顏色後綴 |
| Separation of Concerns | 計算與視覺分離 |
| Modular Encapsulation | UDT 使用 / 函數封裝 |
| Safety | na 檢查 / 除零保護 / 記憶體管理 / 早期 bar 保護 |
| DRY | 重複 code / 硬編碼 / 超長行 |
| Performance | request.security 計數（上限 40）/ per-bar 計算量 |
| **隱藏標記規範** | box text / label tooltip 是否符合 `{TYPE}_{MOD}_{VAL}` 格式（無空格、`_` 分隔、TYPE 大寫） |

### 隱藏標記檢查

對照 `docs/learning/indicator-value-extraction-via-graphics.md` 的 TYPE 清單：

- 檢查所有 `box.new(..., text=...)` 的 text 格式
- 檢查所有 `label.new(..., tooltip=...)` 的 tooltip 格式
- 發現違反規範的（有空格、小寫、沒 `_` 分隔）標為 **Major**
- 新 TYPE 沒加到文件的清單要提醒補

**產出**：`{target_dir}/debug/{target_name}-code-review.md`

格式參考 `debug/sr-lines-code-review.md`：
```
## 符合規範的部分 ✅
## 需要改進的部分 ⚠️
  - 標註：Critical / Major / Minor
  - 提供 line:col 位置
## 總結表格
## 重構優先順序
```

### Phase 2：Refactor 提案

基於 review 在同份文件下方加「Refactor 修改提案」段落。

**常見改進模式**：

| 問題 | 改進 |
|------|------|
| N 組散落變數 | 用 UDT 封裝 |
| 重複 if 區塊 | for 迴圈 + array |
| N 個 var line/label | `map<string, line>` |
| 超長單行賦值 | 抽輔助函數 |
| 固定參數數量函數 | 改 array 參數 + 早退出 |
| 大段重複 merge/filter 邏輯 | 雙層迴圈 |

**分 Stage 原則**：
- 每 Stage 改動獨立、可驗證、可 commit
- 前 stage 留相容層，後 stage 清理
- 典型 5 stage（S/R 線經驗）：
  1. 加 UDT + array（不影響舊 code）
  2. 改其中一塊邏輯（例如合併判斷）
  3. 改另一塊邏輯（例如繪圖）
  4. 清理相容層
  5. 統一 SECTION 註解

### Phase 3：本地驗證

寫 JS 模擬腳本 `{target_dir}/debug/sim-{target_name}-refactor.mjs`：
- 用假資料測試重構版 vs 原版邏輯
- 輸出必須顯示 `✅ 重構版與原版邏輯完全一致`
- 加擴展性測試（加新項目從改 N 處降到幾處）

**跑法**：
```bash
node debug/sim-{target}-refactor.mjs
```

### Phase 4：分 Stage 執行

每個 Stage：

1. 修改 code（編輯 `.pine` 檔）
2. `pbcopy`：
   ```bash
   cat {target.pine} | pbcopy && echo "copied $(wc -l < {target.pine}) lines"
   ```
3. 回報使用者：
   - 改動摘要
   - 請使用者貼 TradingView 驗證
4. **等使用者確認視覺沒變化才 commit**
5. Commit 訊息格式：
   ```
   refactor({target_basename}): Stage N — {改動重點}

   - 改動 1
   - 改動 2
   - 視覺結果與 Stage N-1 一致 ✅

   下階段：Stage N+1 — ...
   ```

### Phase 5：記錄踩坑

refactor 過程遇到的 Pine Script 編譯錯誤/特殊行為，紀錄兩處：

1. **Review 文件**：加「過程踩到的坑」段落
2. **常見坑表**：更新 `docs/proposals/concept-learn-skill-proposal.md` 的坑表

**格式**：
```
| 坑 | 症狀 | 解法 |
|----|------|------|
| 函數隱式 return 型別不一致 | CE10163 | 函數尾加 `int(0)` 統一 |
```

### Phase 6：同步另一版（選做）

如果是雙版本（一般 + MTF）：
- 第一版完成 + 驗證後
- 第二版因邏輯已驗證，可**一次完成**所有 stage
- 不用再分 stage 驗證

## 驗證標準

Skill 執行完畢必須滿足：

- [ ] 視覺結果跟 refactor 前完全一致
- [ ] 行數顯著減少（目標 ≥ 10%）或結構明顯改善
- [ ] 加新項目從改 20+ 處降到改 2-3 處
- [ ] 所有 Stage 都有 commit
- [ ] Review 文件完整（含踩坑記錄）
- [ ] 常見坑表更新

## 常見互動模式

### 情境 1：整個檔案 refactor

```
使用者: /psbp consolidation_adam_mtf.pine

Claude:
Phase 1: 審查中...
Phase 2: 提出 5 stage 計畫，等確認
使用者: 可以開始
Phase 3: 本地驗證通過
Phase 4: Stage 1 改完 → pbcopy → 等確認
使用者: ok
Claude: commit → Stage 2...
```

### 情境 2：只要 review

```
使用者: /psbp xxx.pine review-only

Claude: 只做 Phase 1，輸出 review 文件
```

### 情境 3：雙版本同步

```
使用者: 一般版也要同步
Claude: Phase 6 — 因 MTF 已驗證，一次完成所有 stage
```

## 注意事項

- **每 Stage commit 前必須等使用者確認視覺一致**
- Phase 1/2/3 可以 AI 主導，Phase 4 必須跟使用者互動
- 本地 JS 模擬只能驗證**邏輯**，不能驗證**視覺**
- 視覺一定要在 TradingView 上實際貼 code 驗證
- 踩到新坑要及時紀錄，別等做完才補
- Refactor 不改**功能**，只改**結構**；如果要改功能，另開 feature commit

## 參考專案

S/R 線 refactor 實戰：
- Review: `pinescript/indicators/wg-sop/debug/sr-lines-code-review.md`
- 本地驗證: `pinescript/indicators/wg-sop/debug/sim-sr-refactor.mjs`
- Commits: `50ad6d5` → `e7f393d` → `48ee662` → `92ad026` → `860bbb9`
- 成果: MTF -9%、一般版 -11%
