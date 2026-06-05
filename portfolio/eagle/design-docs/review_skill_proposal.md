# Review Proposal Skill 提案文件

## 原始 Prompt

```
請再度檢查你的提案文件，是否符合該 api 的service 層與 controller 層的程式架構與慣例、dto 的架構，以及 entity 的定義，以及你的修改提案是否符合最小修正原則，不影響該 api 其他功能，dto 的 description 與 example 有足夠的資訊可以透露給前端嗎，假如有新增欄位，create/update/findOne endpoint 都有新增的欄位嗎，然後對話筐答覆我
```

## 使用場景

### 場景一：搭配 /debugP 使用
1. 執行 `/debugP staging /path/to/spec.md`
2. AI 分析問題、產出提案文件
3. AI 自動執行一次檢核（引用 review module）
4. 用戶查看檢核結果

### 場景二：單獨執行
1. 用戶有現成的提案文件（或剛用 /debugP 產出）
2. 執行 `/review n`
3. AI 從對話上下文判斷要檢核哪個提案文件
4. AI 檢核並回報
5. 用戶根據回報決定是否修正
6. 反覆執行直到文件達到可執行水準

## 設計討論

### 為什麼需要同時是 Skill 和 Module？

- **作為 Module**：讓 `/debugP` 在最後可以引用，自動執行一次檢核
- **作為 Skill**：讓用戶可以單獨反覆執行，直到滿意

### 為什麼不需要參數？

- AI 可以從對話上下文判斷要檢核哪個提案文件
- 搭配 `/debugP` 使用時，AI 剛產出提案文件，知道路徑
- 單獨執行時，如果對話有提到文件，AI 也能判斷
- 減少用戶輸入負擔

### 命名方式

使用 `/reviewDoc` 避免與 Claude Code 內建 `/review` (PR review) 衝突：
- `/reviewDoc` - normal，一般類型（預設，本次實作）
- `/reviewDoc p` - permission，有權限相關的（之後擴充）
- `/reviewDoc f` - file，有檔案上傳的（之後擴充）

### 設計方式

採用 **Module 優先 + 子目錄** 設計：

1. `modules/review-proposal-rules.md` ← 核心檢核規則（純內容，無 frontmatter）
2. `commands/review/normal.md` ← 單獨執行的 skill（有 frontmatter，引用 module）
3. `commands/debugP.md` 最後加一行引用 module

這樣的好處：
- 職責分離：module 是規則，skill 是執行入口
- 語意清楚：引用 module 表示「載入規則」
- 維護方便：規則只需維護一份
- 擴充方便：新類型加新檔案即可

## 最終設計

### 檔案結構

```
.claude/
├── modules/
│   ├── debug-output-rules.md      # 既有
│   ├── curl-token.md              # 既有
│   └── review-proposal-rules.md   # 新增：檢核規則
└── commands/
    ├── debug.md                   # 修改：最後引用 review module
    └── reviewDoc.md               # 新增：/reviewDoc（預設 normal）
    # 之後擴充時改用子目錄或參數判斷
```

### modules/review-proposal-rules.md

```markdown
## 提案文件檢核規則

請檢查提案文件是否符合以下項目：

### 程式架構
- [ ] Service 層的架構與慣例
- [ ] Controller 層的架構與慣例
- [ ] DTO 的架構

### Entity 定義
- [ ] Entity 欄位定義正確

### 最小修正原則
- [ ] 修改範圍最小化
- [ ] 不影響該 API 其他功能

### DTO 資訊完整性
- [ ] description 有足夠資訊可透露給前端
- [ ] example 有足夠資訊可透露給前端

### 新增欄位一致性（如有新增欄位）
- [ ] create endpoint 有新增欄位
- [ ] update endpoint 有新增欄位
- [ ] findOne endpoint 有新增欄位

請逐項檢查並回報結果。
```

### commands/reviewDoc.md

```markdown
---
description: 檢核提案文件（預設 normal，之後支援 p=permission, f=file）
---

@/Users/nicholas/Desktop/Projects/.claude/modules/review-proposal-rules.md

## 任務

1. 從對話上下文判斷要檢核的提案文件
2. 讀取提案文件
3. 依照檢核規則逐項檢查
4. 對話框回報檢核結果
5. 如有問題，說明需要修正的地方
```

### commands/debugP.md 修改

在最後的任務步驟加入：

```markdown
7. 依照檢核規則檢查提案文件（引用 review module）
```

並在 module 引用區加入：

```markdown
@/Users/nicholas/Desktop/Projects/.claude/modules/review-proposal-rules.md
```

## 實作計畫

1. 建立 `modules/review-proposal-rules.md`
2. 建立 `commands/reviewDoc.md`
3. 修改 `commands/debugP.md`，加入 review module 引用
4. 測試 `/reviewDoc` 單獨執行
5. 測試 `/debugP` 是否在最後自動檢核

## 實作狀態

- [x] 確認設計
- [x] 建立 review-proposal-rules.md 模組
- [x] 建立 reviewDoc.md skill
- [x] 修改 debug.md skill
- [x] 測試驗證（/reviewDoc 可正常執行）

---

## 功能擴充：Again 參數（2026-01-19）

### 需求背景

在實際使用中，`/reviewDoc` 執行完成後，用戶經常會修正文件，然後想要再次用相同標準檢核。

目前的流程：
```
/reviewDoc          → AI 檢核文件 A
用戶修正文件 A
/reviewDoc          → AI 可能從上下文判斷錯誤，或需要重新指定
```

期望的流程：
```
/reviewDoc          → AI 檢核文件 A
用戶修正文件 A
/reviewDoc again    → AI 自動找到文件 A，重新檢核
```

### 設計討論（2026-01-19）

**問題**：Skill 本身沒有記憶，不知道「上次檢核的是哪個文件」

**解決方式**：依賴對話上下文

因為 `/reviewDoc` 執行後，對話中已經有：
- 檢核的文件路徑
- 檢核結果

所以 `again` 參數只需要告訴 AI：「從對話歷史中找到最近檢核的文件，再次執行」

### 修改提案

#### 更新後的 commands/reviewDoc.md

```markdown
---
description: 檢核提案文件（預設 normal，之後支援 p=permission, f=file）
argument-hint: [again]
---

@/Users/nicholas/Desktop/Projects/.claude/modules/review-proposal-rules.md

## 參數

- `$1`：可選，傳入 `again` 表示重新檢核上次的文件

## 任務

### 一般模式（無參數）
1. 從對話上下文判斷要檢核的提案文件
2. 讀取提案文件
3. 依照檢核規則逐項檢查
4. 對話框回報檢核結果
5. 如有問題，說明需要修正的地方

### Again 模式（$1 = again）
1. 從對話歷史中找到最近一次 `/reviewDoc` 檢核的：
   - 文件路徑
   - **檢核範圍**（哪個段落/提案，因為同一份文件可能有多個提案）
2. 重新讀取該文件（取得最新內容）
3. **只針對上次檢核的相同範圍**，依照檢核規則逐項檢查
4. 對話框回報檢核結果
5. 如有問題，說明需要修正的地方

> ⚠️ **重要**：同一份提案文件可能包含多個歷史提案，`again` 模式必須從對話上下文理解上次檢核的是「哪個部分」，而不是整篇文件重新檢核。
```

### 使用方式

```bash
# 第一次檢核
/reviewDoc
# AI 檢核 xxx_proposal.md，回報結果

# 用戶修正文件後，再次檢核
/reviewDoc again
# AI 自動找到 xxx_proposal.md，重新檢核
```

### 實作狀態

- ✅ 更新 `reviewDoc.md` skill（新增 again 參數支援）（2026-01-19）
- [ ] 測試驗證

---

## 功能擴充：複雜 API 的 DTO 架構檢核（2026-01-19）

### 問題發現

在實際使用中發現，部分 API（如 `estateListing`、`estateTransaction`）的 DTO 架構較為複雜：

| 複雜特徵 | 說明 | 範例 |
|----------|------|------|
| **巢狀 DTO** | Response 包含多層 nested objects | `estateListingResponse.details.pricing` |
| **findAll 結構** | findAll 返回的欄位與 findOne 不同 | findAll 返回摘要，findOne 返回完整資料 |
| **批次操作** | batch create/update 有額外邏輯 | `createMany`, `updateBatch` |
| **關聯資料** | entity relations 需要特別處理 | `@ManyToOne`, `@OneToMany` eager loading |

目前的檢核規則對於這類複雜 API 可能不夠完整。

### 設計討論（2026-01-19）

討論了三個方案：

| 方案 | 說明 | 優點 | 缺點 |
|------|------|------|------|
| A | 擴充檢核規則 | 一次解決、規則明確 | 簡單 API 也要跑完整檢查 |
| B | 分類型 skill | 精確針對特定類型 | 增加用戶認知負擔 |
| C | AI 自動判斷 | 用戶無需選擇 | 判斷標準需要明確定義 |

**結論**：採用 **A + C 結合**

- 擴充規則（方案 A）：新增複雜 DTO 的檢核項目
- AI 自動判斷（方案 C）：AI 根據特徵自動判斷是否為複雜 API，只對複雜 API 套用額外檢查

### 修改提案

#### 1. 複雜度判斷標準

AI 根據以下特徵判斷 API 是否為「複雜 API」：

```markdown
### 複雜 API 判斷標準

符合以下任一條件即視為「複雜 API」：

1. **DTO 層級**：Response DTO 內有 nested object（超過 1 層）
2. **findAll vs findOne 差異**：兩者返回的欄位結構不同
3. **批次操作**：有 createMany、updateBatch 等批次 endpoint
4. **Entity 關聯**：Entity 有 @ManyToOne、@OneToMany 等關聯
5. **檔案相關**：涉及檔案上傳/下載的欄位
6. **已知複雜 API**：estateListing、estateTransaction、contract 等
```

#### 2. 擴充檢核規則（複雜 API 專用）

在 `review-proposal-rules.md` 新增：

```markdown
### 複雜 API 額外檢查（僅適用於複雜 API）

> AI 會自動判斷是否為複雜 API，若是則額外檢查以下項目

#### 巢狀 DTO 結構
- [ ] nested DTO 的 description 清楚描述每一層的用途
- [ ] nested DTO 的 example 包含完整巢狀結構範例
- [ ] 新增欄位時，確認所有相關的 nested DTO 都有更新

#### findAll 與 findOne 差異
- [ ] 明確說明 findAll 返回哪些欄位（通常是摘要）
- [ ] 明確說明 findOne 返回哪些欄位（通常是完整資料）
- [ ] 新增欄位時，確認應出現在 findAll 還是 findOne（或兩者）

#### 批次操作
- [ ] batch create 的 DTO 欄位與單筆 create 一致（或明確說明差異）
- [ ] batch update 的 DTO 欄位與單筆 update 一致（或明確說明差異）

#### Entity 關聯
- [ ] 關聯資料的載入方式（eager/lazy）是否正確
- [ ] 關聯欄位在 Response DTO 中的呈現方式是否正確
```

#### 3. 更新後的 reviewDoc.md 任務流程

```markdown
## 任務

### 一般模式（無參數）
1. 從對話上下文判斷要檢核的提案文件
2. 讀取提案文件
3. **判斷 API 複雜度**（參考複雜度判斷標準）
4. 依照檢核規則逐項檢查
   - 基本規則：全部 API 都要檢查
   - 複雜 API 額外規則：只有複雜 API 才檢查
5. 對話框回報檢核結果
   - 若為複雜 API，在開頭標註「📊 複雜 API 模式」
6. 如有問題，說明需要修正的地方
```

### 預期效果

| API 類型 | 檢查項目 |
|----------|----------|
| 簡單 API（如 contractType） | 基本規則 7 項 |
| 複雜 API（如 estateListing） | 基本規則 7 項 + 額外規則 8 項 |

### 實作狀態

- ✅ 更新 `review-proposal-rules.md` 模組（2026-01-19）
- ✅ 更新 `reviewDoc.md` skill（2026-01-19）
- [ ] 測試驗證

---

## 功能擴充：防止過早實作機制（2026-01-19）

### 問題發現

在實際使用中發現，有些 AI 會在提案文件尚未經過充分檢核前就自作主張開始實作。

**期望流程**：
```
提案文件產出 → /reviewDoc（第 1 次）→ 修正 → /reviewDoc（第 2 次）→ 修正 → ... → /reviewDoc（第 N 次，通過）→ 用戶確認實作 → 開始實作
```

**實際問題**：
```
提案文件產出 → /reviewDoc（發現問題）→ AI 自己開始實作（沒有經過用戶同意）
```

### 設計討論（2026-01-19）

**核心問題**：/reviewDoc 是「檢核」工具，不是「實作」的入口。

**解決方向**：

1. 在 /reviewDoc 的輸出中強調「檢核完成 ≠ 可以實作」
2. 明確告知 AI 只有在用戶明確同意後才能開始實作
3. 建議用戶經過多次檢核循環後再實作

### 修改提案

#### 1. 在 reviewDoc.md 加入實作禁止條款

```markdown
## ⛔ 重要限制

**檢核完成 ≠ 可以開始實作**

- /reviewDoc 的職責是「檢核」，不是「實作入口」
- 即使所有檢核項目都通過，AI 也**不得自動開始實作**
- 只有在用戶執行 `/implement` 後才能開始實作
- 建議經過多次 /reviewDoc 循環後（4-5 次），確認提案無誤再執行 /implement
```

#### 2. 在檢核輸出格式中加入提醒

```markdown
## 檢核輸出格式

檢核完成後，輸出應包含：

```
📋 提案文件檢核結果

[檢核項目結果...]

---
⏸️ 檢核完成。如需修正，請修改提案文件後執行 `/reviewDoc again`。
⚠️ 確認提案無誤後，請執行 `/implement` 開始實作。
```
```

#### 3. 更新 review-proposal-rules.md 模組

在模組最後加入：

```markdown
---

## 檢核後行為規範

- ✅ 回報檢核結果
- ✅ 說明需要修正的地方
- ✅ 等待用戶下一步指示
- ❌ **禁止**自動開始實作
- ❌ **禁止**詢問「要開始實作嗎？」（會誘導用戶跳過檢核循環）
```

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 檢核發現問題 | AI 可能自己修正並實作 | AI 只回報問題，等待用戶決定 |
| 檢核全部通過 | AI 可能問「要開始實作嗎？」 | AI 提示「請執行 /implement」|
| 用戶執行 `/implement` | 開始實作 | 開始實作（唯一正確的觸發方式）|

### 實作狀態

- ✅ 更新 `review-proposal-rules.md` 模組（2026-01-19）
- ✅ 更新 `reviewDoc.md` skill（2026-01-19）
- [ ] 測試驗證

---

## 功能擴充：前端修改建議檢查與文件結構規範（2026-01-21）

### 需求背景

在實際使用中發現：
1. 提案文件如果有「前端修改建議」，AI 無法驗證這些建議是否符合前端專案架構
2. 提案文件結構不一致，影響可讀性和實作順序的清晰度

### 設計討論（2026-01-21）

**問題一：前端修改建議的正確性**

目前 /reviewDoc 只檢核後端相關內容，但提案文件常包含「前端修改建議」區塊。這些建議可能：
- 指向不存在的前端檔案
- 使用錯誤的 API 呼叫方式
- 與前端專案架構不符

**解決方向**：
- 自動判斷對應的前端專案（adminApi → dashboard-nuxt, publicApi → frontend-nuxt）
- 檢查建議修改的檔案是否存在
- 驗證 API 呼叫方式是否符合前端專案慣例

**問題二：提案文件結構不一致**

目前提案文件沒有統一的結構規範，導致：
- 待確認問題散落在文件各處
- 前端和後端修改混在一起
- 實作順序不清楚

**解決方向**：
- 定義標準結構順序：待確認問題 → 前端修改 → 後端修改 → 驗證方式
- 使用 `---` 分隔線區分不同類型的區塊
- 在 /reviewDoc 中檢查結構是否符合規範

### 修改提案

#### 1. 前端專案對應表

| 後端 API 目錄 | 對應前端專案 | 專案路徑 |
|--------------|-------------|---------|
| `adminApi/` | dashboard-nuxt | `/Users/nicholas/Desktop/Projects/dashboard-nuxt` |
| `publicApi/` | frontend-nuxt | `/Users/nicholas/Desktop/Projects/frontend-nuxt` |

#### 2. 前端架構檢查項目

```markdown
### 前端架構檢查項目
- [ ] 建議修改的檔案路徑是否存在於前端專案中
- [ ] 元件/頁面命名是否符合前端專案慣例
- [ ] API 呼叫方式是否符合前端專案的 API 整合模式
- [ ] 若涉及新增欄位，前端是否有對應的 TypeScript 型別定義

### 前端修改建議資訊完整性
- [ ] 明確指出要修改哪個前端檔案（完整路徑）
- [ ] 說明修改的具體位置（函數名稱/區塊）
- [ ] 提供修改前後的程式碼對比（如適用）
```

#### 3. 提案文件標準結構

```markdown
# 提案標題

## 待確認問題（如有）
- 問題1
- 問題2

---

## 前端修改建議（如有）
### 影響範圍
### 修改內容

---

## 後端修改建議
### 影響範圍
### 修改內容

## 驗證方式
```

#### 4. 結構順序原則

1. **待確認問題優先**：有問題要先釐清，再討論修改方案
2. **前端在後端之前**：因為前端需求決定後端 API 設計
3. **驗證方式放最後**：作為實作完成後的檢核標準

#### 5. 結構調整行為（2026-01-26 新增）

當發現提案文件結構不符規範時：
- ✅ **主動調整**：直接調整文件結構順序（移動區塊位置）
- ✅ **回報調整內容**：說明做了哪些結構調整
- ❌ 不只是提示問題讓用戶自己改

**設計理由**：
- 結構調整是機械性操作，不涉及業務邏輯判斷
- 等用戶自己調整會增加來回溝通成本
- 調整後仍需用戶確認，不影響用戶掌控權

#### 6. 更新後的 reviewDoc.md 任務流程

```markdown
### 一般模式（無參數）
1. 從對話上下文判斷要檢核的提案文件
2. 讀取提案文件
3. **判斷 API 複雜度**
4. **檢查提案文件結構**
   - 確認順序：待確認問題 → 前端修改 → 後端修改 → 驗證方式
   - 檢查分隔線使用是否正確
5. 依照檢核規則逐項檢查
   - 基本規則 + 複雜 API 額外規則 + **前端修改建議規則**
6. **前端架構檢查**（若有前端修改建議）
   - 判斷對應的前端專案
   - 確認建議修改的檔案路徑是否存在
   - 確認 API 呼叫方式是否符合前端專案慣例
7. 對話框回報檢核結果
   - 若有前端檢查，在開頭標註「🖥️ 含前端修改檢查」
8. 如有問題，說明需要修正的地方
```

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 提案有前端修改建議 | 只檢核後端內容 | 同時檢核前端架構符合度 |
| 提案結構混亂 | 無法檢測 | 提示結構不符規範，建議調整 |
| 前端檔案路徑錯誤 | 無法檢測 | 提示檔案不存在 |
| API 呼叫方式不符慣例 | 無法檢測 | 提示與前端專案慣例不符 |

### 實作狀態

- ✅ 更新 `review-proposal-rules.md` 模組（2026-01-21）
- ✅ 更新 `reviewDoc.md` skill（2026-01-21）
- [ ] 測試驗證

---

## 功能擴充：欄位影響矩陣與 DTO 架構一致性檢核（2026-01-24）

### 問題發現

在實際使用中發現，常見的遺漏情況：

| 改了 | 但忘了改 |
|------|----------|
| create DTO + service | update DTO + service |
| update DTO + service | create DTO + service |
| create/update | findOne response DTO |
| findOne response | create/update request DTO |

**根本原因**：
1. 提案文件沒有強制要求分析「這個欄位會影響哪些 endpoint」
2. 檢核時沒有讀取現有 DTO 架構來比對
3. 現有的「新增欄位一致性」檢核項目太籠統，AI 難以判斷

### 設計目標

1. **提案文件強制包含「欄位影響矩陣」**：明確列出每個欄位影響哪些 endpoint
2. **/reviewDoc 檢核矩陣合理性**：確認沒有遺漏的 endpoint
3. **確認修改符合現有 DTO 架構**：不是只開欄位，還要符合該 API 的架構慣例

### 修改提案

#### 1. 提案文件新增「欄位影響矩陣」區塊（強制）

提案文件必須包含：

```markdown
## 欄位影響分析

### 修改欄位清單

| 欄位名稱 | create | update | findOne/findAll | 修改類型 | 說明 |
|----------|--------|--------|-----------------|----------|------|
| status | ✅ | ✅ | ✅ | 新增 | 業務需求 |
| memo | - | ✅ | ✅ | 修改 | 只改 update 邏輯 |
| createdAt | - | - | ✅ | - | response only |

### 修改類型說明
- **新增**：原本沒有，這次新增
- **修改**：原本有，這次改邏輯/驗證/description
- **-**：不影響 / 不適用
```

#### 2. /reviewDoc 新增檢核流程

```
提案文件
│
├─ 1. 檢查是否有「欄位影響矩陣」
│   └─ 沒有 → 提示需要補充
│
├─ 2. 讀取該 API 現有的 DTO 架構
│   ├─ create.dto.ts
│   ├─ update.dto.ts
│   └─ response.dto.ts（或從 entity 推斷）
│
├─ 3. 驗證矩陣合理性
│   ├─ create 有的欄位，update 是否也需要？
│   ├─ create/update 有的欄位，response 是否需要返回？
│   └─ 標示「-」的欄位，確認真的不需要修改
│
└─ 4. 驗證修改是否符合 DTO 架構
    ├─ 欄位命名慣例
    ├─ 巢狀結構位置
    ├─ 驗證器使用方式
    └─ description/example 格式
```

#### 3. 新增檢核規則（加入 review-proposal-rules.md）

```markdown
### 欄位一致性檢核

#### 矩陣完整性
- [ ] 提案有包含「欄位影響矩陣」區塊
- [ ] 所有修改的欄位都有列在矩陣中
- [ ] 每個欄位都標示了 create/update/findOne 的影響

#### 跨 endpoint 一致性
- [ ] create 有的欄位，確認 update 是否也需要（除非有明確理由說明為何不需要）
- [ ] update 有的欄位，確認 create 是否也需要（除非有明確理由說明為何不需要）
- [ ] create/update 有的欄位，確認 response（findOne/findAll）是否需要返回
- [ ] 標示「-」的欄位，確認是否真的不需要修改（而非遺漏）

#### 符合現有 DTO 架構
- [ ] 讀取該 API 的現有 DTO 檔案（create.dto.ts, update.dto.ts, response DTO）
- [ ] 新欄位的位置是否符合現有架構（巢狀結構、分組方式）
- [ ] 欄位命名是否符合該 API 的命名慣例
- [ ] 驗證器（@IsString, @IsOptional 等）使用方式是否符合慣例
- [ ] description 格式是否與現有欄位一致
- [ ] example 格式是否與現有欄位一致
```

#### 4. 更新 reviewDoc.md 任務流程

在「一般模式」的檢核步驟中新增：

```markdown
### 一般模式（無參數）
1. 從對話上下文判斷要檢核的提案文件
2. 讀取提案文件
3. **檢查「欄位影響矩陣」是否存在**
   - 若不存在，提示需要補充此區塊
4. **讀取該 API 現有的 DTO 檔案**
   - 根據提案涉及的 API 路徑，找到對應的 DTO 檔案
   - 分析現有的欄位結構和命名慣例
5. 判斷 API 複雜度
6. 檢查提案文件結構
7. 依照檢核規則逐項檢查
   - 基本規則
   - 複雜 API 額外規則
   - **欄位一致性檢核**（新增）
   - 前端修改建議規則
8. 前端架構檢查（若有前端修改建議）
9. 對話框回報檢核結果
10. 如有問題，說明需要修正的地方
```

### 輸出格式範例

#### 矩陣不存在時

```markdown
❌ **缺少「欄位影響矩陣」**

提案文件修改了欄位，但沒有明確列出影響範圍。

請在提案文件中新增以下區塊：

## 欄位影響分析

| 欄位名稱 | create | update | findOne/findAll | 修改類型 | 說明 |
|----------|--------|--------|-----------------|----------|------|
| [欄位1] | ? | ? | ? | 新增/修改 | [說明] |
```

#### 發現遺漏時

```markdown
⚠️ **欄位一致性問題**

| 欄位 | 問題 | 建議 |
|------|------|------|
| `status` | create 有，但 update 沒有 | 確認 update 是否也需要此欄位 |
| `memo` | create/update 有，但 findOne response 沒有 | 確認是否需要在 response 返回 |

請確認這些是「刻意設計」還是「遺漏」，並在提案中說明理由。
```

#### 不符合 DTO 架構時

```markdown
⚠️ **DTO 架構不一致**

| 項目 | 現有慣例 | 提案寫法 | 建議 |
|------|----------|----------|------|
| 欄位命名 | camelCase | snake_case | 改為 `statusCode` |
| 驗證器 | `@IsOptional()` 放第一個 | 放最後 | 調整順序 |
| description | 中文說明 | 英文說明 | 改為中文 |
```

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 改了 create 忘了 update | 無法檢測 | 提示「create 有，update 是否也需要？」|
| 欄位沒有在 response 返回 | 無法檢測 | 提示「是否需要在 findOne 返回？」|
| 欄位命名不符慣例 | 無法檢測 | 提示「現有慣例是 xxx，建議調整」|
| 提案沒有欄位影響分析 | 無法檢測 | 提示「請補充欄位影響矩陣」|

### 實作狀態

- [x] 更新 `review-proposal-rules.md` 模組（2026-01-24）
- [x] 更新 `reviewDoc.md` skill（2026-01-24）
- [ ] 測試驗證

---

## 功能擴充：apiDoc 一致性檢核（2026-01-24）

### 背景說明

部分 API（如 estateListing、estateTransaction）有獨立的 apiDocs 檔案，用於：
- 業務邏輯說明
- 複雜欄位架構說明
- 已棄用欄位標記
- 使用範例（業務邏輯導向，非完整 JSON 範本）

**檔案位置**：`{api名稱}.apiDocs.ts`

**範例**：
```
src/api/adminApi/estateListing/estateListing.apiDocs.ts
src/api/adminApi/estateTransaction/estateTransaction.apiDocs.ts
```

### 問題發現

1. 修改 API 時，可能忘記同步更新 apiDocs
2. 新增 API 時，不確定是否需要 apiDocs
3. apiDocs 中引用的欄位可能與 entity 不一致

### 設計目標

/reviewDoc 檢核時：
1. **判斷是否需要 apiDoc 修改**：檢查該 API 是否有 apiDocs 檔案
2. **已存在的 API 但沒有 apiDoc**：只針對這次修正納入 apiDoc（不需要補齊整個 API）
3. **新設計的 API**：apiDoc 只需業務邏輯，欄位說明在 DTO 的 description/example 已有
4. **檢核 apiDoc 引用的欄位**：確認欄位在 entity 真的存在

### apiDoc 設計原則

#### 1. apiDoc 的職責範圍

| 項目 | apiDoc 負責 | DTO 負責 |
|------|------------|----------|
| 業務邏輯說明 | ✅ | - |
| 複雜欄位架構說明 | ✅ | - |
| 已棄用欄位標記 | ✅ | ✅ |
| 使用範例（業務邏輯） | ✅ | - |
| 欄位型別/驗證 | - | ✅ |
| 欄位 description | - | ✅ |
| 欄位 example | - | ✅ |
| 完整 JSON 範本 | ❌ 不需要 | - |

#### 2. 何時需要 apiDoc

| 情境 | 需要 apiDoc？ | 說明 |
|------|--------------|------|
| 簡單 CRUD API | ❌ | DTO 的 description/example 足夠 |
| 複雜業務邏輯 | ✅ | 需要說明業務規則 |
| 複雜欄位架構（巢狀、多層） | ✅ | 需要說明架構關係 |
| 欄位間有條件依賴 | ✅ | 需要說明依賴邏輯 |
| 有棄用/遷移欄位 | ✅ | 需要說明新舊對應 |

#### 3. apiDoc 內容規範

```typescript
export const XxxApiDocs = {
  create: {
    summary: '創建 XXX',
    description: `
業務邏輯說明...

**欄位架構說明**（僅複雜欄位需要）：
- 說明欄位間的關係
- 說明條件依賴

**已棄用欄位**：
- ❌ oldField - 已由 newField 取代

**使用範例**（業務邏輯導向）：
\`\`\`typescript
// 說明特定業務場景的用法
\`\`\`

⚠️ 不需要放完整的 JSON 範本，欄位說明請參考 DTO
    `,
  },
  update: { ... },
  findOne: { ... },
}
```

### 修改提案

#### 1. 提案文件新增「apiDoc 影響分析」區塊（條件性）

當提案涉及的 API 有 apiDocs 檔案時，提案文件應包含：

```markdown
## apiDoc 影響分析

### 是否需要修改 apiDoc

- [ ] 該 API 有 apiDocs 檔案：`{api名稱}.apiDocs.ts`
- [ ] 這次修改涉及業務邏輯變更 → 需要更新 apiDoc
- [ ] 這次修改涉及欄位架構變更 → 需要更新 apiDoc
- [ ] 這次修改涉及欄位棄用/遷移 → 需要更新 apiDoc

### apiDoc 修改內容

| endpoint | 修改項目 | 說明 |
|----------|----------|------|
| create | description | 新增 xxx 業務邏輯說明 |
| update | description | 更新 yyy 架構說明 |
```

#### 2. /reviewDoc 新增 apiDoc 檢核流程

```
提案文件
│
├─ 1. 檢查該 API 是否有 apiDocs 檔案
│   ├─ 有 → 繼續檢核
│   └─ 沒有 → 跳過 apiDoc 檢核（簡單 API 不需要）
│
├─ 2. 判斷是否需要更新 apiDoc
│   ├─ 業務邏輯變更 → 需要
│   ├─ 欄位架構變更 → 需要
│   ├─ 欄位棄用/遷移 → 需要
│   └─ 單純開欄位（無複雜邏輯）→ 不需要
│
├─ 3. 檢核 apiDoc 修改提案
│   ├─ 引用的欄位是否在 entity 存在
│   ├─ 是否符合 apiDoc 設計原則（不放完整 JSON 範本）
│   └─ 是否與 DTO 的 description/example 重複
│
└─ 4. 特殊情況處理
    ├─ 已存在 API 但沒有 apiDoc → 只針對這次修正納入
    └─ 新 API → 只需業務邏輯，不需完整欄位範本
```

#### 3. 新增檢核規則（加入 review-proposal-rules.md）

```markdown
### apiDoc 一致性檢核

#### 前置檢查
- [ ] 確認該 API 是否有 apiDocs 檔案（{api名稱}.apiDocs.ts）
- [ ] 若無 apiDocs 檔案，跳過此檢核區塊

#### 需要更新 apiDoc 的情況
- [ ] 業務邏輯變更 → 需要更新 apiDoc description
- [ ] 欄位架構變更（巢狀結構、條件依賴）→ 需要更新架構說明
- [ ] 欄位棄用/遷移 → 需要標記已棄用欄位
- [ ] 單純開欄位且無複雜邏輯 → 不需要更新 apiDoc（DTO 足夠）

#### apiDoc 內容檢核
- [ ] 引用的欄位名稱是否在 entity 真的存在
- [ ] 引用的欄位型別是否與 entity 一致
- [ ] 是否避免放完整 JSON 範本（欄位說明應在 DTO）
- [ ] 是否避免重複 DTO 的 description/example

#### 特殊情況
- [ ] 已存在 API 但沒有 apiDoc：只針對這次修正納入 apiDoc，不需補齊整個 API
- [ ] 新設計的 API：apiDoc 只需業務邏輯，欄位說明在 DTO
```

### 輸出格式範例

#### 需要但未提案 apiDoc 修改

```markdown
⚠️ **apiDoc 可能需要更新**

該 API 有 apiDocs 檔案：`estateListing.apiDocs.ts`

這次修改涉及：
- ✅ 業務邏輯變更（新增 xxx 欄位條件依賴）
- ✅ 欄位架構變更（新增巢狀結構）

但提案文件未包含 apiDoc 修改內容。

請確認是否需要更新 apiDoc，若需要請補充「apiDoc 影響分析」區塊。
```

#### apiDoc 引用欄位不存在

```markdown
❌ **apiDoc 欄位不一致**

apiDoc 中引用的欄位在 entity 不存在：

| apiDoc 引用 | Entity 實際 | 建議 |
|-------------|-------------|------|
| `oldStatus` | ❌ 不存在 | 移除或改用 `status` |
| `userType` | ❌ 不存在 | 確認欄位名稱 |
```

#### apiDoc 內容不符設計原則

```markdown
⚠️ **apiDoc 內容建議調整**

| 問題 | 說明 | 建議 |
|------|------|------|
| 完整 JSON 範本 | apiDoc 不應放完整 JSON 範本 | 移至 DTO example 或簡化為業務邏輯範例 |
| 欄位 description 重複 | 與 DTO 的 description 內容重複 | 移除，讓 DTO 負責 |
```

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 有 apiDoc 但提案沒提 | 無法檢測 | 提示「可能需要更新 apiDoc」|
| apiDoc 引用不存在的欄位 | 無法檢測 | 提示「欄位在 entity 不存在」|
| apiDoc 放了完整 JSON 範本 | 無法檢測 | 提示「應簡化為業務邏輯範例」|
| 簡單 API 不需要 apiDoc | - | 自動跳過 apiDoc 檢核 |

### 實作狀態

- [x] 更新 `review-proposal-rules.md` 模組（2026-01-24）
- [x] 更新 `reviewDoc.md` skill（2026-01-24）
- [ ] 測試驗證

---

## 功能擴充：輸出格式強化 - 問題摘要區塊（2026-01-26）

### 問題描述

**現況**：`/reviewDoc` 輸出檢核結果後，有時問題只記錄在表格的 ❌ 標記，沒有用文字明確摘要，導致用戶容易忽略問題。

**原因**：輸出格式定義只有 `[檢核項目結果...]` 佔位符，沒有強制要求「表格後用文字摘要問題」。

### 設計決策

**輸出格式必須包含**：
1. 檢核項目表格（✅/❌ 狀態）
2. **問題摘要區塊**（❌ 項目的詳細說明）

**問題摘要格式**：
- 標題標註問題數量
- 每個問題包含「問題描述」和「建議修正」
- 放在表格之後、結尾提示之前

### 需要的修改

| 項目 | 內容 |
|------|------|
| `reviewDoc.md` | 更新「檢核輸出格式」區塊 |

### 實作狀態

- [x] 設計討論（2026-01-26）
- [x] 更新 `reviewDoc.md` 定義檔（2026-01-26）

---

## 功能擴充：Service 層查詢完整性檢核（2026-01-26）

### 問題發現

**觸發情境**：修復 frontPage Bug 時，JWT payload 需要 `identifier` 欄位，但 auth.service.ts 的 login 查詢 select clause 沒有包含 `identifier: true`，導致 `admin.identifier` 為 undefined。

**根本原因**：現有檢核規則專注在 DTO 層面（create/update/findOne 欄位一致性），但沒有深入到 Service 層的查詢實作細節。

| 現有檢核項目 | 涵蓋範圍 |
|-------------|---------|
| 欄位一致性（create/update/findOne） | ✅ DTO 欄位 |
| 欄位影響矩陣 | ✅ DTO 欄位 |
| apiDoc 引用欄位是否在 entity 存在 | ✅ Entity 欄位 |
| TypeORM select clause 是否包含所需欄位 | ❌ **缺少** |

### 設計決策

在 `review-proposal-rules.md` 新增「Service 層查詢完整性」檢核項目：

```markdown
### Service 層查詢完整性

> 當提案涉及新增欄位到 response 時，需檢查 Service 層的查詢是否完整

#### Select Clause 檢核
- [ ] 若 Service 使用 TypeORM `select` 明確指定欄位，確認新增欄位有包含在 select 中
- [ ] 若 response 需要的欄位來自關聯 Entity，確認 `relations` 或 `join` 有正確載入
- [ ] 特別注意：JWT payload 需要的欄位是否在登入查詢的 select 中（如 `identifier`）

#### 常見遺漏情境
- [ ] TypeORM `find` 的 `select` 選項只列出部分欄位，但 response 需要更多
- [ ] JWT 建立時引用 `entity.xxx`，但查詢時 select 沒有包含 `xxx`
- [ ] 關聯資料（如 `user.store`）沒有在 `relations` 中載入
```

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 提案新增 JWT 欄位 | 無法檢測 select 遺漏 | 提示「確認 select clause 包含該欄位」|
| 提案新增 response 欄位 | 只檢查 DTO | 同時檢查 Service 查詢 |

### 實作狀態

- [x] 設計討論（2026-01-26）
- [x] 更新 `review-proposal-rules.md` 模組（2026-01-26）
- [x] 更新 `reviewDoc.md` 定義檔（2026-01-26）

---

## 功能擴充：程式架構細化檢核 + 現有程式碼比對（2026-01-30）

### 問題發現

**觸發情境**：提案文件中寫 `throw new ForbiddenException(...)`，但實際程式架構是 `return { success: false, message, messageEN }`。這個問題在 `/reviewDoc` 檢核時沒有被發現，直到實作階段才發現不對。

**根本原因**：
1. 現有「程式架構」檢核項目太籠統（只有「Service 層的架構與慣例」），沒有定義具體要檢查什麼
2. `/reviewDoc` 沒有讀取現有程式碼來比對提案範例是否符合實際架構

| 現有檢核項目 | 問題 |
|-------------|------|
| `Service 層的架構與慣例` | 太抽象，AI 不知道具體要檢查什麼 |
| `Controller 層的架構與慣例` | 太抽象，沒有定義錯誤處理模式 |

### 設計決策

採用**兩個方案並行**：

1. **方案一：細化「程式架構」檢核項目** - 明確定義要檢查的具體項目
2. **方案二：新增「程式碼範例驗證」步驟** - 讀取現有程式碼來比對

### 修改提案

#### 1. 細化「程式架構」檢核項目（更新 review-proposal-rules.md）

```markdown
### 程式架構

#### Service 層架構與慣例
- [ ] **錯誤回傳格式**：讀取現有 Service，確認是使用 `return { success: false, message, messageEN }` 還是 `throw Exception`
- [ ] **方法簽名慣例**：確認參數順序是否符合現有慣例（如 `dto` 在前，`userId`/`userRole` 在後）
- [ ] **回傳型別**：確認是否符合現有 Service 的回傳格式（如 `Promise<{ success, message?, data? }>`）
- [ ] **雙語訊息**：確認錯誤訊息是否包含 `message`（中文）+ `messageEN`（英文）

#### Controller 層架構與慣例
- [ ] **錯誤處理模式**：確認如何將 Service 結果轉換為 HTTP Response（檢查 `result.success` 後 throw Exception）
- [ ] **Exception 類型對應**：
  - `messageEN` 包含 `not found` → `NotFoundException` (404)
  - `messageEN` 包含權限相關關鍵字 → `ForbiddenException` (403)
  - 其他錯誤 → `BadRequestException` (400)
- [ ] **參數取得方式**：從 `request['user']` 取得用戶資訊是否符合慣例
- [ ] **Import 完整性**：確認需要的 Exception 類型有 import

#### DTO 架構
- [ ] **裝飾器順序**：確認 `@ApiProperty`、`@IsOptional`、`@Expose` 等裝飾器順序是否符合慣例
- [ ] **雙語 description**：確認是否需要中英文說明
```

#### 2. 新增「程式碼範例驗證」步驟（更新 reviewDoc.md 任務流程）

```markdown
### 一般模式（無參數）

1. 從對話上下文判斷要檢核的提案文件
2. 讀取提案文件
3. **檢查「欄位影響矩陣」是否存在**
4. **讀取該 API 現有的 DTO 檔案**
5. **【新增】讀取該 API 現有的 Service/Controller 程式碼**
   - 根據提案涉及的 API 路徑，找到對應的 Service 和 Controller
   - 分析錯誤處理的實際模式（return vs throw）
   - 分析方法簽名的參數順序慣例
   - 分析錯誤訊息格式（是否有 messageEN）
6. **apiDoc 檢核**
7. **判斷 API 複雜度**
8. **檢查提案文件結構**
9. **【新增】驗證提案範例程式碼是否符合現有架構**
   - 比對提案中的程式碼範例與現有程式碼的模式
   - 若提案用 `throw Exception` 但現有架構用 `return { success }`，標記為不符
   - 若提案的方法簽名與現有慣例不符，標記為需調整
10. 依照檢核規則逐項檢查
11. 前端架構檢查（若有前端修改建議）
12. 對話框回報檢核結果
    - 若有程式架構不符，在開頭標註「⚠️ 程式架構需調整」
13. 如有問題，說明需要修正的地方
```

#### 3. 執行流程圖

```
/reviewDoc 執行流程（2026-01-30 更新版）
│
├─ 1. 【文件識別】
│   ├─ 無參數 → 從對話上下文判斷提案文件
│   └─ again 參數 → 從對話歷史找到上次檢核的文件和範圍
│
├─ 2. 【讀取提案文件】
│   └─ 讀取完整提案內容
│
├─ 3. 【欄位影響矩陣檢查】
│   ├─ 存在 → 繼續
│   └─ 不存在 → 標記「⚠️ 缺少欄位影響矩陣」
│
├─ 4. 【讀取現有 DTO 檔案】
│   ├─ 找到對應的 create.dto.ts / update.dto.ts / response.dto.ts
│   └─ 分析欄位結構和命名慣例
│
├─ 5. 【🆕 讀取現有 Service/Controller 程式碼】
│   ├─ 找到對應的 *.service.ts 和 *.controller.ts
│   ├─ 分析 Service 錯誤回傳模式
│   │   ├─ return { success: false, message, messageEN } 模式
│   │   └─ throw Exception 模式
│   ├─ 分析 Controller 錯誤處理模式
│   │   ├─ 檢查 result.success → throw 對應 Exception
│   │   └─ 確認 Exception 類型對應（404/403/400）
│   └─ 分析方法簽名慣例（參數順序）
│
├─ 6. 【apiDoc 檢核】
│   ├─ 有 apiDocs 檔案 → 檢核內容
│   └─ 無 apiDocs 檔案 → 跳過
│
├─ 7. 【判斷 API 複雜度】
│   ├─ 符合複雜條件 → 標記「📊 複雜 API 模式」
│   └─ 簡單 API → 基本檢核
│
├─ 8. 【檢查提案文件結構】
│   ├─ 結構正確 → 繼續
│   └─ 結構不符 → 主動調整並標記「已調整文件結構」
│
├─ 9. 【🆕 驗證提案範例程式碼】
│   ├─ 比對 Service 錯誤處理模式
│   │   ├─ 提案用 throw 但現有用 return → ❌ 標記不符
│   │   └─ 模式一致 → ✅
│   ├─ 比對 Controller 錯誤處理模式
│   │   ├─ Exception 類型對應正確 → ✅
│   │   └─ Exception 類型不對 → ❌ 標記需調整
│   ├─ 比對方法簽名
│   │   ├─ 參數順序符合慣例 → ✅
│   │   └─ 參數順序不符 → ❌ 標記需調整
│   └─ 比對錯誤訊息格式
│       ├─ 有 message + messageEN → ✅
│       └─ 缺少 messageEN → ❌ 標記需補充
│
├─ 10. 【依照檢核規則逐項檢查】
│    ├─ 基本規則（全部 API）
│    ├─ 欄位一致性檢核
│    ├─ Service 層查詢完整性
│    ├─ 複雜 API 額外規則（若適用）
│    └─ 前端修改建議規則（若有）
│
├─ 11. 【前端架構檢查】（若有前端修改建議）
│    ├─ 判斷對應前端專案
│    ├─ 確認檔案路徑存在
│    └─ 確認 API 呼叫方式符合慣例
│
└─ 12. 【輸出檢核結果】
     ├─ 標註模式（複雜 API / 含前端檢查 / 程式架構需調整）
     ├─ 檢核項目表格（✅/❌）
     ├─ 問題摘要區塊（詳細說明 ❌ 項目）
     └─ 結尾提示（/reviewDoc again 或 /implement）
```

#### 4. 輸出格式範例

##### 程式架構不符時

```markdown
📋 提案文件檢核結果

⚠️ 程式架構需調整

### 檢核項目
| 項目 | 狀態 |
|------|------|
| Service 層架構 | ❌ |
| Controller 層架構 | ❌ |
| DTO 資訊完整性 | ✅ |
| 欄位一致性 | ✅ |

---

### ❌ 發現的問題（2 項）

1. **Service 層錯誤回傳格式不符**
   - 問題：提案使用 `throw new ForbiddenException(...)`
   - 現有架構：使用 `return { success: false, message, messageEN }`
   - 建議：改為 return 格式，並包含 `messageEN` 欄位

   ```typescript
   // ❌ 提案寫法
   throw new ForbiddenException('您不是此成交的買方或賣方經紀人')

   // ✅ 符合現有架構
   return {
     success: false,
     message: '您不是此成交的買方或賣方經紀人，無法查看明細',
     messageEN: 'You are not the buyer or seller agent, cannot view details',
   }
   ```

2. **Controller 層 Exception 類型對應需補充**
   - 問題：提案未說明 Controller 如何處理權限錯誤
   - 現有架構：Controller 檢查 `result.messageEN` 關鍵字來決定 Exception 類型
   - 建議：補充 Controller 錯誤處理邏輯，權限錯誤使用 `ForbiddenException` (403)

---
⏸️ 檢核完成。如需修正，請修改提案文件後執行 `/reviewDoc again`。
⚠️ 確認提案無誤後，請執行 `/implement` 開始實作。
```

### 預期效果

| 情境 | 修改前 | 修改後 |
|------|--------|--------|
| 提案用 throw 但架構用 return | ❌ 無法檢測 | ✅ 標記「Service 層錯誤回傳格式不符」|
| 提案缺少 messageEN | ❌ 無法檢測 | ✅ 標記「錯誤訊息缺少英文版本」|
| 提案方法簽名參數順序不對 | ❌ 無法檢測 | ✅ 標記「方法簽名與現有慣例不符」|
| Controller Exception 類型不對 | ❌ 無法檢測 | ✅ 標記「Exception 類型對應需調整」|

### 實作狀態

- [x] 問題分析（2026-01-30）
- [x] 設計討論（2026-01-30）
- [x] 更新設計稿 v1（2026-01-30）
- [x] 設計修正 v2（2026-01-30）- 見下方「設計修正」區塊
- [x] 更新 `review-proposal-rules.md` 模組（2026-01-30）
- [x] 建立 `adminApi-architecture.md` 架構規範 Module（2026-01-30）
- [x] 更新 `reviewDoc.md` 定義檔（2026-01-30）
- [ ] 測試驗證

---

### 設計修正（2026-01-30 v2）

#### 前一版設計的問題

前一版設計（v1）的流程是：

```
├─ 5. 【讀取現有 Service/Controller 程式碼】
│   ├─ 找到對應的 *.service.ts 和 *.controller.ts
│   ├─ 分析 Service 錯誤回傳模式
│   │   ├─ return { success: false, message, messageEN } 模式
│   │   └─ throw Exception 模式
│   ...
```

**問題**：
1. **每次都重新分析固定模式很奇怪** - adminApi 的錯誤處理模式應該是「固定的設計模式」，不需要每次都重新分析
2. **效率問題** - 每次檢核都讀取整個 Service/Controller 來分析模式，浪費時間

**實際調查結果**：

執行 `grep` 分析 adminApi 的錯誤處理模式：

| 模式 | 出現次數 | 說明 |
|------|----------|------|
| `return { success: false }` | 44 次 | **主要設計模式** |
| `throw Exception` | 11 次 | 早期 API 或特殊情況 |

**結論**：
- adminApi 有一個「主要設計模式」（return { success: false }）
- 但確實有例外存在（throw Exception）
- 所以需要**兩層機制**：
  1. **架構規範文件**：記錄主要設計模式，讓 AI 知道標準
  2. **讀取現有程式碼**：確認該 API 是否有特殊情況

#### 修正後的設計（v2）

**新增 Module**：`adminApi-architecture.md`

```markdown
## adminApi 架構規範

### Service 層錯誤處理（主要模式）

**標準格式**：
```typescript
return {
  success: false,
  message: '中文錯誤訊息',
  messageEN: 'English error message',
  data: null,  // 可選
}
```

**設計原則**：
- Service 層不直接 throw Exception
- 由 Controller 統一將 `success: false` 轉換為對應的 HTTP Exception
- 錯誤訊息必須包含 `message`（中文）+ `messageEN`（英文）

### Controller 層錯誤轉換

**標準模式**：
```typescript
if (!result.success) {
  const messageEN = result.messageEN || result.message
  if (messageEN?.includes('not found')) {
    throw new NotFoundException({ message: result.message, messageEN })
  } else if (messageEN?.includes('cannot') || messageEN?.includes('permission')) {
    throw new ForbiddenException({ message: result.message, messageEN })
  }
  throw new BadRequestException({ message: result.message, messageEN })
}
```

**Exception 類型對應**：
| messageEN 關鍵字 | Exception 類型 | HTTP Status |
|-----------------|----------------|-------------|
| `not found` | NotFoundException | 404 |
| `cannot`, `permission` | ForbiddenException | 403 |
| 其他 | BadRequestException | 400 |

### 已知例外

以下 API 使用 `throw Exception` 而非 `return { success: false }`：

| API | 說明 |
|-----|------|
| contract.service.ts | contractTypeCode 檢查使用 throw |
| contractBatch.service.ts | contractTypeCode 檢查使用 throw |
| rolePermission.service.ts | 早期開發，使用 throw |
```

#### 修正後的流程圖

```
/reviewDoc 執行流程（2026-01-30 v2）
│
├─ 1. 【文件識別】
│   ├─ 無參數 → 從對話上下文判斷提案文件
│   └─ again 參數 → 從對話歷史找到上次檢核的文件和範圍
│
├─ 2. 【讀取提案文件】
│   └─ 讀取完整提案內容
│
├─ 3. 【欄位影響矩陣檢查】
│   ├─ 存在 → 繼續
│   └─ 不存在 → 標記「⚠️ 缺少欄位影響矩陣」
│
├─ 4. 【讀取現有 DTO 檔案】
│   ├─ 找到對應的 create.dto.ts / update.dto.ts / response.dto.ts
│   └─ 分析欄位結構和命名慣例
│
├─ 5. 【🆕 讀取架構規範 + 現有程式碼】
│   ├─ 5.1 讀取 adminApi 架構規範 Module
│   │   └─ 取得主要設計模式（return { success: false } + Controller 轉換）
│   │
│   ├─ 5.2 檢查該 API 是否在「已知例外」清單中
│   │   ├─ 在例外清單 → 標記「此 API 使用 throw 模式」
│   │   └─ 不在例外清單 → 使用主要設計模式
│   │
│   └─ 5.3 讀取該 API 的 Service/Controller（確認實際情況）
│       ├─ 若與架構規範不符 → 以實際程式碼為準
│       └─ 若符合架構規範 → 繼續
│
├─ 6. 【apiDoc 檢核】
│   ├─ 有 apiDocs 檔案 → 檢核內容
│   └─ 無 apiDocs 檔案 → 跳過
│
├─ 7. 【判斷 API 複雜度】
│   ├─ 符合複雜條件 → 標記「📊 複雜 API 模式」
│   └─ 簡單 API → 基本檢核
│
├─ 8. 【檢查提案文件結構】
│   ├─ 結構正確 → 繼續
│   └─ 結構不符 → 主動調整並標記「已調整文件結構」
│
├─ 9. 【驗證提案範例程式碼】
│   ├─ 比對 Service 錯誤處理模式
│   │   ├─ 提案與該 API 的模式不符 → ❌ 標記不符
│   │   └─ 模式一致 → ✅
│   ├─ 比對 Controller 錯誤處理模式
│   │   ├─ Exception 類型對應正確 → ✅
│   │   └─ Exception 類型不對 → ❌ 標記需調整
│   ├─ 比對方法簽名
│   │   ├─ 參數順序符合慣例 → ✅
│   │   └─ 參數順序不符 → ❌ 標記需調整
│   └─ 比對錯誤訊息格式
│       ├─ 有 message + messageEN → ✅
│       └─ 缺少 messageEN → ❌ 標記需補充
│
├─ 10. 【依照檢核規則逐項檢查】
│    ├─ 基本規則（全部 API）
│    ├─ 欄位一致性檢核
│    ├─ Service 層查詢完整性
│    ├─ 複雜 API 額外規則（若適用）
│    └─ 前端修改建議規則（若有）
│
├─ 11. 【前端架構檢查】（若有前端修改建議）
│    ├─ 判斷對應前端專案
│    ├─ 確認檔案路徑存在
│    └─ 確認 API 呼叫方式符合慣例
│
└─ 12. 【輸出檢核結果】
     ├─ 標註模式（複雜 API / 含前端檢查 / 程式架構需調整）
     ├─ 檢核項目表格（✅/❌）
     ├─ 問題摘要區塊（詳細說明 ❌ 項目）
     └─ 結尾提示（/reviewDoc again 或 /implement）
```

#### v1 vs v2 比較

| 項目 | v1 設計 | v2 設計 |
|------|---------|---------|
| 架構規範 | 無，每次重新分析 | 有 Module 文件定義主要模式 |
| 讀取程式碼 | 每次都完整分析 | 先查規範，再確認實際情況 |
| 例外處理 | 無 | 有「已知例外」清單 |
| 效率 | 較低 | 較高（規範文件小） |
| 可維護性 | 較低 | 較高（規範明確） |

#### 需要建立的檔案

| 檔案 | 位置 | 說明 |
|------|------|------|
| `adminApi-architecture.md` | `.claude/modules/` | adminApi 架構規範 Module |

---

## 2026-01-30 設計討論：自動驗證機制（v3 提案）

### 問題背景

在今天的 EDM API debug 過程中，`/reviewDoc` 產出了「待確認問題」區塊，但這些問題其實可以由 AI 自動驗證：

| 待確認問題 | 用戶反饋 | 應有行為 |
|-----------|---------|---------|
| agentName 欄位是否必要？ | 「你要去查前後端 code 吧」 | 自動 grep 前端是否使用該欄位 |
| edm.filter.service.ts 是否有相同重複問題？ | 「去查程式碼不就知道了」 | 自動讀取並分析程式碼 |
| TypeORM distinctOn 語法需確認 | 「你可能要去查 typeorm 的文件」 | 自動搜尋/查閱官方文件 |
| 雙語訊息不完整 | 「要一併修正」 | 自動補充 messageEN |

**核心問題**：`/reviewDoc` 應該是「驗證並修正」，而非「標記問題讓用戶確認」

### 設計目標

1. **自動驗證**：能自動驗證的問題，不應該留給用戶
2. **自動修正**：發現可修正的問題，直接更新提案文件
3. **減少來回**：減少 `/reviewDoc again` 的循環次數

### 自動驗證分類

#### 類別 A：程式碼查詢可驗證

| 問題類型 | 驗證方法 | 範例 |
|---------|---------|------|
| 欄位是否被使用 | grep 前端專案 | `agentName` 是否在前端使用 |
| 相似問題是否存在 | 讀取相關程式碼 | 其他 service 是否有同樣的 JOIN 問題 |
| 方法是否已存在 | grep 專案程式碼 | `getFirstAgentNames` 是否已存在 |

**執行方式**：
```
驗證欄位使用流程
│
├─ 1. 從提案中提取待驗證欄位名稱
│
├─ 2. 根據 API 類型判斷前端專案
│   ├─ adminApi → dashboard-nuxt
│   └─ publicApi → frontend-nuxt
│
├─ 3. 執行 Grep 搜尋前端專案
│   └─ grep -r "欄位名稱" /前端專案路徑/
│
└─ 4. 分析結果
    ├─ 找到使用 → 更新提案：「已確認欄位被使用」
    └─ 未找到 → 更新提案：「欄位可能可移除，建議與前端確認」
```

#### 類別 B：程式碼分析可驗證

| 問題類型 | 驗證方法 | 範例 |
|---------|---------|------|
| 相關檔案是否有同樣問題 | 讀取並分析程式碼 | `edm.filter.service.ts` 是否有重複問題 |
| 現有實作模式 | 讀取程式碼比對 | Service 錯誤處理是用 throw 還是 return |

**執行方式**：
```
分析相關檔案流程
│
├─ 1. 從提案中識別「相關檔案」（如同名 .service.ts）
│
├─ 2. 讀取相關檔案程式碼
│
├─ 3. 分析是否有相同問題
│   ├─ 搜尋相同的 pattern（如 LEFT JOIN）
│   └─ 分析查詢方式是否相同
│
└─ 4. 更新提案
    ├─ 有相同問題 → 在提案中標記需一併修改
    └─ 沒有問題 → 在提案中標記「已確認無相同問題」並說明原因
```

#### 類別 C：文件/Web 查詢可驗證

| 問題類型 | 驗證方法 | 範例 |
|---------|---------|------|
| 第三方庫語法 | 官方文件 → GitHub → Source Code | TypeORM distinctOn 語法 |
| API 用法確認 | 查閱官方文件 | NestJS decorator 用法 |

**執行方式**：
```
查詢技術文件流程
│
├─ 1. 識別需要驗證的技術語法
│
├─ 2. 搜尋驗證（按優先順序）
│   ├─ 優先：WebSearch 官方文件
│   ├─ 備用：搜尋 GitHub Issues/PRs
│   └─ 第三備用：查閱該庫的 Source Code（如 TypeORM repo）
│
└─ 3. 更新提案
    ├─ 找到正確語法 → 確認提案語法正確
    └─ 語法有誤 → 更新提案中的程式碼
```

#### 類別 D：格式自動補充

| 問題類型 | 自動修正方法 | 範例 |
|---------|-------------|------|
| 缺少 messageEN | 根據 message 自動產生英文版 | 「您沒有權限」→ 「You do not have permission」|
| 缺少欄位影響矩陣 | 根據提案內容自動產生 | 自動分析涉及的 endpoint 和欄位 |

**執行方式**：
```
自動補充格式流程
│
├─ 1. 檢測提案中缺少的格式項目
│
├─ 2. 自動產生內容
│   ├─ messageEN：翻譯 message 為英文
│   └─ 欄位影響矩陣：分析提案涉及的欄位和 endpoint
│
└─ 3. 直接更新提案文件（使用 Edit 工具）
```

### 修改後的執行流程圖

```
/reviewDoc 執行流程（v3 提案 - 自動驗證版）
│
├─ 1. 【文件識別】（與 v2 相同）
│   ├─ 無參數 → 從對話上下文判斷提案文件
│   └─ again 參數 → 從對話歷史找到上次檢核的文件和範圍
│
├─ 2. 【讀取提案文件】
│   └─ 讀取完整提案內容
│
├─ 3. 【自動驗證階段】（🆕 新增）
│   │
│   ├─ 3.1 【欄位使用驗證】
│   │   ├─ 從提案中提取涉及的欄位名稱
│   │   ├─ 判斷對應前端專案（adminApi → dashboard-nuxt）
│   │   ├─ Grep 搜尋前端專案確認欄位是否被使用
│   │   └─ 記錄驗證結果
│   │
│   ├─ 3.2 【相關程式碼分析】
│   │   ├─ 識別提案涉及的「相關檔案」（如同名 service）
│   │   ├─ 讀取並分析相關檔案
│   │   ├─ 比對是否有相同問題
│   │   └─ 記錄分析結果
│   │
│   ├─ 3.3 【技術語法驗證】
│   │   ├─ 識別提案中使用的第三方庫語法
│   │   ├─ 搜尋 GitHub/官方文件確認語法正確性
│   │   └─ 記錄驗證結果
│   │
│   └─ 3.4 【格式自動補充】
│       ├─ 檢查是否缺少 messageEN → 自動翻譯補充
│       ├─ 檢查是否缺少欄位影響矩陣 → 自動產生
│       └─ 直接更新提案文件
│
├─ 4. 【更新提案文件】（🆕 新增）
│   ├─ 將「待確認問題」改為「已確認問題」
│   ├─ 補充驗證結果和依據
│   └─ 補充缺少的格式內容
│
├─ 5-12. 【原有檢核流程】（與 v2 相同）
│   ...（欄位影響矩陣、DTO、架構規範、apiDoc 等檢核）
│
└─ 13. 【輸出檢核結果】
     ├─ 標註「🔍 已自動驗證 X 項問題」
     ├─ 列出自動驗證的結果摘要
     ├─ 檢核項目表格（✅/❌）
     └─ 結尾提示
```

### v2 vs v3 比較

| 項目 | v2 設計 | v3 設計（提案） |
|------|---------|----------------|
| 待確認問題處理 | 標記讓用戶確認 | 自動驗證並更新提案 |
| 欄位使用確認 | 不處理 | 自動 grep 前端專案 |
| 相關檔案分析 | 不處理 | 自動讀取並比對 |
| 技術語法驗證 | 不處理 | 自動搜尋文件 |
| messageEN 補充 | 標記缺少 | 自動翻譯補充 |
| 欄位影響矩陣 | 標記缺少 | 自動產生 |
| 提案文件更新 | 不更新 | 自動更新 |
| 來回次數 | 較多（3-5 次） | 較少（1-2 次） |

### 實作考量

#### 優點
1. **減少人工介入**：用戶不需要手動確認可自動驗證的問題
2. **加速流程**：減少 `/reviewDoc again` 的循環
3. **提高準確性**：AI 直接查程式碼比用戶更可靠

#### 風險
1. **過度自動化**：某些問題可能需要人工判斷
2. **誤判風險**：自動分析可能遺漏邊界案例
3. **效能考量**：自動驗證會增加 API 呼叫次數

#### 建議的緩解措施
1. **分級處理**：
   - 高信心度問題（如 grep 結果明確）→ 直接更新
   - 低信心度問題（如分析結果不明確）→ 標記「建議確認」
2. **驗證摘要**：在輸出中明確列出自動驗證的依據
3. **可配置**：允許用戶選擇是否啟用自動驗證

### 待討論事項

1. **自動更新提案文件**：直接用 Edit 工具更新，還是產出「建議更新」讓用戶確認？
2. **欄位影響矩陣自動產生**：是否應該包含在 v3？還是單獨一個功能？
3. **messageEN 翻譯**：使用 AI 自動翻譯是否足夠準確？
4. **GitHub/Web 搜尋**：搜尋外部資源是否有效率問題？

---

**下一步**：待用戶確認設計方向後，更新 `reviewDoc.md` 定義檔

---

## 功能擴充：檔案上傳專屬檢核 `/reviewDoc f`（2026-01-31）

### 需求背景

在開發涉及檔案上傳的功能時，即使 `/reviewDoc` 通過一般檢核，仍可能遺漏檔案上傳架構相關的問題。

**現有架構文件**：
- `file_upload_architecture.md` - 檔案上傳架構總覽
- `file_upload_checklist.md` - 檔案上傳開發檢核清單

### 設計決策

#### 定位：補充檢核（非取代）

`/reviewDoc f` 是「補充檢核」，預期在一般檢核流程完成後執行：

```
提案檢核完整流程
│
├─ 1. /reviewDoc          ← 一般檢核（Service架構、DTO、欄位一致性...）
├─ 2. /rrDoc              ← 按建議修改後再檢核
├─ 3. /reviewDoc f        ← 【補充】檔案上傳專屬檢核（6項）
│                            只檢查檔案上傳相關，不重複一般項目
└─ 4. /implement          ← 開始實作
```

#### 設計原則

| 項目 | 說明 |
|------|------|
| **定位** | 補充檢核，不取代 `/reviewDoc` |
| **不重複** | 不做 Service 架構、DTO 完整性等一般檢核 |
| **只專注** | 6 項檔案上傳專屬檢核 |
| **前置條件** | 預期已經跑過 `/reviewDoc` |
| **按需載入** | 檔案上傳知識只在 `f` 參數時才載入，避免浪費 token |

#### Token 效率設計

⚠️ **重要**：檔案上傳相關知識採用「按需載入」策略

| 模式 | 載入的知識 | 說明 |
|------|-----------|------|
| `/reviewDoc` | 一般檢核規則 | 不載入檔案上傳知識 |
| `/reviewDoc again` | 一般檢核規則 | 不載入檔案上傳知識 |
| `/reviewDoc f` | 檔案上傳專屬知識 | 只有此時才載入 |

**設計理由**：
- 大部分提案與檔案上傳無關，不需要載入相關知識
- 檔案上傳知識（architecture + checklist）約 2,000-3,000 tokens
- 按需載入可節省不必要的 token 消耗

#### 實作注意事項（2026-02-05 補充）

⚠️ **`@` 是預處理指令，無法實現條件載入**

| 寫法 | 行為 | 結果 |
|------|------|------|
| `@` 寫在條件區塊內 | Skill 載入時**全部讀取** | ❌ 無法按需載入 |
| 任務步驟寫「讀取 xxx 文件」 | 執行到該步驟時才讀取 | ✅ 真正按需載入 |

**錯誤寫法**（定義檔）：
```markdown
### File 模式（$1 = f）
**按需載入知識**：
- @/path/to/file_upload_architecture.md  ← 會被無條件載入
```

**正確寫法**（定義檔）：
```markdown
### File 模式（$1 = f）
1. 讀取檔案上傳知識：
   - `/path/to/file_upload_architecture.md`
   - `/path/to/file_upload_checklist.md`
2. 執行檢核...
```

> ✅ **已修正**（2026-02-05）：定義檔 `reviewDoc.md` 的 File 模式和 Permission 模式已改為正確的「任務步驟讀取」寫法。

### 執行流程圖

```
/reviewDoc f 執行流程（補充檢核模式）
│
├─ 1. 【載入檔案上傳知識】
│   ├─ file_upload_architecture.md（架構總覽）
│   └─ file_upload_checklist.md（檢核清單）
│
├─ 2. 【讀取提案文件】
│   └─ 從對話上下文判斷
│
├─ 3. 【檔案上傳專屬檢核】（6 項）
│   │
│   ├─ 3.1 【CUSTOM_PATH_PREFIX 檢核】
│   │   ├─ 提案是否有定義 pathPrefix？
│   │   ├─ 是否已加入 constant.ts 的 CUSTOM_PATH_PREFIX？
│   │   └─ 命名是否符合 {module}_{type} 慣例？
│   │
│   ├─ 3.2 【DOCUMENT_TYPE_MAPPING 檢核】
│   │   ├─ 是否需要新的 documentType？
│   │   ├─ 是否已加入 constant.ts 的 DOCUMENT_TYPE_MAPPING？
│   │   └─ 鍵值是否對應 FileService 方法？
│   │
│   ├─ 3.3 【Module 設定檢核】
│   │   ├─ CommonModule 是否已引入？
│   │   ├─ S3Module 是否已引入？
│   │   └─ FileService 是否已注入 constructor？
│   │
│   ├─ 3.4 【Service 方法檢核】
│   │   ├─ 是否呼叫 fileService.handleFileUpload()？
│   │   ├─ 參數是否包含 pathPrefix、userId、oldFiles？
│   │   └─ 是否處理回傳的 fileIds？
│   │
│   ├─ 3.5 【DTO 欄位檢核】
│   │   ├─ Request DTO 是否有 files?: string[]？
│   │   ├─ Response DTO 是否有 files 關聯？
│   │   └─ Swagger 裝飾器是否正確？
│   │
│   └─ 3.6 【Entity 關聯檢核】
│       ├─ Entity 是否有 files: File[] 關聯？
│       ├─ @OneToMany 關聯設定是否正確？
│       └─ documentType 是否對應？
│
└─ 4. 【輸出結果】
    ├─ 標註「📁 檔案上傳補充檢核」
    └─ 只顯示檔案上傳相關的檢核結果
```

### 檔案上傳專屬檢核項目（6 項）

| # | 檢核項目 | 檢核內容 | 判斷依據 |
|---|----------|----------|----------|
| 1 | CUSTOM_PATH_PREFIX | pathPrefix 是否定義且加入 constant.ts | 搜尋 constant.ts |
| 2 | DOCUMENT_TYPE_MAPPING | documentType 是否定義且對應正確 | 搜尋 constant.ts |
| 3 | Module 設定 | CommonModule、S3Module、FileService 注入 | 讀取 module.ts |
| 4 | Service 方法 | handleFileUpload 呼叫與參數 | 讀取 service.ts |
| 5 | DTO 欄位 | files 欄位與 Swagger 裝飾器 | 讀取 dto.ts |
| 6 | Entity 關聯 | File[] 關聯與 documentType | 讀取 entity.ts |

### 輸出格式

```markdown
📋 提案文件檢核結果

📁 檔案上傳補充檢核

### 檔案上傳專屬檢核
| 項目 | 狀態 | 備註 |
|------|------|------|
| CUSTOM_PATH_PREFIX | ✅ | `REAL_ESTATE_DOCUMENT` 已定義 |
| DOCUMENT_TYPE_MAPPING | ✅ | 對應 `realEstateDocument` |
| Module 設定 | ✅ | CommonModule 已引入 |
| Service 方法 | ❌ | 缺少 oldFiles 參數 |
| DTO 欄位 | ✅ | files?: string[] 已定義 |
| Entity 關聯 | ✅ | @OneToMany 設定正確 |

---

### ❌ 發現的問題（1 項）

1. **Service 方法參數不完整**
   - 問題：handleFileUpload 缺少 oldFiles 參數
   - 建議：加入 `oldFiles: entity.files` 以支援檔案更新時的舊檔清理

---
⏸️ 檢核完成。如需修正，請修改提案文件後執行 `/reviewDoc f again`。
⚠️ 確認提案無誤後，請執行 `/implement` 開始實作。
```

### 需要的修改

| 項目 | 內容 | 必要性 |
|------|------|--------|
| `reviewDoc.md` | 新增 `f` 參數判斷邏輯 | ✅ 必要 |
| `reviewDoc_flowchart.md` | 新增 `/reviewDoc f` 分支流程 | ✅ 必要 |

#### 關於獨立 Module 的決策

❌ **不需要** 建立 `file-upload-review-rules.md` Module

**原因**：
1. **按需載入原則**：檔案上傳知識只在 `/reviewDoc f` 時才需要
2. **避免污染一般檢核**：如果放在 Module 被一般模式引用，會浪費 token
3. **直接引用現有文件**：在 `f` 模式的任務流程中直接引用即可

**實作方式**：
```markdown
### File 模式（$1 = f）

1. 載入檔案上傳知識（僅此模式載入）
   - @/prompts/4_diary/file_upload/architecture/file_upload_architecture.md
   - @/prompts/4_diary/file_upload/architecture/file_upload_checklist.md
2. 從對話上下文判斷提案文件
3. 執行 6 項專屬檢核
...
```

### 實作狀態

- [x] 需求討論（2026-01-31）
- [x] 設計確認（2026-01-31）
- [x] 更新設計稿（2026-01-31）
- [x] ~~建立 `file-upload-review-rules.md` 模組~~ → 不需要（按需載入現有文件）
- [x] 更新 `reviewDoc.md` 定義檔（2026-01-31）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-01-31）
- [ ] 測試驗證

---

## 功能擴充：權限專屬檢核 `/reviewDoc p`（2026-02-01）

### 需求背景

在開發涉及權限控制的功能時，即使 `/reviewDoc` 通過一般檢核，仍可能遺漏權限架構相關的問題。

**現有架構文件**：
- `1_permission_architecture.md` - 權限系統架構總覽
- `2_permission_adjustment_rules.md` - 權限調整實作指南（含檢核清單）

**用戶目前工作流程**：
```
/guideA permission    ← 載入完整知識（架構 + 程式碼）
↓
閱讀 ticket
↓
/debugP 或開發
↓
/reviewDoc            ← 一般檢核
↓
（容易遺漏）權限專屬檢核
```

### 設計決策

#### 定位：補充檢核（與 /reviewDoc f 相同模式）

`/reviewDoc p` 是「補充檢核」，預期在一般檢核流程完成後執行：

```
提案檢核完整流程（權限相關）
│
├─ 1. /reviewDoc          ← 一般檢核（Service架構、DTO、欄位一致性...）
├─ 2. /rrDoc              ← 按建議修改後再檢核
├─ 3. /reviewDoc p        ← 【補充】權限專屬檢核（6項）
│                            只檢查權限相關，不重複一般項目
└─ 4. /implement          ← 開始實作
```

#### 設計原則

| 項目 | 說明 |
|------|------|
| **定位** | 補充檢核，不取代 `/reviewDoc` |
| **不重複** | 不做 Service 架構、DTO 完整性等一般檢核 |
| **只專注** | 6 項權限專屬檢核 |
| **前置條件** | 預期已經跑過 `/reviewDoc` |
| **按需載入** | 權限知識只在 `p` 參數時才載入，避免浪費 token |

#### Token 效率設計

| 模式 | 載入的知識 | 說明 |
|------|-----------|------|
| `/reviewDoc` | 一般檢核規則 | 不載入權限知識 |
| `/reviewDoc f` | 檔案上傳知識 | 不載入權限知識 |
| `/reviewDoc p` | 權限專屬知識 | 只有此時才載入 |

### 執行流程圖

```
/reviewDoc p 執行流程（補充檢核模式）
│
├─ 1. 【載入權限知識】（僅此模式載入）
│   ├─ 1_permission_architecture.md（架構總覽）
│   └─ 2_permission_adjustment_rules.md（調整規則）
│
├─ 2. 【讀取提案文件】
│   └─ 從對話上下文判斷
│
├─ 3. 【權限專屬檢核】（6 項）
│   │
│   ├─ 3.1 【apiPermissions.constant.ts 檢核】
│   │   ├─ 提案是否有定義新的權限項目？
│   │   ├─ 權限命名是否符合 `module.operation.action` 格式？
│   │   └─ 是否有對應的中英文 label？
│   │
│   ├─ 3.2 【permissions.constant.ts 檢核】
│   │   ├─ 路由是否已加入權限對應？
│   │   ├─ HTTP Method + Path 是否正確？
│   │   └─ dataScope 設定是否正確？
│   │
│   ├─ 3.3 【rolePermissionMapping.constant.ts 檢核】
│   │   ├─ 新權限是否加入適當的角色集合？
│   │   ├─ 是否考慮所有相關角色（admin、store、agent）？
│   │   └─ 權限集合邏輯是否正確？
│   │
│   ├─ 3.4 【Controller Guards 檢核】
│   │   ├─ @UseGuards(JwtAuthGuard, PermissionGuard) 是否加入？
│   │   ├─ Guards 順序是否正確（JWT 在前）？
│   │   └─ 是否有遺漏的 endpoint？
│   │
│   ├─ 3.5 【Module 依賴檢核】
│   │   ├─ TypeOrmModule.forFeature 是否包含權限相關 Entity？
│   │   │   └─ Permission, Role, RolePermission, Admin
│   │   ├─ RedisModule 是否已引入？
│   │   └─ PermissionGuard 是否加入 providers？
│   │
│   └─ 3.6 【輔助性 API 豁免檢核】
│       ├─ simple-list、dropdown 等是否正確豁免？
│       ├─ 是否誤將輔助性 API 加入權限控制？
│       └─ 豁免設計是否符合 PermissionGuard 自動放行機制？
│
└─ 4. 【輸出結果】
    ├─ 標註「🔐 權限專屬檢核」
    └─ 只顯示權限相關的檢核結果
```

### 權限專屬檢核項目（6 項）

| # | 檢核項目 | 檢核內容 | 判斷依據 |
|---|----------|----------|----------|
| 1 | apiPermissions.constant.ts | 權限項目定義、命名格式、label | 搜尋 constant 檔案 |
| 2 | permissions.constant.ts | 路由權限對應、Method + Path | 搜尋 constant 檔案 |
| 3 | rolePermissionMapping.constant.ts | 角色集合、權限分配 | 搜尋 constant 檔案 |
| 4 | Controller Guards | @UseGuards 裝飾器、順序 | 讀取 controller.ts |
| 5 | Module 依賴 | Entity、RedisModule、PermissionGuard | 讀取 module.ts |
| 6 | 輔助性 API 豁免 | simple-list 等不設權限 | 比對 permissions.constant |

### 輸出格式

```markdown
📋 提案文件檢核結果

🔐 權限專屬檢核

### 權限專屬檢核
| 項目 | 狀態 | 備註 |
|------|------|------|
| apiPermissions.constant.ts | ✅ | `customer.list.view` 已定義 |
| permissions.constant.ts | ✅ | 路由對應正確 |
| rolePermissionMapping.constant.ts | ❌ | 缺少 agent 角色權限 |
| Controller Guards | ✅ | @UseGuards 已加入 |
| Module 依賴 | ✅ | RedisModule 已引入 |
| 輔助性 API 豁免 | ✅ | simple-list 未設權限 |

---

### ❌ 發現的問題（1 項）

1. **角色權限集合不完整**
   - 問題：rolePermissionMapping 中缺少 agent 角色的 `customer.list.view` 權限
   - 建議：確認 agent 是否需要此權限，如需要則加入對應集合

---
⏸️ 檢核完成。如需修正，請修改提案文件後執行 `/reviewDoc p again`。
⚠️ 確認提案無誤後，請執行 `/implement` 開始實作。
```

### 與 /guideA permission 的分工

| Skill | 用途 | 載入內容 | Token |
|-------|------|----------|-------|
| `/guideA permission` | **開發前學習** | 完整知識（架構 + 程式碼） | ~10,000+ |
| `/reviewDoc p` | **檢核時輔助** | 精簡知識（只載入規則文件） | ~3,000 |

**使用時機**：
- 要**開發**權限相關功能 → 用 `/guideA permission` 載入完整知識
- 要**檢核**權限相關提案 → 用 `/reviewDoc p` 載入精簡知識

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `reviewDoc.md` 定義檔 | 新增 `p` 參數判斷邏輯 | ⬜ 待實作 |
| `reviewDoc_flowchart.md` | 新增 `/reviewDoc p` 分支流程 | ⬜ 待實作 |
| 本設計稿 | 記錄設計討論與決議 | ✅ 已完成 |

### 實作狀態

- [x] 需求討論（2026-02-01）
- [x] 設計確認（2026-02-01）
- [x] 更新設計稿（2026-02-01）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-01）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-01）
- [ ] 測試驗證

## 功能擴充：欄位驗證系列 `-c` / `-s` / `-df`（2026-02-07）

> ⚠️ **已遷移**（2026-02-07）：`-c/-s/-df` 核心邏輯已遷移至獨立 skill `review-api-flow` 和 `api-flow-architecture`。
> 以下為歷史設計紀錄，保留作為參考。定義檔和流程圖中的對應區塊已移除。

### 需求背景

review `/debugP` 和 `/check-result` 設計稿時，發現欄位值檢查存在三個設計缺口：

1. **沒有逐欄位比對機制**：「比對 DB 預期值 vs API 回傳值」只是概念性描述
2. **沒有欄位完整性檢查**：API 回傳是否包含所有預期欄位，沒有驗證機制
3. **沒有結構化的驗證報告格式**：結果分析只分成功/失敗，沒有逐欄位報告

**核心問題**：`/check-result` 缺乏結構化的驗證 cases，而這些 cases 應該在 `/reviewDoc` 階段就準備好。

**需求紀錄文件**：`prompts/4_diary/debug/proposal/check_result_field_verification_gaps.md`

### 設計目標

1. `/reviewDoc` 在 proposal 階段就完成欄位驗證的準備工作
2. 產出結構化的驗證 cases，供 `/check-result` 直接使用
3. 確保 API 設計品質（防止任意 500）

### 三個新參數概覽

| 參數 | 全名 | 專注 | 前置依賴 |
|------|------|------|----------|
| `-c` | UI Component | UI 欄位 ↔ API response 欄位對應 | 無（但預期已跑過一般 `/reviewDoc`） |
| `-s` | Situation | 情境流程圖 + 聯集比對 + 驗證 cases | 從 proposal 讀取 `-c` 產出 |
| `-df` | Data Flow | 資料流鏈路驗證（前端 → DTO → Service → DB） | 從 proposal 讀取 `-c` + `-s` 產出 |

### 完整流程中的位置

```
Bug Fix 標準流程（含欄位驗證）
│
├─ /exportN → bug spec
├─ /debugP dev → proposal
├─ /reviewDoc → 一般檢核（v3 自動驗證）
├─ /reviewDoc -c → UI ↔ API 欄位對應
├─ /reviewDoc -s → 情境流程圖 + 聯集比對 + 驗證 cases
├─ /reviewDoc -df → 資料流鏈路驗證
├─ /implement → 實作
├─ /check-result dev → 讀取 proposal 中的 cases 驗證
└─ /gcommit-push → 提交
```

### 設計決策

| 問題 | 決定 | 原因 |
|------|------|------|
| Data Flow 參數命名 | `-df`（非 `-f`） | `-f` 已是檔案上傳補充檢核 |
| 與一般 `/reviewDoc` 的關係 | 先跑一般 `/reviewDoc`，再跑 `-c` → `-s` → `-df` | 一般檢核做初步品質確認，新參數做特定領域深入檢查 |
| 產出傳遞方式 | 寫進 proposal | 與現有 `-f`、`-p` 行為一致，後面的步驟從 proposal 讀取 |
| 前端行為判斷 | 查前端索引表（ui-api-index），不從零看前端程式碼 | 與 `/debugP`、`/check-result` 策略一致 |

### 參數體系總覽（更新後）

```
/reviewDoc 完整參數體系
│
├─ 無參數    → 一般檢核（v3 自動驗證版）
├─ again     → 重新檢核上次文件
│
├─ 【欄位驗證系列】（有序，依賴前一步產出）
│   ├─ -c    → 🖥️ UI Component
│   ├─ -s    → 📊 Situation
│   └─ -df   → 🔄 Data Flow
│
└─ 【領域補充系列】（獨立，無順序依賴）
    ├─ -f    → 📁 檔案上傳補充檢核（6 項）
    └─ -p    → 🔐 權限補充檢核（6 項）
```

### 產出傳遞方式

每個步驟的產出都寫進 proposal，後面的步驟從 proposal 讀取：

```
proposal 文件
│
├─ （原有內容：debugP 產出的分析與修正提案）
│
├─ ## UI 欄位對應檢核（-c 產出）
│   └─ UI ↔ API 欄位對應表
│
├─ ## 情境分析（-s 產出）
│   ├─ 前端 UI 情境流程圖
│   ├─ 歷史資料流流程圖
│   └─ 聯集比對結果
│
└─ ## 資料流驗證（-df 產出）
    └─ 資料流鏈路驗證表 + 驗證 cases
```

---

### `-c`（UI Component）詳細設計

#### 定位：補充檢核（與 /reviewDoc f 相同模式）

`/reviewDoc -c` 是「補充檢核」，預期在一般檢核流程完成後執行：

```
提案檢核完整流程（欄位驗證）
│
├─ 1. /reviewDoc          ← 一般檢核
├─ 2. /reviewDoc -c       ← 【補充】UI 欄位對應檢核
├─ 3. /reviewDoc -s       ← 【補充】情境分析（依賴 -c 產出）
├─ 4. /reviewDoc -df      ← 【補充】資料流驗證（依賴 -s 產出）
└─ 5. /implement          ← 開始實作
```

#### 設計原則

| 項目 | 說明 |
|------|------|
| **定位** | 補充檢核，不取代 `/reviewDoc` |
| **不重複** | 不做 Service 架構、DTO 完整性等一般檢核 |
| **只專注** | UI 欄位 ↔ API response 欄位對應 + API 設計品質 |
| **前置條件** | 預期已跑過 `/reviewDoc` |
| **按需載入** | 前端索引表只在此模式才讀取 |

#### Token 效率設計

| 模式 | 載入的知識 | 說明 |
|------|-----------|------|
| `/reviewDoc` | 一般檢核規則 | 不載入前端索引 |
| `/reviewDoc -c` | 前端索引表 | 只有此時才讀取 ui-api-index |
| `/reviewDoc -s` | 前端索引表 + proposal 中 -c 產出 | 讀取索引 + 前一步產出 |
| `/reviewDoc -df` | proposal 中 -c + -s 產出 | 不需要再讀索引 |

#### 執行流程圖

```
/reviewDoc -c 執行流程（UI Component 檢核）
│
├─ 1. 【判斷前端專案 + 讀取索引表】
│   ├─ 從 proposal 的 API 路徑判斷
│   │   ├─ adminApi → dashboard-nuxt
│   │   └─ publicApi → frontend-nuxt
│   ├─ 讀取對應的 ui-api-index-*.md
│   └─ 索引找不到 → 手動搜尋前端專案（備用）
│
├─ 2. 【提取 UI 欄位】
│   ├─ 找到 bug spec 操作對應的「頁面 / Tab / Dialog」
│   └─ 提取該區塊中 UI 元件使用的所有欄位
│       ├─ 表格欄位（列表顯示）
│       ├─ 表單欄位（輸入/編輯）
│       └─ Dialog 欄位（彈窗）
│
├─ 3. 【讀取後端 DTO】
│   ├─ response DTO 欄位（findOne/findAll）
│   └─ create/update DTO 欄位
│
├─ 4. 【建立 UI ↔ API 欄位對應表 + 品質檢查】
│   ├─ 逐一比對 UI 欄位 vs response DTO 欄位
│   │   ├─ ✅ 有對應
│   │   ├─ ❌ 缺失
│   │   └─ ⚠️ 可疑（名稱不完全匹配）
│   ├─ 檢查 FK 4XX 處理
│   │   └─ 每個 FK 欄位是否有前置查詢驗證（findOne → 不存在回 4XX）
│   ├─ 檢查 DB 寫入錯誤防護
│   │   └─ 列出所有 DB 寫入操作（save/update/remove）
│   │       ├─ FK constraint violation → 是否有前置查詢或 catch？
│   │       ├─ NOT NULL constraint violation → 必填欄位是否有 DTO 驗證 + Service 補值？
│   │       ├─ Unique constraint violation → 唯一欄位是否有前置查詢或 catch？
│   │       ├─ 關聯資料 softDelete → LEFT JOIN 取到 null 後續操作是否安全？
│   │       └─ undefined/null 傳入 DB → Service 是否拿可能為 undefined 的值做查詢？
│   └─ 產出 500 路徑清單
│       └─ 列出 proposal 中所有可能產生 500 的路徑，標記已防護/未防護
│
└─ 5. 【寫入 proposal + 輸出】
    ├─ proposal 新增「## UI 欄位對應檢核」區塊
    │   ├─ UI ↔ API 欄位對應表
    │   └─ API 設計品質檢查結果
    ├─ 標註「🖥️ UI Component 檢核」
    └─ 結尾提示：「請執行 /reviewDoc -s」
```

#### 檢核項目（5 項）

| # | 項目 | 檢核內容 |
|---|------|----------|
| 1 | UI 欄位完整性 | 前端元件有出的欄位，API response 都有對應 |
| 2 | DTO 欄位回傳保障 | DTO 定義的欄位都能正常回傳（關聯 null、計算欄位等） |
| 3 | FK 4XX 處理 | 每個 FK 欄位都有前置查詢驗證（findOne → 不存在回 4XX） |
| 4 | DB 寫入錯誤防護 | 列出所有 DB 寫入操作，逐一檢查每種 DB 錯誤情境是否有防護 |
| 5 | 500 路徑清單 | 列出 proposal 中所有可能產生 500 的路徑，標記已防護/未防護 |

> **2026-02-07 變更**：移除原第 2 項「Select 完整性」，Service select/relations 檢查責任歸屬 `-df`（資料流鏈路中的 Service 查詢環節）。

#### API 設計品質檢查（防止任意 500）— v2（2026-02-07 改版）

> **改版原因**：原版只檢查 FK constraint，AI 執行時只看 FK 就打 ✅，漏掉其他 500 路徑。

**核心原則**：列出 proposal 中**所有 DB 寫入操作**，對每個操作逐一檢查**所有可能的 500 情境類型**，不能只看 FK。

##### 500 情境類型清單

| 500 情境類型 | 檢查方式 | 典型場景 |
|-------------|----------|----------|
| FK constraint violation | 檢查每個 FK 欄位是否有前置查詢驗證（findOne → 不存在回 4XX） | 前端送 `storeId=999`，但 store 不存在 |
| NOT NULL constraint violation | 檢查必填欄位是否有 DTO 驗證（@IsNotEmpty）+ Service 層補值邏輯 | 缺 `realEstateId`，DB 寫入時炸 NOT NULL |
| Unique constraint violation | 檢查唯一欄位是否有前置查詢（先查是否已存在）或 catch QueryFailedError 處理 | 重複的 `contractNo` |
| 關聯資料 softDelete | 檢查 LEFT JOIN 的關聯是否可能被 soft delete，導致取到 null 後續操作炸 500 | store 被 soft delete，bid.storeId 還指向它，後續拿 store.name 炸 null reference |
| undefined/null 傳入 DB 操作 | 檢查 Service 中是否有拿可能為 undefined/null 的值直接做 DB 查詢或寫入 | 前端沒送 `contractId`，Service 拿 undefined 去查 DB 就炸了 |

##### 檢查執行方式

```
對 proposal 中每個 DB 寫入操作（save/update/softRemove/delete）：
│
├─ 1. 識別該操作涉及的 Entity 和欄位
├─ 2. 逐一檢查 5 種 500 情境類型
│   ├─ FK constraint → 該 Entity 有哪些 FK？每個 FK 有前置查詢嗎？
│   ├─ NOT NULL → 該 Entity 有哪些 NOT NULL 欄位？DTO 有驗證嗎？Service 有補值嗎？
│   ├─ Unique → 該 Entity 有哪些 Unique 約束？有前置查詢或 catch 嗎？
│   ├─ softDelete 關聯 → 該操作的關聯資料可能被 soft delete 嗎？後續操作安全嗎？
│   └─ undefined/null → Service 中有拿可能為空的值做 DB 操作嗎？
├─ 3. 標記每個情境的防護狀態
│   ├─ ✅ 有防護（前置查詢 / DTO 驗證 / try-catch / 補值邏輯）
│   ├─ ❌ 無防護（會直接炸 500）
│   └─ N/A（該情境不適用，如無 Unique 約束）
└─ 4. 產出 500 路徑清單
```

#### 輸出格式

```markdown
📋 提案文件檢核結果

🖥️ UI Component 檢核

### UI ↔ API 欄位對應表

| UI 欄位 | 來源元件 | API response 欄位 | Service select | 狀態 |
|---------|----------|-------------------|----------------|------|
| 店名 | 列表 column | storeName | ✅ select 有 | ✅ |
| 經紀人 | 列表 column | agentName | ❌ response 無 | ❌ |
| 合約編號 | Dialog 表單 | contract.contractNo | ✅ relations 有 | ✅ |
| 照片 | 詳情頁 | photoUrl | ✅ select 有 | ⚠️ 可能為 null |

### API 設計品質 — 500 防護

| DB 寫入操作 | 500 情境 | 防護方式 | 狀態 |
|------------|----------|---------|------|
| save(bid) | FK: storeId 不存在 | findOne 前置查詢 → 4XX | ✅ |
| save(bid) | FK: contractId 不存在 | ❌ 無防護 | ❌ |
| save(bid) | NOT NULL: realEstateId 缺失 | enrichment 補值 | ✅ |
| save(bid) | Unique: 無唯一約束 | N/A | ✅ |
| save(bid) | undefined 傳入: contractId 可能為 undefined | ❌ 無防護 | ❌ |
| softRemove(x) | softDelete 關聯: store 已刪除 | try-catch QueryFailedError | ✅ |

### 500 路徑清單

| # | 500 路徑 | 防護狀態 |
|---|---------|----------|
| 1 | save(bid) → contractId FK 不存在 → DB constraint error | ❌ 未防護 |
| 2 | save(bid) → contractId 為 undefined → DB 查詢炸 500 | ❌ 未防護 |

---

### ❌ 發現的問題（3 項）

1. **agentName 欄位缺失**
   - UI 列表有顯示「經紀人」欄位
   - 但 response DTO 沒有 agentName
   - 建議：在 response DTO 新增 agentName，Service select 加入對應欄位

2. **contractId FK 缺少前置查詢**
   - save(bid) 時 contractId 沒有前置查詢驗證
   - 若 contract 不存在，會直接到 DB 操作炸 FK constraint 500
   - 建議：Service 先 findOne(contract)，撈不到回 { success: false, messageEN: 'contract not found' }

3. **contractId 可能為 undefined**
   - 前端沒送 contractId 時，Service 拿 undefined 去做 DB 操作
   - 建議：DTO 加 @IsNotEmpty() 驗證，或 Service 層檢查

---
⏸️ 檢核完成。請執行 `/reviewDoc -s` 進行情境分析。
```

#### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `reviewDoc.md` 定義檔 | 新增 `c` 參數判斷邏輯和任務流程 | ⬜ 待實作 |
| `reviewDoc_flowchart.md` | 新增 `[c 模式專屬流程]` 分支 | ⬜ 待實作 |
| 本設計稿 | 記錄設計討論與決議 | ✅ 已完成 |

##### reviewDoc.md 定義檔更新內容

在現有的 `Permission 模式（$1 = p）` 區塊後面，新增：

```markdown
### Component 模式（$1 = c）

> 🖥️ **補充檢核模式**：預期已跑過 `/reviewDoc`，只檢核 UI 欄位與 API response 對應

**執行流程**：

1. **判斷前端專案 + 讀取索引表**
   - adminApi → 讀取 `prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md`
   - publicApi → 讀取 `prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md`
   - 索引找不到 → 手動搜尋前端專案（備用）
2. **提取 UI 欄位**：從索引表找到對應頁面/Tab/Dialog 的欄位
3. **讀取後端 DTO + Service**：response DTO、create/update DTO、Service select/relations
4. **建立 UI ↔ API 欄位對應表 + 品質檢查**
   - 逐一比對 UI 欄位 vs response DTO 欄位
   - 檢查 Service select 完整性
   - 檢查 FK 4XX 處理（每個 FK 欄位是否有「撈不到 → 回 4XX」）
   - 檢查 500 防護（前端少送資料時是否會炸 500）
5. **寫入 proposal + 輸出結果**
   - 在 proposal 新增「## UI 欄位對應檢核」區塊
   - 標註「🖥️ UI Component 檢核」
   - 結尾提示：「請執行 /reviewDoc -s」
```

同時更新定義檔開頭的參數說明：

```markdown
## 參數

- `$1`：可選
  - `again` - 重新檢核上次的文件
  - `f` - 檔案上傳補充檢核模式（只檢核檔案上傳相關項目）
  - `p` - 權限補充檢核模式（只檢核權限相關項目）
  - `c` - UI Component 檢核模式（UI 欄位 ↔ API response 對應）🆕
  - `s` - Situation 情境分析模式（情境流程圖 + 聯集比對）🆕
  - `df` - Data Flow 資料流驗證模式（前端 → DTO → Service → DB）🆕
```

##### reviewDoc_flowchart.md 更新內容

在參數識別區塊新增 `c` 分支：

```markdown
├─ 1. 【參數識別】
│   ├─ 無參數 → 一般檢核模式
│   ├─ again 參數 → Again 模式
│   ├─ f 參數 → 檔案上傳補充檢核模式
│   ├─ p 參數 → 權限補充檢核模式
│   ├─ c 參數 → UI Component 檢核模式 🆕
│   ├─ s 參數 → Situation 情境分析模式 🆕
│   └─ df 參數 → Data Flow 資料流驗證模式 🆕
```

在 `[p 模式專屬流程]` 區塊後面新增：

```markdown
├─ [c 模式專屬流程] 🆕
│   │
│   ├─ 1. 【判斷前端專案 + 讀取索引表】
│   │   ├─ adminApi → ui-api-index-dashboard.md
│   │   └─ publicApi → ui-api-index-frontend.md
│   │
│   ├─ 2. 【提取 UI 欄位】
│   │   └─ 從索引表找到對應頁面/Tab/Dialog 的欄位
│   │
│   ├─ 3. 【讀取後端 DTO + Service】
│   │   ├─ response DTO 欄位
│   │   └─ Service select/relations
│   │
│   ├─ 4. 【建立 UI ↔ API 欄位對應表 + 品質檢查】
│   │   ├─ 逐一比對 UI 欄位 vs response 欄位
│   │   ├─ 檢查 FK 4XX 處理
│   │   └─ 檢查 500 防護
│   │
│   └─ 5. 【寫入 proposal + 輸出】
│       ├─ proposal 新增「## UI 欄位對應檢核」
│       ├─ 標註「🖥️ UI Component 檢核」
│       └─ 結尾提示：「請執行 /reviewDoc -s」
```

#### 實作狀態

- [x] 需求討論（2026-02-07）
- [x] 設計確認（2026-02-07）
- [x] 更新設計稿（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

### `-s`（Situation）詳細設計

#### 定位：補充檢核（依賴 -c 產出）

`/reviewDoc -s` 預期在 `-c` 完成後執行，從 proposal 讀取 `-c` 產出的 UI ↔ API 欄位對應表。

#### 設計原則

| 項目 | 說明 |
|------|------|
| **定位** | 補充檢核，不取代 `/reviewDoc` |
| **前置依賴** | 從 proposal 讀取 `-c` 產出的 UI ↔ API 欄位對應表 |
| **只專注** | 情境分析 + 流程圖比對 + 驗證 cases 產出 |
| **按需載入** | 前端索引表 + 歷史 proposal/bug spec |

#### 執行流程圖

```
/reviewDoc -s 執行流程（Situation 情境分析）
│
├─ 1. 【讀取 proposal 前置產出】
│   ├─ 讀取 -c 產出的「UI ↔ API 欄位對應表」
│   └─ 讀取 proposal 的修正提案內容
│
├─ 2. 【查前端索引表 → 畫 UI 情境流程圖】
│   ├─ 從索引表取得該功能的所有操作
│   │   ├─ 頁面載入 → 哪些 API
│   │   ├─ Tab 切換 → 哪些 API
│   │   ├─ 按鈕操作 → 哪些 API
│   │   └─ Dialog 操作 → 哪些 API
│   │
│   └─ 畫出「前端 UI 情境流程圖」（文字版）
│       ├─ 列出每個操作觸發的 API
│       ├─ 列出每個 API 送出/接收的欄位
│       └─ 標記有值/沒值的情境
│           ├─ 必填欄位 → 一定有值
│           ├─ 選填欄位 → 可能沒值
│           └─ 條件欄位 → 特定情境才有值
│
├─ 3. 【讀取歷史文件 → 畫歷史資料流流程圖】
│   ├─ 讀取 bug spec 的重現步驟和預期行為
│   ├─ 讀取 proposal 中的修正邏輯
│   └─ 畫出「歷史資料流流程圖」（文字版）
│       ├─ 原本的資料流（修正前）
│       └─ 修正後的資料流
│
├─ 4. 【聯集比對】
│   ├─ 取兩張流程圖的聯集
│   │   ├─ UI 情境有但歷史沒提到的 → 可能遺漏
│   │   ├─ 歷史有但 UI 情境沒覆蓋的 → 可能是邊界案例
│   │   └─ 兩者都有的 → 已覆蓋
│   │
│   └─ 檢查聯集中每個情境的 response 資料
│       ├─ 有值情境：response 欄位是否正確回傳？
│       ├─ 沒值情境：response 欄位是否正確處理 null？
│       └─ 邊界情境：FK 不存在、資料被刪除等
│
├─ 5. 【產出驗證 cases】
│   ├─ 根據聯集的所有情境，產出結構化的驗證 cases
│   │   ├─ 有值 case：DB 查詢條件 + 預期 response 值
│   │   ├─ 沒值 case：DB 查詢條件 + 預期 null/預設值
│   │   └─ 邊界 case：FK 不存在時的預期 4XX
│   └─ 這些 cases 供 `/check-result` 直接使用
│
└─ 6. 【寫入 proposal + 輸出結果】
    ├─ 在 proposal 新增「## 情境分析」區塊
    │   ├─ 前端 UI 情境流程圖
    │   ├─ 歷史資料流流程圖
    │   ├─ 聯集比對結果
    │   └─ 驗證 cases 表
    ├─ 標註「📊 Situation 情境分析」
    └─ 結尾提示：「請執行 /reviewDoc -df」
```

#### 輸出格式

```markdown
📋 提案文件檢核結果

📊 Situation 情境分析

### 前端 UI 情境流程圖

物件編輯頁面操作流程
│
├─ 1. 【頁面載入】
│   ├─ GET /real-estates/:id → 取得物件資料
│   └─ response 欄位：id, name, storeName, agentName, ...
│
├─ 2. 【切換到出價紀錄 Tab】
│   ├─ GET /bids?realEstateId=x → 取得出價列表
│   └─ response 欄位：id, amount, contractNo, createdAt, ...
│
├─ 3. 【點擊出價按鈕 → 開啟 Dialog】
│   ├─ GET /contracts/simple-list → 合約下拉選單
│   └─ GET /store-admins/simple-list → 經紀人下拉選單
│
└─ 4. 【送出出價】
    ├─ POST /bids → 新增出價
    ├─ 送出欄位：contractId(必填), amount(必填), storeId(選填)
    └─ 情境：
        ├─ 有 storeId → 關聯店家
        └─ 沒 storeId → storeId = null

### 歷史資料流流程圖

Bug: 出價紀錄缺少店名顯示
│
├─ 【修正前】
│   ├─ GET /bids → response 沒有 storeName
│   └─ 前端顯示空白
│
└─ 【修正後】
    ├─ GET /bids → response 新增 storeName（從 store 關聯取得）
    └─ 情境：
        ├─ bid 有 storeId → storeName = store.name
        └─ bid 沒 storeId → storeName = null

### 聯集比對結果

| 情境 | UI 流程圖 | 歷史流程圖 | response 覆蓋 | 狀態 |
|------|-----------|-----------|---------------|------|
| 有 storeId 的出價 | ✅ | ✅ | storeName 有值 | ✅ |
| 沒 storeId 的出價 | ✅ | ✅ | storeName = null | ✅ |
| storeId 指向已刪除的 store | ❌ 未提及 | ❌ 未提及 | ？ | ⚠️ 遺漏 |
| contractId 不存在 | ✅ | ❌ 未提及 | 應回 4XX | ❌ 遺漏 |

### 驗證 Cases（供 /check-result 使用）

| # | 情境 | DB 查詢條件 | 預期 response |
|---|------|------------|---------------|
| 1 | 有 storeId | WHERE "storeId" IS NOT NULL LIMIT 1 | storeName 有值 |
| 2 | 沒 storeId | WHERE "storeId" IS NULL LIMIT 1 | storeName = null |
| 3 | store 已刪除 | WHERE "storeId" NOT IN (SELECT id FROM store) | storeName = null 或 4XX |
| 4 | contractId 不存在 | POST 送不存在的 contractId | 4XX（非 500） |

---

### ❌ 發現的問題（2 項）

1. **store 已刪除的情境未處理**
   - 聯集比對發現：bid 的 storeId 指向已刪除的 store 時，行為未定義
   - 建議：LEFT JOIN store，storeName 為 null 時前端顯示「-」

2. **contractId 不存在的 4XX 處理**
   - POST /bids 送不存在的 contractId 時，proposal 沒有定義錯誤處理
   - 建議：Service 先查 contract，撈不到回 4XX

---
⏸️ 檢核完成。請執行 /reviewDoc -df 進行資料流驗證。
```

#### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `reviewDoc.md` 定義檔 | 新增 `s` 參數判斷邏輯和任務流程 | ⬜ 待實作 |
| `reviewDoc_flowchart.md` | 新增 `[s 模式專屬流程]` 分支 | ⬜ 待實作 |
| 本設計稿 | 記錄設計討論與決議 | ✅ 已完成 |

##### reviewDoc.md 定義檔更新內容

在 `Component 模式（$1 = c）` 區塊後面，新增：

```markdown
### Situation 模式（$1 = s）

> 📊 **補充檢核模式**：預期已跑過 `/reviewDoc` 和 `-c`，分析所有情境並產出驗證 cases

**執行流程**：

1. **讀取 proposal 前置產出**
   - 讀取 -c 產出的「UI ↔ API 欄位對應表」
   - 讀取 proposal 的修正提案內容
2. **查前端索引表 → 畫 UI 情境流程圖**
   - 從索引表取得該功能的所有操作（頁面載入、Tab 切換、按鈕、Dialog）
   - 畫出文字版流程圖，標記有值/沒值/條件欄位
3. **讀取歷史文件 → 畫歷史資料流流程圖**
   - 讀取 bug spec 重現步驟 + proposal 修正邏輯
   - 畫出修正前/修正後的資料流
4. **聯集比對**
   - 取兩張流程圖的聯集
   - 檢查每個情境的 response 資料是否完整
   - 找出遺漏的情境（邊界案例、null 處理）
5. **產出驗證 cases**
   - 有值 case + 沒值 case + 邊界 case
   - 每個 case 包含 DB 查詢條件和預期 response
6. **寫入 proposal + 輸出結果**
   - 在 proposal 新增「## 情境分析」區塊
   - 標註「📊 Situation 情境分析」
   - 結尾提示：「請執行 /reviewDoc -df」
```

##### reviewDoc_flowchart.md 更新內容

在 `[c 模式專屬流程]` 區塊後面新增：

```markdown
├─ [s 模式專屬流程] 🆕
│   │
│   ├─ 1. 【讀取 proposal 前置產出】
│   │   ├─ -c 產出的 UI ↔ API 欄位對應表
│   │   └─ proposal 修正提案內容
│   │
│   ├─ 2. 【查前端索引表 → 畫 UI 情境流程圖】
│   │   ├─ 取得所有操作（頁面/Tab/按鈕/Dialog）
│   │   └─ 標記有值/沒值/條件欄位
│   │
│   ├─ 3. 【讀取歷史文件 → 畫歷史資料流流程圖】
│   │   ├─ bug spec 重現步驟
│   │   └─ proposal 修正前/修正後資料流
│   │
│   ├─ 4. 【聯集比對】
│   │   ├─ UI 情境 ∪ 歷史資料流
│   │   └─ 找出遺漏的 response 資料
│   │
│   ├─ 5. 【產出驗證 cases】
│   │   ├─ 有值 case + 沒值 case + 邊界 case
│   │   └─ 供 /check-result 使用
│   │
│   └─ 6. 【寫入 proposal + 輸出】
│       ├─ proposal 新增「## 情境分析」
│       ├─ 標註「📊 Situation 情境分析」
│       └─ 結尾提示：「請執行 /reviewDoc -df」
```

#### 實作狀態

- [x] 需求討論（2026-02-07）
- [x] 設計確認（2026-02-07）
- [x] 更新設計稿（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

### `-df`（Data Flow）詳細設計

#### 定位：補充檢核（依賴 -c + -s 產出）

`/reviewDoc -df` 預期在 `-c` 和 `-s` 完成後執行，從 proposal 讀取前兩步的產出。

#### 設計原則

| 項目 | 說明 |
|------|------|
| **定位** | 補充檢核，不取代 `/reviewDoc` |
| **前置依賴** | 從 proposal 讀取 `-c` 的欄位對應表 + `-s` 的情境和驗證 cases |
| **只專注** | 前端欄位 → DTO → Service → DB 的完整資料流鏈路 |
| **搭配 -s** | 用 `-s` 產出的情境逐一驗證，不用從零檢查 |

#### 執行流程圖

```
/reviewDoc -df 執行流程（Data Flow 資料流驗證）
│
├─ 1. 【讀取 proposal 前置產出】
│   ├─ 讀取 -c 產出的「UI ↔ API 欄位對應表」
│   ├─ 讀取 -s 產出的「情境流程圖」和「驗證 cases」
│   └─ 讀取 proposal 的修正提案程式碼
│
├─ 2. 【追蹤每個欄位的資料流鏈路】
│   │
│   ├─ 2.1 【Request 方向】前端 → 後端
│   │   ├─ 前端送出的欄位（從 -c 對應表取得）
│   │   ├─ → DTO 接收（create/update DTO 的欄位定義）
│   │   ├─ → Service 處理（DTO 欄位如何被使用）
│   │   └─ → DB 影響（哪些 column 被寫入/更新）
│   │
│   └─ 2.2 【Response 方向】後端 → 前端
│       ├─ DB 欄位（Entity 定義）
│       ├─ → Service 查詢（⚠️ 必須實際讀取 Service 檔案）
│       │   ├─ 讀取 findOne/findAll 方法的 select 欄位清單
│       │   ├─ 讀取 relations 設定
│       │   └─ 逐一比對：response 需要的欄位是否都在 select/relations 中
│       │       ├─ 有 → ✅
│       │       └─ 沒有 → ❌ 標記「Service select 缺漏」
│       ├─ → Response DTO（哪些欄位被回傳）
│       └─ → 前端接收（UI 元件使用哪些欄位）
│
├─ 3. 【逐情境驗證資料流】（搭配 -s 的情境）
│   │
│   ├─ 對每個 -s 產出的情境：
│   │   ├─ 有值情境 → 追蹤欄位值從 DB → Service → DTO → 前端是否正確傳遞
│   │   ├─ 沒值情境 → 追蹤 null 值是否在每一層都正確處理
│   │   │   ├─ DB 是 NULL → Service 是否處理？
│   │   │   ├─ Service 回傳 null → DTO 是否允許 null？
│   │   │   └─ DTO 回傳 null → 前端是否正確顯示？
│   │   └─ 邊界情境 → 追蹤錯誤是否在正確的層被攔截
│   │       ├─ FK 不存在 → Service 是否回 4XX？
│   │       └─ 必填欄位缺失 → DTO 驗證是否攔截？
│   │
│   └─ 產出：每個情境的資料流驗證結果
│
├─ 4. 【產出資料流鏈路驗證表】
│   ├─ 每個欄位的完整鏈路
│   ├─ 每個情境的驗證結果
│   └─ 斷裂點標記（哪一層出問題）
│
└─ 5. 【寫入 proposal + 輸出結果】
    ├─ 在 proposal 新增「## 資料流驗證」區塊
    │   ├─ Request 方向鏈路表
    │   ├─ Response 方向鏈路表
    │   └─ 逐情境驗證結果
    ├─ 標註「🔄 Data Flow 資料流驗證」
    └─ 結尾提示：「確認提案無誤後，請執行 /implement」
```

#### 輸出格式

```markdown
📋 提案文件檢核結果

🔄 Data Flow 資料流驗證

### 資料流鏈路驗證表

#### Request 方向（前端 → DB）

| 前端欄位 | DTO 接收 | Service 處理 | DB 寫入 | 狀態 |
|---------|----------|-------------|---------|------|
| contractId | create.dto.ts ✅ | findContract() ✅ | bid.contractId ✅ | ✅ |
| amount | create.dto.ts ✅ | 直接寫入 ✅ | bid.amount ✅ | ✅ |
| storeId | create.dto.ts ✅ | ❌ 沒有檢查 store 存在 | bid.storeId | ❌ 斷裂 |

#### Response 方向（DB → 前端）

| DB 欄位 | Service 查詢 | Response DTO | 前端顯示 | 狀態 |
|---------|-------------|-------------|---------|------|
| bid.amount | select ✅ | amount ✅ | 列表 column ✅ | ✅ |
| store.name | LEFT JOIN ✅ | storeName ✅ | 列表 column ✅ | ✅ |
| agent.name | ❌ 沒有 JOIN | ❌ 沒有欄位 | 列表 column | ❌ 斷裂 |

### 逐情境驗證結果

| # | 情境 | Request 流 | Response 流 | 狀態 |
|---|------|-----------|-------------|------|
| 1 | 有 storeId 的出價 | ✅ 正常寫入 | ✅ storeName 有值 | ✅ |
| 2 | 沒 storeId 的出價 | ✅ storeId=null | ✅ storeName=null | ✅ |
| 3 | store 已刪除 | ✅ storeId 寫入 | ⚠️ LEFT JOIN 回 null | ⚠️ |
| 4 | contractId 不存在 | ❌ 沒有 4XX 攔截 | - | ❌ |

---

### ❌ 發現的問題（2 項）

1. **storeId 資料流斷裂（Request 方向）**
   - 斷裂點：Service 層
   - 問題：前端送 storeId，DTO 接收了，但 Service 沒有檢查 store 是否存在
   - 建議：Service 加入 findStore() 檢查，撈不到回 4XX

2. **agentName 資料流斷裂（Response 方向）**
   - 斷裂點：Service 查詢 + Response DTO
   - 問題：前端列表要顯示經紀人，但 Service 沒有 JOIN agent，DTO 也沒有 agentName
   - 建議：Service 加入 agent 關聯查詢，Response DTO 新增 agentName

---
⏸️ 檢核完成。確認提案無誤後，請執行 /implement 開始實作。
```

#### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `reviewDoc.md` 定義檔 | 新增 `df` 參數判斷邏輯和任務流程 | ⬜ 待實作 |
| `reviewDoc_flowchart.md` | 新增 `[df 模式專屬流程]` 分支 | ⬜ 待實作 |
| 本設計稿 | 記錄設計討論與決議 | ✅ 已完成 |

##### reviewDoc.md 定義檔更新內容

在 `Situation 模式（$1 = s）` 區塊後面，新增：

```markdown
### Data Flow 模式（$1 = df）

> 🔄 **補充檢核模式**：預期已跑過 `/reviewDoc`、`-c`、`-s`，驗證完整資料流鏈路

**執行流程**：

1. **讀取 proposal 前置產出**
   - 讀取 -c 產出的「UI ↔ API 欄位對應表」
   - 讀取 -s 產出的「情境流程圖」和「驗證 cases」
   - 讀取 proposal 的修正提案程式碼
2. **追蹤每個欄位的資料流鏈路**
   - Request 方向：前端欄位 → DTO 接收 → Service 處理 → DB 寫入
   - Response 方向：DB 欄位 → Service 查詢 → Response DTO → 前端顯示
3. **逐情境驗證資料流**（搭配 -s 的情境）
   - 有值情境：追蹤欄位值是否正確傳遞
   - 沒值情境：追蹤 null 值是否在每一層正確處理
   - 邊界情境：追蹤錯誤是否在正確的層被攔截（FK 4XX、DTO 驗證）
4. **產出資料流鏈路驗證表**
   - Request/Response 雙向鏈路表
   - 逐情境驗證結果
   - 斷裂點標記
5. **寫入 proposal + 輸出結果**
   - 在 proposal 新增「## 資料流驗證」區塊
   - 標註「🔄 Data Flow 資料流驗證」
   - 結尾提示：「確認提案無誤後，請執行 /implement」
```

##### reviewDoc_flowchart.md 更新內容

在 `[s 模式專屬流程]` 區塊後面新增：

```markdown
├─ [df 模式專屬流程] 🆕
│   │
│   ├─ 1. 【讀取 proposal 前置產出】
│   │   ├─ -c 產出的 UI ↔ API 欄位對應表
│   │   ├─ -s 產出的情境流程圖 + 驗證 cases
│   │   └─ proposal 修正提案程式碼
│   │
│   ├─ 2. 【追蹤資料流鏈路】
│   │   ├─ Request：前端 → DTO → Service → DB
│   │   └─ Response：DB → Service → DTO → 前端
│   │
│   ├─ 3. 【逐情境驗證】
│   │   ├─ 有值情境 → 值是否正確傳遞
│   │   ├─ 沒值情境 → null 是否正確處理
│   │   └─ 邊界情境 → 錯誤是否正確攔截
│   │
│   ├─ 4. 【產出鏈路驗證表】
│   │   ├─ Request/Response 雙向鏈路
│   │   └─ 斷裂點標記
│   │
│   └─ 5. 【寫入 proposal + 輸出】
│       ├─ proposal 新增「## 資料流驗證」
│       ├─ 標註「🔄 Data Flow 資料流驗證」
│       └─ 結尾提示：「請執行 /implement」
```

#### 與 /check-result 的分工

```
/reviewDoc 產出 → proposal 中的結構化資料 → /check-result 消費
│
├─ -c 產出：UI ↔ API 欄位對應表
│   └─ /check-result 用來知道「要驗證哪些欄位」
│
├─ -s 產出：驗證 cases（有值/沒值/邊界）
│   └─ /check-result 用來知道「要驗證哪些情境 + DB 查詢條件」
│
└─ -df 產出：資料流鏈路驗證表
    └─ /check-result 用來知道「每個欄位的預期值從哪來」
```

#### 實作狀態

- [x] 需求討論（2026-02-07）
- [x] 設計確認（2026-02-07）
- [x] 更新設計稿（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

### `-data`（DB Data）詳細設計

#### 定位：補充檢核（依賴 -s + -df 產出）

`/reviewDoc -data {env}` 預期在 `-df` 完成後執行，連上 dev/staging DB 撈測試資料，並回頭驗證 `-s`/`-df` 的分析是否與實際 DB 一致。

#### 設計原則

| 項目 | 說明 |
|------|------|
| **定位** | 補充檢核，不取代 `/reviewDoc` |
| **前置依賴** | 從 proposal 讀取 `-s` 的驗證 cases（DB 查詢條件）+ `-df` 的資料流鏈路 |
| **只專注** | 撈 DB 測試資料 + 回頭驗證 `-s`/`-df` 分析 |
| **環境參數** | 必須指定 `dev` 或 `staging` |
| **Token** | 不處理（`/debugP` 時已取得） |

#### 使用方式

```bash
/reviewDoc -data dev
/reviewDoc -data staging
```

#### 執行流程圖

```
/reviewDoc -data {env} 執行流程（DB Data 測試資料準備）
│
├─ 1. 【讀取 proposal 前置產出】
│   ├─ 讀取 -s 產出的「驗證 Cases」表（DB 查詢條件 + 預期 response）
│   ├─ 讀取 -df 產出的「資料流鏈路驗證表」
│   └─ 讀取 proposal 的修正提案內容
│
├─ 2. 【連接目標環境 DB】
│   ├─ 使用 db-tunnel.sh 連接（與 /debugP、/check-result 相同機制）
│   │   ├─ ./scripts/db-tunnel.sh status → 檢查 tunnel 狀態
│   │   └─ ./scripts/db-tunnel.sh {env} → 連接目標環境
│   └─ 使用 psql 執行查詢
│
├─ 3. 【Phase 1：撈 DB 測試資料】
│   ├─ 逐一執行 -s 驗證 cases 的 DB 查詢條件
│   │   ├─ 有值 case → 撈到 ID + 欄位值 → 記錄
│   │   ├─ 沒值 case → 撈到 ID + 確認欄位為 null → 記錄
│   │   └─ 邊界 case → 撈到符合條件的資料 → 記錄
│   │
│   └─ 處理找不到資料的情況
│       ├─ 某 case 找不到符合的資料 → 標記「⚠️ 無測試資料」
│       └─ 列出缺少的測試資料條件，供用戶參考
│
├─ 4. 【Phase 2：回頭驗證 -s 情境分析】
│   ├─ 用實際 DB 資料比對 -s 的情境分析
│   │   ├─ -s 說「有值情境」→ DB 撈到的欄位是否真的有值？
│   │   ├─ -s 說「沒值情境」→ DB 撈到的欄位是否真的是 null？
│   │   └─ -s 的 SQL 查詢條件是否能正確撈到對應情境的資料？
│   │
│   └─ 發現不一致 → 記錄差異
│       ├─ -s 的查詢條件有誤 → 記錄正確的查詢條件
│       └─ -s 的情境假設有誤 → 記錄實際情況
│
├─ 5. 【Phase 2：回頭驗證 -df 資料流鏈路】
│   ├─ 用實際 DB 資料比對 -df 的資料流鏈路
│   │   ├─ -df 的 Response 方向鏈路是否與實際 DB 結構一致？
│   │   ├─ -df 標記的斷裂點是否真的存在？
│   │   └─ Service select 是否真的有撈到需要的欄位？（用 DB 資料反推）
│   │
│   └─ 發現不一致 → 記錄差異
│
├─ 6. 【更新 proposal】（若有不一致）
│   ├─ 更新 -s 的驗證 cases（修正查詢條件或情境假設）
│   ├─ 更新 -df 的資料流鏈路（修正斷裂點標記）
│   └─ 標記「🔄 已根據實際 DB 資料修正 -s/-df 分析」
│
└─ 7. 【寫入 proposal + 輸出結果】
    ├─ 在 proposal 新增「## DB 測試資料」區塊
    │   ├─ 每個 case 的實際 DB 資料（ID、欄位值）
    │   └─ 缺少測試資料的 case 標記
    ├─ 標註「🗄️ DB Data 測試資料準備」
    ├─ 若有修正，標註「🔄 已修正 -s/-df 分析」
    └─ 結尾提示：「確認提案無誤後，請執行 /implement」
```

#### 輸出格式

```markdown
📋 提案文件檢核結果

🗄️ DB Data 測試資料準備（{env} 環境）

### DB 測試資料

| # | 情境（來自 -s） | DB 查詢條件 | 撈到的 ID | 關鍵欄位值 | 狀態 |
|---|----------------|------------|-----------|-----------|------|
| 1 | 有 storeId | WHERE "storeId" IS NOT NULL LIMIT 1 | bid.id = 42 | storeId=5, store.name="信義店" | ✅ |
| 2 | 沒 storeId | WHERE "storeId" IS NULL LIMIT 1 | bid.id = 87 | storeId=null | ✅ |
| 3 | store 已刪除 | WHERE "storeId" NOT IN (...) | ⚠️ 無測試資料 | - | ⚠️ |
| 4 | contractId 不存在 | N/A（邊界 case，不需撈 DB） | - | 用假 ID 測試 | ✅ |

### -s/-df 驗證結果

| 項目 | 原始分析 | 實際 DB 情況 | 狀態 |
|------|---------|-------------|------|
| -s case 1 查詢條件 | WHERE "storeId" IS NOT NULL | 正確，撈到 3 筆 | ✅ |
| -s case 3 情境假設 | store 被 soft delete | DB 中沒有此情境的資料 | ⚠️ 無法驗證 |
| -df Response 鏈路 | store.name → storeName | DB 確認 store.name 有值 | ✅ |

---

### ⚠️ 缺少測試資料（1 項）

1. **store 已刪除的情境**
   - 查詢條件：`WHERE "storeId" NOT IN (SELECT id FROM store WHERE "deletedAt" IS NULL)`
   - DB 中找不到符合的資料
   - 建議：手動建立測試資料，或在 /check-result 時跳過此 case

---
⏸️ 檢核完成。確認提案無誤後，請執行 /implement 開始實作。
```

#### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `reviewDoc.md` 定義檔 | 新增 `data` 參數判斷邏輯和任務流程 | ⬜ 待實作 |
| `reviewDoc_flowchart.md` | 新增 `[data 模式專屬流程]` 分支 | ⬜ 待實作 |
| 本設計稿 | 記錄設計討論與決議 | ✅ 已完成 |

##### reviewDoc.md 定義檔更新內容

在 `Data Flow 模式（$1 = df）` 區塊後面，新增：

```markdown
### Data 模式（$1 = data）

> 🗄️ **補充檢核模式**：預期已跑過 `/reviewDoc`、`-c`、`-s`、`-df`，連 DB 撈測試資料並驗證分析
>
> ⛔ **禁止降級**：用戶指定 `-data` 就必須執行 `-data` 模式的完整流程，禁止自行切換到一般模式。

**執行流程**：

1. **讀取 proposal 前置產出**
   - 讀取 -s 產出的「驗證 Cases」表（DB 查詢條件）
   - 讀取 -df 產出的「資料流鏈路驗證表」
   - 讀取 proposal 的修正提案內容
2. **連接目標環境 DB**
   - 使用 `db-tunnel.sh` 連接（與 /debugP、/check-result 相同機制）
   - 使用 psql 執行查詢
3. **撈 DB 測試資料**
   - 逐一執行 -s 驗證 cases 的 DB 查詢條件
   - 記錄每個 case 的 ID + 欄位值
   - 找不到資料的 case 標記「⚠️ 無測試資料」
4. **回頭驗證 -s/-df 分析**
   - 用實際 DB 資料比對 -s 的情境分析和 -df 的資料流鏈路
   - 不一致時更新 proposal 中 -s/-df 的相關內容
5. **寫入 proposal + 輸出結果**
   - 在 proposal 新增「## DB 測試資料」區塊
   - 標註「🗄️ DB Data 測試資料準備」
   - 結尾提示：「確認提案無誤後，請執行 /implement」
```

同時更新定義檔開頭的參數說明，新增：

```markdown
  - `data` - DB Data 測試資料準備模式（撈 DB 資料 + 驗證 -s/-df 分析）🆕
```

##### reviewDoc_flowchart.md 更新內容

在參數識別區塊新增 `data` 分支：

```markdown
│   └─ data 參數 → DB Data 測試資料準備模式 🆕
```

在 `[df 模式專屬流程]` 區塊後面新增：

```markdown
├─ [data 模式專屬流程] 🆕
│   │
│   ├─ 1. 【讀取 proposal 前置產出】
│   │   ├─ -s 產出的驗證 Cases 表
│   │   ├─ -df 產出的資料流鏈路驗證表
│   │   └─ proposal 修正提案內容
│   │
│   ├─ 2. 【連接目標環境 DB】
│   │   ├─ db-tunnel.sh 連接
│   │   └─ psql 執行查詢
│   │
│   ├─ 3. 【Phase 1：撈 DB 測試資料】
│   │   ├─ 逐一執行 -s cases 的 DB 查詢條件
│   │   ├─ 記錄 ID + 欄位值
│   │   └─ 找不到 → 標記「⚠️ 無測試資料」
│   │
│   ├─ 4. 【Phase 2：回頭驗證 -s/-df】
│   │   ├─ 比對 -s 情境分析 vs 實際 DB
│   │   ├─ 比對 -df 資料流鏈路 vs 實際 DB
│   │   └─ 不一致 → 更新 proposal
│   │
│   └─ 5. 【寫入 proposal + 輸出】
│       ├─ proposal 新增「## DB 測試資料」
│       ├─ 標註「🗄️ DB Data 測試資料準備」
│       └─ 結尾提示：「請執行 /implement」
```

##### reviewDoc_flowchart.md 下方說明區塊更新

新增 Data 模式說明：

```markdown
## Data 模式（/reviewDoc data）🆕

> 🗄️ **補充檢核模式**：預期已跑過 `/reviewDoc`、`-c`、`-s`、`-df`，連 DB 撈測試資料

**設計原則**：
- **前置依賴**：從 proposal 讀取 `-s` 驗證 cases + `-df` 資料流鏈路
- **環境參數**：必須指定 dev 或 staging
- **Token**：不處理（/debugP 時已取得）
- **三階段**：撈 DB → 驗證 -s/-df → 寫入 proposal
- **產出寫入 proposal**：供 `/check-result` 直接使用

**驗證方向**：
- Phase 1：撈 DB 測試資料（根據 -s cases 的查詢條件）
- Phase 2：回頭驗證 -s 情境分析 + -df 資料流鏈路
- Phase 3：寫入 proposal（含修正）
```

#### 實作狀態

- [x] 需求討論（2026-02-07）
- [x] 設計確認（2026-02-07）
- [x] 更新設計稿（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

## 設計修正：補充模式禁止降級為一般模式（2026-02-07）

### 問題發現

**觸發情境**：執行 `/reviewDoc -c` 檢核一個 PDF 生成修正的 proposal 時，AI 讀完 proposal 後自行判斷「這不是典型的 CRUD API，不適合 UI Component 檢核」，然後切換到一般模式執行。

**AI 行為紀錄**：
```
⏺ Skill(/reviewDoc)        ← 載入了 skill
⏺ 我來執行 /reviewDoc -c    ← 一開始知道是 -c
⏺ Read proposal             ← 讀了 proposal
⏺ 「讓我先判斷是否適用 UI Component 檢核模式」  ← 開始猶豫
⏺ 「我來執行一般模式的 /reviewDoc 檢核」        ← 跑去一般模式了
```

**用戶 feedback**：
> 等等，我剛剛不是說要用 /reviewDoc -c 嗎？你幹嘛用一般模式啊？

### 根因分析

找到 3 個設計缺口：

#### 缺口 1：流程圖的參數識別步驟沒有「強制執行」語言

流程圖 `reviewDoc_flowchart.md:6-13`：
```
├─ 1. 【參數識別】
│   ├─ 無參數 → 一般檢核模式
│   ├─ c 參數 → UI Component 檢核模式 🆕
```

只是「識別」，沒有說「識別到 c 就**必須**走 c 模式專屬流程，**禁止**切換到其他模式」。AI 有空間自行判斷「是否適用」。

#### 缺口 2：定義檔的 `-c` 模式沒有「禁止降級」警告

`-c` 模式開頭只有：
```
> 🖥️ **補充檢核模式**：預期已跑過 `/reviewDoc`，只檢核 UI 欄位與 API response 對應
```

缺少關鍵的一句：**「禁止因為 proposal 內容不像典型 CRUD 就降級為一般模式」**。AI 看到 PDF 生成的 proposal，覺得「不是典型的 CRUD API」，就自作主張切換了。

#### 缺口 3：一般模式的內容量遠大於 `-c` 模式，注意力被吸走

| 模式 | 行數 | 步驟數 | 輸出格式範例 |
|------|------|--------|-------------|
| 一般模式 | L24-112（88 行） | 15 個步驟 | 3 個範例 |
| `-c` 模式 | L209-235（26 行） | 5 個步驟 | 1 個範例 |

一般模式的內容量是 `-c` 的 3 倍以上，加上 `@` 引用的 `review-proposal-rules.md` 和 `adminApi-architecture.md` 都是一般模式用的，AI 的注意力很容易被拉向一般模式。

### 設計修正

需要在兩個地方加入防護：

#### 修正 1：流程圖 — 參數識別步驟加入「強制」語言

```
├─ 1. 【參數識別】（⛔ 識別到參數後，必須走對應的專屬流程，禁止降級為一般模式）
│   ├─ 無參數 → 一般檢核模式
│   ├─ again 參數 → Again 模式
│   ├─ f 參數 → 檔案上傳補充檢核模式
│   ├─ p 參數 → 權限補充檢核模式
│   ├─ c 參數 → UI Component 檢核模式 🆕
│   ├─ s 參數 → Situation 情境分析模式 🆕
│   └─ df 參數 → Data Flow 資料流驗證模式 🆕
```

#### 修正 2：定義檔 — 所有補充模式（c/s/df）開頭加入「禁止降級」警告

在 `-c`、`-s`、`-df` 三個模式的開頭，加入與 `/check-result` 的「禁止合併 Task」相同風格的警告：

```markdown
### Component 模式（$1 = c）

> 🖥️ **補充檢核模式**：預期已跑過 `/reviewDoc`，只檢核 UI 欄位與 API response 對應
>
> ⛔ **禁止降級**：用戶指定 `-c` 就必須執行 `-c` 模式的完整流程，禁止因為 proposal 內容（如非 CRUD API、PDF 生成等）而自行切換到一般模式。所有類型的 proposal 都適用 `-c` 檢核。
>
> **2026-02-07 教訓**：AI 看到 PDF 生成的 proposal，自行判斷「不適合 UI Component 檢核」，切換到一般模式，被用戶糾正。
```

`-s` 和 `-df` 也加入相同的禁止降級警告（不含教訓，因為還沒發生過）。

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/reviewDoc` 設計稿 | 記錄問題和修正方案 | ✅ 已完成 |
| `/reviewDoc` 流程圖 | 參數識別步驟加入「禁止降級」 | ✅ 已完成 |
| `/reviewDoc` 定義檔 | c/s/df 模式加入「禁止降級」警告 | ✅ 已完成 |

### 設計經驗

**原則**：當 skill 有多個模式時，用戶指定的模式就是最終決定，AI 不得自行判斷「是否適用」而切換模式。這與 `/check-result` 的「禁止合併 Task」是同一類問題 — AI 自作主張簡化流程。

**通用防護模式**：
1. 流程圖的分支點加入「⛔ 禁止」語言
2. 定義檔的模式開頭加入「禁止降級」警告 + 歷史教訓
3. 內容量不平衡時，考慮在補充模式加入更強的視覺標記

---

## 設計修正：Service select 責任歸屬從 -c 移到 -df（2026-02-07）

### 問題發現

**觸發情境**：AI 執行 `/reviewDoc -c` 時，在 UI ↔ API 欄位對應表中標註「✅ select 有」，但實際上沒有讀取 Service 檔案，是基於假設而非實際驗證。

**追查結果**：`-c` 的定位是 UI 元件欄位與 API response 的對應（元件層面），Service select 是「資料怎麼從 DB 撈出來」的問題，屬於資料流鏈路的範疇。而 `-df` 的步驟 2 已經定義了 `Response 方向：DB 欄位 → Service 查詢 → Response DTO → 前端顯示`，Service select 檢查是這條鏈路中的一環。

### 各模式正確的責任歸屬

| 檢查項目 | 正確歸屬 | 原因 |
|---------|---------|------|
| UI 欄位 ↔ response DTO 對應 | `-c` | 元件層面 |
| 500 防護（FK/NOT NULL/Unique 等） | `-c` | API 設計品質 |
| Service select/relations 完整性 | `-df` | 資料流鏈路中的一環 |
| 情境流程圖 + 聯集比對 | `-s` | 情境分析 |

### 修改內容

#### 1. `-c` 設計稿：移除 Service select 相關描述

- 流程圖步驟 3：「讀取後端 DTO + Service」→「讀取後端 DTO」（移除 Service select/relations）
- 流程圖步驟 4：移除「檢查 Service select 完整性」
- 檢核項目：從 6 項改為 5 項，移除原第 2 項「Select 完整性」

#### 2. `-df` 設計稿：補充明確的 Service select 檢查

流程圖步驟 2.2 Response 方向，從概念性的「Service 組裝」改為明確的檢查步驟：

```
└─ 2.2 【Response 方向】後端 → 前端
    ├─ DB 欄位（Entity 定義）
    ├─ → Service 查詢（⚠️ 必須實際讀取 Service 檔案）
    │   ├─ 讀取 findOne/findAll 方法的 select 欄位清單
    │   ├─ 讀取 relations 設定
    │   └─ 逐一比對：response 需要的欄位是否都在 select/relations 中
    │       ├─ 有 → ✅
    │       └─ 沒有 → ❌ 標記「Service select 缺漏」
    ├─ → Response DTO（哪些欄位被回傳）
    └─ → 前端接收（UI 元件使用哪些欄位）
```

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/reviewDoc` 設計稿 | -c 移除 select、-df 補充 select 檢查 | ✅ 已完成 |
| `/reviewDoc` 定義檔 | 待 /updateDesign 同步 | ✅ 已同步 |
| `/reviewDoc` 流程圖 | 待 /updateDesign 同步 | ✅ 已同步 |

---

## 設計修正：`-data` 模式首次實測問題修正（2026-02-07）

### 問題背景

首次在 `estateSalesDetail_api` 的 proposal 上執行 `/reviewDoc -data dev`，過程中遇到 3 個設計缺口，雖然最終手動繞過完成了（10 個 case 全部有測試資料），但需要修正設計避免下次重複踩坑。

### 問題 1：psql 連線被 Hook 權限系統擋住（最嚴重）

**觸發情境**：`-data` 模式需要用 psql 連 DB 撈測試資料，但執行 `PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5433 ...` 時，反覆被 Hook 權限系統拒絕（Permission denied）。

**AI 行為紀錄**：
```
⏺ PGPASSWORD=<DB_PASSWORD> psql ... -c "SELECT ..."    ← Permission denied
⏺ 嘗試寫 SQL 到 /tmp 再用 psql -f                  ← Permission denied
⏺ 嘗試用 Task tool 開 subagent                      ← 用戶糾正
⏺ export PGPASSWORD=<DB_PASSWORD> && psql ...            ← ✅ 成功
```

**用戶 feedback**：
> 你在幹嘛啊，你不是就是一次 db 連線進去，然後就直接 sql query 一直查嗎
> 你到底在幹什麼鬼啊，你去看他裡面不是有說文件是什麼，有篇文件說怎麼連進 dev db 不是嗎

**根因分析**：

| 項目 | 說明 |
|------|------|
| `/check-result` frontmatter | 有 `allowed-tools: Bash(PGPASSWORD=*)` |
| `/reviewDoc` frontmatter | **沒有** `allowed-tools` |
| settings.json 權限 | 有 `Bash(psql:*)` 和 `Bash(PGPASSWORD=:*)` |
| 實際行為 | `PGPASSWORD=<DB_PASSWORD> psql ...` 格式被擋，`export PGPASSWORD=<DB_PASSWORD> && psql ...` 格式通過 |

**結論**：`PGPASSWORD=xxx psql` 是 inline 環境變數格式，Hook 系統把整個字串當作命令前綴匹配，匹配不到 `Bash(psql:*)` 模式。而 `export PGPASSWORD=xxx && psql` 把 psql 作為獨立命令，能匹配 `Bash(psql:*)` 模式。

**修正方案**：

在 `-data` 模式的定義檔中，明確指定 psql 連線格式，引用 `db-connection-rules.md` module，並強制使用 `export && psql` 格式：

```markdown
2. **連接目標環境 DB**
   - 參考 `db-connection-rules.md` 的連線規則
   - ⚠️ **psql 連線格式**：必須使用 `export PGPASSWORD=<DB_PASSWORD> && psql ...` 格式
   - ❌ 禁止使用 `PGPASSWORD=<DB_PASSWORD> psql ...`（inline 格式會被 Hook 權限擋住）
   - Dev: `export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev`
   - Staging: `export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle`
```

同時在定義檔加入 `db-connection-rules.md` 的 module 引用（僅 `-data` 模式步驟中讀取，不用 `@` 預載入）。

### 問題 2：Table 關聯路徑假設錯誤

**觸發情境**：撈 `landInfo` 資料時，AI 直接假設 `LEFT JOIN "landInfo" li ON r.id = li."realEstateId"`，但 `landInfo` 沒有 `realEstateId` 欄位。正確的 join 路徑是 `realEstate → realEstateIdentifier（via realEstateId）→ landInfo（via realEstateIdentifierId）`。

**根因分析**：

`-s` 產出的驗證 cases 只有概念性的查詢條件（如 `WHERE "landZoneLevel1" IS NOT NULL`），沒有包含具體的 table 名稱和 join 路徑。`-data` 執行時 AI 自行推導 SQL，但推導錯誤。

**修正方案**：

在 `-data` 流程的 Phase 1 之前，新增「Step 2.5：確認 DB Schema」步驟：

```
├─ 2.5 【確認 DB Schema】（Phase 1 前置）
│   ├─ 讀取 proposal 涉及的 Entity 檔案
│   │   └─ 確認 Entity 之間的關聯路徑（@ManyToOne、@OneToMany）
│   ├─ 若 -s cases 涉及跨 table 查詢
│   │   ├─ 用 psql 查 information_schema.columns 確認欄位存在
│   │   └─ 確認 join 路徑（哪個 table 有哪個 FK）
│   └─ 產出：每個 case 的完整 SQL（含正確的 JOIN 路徑）
```

**設計理由**：
- Entity 檔案定義了 TypeORM 的關聯，但 DB 實際的 FK 欄位名稱可能不同
- 先確認 schema 再撈資料，避免 SQL 錯誤浪費來回

### 問題 3：-s 產出的查詢條件不夠具體

**觸發情境**：`-s` 產出的驗證 cases 格式如下：

```
| # | 情境 | DB 查詢條件 | 預期 response |
| 10 | 有 mrt | WHERE nearbyMRTId IS NOT NULL | mrt 欄位有值 |
```

但 `-data` 實際執行時需要知道：
- 查哪個 table？（`realEstate`）
- `nearbyMRTId` 是 FK 指向哪個 table？（`pointOfInterest`）
- 要 JOIN 哪些 table 才能拿到完整資料？

**根因分析**：

`-s` 的設計定位是「情境分析」，產出的 cases 是概念層面的，不是可直接執行的 SQL。但 `-data` 需要可執行的 SQL。這個轉換工作目前完全靠 AI 在 `-data` 執行時即時推導，容易出錯。

**修正方案**：

不修改 `-s` 的產出格式（保持概念層面），而是在 `-data` 的流程中明確加入「SQL 推導」步驟，搭配問題 2 的 schema 確認：

```
Phase 1 的執行順序調整為：
│
├─ 2.5 【確認 DB Schema + 推導完整 SQL】
│   ├─ 讀取 Entity 檔案確認關聯路徑
│   ├─ 將 -s 的概念性查詢條件轉換為可執行的 SQL
│   │   ├─ 補充 table 名稱
│   │   ├─ 補充 JOIN 路徑
│   │   └─ 補充 SELECT 欄位（根據 -df 的資料流鏈路）
│   └─ 若不確定 join 路徑 → 用 information_schema 查詢確認
│
├─ 3. 【Phase 1：撈 DB 測試資料】
│   └─ 使用 2.5 產出的完整 SQL 逐一執行
```

### 修正後的完整流程圖

```
/reviewDoc -data {env} 執行流程（v2 - 2026-02-07 修正版）
│
├─ 1. 【讀取 proposal 前置產出】
│   ├─ 讀取 -s 產出的「驗證 Cases」表（概念性查詢條件 + 預期 response）
│   ├─ 讀取 -df 產出的「資料流鏈路驗證表」
│   └─ 讀取 proposal 的修正提案內容
│
├─ 2. 【連接目標環境 DB】
│   ├─ ./scripts/db-tunnel.sh status → 檢查 tunnel 狀態
│   ├─ ./scripts/db-tunnel.sh {env} → 連接目標環境（若需要）
│   └─ ⚠️ psql 連線格式：export PGPASSWORD=<DB_PASSWORD> && psql ...
│       ├─ ✅ export PGPASSWORD=<DB_PASSWORD> && psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev
│       └─ ❌ PGPASSWORD=<DB_PASSWORD> psql ...（會被 Hook 擋住）
│
├─ 2.5 【確認 DB Schema + 推導完整 SQL】（🆕 新增）
│   ├─ 讀取 proposal 涉及的 Entity 檔案
│   │   └─ 確認 Entity 之間的關聯路徑（@ManyToOne、@OneToMany、FK 欄位名稱）
│   ├─ 將 -s 的概念性查詢條件轉換為可執行的完整 SQL
│   │   ├─ 補充正確的 table 名稱（參考 db-connection-rules.md 的 Entity/Table 映射）
│   │   ├─ 補充正確的 JOIN 路徑（根據 Entity 關聯）
│   │   └─ 補充 SELECT 欄位（根據 -df 的資料流鏈路需要驗證的欄位）
│   └─ 若不確定 join 路徑
│       └─ 用 psql 查 information_schema.columns 確認欄位存在和 FK 關係
│
├─ 3. 【Phase 1：撈 DB 測試資料】
│   ├─ 使用 2.5 產出的完整 SQL 逐一執行
│   │   ├─ 有值 case → 撈到 ID + 欄位值 → 記錄
│   │   ├─ 沒值 case → 撈到 ID + 確認欄位為 null → 記錄
│   │   └─ 邊界 case → 撈到符合條件的資料 → 記錄
│   │
│   ├─ 處理找不到資料的情況
│   │   ├─ 某 case 找不到 → 標記「⚠️ 無測試資料」
│   │   └─ ⚠️ 嘗試用其他條件找替代資料（如：換一筆有該欄位值的記錄）
│   │
│   └─ 🆕 多筆測試資料策略
│       ├─ 優先找 1 筆能覆蓋最多 case 的記錄（減少測試資料數量）
│       └─ 無法用 1 筆覆蓋時，才找額外記錄補充特定 case
│
├─ 4. 【Phase 2：回頭驗證 -s/-df】
│   ├─ 比對 -s 情境分析 vs 實際 DB
│   │   ├─ -s 的查詢條件是否能正確撈到對應情境的資料？
│   │   └─ -s 的情境假設是否與實際 DB 一致？
│   ├─ 比對 -df 資料流鏈路 vs 實際 DB
│   │   └─ -df 標記的斷裂點是否真的存在？
│   └─ 不一致 → 更新 proposal 中 -s/-df 的相關內容
│
└─ 5. 【寫入 proposal + 輸出結果】
    ├─ 在 proposal 新增「## DB 測試資料」區塊
    │   ├─ 每個 case 的實際 DB 資料（ID、欄位值）
    │   └─ 缺少測試資料的 case 標記
    ├─ 標註「🗄️ DB Data 測試資料準備」
    ├─ 若有修正，標註「🔄 已修正 -s/-df 分析」
    └─ 結尾提示：「確認提案無誤後，請執行 /implement」
```

### 定義檔需要的修改

#### 1. `-data` 模式引用 db-connection-rules module

在 `-data` 模式的任務步驟中加入讀取指示（不用 `@` 預載入）：

```markdown
### Data 模式（$1 = data）

> 🗄️ **補充檢核模式**：...

**執行流程**：

1. **讀取 proposal 前置產出**
   - ...
2. **連接目標環境 DB**
   - 讀取 db-connection-rules.md（`/Users/nicholas/Desktop/Projects/.claude/modules/db-connection-rules.md`）
   - ⚠️ **psql 連線格式**：必須使用 `export PGPASSWORD=<DB_PASSWORD> && psql ...` 格式
   - ❌ 禁止使用 `PGPASSWORD=<DB_PASSWORD> psql ...`（inline 格式會被 Hook 權限擋住）
   - 使用 `db-tunnel.sh` 連接
2.5. **確認 DB Schema + 推導完整 SQL**（🆕）
   - 讀取 proposal 涉及的 Entity 檔案，確認關聯路徑
   - 將 -s 的概念性查詢條件轉換為可執行的完整 SQL
   - 若不確定 join 路徑，用 psql 查 information_schema.columns 確認
3. **撈 DB 測試資料**
   - 使用 2.5 產出的完整 SQL 逐一執行
   - ...
```

#### 2. 2026-02-07 教訓區塊

在 `-data` 模式開頭加入教訓：

```markdown
> **2026-02-07 教訓**：
> 1. `PGPASSWORD=<DB_PASSWORD> psql ...` 格式被 Hook 擋住，必須用 `export PGPASSWORD=<DB_PASSWORD> && psql ...`
> 2. 不要假設 table 的 join 路徑，先讀 Entity 確認關聯再寫 SQL
> 3. -s 的查詢條件是概念性的，-data 需要自己推導完整 SQL（含 table 名、JOIN、SELECT）
```

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/reviewDoc` 設計稿 | 記錄 3 個問題和修正方案 | ✅ 已完成 |
| `/reviewDoc` 定義檔 | 加入 psql 格式、schema 確認步驟、教訓 | ✅ 已同步 |
| `/reviewDoc` 流程圖 | 加入 2.5 步驟、psql 格式說明 | ✅ 已同步 |

### 設計經驗

**原則 1：DB 連線格式必須明確寫死**
- 不能只寫「使用 psql 執行查詢」，必須寫出完整的連線指令格式
- Hook 權限系統對命令格式敏感，inline 環境變數 vs export 是不同的匹配模式

**原則 2：跨 table 查詢前必須確認 schema**
- AI 會基於命名慣例假設 FK 欄位（如 `realEstateId`），但實際可能不存在
- Entity 檔案是最可靠的 schema 來源，DB information_schema 是備用驗證

**原則 3：概念性查詢條件 → 可執行 SQL 需要明確的轉換步驟**
- `-s` 產出概念性 cases 是正確的設計（情境分析不該綁定 SQL 細節）
- 但 `-data` 需要一個明確的「SQL 推導」步驟，不能靠 AI 即時推導

---

## 功能擴充：一般模式整合 API Data Flow 參照檢核（2026-02-07）

### 需求背景

`/debugP` 產出的 proposal 新增了「API Data Flow 參照」區塊（放在 proposal 最前面），記錄分析時使用的 data-flow 文件路徑、scan-meta 版本、關鍵結構摘要。

`/reviewDoc` 作為 proposal 的檢核工具，需要能夠：
1. 識別這個區塊
2. 讀取對應的 data-flow 文件
3. 用它作為檢核的基礎知識（比對 proposal 中的欄位分析是否與 data-flow 一致）

### 設計來源

> B 方案設計詳情見 `check_result_field_verification_gaps.md` — 「Proposal 輸出整合 API Data Flow — B 方案設計」
> debugP 端的設計見 `debugP_skill_proposal.md` — 「功能擴充：Proposal 輸出加入 API Data Flow 參照」

### 新增檢核規則

在 `/reviewDoc` 一般模式（無參數）的檢核流程**最前面**新增前置檢查：

```
前置檢查：API Data Flow 參照
│
├─ Proposal 有「## API Data Flow 參照」區塊？
│   │
│   ├─ 【有】→ 讀取對應的 data-flow 文件
│   │   ├─ 提取文件路徑（從區塊的表格中取得）
│   │   ├─ 讀取 data-flow 文件，取得 Entity/DTO/Service/Controller 結構
│   │   └─ 作為後續所有檢核的基礎知識
│   │       ├─ 比對 proposal 的欄位分析是否與 data-flow 一致
│   │       ├─ 比對 DTO 欄位是否涵蓋 Entity 必要欄位
│   │       └─ 比對 Service select/relations 是否正確
│   │
│   └─ 【沒有】→ 判斷 bug 類型
│       ├─ API 相關 bug → ⚠️ 警告：「缺少 API Data Flow 參照，建議先補充」
│       │   └─ 不中斷檢核，但在檢核結果中標註此警告
│       └─ 非 API 相關 bug → 正常，跳過此前置檢查
```

### 檢核結果輸出

當有讀取 data-flow 文件時，在檢核結果中新增一節：

```markdown
### API Data Flow 一致性
- **data-flow 文件**: {路徑}
- **scan-meta**: commit=`{hash}`, date=`{date}`
- **一致性檢查**:
  - ✅/❌ Entity 欄位與 proposal 分析一致
  - ✅/❌ DTO 欄位涵蓋必要 Entity 欄位
  - ✅/❌ Service select/relations 與 proposal 描述一致
  - ✅/❌ Controller 路由與 proposal 描述一致
```

### 與現有檢核的關係

此前置檢查是**額外補充**，不取代現有的檢核規則：
- 現有規則：讀原始碼驗證 proposal 的正確性
- 新增規則：用 data-flow 文件作為**快速對照基礎**，提升檢核效率
- 如果 data-flow 與原始碼有出入（程式碼更新但 data-flow 未同步），以實際原始碼為準

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `review_skill_proposal.md` | 記錄檢核規則設計 | ✅ 已完成 |
| `reviewDoc.md` 定義檔 | 新增前置檢查步驟 | ✅ 已完成 |
| `reviewDoc_flowchart.md` | 新增前置檢查步驟 | ✅ 已完成 |

### 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 記錄到 reviewDoc 設計稿（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

## 功能擴充：移除 -c/-s/-df + 重設計 -data 模式（2026-02-07）

### 需求背景

`-c/-s/-df` 的核心邏輯已遷移至獨立 skill：
- `-c`（UI Component 檢核）→ `review-api-flow` 負責
- `-s`（Situation 情境分析）→ `review-api-flow` 負責
- `-df`（Data Flow 資料流驗證）→ `review-api-flow` + `api-flow-architecture` 負責

遷移策略 Stage 1-4 已完成驗證，現在執行 Stage 5：從 `/reviewDoc` 移除 `-c/-s/-df`。

但 `-data`（DB 測試資料準備）**保留**，因為連 DB 撈資料驗證的功能沒有被其他 skill 接手。
`-data` 需要重設計，改為從 data-flow 文件推導 cases，不再依賴 `-s/-df` 產出。

### 移除範圍

#### 定義檔 `reviewDoc.md`

| 區塊 | 行數範圍 | 動作 |
|------|---------|------|
| 參數宣告 `c`, `s`, `df` | 18-20 | 移除 |
| Component 模式（$1 = c） | 216-245 | 移除 |
| Situation 模式（$1 = s） | 247-274 | 移除 |
| Data Flow 模式（$1 = df） | 276-304 | 移除 |
| `-c/-s/-df` 輸出範例 | 散落在檢核輸出格式區 | 移除 |

#### 流程圖 `reviewDoc_flowchart.md`

| 區塊 | 行數範圍 | 動作 |
|------|---------|------|
| 參數識別中的 `c/s/df` | 11-13 | 移除 |
| c 模式專屬流程 | 58-93 | 移除 |
| s 模式專屬流程 | 95-121 | 移除 |
| df 模式專屬流程 | 123-150 | 移除 |

#### 設計稿 `review_skill_proposal.md`

| 區塊 | 動作 |
|------|------|
| 功能擴充：欄位驗證系列 `-c/-s/-df`（line 2072+） | **保留但標記已遷移** |

> 設計稿的歷史紀錄不刪除，只在區塊開頭加上遷移標記。

### `-data` 模式重設計

#### 現有 vs 新設計

| 項目 | 現有 | 新設計 |
|------|------|--------|
| Cases 來源 | `-s` 產出的驗證 Cases 表 | data-flow 文件推導 |
| 資料流鏈路 | `-df` 產出 | data-flow 文件已有 |
| Entity 關聯 | Step 2.5 讀 Entity 檔案推導 | data-flow 已有，不用重讀 |
| 前置依賴 | 必須先跑 `-c` → `-s` → `-df` | 只需要 data-flow 文件 |
| 無 data-flow 時 | N/A（之前無此概念） | 中斷 → 建立 data-flow → 自動補寫參照區塊 → 繼續 |

#### 新 `-data` 執行流程

```
/reviewDoc -data {env}
│
├─ 1. 【取得 API Data Flow 文件】
│   ├─ 檢查 proposal 是否有「## API Data Flow 參照」區塊
│   │   ├─ 【有】→ 從區塊取得文件路徑，讀取 data-flow 文件
│   │   └─ 【沒有】→ ⚠️ 中斷
│   │       ├─ 提示：請先執行 /api-flow-architecture {apiName}
│   │       ├─ 用戶執行完回來後繼續
│   │       └─ 自動讀取新建的 data-flow 文件
│   │           └─ 自動補寫「## API Data Flow 參照」區塊到 proposal
│   │
│   └─ 提取：Entity 欄位、relations、nullable、DTO 欄位、Service select
│
├─ 2. 【推導驗證 Cases】
│   ├─ 從 data-flow 的 Entity 欄位 + relations 推導有值/沒值情境
│   │   ├─ nullable 欄位 → 有值 case + null case
│   │   ├─ FK 關聯 → 關聯存在 case + 關聯不存在 case
│   │   ├─ softDelete 關聯 → 正常 case + 被刪除 case
│   │   └─ 必填欄位 → 有值 case（不需 null case）
│   ├─ 從 proposal 修改內容聚焦相關欄位（不展開所有欄位）
│   └─ 產出 Cases 表（欄位、情境、預期行為）
│
├─ 3. 【連接 DB + 推導 SQL】
│   ├─ 讀取 db-connection-rules.md
│   ├─ 使用 db-tunnel.sh 連接目標環境
│   ├─ ⚠️ psql 格式：export PGPASSWORD=<DB_PASSWORD> && psql ...
│   └─ 用 data-flow 的 Entity 關聯推導 JOIN 路徑（不用再讀 Entity 檔案）
│
├─ 4. 【撈 DB 測試資料】
│   ├─ 逐 case 執行 SQL
│   ├─ 記錄每個 case 的 ID + 欄位值
│   ├─ 找不到 → 標記「⚠️ 無測試資料」，嘗試替代條件
│   └─ 多筆策略：優先找 1 筆覆蓋最多 case 的記錄
│
└─ 5. 【寫入 proposal + 輸出】
    ├─ proposal 新增「## DB 測試資料」區塊
    ├─ 標註「🗄️ DB Data 測試資料準備」
    └─ 結尾提示：「確認提案無誤後，請執行 /implement」
```

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `review_skill_proposal.md` | 記錄移除計畫 + `-data` 重設計 | ✅ 已完成 |
| `reviewDoc.md` 定義檔 | 移除 `-c/-s/-df` 區塊 + 重寫 `-data` | ✅ 已完成 |
| `reviewDoc_flowchart.md` | 移除 `-c/-s/-df` 流程 + 重寫 `-data` 流程 | ✅ 已完成 |
| `review_skill_proposal.md` 歷史區塊 | `-c/-s/-df` 功能擴充段標記已遷移 | ✅ 已完成 |
| `check_result_field_verification_gaps.md` | Stage 5 狀態更新 | ⬜ 待實作 |

### 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 記錄到 reviewDoc 設計稿（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔 — 移除 `-c/-s/-df` + 重寫 `-data`（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [x] 標記設計稿歷史區塊為已遷移（2026-02-07）
- [x] 更新 `check_result_field_verification_gaps.md` Stage 5 狀態（2026-02-07，已確認為 ✅）
- [ ] 測試驗證

---

## 功能擴充：Data Flow 交叉檢核 — 主動發現額外修復項目（2026-02-07）

### 需求背景

`/debugP` 已在 proposal 輸出「API Data Flow 參照」區塊，`/reviewDoc` Step 1.5 也已能讀取此區塊。但目前 reviewDoc **只讀不用** — 沒有利用 data-flow 知識主動發現額外問題。

**用戶需求**：
> 如果 data flow 文件有已知問題就要在 reviewDoc 時提案修復，如果有那種前端沒照著後端 api 參數打，但是知道是哪個後端參數，後端就要加開 api 參數來支援前端，這樣省得改前端

**核心概念**：reviewDoc 檢核 proposal 時，除了看修復方案是否正確，還要用 data-flow 知識主動發現「順便該修的問題」，直接寫回 proposal 作為新的 CR 項目，讓 `/implement` 一起處理。

### 設計決策

| 問題 | 決定 | 原因 |
|------|------|------|
| 額外發現寫在哪裡 | 寫回 debugP 產出的同一份 proposal | 一起修正，implement 一次處理 |
| 觸發時機 | proposal 有「API Data Flow 參照」區塊時 | 沒有 data-flow 資訊就無法交叉比對 |
| 在 reviewDoc 流程中的位置 | Step 1.5 之後，正式檢核之前（Step 1.7） | 先取得 data-flow 知識，再用於正式檢核 |

### 檢核項目

| 檢核 | 觸發條件 | 建議動作（寫入 proposal 的 CR） |
|------|----------|-------------------------------|
| 參數不一致 | data-flow 顯示前端實際打的參數 ≠ 後端 API DTO 定義 | 後端加開 alias 參數相容前端（Input/Output 都要處理），保留原本參數名，不改前端。同 API module 中所有同類問題統一處理。詳見 `/dpf` 設計稿「欄位名不匹配統一修法規則」 |
| 500 防護缺失 | adminApi 任何 endpoint 有潛在 500 風險的 DB 操作卻沒用 `executeWithDbErrorHandling` | 加上 wrapper，回傳有意義的錯誤訊息而非不明 500 |
| 回傳型別不一致 | adminApi service 未用 `DashboardServiceResponse<T>` | 統一回傳型別 |

#### 500 防護相關知識

reviewDoc 需要知道的共用 helper：

| 項目 | 內容 |
|------|------|
| **Helper 位置** | `src/common/helpers/dbErrorHandling.helper.ts` |
| **共用型別** | `DashboardServiceResponse<T>`（`src/common/types/dashboard-service-response.ts`） |
| **處理的錯誤碼** | 23503 (FK violation)、23502 (NOT NULL)、23505 (UNIQUE) |
| **適用範圍** | adminApi 的 service 層任何有潛在 500 風險的 DB 操作（含 CUD、複雜查詢等） |
| **不適用** | publicApi（使用 throw 風格） |
| **用法** | `return executeWithDbErrorHandling(() => this.xxxService.create(dto))` |

### 執行流程圖

```
reviewDoc Data Flow 交叉檢核（Step 1.7，在 Step 1.5 之後）
│
├─ 1. 【前置條件判斷】
│   ├─ proposal 有「API Data Flow 參照」區塊 → 繼續
│   └─ proposal 沒有此區塊 → 跳過交叉檢核
│
├─ 2. 【讀取 data-flow 文件】
│   ├─ 從參照區塊取得文件路徑
│   └─ 讀取完整 data-flow 文件（Entity、DTO、Service、Controller）
│
├─ 3. 【交叉比對】
│   ├─ 3.1 參數比對：DTO 定義 vs 前端實際使用的參數
│   │   └─ 不一致 → 記錄為「後端加開 alias 參數」CR（Input/Output 都要處理，保留原本參數名）
│   ├─ 3.2 500 防護比對：所有有潛在 500 風險的 DB 操作
│   │   ├─ 是 adminApi → 逐一檢查每個 endpoint 的 DB 操作
│   │   │   └─ 沒用 executeWithDbErrorHandling → 記錄為「加上 500 防護」CR
│   │   └─ 是 publicApi → 跳過（throw 風格不適用）
│   └─ 3.3 回傳型別比對：service 回傳是否為 DashboardServiceResponse<T>
│       └─ 不是 → 記錄為「統一回傳型別」CR
│
├─ 4. 【寫入 proposal】
│   ├─ 有額外 CR → 新增「## Data Flow 交叉檢核發現」section 到 proposal
│   │   └─ 每個 CR 包含：問題描述、建議修改、涉及檔案
│   └─ 無額外 CR → 不修改 proposal
│
└─ 5. 【輸出結果】
    ├─ 有額外 CR → 列出新增的 CR 項目 + 已寫入 proposal
    └─ 無額外 CR → 顯示「✅ Data Flow 交叉檢核通過」
```

### 輸出格式

#### 有額外 CR 時（寫入 proposal 的區塊）

```markdown
## Data Flow 交叉檢核發現

> 來源：reviewDoc 利用 API Data Flow 文件交叉比對後發現的額外問題

### CR-DF-1：後端加開 alias 參數相容前端

**問題**：前端實際使用 `sortBy` 參數，但後端 DTO 定義為 `orderBy`
**data-flow 依據**：{data-flow 文件路徑} Controller 區塊
**修法方向**：後端加開 alias，保留原本參數名，Input/Output 都要處理，不改前端
**建議修改**：
- Request DTO：新增 `sortBy` alias 欄位，保留原本 `orderBy`
- Service：合併處理 `dto.orderBy || dto.sortBy`
- Response：同時回傳 `orderBy` 和 `sortBy`（值相同）
- 同 API module 中所有用到 `orderBy` 的 endpoint 都要加 alias

### CR-DF-2：加上 500 防護

**問題**：`{api}.service.ts` 的 create 方法沒有使用 `executeWithDbErrorHandling`
**建議修改**：
- 引入 `executeWithDbErrorHandling` from `src/common/helpers/dbErrorHandling.helper.ts`
- 用 wrapper 包裝 save 操作
- 確認回傳型別為 `DashboardServiceResponse<T>`
```

#### 檢核結果輸出（對話框）

```markdown
### 🔄 Data Flow 交叉檢核
- **data-flow 文件**: {路徑}
- **發現額外問題**: 2 項
  - CR-DF-1: 後端加開 `sortBy` 參數（已寫入 proposal）
  - CR-DF-2: create 方法加上 500 防護（已寫入 proposal）
```

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `review_skill_proposal.md` | 記錄設計討論與決議 | ✅ 已完成 |
| `reviewDoc.md` 定義檔 | 新增 Step 1.7 交叉檢核邏輯 | ✅ 已完成 |
| `reviewDoc_flowchart.md` | 在 Step 1.5 之後插入 Step 1.7 | ✅ 已完成 |

### 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 記錄到 reviewDoc 設計稿（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

## 功能擴充：Step 1.7 已知問題覆蓋檢核（2026-02-07）

### 需求背景

`/add-pi` skill 會從 data-flow 文件提取所有已知問題（❌ 和 ⚠️），寫入 proposal 的「## 已知潛在問題（Data Flow）」區塊。但如果用戶忘了跑 `/add-pi`，或跑了之後 data-flow 有更新，`/reviewDoc` 應該能偵測到並提醒。

**三層防護設計**：
```
/debugP → /add-pi → /reviewDoc → /implement
（分析 bug）  （納入潛在問題）  （統一檢核）   （一次修完）
```

**本次擴充目標**：`/reviewDoc` Step 1.7 新增第 4 項檢核 —「已知問題覆蓋檢核」，確保 `/add-pi` 的產出完整。

### 設計決策

| 問題 | 決定 | 原因 |
|------|------|------|
| 觸發條件 | Step 1.5 有讀取 data-flow 時才執行 | 沒有 data-flow 就沒有已知問題可比對 |
| 比對範圍 | data-flow「## 問題清單」+「## 資料流斷點彙總」的 ❌ 問題 | 只比對 ❌（需修正），⚠️ 問題不強制要求涵蓋 |
| 未執行 /add-pi | ⚠️ 警告提示，不自動執行 | /add-pi 應由用戶主動執行 |
| 已執行但有遺漏 | ❌ 列出遺漏問題 | 確保不漏改 |
| 不修改 proposal | 只檢核和報告，不寫入 | 覆蓋檢核是 review 職責，修改是 /add-pi 職責 |

### 執行流程圖

```
Step 1.7【Data Flow 交叉檢核】（擴充後完整版）
│
├─ 原有檢核（不變）
│   ├─ 3.1 參數不一致（DTO vs 前端）
│   ├─ 3.2 500 防護缺失（executeWithDbErrorHandling）
│   └─ 3.3 回傳型別不一致（DashboardServiceResponse<T>）
│
└─ 🆕 3.4 已知問題覆蓋檢核
    ├─ 前置條件：Step 1.5 有讀取 data-flow
    │   └─ 沒有 → 跳過此檢核
    │
    ├─ 讀取 data-flow 的 ❌ 問題
    │   ├─ 「## 問題清單」底下的 ❌ 項目
    │   └─ 「## 資料流驗證 → 資料流斷點彙總」底下的 ❌ 項目
    │
    ├─ 檢查 proposal 是否有「## 已知潛在問題（Data Flow）」
    │   │
    │   ├─ 有 → 比對完整性
    │   │   ├─ 所有 ❌ 問題都有涵蓋 → ✅ 覆蓋完整
    │   │   └─ 有遺漏 → ❌ 列出遺漏的問題
    │   │
    │   └─ 沒有
    │       ├─ data-flow 有 ❌ 問題 → ⚠️ 警告：
    │       │   └─ 「data-flow 有 N 個已知問題未納入，建議執行 /add-pi」
    │       └─ data-flow 沒有 ❌ 問題 → ✅ 無需處理
    │
    └─ 輸出到檢核結果
```

### 輸出格式

#### 檢核結果輸出 — 未執行 /add-pi 且有已知問題

```markdown
### ⚠️ 已知問題覆蓋檢核
- **data-flow 文件**: {路徑}
- **data-flow 有 6 個 ❌ 已知問題未納入 proposal**
- 💡 建議：執行 `/add-pi` 將已知問題納入 proposal
```

#### 檢核結果輸出 — 已執行 /add-pi 但有遺漏

```markdown
### ❌ 已知問題覆蓋檢核
- **data-flow 文件**: {路徑}
- **proposal 已有「已知潛在問題」區塊，但有 2 個 ❌ 問題遺漏**：
  - DF-3: Request 欄位名不匹配（landNumber → landNoSearch）
  - DF-7: Response 缺少 layoutRoom 欄位
- 💡 建議：重新執行 `/add-pi` 更新已知問題
```

#### 檢核結果輸出 — 覆蓋完整

```markdown
### ✅ 已知問題覆蓋檢核
- **data-flow 文件**: {路徑}
- data-flow 的 ❌ 已知問題已全部涵蓋於 proposal
```

### 與原有 3 項檢核的關係

| 檢核項 | 來源 | 職責 | 動作 |
|--------|------|------|------|
| 3.1 參數不一致 | reviewDoc 自行比對 | 主動發現新問題 | 寫入 proposal「## Data Flow 交叉檢核發現」 |
| 3.2 500 防護缺失 | reviewDoc 自行比對 | 主動發現新問題 | 寫入 proposal「## Data Flow 交叉檢核發現」 |
| 3.3 回傳型別不一致 | reviewDoc 自行比對 | 主動發現新問題 | 寫入 proposal「## Data Flow 交叉檢核發現」 |
| **3.4 已知問題覆蓋** | **比對 /add-pi 產出** | **確保不漏改** | **只報告，不寫入 proposal** |

> 💡 3.1~3.3 是 reviewDoc 自己發現問題並寫入 proposal；3.4 是檢核 /add-pi 的產出是否完整，只做報告不做修改。

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `review_skill_proposal.md` | 記錄設計討論與決議 | ✅ 本 section |
| `reviewDoc.md` 定義檔 | Step 1.7 新增 3.4 已知問題覆蓋檢核 | ✅ 已完成 |
| `reviewDoc_flowchart.md` | Step 1.7 流程圖擴充 3.4 | ✅ 已完成 |

### 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 記錄到 reviewDoc 設計稿（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

## 設計修正：500 防護與回傳型別檢核不該依賴 data-flow（2026-02-07）

### 問題

Step 1.7 的前置條件是「Step 1.5 有讀取 data-flow 文件時才執行」，導致 **proposal 沒有 data-flow 參照時，500 防護和回傳型別檢核完全不會觸發**。

實測發現：另一個 AI 跑 `/reviewDoc` 時，proposal 沒有「## API Data Flow 參照」→ Step 1.7 整個跳過 → 500 防護問題沒有被發現。

### 原因分析

Step 1.7 綁了 4 種檢核，但它們的依賴不同：

| 檢核項 | 需要 data-flow？ | 原因 |
|--------|-----------------|------|
| 3.1 參數不一致 | ✅ 需要 | 要比對 data-flow 的前端參數 vs DTO |
| 3.2 500 防護 | ❌ 不需要 | 讀 proposal 涉及的 service 程式碼就能判斷 |
| 3.3 回傳型別 | ❌ 不需要 | 讀 service 程式碼就能判斷 |
| 3.4 已知問題覆蓋 | ✅ 需要 | 要比對 data-flow 的問題清單 |

### 設計修正

將 Step 1.7 拆為兩部分：

| 部分 | 前置條件 | 檢核項 |
|------|---------|--------|
| **Step 1.7A：程式碼品質檢核** | **無（永遠執行，僅 adminApi）** | 3.2 500 防護 + 3.3 回傳型別 |
| **Step 1.7B：Data Flow 交叉檢核** | Step 1.5 有讀取 data-flow | 3.1 參數不一致 + 3.4 已知問題覆蓋 |

### 修正後的執行流程圖

```
Step 1.7【程式碼品質檢核 + Data Flow 交叉檢核】
│
├─ 1.7A 【程式碼品質檢核】（永遠執行，僅 adminApi）
│   ├─ 從 proposal 識別涉及的 service 檔案
│   ├─ 讀取 service 原始碼
│   ├─ 500 防護比對
│   │   └─ 任何 endpoint 有潛在 500 風險的 DB 操作沒用 executeWithDbErrorHandling → 記錄 CR
│   ├─ 回傳型別比對
│   │   └─ 未用 DashboardServiceResponse<T> → 記錄 CR
│   ├─ 有 CR → 寫入 proposal「## 程式碼品質檢核發現」
│   └─ 無 CR → 跳過
│
└─ 1.7B 【Data Flow 交叉檢核】（Step 1.5 有讀取 data-flow 時才執行）
    ├─ 參數比對：DTO 定義 vs 前端實際使用的參數
    │   └─ 不一致 → 記錄為「後端加開參數」CR
    ├─ 有 CR → 寫入 proposal「## Data Flow 交叉檢核發現」
    ├─ 無 CR → 跳過
    └─ 已知問題覆蓋檢核（/add-pi 產出檢核）
        ├─ proposal 有「## 已知潛在問題（Data Flow）」？
        │   ├─ 有 → 比對 data-flow ❌ 問題是否全涵蓋
        │   └─ 沒有 + data-flow 有 ❌ → ⚠️「建議執行 /add-pi」
        └─ 只報告，不寫入 proposal
```

### 1.7A 寫入 proposal 的格式

```markdown
## 程式碼品質檢核發現

> 來源：reviewDoc 讀取 proposal 涉及的 service 原始碼後發現

### CR-CQ-1：加上 500 防護

**問題**：`transcriptChange.service.ts` 的 `applyFilters` 直接 `new Date(dto.endDate)` 無驗證，傳入無效字串會產生不明 500
**建議修改**：
- 用 `executeWithDbErrorHandling` 包裝 DB 操作
- 或在使用前加入輸入驗證（如 `isNaN(Date.parse(...))`）
```

### 與原有 section 標題的區分

| Section 標題 | 來源 | 觸發條件 |
|-------------|------|---------|
| `## 程式碼品質檢核發現` | **Step 1.7A**（新） | 永遠執行（僅 adminApi） |
| `## Data Flow 交叉檢核發現` | Step 1.7B（原 1.7） | 有 data-flow 時才執行 |

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `review_skill_proposal.md` | 記錄設計修正 | ✅ 本 section |
| `reviewDoc.md` 定義檔 | Step 1.7 拆為 1.7A + 1.7B | ⏳ 待 /updateDesign |
| `reviewDoc_flowchart.md` | 流程圖同步拆分 | ⏳ 待 /updateDesign |

### 實作狀態

- [x] 發現問題（2026-02-07，實測 /reviewDoc 未觸發 500 檢核）
- [x] 記錄到 reviewDoc 設計稿（2026-02-07）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-07）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-07）
- [ ] 測試驗證

---

## 更新策略：Edit Tool 局部修改機制（2026-02-08）

### 背景

`/reviewDoc` 的多個步驟需要**修改既有 proposal**（不是新建），包括：
- Step 4：檢核後寫入檢核結果
- Step 1.7A：寫入「程式碼品質檢核發現」
- Step 1.7B：寫入「Data Flow 交叉檢核發現」
- `-data` 模式：寫入「DB 測試資料」區塊

這些都是對已存在的 proposal 做局部新增或修改，必須使用 Edit tool 而非 Write tool，避免覆蓋整份文件。

### 核心方案

**Edit tool 局部修改**：精準定位要修改的位置，只改動目標區塊。

| 項目 | 說明 |
|------|------|
| 觸發者 | `/reviewDoc` 各步驟、`-data` 模式 |
| 寫入對象 | 既有 proposal 檔案 |
| 工具 | Edit tool |
| 策略 | 定位 → 局部新增/修改 → 驗證 |

### 寫入情境與定位規則

#### 情境 1：新增區塊到 proposal 末尾

**觸發**：Step 4 寫入檢核結果、Step 1.7A/1.7B 寫入額外 CR

**定位方式**：
- `old_string`：匹配 proposal 最後一個 `##` 區塊的末尾幾行
- `new_string`：保留原末尾 + 追加新區塊（含 `---` 分隔線 + `##` 標題）

```
Edit tool 操作：
├─ old_string: proposal 末尾的最後 3-5 行（確保唯一匹配）
├─ new_string: 原末尾行 + \n---\n + 新區塊內容
└─ 結果：新區塊追加在 proposal 最後
```

#### 情境 2：在特定位置插入區塊

**觸發**：`-data` 模式在 proposal 中插入「DB 測試資料」區塊（通常在驗證方式之前）

**定位方式**：
- `old_string`：匹配目標插入點的前後文（如 `## 驗證方式` 標題行）
- `new_string`：新區塊 + 原本的標題行

```
Edit tool 操作：
├─ old_string: "## 驗證方式"（或目標位置的標題）
├─ new_string: "## DB 測試資料\n\n{內容}\n\n---\n\n## 驗證方式"
└─ 結果：新區塊插入在目標位置之前
```

#### 情境 3：更新既有區塊內容

**觸發**：`-data` 模式驗證後發現 `-s/-df` 分析有誤，需要更新 proposal 中的對應內容

**定位方式**：
- `old_string`：匹配要修改的具體內容（表格行、描述段落等）
- `new_string`：修正後的內容

```
Edit tool 操作：
├─ old_string: 要修改的具體文字（確保唯一匹配）
├─ new_string: 修正後的文字
└─ 注意：old_string 要夠長以確保唯一性，避免誤改其他位置
```

### Edit Tool 使用原則

| 原則 | 說明 |
|------|------|
| **唯一匹配** | `old_string` 必須在檔案中唯一，若不唯一要加入更多上下文 |
| **最小修改** | 只改動必要的部分，不動其他區塊 |
| **先讀後改** | 修改前必須先 Read 確認目標位置的實際內容 |
| **改後驗證** | 修改後 Read 確認結果正確（格式、位置、內容） |
| **禁止 Write 覆蓋** | 對既有 proposal 禁止使用 Write tool（會覆蓋整份文件） |

### 與 debugP 寫入策略的分工

| 情境 | 負責 Skill | 工具 | 策略 |
|------|-----------|------|------|
| 新建 Proposal | `/debugP` Step 10 | Write + Edit | 分段 Write（見 debugP 設計稿） |
| 更新 Proposal | `/reviewDoc` 各步驟 | Edit | 局部修改（本章節） |
| 更新 Proposal | `/reviewDoc -data` | Edit | 局部修改（本章節） |

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `review_skill_proposal.md` | 記錄 Edit tool 更新策略 | ✅ 已完成 |
| `reviewDoc.md` 定義檔 | Step 4 明確指定使用 Edit tool | ⬜ 待 /updateDesign |
| `reviewDoc_flowchart.md` | 不需修改（寫入工具選擇不影響流程步驟） | — 不需要 |
| `review-proposal-rules.md` | 補充 Edit tool 使用原則 | ⬜ 待 /updateDesign |

### 實作狀態

- [x] 設計討論（2026-02-08）
- [x] 記錄到 reviewDoc 設計稿（2026-02-08）
- [ ] 更新 `reviewDoc.md` 定義檔
- [ ] 更新 `review-proposal-rules.md`
- [ ] 測試驗證

---

### 2026-02-09 設計變更：新增最終步驟「更新進度表」

**變更內容**：在 skill 最後步驟完成後，自動執行 `@.claude/flowcharts/update-progress.md` 共用模組，將 proposal 進度表中 `/reviewDoc` 或 `/reviewDoc -data` 對應的行標記為 ✅。

**設計背景**：見 `showFlow_skill_proposal.md`「2026-02-09 設計變更」。

**特殊處理**：reviewDoc 有多個模式，進度表更新規則：
- 一般/again/f/p 模式 → 更新 `/reviewDoc` 行
- data 模式 → 更新 `/reviewDoc -data` 行

**影響**：
- 流程圖：各模式最後節點後新增「更新進度表」
- 定義檔：各模式最後 Step 後新增引用 `@.claude/flowcharts/update-progress.md`

---

### 2026-02-12 設計變更：1.7A 擴充「檔案產出一致性檢核」

**變更動機**：

estateSalesDetail 的 PDF 欄位資料正確性問題，是用戶提醒後才發現的。根本原因是 `/reviewDoc` 1.7A「程式碼品質檢核」只從 proposal 識別涉及的 service 檔案，如果 `/dpf` 的 proposal 沒提到檔案產出 service，reviewDoc 也不會去讀。即使 dpf 已擴充檔案產出偵測（見 dpf 設計稿 2026-02-12 變更），reviewDoc 仍需作為安全網，主動掃描 module 目錄。

**盤點 adminApi 會產出檔案的 module**：

| Module | 產出格式 | 技術 | 關鍵檔案 |
|--------|---------|------|----------|
| estateSalesDetail | PDF | Puppeteer + Handlebars template | `estateSalesDetail.pdf.service.ts` |
| informationSheet | Word (docx) | `docx-templates` + `docx-merger` | `informationSheet.service.ts`（內含 template 路徑、資料轉換） |

> ℹ️ exportList2（CSV 匯出）由其他同事負責，不納入此偵測範圍

**變更內容**：

#### 1.7A 擴充：檔案產出一致性檢核

在現有 1.7A「程式碼品質檢核」中，新增子項目：

```
├─ 1.7A 【程式碼品質檢核】（永遠執行，僅 adminApi）
│   ├─ （現有）從 proposal 識別涉及的 service 檔案，讀取原始碼
│   ├─ （現有）500 防護比對
│   ├─ （現有）回傳型別比對
│   │
│   └─ 🆕 【檔案產出一致性檢核】（不依賴 proposal 是否提到，主動掃描）
│       ├─ 掃描 module 目錄，偵測是否有檔案產出邏輯
│       │   ├─ Grep service 中: `puppeteer|generatePdf` → PDF 產出
│       │   ├─ Grep service 中: `docx-templates|docx-merger` → Word 產出
│       │   ├─ Grep service 中: `exceljs|xlsx` → Excel 產出（未來擴充）
│       │   └─ Glob: `templates/**` → template 檔案（.html/.hbs/.docx）
│       │
│       ├─ 沒有檔案產出 → 跳過
│       │
│       └─ 有檔案產出 → 執行一致性檢核
│           ├─ 讀取檔案產出 service 原始碼
│           ├─ 讀取 template 檔案（若有）
│           ├─ 識別資料來源（從哪個 Web Service method 取資料）
│           ├─ 比對：Web API response 欄位 vs 檔案產出使用的欄位
│           │   ├─ PDF：template 中的 Handlebars 變數 vs prepareTemplateData 回傳
│           │   └─ Word：docx template 變數 vs 扁平化轉換函數回傳
│           ├─ 比對：proposal 修改是否影響檔案產出（欄位新增/刪除/改名）
│           │   ├─ 有影響但 proposal 未涵蓋 → ❌ 標記遺漏
│           │   └─ 有影響且 proposal 已涵蓋 → ✅
│           ├─ 有 CR → proposal 新增「## 檔案產出一致性檢核發現」section
│           └─ 無 CR → 跳過
```

#### 與 dpf 的分工

| 項目 | dpf Step 4.5/4.6 | reviewDoc 1.7A 檔案產出檢核 |
|------|-------------------|---------------------------|
| 角色 | 主動分析，產出 proposal | 安全網，驗證 proposal 完整性 |
| 觸發條件 | 永遠執行（掃描 module 目錄） | 永遠執行（不依賴 proposal 內容） |
| 檢核方向 | 檔案產出欄位是否正確使用資料 | proposal 修改是否遺漏對檔案產出的影響 |
| 產出 | proposal 中的解法 | 檢核結果中的 CR（補充 proposal） |

**設計重點**：reviewDoc 的檔案產出檢核是「安全網」，即使 dpf 已經做了分析，reviewDoc 仍然獨立掃描確認。兩者的檢核角度不同：dpf 是「檔案產出本身有沒有問題」，reviewDoc 是「proposal 的修改有沒有遺漏對檔案產出的影響」。

**影響**：
- 流程圖：1.7A 新增「檔案產出一致性檢核」子節點
- 定義檔：1.7A 新增檔案產出偵測 + 一致性比對邏輯
- 輸出格式：新增「📄 含檔案產出檢核」標籤

**實作狀態**：
- [x] 設計討論（2026-02-12）
- [x] 記錄到 reviewDoc 設計稿（2026-02-12）
- [ ] 更新 `reviewDoc.md` 定義檔
- [ ] 更新 `reviewDoc_flowchart.md` 流程圖
- [ ] 測試驗證

---

### 2026-02-12 設計變更：-data 模式擴展涵蓋「檔案產出欄位風險表」

**變更動機**：

informationSheet 的 Word 產出有 230+ 變數，很多來自深層關聯（如 `realEstate.store.name`、`realEstate.legalAttribute.parkingArea`）。這些變數在 Web API response 不一定暴露，但 Word 產出會用到。

現有 `-data` 模式只從 Web API response 欄位推導 cases（nullable/FK/softDelete），**完全沒有涵蓋檔案產出的 template 變數**。導致：
- 測試資料沒有覆蓋 Word/PDF 欄位
- `/check-result` 驗證時不知道哪些欄位應該有值、哪些可能空白
- 空白欄位問題到用戶手動檢視 Word 檔才發現

**前置依賴**：

此變更依賴 `/dpf` Step 4.6.5 產出的「## 檔案產出欄位風險表」。如果 proposal 沒有此區塊，`-data` 維持現有行為。

**變更內容**：

#### -data 模式 Step 2 擴展：推導檔案產出 cases

```
├─ 2. 【推導驗證 Cases】
│   ├─ （現有）從 data-flow Entity 推導 Web API cases
│   │   ├─ nullable 欄位 → 有值 case + null case
│   │   ├─ FK 關聯 → 關聯存在 case + 關聯不存在 case
│   │   └─ ...
│   │
│   └─ 🆕 從 proposal「## 檔案產出欄位風險表」推導檔案產出 cases
│       ├─ 檢查 proposal 是否有「## 檔案產出欄位風險表」區塊
│       │   ├─ 沒有 → 跳過，維持現有行為
│       │   └─ 有 → 讀取風險表，提取 ⚠️ 風險欄位
│       │
│       ├─ 為每個 ⚠️ 風險欄位推導 case
│       │   ├─ nullable FK 欄位 → 「FK 存在 + 欄位有值」case + 「FK 不存在 + 欄位空白」case
│       │   ├─ nullable 欄位 → 「有值」case + 「null」case
│       │   └─ 深層關聯欄位 → 「完整關聯鏈」case + 「中間關聯斷裂」case
│       │
│       ├─ 🆕 特殊 case：「完整資料」case
│       │   └─ 找一筆所有 ⚠️ 風險欄位都有值的記錄（供 /check-result 驗證檔案內容用）
│       │
│       └─ 產出：在 Cases 表中標記「📄 檔案產出」來源
```

#### -data 模式 Step 4 擴展：撈檔案產出相關測試資料

```
├─ 4. 【撈 DB 測試資料】
│   ├─ （現有）逐 case 執行 SQL
│   │
│   └─ 🆕 檔案產出 cases
│       ├─ 「完整資料」case → 用 JOIN 查詢所有風險欄位都 IS NOT NULL 的記錄
│       │   └─ 找不到 → 標記「⚠️ 無完整測試資料，部分欄位必定空白」
│       ├─ 「空白」case → 找風險欄位為 NULL 的記錄
│       └─ 記錄到 proposal「## DB 測試資料」，標記「📄」
```

#### Proposal 產出格式擴展

在「## DB 測試資料」區塊中，新增檔案產出分類：

```markdown
### 📄 檔案產出測試資料

| # | 情境 | 撈到的 ID | 關鍵欄位值 | 狀態 |
|---|------|-----------|-----------|------|
| F-1 | 完整資料（所有風險欄位有值） | re.id = 19185 | store=✅, legalAttr=✅, parking=✅ | ✅ |
| F-2 | store 不存在 | re.id = 38128 | storeId=null | ✅ |
| F-3 | legalAttribute 不存在 | ⚠️ 無測試資料 | - | ⚠️ |
```

**與前後 skill 的銜接**：

```
/dpf Step 4.6.5 → proposal「## 檔案產出欄位風險表」
                        ↓
/reviewDoc -data Step 2 → 讀取風險表，推導檔案產出 cases
/reviewDoc -data Step 4 → 撈 DB，找完整資料 + 空白資料
                        ↓
                  proposal「## DB 測試資料 → 📄 檔案產出測試資料」
                        ↓
/check-result Step 6.4.5 → 用完整資料 ID 生成檔案，驗證內容
```

**向後相容**：

| 情況 | -data 行為 |
|------|-----------|
| proposal 有「## 檔案產出欄位風險表」 | 擴展推導 + 撈 DB（新行為） |
| proposal 沒有此區塊 | 完全維持現有行為 |

**影響**：
- 流程圖：-data 模式 Step 2 和 Step 4 新增檔案產出分支
- 定義檔：-data 模式新增風險表偵測 + 檔案產出 cases 推導邏輯
- 輸出格式：Cases 表和 DB 測試資料表新增「📄」標記

**實作狀態**：
- [x] 設計討論（2026-02-12）
- [x] 記錄到 reviewDoc 設計稿（2026-02-12）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-12 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-12 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-12 設計變更：新增 Step 1.7C「跨模組 Enum/Type 影響檢核」

**變更動機**：

P7-5 修改了 `LandInfo.ts` Entity 的 `LandUseZoneLevel1/2/3` Enum（移除 `-1`）和 `sellRightsType`（`-1` → `null`），同時修改了 `transcript.dto.ts` 和 `estateListing.dto.ts` 的 Transform。但 `estateTransaction.dto.ts` 也 import 了同樣的 Enum 並使用相同的 Transform pattern，卻在 `/reviewDoc` 時沒被發現。

**根本原因分析**：

現有 reviewDoc 的檢核步驟都只看「proposal 提到的檔案」或「該 API 的 data-flow」：

| 步驟 | 做什麼 | 能發現跨模組問題？ |
|------|--------|-------------------|
| 1.7A 程式碼品質檢核 | 讀取 proposal 涉及的 service | ❌ 只看 proposal 提到的檔案 |
| 1.7B Data Flow 交叉檢核 | 比對該 API 的 data-flow | ❌ 只比對該 API |
| 3.2 相關程式碼分析 | 搜尋同 pattern | ⚠️ 最接近，但搜的是「相同問題 pattern」不是「import 同一個 enum」 |
| 6. 讀取 DTO | 讀取該 API 的 DTO | ❌ 只讀提案涉及的 API |

**核心缺口**：沒有步驟會「當 Entity/Enum 定義被修改時，搜尋所有 import 該 Enum/Type 的檔案，判斷是否需連帶修改」。

**變更內容**：

#### Step 1.7C：跨模組 Enum/Type 影響檢核

在 1.7A 和 1.7B 之間新增 1.7C：

```
Step 1.7C 【跨模組 Enum/Type 影響檢核】（proposal 修改了 Entity Enum/共用 type 時）
│
├─ 觸發條件判斷
│   ├─ 從 proposal 修改檔案清單中，檢查是否有：
│   │   ├─ Entity 檔案（*.entity.ts）中的 Enum 定義變更
│   │   ├─ 共用 Enum 定義檔（如 enums/*.ts、constants/*.ts）的值變更
│   │   └─ 共用 type/interface 的結構變更
│   ├─ 沒有 → 跳過 1.7C
│   └─ 有 → 繼續
│
├─ 1. 提取被修改的 Enum/Type 名稱
│   └─ 從 proposal 的修改內容提取（如：LandUseZoneLevel1Enum、sellRightsType）
│
├─ 2. Grep 搜尋所有引用檔案
│   ├─ 搜尋範圍：src/api/ 目錄
│   ├─ Grep pattern：被修改的 Enum/Type 名稱
│   ├─ 重點檔案類型：*.dto.ts > *.service.ts > *.controller.ts
│   └─ 排除：已在 proposal 修改清單中的檔案
│
├─ 3. 分析每個引用檔案的使用方式
│   ├─ DTO 中使用 @IsEnum() + @Transform() 驗證
│   │   └─ 同樣的 Transform pattern 但沒有 proposal 的新寫法 → ❌ 需修改
│   ├─ DTO 中僅作為 type 引用（如 response DTO 的型別標註）
│   │   └─ Enum 值移除 → 檢查回傳值是否受影響 → ⚠️ 視情況
│   ├─ Service 中比對特定 Enum 值（如 if value === -1）
│   │   └─ 被移除的值有硬編碼 → ❌ 需修改
│   └─ 其他引用（import 但未直接使用修改的值）
│       └─ ✅ 不需修改
│
├─ 4. 產出影響清單
│   ├─ 有需修改的檔案 → proposal 新增「## 跨模組影響檢核發現」section
│   │   └─ 每個 CR 含：檔案路徑、Enum/Type 名稱、使用方式、建議修改
│   └─ 無需修改 → 跳過
│
└─ 輸出格式
    └─ 表格：| # | 檔案 | Enum/Type | 使用方式 | 需修改？ | 說明 |
```

#### Proposal 產出格式

```markdown
## 跨模組影響檢核發現

> 來源：reviewDoc 1.7C — proposal 修改了 Entity Enum 定義，搜尋所有引用檔案

### CR-XM-1：estateTransaction.dto.ts 的 LandUseZoneLevel Transform

**影響的 Enum/Type**：`LandUseZoneLevel1Enum`、`LandUseZoneLevel2Enum`、`LandUseZoneLevel3Enum`

**引用檔案**：`src/api/adminApi/estateTransaction/dto/estateTransaction.dto.ts`

| # | 檔案 | DTO Class | 欄位 | 使用方式 | 需修改？ |
|---|------|-----------|------|---------|---------|
| 1 | estateTransaction.dto.ts | CreateLandInfoInputDto | landUseZoneLevel1 | @Transform(transformToNumberEnum) | ❌ 需改為 null→undefined |
| 2 | estateTransaction.dto.ts | CreateLandInfoInputDto | landUseZoneLevel2 | @Transform(transformToNumberEnum) | ❌ 需改為 null→undefined |
| ... | ... | ... | ... | ... | ... |

**建議修改**：與 transcript.dto.ts 和 estateListing.dto.ts 相同的 Transform 修正
```

#### 與現有 Step 的關係

| 部分 | 前置條件 | 檢核範圍 |
|------|---------|---------|
| Step 1.7A：程式碼品質檢核 | 無（永遠執行） | proposal 涉及的 service 品質 |
| **Step 1.7C：跨模組影響檢核** | **proposal 修改了 Enum/Type** | **所有引用被修改 Enum/Type 的檔案** |
| Step 1.7B：Data Flow 交叉檢核 | Step 1.5 有 data-flow | DTO vs 前端參數 |

**放置在 1.7A 之後、1.7B 之前的理由**：
- 1.7C 不需要 data-flow（和 1.7A 一樣不依賴外部文件）
- 1.7C 發現的額外修改檔案可能影響 1.7B 的判斷範圍
- 1.7A/C 是「從程式碼出發」，1.7B 是「從 data-flow 出發」，分組合理

#### 與 Step 3.2 的差異

| 比較項 | Step 3.2 相關程式碼分析 | Step 1.7C 跨模組影響檢核 |
|--------|----------------------|------------------------|
| 搜尋邏輯 | 搜尋「相同問題 pattern」（如 LEFT JOIN） | 搜尋「import 同一個 Enum/Type」 |
| 觸發條件 | 永遠執行 | proposal 修改了 Enum/Type 時 |
| 目的 | 找同模組內的相似問題 | 找跨模組的連帶影響 |
| 判斷方式 | 比對程式碼 pattern 是否相同 | 分析引用方式是否需要連帶修改 |

**影響**：
- 流程圖：1.7A 和 1.7B 之間插入 1.7C
- 定義檔：新增 1.7C 的檢核邏輯和產出格式
- 輸出格式：新增「🔗 含跨模組影響檢核」標籤

**實作狀態**：
- [x] 設計討論（2026-02-12）
- [x] 記錄到 reviewDoc 設計稿（2026-02-12）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-12 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-12 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-12 設計變更：Step 1.7C 擴充「DTO Transform 語意變更 + Service 層檢核」

**變更動機**：

P7-7 修改了 `transcript.dto.ts` 的 Transform 語意（null → undefined 行為改變），P7-8 透過 1.7C 成功找到跨模組 DTO 影響（estateListing.dto.ts、estateTransaction.dto.ts）。但 `transcript.service.ts` 中有 `!== undefined` guard 邏輯依賴 Transform 的語意行為，1.7C 完全沒檢查到。

**根本原因分析**：

1.7C 有兩個缺口：

| 缺口 | 說明 | 實際案例 |
|------|------|---------|
| 觸發條件太窄 | 只觸發 Entity Enum / 共用 Type 變更，不觸發 DTO Transform 語意變更 | P7-7 改了 Transform pattern，但這不是 Enum/Type 變更 |
| Service 分析太淺 | 只看「比對特定 Enum 值」（如 `if value === -1`），不看 null/undefined 語意邏輯 | transcript.service.ts 的 `landDescription.landUseZoneLevel1 !== undefined` guard 被忽略 |

**為何放 1.7C 而非 1.7A**：

1.7C 的排除規則是「排除已在 proposal 修改清單中的檔案」。當 proposal 只修改 `transcript.dto.ts` 時，`transcript.service.ts` 不在修改清單中，自然會被掃到。因此 1.7C 一次觸發就能覆蓋：

| 影響範圍 | 說明 | 現有覆蓋 |
|---------|------|---------|
| 跨模組 DTO | 其他模組的同 Transform pattern | ✅ 已有 |
| 跨模組 Service | 其他模組 Service 中的 null/undefined 邏輯 | ❌ → ✅ 新增 |
| 同模組 Service | 同模組 Service 中依賴 Transform 語意的邏輯 | ❌ → ✅ 自然覆蓋（不在修改清單中） |

若放 1.7A，只能處理同模組，跨模組 Service 還是得靠 1.7C，邏輯分散。

**變更內容**：

#### 觸發條件擴充

```diff
 ├─ 觸發條件判斷
 │   ├─ 從 proposal 修改檔案清單中，檢查是否有：
 │   │   ├─ Entity 檔案（*.entity.ts）中的 Enum 定義變更
 │   │   ├─ 共用 Enum 定義檔（如 enums/*.ts、constants/*.ts）的值變更
-│   │   └─ 共用 type/interface 的結構變更
+│   │   ├─ 共用 type/interface 的結構變更
+│   │   └─ DTO 檔案（*.dto.ts）中的 Transform 行為語意變更
 │   ├─ 沒有 → 跳過 1.7C
 │   └─ 有 → 繼續
```

**「Transform 行為語意變更」的判斷標準**：
- Transform 的 null/undefined 回傳行為改變（如：原本 null → undefined，改為 null → null）
- Transform 的條件邏輯改變（如：`value === null ? undefined :` → `value != null ?`）
- 不包含：純粹的格式重構（不影響輸入輸出行為）

#### Service 層分析擴充

```diff
 ├─ 3. 分析每個引用檔案的使用方式
 │   ├─ DTO 中使用 @IsEnum() + @Transform() 驗證
 │   │   └─ 同樣的 Transform pattern 但沒有 proposal 的新寫法 → ❌ 需修改
 │   ├─ DTO 中僅作為 type 引用（如 response DTO 的型別標註）
 │   │   └─ Enum 值移除 → 檢查回傳值是否受影響 → ⚠️ 視情況
 │   ├─ Service 中比對特定 Enum 值（如 if value === -1）
 │   │   └─ 被移除的值有硬編碼 → ❌ 需修改
+│   ├─ Service 中對 Transform 影響欄位的 null/undefined 判斷邏輯
+│   │   ├─ `!== undefined` / `=== undefined` guard → ❌ 需確認語意是否連動
+│   │   ├─ `!== null` / `=== null` guard → ❌ 需確認語意是否連動
+│   │   ├─ `?? defaultValue` 空值合併 → ⚠️ 檢查 null vs undefined 行為差異
+│   │   └─ 條件展開 `...(field !== undefined && { key: field })` → ❌ 需確認
 │   └─ 其他引用（import 但未直接使用修改的值）
 │       └─ ✅ 不需修改
```

**Service 層檢核的搜尋策略**：

1. 從 Transform 變更中提取影響的欄位名稱（如 `landUseZoneLevel1`、`sellRightsType`）
2. 在 Service 檔案中 Grep 這些欄位名稱
3. 分析匹配行的上下文：是否包含 null/undefined 判斷邏輯
4. 有 → 比對 Transform 語意變更是否影響判斷結果

#### 實際案例

**P7-7/P7-8 場景還原**：

1. Proposal 修改 `transcript.dto.ts` 的 Transform：`null → undefined` 改為 `null → null`
2. 觸發條件：✅ DTO Transform 行為語意變更
3. Grep `landUseZoneLevel1` 在 `src/api/` 中搜尋
4. 找到 `transcript.service.ts`：`landDescription.landUseZoneLevel1 !== undefined`
5. 分析：Transform 不再將 null 轉為 undefined → 此 guard 對 null 值的行為改變 → ❌ 需確認

#### 更新後的標題和 Proposal 產出格式

Step 1.7C 標題更新為：
```
Step 1.7C 【跨模組 Enum/Type/Transform 影響檢核】
```

Proposal 產出的 `> 來源` 行更新為：
```markdown
> 來源：reviewDoc 1.7C — proposal 修改了 {Entity Enum 定義 / DTO Transform 語意}，搜尋所有引用檔案
```

Service 層發現的 CR 格式：
```markdown
### CR-XM-N：{service_file} 的 null/undefined guard

**影響的變更**：`{dto_file}` 的 `{field}` Transform 語意變更（null → undefined 改為 null → null）

**引用檔案**：`src/api/adminApi/{module}/service/{module}.service.ts`

| # | 檔案 | 方法 | 程式碼 | 需修改？ | 說明 |
|---|------|------|--------|---------|------|
| 1 | transcript.service.ts | updateLandInfo | `landDescription.landUseZoneLevel1 !== undefined` | ❌ 需確認 | Transform 不再將 null → undefined，此 guard 行為改變 |

**建議修改**：確認 `!== undefined` guard 在新語意下是否仍正確，或是否需改為 `!== undefined && !== null` / 其他邏輯
```

#### 與現有 Step 的關係（更新）

| 部分 | 前置條件 | 檢核範圍 |
|------|---------|---------|
| Step 1.7A：程式碼品質檢核 | 無（永遠執行） | proposal 涉及的 service 品質 |
| **Step 1.7C：跨模組影響檢核** | **proposal 修改了 Enum/Type/Transform** | **所有引用被修改 Enum/Type 的檔案 + Service 層 null/undefined 語意** |
| Step 1.7B：Data Flow 交叉檢核 | Step 1.5 有 data-flow | DTO vs 前端參數 |

**實作狀態**：
- [x] 設計討論（2026-02-12）
- [x] 記錄到 reviewDoc 設計稿（2026-02-12）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-12 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-12 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-12 設計變更：Step 13 新增「前端修改必要性檢核」

**變更動機**：

directMail 的 `/dpf` 將 storeData null 防護歸類為「前端修改」（加 optional chaining），但後端可以在 assembleResponse 回傳預設值物件，前端完全不用改。問題在 `/dpf` Step 4 缺少「後端優先原則」（已在 dpf 設計稿新增），但 `/reviewDoc` 作為品質關卡也應該攔截。

**問題分析**：

現有 Step 13「前端架構檢查」只驗證前端修改建議的**技術正確性**（檔案路徑存在、API 呼叫慣例、TypeScript 型別），但不質疑**是否應該由前端修改**。導致即使 `/dpf` 分類錯誤，`/reviewDoc` 也無法攔截。

| 現有 Step 13 檢核 | 缺少的 |
|------------------|--------|
| 檔案路徑是否存在 | 這個修改是否應該在前端做 |
| API 呼叫慣例是否正確 | 後端能否替代（回預設值、格式化） |
| TypeScript 型別是否定義 | 修改是否屬於「只有前端能做的事」 |

**變更內容**：

#### Step 13 擴充：前端修改必要性檢核

在現有 Step 13「前端架構檢查」中，新增前置檢核子步驟：

```
├─ 13. 【前端架構檢查】（若有前端修改建議）
│   │
│   ├─ 🆕 13.0 【前端修改必要性檢核】（先於技術檢查）
│   │   ├─ 逐項檢查每個前端修改建議
│   │   │   ├─ 後端能否解決？（回預設值 / 格式化 / null guard / 加欄位）
│   │   │   │   ├─ 能 → ❌ 標記「建議改為後端處理」
│   │   │   │   │   └─ 具體說明後端如何處理（如：assembleResponse 回預設值物件）
│   │   │   │   └─ 不能 → ✅ 確認為前端修改
│   │   │   └─ 是否屬於「只有前端能做的事」？
│   │   │       ├─ UI 互動 / 路由 / 狀態管理 / 顯示格式 → ✅ 確認前端
│   │   │       └─ 資料處理 / null 防護 / 格式轉換 → ❌ 後端應處理
│   │   ├─ 有 ❌ → 在檢核結果新增「⚠️ 前端修改必要性」section
│   │   │   └─ 列出每個不必要的前端修改 + 建議的後端替代方案
│   │   └─ 全 ✅ → 繼續技術檢查
│   │
│   ├─ （現有）13.1 判斷對應的前端專案
│   ├─ （現有）13.2 確認檔案路徑是否存在
│   └─ （現有）13.3 確認 API 呼叫慣例
```

#### 檢核結果輸出格式

```
### ⚠️ 前端修改必要性（N 項需重新評估）

| # | 前端修改項目 | 判定 | 原因 | 建議後端替代方案 |
|---|------------|------|------|----------------|
| 1 | storeData null 防護 | ❌ 不必要 | 後端可回預設值 | assembleResponse: `storeData ?? { id: null, companyName: '', ... }` |
```

#### 與 dpf「後端優先原則」的關係

| 職責 | dpf Step 4 | reviewDoc Step 13 |
|------|-----------|-------------------|
| 角色 | 生產端（產出 proposal） | 品質關卡（檢核 proposal） |
| 時機 | 分析修法時判斷 | 檢核時攔截 |
| 目的 | 正確分類，減少不必要的前端修改 | 攔截漏網之魚，補強品質 |

兩者互補：dpf 正確分類 → reviewDoc 不會觸發；dpf 分錯 → reviewDoc 攔截。

**影響**：
- 流程圖：Step 13 新增 13.0 前置子步驟
- 定義檔：Step 13 新增前端修改必要性檢核邏輯
- 輸出格式：新增「⚠️ 前端修改必要性」標籤

**實作狀態**：
- [x] 設計討論（2026-02-12）
- [x] 記錄到 reviewDoc 設計稿（2026-02-12）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-12 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-12 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-13 設計變更：Step 12 新增「歷史文件驗證」檢核項

**變更動機**：

不管 proposal 來源是 `/debugP` 還是 `/dpf`，reviewDoc 都應該搜尋 `prompts/4_diary/` 歷史文件紀錄，比對 proposal 是否符合歷史決策。避免重複犯錯或與過去的設計決策矛盾。

**問題分析**：

目前 reviewDoc 的 Step 12 逐項檢核只檢查程式架構、DTO、Entity 等技術面，沒有比對歷史文件。debugP 已有 Step 7.1 歷史文件驗證，但 reviewDoc 作為通用品質關卡（不分 proposal 來源），也需要這項檢核。

**為什麼放 Step 12 而非 1.7 系列**：

1.7 系列是前置檢核，在讀取 proposal（Step 2）之前執行。歷史文件驗證需要先讀完 proposal 才能提取關鍵字（Entity 名稱、API 名稱、業務邏輯名詞），所以必須放在 Step 2 之後。Step 12 逐項檢核是最合適的位置。

**變更內容**：

#### Step 12 新增：歷史文件驗證

在現有 Step 12 逐項檢核中新增子項：

```
├─ 12. 【逐項檢核】
│   ├─ （現有檢核項目...）
│   ├─ 🆕 歷史文件驗證
│   │   ├─ 從 proposal 提取關鍵字（Entity 名稱、API 名稱、業務邏輯名詞）
│   │   ├─ rg -l "{關鍵字}" prompts/4_diary/
│   │   ├─ 找到 → 讀取內容、比對 proposal 是否符合歷史決策
│   │   ├─ 有矛盾 → 在檢核結果標記「⚠️ 與歷史決策不一致」
│   │   └─ 無矛盾或沒找到 → 跳過
```

**適用模式**：一般模式 + again 模式（所有 proposal，不分來源是 debugP 還是 dpf）

**與 debugP Step 7.1 的關係**：

| 職責 | debugP Step 7.1 | reviewDoc Step 12 |
|------|-----------------|-------------------|
| 角色 | 生產端（產出 proposal 時比對） | 品質關卡（檢核 proposal 時比對） |
| 時機 | proposal 產出前 | proposal 檢核時 |
| 目的 | 產出時就避免矛盾 | 攔截漏網之魚 |

兩者互補：debugP 產出時比對 → reviewDoc 檢核時再次確認。

**影響**：
- 流程圖：Step 12 逐項檢核下新增「歷史文件驗證」子項
- 定義檔：Step 12 新增歷史文件驗證邏輯

**實作狀態**：
- [x] 設計討論（2026-02-13）
- [x] 記錄到 reviewDoc 設計稿（2026-02-13）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-13 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-13 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-13 設計變更：Step 12 新增「分頁預設值檢核」

**變更動機**：

所有 findAll/list endpoint 的分頁預設值應為 10 筆。目前 reviewDoc 沒有檢查這項，導致新 API 可能遺漏分頁預設值設定。

**變更內容**：

#### Step 12 新增：分頁預設值檢核

在現有 Step 12 逐項檢核中新增子項：

```
├─ 12. 【逐項檢核】
│   ├─ （現有檢核項目...）
│   ├─ 🆕 分頁預設值檢核
│   │   ├─ 檢查 proposal 中所有 findAll/list endpoint
│   │   ├─ 讀取現有 DTO 確認 pageSize/limit 預設值（Step 6 已讀取 DTO，直接用）
│   │   ├─ DTO 的 pageSize/limit 預設值是否為 10
│   │   │   ├─ 沒有預設值 → ❌ 標記需補充 @Transform default 10
│   │   │   ├─ 預設值不是 10 → ❌ 標記需修改
│   │   │   └─ 預設值是 10 → ✅
```

**適用模式**：一般模式 + again 模式

**不衝突原因**：Step 6 已讀取 DTO，Step 12 可直接用 Step 6 的結果，不需額外讀取。

**影響**：
- 流程圖：Step 12 逐項檢核下新增「分頁預設值檢核」子項
- 定義檔：Step 12 新增分頁預設值檢核邏輯

**實作狀態**：
- [x] 設計討論（2026-02-13）
- [x] 記錄到 reviewDoc 設計稿（2026-02-13）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-13 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-13 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-13 設計變更：新增 Step 1.7E「檔案上傳自動偵測」

**變更動機**：

如果 API 涉及檔案上傳（FileService/S3Service），reviewDoc 一般模式應自動涵蓋 `-f` 的 6 項專屬檢核，用戶不需手動加 `-f`。

**問題分析**：

現有 1.7A「檔案產出一致性檢核」偵測的是 puppeteer/docx（PDF/Word 產出），跟「檔案上傳」（FileService/S3Service/handleFileUpload）是不同概念，不能混在一起。需要獨立的偵測步驟。

| 概念 | 偵測關鍵字 | 對應檢核 |
|------|-----------|---------|
| 檔案產出（PDF/Word） | `puppeteer\|generatePdf\|docx-templates` | 1.7A 檔案產出一致性檢核 |
| 檔案上傳（S3） | `FileService\|S3Service\|handleFileUpload\|CUSTOM_PATH_PREFIX` | 🆕 1.7E 檔案上傳自動偵測 |

**變更內容**：

#### Step 1.7E：檔案上傳自動偵測

在 1.7A 之後、1.7C 之前新增 1.7E：

```
Step 1.7【程式碼品質檢核 + Data Flow 交叉檢核】
│
├─ 1.7A 【程式碼品質檢核】（永遠執行，僅 adminApi）
│   └─ （現有內容...）
│
├─ 🆕 1.7E 【檔案上傳自動偵測】（永遠執行，僅 adminApi）
│   ├─ 掃描 module 目錄，偵測是否有檔案上傳邏輯
│   │   └─ Grep service 中: `FileService|S3Service|handleFileUpload|CUSTOM_PATH_PREFIX`
│   ├─ 沒有檔案上傳 → 跳過
│   └─ 有檔案上傳 → 自動執行 -f 的 6 項專屬檢核
│       ├─ 載入知識：file_upload_architecture.md + file_upload_checklist.md
│       ├─ 執行 6 項檢核：
│       │   ├─ CUSTOM_PATH_PREFIX
│       │   ├─ DOCUMENT_TYPE_MAPPING
│       │   ├─ Module 設定
│       │   ├─ Service 方法
│       │   ├─ DTO 欄位
│       │   └─ Entity 關聯
│       ├─ 有 CR → proposal 新增「## 檔案上傳自動檢核發現」section
│       └─ 無 CR → 跳過
│
├─ 1.7C 【跨模組 Enum/Type/Transform 影響檢核】
│   └─ （現有內容...）
│
└─ 1.7B 【Data Flow 交叉檢核】
    └─ （現有內容...）
```

**效果**：用戶不需手動加 `-f`，一般模式自動涵蓋檔案上傳檢核。

**適用模式**：一般模式 + again 模式

**執行順序相容性**：

| Step | 前置條件 | 依賴 |
|------|---------|------|
| 1.7A 程式碼品質檢核 | 無（永遠執行） | 無 |
| **1.7E 檔案上傳自動偵測** | **無（永遠執行）** | **無（獨立偵測）** |
| 1.7C 跨模組影響檢核 | proposal 修改了 Enum/Type/Transform | 無 |
| 1.7B Data Flow 交叉檢核 | Step 1.5 有 data-flow | data-flow 文件 |

1.7E 不依賴其他步驟，放在 1.7A 之後、1.7C 之前，不影響既有執行順序。

**與 -f 模式的關係**：

| 職責 | -f 模式（手動） | 1.7E（自動） |
|------|---------------|-------------|
| 觸發 | 用戶手動 `/reviewDoc f` | 一般模式自動偵測 |
| 檢核內容 | 相同 6 項 | 相同 6 項 |
| 輸出 section | `📁 檔案上傳補充檢核` | `## 檔案上傳自動檢核發現` |
| 適用場景 | 用戶明確知道有檔案上傳 | 自動涵蓋，不遺漏 |

**影響**：
- 流程圖：1.7A 和 1.7C 之間插入 1.7E
- 定義檔：新增 1.7E 檔案上傳自動偵測邏輯

**實作狀態**：
- [x] 設計討論（2026-02-13）
- [x] 記錄到 reviewDoc 設計稿（2026-02-13）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-13 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-13 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-13 設計變更：-p 模式新增載入 eagle_permission_v1.csv + CSV 權限矩陣比對

**變更動機**：

reviewDoc `-p` 模式應使用最新的 `eagle_permission_v1.csv` 權限定義，比對 proposal 的權限項目是否與 CSV 中的角色權限矩陣一致。不分 proposal 來源（debugP 或 dpf 都適用）。

**變更內容**：

#### -p 模式 Step 1 新增載入 CSV

現有載入：
- `1_permission_architecture.md`
- `2_permission_adjustment_rules.md`

新增載入：
- `/Users/nicholas/Desktop/Projects/prompts/4_diary/role_and_permission/design/eagle_permission_v1.csv`

```
├─ [p 模式專屬流程]
│   ├─ 1. 【按需載入知識】（僅此模式載入）
│   │   ├─ 1_permission_architecture.md
│   │   ├─ 2_permission_adjustment_rules.md
│   │   └─ 🆕 eagle_permission_v1.csv（角色 × 功能 × 操作 權限矩陣）
```

#### -p 模式新增檢核：CSV 權限矩陣比對

在現有 6 項專屬檢核之後新增第 7 項：

```
│   ├─ 3. 【執行專屬檢核】
│   │   ├─ （現有 6 項...）
│   │   └─ 🆕 7. CSV 權限矩陣比對
│   │       ├─ 比對 proposal 定義的權限項目 vs CSV 中的角色權限矩陣
│   │       ├─ 比對 rolePermissionMapping 的角色分配 vs CSV 中各角色的 yes/需確認
│   │       ├─ CSV 中標記「yes」→ proposal 必須有對應角色授權 → 沒有則 ❌
│   │       ├─ CSV 中標記「需確認」→ ⚠️ 標記需與 PM 確認
│   │       └─ CSV 中沒有該功能 → ⚠️ 標記 CSV 可能需更新
```

**適用模式**：-p 模式（不分 proposal 來源，debugP 或 dpf 都適用）

**影響**：
- 流程圖：-p 模式 Step 1 新增載入 CSV、Step 3 新增第 7 項檢核
- 定義檔：-p 模式新增 CSV 載入和比對邏輯

**實作狀態**：
- [x] 設計討論（2026-02-13）
- [x] 記錄到 reviewDoc 設計稿（2026-02-13）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-13 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-13 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-19 設計變更：-data 模式新增「篩選參數交互行為 + DB 資料分佈」檢核

**變更動機**：

townName 篩選 bug 在 `/check-result` 時沒被發現：
- `countyCodes=O` 不帶 townName → 只撈出東區 62 筆（應撈全新竹市 1263 筆）
- `countyCodes=O` + `townName=東區` → 撈出 1201 筆（比不帶時 62 筆還多）

**根本原因分析**：

`-data` 現有 Step 2 只從 Entity 欄位類型推導「有值/沒值」cases，聚焦 response 資料驗證。完全沒有涵蓋：

| 缺口 | 說明 |
|------|------|
| 篩選參數組合行為 | 帶 A 不帶 B vs 帶 A+B vs 都不帶，結果是否符合子集關係 |
| DB 資料分佈查詢 | 各篩選組合的預期筆數，用來比對 API 結果 |

現有 Step 2 的「從 proposal 修改內容聚焦相關欄位」只把相關欄位送進 nullable/FK/softDelete 分析，不會檢查該欄位作為 query parameter 時的篩選行為。

**設計模式**：

遵循 2026-02-12「檔案產出」的擴展模式：Step 2 新增 case 來源 + Step 3-4 新增對應 DB 查詢 + 向後相容。

**變更內容**：

#### 觸發條件

```
proposal 涉及 findAll/list endpoint？
├─ 沒有 → 跳過（維持現有行為）
└─ 有 → 從 data-flow 的 DTO 提取 query parameters
        └─ proposal 修改涉及的欄位，是否也是 query parameter？
            ├─ 沒有 → 跳過
            └─ 有 → 執行 Step 2.X
```

**「涉及」定義**：
- 直接：proposal 修改了 findAll DTO 的篩選 Transform/驗證邏輯
- 間接：proposal 修改了某欄位的處理（如 townName 的 `buildFullAddress`），且該欄位同時也是 findAll 的 query parameter

#### -data 模式 Step 2 擴展：推導篩選參數 cases

```
├─ 2. 【推導驗證 Cases】
│   ├─ （現有）Entity 欄位 nullable/FK/softDelete cases
│   ├─ （現有）從 proposal 修改內容聚焦相關欄位
│   ├─ （現有）檔案產出欄位風險表 cases
│   │
│   └─ 🆕 2.X 【篩選參數交互行為 Cases】
│       │
│       ├─ 觸發判斷
│       │   ├─ proposal 涉及 findAll/list endpoint？
│       │   │   ├─ 沒有 → 跳過
│       │   │   └─ 有 → 繼續
│       │   └─ data-flow DTO query params vs proposal 相關欄位
│       │       ├─ 有匹配 → 繼續
│       │       └─ 無匹配 → 跳過
│       │
│       ├─ 識別相關參數組
│       │   ├─ 從 data-flow DTO 列出所有 query parameters
│       │   ├─ 根據「篩選維度」分組（同一 Entity 或相關 Entity 的參數歸同組）
│       │   │   └─ 例：countyCodes + zipCode + townName → 「地址篩選組」
│       │   └─ 同組有 2+ 個參數 → 需要交叉測試
│       │
│       ├─ 推導篩選 Cases
│       │   ├─ Q-1: 只帶母參數（如 countyCodes=O）
│       │   │   └─ 預期：該 county 所有資料
│       │   ├─ Q-2: 帶母參數 + 子參數（如 countyCodes=O + townName=東區）
│       │   │   └─ 預期：Q-2 筆數 ≤ Q-1 筆數（子集關係）
│       │   ├─ Q-3: 不帶任何篩選
│       │   │   └─ 預期：全部資料
│       │   └─ Q-4: 只帶子參數不帶母參數
│       │       └─ 預期：依據篩選邏輯定義
│       │
│       └─ 產出：Cases 表中標記「🔍 篩選」
```

#### -data 模式 Step 3-4 擴展：撈篩選參數資料分佈

```
├─ 3. 【連接 DB + 推導 SQL】
│   ├─ （現有）Entity 關聯推導 JOIN 路徑
│   │
│   └─ 🆕 篩選參數資料分佈 SQL
│       ├─ 從 data-flow Service 的 findAll WHERE 條件推導
│       │   └─ ⚠️ 不自己假設 WHERE 條件，從 data-flow 讀取 Service 查詢邏輯
│       ├─ 單參數分佈 SQL
│       │   └─ SELECT {param}, COUNT(*) FROM {table} WHERE {基礎條件} GROUP BY {param}
│       └─ 交叉分佈 SQL
│           └─ SELECT {paramA}, {paramB}, COUNT(*) ... GROUP BY 1, 2
```

```
├─ 4. 【撈 DB 測試資料】
│   ├─ （現有）逐 case 執行 SQL
│   │
│   └─ 🆕 篩選參數 cases
│       ├─ 先查資料分佈 → 得到各組合的「預期筆數」
│       ├─ 交叉驗證：子集筆數 ≤ 母集筆數？
│       │   ├─ 是 → ✅ 分佈合理
│       │   └─ 否 → ❌ 篩選邏輯可能有 bug
│       └─ 記錄到 proposal「## DB 測試資料」，標記「🔍」
```

#### Proposal 產出格式擴展

在「## DB 測試資料」區塊中新增：

```markdown
### 🔍 篩選參數資料分佈

**相關參數組**：countyCodes + zipCode + townName（地址篩選組）

| countyCodes | zipCode | townName | DB 筆數 | 備註 |
|-------------|---------|----------|---------|------|
| O | - | - | 1263 | 全新竹市 |
| O | 300 | - | 62 | 只 zipCode=300 |
| O | 300 | 東區 | 50 | 東區 + zipCode=300 |
| O | - | 東區 | 1201 | 跨 zipCode 的東區 |

### 🔍 篩選參數測試 Cases

| # | 情境 | 預期關係 | DB 驗證 | 狀態 |
|---|------|---------|---------|------|
| Q-1 | countyCodes=O 不帶 townName | = 1263（全新竹市） | 1263 | ✅ |
| Q-2 | countyCodes=O + townName=東區 | ≤ Q-1（子集） | 50 ≤ 1263 | ✅ |
| Q-3 | ❌ 異常：API 只帶 countyCodes=O 回傳 62 | 應為 1263 | 62 ≠ 1263 | ❌ |
```

**與前後 skill 的銜接**：

```
/api-flow-architecture → data-flow 文件（含 DTO query parameters + Service WHERE 邏輯）
                              ↓
/reviewDoc -data Step 2.X → 讀取 DTO params，識別相關參數組，推導篩選 cases
/reviewDoc -data Step 3-4 → 撈 DB 分佈，交叉驗證子集關係
                              ↓
                        proposal「## DB 測試資料 → 🔍 篩選參數測試 Cases」
                              ↓
/check-result → 用 cases 中的條件呼叫 API，比對筆數是否與 DB 預期一致
```

**向後相容**：

| 情況 | -data 行為 |
|------|-----------|
| proposal 涉及 findAll + 欄位匹配 query param | 新增篩選 cases + 資料分佈查詢（新行為） |
| proposal 不涉及 findAll | 完全維持現有行為 |
| proposal 涉及 findAll 但無匹配 query param | 完全維持現有行為 |
| data-flow 沒有 DTO query params 資訊 | 跳過（依賴 data-flow 品質） |

**相容性檢查**：

| 檢查項目 | 結果 | 說明 |
|---------|------|------|
| 與 Step 2 現有邏輯 | ✅ | 新增子步驟 2.X，不修改 nullable/FK/softDelete 推導 |
| 與檔案產出擴展 | ✅ | 遵循相同模式：新增 case 來源 + 對應 DB 查詢 |
| 與 data-flow 文件 | ✅ | data-flow 已有 DTO 欄位（含 query params）和 Service 查詢邏輯 |
| 與 Step 1 前置依賴 | ✅ | 仍從 data-flow 文件取得資訊，無新依賴 |
| 與 Step 5 產出格式 | ✅ | 在「## DB 測試資料」追加 `🔍` 標記區塊，與 `📄` 模式並列 |
| 與 `/check-result` 銜接 | ⚠️ 需擴展 | check-result 需新增「用篩選 cases 呼叫 API 比對筆數」驗證 |

**影響**：
- 流程圖：-data 模式 Step 2 新增篩選參數分支、Step 3-4 新增資料分佈查詢
- 定義檔：-data 模式新增觸發判斷 + 參數組識別 + 篩選 cases 推導邏輯
- 輸出格式：Cases 表和 DB 測試資料表新增「🔍」標記

**實作狀態**：
- [x] 設計討論（2026-02-19）
- [x] 記錄到 reviewDoc 設計稿（2026-02-19）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-19 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-19 /updateDesign）
- [ ] 測試驗證

---

### 2026-02-20 設計變更：新增 Step 1.7D「DTO @Type 轉換檢核」

**變更動機**：

`/fix-id-string-number` 掃描了全部 51 個 adminApi 模組，發現 5 個模組的 Request Body DTO 有 `@IsNumber()` 的 `id` 欄位但缺少 `@Type(() => Number)`，導致前端送 string 時驗證失敗。這類問題應在 `/reviewDoc` 階段就被攔截，而不是等到 bug 出現後才修。

**為什麼放 1.7D 而非 Step 12**：

1.7 系列是「主動掃描現有程式碼找問題」的前置檢核，不依賴 proposal 內容。`@Type` 缺失是**現有 DTO 的程式碼品質問題**，不是「proposal 寫錯」，所以屬於 1.7 系列。

Step 12 的職責是「驗證 proposal 內容是否正確」，依賴 Step 6 已讀取的 DTO 結果。若放 Step 12，觸發條件會變成「proposal 修改了 DTO」，但問題可能存在於 proposal 未修改的 DTO 欄位中，會有漏網之魚。

| 比較點 | Step 12 | Step 1.7D |
|--------|---------|-----------|
| 執行時機 | 讀完 proposal 後 | 前置掃描（讀 proposal 前） |
| 職責 | 驗證 proposal 內容是否正確 | 主動掃描現有程式碼找問題 |
| 觸發條件 | proposal 修改了 DTO | 永遠執行（adminApi） |
| 性質 | proposal 寫得對不對 | 現有程式碼有沒有問題 |

**與其他 1.7 系列的相容性**：

| 步驟 | 掃描對象 | 觸發條件 |
|------|---------|---------|
| 1.7A | service 程式碼品質（500 防護、回傳型別） | 永遠執行（adminApi） |
| 1.7E | 檔案上傳邏輯 | 永遠執行（adminApi） |
| 1.7C | 跨模組 Enum/Type/Transform 影響 | proposal 修改了 Enum/Transform |
| 1.7B | Data Flow 交叉檢核 | Step 1.5 有讀取 data-flow |
| **1.7D** | **DTO @Type 轉換** | **永遠執行（adminApi）** |

1.7D 與 1.7A、1.7E 同屬「永遠執行」的主動掃描，邏輯一致。

**變更內容**：

#### Step 1.7D：DTO @Type 轉換檢核

在 1.7E 之後新增 1.7D：

```
1.7D 【DTO @Type 轉換檢核】（永遠執行，僅 adminApi）
│
├─ 定位 module 的所有 *.dto.ts 檔案
│   └─ Glob: src/api/adminApi/{apiName}/**/*.dto.ts
│
├─ 掃描每個 DTO 檔案
│   ├─ Grep @IsNumber() 找出所有位置（含行數）
│   ├─ 每個 @IsNumber() 往下一行確認欄位名是否為 id
│   │   ├─ 匹配 /^\s+id[?]?\s*:\s*number/ → 是 id 欄位
│   │   └─ 不匹配 → 跳過
│   └─ 是 id 欄位 → 往上讀 3-5 行確認 decorator 區塊
│       ├─ 有 @Type(() => Number) → ✅ 已修正，跳過
│       ├─ 有 @Transform( 且含 Number( → ✅ 替代方案，跳過
│       └─ 都沒有 → 判斷 DTO 類別用途
│           ├─ 往上找最近的 class XXX { → 取得類別名
│           ├─ Update*/Create* → ❌ 需補充 @Type(() => Number)
│           ├─ *QueryDto/*FilterDto → ⏭️ 跳過（Query Params 不需要）
│           └─ *ResponseDto/*ResultDto → ⏭️ 跳過（Response 不需要）
│
├─ 有 ❌ → proposal 新增「## DTO @Type 轉換檢核發現」section
│   └─ 每個 CR 含：DTO 類別名、欄位名、行數、建議修改
└─ 無 ❌ → 跳過
```

**建議修改格式**：

```typescript
// ❌ 缺少 @Type
@IsNumber()
@IsNotEmpty()
id: number

// ✅ 補充後
@Type(() => Number)
@IsNumber()
@IsNotEmpty()
id: number
```

**注意事項**：
- `@IsNumber()` 可能帶參數（如 `@IsNumber({}, { each: true })`），掃描時要匹配完整行
- 確認 `Type` 是否已從 `class-transformer` import，若無需補充 import

**適用模式**：一般模式 + again 模式（所有 adminApi proposal）

**影響**：
- 流程圖：1.7E 之後新增 1.7D 子樹
- 定義檔：1.7E 之後新增 1.7D 步驟說明

**實作狀態**：
- [x] 設計討論（2026-02-20）
- [x] 記錄到 reviewDoc 設計稿（2026-02-20）
- [x] 更新 `reviewDoc.md` 定義檔（2026-02-20 /updateDesign）
- [x] 更新 `reviewDoc_flowchart.md` 流程圖（2026-02-20 /updateDesign）
- [ ] 測試驗證
