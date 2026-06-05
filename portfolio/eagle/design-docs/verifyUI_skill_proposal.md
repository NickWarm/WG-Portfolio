# verifyUI 設計稿

> 📅 建立日期：2026-03-04

---

## 問題描述

### 現況痛點

修復 publicApi 欄位映射問題後，需要驗證「資料從 DB 到官網/大後台的完整流程是否正確」。

目前沒有系統化的方式做這件事：
- 手動開瀏覽器比對官網與大後台，費時且容易遺漏
- 沒有記錄驗證過程，下次修改後無法快速重跑
- 三方比對（DB ↔ API ↔ 前端程式碼）需要同時查多個地方

### 預期效益

- 自動化三方比對：DB 原始值 ↔ API 回傳值 ↔ 前端綁定邏輯
- 不需要手動開瀏覽器，純程式碼 + DB 查詢驗證
- 驗證結果記錄到 proposal，可重複執行
- 與 verifyOWS 互補：verifyOWS 驗證 v1 vs v2 API 一致性，verifyUI 驗證 API 到前端顯示的正確性

---

## 執行流程圖

```
/verifyUI 執行流程
│
├─ 1. 【參數解析】
│   ├─ $1 = module（必要）— objects / factory 等
│   └─ $2 = env（可選）— dev（預設）/ staging
│
├─ 2. 【讀取索引表】
│   ├─ 讀 ui-api-index-frontend.md → 找官網頁面檔案路徑
│   └─ 讀 ui-api-index-dashboard.md → 找大後台頁面檔案路徑
│
├─ 3. 【讀取前端程式碼】
│   ├─ 讀官網詳情頁（從索引表定位）
│   ├─ 讀大後台詳情頁（從索引表定位）
│   └─ 提取欄位綁定邏輯（{{ data.xxx }}、v-model 等）
│
├─ 4. 【定位 proposal + 取得測試物件 ID】
│   ├─ 從對話上下文找 proposal 路徑
│   ├─ 有 proposal → 從 proposal 的 API 驗證紀錄提取測試物件 ID + API 回傳值
│   └─ 無 proposal → 要求用戶提供測試物件 ID，並 curl dev API 取得回傳值
│
├─ 5. 【查詢 DB 原始值】
│   ├─ db-tunnel.sh dev（確認 SSH Tunnel 已啟動）
│   ├─ 查詢 realEstate + 關聯表（PointOfInterest、LandInfo 等）
│   └─ 記錄每個測試物件的 DB 原始值
│
├─ 6. 【三方比對】
│   ├─ DB 原始值 ↔ API 回傳值（欄位映射是否正確）
│   ├─ API 回傳值 ↔ 前端綁定邏輯（前端是否正確使用欄位）
│   └─ 標記每個欄位 ✅ / ❌
│
└─ 7. 【寫入驗證結果】
    ├─ 有 proposal → 寫入 proposal 的「三方比對驗證結果」區塊
    ├─ 無 proposal → 建立獨立 verify 文件
    └─ 印出驗證摘要（通過率、失敗欄位清單）
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 是 | 模組名稱 | `objects` |
| `$2` | 否 | 環境（預設 dev） | `staging` |

---

## 輸出格式

### 驗證結果區塊（寫入 proposal）

```markdown
## 三方比對驗證結果（YYYY-MM-DD）

### 前端欄位映射表

#### 官網租賃詳情頁 (`/rents/[id]`)

| API 欄位 | 前端綁定 | UI 顯示位置 | UI 標籤 |
|---------|---------|------------|--------|
| communityBuilding | {{ data.communityBuilding }} | 生活機能區 | 所屬商圈 |
| parkingSpace | {{ data.parkingSpace }} | 生活機能區 | 停車位 |

### 三方比對驗證表

#### 物件 {id}（租賃/買賣）

| 欄位 | DB 原始值 | API 回傳值 | 前端應顯示 | 驗證結果 |
|------|----------|-----------|-----------|---------|
| communityBuilding | businessDistrict="xxx" | "xxx" | 所屬商圈：xxx | ✅ |

### 驗證總結

- 測試物件：N 筆
- 驗證欄位：N 個
- 通過率：N/N = 100%
- 結論：✅ 全部通過 / ❌ 發現 N 個問題
```

### 對話摘要

```
✅ verifyUI 完成（objects / dev）
- 測試物件：9 筆
- 驗證欄位：39 個
- 通過率：100%

📄 結果已寫入：prompts/4_diary/.../proposal.md
```

---

## 實作細節

### 需要讀取的檔案

| 檔案 | 用途 |
|------|------|
| `prompts/4_diary/debug/ui-api-index/ui-api-index-frontend.md` | 官網頁面路徑索引 |
| `prompts/4_diary/debug/ui-api-index/ui-api-index-dashboard.md` | 大後台頁面路徑索引 |
| 官網詳情頁（從索引表定位） | 提取前端欄位綁定邏輯 |
| 大後台詳情頁（從索引表定位） | 提取大後台欄位綁定邏輯 |
| proposal（從對話上下文定位） | 取得測試物件 ID + API 回傳值 |

### DB 查詢

```bash
# 確認 SSH Tunnel 已啟動
./scripts/db-tunnel.sh start

# 查詢測試物件
PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5433 -U <DB_USER> -d eagle-dev -c "
SELECT
  re.id,
  re.\"transactionType\",
  re.\"businessDistrict\",
  re.\"hasStall\",
  re.\"stallDesc\",
  re.\"furniture\",
  re.\"homeDevice\",
  re.\"nearbyMRTId\",
  poi.name AS \"mrtName\"
FROM \"realEstate\" re
LEFT JOIN \"pointOfInterest\" poi ON poi.id = re.\"nearbyMRTId\"
WHERE re.id IN ({ids});
"
```

### 三方比對邏輯

**DB → API 映射規則**（objects 模組）：

| DB 欄位 | API 欄位 | 轉換邏輯 |
|--------|---------|---------|
| `businessDistrict` | `communityBuilding` | 直接映射 |
| `hasStall` + `stallDesc` | `parkingSpace` | `有（{stallDesc}）` / `無` |
| `furniture` (number[]) | `furniture` (string[]) | enum → 中文 nameMap |
| `homeDevice` (number[]) | `homeDevice` (string[]) | enum → 中文 nameMap |
| `nearbyMRTId` → `poi.name` | `mrt` | LEFT JOIN PointOfInterest |

**API → 前端綁定規則**：
- 從前端程式碼提取 `{{ data.xxx }}` 和 `v-model="form.xxx"` 綁定
- 確認 API 欄位名稱與前端綁定名稱一致
- 確認前端有正確使用（未使用的欄位標記為「前端未使用」）

### 注意事項

- DB table 名稱：`realEstate`（小寫 r）、`pointOfInterest`（camelCase）
- SSH Tunnel port：5433（dev/staging），5432（local）
- 前端 `rents/[id].vue` 實際上引用 `sales/[id].vue`，兩者共用同一個元件
- `mrt` 欄位：API 正確回傳，但前端目前未使用（不算驗證失敗，標記說明即可）

---

## 與 verifyOWS 的關係

| | verifyOWS | verifyUI |
|---|---|---|
| 比對對象 | v1 API vs v2 API | DB → API → 前端程式碼 |
| 驗證目的 | v2 與 v1 輸出一致 | 資料流端到端正確 |
| 觸發時機 | v2 實作後 | 欄位映射修復後 |
| 輸出位置 | `{module}_v2_verify_proposal.md` | 原 proposal 或獨立 verify 文件 |

---

## 待討論事項

1. **輸出目標**：寫回原 proposal vs 建立獨立 `{module}_ui_verify.md`？
2. **API 回傳值來源**：從 proposal 提取 vs 每次重新 curl？
3. **測試物件 ID 來源**：從 proposal 自動解析 vs 手動指定？
4. **模組擴展**：目前設計針對 objects，factory 模組的欄位映射規則是否需要獨立處理？

---

## Skill 定義檔（草稿）

**檔案位置**: `backend-nestjs/.claude/commands/verifyUI.md`

```markdown
---
description: 官網與大後台欄位三方比對驗證（DB → API → 前端）
argument-hint: <module> [env]
design-doc: prompts/4_diary/debug/proposal/slash/verifyUI_skill_proposal.md
---

## 參數

- `$1`：模組名稱（必要）— objects / factory 等
- `$2`：環境（可選）— dev（預設）/ staging

## 任務

執行三方比對驗證，確認資料從 DB → API → 前端顯示的完整流程正確。
```
