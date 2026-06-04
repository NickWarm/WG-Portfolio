# api-flow-architecture 設計稿

> 📅 建立日期：2026-02-07
> 📋 來源：`check_result_field_verification_gaps.md` 中的獨立 Skill 設計

---

## 問題描述

每次跑 `/debugP` 或 `/reviewDoc` 時，都要從零搜尋同一個 API 的後端結構（Entity、DTO、Service select/relations、Controller 路由），浪費大量 token 和時間。

這些後端結構資訊對同一個 API 來說是**相對穩定的**，不會每張票都變，應該像前端的 `ui-api-index` 一樣集中管理、持久化。

### 現況痛點

- 每張票都從零搜尋 Entity 欄位、DTO 定義、Service select/relations
- 同一個 API 的結構資訊散落在各張票的 proposal 中，無法跨票複用
- 沒有「上次掃描到哪」的紀錄，無法做漸進式更新

### 預期效益

- 每個 API 一份持久化的後端結構文件，跨票複用
- 漸進式更新：用 scan-meta（commit hash）+ git diff 偵測變更，只重新分析有變的部分
- `/debugP`、`/reviewDoc`、`/review-api-flow` 都能查表使用，不用從零搜尋

---

## 定位與分工

| Skill | 職責 |
|-------|------|
| **api-flow-architecture** | 建立/維護**後端** API 結構文件（Entity、DTO、Service、Controller 的結構性事實） |
| **review-api-flow** | **前後端流程對齊檢查**（含 `-c/-s/-df` 邏輯），消費 api-flow-architecture 產出的文件 |

`api-flow-architecture` **不做**前後端對齊檢查、不讀前端索引表、不做 500 防護分析。這些都是 `review-api-flow` 的工作。

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` (apiName) | 是 | API module 名稱 | `transcript`、`estateSalesDetail`、`customer` |
| `--full` | 否 | 強制全量掃描（忽略現有文件） | `/api-flow-architecture transcript --full` |

### 使用範例

```bash
# 首次建立（自動偵測為全量掃描）
/api-flow-architecture transcript

# 再次執行（自動偵測為漸進式更新）
/api-flow-architecture transcript

# 強制全量重建
/api-flow-architecture transcript --full
```

---

## 掃描模式判斷

| 條件 | 模式 | 行為 |
|------|------|------|
| 文件不存在 | 全量掃描 | 讀取所有後端程式碼，建立完整文件 |
| 文件存在 + 無 `--full` | 漸進式更新 | 偵測變更，只重新分析有變的部分，merge 回現有文件 |
| 文件存在 + 有 `--full` | 全量掃描 | 忽略現有文件，從零重建 |

---

## 產出檔案

### 存放位置

```
prompts/6_api_data_flow/
├─ adminApi/
│   ├─ bid-data-flow.md
│   ├─ contract-data-flow.md
│   ├─ customer-data-flow.md
│   ├─ estateListing-data-flow.md
│   ├─ estateSalesDetail-data-flow.md
│   └─ ...
└─ publicApi/
    ├─ realEstate-data-flow.md
    └─ ...
```

一個 API 對應一個 `{apiName}-data-flow.md` 檔案。

### 產出檔案結構

```markdown
# {apiName} 資料流索引

## 基本資訊
- Module: {apiName}
- API 目錄: adminApi / publicApi
- 對應前端專案: dashboard-nuxt / frontend-nuxt
- 最後更新: YYYY-MM-DD

---

## Entity 結構

<!-- scan-meta: commit=abc1234, date=2026-02-07 -->

### {EntityName}

| 欄位 | 型別 | nullable | 說明 |
|------|------|----------|------|
| id | int | NO | PK |
| name | varchar | NO | 名稱 |
| storeId | int | YES | FK → Store |
| ... | ... | ... | ... |

### 關聯

| 關聯名稱 | 型別 | 目標 Entity | 說明 |
|---------|------|------------|------|
| store | ManyToOne | Store | 店家 |
| bids | OneToMany | Bid | 出價紀錄 |
| ... | ... | ... | ... |

---

## DTO 欄位定義

<!-- scan-meta: commit=abc1234, date=2026-02-07 -->

### Response DTO

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | number | |
| name | string | |
| storeName | string | 從 store 關聯取得 |
| ... | ... | ... |

### Create DTO

| 欄位 | 型別 | 必填 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| name | string | 是 | @IsNotEmpty | |
| storeId | number | 否 | @IsOptional | FK → Store |
| ... | ... | ... | ... | ... |

### Update DTO

| 欄位 | 型別 | 必填 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| ... | ... | ... | ... | ... |

---

## Service 查詢結構

<!-- scan-meta: commit=abc1234, date=2026-02-07 -->

### findOne

```typescript
select: [id, name, storeId, ...]
relations: { store: true, agent: true }
```

### findAll

```typescript
select: [id, name, ...]
relations: { store: true }
where: { ... }
orderBy: { ... }
```

### 其他方法

| 方法 | 用途 | DB 操作 |
|------|------|---------|
| create | 新增 | save |
| update | 更新 | update |
| remove | 刪除 | softRemove |
| ... | ... | ... |

---

## Controller 路由結構

<!-- scan-meta: commit=abc1234, date=2026-02-07 -->

| 方法 | 路由 | Handler | 說明 |
|------|------|---------|------|
| GET | /{apiName}/:id | findOne | 取得單筆 |
| GET | /{apiName} | findAll | 取得列表 |
| POST | /{apiName} | create | 新增 |
| PATCH | /{apiName}/:id | update | 更新 |
| DELETE | /{apiName}/:id | remove | 刪除 |
| ... | ... | ... | ... |
```

### scan-meta 格式

每個區塊用 HTML comment 記錄上次掃描的 commit：

```markdown
<!-- scan-meta: commit=abc1234, date=2026-02-07 -->
```

漸進式更新時，比對 `scan-meta` 的 commit 與當前 HEAD，判斷該區塊是否需要重新掃描。

---

## 漸進式更新機制

### 偵測變更

```bash
# 比對上次 commit 到現在，{apiName}/ 目錄下有哪些檔案變更
git diff --name-only {last-commit}..HEAD -- src/api/**/{apiName}/
```

### 分類變更

| 變更檔案 | 影響區塊 | 重新分析內容 |
|---------|---------|-------------|
| `*.entity.ts` | Entity 結構 | DB table、欄位、關聯 |
| `*.dto.ts` | DTO 欄位定義 | create/update/response 欄位 |
| `*.service.ts` | Service 查詢結構 | select/relations、業務邏輯 |
| `*.controller.ts` | Controller 路由結構 | 路由、參數、錯誤處理 |

### Merge 策略

- 保留未變更的區塊（不動）
- 替換有變更的區塊（重新分析後覆蓋）
- 更新對應區塊的 scan-meta（commit hash + 日期）

---

## 需要讀取的檔案

### 全量掃描模式

| 檔案 | 用途 |
|------|------|
| `src/api/{adminApi\|publicApi}/{apiName}/*.entity.ts` | Entity 結構 |
| `src/api/{adminApi\|publicApi}/{apiName}/dto/*.dto.ts` | DTO 定義 |
| `src/api/{adminApi\|publicApi}/{apiName}/*.service.ts` | Service 查詢 |
| `src/api/{adminApi\|publicApi}/{apiName}/*.controller.ts` | Controller 路由 |

### 漸進式更新模式

只讀取 git diff 顯示有變更的檔案。

---

## 與其他 Skill 的關係

### 消費者

| Skill | 如何使用 api-flow-architecture 產出 |
|-------|--------------------------------------|
| `/debugP` | 分析階段查 API 結構文件，跳過重複搜尋 Service select、DTO 等 |
| `/reviewDoc` | 檢核階段查 API 結構文件，直接取得基礎資料 |
| `/review-api-flow` | 讀取後端結構文件，搭配前端索引表做前後端對齊檢查 |

### scan-meta 更新時機

| 時機 | 誰更新 |
|------|--------|
| 執行 `/api-flow-architecture` | 本 skill 自己更新 |
| 執行 `/review-api-flow` | review-api-flow 分析完後更新 |
| 執行 `/gcommit-push` | gcommit-push 完成後更新對應 API 的 scan-meta commit 代碼 |

---

## 實作狀態

- [x] 設計討論（2026-02-07）
- [x] 設計稿完成
- [x] 建立流程圖（`api-flow-architecture_flowchart.md`）
- [x] 建立定義檔（`api-flow-architecture.md`）
- [x] 建立 `prompts/6_api_data_flow/` 目錄結構
- [ ] 測試驗證

---

## 2026-02-08 設計變更：新增 -p 參數（進度追踪）

### 問題描述

需要一個統一的方式查看所有 API 的執行進度：
- 哪些 API 已經執行過 api-flow-architecture
- 哪些 API 已經執行過 review-api-flow 的 -c/-s/-df 檢查
- 每個 API 發現了多少問題
- 整體進度如何

### 設計決策

新增 `-p` 參數（progress 的縮寫），用於進度追踪：

**參數行為**：
```bash
/api-flow-architecture -p
```

**行為邏輯**：
- **進度表不存在** → 建立總進度表（掃描 `6_api_data_flow/` 目錄）
- **進度表已存在** → 顯示當前 API 進度摘要

**進度表位置**：
```
prompts/6_api_data_flow/api-flow-progress.md
```

### 自動更新機制

**觸發時機**：
- 執行 `/api-flow-architecture {apiName}` 完成後
- 執行 `/review-api-flow {apiName}` 完成後

**自動執行**：
1. 更新對應 API 的進度狀態
2. 更新問題統計
3. Git commit 進度表變更

### 進度表結構

```markdown
# API Data Flow 執行進度總表

> 📅 最後更新：2026-02-08
> 📊 總計：N 個 API

## 進度統計

| 狀態 | 數量 | 百分比 |
|------|------|--------|
| ✅ 完整檢查（architecture + review） | X | XX% |
| ⏳ 僅 architecture | Y | YY% |
| ⏸️ 尚未執行 | Z | ZZ% |

---

## adminApi

### {apiName}

**目前進度**：
- ✅/⏸️ /api-flow-architecture {apiName} — 完成/尚未執行
- ✅/⏸️ /review-api-flow -c — 完成（N 個問題）/尚未執行
- ✅/⏸️ /review-api-flow -s — 完成（N 個問題）/尚未執行
- ✅/⏸️ /review-api-flow -df — 完成（N 個問題）/尚未執行

**問題統計**：
- ❌ 嚴重問題：N 個
- ⚠️ 注意事項：N 個

**Data Flow 文件**：`prompts/6_api_data_flow/adminApi/{apiName}-data-flow.md`
```

### 修改內容

**1. 參數說明更新**：

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` (apiName) | 否 | API module 名稱 | `transcript`、`estateSalesDetail` |
| `-p` | 否 | 顯示/建立進度表 | `/api-flow-architecture -p` |
| `--full` | 否 | 強制全量掃描 | `/api-flow-architecture transcript --full` |

**2. 執行流程新增**：

- 檢測到 `-p` 參數時，進入進度追踪模式
- 掃描 `6_api_data_flow/` 目錄，統計所有 API 執行狀態
- 建立或更新進度表

**3. 自動更新邏輯**：

- 每次執行 `/api-flow-architecture {apiName}` 完成後，自動更新進度表
- 自動 git commit 進度表變更

### 實作要點

1. **參數優先順序**：`-p` > `apiName` > 報錯
2. **進度表初始化**：首次執行 `-p` 時掃描所有已存在的 data-flow 文件
3. **自動更新時機**：在 Step 6（輸出結果）之後執行
4. **Git commit 自動化**：更新進度表後自動提交到 prompts 專案

---

## 2026-02-08 設計變更：-p 掃描範圍修正 + data-flow commit 機制

### 問題 1：-p 模式只掃描已建立的 data-flow 文件

**現況**：-p 建立進度表時，只掃描 `6_api_data_flow/adminApi/` 和 `6_api_data_flow/publicApi/` 目錄下已存在的 `*-data-flow.md` 檔案。

**結果**：進度表只會列出已執行過 `/api-flow-architecture` 的 API（如 edm、caseStudy、transcript），看不到尚未執行的 API，無法掌握整體進度。

**修正**：-p 模式改為掃描 backend-nestjs 的 API 目錄，比對 data-flow 判斷狀態。

**修正後的 -p 建立進度表流程**：

```
進度表不存在 → 建立總進度表
│
├─ 1. 掃描 backend-nestjs/src/api/adminApi/ 列出所有子目錄
├─ 2. 掃描 backend-nestjs/src/api/publicApi/ 列出所有子目錄
├─ 3. 排除非 API 目錄（guards、interceptors、middlewares、auth）
├─ 4. 比對 6_api_data_flow/ 判斷每個 API 的狀態：
│   ├─ 有 data-flow 文件 + 有 review-api-flow 區塊 → ✅ 完整檢查
│   ├─ 有 data-flow 文件 + 無 review-api-flow 區塊 → ⏳ 僅 architecture
│   └─ 無 data-flow 文件 → ⏸️ 尚未執行
└─ 5. 建立進度表（包含所有 API）
```

**排除清單**（非 API 目錄）：
- `guards`
- `interceptors`
- `middlewares`
- `auth`

**判斷方式**：目錄下沒有 `*.controller.ts` 的就不是 API 目錄，可用此作為過濾條件。

### 問題 2：建立 data-flow 文件後沒有 git commit

**現況**：Step 6「寫入 API Data Flow Index」建立/更新 `{apiName}-data-flow.md` 後，沒有 git commit。Step 7「更新進度表」有 commit 進度表，但沒有 commit data-flow 文件本身。

**結果**：data-flow 文件一直處於未 commit 狀態，無法被 git diff 追蹤變更。

**修正**：Step 6 完成後，立即 git commit data-flow 文件。

**修正後的 Step 6 流程**：

```
Step 6. 寫入 API Data Flow Index
│
├─ 全量模式 → 建立完整的 {apiName}-data-flow.md
├─ 漸進模式 → merge 變更區塊，保留未變更區塊
├─ 更新各區塊的 scan-meta（commit hash + 日期）
└─ Git commit data-flow 文件 ✅（新增）
    ```bash
    cd /Users/nicholas/Desktop/Projects/prompts
    git add 6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md
    git commit -m "api-flow-architecture: {apiName} 結構文件建立完成"
    ```
```

### 修改影響

| 影響的步驟 | 修改內容 |
|-----------|---------|
| Step 1（-p 模式） | 掃描 backend-nestjs API 目錄，比對 data-flow 判斷狀態 |
| Step 6 | 寫入文件後加入 git commit |

---

## 2026-02-08 設計變更：-p 模式建立/更新進度表後缺少 git commit

### 問題描述

-p 模式建立或更新進度表後，沒有 git commit 進度表檔案。

**根因**：Step 1 的 -p 模式完成後直接跳到 Step 9 輸出結果，跳過了 Step 8（更新進度表）。但 Step 8 的 git commit 邏輯是針對「API 結構文件模式」設計的（更新已存在的進度表中某個 API 的狀態），不適用於 -p 模式（建立或顯示整份進度表）。

**結果**：執行 `/api-flow-architecture -p` 後，`api-flow-progress.md` 一直處於未 commit 狀態。

### 修正

在 Step 1 的 -p 模式流程中，建立或更新進度表後，加入 git commit。

**修正後的 -p 模式流程**：

```
進度追踪模式（-p）
│
├─ 進度表不存在 → 建立總進度表
│   ├─ 掃描 backend-nestjs API 目錄
│   ├─ 比對 6_api_data_flow/ 判斷狀態
│   └─ 建立進度表
│
├─ 進度表已存在 → 重新掃描並更新進度表
│   ├─ 重新掃描 backend-nestjs API 目錄
│   ├─ 比對 6_api_data_flow/ 更新各 API 狀態
│   └─ 更新進度統計
│
├─ Git commit 進度表 ✅（新增）
│   ```bash
│   cd /Users/nicholas/Desktop/Projects/prompts
│   git add 6_api_data_flow/api-flow-progress.md
│   git commit -m "api-flow-architecture: 更新 API Flow 進度表"
│   ```
│
└─ 跳到 Step 9 輸出結果
```

### 修改影響

| 影響的步驟 | 修改內容 |
|-----------|---------|
| Step 1（-p 模式） | 建立/更新進度表後加入 git commit |
| 流程圖 Step 1 | -p 模式加入 Git commit 進度表 ✅ |

---

## 2026-02-08 設計變更：-p 已存在時不應重掃，改為顯示摘要

### 問題描述

上一輪修正將「-p 已存在」的行為從「顯示進度摘要」改為「重新掃描並更新進度表」，這不符合原始設計意圖。

**原始設計意圖**：
- `-p` 不存在 → 掃描 backend-nestjs 建立進度表 → git commit
- `-p` 已存在 → 讀取進度表 → 顯示摘要（哪些完成、哪些沒有）→ 不修改、不 commit

**更新 progress 內容的職責分工**：
- `/api-flow-architecture {apiName}` 的 Step 8：更新該 API 的 `/api-flow-architecture` 狀態為 ✅ → git commit
- `/review-api-flow {apiName}` 的 Step 8：更新該 API 的 `/review-api-flow` 狀態為 ✅ → git commit
- `-p` 模式：只負責「建立」和「顯示」，不負責更新個別 API 狀態

### 修正

將「-p 已存在」改回「顯示進度摘要」，git commit 只在「不存在 → 建立」時執行。

**修正後的 -p 模式流程**：

```
進度追踪模式（-p）
│
├─ 進度表不存在 → 建立總進度表
│   ├─ 掃描 backend-nestjs API 目錄
│   ├─ 比對 6_api_data_flow/ 判斷狀態
│   ├─ 建立進度表
│   └─ Git commit 進度表 ✅
│       ```bash
│       cd /Users/nicholas/Desktop/Projects/prompts
│       git add 6_api_data_flow/api-flow-progress.md
│       git commit -m "api-flow-architecture: 建立 API Flow 進度表"
│       ```
│
├─ 進度表已存在 → 顯示進度摘要
│   ├─ 讀取進度表
│   ├─ 統計完成/進行中/未執行的 API 數量
│   └─ 顯示進度統計（不修改、不 commit）
│
└─ 跳到 Step 9 輸出結果
```

### 修改影響

| 影響的步驟 | 修改內容 |
|-----------|---------|
| Step 1（-p 已存在） | 改回「顯示進度摘要」，不重掃、不 commit |
| Step 1（-p 不存在） | git commit 移到建立進度表流程內（僅建立時 commit） |
| 定義檔 Step 1 | 同步修正 |
| 流程圖 Step 1 | 同步修正 |

---

## 2026-02-08 設計變更：分段寫入（Step 5+6+7 拆分為逐區塊處理）

### 問題描述

目前 Step 5/6/7 的流程是：

```
Step 5: 讀取所有後端程式碼（Entity + DTO + Service + Controller 全部讀完）
  ↓
Step 6: 建立所有結構文件（四個區塊全部在 context 中累積）
  ↓
Step 7: 一次性寫入整份 data-flow 文件 + 一次 git commit
```

**問題**：
- 四個區塊全部累積在 context 中，context 消耗大
- 如果 AI 中途 crash 或 context 爆炸，所有已完成的分析結果都丟失
- 漸進式更新時，明明只有某個區塊有變，卻要等所有區塊都處理完才 commit
- 與 `/review-api-flow` Step 4/5/6/7 的分段 commit 設計不一致

### 設計決策

**核心原則**：每個區塊（Entity/DTO/Service/Controller）獨立處理，讀完就寫入、commit，再處理下一個。

**修改後的流程**：

```
全量模式：逐區塊處理
│
├─ 5a+6a+7a. 【Entity】
│   ├─ 讀取 *.entity.ts
│   ├─ 分析 Entity 結構（table、欄位、關聯）
│   ├─ 寫入 data-flow 文件的 Entity 區塊 + scan-meta
│   └─ Git commit: "api-flow-architecture: {apiName} Entity 結構建立完成"
│
├─ 5b+6b+7b. 【DTO】
│   ├─ 讀取 dto/*.dto.ts
│   ├─ 分析 DTO 定義（Response/Create/Update + 驗證規則）
│   ├─ 寫入 data-flow 文件的 DTO 區塊 + scan-meta
│   └─ Git commit: "api-flow-architecture: {apiName} DTO 定義建立完成"
│
├─ 5c+6c+7c. 【Service】
│   ├─ 讀取 *.service.ts
│   ├─ 分析 Service 結構（select/relations、方法清單）
│   ├─ 寫入 data-flow 文件的 Service 區塊 + scan-meta
│   └─ Git commit: "api-flow-architecture: {apiName} Service 結構建立完成"
│
└─ 5d+6d+7d. 【Controller】
    ├─ 讀取 *.controller.ts
    ├─ 分析 Controller 結構（路由、參數、Guard）
    ├─ 寫入 data-flow 文件的 Controller 區塊 + scan-meta
    └─ Git commit: "api-flow-architecture: {apiName} Controller 結構建立完成"
```

```
漸進模式：只處理有變的區塊
│
├─ git diff 分類 → 找出哪些區塊有變
│
├─ Entity 有變？
│   ├─ 是 → 讀取 → 更新區塊 + scan-meta → Git commit
│   └─ 否 → 跳過
│
├─ DTO 有變？
│   ├─ 是 → 讀取 → 更新區塊 + scan-meta → Git commit
│   └─ 否 → 跳過
│
├─ Service 有變？
│   ├─ 是 → 讀取 → 更新區塊 + scan-meta → Git commit
│   └─ 否 → 跳過
│
└─ Controller 有變？
    ├─ 是 → 讀取 → 更新區塊 + scan-meta → Git commit
    └─ 否 → 跳過
```

**Git Commit Message 格式**：

```bash
# 全量模式 — 逐區塊 commit
api-flow-architecture: {apiName} Entity 結構建立完成
api-flow-architecture: {apiName} DTO 定義建立完成
api-flow-architecture: {apiName} Service 結構建立完成
api-flow-architecture: {apiName} Controller 結構建立完成

# 漸進模式 — 只有變的區塊
api-flow-architecture: {apiName} Entity 結構更新（漸進式）
api-flow-architecture: {apiName} DTO 定義更新（漸進式）
```

**處理順序**：Entity → DTO → Service → Controller（固定順序，因為 data-flow 文件的區塊順序就是這樣）

### 修改內容

**影響檔案**：
1. `api-flow-architecture_skill_proposal.md` - 設計稿（本檔案）
2. `api-flow-architecture.md` - 定義檔 Step 5、6、7
3. `api-flow-architecture_flowchart.md` - 流程圖 Step 5、6、7

**定義檔和流程圖待修改**（透過 /updateDesign 同步）：
- Step 5+6+7：拆分為四個子步驟（Entity/DTO/Service/Controller），每個子步驟包含讀取、分析、寫入、commit
- TaskCreate：可選擇細化為 4 個子 Task 或維持 3 個 Task（Step 5/6/7 各一個）
- Git Commit Message 格式：每個區塊獨立 commit

### 預期效果

**修改前**：
- 四個區塊全部讀完、分析完、累積在 context，最後一次寫入
- 中途 crash → 全部丟失
- context 消耗持續累積到 Step 7

**修改後**：
- 每個區塊讀完就寫入 + commit，context 消耗分段釋放
- 中途 crash → 已 commit 的區塊保留，下次漸進式更新只需處理剩餘區塊
- 每個區塊的 scan-meta 精確記錄各自的 commit hash

### 實作狀態

- [x] 設計變更討論（2026-02-08）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-10 設計變更：Step 5 完成後同步更新 /read-data-flow 映射表

### 問題描述

`/api-flow-architecture` 建立新模組的 data-flow 文件後，`/read-data-flow` 的映射表不會自動更新。使用者必須手動將新模組加入映射表，容易遺漏。

**現況流程**：
```
/api-flow-architecture transcript
  → 建立 prompts/6_api_data_flow/adminApi/transcript-data-flow.md
  → 但 /read-data-flow 映射表沒有 transcript → 需手動新增
```

**預期流程**：
```
/api-flow-architecture transcript
  → 建立 prompts/6_api_data_flow/adminApi/transcript-data-flow.md
  → 自動檢查並更新 /read-data-flow 映射表
```

### 設計決策

在 Step 6（更新進度表）之後、Step 7（輸出結果）之前，新增一個步驟：**同步 /read-data-flow 映射表**。

**僅在 API 結構文件模式執行**（-p 模式跳過）。

### 新增步驟：Step 6.5 同步 /read-data-flow 映射表

**執行時機**：Step 6（更新進度表）完成後

**流程**：

```
Step 6.5. 同步 /read-data-flow 映射表
│
├─ 1. 讀取 /read-data-flow 定義檔
│   └─ backend-nestjs/.claude/commands/read-data-flow.md
│
├─ 2. 檢查映射表是否已包含當前 apiName
│   ├─ 已存在 → 跳過，不修改
│   └─ 不存在 → 繼續
│
├─ 3. 新增映射表行
│   └─ | `{apiName}` | `prompts/6_api_data_flow/{adminApi|publicApi}/{apiName}-data-flow.md` |
│
├─ 4. 寫入定義檔
│   └─ 使用 Edit 工具在映射表末尾新增一行
│
└─ 5. 輸出提示
    └─ `✅ 已將 {apiName} 加入 /read-data-flow 映射表`
    └─ 若跳過：`ℹ️ {apiName} 已在 /read-data-flow 映射表中`
```

**注意事項**：
- 映射表位於定義檔的「## 模組名稱 → 檔案路徑映射表」區塊
- 只修改定義檔（`backend-nestjs/.claude/commands/read-data-flow.md`），不修改設計稿的映射表（設計稿由 `/updateDesign` 負責同步）
- 不需要 git commit（定義檔在 backend-nestjs/.claude/ 下，不納入版本控制）

### 修改影響

| 影響的步驟 | 修改內容 |
|-----------|---------|
| 定義檔 | 新增 Step 6.5：同步 /read-data-flow 映射表 |
| 流程圖 | Step 6 和 Step 7 之間新增映射表同步步驟 |
| TaskCreate | 新增 Task：同步 /read-data-flow 映射表 |

### 實作狀態

- [x] 設計變更討論（2026-02-10）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-10 設計變更：新增 `-pl` 參數（多 API 平行處理）

### 問題描述

目前 `/api-flow-architecture` 一次只能處理一個 API。當需要批量建立多個 API 的結構文件時（例如首次導入、或多個 API 同時有變更），必須逐一執行，效率低。

**現況**：
```bash
/api-flow-architecture edm
# 等完成...
/api-flow-architecture transcript
# 等完成...
```

**預期**：
```bash
/api-flow-architecture edm,transcript --parallel
# 兩個 API 同時處理，最後統一更新共用資源
```

### 設計決策

#### 參數設計

> ⚠️ `-p` 已被佔用（progress 進度追蹤模式），平行模式使用 `-pl`（parallel 縮寫）

```bash
# 單一 API（現有行為不變）
/api-flow-architecture transcript

# 多 API 平行處理
/api-flow-architecture edm,transcript -pl

# 搭配 --full
/api-flow-architecture edm,transcript -pl --full
```

**參數格式**：逗號分隔的 apiName 列表，不含空格

#### 核心原則：獨立寫入 + 延遲共用資源更新

**衝突分析**：

| 資源 | 是否共用 | 平行安全 | 處理方式 |
|------|----------|----------|----------|
| `{apiName}-data-flow.md` | ❌ 各自獨立 | ✅ 安全 | 各 agent 直接寫入 |
| `api-flow-progress.md` | ✅ 共用 | ❌ 衝突 | 延遲到合併階段 |
| `read-data-flow.md` 映射表 | ✅ 共用 | ❌ 衝突 | 延遲到合併階段 |
| prompts git repo | ✅ 共用 | ❌ 衝突 | 延遲到合併階段 |

#### 執行流程

```
/api-flow-architecture edm,transcript -pl
│
├─ Phase 1：平行處理（各 agent 獨立執行）
│   │
│   ├─ Agent A: edm
│   │   ├─ Step 1-4：判斷模式、解析參數、定位程式碼、判斷掃描模式
│   │   ├─ Step 5：逐區塊處理（讀取→分析→寫入 data-flow 文件）
│   │   ├─ ⏭️ 跳過 Step 6（進度表）
│   │   ├─ ⏭️ 跳過 Step 7（映射表）
│   │   ├─ ⏭️ 跳過所有 git commit
│   │   └─ 寫入結果到 /tmp/api-flow-edm-result.md
│   │
│   └─ Agent B: transcript
│       ├─ Step 1-4：判斷模式、解析參數、定位程式碼、判斷掃描模式
│       ├─ Step 5：逐區塊處理（讀取→分析→寫入 data-flow 文件）
│       ├─ ⏭️ 跳過 Step 6（進度表）
│       ├─ ⏭️ 跳過 Step 7（映射表）
│       ├─ ⏭️ 跳過所有 git commit
│       └─ 寫入結果到 /tmp/api-flow-transcript-result.md
│
├─ Phase 2：合併階段（主對話序列執行）
│   │
│   ├─ 1. 讀取所有 /tmp/api-flow-*-result.md
│   ├─ 2. 檢查各 agent 執行結果（成功/失敗）
│   ├─ 3. 批次 git commit 所有 data-flow 文件
│   │   ```bash
│   │   cd /Users/nicholas/Desktop/Projects/prompts
│   │   git add 6_api_data_flow/adminApi/edm-data-flow.md
│   │   git add 6_api_data_flow/adminApi/transcript-data-flow.md
│   │   git commit -m "api-flow-architecture: edm, transcript 結構文件建立完成（parallel）"
│   │   ```
│   ├─ 4. 批次更新進度表（一次寫入多筆）
│   │   └─ git commit 進度表
│   ├─ 5. 批次更新 /read-data-flow 映射表（一次寫入多筆）
│   └─ 6. 清理 /tmp/api-flow-*-result.md
│
└─ Phase 3：輸出結果
    ├─ 顯示各 API 處理結果
    ├─ 顯示失敗的 API（如有）
    └─ 顯示批次 commit hash
```

#### Tmp 結果檔格式

每個 agent 完成後寫入 `/tmp/api-flow-{apiName}-result.md`：

```markdown
# api-flow-architecture parallel result

| 項目 | 內容 |
|------|------|
| apiName | {apiName} |
| apiDir | {adminApi/publicApi} |
| dataFlowPath | prompts/6_api_data_flow/{dir}/{apiName}-data-flow.md |
| scanMode | {full/incremental} |
| status | {completed/failed} |
| commitHash | {HEAD hash} |

## 掃描統計

| 區塊 | 數量 |
|------|------|
| Entity | {N} |
| DTO | {N} |
| Service 方法 | {N} |
| Controller 路由 | {N} |

## 錯誤（如有）

{錯誤訊息}
```

#### Agent 啟動方式

```
主對話使用 Task tool 啟動：

Task(
  subagent_type="general-purpose",
  run_in_background=true,
  prompt="執行 /api-flow-architecture {apiName} 的 Step 1-5（平行模式）：
    - 跳過 Step 6（進度表更新）
    - 跳過 Step 7（映射表同步）
    - 跳過所有 git commit
    - 完成後將結果寫入 /tmp/api-flow-{apiName}-result.md"
)
```

### 相容性分析

| 現有功能 | 影響 | 說明 |
|---------|------|------|
| 單一 apiName 模式 | ✅ 不影響 | 無 `-pl` 時走現有邏輯 |
| `-p` 進度追蹤模式 | ✅ 不影響 | `-p` 和 `-pl` 互斥 |
| `--full` 全量掃描 | ✅ 相容 | `-pl --full` 可組合使用 |
| Step 5 逐區塊 commit | ⚠️ 平行模式跳過 | 改由 Phase 2 批次 commit |
| Step 6 進度表更新 | ⚠️ 平行模式延遲 | 改由 Phase 2 批次更新 |
| Step 7 映射表同步 | ⚠️ 平行模式延遲 | 改由 Phase 2 批次更新 |

### 參數優先順序（更新）

```
-p > [api1,api2] -pl > apiName > 報錯
```

| 參數組合 | 行為 |
|---------|------|
| `-p` | 進度追蹤模式（現有） |
| `edm` | 單一 API 模式（現有） |
| `edm --full` | 單一 API 全量掃描（現有） |
| `edm,transcript -pl` | 多 API 平行處理（新增） |
| `edm,transcript -pl --full` | 多 API 平行全量掃描（新增） |
| `edm,transcript`（無 `-pl`） | 報錯：多 API 需搭配 `-pl` |

### 輸出格式（-pl 模式）

```
✅ API 結構文件批次建立完成（parallel）

📊 處理結果：
| API | 狀態 | 掃描模式 | Entity | DTO | Service | Controller |
|-----|------|----------|--------|-----|---------|------------|
| edm | ✅ | 全量 | 2 | 3 | 5 | 4 |
| transcript | ✅ | 全量 | 1 | 2 | 3 | 3 |

📁 產出檔案：
- prompts/6_api_data_flow/adminApi/edm-data-flow.md
- prompts/6_api_data_flow/adminApi/transcript-data-flow.md

📌 批次 commit: {hash}
✅ 進度表已更新
✅ /read-data-flow 映射表已更新
```

### 修改影響

| 影響的檔案 | 修改內容 |
|-----------|---------|
| 定義檔 | Step 1 新增 `-pl` 判斷分支、新增 Phase 2 合併步驟 |
| 流程圖 | Step 1 新增平行模式分支、新增 Phase 2 |
| TaskCreate | 平行模式使用不同的 Task 結構 |
| argument-hint | 更新為 `<apiName\|api1,api2 -pl> [-p] [--full]` |

### 實作狀態

- [x] 設計變更討論（2026-02-10）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-10 設計變更：使用 git worktree dev 分支讀取後端程式碼

### 問題描述

目前 `/api-flow-architecture` 直接讀取 `backend-nestjs/` 本地目錄的程式碼。本地通常在 `adminApi` 分支上開發，可能有未 commit 的修改、實驗性程式碼、或與 dev 分支不同步的內容。

**痛點**：
- 掃描到的程式碼可能包含未完成的修改，產出的結構文件不準確
- scan-meta 記錄的 commit hash 是 adminApi 分支的，但 dev 分支可能還沒 merge 這些變更
- `/review-api-flow` 消費這些結構文件時，可能基於尚未部署的程式碼做對齊檢查

**預期**：
- 從 dev 分支的乾淨狀態讀取程式碼，確保結構文件反映已合併到 dev 的穩定版本
- 使用 git worktree 避免影響本地正在開發的 adminApi 分支

### 設計決策

**參考 `/merge-to-deploy` 的 worktree 模式**：建立臨時 worktree 切到 dev 分支，讀取完畢後清理。

**worktree 命名**：`backend-nestjs-dev-read`（區分 merge-to-deploy 的 `backend-nestjs-dev-merge`）

**worktree 路徑**：`/Users/nicholas/Desktop/Projects/backend-nestjs-dev-read`

### 新增步驟：Step 1.5 建立 dev worktree

在 Step 1（判斷執行模式）之後、Step 2（參數解析）之前，新增 worktree 建立步驟。

**執行時機**：所有需要讀取後端程式碼的模式（單一 API、-p 建立進度表、-pl）。-p 顯示摘要模式不需要（只讀進度表，不讀後端程式碼）。

**流程**：

```
Step 1.5. 建立 dev worktree（讀取用）
│
├─ 1. Fetch 最新 dev 分支
│   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs fetch origin dev
│
├─ 2. 建立 worktree
│   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree add
│       /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read dev
│
├─ 3. 設定 worktree 配置
│   └─ /Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/setup-worktree-config.sh
│       /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
│
├─ 4. Pull 最新 dev
│   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read pull origin dev
│
└─ 5. 記錄 BACKEND_READ_PATH
    └─ 後續所有讀取後端程式碼的步驟，改用此路徑
```

**變數定義**：
```
BACKEND_READ_PATH = /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
```

### 路徑替換清單

後續步驟中，所有引用 `backend-nestjs` 讀取程式碼的地方，改用 `BACKEND_READ_PATH`：

| 步驟 | 原路徑 | 新路徑 |
|------|--------|--------|
| Step 1（-p 模式） | `backend-nestjs/src/api/adminApi/` | `{BACKEND_READ_PATH}/src/api/adminApi/` |
| Step 3 | Glob `backend-nestjs/src/api/**/{apiName}/` | Glob `{BACKEND_READ_PATH}/src/api/**/{apiName}/` |
| Step 4 | `git -C backend-nestjs rev-parse --short HEAD` | `git -C {BACKEND_READ_PATH} rev-parse --short HEAD` |
| Step 4 | `git -C backend-nestjs diff --name-only` | `git -C {BACKEND_READ_PATH} diff --name-only` |
| Step 5 | 讀取 `backend-nestjs/src/api/**/{apiName}/*.ts` | 讀取 `{BACKEND_READ_PATH}/src/api/**/{apiName}/*.ts` |
| Phase 1（-pl） | 背景 agent 的 Step 2-5 | 同上，傳入 BACKEND_READ_PATH |

**不替換的路徑**：
- `backend-nestjs/.claude/scripts/setup-worktree-config.sh`（腳本位置不變）
- `backend-nestjs/.claude/commands/read-data-flow.md`（Step 7 映射表，定義檔位置不變）
- `git -C backend-nestjs worktree add/remove`（worktree 管理指令本身用主 repo）
- `git -C backend-nestjs fetch origin dev`（fetch 用主 repo）

### 新增步驟：清理 worktree

在最後一步（Step 8 輸出結果）完成後，清理 worktree：

```
Step 8.5. 清理 dev worktree
│
└─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs worktree remove
    /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read --force
```

**錯誤處理**：如果 worktree 清理失敗，報告錯誤但不影響已完成的結果。

### -p 模式的處理

| -p 情境 | 是否需要 worktree |
|---------|------------------|
| 進度表不存在 → 建立 | ✅ 需要（掃描 backend API 目錄） |
| 進度表已存在 → 顯示摘要 | ❌ 不需要（只讀進度表） |

### -pl 平行模式的特殊處理

平行模式下，多個背景 agent 共用同一個 worktree（唯讀，不衝突）：

```
-pl 模式 worktree 流程
│
├─ Step 1.5：主對話建立 worktree（一次）
│
├─ Phase 1：各 agent 從 BACKEND_READ_PATH 讀取（唯讀，安全）
│
├─ Phase 2：合併階段（不需要 worktree）
│
└─ Step 8.5：主對話清理 worktree（一次）
```

### 修改影響

| 影響的檔案 | 修改內容 |
|-----------|---------|
| 定義檔 | 新增 Step 1.5（建立 worktree）、Step 8.5（清理）、所有後端路徑替換 |
| 流程圖 | 新增 Step 1.5 和 Step 8.5 節點、路徑替換 |
| TaskCreate | 新增 2 個 task（建立 worktree、清理 worktree） |

### 實作狀態

- [x] 設計變更討論（2026-02-10）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-11 設計變更：保留 dev worktree（不再每次清理）

### 問題描述

目前 `/api-flow-architecture` 和 `/review-api-flow` 共用同一個 worktree 路徑 `backend-nestjs-dev-read`，每次執行時建立（Step 1.5）、結束時清理（Step 8.5）。

**痛點**：
- 連續執行多個 API 時，每次都要 `worktree add` + `worktree remove`，浪費時間
- 上一次執行的 Step 8.5 清理失敗（或中斷），下一次 Step 1.5 建立時會報 `fatal: already exists`
- 實際上 worktree 是唯讀用途，保留不會影響任何開發工作

**觸發場景**：
```
/review-api-flow estateTransaction  → Step 8.5 清理失敗（worktree 殘留）
/api-flow-architecture transcript   → Step 1.5 建立失敗：already exists
```

### 設計決策

**核心原則**：worktree 保留不清理，每次執行只確保存在 + pull 最新。

**修改前**：
```
Step 1.5：建立 worktree（每次都 worktree add）
Step 8.5：清理 worktree（每次都 worktree remove）
```

**修改後**：
```
Step 1.5：確保 worktree 可用（存在就 pull，不存在就建立）
Step 8.5：移除（不再清理 worktree）
```

### Step 1.5 修改：確保 dev worktree 可用

**修改後的流程**：

```
Step 1.5. 確保 dev worktree 可用
│
├─ 1. Fetch 最新 dev 分支
│   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs fetch origin dev
│
├─ 2. 檢查 worktree 是否存在
│   ├─ 存在（目錄存在）→ 直接 pull
│   │   └─ git -C /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read pull origin dev
│   └─ 不存在 → 建立 + 配置 + pull
│       ├─ git -C backend-nestjs worktree add backend-nestjs-dev-read dev
│       ├─ setup-worktree-config.sh backend-nestjs-dev-read
│       └─ git -C backend-nestjs-dev-read pull origin dev
│
└─ 3. 記錄 BACKEND_READ_PATH = /Users/nicholas/Desktop/Projects/backend-nestjs-dev-read
```

**判斷方式**：檢查 `/Users/nicholas/Desktop/Projects/backend-nestjs-dev-read` 目錄是否存在（`ls` 或 `test -d`）。

### Step 8.5 修改：移除

**修改前**：
```
Step 8.5. 清理 dev worktree
└─ git -C backend-nestjs worktree remove backend-nestjs-dev-read --force
```

**修改後**：
- 移除 Step 8.5
- 移除 TaskCreate 中的「清理 dev worktree」task

### TaskCreate 修改

**移除**：
- Task「清理 dev worktree」（原 Step 8.5）

**修改**：
- Task「建立 dev worktree」→ 改為「確保 dev worktree 可用」
  - subject: `確保 dev worktree 可用`
  - activeForm: `確保 dev worktree 可用中...`

### 修改影響

| 影響的檔案 | 修改內容 |
|-----------|---------|
| 定義檔 | Step 1.5 改為「確保 worktree 可用」邏輯、移除 Step 8.5、更新 TaskCreate |
| 流程圖 | Step 1.5 改為存在判斷分支、移除 Step 8.5 節點 |
| TaskCreate | 移除「清理 dev worktree」task、修改「建立 dev worktree」task 名稱 |

### 實作狀態

- [x] 設計變更討論（2026-02-11）
- [x] 設計稿更新（本檔案）
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

---

## 2026-02-13 設計變更：使用 replace-section.sh 替代 Edit 工具做大區塊替換

### 問題描述

Step 5 逐區塊處理時，使用 Edit 工具替換整個 `## 區塊`。當區塊很大時，`old_string` + `new_string` 超過 API 的 content validation 限制，觸發 `invalid contentList text` 400 error。

### 設計決策

與 `/review-api-flow` 共用同一個 `replace-section.sh` helper script（位於 `backend-nestjs/.claude/scripts/replace-section.sh`）。

**Step 5a-5d 修改為**：
```
a. Write → /tmp/section-{apiName}-{block}.md（含 ## 標題 + scan-meta + 內容，不含尾部 ---）
b. Bash: .claude/scripts/replace-section.sh {data-flow路徑} "## {區塊標題}" /tmp/section-{apiName}-{block}.md
c. Read 驗證替換結果（區塊起始 5 行）
d. Bash: rm /tmp/section-{apiName}-{block}.md
```

**首次建立（文件不存在）**：
- 先用 Write 建立文件骨架（`# 標題` + `## 基本資訊` + `---`）
- 後續區塊用 replace-section.sh 的 append 模式逐個追加

**暫存檔命名規則**：

| Step | 暫存檔路徑 | 對應區塊標題 |
|------|-----------|------------|
| 5a | `/tmp/section-{apiName}-entity.md` | `## Entity 結構` |
| 5b | `/tmp/section-{apiName}-dto.md` | `## DTO 欄位定義` |
| 5c | `/tmp/section-{apiName}-service.md` | `## Service 查詢結構` |
| 5d | `/tmp/section-{apiName}-controller.md` | `## Controller 路由結構` |

**不受影響**：
- Step 6 進度表更新（1 行，繼續用 Edit）
- Step 7 映射表同步（1 行，繼續用 Edit）

**影響檔案**：
1. `api-flow-architecture_skill_proposal.md` - 設計稿（本檔案）
2. `api-flow-architecture.md` - 定義檔 Step 5
3. `api-flow-architecture_flowchart.md` - 流程圖 Step 5

### 實作狀態

- [x] 設計變更討論（2026-02-13）
- [x] 建立 replace-section.sh 腳本
- [x] 同步更新定義檔和流程圖（/updateDesign 完成）

### 2026-02-13 設計變更：replace-section.sh 路徑改為完整路徑

**問題**：定義檔和流程圖中的 `replace-section.sh` 使用相對路徑 `.claude/scripts/replace-section.sh`，但 Claude Code 工作目錄是 `/Users/nicholas/Desktop/Projects/`，導致其他 AI 執行時找不到 script。

**修正**：所有 Bash 呼叫路徑改為完整路徑 `/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/scripts/replace-section.sh`

**影響檔案**：
1. `api-flow-architecture.md` - 定義檔 Step 5a/5b/5c/5d（4 處）
2. `api-flow-architecture_flowchart.md` - 流程圖 Step 5（1 處）
