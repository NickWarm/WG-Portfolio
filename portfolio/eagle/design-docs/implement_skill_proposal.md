# Implement Skill 提案文件

## 概述

建立 `/implement` skill，讓 AI 依照對話上下文中的提案文件進行程式碼實作，完成後自動檢核並執行 build。

---

## 原始 Prompt

```markdown
請照著提案文件修改，修改完成後檢查是否符合提案文件，最後 yarn build
確定程式碼可以正常運作
```

---

## 使用場景

### 場景一：搭配 /debugP 使用

1. 執行 `/debugP staging /path/to/spec.md`
2. AI 分析問題、產出提案文件
3. AI 執行 `/reviewDoc` 檢核提案文件
4. 用戶確認提案文件沒問題
5. 執行 `/implement`
6. AI 依照提案文件修改程式碼
7. AI 自動檢核修改是否符合提案
8. AI 執行 `yarn build` 驗證

### 場景二：有現成提案文件

1. 對話中已有提案文件（或用戶提供路徑）
2. 執行 `/implement`
3. AI 從上下文判斷要實作哪個提案
4. AI 修改程式碼並驗證

---

## 設計討論

### 為什麼不需要參數？

- AI 可以從對話上下文判斷要實作哪個提案文件
- 搭配 `/debugP` 或 `/reviewDoc` 使用時，AI 知道當前的提案文件
- 減少用戶輸入負擔
- 如果上下文不夠明確，AI 會主動詢問

### 跨專案執行問題

**問題**：
- Skill 放在 `Projects/.claude/commands/`（因為在 Projects 開啟 Claude Code）
- 但 `yarn build` 需要在 `backend-nestjs` 專案執行

**解決方案**：
- 在 skill 中明確指定 `yarn build` 的執行路徑
- 使用 `cd /Users/nicholas/Desktop/Projects/backend-nestjs && yarn build`
- 或使用 Bash 的 `-C` 風格：先切換目錄再執行

### 檢核機制

實作完成後需要雙重檢核：
1. **符合度檢核**：確認修改內容符合提案文件
2. **Build 檢核**：執行 `yarn build` 確認程式碼可正常運作

### 與現有 skill 的關係

| Skill | 功能 | 產出 |
|-------|------|------|
| `/debugP` | 分析問題 → 產出提案 | 提案文件 |
| `/reviewDoc` | 檢核提案文件 | 檢核報告 |
| `/implement` | 實作提案文件 | 修改後的程式碼 |

這三個 skill 形成完整的工作流程：分析 → 檢核 → 實作

---

## 最終設計

### 檔案結構

```
/Users/nicholas/Desktop/Projects/.claude/
├── modules/
│   ├── debug-output-rules.md       # 既有
│   ├── curl-token.md               # 既有
│   ├── review-proposal-rules.md    # 既有
│   └── implement-rules.md          # 新增：實作規則
└── commands/
    ├── debug.md                    # 既有
    ├── reviewDoc.md                # 既有
    └── implement.md                # 新增
```

### modules/implement-rules.md

```markdown
## 程式碼實作規則

### 實作前檢查
- [ ] 確認提案文件路徑
- [ ] 理解提案的修改範圍
- [ ] 確認要修改的檔案都存在

### 實作原則
- [ ] 嚴格按照提案文件的內容修改
- [ ] 不做提案範圍外的修改
- [ ] 保持最小修改原則
- [ ] 遵循專案既有的程式風格

### 實作後檢核
- [ ] 逐項對照提案文件，確認所有修改都已完成
- [ ] 確認沒有遺漏任何提案中的修改項目
- [ ] 確認沒有做提案範圍外的修改

### Build 驗證
- [ ] 在 backend-nestjs 目錄執行 `yarn build`
- [ ] 確認無編譯錯誤
- [ ] 如有錯誤，立即修正
```

### commands/implement.md

```markdown
---
description: 依照提案文件實作程式碼（自動檢核 + build 驗證）
---

@/Users/nicholas/Desktop/Projects/.claude/modules/implement-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/review-proposal-rules.md

## 執行環境

- **程式碼修改**：`/Users/nicholas/Desktop/Projects/backend-nestjs/`
- **Build 執行**：`cd /Users/nicholas/Desktop/Projects/backend-nestjs && yarn build`

## 任務

1. 從對話上下文判斷要實作的提案文件
2. 讀取提案文件，理解修改內容
3. 依照提案內容逐項修改程式碼
4. 修改完成後，對照提案文件檢核：
   - 確認所有修改項目都已完成
   - 確認沒有做提案範圍外的修改
5. 執行 build 驗證：
   ```bash
   cd /Users/nicholas/Desktop/Projects/backend-nestjs && yarn build
   ```
6. 報告執行結果：
   - ✅ 實作完成項目清單
   - ✅ 符合度檢核結果
   - ✅ Build 結果
   - ❌ 如有錯誤，說明問題並修正
```

---

## 執行範例

### 範例一：搭配 debug 工作流程

```bash
# 1. 分析問題
/debugP staging /path/to/0112_1_bug_spec.md
# → 產出 0112_1_fix_customer_query.md

# 2. 檢核提案（可選，/debugP 已自動執行一次）
/reviewDoc

# 3. 實作提案
/implement
# → AI 依照 0112_1_fix_customer_query.md 修改程式碼
# → AI 執行 yarn build 驗證
```

### 範例二：直接提供提案

```
用戶：請實作這個提案 /path/to/proposal.md
/implement
# → AI 讀取 proposal.md 並實作
```

---

## 實作計畫

1. 建立 `modules/implement-rules.md`
2. 建立 `commands/implement.md`
3. 測試 `/implement` 執行
4. 驗證跨專案 build 執行正常

---

## 實作狀態

- [x] 確認設計
- [x] 建立 implement-rules.md 模組
- [x] 建立 implement.md skill
- [ ] 測試驗證

---

## 設計原則

### 為什麼不需要參數？

這個 skill 的本質是**包裝原始 prompt**，讓 AI 按照對話上下文執行。

- 不需要 Phase 參數（不同文件可能用 Phase、章節、Step 等不同命名）
- 不需要路徑參數（AI 從上下文判斷）
- 保持簡單：`/implement` 就是「照著提案做 + build 驗證」

---

## 功能擴充：強制提醒執行 /check-result（2026-01-26）

### 問題發現

**觸發情境**：AI 實作完成後，直接嘗試自己驗證（port 錯誤、login 失敗），鬼打牆一陣子，直到用戶提醒才回去看 `/check-result`。

**根本原因**：沒有強制機制提醒 AI 在實作完成後執行 `/check-result`。

### 設計決策

在 `/implement` 的輸出格式中強制包含「執行 /check-result」提醒，讓 AI 和用戶都知道下一步。

### 修改提案

#### 更新 implement.md 任務步驟

在步驟 6（報告執行結果）之後，新增強制提醒：

```markdown
6. 報告執行結果：
   - ✅ 實作完成項目清單
   - ✅ 符合度檢核結果
   - ✅ Build 結果
   - ❌ 如有錯誤，說明問題並修正

7. **強制輸出下一步提醒**：
   ```
   ---
   ⚠️ **下一步**：請執行 `/check-result dev` 或 `/check-result staging` 驗證實作結果
   ```
```

#### 更新輸出格式

```markdown
## 輸出格式

實作完成後，輸出應包含：

```
✅ 實作完成

### 修改檔案
- path/to/file1.ts
- path/to/file2.ts

### 符合度檢核
- [x] 項目 1
- [x] 項目 2

### Build 結果
✅ yarn build 成功

---
⚠️ **下一步**：請執行 `/check-result dev` 或 `/check-result staging` 驗證實作結果
```
```

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| AI 實作完成 | 可能自己嘗試驗證（容易出錯）| 看到提醒，執行 /check-result |
| 用戶看到輸出 | 不知道下一步 | 明確知道要執行 /check-result |

### 實作狀態

- [x] 設計討論（2026-01-26）
- [x] 更新 `implement.md` skill 定義檔（已有步驟 8 提醒）
- [x] 驗證：skill 定義檔已包含 `/check-result` 和 `/gcommit-push` 提醒

---

## 功能擴充：禁止修改前端專案（2026-01-27）

### 問題發現

**觸發情境**：AI 執行 `/implement` 時，提案文件包含前端修改建議，AI 直接修改了 `dashboard-nuxt` 專案的檔案。

**根本原因**：
- `/implement` skill 沒有明確禁止修改前端專案
- 雖然執行環境設定為 `backend-nestjs`，但沒有明確的禁止規則
- AI 看到提案中的前端修改建議就直接執行了

**影響**：
- 前端專案應由前端團隊處理
- AI 不熟悉前端專案架構，可能造成錯誤修改
- 違反團隊分工原則

### 設計決策

在 `/implement` skill 中明確禁止修改前端專案，確保 AI 只修改 `backend-nestjs` 專案。

### 執行流程圖

```
/implement 前端修改處理流程
│
├─ 1. 【讀取提案文件】
│   └─ 解析提案中的所有修改項目
│
├─ 2. 【分類修改項目】
│   ├─ 後端修改（backend-nestjs）→ 加入執行清單
│   └─ 前端修改（dashboard-nuxt / frontend-nuxt）→ 加入「待處理」清單
│
├─ 3. 【執行後端修改】
│   ├─ 逐項修改 backend-nestjs 檔案
│   └─ 執行 yarn build 驗證
│
├─ 4. 【輸出報告】
│   ├─ ✅ 已完成：後端修改項目
│   ├─ 🚫 待處理：前端修改項目（含具體說明）
│   └─ ⚠️ 提醒用戶需另外處理前端
│
└─ 5. 【下一步提示】
    └─ 執行 /check-result 驗證實作結果
```

### 修改提案

#### 更新 implement-rules.md

在「實作原則」區塊新增禁止規則：

```markdown
### 實作原則
- [ ] 嚴格按照提案文件的內容修改
- [ ] 不做提案範圍外的修改
- [ ] 保持最小修改原則
- [ ] 遵循專案既有的程式風格
- [ ] **🚫 禁止修改前端專案**（dashboard-nuxt、frontend-nuxt）
```

#### 更新 implement.md

在「執行環境」區塊新增禁止規則：

```markdown
## 執行環境

- **程式碼修改**：`/Users/nicholas/Desktop/Projects/backend-nestjs/`
- **Build 執行**：`cd /Users/nicholas/Desktop/Projects/backend-nestjs && yarn build`

### 🚫 禁止修改的專案

以下專案**絕對禁止修改**，即使提案文件中有相關建議：

| 專案 | 路徑 | 說明 |
|------|------|------|
| dashboard-nuxt | `/Users/nicholas/Desktop/Projects/dashboard-nuxt/` | 前端 Dashboard 專案 |
| frontend-nuxt | `/Users/nicholas/Desktop/Projects/frontend-nuxt/` | 前端官網專案 |

**處理方式**：
- 如提案包含前端修改建議 → 在輸出中標註「前端修改：待處理」
- 不執行任何前端檔案的修改
- 提醒用戶需要另外處理前端修改
```

#### 更新任務步驟

在步驟 3（修改程式碼）新增檢查：

```markdown
3. 依照提案內容逐項修改程式碼
   - ⚠️ **前端修改檢查**：如提案包含前端修改，跳過該項目並標註「待處理」
   - 只修改 `backend-nestjs` 專案內的檔案
```

#### 更新輸出格式

```markdown
## 輸出格式

實作完成後，輸出應包含：

```
✅ 實作完成

### 修改檔案
- path/to/file1.ts
- path/to/file2.ts

### 🚫 前端修改（待處理）
> 以下修改需要前端團隊處理：
- dashboard-nuxt: [修改說明]
- frontend-nuxt: [修改說明]

### 符合度檢核
- [x] 項目 1
- [x] 項目 2

### Build 結果
✅ yarn build 成功

---
⚠️ **下一步**：請執行 `/check-result dev` 或 `/check-result staging` 驗證實作結果
```
```

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 提案含前端修改 | AI 直接修改前端檔案 | AI 跳過並標註「待處理」 |
| 輸出報告 | 只顯示已修改檔案 | 分開顯示後端（已完成）和前端（待處理）|
| 用戶認知 | 可能不知道前端未處理 | 明確知道需要另外處理前端 |

### 實作狀態

- [x] 設計討論（2026-01-27）
- [x] 更新 `implement-rules.md` 模組（2026-01-27）
- [x] 更新 `implement.md` skill 定義檔（2026-01-27）
- [ ] 驗證：測試提案含前端修改時的行為

---

## 功能擴充：加入 Task 追蹤機制（2026-01-30）

### 問題發現

**觸發情境**：執行 `/implement` 時，AI 可能遺漏某些步驟（如雙重檢核、更新提案文件），或在中途卡住時難以追蹤進度。

**根本原因**：
- `/implement` 沒有使用 Task 追蹤機制
- 相比之下，`/debugP` 有完整的 Task 追蹤（12-15 步驟）
- 沒有強制的「結束前檢查」步驟確保所有工作完成

**對比分析**：

| 項目 | /debugP | /implement（修改前）|
|------|--------|---------------------|
| Task 追蹤 | ✅ 有 | ❌ 沒有 |
| 結束前檢查 | ✅ 強制 | ❌ 沒有 |
| 進度可視化 | ✅ 有 | ❌ 沒有 |
| 遺漏風險 | 低 | 高 |

### 設計決策

為 `/implement` 加入 Task 追蹤機制，確保：
1. 每個步驟都有明確的進度追蹤
2. 強制執行「結束前檢查」
3. 與 `/debugP` 保持一致的追蹤模式

### 執行流程圖

```
/implement 執行流程（含 Task 追蹤）
│
├─ 0. 【建立進度追蹤】（強制）
│   └─ 使用 TaskCreate 建立 8 個步驟
│
├─ 1. 【判斷提案文件】
│   └─ 從對話上下文判斷要實作哪個提案
│
├─ 2. 【讀取提案文件】
│   └─ 理解修改內容和範圍
│
├─ 3. 【分類修改項目】
│   ├─ 後端修改 → 加入執行清單
│   └─ 前端修改 → 加入「待處理」清單
│
├─ 4. 【修改後端程式碼】
│   └─ 逐項修改 backend-nestjs 檔案
│
├─ 5. 【執行 Build 驗證】
│   ├─ 成功 → 繼續
│   └─ 失敗 → 修正後重新 Build
│
├─ 6. 【雙重檢核】
│   ├─ 第一次：逐項對照提案文件
│   └─ 第二次：確認無範圍外修改
│
├─ 7. 【更新提案文件】
│   └─ 標記完成項目、新增實作進度
│
└─ 8. 【結束前檢查】（強制）
    ├─ 執行 TaskList 確認所有 task 狀態
    ├─ 全部 completed → 輸出結果
    └─ 有未完成 → 先補完成再輸出
```

### Task 追蹤表格

| Task | Subject | activeForm | blockedBy |
|------|---------|------------|-----------|
| 1 | 判斷提案文件 | 判斷提案文件... | - |
| 2 | 讀取提案文件 | 讀取提案文件... | 1 |
| 3 | 分類修改項目 | 分類修改項目... | 2 |
| 4 | 修改後端程式碼 | 修改程式碼... | 3 |
| 5 | 執行 Build 驗證 | 執行 Build... | 4 |
| 6 | 雙重檢核 | 檢核修改內容... | 5 |
| 7 | 更新提案文件 | 更新提案文件... | 6 |
| 8 | 結束前檢查 | 確認所有步驟完成... | 7 |

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 步驟遺漏 | 可能遺漏雙重檢核或更新文件 | Task 追蹤確保每步完成 |
| 中途卡住 | 難以追蹤進度 | TaskList 顯示當前狀態 |
| 結束確認 | 無強制檢查 | 強制執行結束前檢查 |

### 實作狀態

- [x] 設計討論（2026-01-30）
- [x] 更新設計稿（2026-01-30）
- [x] 更新 `implement.md` skill 定義檔（2026-01-30）

---

### 2026-02-09 設計變更：新增最終步驟「更新進度表」

**變更內容**：在 skill 最後步驟完成後，自動執行 `@.claude/flowcharts/update-progress.md` 共用模組，將 proposal 進度表中 `/implement` 對應的行標記為 ✅。

**設計背景**：見 `showFlow_skill_proposal.md`「2026-02-09 設計變更」。

**影響**：
- 流程圖：最後節點後新增「更新進度表」
- 定義檔：最後 Step 後新增引用 `@.claude/flowcharts/update-progress.md`
- TaskCreate：新增一行

---

## 設計變更：移除衝突模組 + 分段實作策略（2026-02-23）

### 問題發現

**觸發情境**：多次執行 `/implement` 時，AI 花好幾分鐘「思考」但不開始寫程式碼，直到用戶手動提醒「分段實作」才動工。

**根本原因分析**：

#### 原因 1：`review-proposal-rules.md` 載入衝突（嚴重度：🔴）

定義檔第 9 行載入了 `@review-proposal-rules.md`（284 行），這個模組是給 `/reviewDoc` 設計的，其中包含：

- **「禁止自動開始實作」指令**（第 258 行）：與 `/implement` 的目的直接矛盾
- **「禁止詢問要開始實作嗎」指令**（第 259 行）：進一步抑制 AI 的實作行為
- **284 行檢核規則**：DTO 架構、Entity 映射、Service 查詢等，分散 AI 對「寫 code」的注意力

而 `implement-rules.md`（40 行）已有自己的雙重檢核規則，足夠 Step 6 使用。

#### 原因 2：Step 4 缺乏分段實作指引（嚴重度：🔴）

Step 4 只有一句：「依照提案內容逐項修改後端程式碼」。Proposal 通常有 Phase 0/1/2 等分段結構，但沒有指引 AI 按 Phase 分段實作，導致 AI 試圖在腦中規劃完所有修改才動工。

#### 原因 3：TaskCreate 粒度太粗（嚴重度：🟡）

Task 4「修改後端程式碼」是單一 task，沒有引導 AI 按 proposal 結構拆分子 task。

### 修改方案

#### 修改 1：移除 `review-proposal-rules.md` 引用

**檔案**：`backend-nestjs/.claude/commands/implement.md`

**修改前**（第 8-9 行）：
```
@/Users/nicholas/Desktop/Projects/.claude/modules/implement-rules.md
@/Users/nicholas/Desktop/Projects/.claude/modules/review-proposal-rules.md
```

**修改後**：
```
@/Users/nicholas/Desktop/Projects/.claude/modules/implement-rules.md
```

**影響確認**：
- 雙重檢核仍由 `implement-rules.md` 負責（第 20-31 行有完整的檢核規則）
- `/reviewDoc` 不受影響（它自己引用 `review-proposal-rules.md`）
- `review-proposal-rules.md` 本身不修改、不刪除

#### 修改 2：強化 Step 4 — 分段實作策略

**檔案**：`backend-nestjs/.claude/commands/implement.md`

**修改前**（第 64 行）：
```
4. 依照提案內容逐項修改**後端**程式碼
```

**修改後**：
```
4. **分段實作後端程式碼**（核心步驟）：

   **4a. 分析提案結構，拆分實作段落**：
   - 偵測 proposal 中的 Phase / 階段 / 區塊
   - 為每個段落建立 sub-task（使用 TaskCreate）
   - 每個 sub-task 的 subject 格式：`Phase N: {段落描述}`

   **4b. 逐段實作**（每個段落重複以下步驟）：
   - 讀取該段落的修改內容
   - 修改對應的程式碼檔案
   - 段落完成後立即 TaskUpdate(completed)

   **4c. 單一段落的 proposal**：
   - 如 proposal 沒有明確分段 → 按修改檔案拆分
   - 每個檔案的修改為一個 sub-task

   > ⚠️ **禁止行為**：讀完整份 proposal 後長時間分析不動工。讀完即動手，邊做邊驗證。
```

#### 修改 3：更新 TaskCreate 模板

**檔案**：`backend-nestjs/.claude/commands/implement.md`

**修改前**（第 43 行）：
```
| 4 | 修改後端程式碼 | 修改程式碼... | 3 |
```

**修改後**：
```
| 4 | 拆分實作段落 | 拆分實作段落... | 3 |
| 4a+ | Phase N: {動態建立} | 實作 Phase N... | 4 |
```

說明：Task 4 變成「拆分實作段落」，實際的 code 修改由動態建立的 sub-task 執行。

#### 修改 4：更新流程圖

**檔案**：`backend-nestjs/.claude/flowcharts/implement_flowchart.md`

**修改前**（第 19-20 行）：
```
├─ 4. 【修改後端程式碼】
│   └─ 依照提案內容逐項修改
```

**修改後**：
```
├─ 4. 【分段實作後端程式碼】
│   ├─ 4a. 分析 proposal 結構 → 拆分 sub-task
│   ├─ 4b. 逐段實作（讀取 → 修改 → 完成）
│   └─ ⚠️ 禁止長時間分析不動工
```

### 影響範圍確認

| 檔案 | 是否修改 | 說明 |
|------|---------|------|
| `implement.md` 定義檔 | ✅ 修改 | 移除引用 + 強化 Step 4 + 更新 TaskCreate |
| `implement_flowchart.md` | ✅ 修改 | 更新 Step 4 描述 |
| `implement-rules.md` | ❌ 不動 | 已有足夠的雙重檢核規則 |
| `review-proposal-rules.md` | ❌ 不動 | 只是不再被 implement 引用，檔案本身不修改 |
| `reviewDoc.md` | ❌ 不動 | 它自己引用 review-proposal-rules.md，不受影響 |
| 其他 skill | ❌ 不動 | 不涉及 |

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| AI 讀到 proposal | 花幾分鐘分析 284 行檢核規則 | 快速拆分段落後立即動工 |
| 大型 proposal（多 Phase）| 試圖一次規劃所有修改 | 按 Phase 逐段實作 |
| AI 的注意力分配 | 被 review 規則分散 | 專注在 implement-rules（40 行）|
| 「禁止自動開始實作」衝突 | AI 內部矛盾，猶豫不決 | 移除衝突，明確動手 |

### 實作狀態

- [x] 問題分析（2026-02-23）
- [x] 設計變更記錄到設計稿（2026-02-23）
- [x] 更新 `implement.md` 定義檔（2026-02-23）
- [x] 更新 `implement_flowchart.md` 流程圖（2026-02-23）
- [ ] 驗證測試
