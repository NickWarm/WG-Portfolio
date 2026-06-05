# /add-pi 設計稿

> 📅 建立日期：2026-02-07

---

## 問題描述

### 現況痛點

| 痛點 | 說明 |
|------|------|
| Data-flow 潛在問題沒有被修 | `/reviewDoc -c/-s/-df` 和 `/api-flow-architecture` 已發現很多問題，但只記錄在 data-flow 文件，沒有進入修復流程 |
| 一直等 QA 回報 | QA retest 時才發現已知問題，來回多次才修完 |
| `/debugP` 只讀結構不讀問題 | Step 4.0 讀 data-flow 當結構參考，但不讀 `## 問題清單` |
| `/reviewDoc` 只做 pattern 檢查 | Step 1.7 只檢查 3 種 pattern（參數不一致、500 防護、回傳型別），不讀已知問題清單 |

### 預期效益

1. **一次納入真正的潛在問題**：data-flow 的 `❌` 問題全部寫入，`⚠️` 經篩選後寫入 proposal
2. **三層防護**：`/debugP`（分析 bug）→ `/add-pi`（納入潛在問題）→ `/reviewDoc`（統一 review）
3. **一次修完**：`/implement` 時同時處理 QA 報的 bug + data-flow 已知問題，不用等 QA 回報

---

## 執行流程圖

```
/add-pi 執行流程
│
├─ 1. 【定位來源】
│   ├─ 從對話上下文取得 proposal 路徑
│   ├─ 讀取 proposal，搜尋「## API Data Flow 參照」
│   │   ├─ 有 → 提取 data-flow 文件路徑
│   │   └─ 沒有 → 從 proposal 推斷 apiName
│   │       ├─ 搜尋 6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md
│   │       ├─ 找到 → 繼續
│   │       └─ 沒找到 → 提示「請先執行 /api-flow-architecture」→ 結束
│   └─ 讀取 data-flow 文件
│
├─ 2. 【提取所有已知問題】
│   ├─ 「## 問題清單」→ 所有 ❌ 和 ⚠️ 問題（含各子表格）
│   ├─ 「## 500 防護檢查 → 500 路徑清單」→ ⚠️ 未防護路徑
│   ├─ 「## 資料流驗證 → 資料流斷點彙總」→ ❌ 和 ⚠️ 斷點
│   ├─ 「-c 檢查發現的問題」→ UI component 發現
│   ├─ 「-s 檢查發現的問題」→ Situation 發現
│   └─ 合併去重 → 完整問題列表
│
├─ 2.5 【⚠️ 問題篩選】（v1.1 新增）
│   ├─ ❌ 問題 → 全部保留（不篩選）
│   ├─ ⚠️ 問題 → 逐一判斷是否為「真正的潛在問題」
│   │   ├─ 排除：前端已防護（描述含 catch/fallback/disabled/v-if 防護）
│   │   ├─ 排除：無人使用（標註「無前端頁面」「前端未使用」的 API/欄位）
│   │   ├─ 排除：冗餘欄位（類型為「API 回傳但前端未使用」）
│   │   └─ 保留：可能導致錯誤、500、資料不正確的問題
│   └─ 輸出篩選後的問題列表
│
├─ 3. 【比對 proposal 現有內容】
│   ├─ 掃描 proposal 已有的修改建議
│   ├─ 已涵蓋的 → 標記「✅ 已涵蓋於 § 解法 N」
│   └─ 未涵蓋的 → 標記「🆕 需新增」
│
├─ 4. 【寫入 proposal】
│   ├─ 全部已涵蓋 → 不新增區塊，顯示「✅ 已涵蓋所有已知問題」→ 結束
│   └─ 有未涵蓋 → 新增「## 已知潛在問題（Data Flow）」
│       ├─ 來源標註（data-flow 路徑）
│       ├─ ❌ 需修正：問題表格 + 每個問題的建議修改方式
│       └─ ⚠️ 注意事項：問題表格
│
└─ 5. 【輸出】
    ├─ 納入 N 個已知問題（M 個 ❌ + K 個 ⚠️）
    ├─ 其中 X 個已被 proposal 涵蓋
    └─ 提示：「請執行 /reviewDoc 統一檢核」
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| 無 | - | 從對話上下文自動判斷 proposal | - |

> 💡 不需要參數，因為 `/add-pi` 預期在 `/debugP` 之後執行，對話上下文中一定有 proposal 路徑。

---

## 輸出格式

### Proposal 寫入的區塊 — 有未涵蓋的問題

```markdown
## 已知潛在問題（Data Flow）

> 📊 來源：`prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md`
> 🎯 目標：與本次 bug 修復一併處理

### ❌ 需修正（N 項）

| # | 類型 | 問題描述 | 位置 | 狀態 |
|---|------|---------|------|------|
| DF-1 | Request 欄位名不匹配 | 前端送 `landNumber`，後端 DTO 為 `landNoSearch` | add.vue:110 → FindAllForCreateEdmDto | 🆕 需新增 |
| DF-6 | Response 欄位缺失 | `layoutRoom` 未在 DTO 定義，套印為空白 | DialogEdmAddTemplate.vue:358 | ✅ 已涵蓋於 § 解法 2 |

#### DF-1：landNumber → landNoSearch 欄位名不匹配

**問題**：前端送 `landNumber`，後端 DTO 為 `landNoSearch`，地號篩選完全無效

**建議修改**：
- 後端 DTO 新增 `landNumber` alias 參數，保留原本 `landNoSearch`
- Service 合併處理：`dto.landNoSearch || dto.landNumber`
- 同 API module 中所有用到 `landNoSearch` 的 endpoint 都要加 alias

#### DF-2：...

（每個 🆕 問題一個子章節，含問題描述 + 建議修改方式）

### ⚠️ 注意事項（K 項）

| # | 類型 | 問題描述 | 位置 |
|---|------|---------|------|
| 12 | 型別不一致 | storeIds 前端傳 number，後端用字串篩選 | list.vue:166 |
| 13 | 500 低風險 | allStores scope 不驗證 storeId 是否存在 | EdmService.create |
```

### 對話框輸出 — 有未涵蓋的問題

```
✅ 已知潛在問題已納入 proposal

📄 Proposal：{proposal_path}
📊 來源：{data-flow_path}
📍 納入 12 個已知問題（6 個 ❌ + 6 個 ⚠️）
   其中 2 個已被 proposal 涵蓋

────────────────────────────────────
📝 提醒：請執行 /reviewDoc 統一檢核
────────────────────────────────────
```

### 對話框輸出 — 全部已涵蓋

```
✅ 已涵蓋所有已知問題

📄 Proposal：{proposal_path}
📊 來源：{data-flow_path}
📍 data-flow 共 12 個已知問題，全部已被 proposal 涵蓋
```

### 對話框輸出 — 無問題

```
ℹ️ data-flow 文件沒有已知問題

📄 Proposal：{proposal_path}
📊 來源：{data-flow_path}
📍 問題清單、500 防護、資料流斷點彙總均無 ❌/⚠️ 問題
```

---

## 實作細節

### Data-flow 問題來源對照

| 區塊標題 | 搜尋方式 | 提取內容 |
|---------|---------|---------|
| `## 問題清單` | 搜尋 h2 標題 | 底下所有 `### ❌` 和 `### ⚠️` 子表格 |
| `## 500 防護檢查` | 搜尋 h2 標題 | `### 500 路徑清單` 表格中 ⚠️ 項目 |
| `## 資料流驗證` | 搜尋 h2 標題 | `### X.3 資料流斷點彙總` 表格中 ❌ 和 ⚠️ 項目 |
| `-c 檢查發現的問題` | 搜尋 h3 標題 | 表格中所有問題 |
| `-s 檢查發現的問題` | 搜尋 h3 標題 | 表格中所有問題 |

> 💡 以上區塊不一定全部存在（例如沒跑過 `-c`/`-s` 就沒有對應區塊），找不到就跳過。

### 去重邏輯

data-flow 文件中同一個問題可能出現在多個區塊（例如「前後端欄位名不匹配」同時出現在問題清單和資料流斷點彙總）。去重規則：

1. **以問題描述 + 位置**作為唯一鍵
2. 重複出現時，保留**嚴重度最高**的（❌ > ⚠️ > ℹ️）
3. 合併後統一編號

### 比對 proposal 現有內容

掃描 proposal 中以下區塊，判斷問題是否已涵蓋：

| 掃描的 proposal 區塊 | 比對方式 |
|---------------------|---------|
| `## 解法 N` | 問題描述的關鍵字（欄位名、檔案路徑）是否出現在解法中 |
| `## 後端修改` | 修改的檔案和欄位是否對應 |
| `## 前端修改` | 修改的檔案和欄位是否對應 |
| `## Data Flow 交叉檢核發現` | `/reviewDoc` Step 1.7 已發現的問題 |

### 寫入位置

- 新增的「## 已知潛在問題（Data Flow）」區塊放在 proposal **末尾**
- 如果 proposal 有「## 修改檔案清單」，放在它**之前**
- 如果 proposal 已有「## 已知潛在問題（Data Flow）」→ **覆蓋更新**（重跑時）

### ⚠️ 問題篩選規則（v1.1 新增）

> **設計理由**：data-flow 的 ⚠️ 包含大量「觀察/記錄」性質的內容（如「API 回傳但前端未使用」「前端已有 fallback」），這些不是需要處理的潛在問題。不篩選會導致垃圾進垃圾出，增加 proposal 噪音。

**❌ 問題**：全部保留，不篩選

**⚠️ 問題**：逐一判斷，符合以下任一條件的**排除**：

| 排除條件 | 判斷依據 | 排除範例 |
|---------|---------|---------|
| 前端已防護 | 描述含「前端 catch」「前端 fallback」「`:disabled`」「v-if 防護」等 | downloadUrl nullable（前端已用 `:disabled` 防護） |
| 無人使用 | 標註「無前端頁面」「前端未使用」的 API 或欄位 | findOne 無前端頁面、fileSize 固定 0 |
| 冗餘欄位 | 類型為「API 回傳但前端未使用」 | Response unused fields（多回傳不影響功能） |

**保留的 ⚠️**：可能導致**錯誤、500、資料不正確**的問題（如 FK 未驗證、型別不一致、label 誤導）

### 注意事項

- **❌ 全部納入，⚠️ 需經篩選**：排除已防護/無人用/冗餘，只保留真正可能出錯的問題
- **建議修改方式只針對 ❌ 問題**：⚠️ 問題只列表，不寫建議修改
- **不修改 data-flow 文件**：只讀取，不寫入
- **可重複執行**：重跑時覆蓋更新已有的「## 已知潛在問題」區塊
- **前後端欄位名不匹配的修法方向**：後端加開 alias 相容前端，保留原本參數名，不改前端。Input/Output 都要處理，同 API module 中所有同類問題統一處理。詳見 `/dpf` 設計稿「欄位名不匹配統一修法規則」

---

## 三層防護流程

```
工作流程
│
├─ /debugP（第一層：分析 bug）
│   ├─ Step 4.0：讀 data-flow → 結構參考（不變）
│   └─ Step 6：產出 proposal（只處理 QA 報的 bug）
│
├─ /add-pi（第二層：納入已知問題）
│   ├─ 從 proposal 取得 data-flow 路徑
│   ├─ 讀取所有問題區塊
│   ├─ 篩選 ⚠️ 問題（排除已防護/無人用/冗餘）
│   └─ 篩選後的問題寫入 proposal「## 已知潛在問題（Data Flow）」
│
├─ /reviewDoc（第三層：統一 review）
│   ├─ Step 1.7：交叉檢核（原有 3 項 + 🆕 已知問題覆蓋檢核）
│   │   ├─ 有「## 已知潛在問題」→ 檢核完整性
│   │   └─ 沒有 + data-flow 有問題 → ⚠️ 警告遺漏
│   └─ Step 14：統一回報
│
└─ /implement → 一次修完
```

### 串接點

| 接口 | 上游 | 下游 | 串接方式 |
|------|------|------|---------|
| proposal 路徑 | `/debugP` Step 6 產出 | `/add-pi` 從對話上下文取得 | 跟 `/fxxxf2e` 相同模式 |
| data-flow 路徑 | proposal「## API Data Flow 參照」 | `/add-pi` 從 proposal 提取 | `/reviewDoc` Step 1.5 已有相同邏輯 |
| 已知問題區塊 | `/add-pi` 寫入 proposal | `/reviewDoc` Step 1.7 讀取檢核 | 固定 section 標題對接 |

---

## `/reviewDoc` Step 1.7 擴充設計

現有的 3 項 pattern 檢核不變，新增「已知問題覆蓋檢核」：

```
Step 1.7【Data Flow 交叉檢核】（擴充）
│
├─ 原有檢核（不變）
│   ├─ 參數不一致（DTO vs 前端）
│   ├─ 500 防護缺失（executeWithDbErrorHandling）
│   └─ 回傳型別不一致（DashboardServiceResponse<T>）
│
└─ 🆕 已知問題覆蓋檢核
    ├─ Step 1.5 有讀取 data-flow 時才執行
    ├─ 讀取 data-flow 的「## 問題清單」+「## 資料流斷點彙總」
    ├─ 比對 proposal 是否有「## 已知潛在問題（Data Flow）」
    │   ├─ 有 → 檢核：所有 ❌ 問題是否都有涵蓋
    │   │   ├─ 全涵蓋 → ✅
    │   │   └─ 有遺漏 → ❌ 列出遺漏的問題
    │   └─ 沒有 + data-flow 有 ❌ 問題 → ⚠️ 警告：
    │       └─ 「data-flow 有 N 個已知問題未納入，建議執行 /add-pi」
    └─ 輸出到檢核結果
```

---

## v1.2 設計變更：Step 1 data-flow 搜尋路徑強制約束（2026-02-09）

### 問題描述

**實際案例**：執行 `/add-pi` 處理 transcript API 的 Proposal 5 時，AI 在 Step 1「沒有 API Data Flow 參照」分支，沒有按照定義檔搜尋 `6_api_data_flow/`，而是自行在 `4_diary/transcript_api/` 底下用 Glob 搜尋 `*data*flow*`，找不到後直接判定「沒有 data-flow 文件」並結束。

**實際存在的文件**：`prompts/6_api_data_flow/adminApi/transcript-data-flow.md`

**根本原因**：Step 1 的搜尋路徑描述不夠明確，缺少強制約束和具體範例，AI 容易自行猜測路徑。

### 修正內容

**Step 1 定義檔新增以下約束**：

```
⚠️ 搜尋路徑強制約束：
- ✅ 唯一搜尋目錄：prompts/6_api_data_flow/adminApi/ 和 prompts/6_api_data_flow/publicApi/
- ❌ 禁止在 4_diary/ 底下搜尋 data-flow 文件
- ❌ 禁止用 Glob 模糊搜尋 *data*flow*，必須用精確檔名 {apiName}-data-flow.md
```

**apiName 推斷規則**（從 proposal 路徑或內容）：

```
proposal 路徑含 transcript_api → apiName = transcript
proposal 路徑含 customer_api → apiName = customer
proposal 路徑含 {xxx}_api → apiName = {xxx}
proposal 內容的 API 路徑含 /api/v1/{xxx} → apiName = {xxx}
```

**搜尋順序**：

```
1. prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md
2. prompts/6_api_data_flow/publicApi/{apiName}-data-flow.md
3. 都沒找到 → 提示「請先執行 /api-flow-architecture」
```

### 流程圖變更

Step 1 的「沒有 → 從 proposal 推斷 apiName」分支需要更新：

```
│   │   └─ 沒有 → 從 proposal 推斷 apiName
│   │       ├─ 推斷規則：路徑含 {xxx}_api → apiName = {xxx}
│   │       ├─ ⚠️ 唯一搜尋目錄：prompts/6_api_data_flow/{adminApi|publicApi}/
│   │       ├─ 精確搜尋：{apiName}-data-flow.md（禁止 Glob 模糊搜尋）
│   │       ├─ 找到 → 繼續
│   │       └─ 沒找到 → 提示「請先執行 /api-flow-architecture」→ 結束
```

---

## 待辦事項

- [x] 設計討論（2026-02-07）
- [x] 建立設計稿（2026-02-07）
- [x] 用戶確認設計稿（2026-02-07）
- [x] 建立定義檔：`backend-nestjs/.claude/commands/add-pi.md`（2026-02-07）
- [x] 建立流程圖：`backend-nestjs/.claude/flowcharts/add-pi_flowchart.md`（2026-02-07）
- [x] 更新 `/reviewDoc` 定義檔 + 流程圖：Step 1.7 已知問題覆蓋檢核（2026-02-07）
- [x] v1.1 設計變更：新增 Step 2.5 ⚠️ 問題篩選（2026-02-07）
- [x] v1.2 設計變更：Step 1 data-flow 搜尋路徑強制約束（2026-02-09）
- [x] v1.2 更新定義檔 + 流程圖（2026-02-09，/updateDesign 執行）
- [ ] 測試驗證

---

### 2026-02-09 設計變更：新增最終步驟「更新進度表」

**變更內容**：在 skill 最後步驟完成後，自動執行 `@.claude/flowcharts/update-progress.md` 共用模組，將 proposal 進度表中 `/add-pi` 對應的行標記為 ✅。

**設計背景**：見 `showFlow_skill_proposal.md`「2026-02-09 設計變更」。

**影響**：
- 流程圖：最後節點後新增「更新進度表」
- 定義檔：最後 Step 後新增引用 `@.claude/flowcharts/update-progress.md`
