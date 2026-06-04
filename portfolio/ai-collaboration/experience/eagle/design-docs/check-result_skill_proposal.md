# Check Result Skill 設計稿

> 📅 建立日期：2026-01-26

---

## 問題描述

為什麼需要這個 skill？

### 現況痛點

1. **驗證流程繁瑣**：AI 實作完功能後，需要手動切換 DB 環境、啟動 server、取 token、打 API 驗證
2. **容易遺漏步驟**：切換到遠端 DB 後，經常忘記切回 local DB
3. **指令分散**：db-tunnel、start-dev-server、get-token、curl 等指令散落各處，不易記憶

### 預期效益

1. **一鍵驗證**：執行 `/check-result dev` 或 `/check-result staging` 即可完成整個驗證流程
2. **強制提醒切回 local**：輸出格式強制包含切回 local DB 的提醒，避免遺忘
3. **標準化流程**：統一驗證步驟，確保每次驗證都是完整的

---

## 執行流程圖

```
/check-result 執行流程
│
├─ 1. 【環境切換】
│   └─ ./scripts/db-tunnel.sh $1 all
│
├─ 2. 【上下文分析】
│   ├─ 從對話上下文理解：
│   │   ├─ 剛完成什麼實作
│   │   ├─ 涉及哪些欄位/邏輯
│   │   └─ proposal 文件內容（如果有讀取過）
│   │
│   └─ 判斷驗證類型：
│       ├─ 涉及 DB 欄位/計算 → 需要先查 DB
│       └─ 純 DTO/格式變更 → 直接打 API
│
├─ 3. 【條件分流：DB 查詢測試資料】
│   │
│   ├─ 【涉及 DB】
│   │   ├─ 用 psql 查詢測試資料
│   │   │   ├─ 邊界案例（如超過 90 天）
│   │   │   ├─ 特殊情況（如 null 值）
│   │   │   └─ 正常情況
│   │   └─ 記錄 ID + 預期值
│   │
│   └─ 【不涉及 DB】
│       └─ 跳過此步驟
│
├─ 4. 【Server 啟動】（遵循 curl-token.md SOP）
│   ├─ pkill -f "nest start" || true
│   ├─ 確認 port 3001 已釋放
│   └─ 啟動 start-dev-server.sh
│
├─ 5. 【取得 Token】
│   └─ 執行 ./.claude/scripts/get-token.sh local
│
├─ 6. 【API 驗證】
│   ├─ 有測試資料 → 用特定 ID 打 API
│   └─ 無測試資料 → 一般驗證
│
└─ 7. 【結果分析】
    └─ 比對 DB 預期值 vs API 回傳值
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 是 | 目標環境（dev 或 staging） | `dev`、`staging` |

---

## 輸出格式

### 驗證完成時

```markdown
✅ Check Result 完成

| 項目 | 狀態 |
|------|------|
| 環境 | [dev/staging] |
| DB 切換 | ✅ |
| Local Server | ✅ 運行中 |
| Token 取得 | ✅ |
| API 驗證 | ✅/❌ |

驗證結果：
- [具體驗證內容和結果]

⚠️ 記得執行 `./scripts/db-tunnel.sh local` 切回本地 DB
```

### 驗證失敗時

```markdown
❌ Check Result 失敗

| 項目 | 狀態 |
|------|------|
| 環境 | [dev/staging] |
| DB 切換 | ✅/❌ |
| Local Server | ✅/❌ |
| Token 取得 | ✅/❌ |
| API 驗證 | ❌ |

失敗原因：
- [具體錯誤訊息]

⚠️ 記得執行 `./scripts/db-tunnel.sh local` 切回本地 DB
```

---

## 實作細節

### 需要讀取的檔案

| 檔案 | 用途 |
|------|------|
| `prompts/4_diary/debug/curl_get_dashboard_token.md` | 了解如何取得 Token 和打 API |

### 需要執行的指令

```bash
# Step 1: 切換 DB 環境
./scripts/db-tunnel.sh dev all      # 或 staging all

# Step 2: 檢查/啟動 server
lsof -i :3001
./.claude/scripts/start-dev-server.sh

# Step 3: 取得 Token
./.claude/scripts/get-token.sh local

# Step 4: 打 API 驗證（全 HTTP verb 統一使用 test-dashboard-api.sh）
./.claude/scripts/test-dashboard-api.sh "/[API路徑]"                              # GET
./.claude/scripts/test-dashboard-api.sh "/[API路徑]" -X POST -d '{"key":"val"}'   # POST
./.claude/scripts/test-dashboard-api.sh "/[API路徑]" -X PATCH -d '{"key":"val"}'  # PATCH
./.claude/scripts/test-dashboard-api.sh "/[API路徑]" -X DELETE                    # DELETE
```

### 注意事項

1. **Server Port 是 3001**：不是 3000，使用 `yarn start:dev` 啟動
2. **切換 DB 後需重啟 server**：DB 設定變更後，server 需要重啟才會生效
3. **強制提醒切回 local**：無論驗證成功或失敗，都必須輸出切回 local DB 的提醒

### 設計決策：為什麼不自動切回 local？

| 選項 | 優點 | 缺點 | 決策 |
|------|------|------|------|
| 自動切回 | 完全自動化 | 可能打斷後續需要遠端 DB 的操作 | ❌ 不採用 |
| 文字提醒 | 保留彈性，用戶可決定 | 可能被忽略 | ✅ 採用 |
| Hook 提醒 | 系統層級提醒 | 實作複雜，難以判斷「驗證完成」時機 | ❌ 不採用 |

**結論**：採用「輸出格式強制包含提醒」的方式，平衡自動化與彈性。

---

## Skill 定義檔

**檔案位置**: `backend-nestjs/.claude/commands/check-result.md`

```markdown
---
description: 切換到 dev/staging DB，用 local API 驗證實作結果
argument-hint: <dev|staging>
allowed-tools: Bash(./scripts/*:*), Bash(./.claude/scripts/*:*), Bash(curl:*), Bash(lsof:*)
design-doc: prompts/4_diary/debug/proposal/slash/check-result_skill_proposal.md
---

# Check Result - 驗證實作結果

用 local API + 遠端 DB 的方式驗證 AI 實作完成的項目。

## 參數

- 目標環境：$1（dev 或 staging）

## 前置知識

請先讀取以下文件了解如何操作：
@/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/curl_get_dashboard_token.md

## 執行步驟

[... 執行步驟內容 ...]

## 完成後

測試完成後，**記得切回本地 DB**：

```bash
./scripts/db-tunnel.sh local
```

## 輸出格式

[... 輸出格式內容 ...]

⚠️ 記得執行 `./scripts/db-tunnel.sh local` 切回本地 DB
```

---

## 待辦事項

- [x] 建立設計稿（2026-01-26）
- [x] 更新 skill 定義檔，加入 `design-doc` 欄位（2026-01-26）
- [x] 移除「切回 local DB」提醒（見下方設計變更）（2026-01-26）
- [x] 更新 skill 定義檔，改用 `curl-token.md` + `db-connection-rules.md` + `api-response-index.md` 模組（2026-01-26）
- [x] 建立 Migration 前 DB 檢查 Hook（`backend-nestjs/.claude/settings.json`）（2026-01-26）
- [x] 建立檢查腳本（`.claude/hooks/check-local-db.sh`）（2026-01-26）
- [x] 更新 skill 定義檔，加入「上下文分析」和「DB 查詢測試資料」步驟（2026-01-26）
- [x] 擴充 `test-dashboard-api.sh` 支援全 HTTP verb（GET/POST/PATCH/DELETE）（2026-02-10）
- [x] 更新定義檔 + 流程圖，統一使用 test-dashboard-api.sh，禁止裸 curl（2026-02-10）

---

## 設計變更：test-dashboard-api.sh 擴充全 HTTP verb（2026-02-10）

### 問題發現

`/check-result` 的 Step 6.3 Bug Spec 模擬需要打 POST/PATCH/DELETE API，但 `test-dashboard-api.sh` 只支援 GET。AI 被迫改用裸 `curl` + `TOKEN=$(cat ...)` 複合命令，每次都觸發 Claude Code 權限提示。

### 解法

擴充 `test-dashboard-api.sh`，新增 `-X` 和 `-d` 參數支援：

```bash
# 舊版：只能 GET
./test-dashboard-api.sh "/transcripts/1" ".data"

# 新版：支援全 HTTP verb
./test-dashboard-api.sh "/transcripts" -X POST -d '{"realEstateId":1}' ".data"
./test-dashboard-api.sh "/transcripts/123" -X PATCH -d '{"areaSqm":100}'
./test-dashboard-api.sh "/transcripts/land/456" -X DELETE
```

**向下相容**：現有 GET 呼叫方式完全不變。

### 更新檔案

| 檔案 | 變更 |
|------|------|
| `.claude/scripts/test-dashboard-api.sh` | 新增 `-X METHOD` 和 `-d DATA` 參數解析 |
| `.claude/commands/check-result.md` | Step 6.3 新增 POST/PATCH/DELETE 範例 + 禁止裸 curl 規則 |
| `.claude/flowcharts/check-result_flowchart.md` | Bug Fix 三步法新增統一使用 script 的強制規則 |

### 權限效益

腳本呼叫被 `Bash(/Users/nicholas/Desktop/Projects/**/*.sh:*)` 通配符覆蓋，所有 HTTP verb 的 API 驗證都不再觸發權限提示。

---

## 設計變更：移除「切回 local DB」提醒（2026-01-26）

### 問題發現

原設計要求測試完成後切回 local DB，但這個設計已過時：

| 情境 | 需要的 DB | 說明 |
|------|----------|------|
| 日常開發、debug、驗證 | **dev DB** | 大部分時候應該維持在 dev DB |
| 跑 migration | **local DB** | 只有這個情境才需要 local DB |

**結論**：「測完後切回 local DB」的提醒是錯誤的，應該移除。

### 新設計：Migration 前的 DB 檢查 Hook

正確的設計應該是：**執行 migration 前用 hook 檢查，如果不是 local DB 就警告並阻止**。

```
執行 migration 指令（yarn migration:*）
│
└─ Before Hook 檢查
    │
    ├─ 目前是 local DB → ✅ 允許執行
    │
    └─ 目前不是 local DB → ❌ 阻止執行
        └─ 提示：「請先執行 ./scripts/db-tunnel.sh local 切換到本地 DB」
```

**Hook 設定位置**：

```
backend-nestjs/.claude/settings.json
```

**Hook 觸發條件**：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(yarn migration:*)",
        "script": ".claude/hooks/check-local-db.sh"
      }
    ]
  }
}
```

### 需要的修改

| 項目 | 內容 |
|------|------|
| `/check-result` 定義檔 | 移除「切回 local DB」的提醒和步驟 |
| `/check-result` 設計稿 | 移除相關流程和輸出格式 |
| `backend-nestjs/.claude/settings.json` | 新增 migration 前的 DB 檢查 hook |
| `.claude/hooks/check-local-db.sh` | 新建檢查腳本 |

### 設計優點

1. **符合實際使用情境**：dev DB 是日常工作環境，不應該每次測試後都切走
2. **保護 migration 安全**：用 hook 主動阻止，而不是被動提醒
3. **減少人為錯誤**：hook 會自動檢查，不依賴用戶記憶

---

## 設計變更：統一 Server 啟動 SOP（2026-01-26）

### 問題發現

原設計的 Server 啟動流程過於簡化：

```
現有流程：
├─ 檢查 port 3001 是否運行
├─ 未運行 → 啟動 ./.claude/scripts/start-dev-server.sh
└─ 已運行 → 繼續下一步
```

**問題**：
- 沒有處理「舊進程殭屍」的情況
- 沒有確認 server 啟動成功
- 與 `/debugP` skill 的 SOP 不一致

### 新設計：引用 curl-token.md 統一模組

**設計決策**：
- SOP 放到 `curl-token.md` 模組（單一來源）
- `/debugP` 和 `/check-result` 統一引用同一份 SOP
- 避免兩份設計稿維護不一致

**完整 SOP**（定義在 curl-token.md）：
```
Server 啟動 SOP
│
├─ 1. 【清理舊進程】
│   └─ pkill -f "nest start" || true
│
├─ 2. 【確認 Port 釋放】
│   └─ lsof -i :3001（確認無佔用）
│
├─ 3. 【啟動 Server】
│   └─ ./.claude/scripts/start-dev-server.sh
│
└─ 4. 【確認啟動成功】
    └─ curl -s http://localhost:3001/health（或等待日誌）
```

### 需要的修改

| 項目 | 內容 |
|------|------|
| `curl-token.md` 模組 | 新增完整 Server 啟動 SOP |
| `/check-result` 定義檔 | 移除現有簡化流程，改引用 curl-token.md |
| `/debugP` 定義檔 | 確認已引用 curl-token.md |

### 設計優點

1. **單一來源**：SOP 只維護一份，避免不一致
2. **完整流程**：包含清理、確認、啟動、驗證四個步驟
3. **跨 skill 統一**：`/debugP` 和 `/check-result` 使用相同流程

---

## 設計變更：加入「DB 查詢測試資料」步驟（2026-01-26）

### 問題發現

**觸發情境**：實作 `estateTransaction` API 新增 `realEstateStoreId` 和 `isWithin90Days` 欄位後，執行 `/check-result dev` 驗證。

**問題**：AI 直接打 API 驗證，沒有先查 DB 找適合的測試資料。

**實際需要的流程**：
```
驗證 realEstateStoreId + isWithin90Days
│
├─ 先查 DB：找出適合的測試資料
│   ├─ 超過 90 天的交易（驗證 isWithin90Days = false）
│   ├─ 90 天內的交易（驗證 isWithin90Days = true）
│   └─ 同業物件（驗證 realEstateStoreId = null）
│
└─ 再打 API：用這些 ID 驗證回傳值是否正確
```

**結論**：原設計缺少「根據實作內容判斷是否需要先查 DB」的步驟。

### 方案討論

| 方案 | 說明 | 優點 | 缺點 | 決策 |
|------|------|------|------|------|
| A | 加入「DB 查詢測試資料」步驟 | 流程完整、有明確驗證依據 | 需要 AI 理解 proposal 內容 | ✅ 採用 |
| B | 讓 skill 接受 proposal 路徑參數 | 更自動化 | 需要額外傳參數，不夠智能 | ❌ 不採用 |
| C | 根據 proposal 類型分流 | 彈性處理不同類型 | 判斷條件可能不夠精確 | ✅ 採用 |

**最終決策**：採用 **方案 A + C**
- AI 應該從對話上下文理解要驗證什麼，不需要額外參數
- 根據實作內容判斷是否涉及 DB，決定是否需要先查 DB

### 判斷「是否涉及 DB」的標準

| 情況 | 需要先查 DB | 說明 |
|------|-------------|------|
| 新增計算欄位（如 isWithin90Days） | ✅ | 需要找邊界案例驗證計算邏輯 |
| 新增關聯欄位（如 realEstateStoreId） | ✅ | 需要找各種關聯情況（有值/null） |
| 修改查詢邏輯/過濾條件 | ✅ | 需要找符合/不符合條件的資料 |
| 純 DTO 欄位重命名 | ❌ | 直接打 API 看格式即可 |
| 新增固定值欄位 | ❌ | 不依賴 DB 資料 |

### 新流程設計

```
/check-result 執行流程（改進版）
│
├─ 1. 【環境切換】
│   └─ ./scripts/db-tunnel.sh $1 all
│
├─ 2. 【上下文分析】
│   ├─ 從對話上下文理解：
│   │   ├─ 剛完成什麼實作
│   │   ├─ 涉及哪些欄位/邏輯
│   │   └─ proposal 文件內容（如果有讀取過）
│   │
│   └─ 判斷驗證類型：
│       ├─ 涉及 DB 欄位/計算 → 需要先查 DB
│       └─ 純 DTO/格式變更 → 直接打 API
│
├─ 3. 【條件分流：DB 查詢測試資料】
│   │
│   ├─ 【涉及 DB】
│   │   ├─ 用 psql 查詢測試資料
│   │   │   ├─ 邊界案例（如超過 90 天）
│   │   │   ├─ 特殊情況（如 null 值）
│   │   │   └─ 正常情況
│   │   └─ 記錄 ID + 預期值
│   │
│   └─ 【不涉及 DB】
│       └─ 跳過此步驟
│
├─ 4. 【Server 啟動】
│
├─ 5. 【取得 Token】
│
├─ 6. 【API 驗證】
│   ├─ 有測試資料 → 用特定 ID 打 API
│   └─ 無測試資料 → 一般驗證
│
└─ 7. 【結果分析】
    └─ 比對 DB 預期值 vs API 回傳值
```

### 需要的修改

| 項目 | 內容 |
|------|------|
| `/check-result` 設計稿 | ✅ 已更新執行流程圖 |
| `/check-result` 定義檔 | 待更新：加入「上下文分析」和「DB 查詢測試資料」步驟 |

### 設計優點

1. **智能判斷**：AI 從上下文理解，不需要額外參數
2. **完整驗證**：涉及 DB 的實作會先找測試資料，確保驗證邊界案例
3. **彈性處理**：不涉及 DB 的實作直接打 API，不浪費時間

---

## 設計變更：驗證通過後自動更新提案文件（2026-01-27）

### 問題發現

**觸發情境**：執行 `/check-result dev` 驗證 Solution A 實作後，用戶需手動提醒 AI 更新提案文件的進度表。

**問題**：驗證完成後，AI 沒有自動更新提案文件，需要額外人工介入。

**預期行為**：
- 驗證通過 → 自動更新提案文件的進度表狀態
- 同時記錄驗證過程和結果，供日後參考

### 設計決策

| 問題 | 決策 | 說明 |
|------|------|------|
| 如何判斷有 proposal | **從對話上下文找** | AI 搜尋對話中最近讀取的 proposal 路徑 |
| 如何更新進度表 | **AI 智能匹配** | 從上下文理解「剛驗證什麼」，匹配對應行 |
| 驗證紀錄位置 | **進度表下方** | 新增「### API 驗證紀錄」區塊 |

### 新流程設計

```
└─ 8. 【自動更新提案文件】（驗證通過時）
    │
    ├─ 8.1 判斷是否有 proposal
    │   ├─ 從對話上下文找最近讀取的 proposal 路徑
    │   ├─ 有 → 繼續
    │   └─ 無 → 跳過此步驟
    │
    ├─ 8.2 更新進度表
    │   ├─ 搜尋「📊 實作進度」或「實作進度」區塊
    │   ├─ AI 根據上下文理解「剛驗證什麼」
    │   └─ 智能匹配對應行，更新狀態為 ✅ 通過
    │
    └─ 8.3 新增驗證紀錄
        └─ 在進度表下方新增「### API 驗證紀錄（{環境}）」
            ├─ 驗證時間
            ├─ 驗證環境
            └─ 測試案例表格（ID、預期值、實際值、結果）
```

### 驗證紀錄格式

```markdown
### API 驗證紀錄（Dev）

**驗證時間**：2026-01-27
**驗證環境**：Local Server (port 3001) + Dev DB (eagle-dev)

| 測試案例 | ID | 預期值 | API 回傳值 | 結果 |
|----------|----|---------|-----------:|------|
| 內部編碼 153 | 44663 | 苗栗縣通霄鎮 | 苗栗縣通霄鎮 | ✅ |
| 內部編碼 149 | 44658 | 苗栗縣頭份市 | 苗栗縣頭份市 | ✅ |
| 有 addressRoadId | 44661 | 不受影響 | 苗栗縣苑裡鎮 國光巷 | ✅ |
```

### 需要的修改

| 項目 | 內容 |
|------|------|
| `/check-result` 設計稿 | ✅ 已更新（本次變更）|
| `/check-result` 定義檔 | 待更新：加入步驟 8「自動更新提案文件」|

### 設計優點

1. **減少人工介入**：驗證完成後自動更新，不需用戶提醒
2. **完整紀錄**：驗證過程和結果都有紀錄，方便追溯
3. **智能匹配**：AI 從上下文理解，不需要額外參數

---

## 設計變更：使用 Task 工具追蹤步驟完成度（2026-01-27）

### 問題發現

**觸發情境**：執行 `/check-result dev` 驗證 Solution B 實作後，AI 遺漏了 Step 8（更新提案文件），即使定義檔已經寫清楚。

**問題根因**：
- Skill 定義是「指引」，AI 可能因為上下文太長、注意力分散而遺漏步驟
- 沒有機制強制 AI 逐項完成所有步驟
- 輸出格式雖然有「提案文件更新」欄位，但不是強制檢查

### 方案討論

| 方案 | 說明 | 優點 | 缺點 | 決策 |
|------|------|------|------|------|
| A | Hook 系統檢查 | 系統層級強制 | 難以判斷「哪個步驟完成」 | ❌ 不採用 |
| B | 輸出格式強制驗證 | 簡單、不需額外工具 | 依賴 AI 自律 | ❌ 不夠可靠 |
| C | Skill 結尾 Checklist | 低成本 | 仍依賴 AI 自律 | ❌ 不夠可靠 |
| D | **Task 工具追蹤** | 視覺化、強制逐項完成 | 增加 token 消耗 | ✅ 採用 |

**最終決策**：採用 **方案 D - Task 工具追蹤**

### 設計細節

#### Step 0: 建立進度追蹤（強制）

執行開始時，使用 TaskCreate 建立所有步驟：

```
TaskCreate: "Step 1: 環境切換"
TaskCreate: "Step 2: 上下文分析"
TaskCreate: "Step 3: DB 查詢測試資料"
TaskCreate: "Step 4: Server 啟動 (port 3001)"
TaskCreate: "Step 5: 取得 Token"
TaskCreate: "Step 6: API 驗證"
TaskCreate: "Step 7: 結果分析"
TaskCreate: "Step 8: 更新提案文件"
```

#### 執行規則

1. **開始步驟時**：執行 `TaskUpdate(status: "in_progress")`
2. **完成步驟時**：執行 `TaskUpdate(status: "completed")`
3. **結束前檢查**：執行 `TaskList` 確認所有 task 都是 completed
4. **有未完成 task**：先完成再輸出結果

### 新流程設計

```
/check-result 執行流程（Task 追蹤版）
│
├─ 0. 【建立進度追蹤】（強制）
│   └─ 使用 TaskCreate 建立 Step 1-8 的 task
│
├─ 1-7. 【原有步驟】
│   └─ 每個步驟開始時 in_progress，完成時 completed
│
├─ 8. 【更新提案文件】
│   └─ 完成後標記 completed
│
└─ 9. 【結束前檢查】（強制）
    ├─ 執行 TaskList 確認所有 task 狀態
    ├─ 全部 completed → 輸出結果
    └─ 有未完成 → 先補完成再輸出
```

### 需要的修改

| 項目 | 內容 |
|------|------|
| `/check-result` 設計稿 | ✅ 已更新（本次變更）|
| `/check-result` 定義檔 | 待更新：加入 Step 0 和 Step 9 |

### 設計優點

1. **視覺化追蹤**：用戶可以看到進度，AI 也有明確目標
2. **強制逐項完成**：Task 狀態是可見的，遺漏會被發現
3. **通用性高**：可套用到其他 skill（如 `/gcommit-push`、`/implement`）

### 設計缺點

1. **Token 消耗增加**：每個 TaskCreate/TaskUpdate 都是 API 調用
2. **執行時間略增**：多了 task 操作的開銷

### 適用範圍

建議套用到步驟數 ≥ 5 的 skill：
- ✅ `/check-result`（8 步驟）
- ✅ `/gcommit-push`（15 步驟）
- ✅ `/implement`（多步驟）
- ❌ `/reviewDoc`（3 步驟，不需要）

---

## 設計變更：禁止手動操作 .env 檔案（2026-01-28）

### 問題發現

**觸發情境**：執行 `/check-result dev` 時，AI 嘗試使用 `cp .env.dev .env` 手動切換環境，而不是使用 `db-tunnel.sh`。

**問題**：
- AI 沒有遵循 Step 1 定義的 `./scripts/db-tunnel.sh $1 all` 指令
- 手動操作 .env 會繞過 db-tunnel.sh 的完整流程（包含 tunnel 建立、狀態檢查等）
- 用戶需要手動拒絕並糾正 AI 的操作

**根因分析**：
- Skill 定義檔只說「要做什麼」，沒有明確說「不能做什麼」
- AI 可能基於過去經驗，認為 `cp .env` 是有效的替代方案

### 方案討論

| 方案 | 說明 | 優點 | 缺點 | 決策 |
|------|------|------|------|------|
| A | PreToolUse Hook 攔截 `cp .env` 操作 | 硬性防護，直接阻擋 | 需要判斷是否在 /check-result 流程中，複雜度高 | ❌ 不採用 |
| A-1 | Skill 設定標記 + Hook 檢查 | 精準攔截特定 skill | 需要維護標記機制，增加複雜度 | ❌ 不採用 |
| A-2 | 全域 Hook 攔截所有 .env 操作 | 簡單，一勞永逸 | 範圍過廣，可能影響其他合法操作 | ❌ 不採用 |
| **B** | **在 Skill 定義中加入「禁止操作」區塊** | 簡單直接，利用現有 Task 追蹤機制 | 軟性防護，依賴 AI 遵守 | ✅ 採用 |

**最終決策**：採用 **方案 B**

### 決策理由

1. **已有 Task 追蹤機制**：`/check-result` 已使用 Task 工具追蹤步驟，AI 執行時會明確看到每個步驟的要求
2. **低複雜度**：不需要額外 Hook，只需在定義檔中明確標註禁止操作
3. **足夠有效**：Task description 中寫清楚「禁止 cp .env」，AI 在執行 Step 1 時會看到
4. **可觀察性**：如果 AI 再次違反，可以考慮升級到 Hook 方案

### 實作方式

在 `/check-result` 定義檔的 Step 1 加入禁止操作說明：

```markdown
### Step 1: 切換資料庫環境

根據參數切換到對應的 DB 並啟動 MSSQL Tunnel：

```bash
# ✅ 正確做法
./scripts/db-tunnel.sh $1 all

# ⚠️ 【強制】確認切換成功
./scripts/db-tunnel.sh status
```

**❌ 禁止操作**：

| 禁止操作 | 原因 |
|---------|------|
| `cp .env.dev .env` | 繞過 db-tunnel.sh 的完整流程 |
| `cp .env.staging .env` | 繞過 db-tunnel.sh 的完整流程 |
| 任何手動修改 .env | 可能導致環境狀態不一致 |

> ⚠️ 環境切換**只能**透過 `db-tunnel.sh`，禁止任何手動 .env 操作
```

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 記錄問題和決策 | ✅ 已完成 |
| `/check-result` 定義檔 | 在 Step 1 加入禁止操作說明 | ✅ 已完成 |

### 後續觀察

如果方案 B 實施後仍有違規情況：
1. 考慮升級到方案 A-2（全域 Hook）
2. 或在 Task description 中使用更強烈的警告語句

---

## 設計變更：Task Subject 加入 Port 3001 強調（2026-01-29）

### 問題發現

**觸發情境**：執行 `/check-result` 時，AI 嘗試啟動非 3001 port 的 server。

**問題**：Task 建立處的 subject 太簡略：
```
TaskCreate: subject="Step 4: Server 啟動"
```

AI 執行時只看到「Server 啟動」，沒注意到要用 **port 3001**。

雖然流程圖和 Step 4 詳細說明有寫 `確認 port 3001 已釋放`，但 Task description 沒有包含這個關鍵資訊。

### 設計決策

在 Task 的 subject 和 activeForm 中加入 port 資訊，讓 AI 在建立和執行 Task 時都能看到：

**修改前**：
```
TaskCreate: subject="Step 4: Server 啟動", activeForm="啟動 Server 中"
```

**修改後**：
```
TaskCreate: subject="Step 4: Server 啟動 (port 3001)", activeForm="啟動 Server (port 3001)..."
```

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 定義檔 | Task subject 加入 port 3001 | ✅ 已完成 |
| `/check-result` 設計稿 | 同步更新 TaskCreate 範例 | ✅ 已完成 |

### 設計經驗

**原則**：Task 的 subject/activeForm 應包含關鍵約束條件，不能只依賴詳細說明區塊。AI 執行時主要看 Task 狀態，可能忽略其他區塊的細節。

---

## 設計變更：API 錯誤時自動查 Server 日誌（2026-01-29）

### 問題發現

**觸發情境**：執行 `/check-result dev` 驗證 Bug 7（stalls id 過濾）實作時，API 返回 500 錯誤。

**問題**：
- AI 沒有主動去查 Server 日誌找出錯誤原因
- 需要用戶人為介入提醒：「你不是連到 dev db 然後把 server 跑起來嗎，那你不就能看到 500 的 log 嗎」
- 日誌位置在 `/tmp/dev-server.log`，但 skill 定義沒有提到這個

**根因分析**：
1. **流程缺失**：Step 7「結果分析」只有「比對 DB 預期值 vs API 回傳值」，沒有處理 API 失敗的情況
2. **知識缺失**：`start-dev-server.sh` 會把日誌寫到 `/tmp/dev-server.log`，但這個資訊沒有在 skill 定義中
3. **分支不完整**：沒有「API 失敗 → 查日誌」的分支

### 設計決策

在 Step 7 加入 **API 錯誤自動查日誌** 的分支：

```
├─ 7. 【結果分析】
│   │
│   ├─ API 成功（2xx）
│   │   └─ 比對 DB 預期值 vs API 回傳值
│   │
│   └─ API 失敗（4xx/5xx）【自動查日誌】
│       ├─ 查看 Server 日誌：tail /tmp/dev-server.log
│       ├─ 搜尋錯誤關鍵字：error|exception|duplicate
│       └─ 輸出診斷報告（錯誤訊息 + 可能原因）
```

### 常見錯誤診斷表

| 錯誤關鍵字 | 可能原因 | 解決方向 |
|-----------|---------|---------|
| `duplicate key` | Sequence 不同步 | 檢查 DB sequence，執行 `setval()` |
| `not found` | 資料不存在 | 確認測試資料 ID 正確 |
| `relation does not exist` | Table 名稱錯誤 | 確認 Entity 對應的實際 table 名稱 |
| `null value in column` | 必填欄位缺少 | 檢查 DTO 和 Entity 定義 |

### 診斷報告格式

```markdown
❌ API 返回 {statusCode} 錯誤

**錯誤訊息**：{從日誌提取的錯誤訊息}

**Stack Trace**（關鍵部分）：
{相關的程式碼位置}

**可能原因**：{根據錯誤類型判斷}

**建議修復**：{具體修復方向}
```

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 記錄問題和決策 | ✅ 已完成 |
| `/check-result` 定義檔 | Step 7 加入 API 錯誤處理分支 | ✅ 已完成 |

### 設計經驗

**原則**：Skill 流程設計應該考慮「失敗路徑」，不能只有「成功路徑」。當操作可能失敗時，必須定義失敗時的處理流程，特別是 Debug 所需的資訊來源。

---

## 設計變更：Bug Fix 驗證三步法（2026-01-29）

### 問題發現

**觸發情境**：執行 `/check-result` 驗證 bug fix 時，AI 直接打目標 API（如 POST），沒有先確認物件存在。

**用戶 feedback**：
> 應該是先撈 db 資料，然後打 findOne 然後再照著 bug spec 去打，不就知道了

**問題分析**：

現有 Step 6「API 驗證」只說：
```
**有測試資料時**：用 Step 3 找到的特定 ID 打 API
**無測試資料時**：一般驗證
```

**缺失**：
- 沒有說「打什麼 API」- findOne? findAll? POST?
- 沒有區分「確認性查詢」vs「目標操作」
- 沒有「照著 bug spec 操作」的指引
- 缺少「從 bug spec 操作步驟推導 API」的環節

### 設計決策：Bug Fix 驗證三步法

```
Bug Fix 驗證標準流程
│
├─ 1. 【推導 API 序列】從 bug spec 操作步驟找出要打的 API
│   ├─ 讀取 bug spec 的「重現步驟」
│   │   例如：「點擊成交物件 → 填寫資料 → 點擊儲存」
│   │
│   ├─ 對照前端專案，找出每個步驟對應的 API
│   │   ├─ 前端專案：dashboard-nuxt / frontend-nuxt
│   │   ├─ 找到對應的 Vue 檔案
│   │   └─ 看 handleSubmit() 或相關方法打的是什麼 API
│   │
│   └─ 產出 API 序列
│       例如：GET /estate-listings/{id} → POST /estate-transactions
│
├─ 2. 【存在性確認】先打 findOne/findAll 確認物件可查詢
│   ├─ 用 DB 查到的 ID 打查詢 API
│   ├─ 確認 API 正常回傳
│   └─ 比對 DB 預期值 vs API 回傳值
│
└─ 3. 【Bug Spec 模擬】照著 bug spec 操作打目標 API
    ├─ 根據 bug spec 描述的步驟
    ├─ 打對應的 API（POST/PUT/PATCH）
    └─ 驗證錯誤是否修復
```

### 需要修改的內容

**位置**：`backend-nestjs/.claude/commands/check-result.md` 的 Step 6

**現有 Step 6**：
```markdown
### Step 6: API 驗證

**有測試資料時**：用 Step 3 找到的特定 ID 打 API
**無測試資料時**：一般驗證
```

**修改為**：
```markdown
### Step 6: API 驗證

#### 6.1 推導 API 序列（Bug Fix 場景必做）

如果是驗證 bug fix（從對話上下文判斷）：
1. 從對話中找到 bug spec 的「重現步驟」
2. 對照前端專案（dashboard-nuxt / frontend-nuxt），找出每個步驟對應的 API
3. 記錄要打的 API 序列（如：GET /estate-listings/{id} → POST /estate-transactions）

#### 6.2 存在性確認

先打 findOne/findAll 確認物件存在：
```bash
# 用 Step 3 找到的 ID 打查詢 API
./.claude/scripts/test-dashboard-api.sh "/estate-listings/{id}" ".data"
```
- 確認 API 正常回傳
- 比對 DB 預期值 vs API 回傳值

#### 6.3 Bug Spec 模擬

照著 bug spec 操作打目標 API：
```bash
# 根據 bug spec 步驟打對應 API
./.claude/scripts/test-dashboard-api.sh "/estate-transactions" \
  -X POST -d '{"realEstateId": {id}, ...}'
```
- 驗證錯誤是否修復
- 記錄結果

#### 非 Bug Fix 場景

如果不是驗證 bug fix（如：新功能、refactor）：
- 直接用特定 ID 打對應的 findOne/findAll API
- 比對 DB 預期值 vs API 回傳值
```

### 流程圖更新

**原流程圖**：
```
├─ 6. 【API 驗證】
│   ├─ 有測試資料 → 用特定 ID 打 API
│   └─ 無測試資料 → 一般驗證
```

**修改為**：
```
├─ 6. 【API 驗證】
│   │
│   ├─ 【Bug Fix 場景】
│   │   ├─ 6.1 推導 API 序列（從 bug spec 操作步驟 → 前端程式碼 → API）
│   │   ├─ 6.2 存在性確認（先打 findOne/findAll）
│   │   └─ 6.3 Bug Spec 模擬（照著 bug spec 打目標 API）
│   │
│   └─ 【非 Bug Fix 場景】
│       └─ 直接用特定 ID 打對應 API
```

### 設計經驗

| 項目 | 說明 |
|------|------|
| 為什麼需要「推導 API 序列」？ | Bug spec 有操作步驟，這些步驟對應到前端程式碼，前端程式碼會打 API。直接看 bug spec 不夠，要找到實際打的 API |
| 為什麼先打 findOne？ | 確認物件存在、API 正常，才能驗證後續操作。如果 findOne 就失敗，問題在查詢不在操作 |
| 為什麼要「照著 bug spec 打」？ | 模擬用戶實際操作，才能驗證 bug 是否真的修復 |

### 實作狀態

- [x] 問題分析（2026-01-29）
- [x] 設計決策（2026-01-29）
- [x] 更新設計稿（2026-01-29）
- [x] 更新 `/check-result` skill 定義檔（2026-01-29）
- [ ] 測試驗證

---

## UI-API 索引整合（2026-01-30）

### 整合內容

將 `/build-ui-index` 產生的 UI-API 索引整合到 `/check-result` 的 Step 6.1「推導 API 序列」，讓 AI 可以快速查表取得 API，不用每次都手動搜尋前端專案。

### 修改項目

| 項目 | 內容 | 狀態 |
|------|------|------|
| 定義檔 module 引用 | 加入 `@ui-api-index.md` | ✅ 已完成 |
| 流程圖 Step 6.1 | 加入索引查詢分支 | ✅ 已完成 |
| 詳細說明 Step 6.1 | 加入索引查詢步驟 | ✅ 已完成 |
| 設計稿 | 新增本區塊紀錄 | ✅ 已完成 |

### 相關文件

| 文件 | 用途 |
|------|------|
| `modules/ui-api-index.md` | 共用 module，說明如何查詢索引 |
| `ui-api-index-dashboard.md` | Dashboard 前端的 UI → API 對照表 |
| `ui-api-index-frontend.md` | Frontend 前端的 UI → API 對照表 |
| `build-ui-index_skill_proposal.md` | `/build-ui-index` skill 設計稿 |

### 效益

1. **減少搜尋時間**：直接查表，不用每次 grep 前端專案
2. **與 /debugP 一致**：兩個 skill 使用相同的索引查詢方式
3. **提高準確度**：索引是預先掃描產生，比臨時搜尋更完整

### 索引更新機制

- 執行 `/pull-frontend` 後會提示是否需要更新索引
- 手動執行 `/build-ui-index` 更新索引

---

## 設計變更：檔案可存取性驗證（2026-01-30）

### 問題發現

**觸發情境**：執行 `/check-result dev` 驗證契變檔案問題（問題 6）時，API 回傳 `files` 陣列只有 1 筆，HTTP 200 表示成功，但用戶指出：「需要確認檔案是可以讀的，只是 200 是指 api 能 work 而已」

**問題**：
- 現有流程只驗證「API 回傳正確資料」
- 沒有驗證「回傳的檔案 URL 是否真的能下載」
- 沒有驗證「下載的檔案內容是否有效」

**實際需要的驗證**：
1. HTTP Status = 200（API 能存取）
2. Content-Type 正確（如 application/pdf）
3. 檔案格式正確（用 `file` 命令驗證）
4. 檔案大小合理（> 0 bytes）

### 設計決策

| 問題 | 決策 | 說明 |
|------|------|------|
| 觸發條件 | 跟檔案有關的 bug 或票就觸發 | 標題/內容含「檔案」「文件」「上傳」「file」等關鍵字，或 API 回傳含 `fileUrl`/`files` |
| 適用 Skill | `/debugP` 和 `/check-result` 都需要 | 兩個 skill 都可能驗證檔案相關功能 |
| 驗證程度 | 完整驗證 | 下載 + file 命令 + 檔案大小，不只是 HTTP status |

### 觸發條件判斷

| 判斷依據 | 範例 | 觸發 |
|---------|------|------|
| Bug spec 標題/內容含檔案關鍵字 | 「契變文件上傳儲存會被阻擋」 | ✅ |
| API 回傳包含 `fileUrl`、`attachmentUrl`、`files` 欄位 | `{ files: [{ fileUrl: "..." }] }` | ✅ |
| 涉及的 Entity/Service 是 FileService 相關 | `contractChangeFiles`、`estateListingFiles` | ✅ |
| 都不符合 | 純資料欄位驗證 | ❌ 跳過 |

**檔案相關關鍵字**：
- 中文：檔案、文件、上傳、下載、附件
- 英文：file、upload、download、attachment

### 新增流程

```
檔案可存取性驗證（Step 6.4 / Step 5.4）
│
├─ 觸發判斷
│   ├─ Bug spec 含檔案相關關鍵字 → 觸發
│   ├─ API 回傳含 fileUrl/files → 觸發
│   └─ 都不符合 → 跳過此驗證
│
├─ 驗證步驟
│   │
│   ├─ 1. 【下載檔案】
│   │   └─ curl -s -D - "{fileUrl}" -o /tmp/verify_file_{timestamp}
│   │
│   ├─ 2. 【檢查 HTTP Response】
│   │   ├─ Status Code = 200
│   │   └─ Content-Type 符合預期（application/pdf, image/jpeg 等）
│   │
│   ├─ 3. 【驗證檔案格式】
│   │   └─ file /tmp/verify_file_{timestamp}
│   │       ├─ PDF → "PDF document, version X.X"
│   │       ├─ JPEG → "JPEG image data"
│   │       └─ PNG → "PNG image data"
│   │
│   ├─ 4. 【檢查檔案大小】
│   │   └─ ls -la /tmp/verify_file_{timestamp}
│   │       └─ 大小 > 0 bytes
│   │
│   └─ 5. 【清理暫存檔】
│       └─ rm /tmp/verify_file_{timestamp}
│
└─ 輸出結果
    │
    ├─ 全部通過
    │   └─ 檔案可存取性驗證：✅ 通過
    │       ├─ HTTP Status: 200
    │       ├─ Content-Type: application/pdf
    │       ├─ 檔案格式: PDF document, version 1.3
    │       └─ 檔案大小: 50,898 bytes
    │
    └─ 有失敗項目
        └─ 檔案可存取性驗證：❌ 失敗
            └─ [具體失敗原因]
```

### 整合位置

在 Step 6「API 驗證」內新增 6.4：

```
├─ 6. 【API 驗證 - Bug Fix 三步法】
│   │
│   ├─ 6.1 推導 API 序列
│   ├─ 6.2 存在性確認
│   ├─ 6.3 Bug Spec 模擬
│   └─ 6.4 【新增】檔案可存取性驗證（條件觸發）
│       ├─ 觸發條件：檔案相關 bug 或 API 回傳含 fileUrl
│       └─ 驗證：下載 + Content-Type + file 命令 + 檔案大小
```

### 驗證紀錄格式

```markdown
### 檔案可存取性驗證

| 檔案 | HTTP Status | Content-Type | 檔案格式 | 大小 | 結果 |
|------|-------------|--------------|----------|------|------|
| 測試用PDF檔.pdf | 200 | application/pdf | PDF document, version 1.3 | 50,898 bytes | ✅ |
```

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 記錄問題和決策 | ✅ 已完成 |
| `/debugP` 設計稿 | 同步更新 | 待更新 |
| `/check-result` 定義檔 | Step 6 新增 6.4 | 待更新 |
| `/debugP` 定義檔 | Step 5 新增 5.4 | 待更新 |

### 設計經驗

**原則**：驗證檔案相關功能時，不能只看 API 回傳結構正確，必須實際下載檔案確認內容有效。HTTP 200 只代表「請求成功」，不代表「檔案可用」。

---

## 2026-01-31 設計變更：帳號智能識別

### 問題描述

QA 在 Notion 票的留言中會指定要測試的帳號，例如：

```
seven02/test0000 (店長)
```

目前 `/check-result` 使用預設帳號 `12345678` 取得 Token，但有時候需要用特定帳號才能重現問題（例如權限、分店關聯等）。

### 設計方案

在 Step 5「取得 Token」之前，新增 Step 4.5「帳號智能識別」：

```
帳號智能識別流程
│
├─ 1. 【掃描 Bug Spec 留言區塊】
│   ├─ 從對話上下文找到 bug spec 路徑
│   ├─ 搜尋 ## 留言 區塊
│   └─ 用正則匹配 account/password 格式
│
├─ 2. 【判斷】
│   ├─ 有找到 → 使用留言指定的帳號（取最後一個）
│   └─ 沒找到 → 使用預設帳號 12345678
│
└─ 3. 【輸出提示】
    └─ 「📌 使用留言指定帳號：{account}」或「📌 使用預設帳號」
```

### 整合位置

原流程：
```
├─ 4. 【Server 啟動】
├─ 5. 【取得 Token】
│   └─ ./.claude/scripts/get-token.sh local
```

新流程：
```
├─ 4. 【Server 啟動】
├─ 4.5 【帳號智能識別】（新增）
│   ├─ 掃描 bug spec 留言
│   └─ 決定使用的帳號
├─ 5. 【取得 Token】
│   └─ ./.claude/scripts/get-token.sh local $ACCOUNT
```

### /check-result 完整流程圖（v2）

```
/check-result 執行流程（v2 - 含帳號智能識別）
│
├─ 0. 【建立進度追蹤】（強制）
│   └─ 使用 TaskCreate 建立所有步驟的 task
│
├─ 1. 【環境切換】
│   └─ ./scripts/db-tunnel.sh $1 all
│
├─ 2. 【上下文分析】
│   ├─ 從對話上下文理解：
│   │   ├─ 剛完成什麼實作
│   │   ├─ 涉及哪些欄位/邏輯
│   │   └─ proposal 文件內容
│   │
│   └─ 判斷驗證類型：
│       ├─ Bug Fix 驗證 → 走三步法
│       ├─ 涉及 DB 欄位/計算 → 需要先查 DB
│       └─ 純 DTO/格式變更 → 直接打 API
│
├─ 2.5 【帳號智能識別】（🆕 新增）
│   │
│   ├─ 從對話上下文找到 bug spec 路徑
│   │
│   ├─ 掃描整份 Bug Spec（主內容 + 留言區塊）
│   │   └─ 正則匹配：account/password 格式
│   │
│   ├─ 識別結果：
│   │   ├─ 找到 1 個帳號 → 記錄，後續使用
│   │   ├─ 找到多個帳號 → 記錄所有，準備迭代驗證
│   │   └─ 沒找到 → 使用預設帳號 12345678
│   │
│   └─ 輸出：
│       └─ 「📌 發現 N 個測試帳號：{帳號列表}」
│
├─ 3. 【條件分流：DB 查詢測試資料】
│   │
│   ├─ 【涉及 DB】
│   │   ├─ 用 psql 查詢測試資料
│   │   └─ 記錄 ID + 預期值
│   │
│   └─ 【不涉及 DB】
│       └─ 跳過此步驟
│
├─ 4. 【Server 啟動】（遵循 curl-token.md SOP）
│   ├─ pkill -f "nest start" || true
│   ├─ 確認 port 3001 已釋放
│   └─ 啟動 start-dev-server.sh
│
├─ 5-7. 【多帳號迭代驗證】（🆕 修改）
│   │
│   │   ┌─────────────────────────────────────────┐
│   │   │  迭代：對每個測試帳號執行 5 ~ 7          │
│   │   └─────────────────────────────────────────┘
│   │
│   ├─ 5. 【取得 Token】（使用當前帳號）
│   │   ├─ 輸出：「📌 [{N}/{Total}] 驗證帳號：{account}（{角色}）」
│   │   └─ ./.claude/scripts/get-token.sh local {account/password}
│   │
│   ├─ 6. 【API 驗證 - Bug Fix 三步法】
│   │   ├─ 6.1 推導 API 序列
│   │   ├─ 6.2 存在性確認
│   │   ├─ 6.3 Bug Spec 模擬
│   │   └─ 6.4 檔案可存取性驗證（條件觸發）
│   │
│   ├─ 7. 【結果分析】
│   │   ├─ API 成功（2xx）→ 比對 DB 預期值 vs API 回傳值
│   │   └─ API 失敗（4xx/5xx）→ 自動查日誌
│   │
│   ├─ 7.5 【更新 Proposal - 當前帳號結果】（🆕 新增）
│   │   └─ 在 proposal 新增當前帳號的驗證紀錄
│   │
│   └─ ↺ 下一個帳號（如果有）
│
├─ 8. 【自動更新提案文件】（驗證完成時）
│   ├─ 8.1 判斷是否有 proposal
│   ├─ 8.2 更新進度表
│   └─ 8.3 確認所有帳號驗證紀錄已寫入
│
└─ 9. 【結束前檢查】（強制）
    ├─ 執行 TaskList 確認所有 task 狀態
    ├─ 全部 completed → 輸出多帳號驗證摘要
    └─ 有未完成 → 先補完成再輸出
```

### 與 /debugP 的差異

| 項目 | /debugP | /check-result |
|------|--------|---------------|
| 更新時機 | 所有帳號測完 → 統一產出提案 | 每個帳號測完 → 立即更新 proposal |
| 原因 | 需要看完全貌才能分析 | 驗證已實作功能，可逐步記錄 |

### 執行範例（多帳號）

```bash
# 1. AI 識別帳號
📌 發現 2 個測試帳號：
   1. seven02/test0000（店長）
   2. seven04/test0000（經紀人）

# 2. 驗證帳號 1
📌 [1/2] 驗證店長帳號：seven02
./.claude/scripts/get-token.sh local seven02/test0000
# ... 執行驗證 ...
# ... 立即更新 proposal（帳號 1 結果）...

# 3. 驗證帳號 2
📌 [2/2] 驗證經紀人帳號：seven04
./.claude/scripts/get-token.sh local seven04/test0000
# ... 執行驗證 ...
# ... 立即更新 proposal（帳號 2 結果）...

# 4. 完成
✅ 多帳號驗證完成（2/2）
```

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 完整流程圖 v2 | ✅ 已完成 |
| `/check-result` 定義檔 | 新增帳號識別 + 多帳號迭代 | ✅ 已完成 |

---

## 2026-02-01 設計變更：Server 重啟條件判斷

### 問題描述

**觸發情境**：執行 `/check-result dev` 時，AI 無條件執行 `pkill -f "nest start"`，即使 DB 沒有切換。

**用戶 feedback**：
> 只要沒切換 db 都不該關 server kill 3001 port，因為只有連不同 db 才要 kill 3001 port 重啟 server

**問題分析**：

現有 Step 4 設計（流程圖和定義檔）：
```
├─ 4. 【Server 啟動】（遵循 curl-token.md SOP）
│   ├─ pkill -f "nest start" || true      ← 無條件 kill
│   ├─ 確認 port 3001 已釋放
│   └─ 啟動 start-dev-server.sh
```

**設計缺陷**：沒有「條件判斷」，無論 DB 是否切換都會 kill + 重啟。

### 設計決策

| 情況 | 是否需要重啟 | 原因 |
|------|-------------|------|
| Step 1 實際切換了 DB | ✅ 需要 | Server 需要重新連線到新 DB |
| Step 1 沒切換（已經連對的 DB）| ❌ 不需要 | Server 已經在運行且連對的 DB |

### 修改內容

**流程圖修改**：
```
├─ 4. 【Server 啟動】（條件判斷）
│   │
│   ├─ 4.1 檢查是否需要重啟
│   │   ├─ Step 1 有切換 DB → 需要重啟
│   │   └─ Step 1 沒切換（已連對的 DB）→ 跳過重啟
│   │
│   ├─ 4.2 【需要重啟時】
│   │   ├─ pkill -f "nest start" || true
│   │   ├─ 確認 port 3001 已釋放
│   │   └─ 啟動 start-dev-server.sh
│   │
│   └─ 4.3 【不需要重啟時】
│       └─ 確認 server 運行中（lsof -i :3001）
```

**判斷依據**：
- Step 1 輸出「已切換到 XXX DB」→ 需要重啟
- Step 1 輸出「已經連線中」或目標環境相同 → 不需要重啟

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 流程圖 | Step 4 加入條件判斷 | ✅ 已完成 |
| `/check-result` 定義檔 | Step 4 加入條件判斷 | ✅ 已完成 |
| `/check-result` 設計稿 | 記錄問題和決策 | ✅ 已完成 |

### 設計經驗

**原則**：Server 重啟是有成本的操作（需要等待啟動時間），不應該無條件執行。應該根據實際需求判斷是否需要重啟。

---

## 2026-01-31 設計變更：驗證紀錄詳細格式

### 問題描述

**觸發情境**：執行 `/check-result dev` 驗證 Problem 4 實作後，用戶反映驗證紀錄不夠詳細。

**用戶 feedback**：
> 我希望的是，驗證完成後紀錄如何驗證，request 怎麼打，紀錄到 proposal
> 但是我剛剛看都是我通知後你才會紀錄

**問題分析**：

現有 Step 8.3 的驗證紀錄格式過於簡略：

```markdown
| 測試案例 | ID | 預期值 | API 回傳值 | 結果 |
|----------|----|---------|-----------:|------|
| {案例描述} | {id} | {預期} | {實際} | ✅/❌ |
```

**缺失**：
- 沒有記錄完整的 curl 命令
- 沒有記錄 request body
- 沒有記錄 response 內容
- 無法從紀錄中重現驗證過程

### 設計決策

| 問題 | 決策 | 說明 |
|------|------|------|
| 紀錄詳細程度 | **完整記錄** | 包含 curl 命令、request body、response |
| 格式結構 | **每個測試案例獨立區塊** | 方便閱讀和重現 |
| 自動化程度 | **AI 主動記錄** | 不等用戶提醒，驗證完立即記錄 |

### 新的驗證紀錄格式

```markdown
### API 驗證紀錄（{環境}）

**驗證時間**：YYYY-MM-DD
**驗證環境**：Local Server (port 3001) + {環境} DB

---

#### 測試案例 1：{案例描述}

**Request**：
```bash
curl -X POST "http://localhost:3001/api/v1/{endpoint}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "value1",
    "field2": "value2"
  }'
```

**Response**（關鍵部分）：
```json
{
  "statusCode": 400,
  "message": ["錯誤訊息"],
  "error": "Bad Request"
}
```

**結果**：✅ 通過
**說明**：修改前會返回 500 Internal Server Error，修改後正確返回 400 並顯示友善錯誤訊息

---

#### 測試案例 2：{案例描述}

**Request**：
```bash
curl -X POST "http://localhost:3001/api/v1/{endpoint}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response**（關鍵部分）：
```json
{...}
```

**結果**：✅ 通過
**說明**：{修改前 vs 修改後的差異}
```

### 與簡略格式的對比

| 項目 | 舊格式（簡略） | 新格式（詳細） |
|------|---------------|---------------|
| curl 命令 | ❌ 無 | ✅ 完整記錄 |
| request body | ❌ 無 | ✅ 完整記錄 |
| response | ❌ 只有「API 回傳值」欄位 | ✅ 完整 JSON 結構 |
| 可重現性 | ❌ 無法重現 | ✅ 可直接複製執行 |
| 修改說明 | ❌ 無 | ✅ 明確說明前後差異 |

### AI 執行規則

**Step 8.3 執行時必須**：
1. **主動記錄**：驗證完成後立即記錄，不等用戶提醒
2. **完整記錄**：每個測試案例都要有 curl、response、說明
3. **可重現性**：記錄的 curl 命令可直接複製執行
4. **差異說明**：明確說明修改前後的行為差異

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 新增詳細驗證紀錄格式 | ✅ 已完成 |
| `/check-result` 定義檔 | 更新 Step 8.3 格式 | ✅ 已完成 |

---

## 2026-02-01 設計變更：TaskCreate 與實際步驟不同步問題

### 問題描述

**觸發情境**：執行 `/check-result dev` 時，AI 跳過了 Step 6.1「推導 API 序列」，直接用 proposal 裡的假設命令打 API，沒有查詢 UI-API 索引。

**用戶 feedback**：
> check-result 沒照著前端的 request body 打啊？我們在 /debugP 不是有前端程式碼的索引表嗎？

**根因分析**：

1. **定義檔有詳細步驟**：Step 6 包含 6.1, 6.2, 6.3, 6.4 子步驟
2. **TaskCreate 沒有同步**：Step 0 的 TaskCreate 只有：
   ```
   TaskCreate: subject="Step 5-7: 多帳號迭代驗證"
   ```
3. **粒度太粗**：AI 建立的 Task 沒有細到子步驟，導致執行時容易跳過

**問題本質**：
- 我們後來在定義檔加了很多步驟（6.1, 6.2, 6.3, 6.4）
- 但 Step 0 的 TaskCreate 列表沒有同步更新
- 沒有機制確保「定義檔步驟」=「TaskCreate 列表」=「流程圖步驟」

### 設計決策

需要一個 skill 或機制來確保三者同步：

| 項目 | 說明 |
|------|------|
| 定義檔步驟 | `check-result.md` 中的 Step 1, 2, 3... |
| TaskCreate 列表 | Step 0 中要建立的 tasks |
| 流程圖步驟 | `check-result_flowchart.md` 中的步驟 |

**方案討論**：

| 方案 | 說明 | 優點 | 缺點 | 決策 |
|------|------|------|------|------|
| A | 人工檢查 | 簡單 | 容易遺漏 | ❌ 不可靠 |
| B | 新增 `/syncSkill` skill | 自動比對三份文件並同步 | 需要開發、可能複雜 | 🤔 待評估 |
| C | 在 `/readDesign` 加入檢查 | 設計時就檢查一致性 | 預防性措施 | ✅ 可行 |
| D | 流程圖作為單一來源 | 從流程圖自動生成 TaskCreate | 最根本的解法 | ✅ 推薦 |

**初步結論**：

1. **短期**：手動更新 `/check-result` 的 TaskCreate 列表，加入所有子步驟
2. **長期**：考慮開發 `/syncSkill` 或在設計流程加入一致性檢查

### 需要同步的 TaskCreate 列表

**現有（粒度太粗）**：
```
TaskCreate: subject="Step 5-7: 多帳號迭代驗證"
```

**應該改為（細粒度）**：
```
TaskCreate: subject="Step 5: 取得 Token", activeForm="取得 Token..."
TaskCreate: subject="Step 6.1: 推導 API 序列", activeForm="查詢 UI-API 索引..."
TaskCreate: subject="Step 6.2: 存在性確認", activeForm="確認物件存在..."
TaskCreate: subject="Step 6.3: Bug Spec 模擬", activeForm="模擬前端操作..."
TaskCreate: subject="Step 6.4: 檔案可存取性驗證", activeForm="驗證檔案可存取..."
TaskCreate: subject="Step 7: 結果分析", activeForm="分析結果..."
```

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 記錄問題和決策 | ✅ 已完成 |
| `/check-result` 定義檔 Step 0 | 更新 TaskCreate 列表 | ✅ 已完成（2026-02-01）|
| `/check-result` 流程圖 | 確認與定義檔一致 | ✅ 已確認一致 |
| 新增 `/updateDesign` skill | 自動檢查一致性 | ✅ 已實作（取代 /syncSkill）|

### 設計經驗

**原則**：
1. **TaskCreate 必須與實際步驟一一對應**：每個需要追蹤的步驟都要有對應的 Task
2. **更新定義檔時必須同步更新 TaskCreate**：加新步驟時，同時更新 Step 0
3. **考慮開發同步檢查工具**：避免人工遺漏

---

## 功能擴充：權限輔助模式 `/check-result -p`（2026-02-01）

### 需求背景

在 `/check-result` 驗證權限相關的修改時，遇到以下問題：

1. **不知道 DB 結構**：`realEstate.storeId` 是 integer 還是 varchar？對應哪個表？
2. **為每個角色找測試資料很慢**：每次都要重新查詢符合該角色 dataScope 的資料
3. **dataScope 查詢邏輯不清楚**：allStores / ownStore / ownData 各自怎麼查詢？

### 解決方案

新增 `-p` flag，載入 `permission-helper.md` module（與 `/debugP -p` 共用）。

#### 使用方式

```bash
/check-result dev -p
```

#### 執行流程（-p 模式）

```
/check-result dev -p
│
├─ 0. 【載入 permission-helper.md】
│   ├─ 權限 DB 結構（storeData.id vs storeData.storeId）
│   ├─ dataScope 查詢模板
│   └─ 測試帳號快速參考
│
├─ 2.5 【帳號智能識別】
│   └─ 從 login response 提取：
│       ├─ role → 判斷 dataScope
│       ├─ storeDataId → ownStore 查詢用
│       └─ sub (adminId) → ownData 查詢用
│
├─ 3. 【自動查詢測試資料】（根據 dataScope）
│   │
│   ├─ allStores → 任意 realEstateId
│   │
│   ├─ ownStore →
│   │   SELECT id FROM "realEstate"
│   │   WHERE "storeId" = {storeDataId}
│   │
│   └─ ownData →
│       SELECT r.id FROM "realEstate" r
│       JOIN "realEstatesAdmins" ra ON r.id = ra."realEstateId"
│       WHERE ra."adminId" = {sub}
│
└─ 5-7. 【迭代驗證】
    └─ 使用自動查詢到的測試資料
```

### 載入的知識

**Module**：`/Users/nicholas/Desktop/Projects/.claude/modules/permission-helper.md`

包含：
- 權限 DB 結構（Entity/Table 欄位對應）
- dataScope 類型與查詢模板
- 測試資料自動查詢 SQL
- 測試帳號快速參考（seven01-04）
- 權限驗證判斷邏輯（200/400/403 的意義）

### 與 `/debugP -p` 的分工

| Skill | 用途 | 載入的知識 |
|-------|------|-----------|
| `/debugP -p` | Debug 權限問題，產出 proposal | `2_permission_adjustment_rules.md` + `permission-helper.md` |
| `/check-result -p` | 驗證權限修改結果 | `permission-helper.md` |

**共用 module 的好處**：
- 權限 DB 結構知識只維護一份
- dataScope 查詢模板不用重複定義
- 測試帳號資訊統一管理

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `permission-helper.md` | 新增共用 module | ✅ 已完成 |
| `/debugP` 設計稿 | 記錄使用 permission-helper.md | ✅ 已完成 |
| `/check-result` 設計稿 | 新增 `-p` 模式說明 | ✅ 已完成 |
| `/debugP` 定義檔 | 新增 `@permission-helper.md` 引用 | ⏳ 待 /updateDesign |
| `/check-result` 定義檔 | 新增 `-p` 參數與 module 引用 | ⏳ 待 /updateDesign |

---

## 設計修正：預設帳號密碼格式防呆（2026-02-03）

### 問題發現

與 `/debugP` 相同的問題：AI 在帳號智能識別時，沒找到帳號卻錯誤地把 QA 格式密碼套用到預設帳號。

```bash
❌ get-token.sh local 12345678/test0000  → password = test0000 → 401
✅ get-token.sh local 12345678           → password = 12345678 → 成功
✅ get-token.sh local                    → password = 12345678 → 成功
```

### 根因分析

`check-result_flowchart.md` 步驟 2.5 帳號智能識別：
```
│   │   └─ 沒找到 → 使用預設帳號 12345678
```
沒有明確說明預設帳號帳密相同、禁止加 `/password`。

> 📌 同步自 `/debugP` 設計稿的相同修正（debug_skill_proposal.md 2026-02-03）

### 設計修正

在 `check-result_flowchart.md` 的帳號智能識別「沒找到」分支加入防呆：

```
├─ 2.5 【帳號智能識別】
│   ├─ 識別結果：
│   │   ├─ 找到 1 個帳號 → 記錄，後續使用
│   │   ├─ 找到多個帳號 → 記錄所有，準備迭代驗證
│   │   └─ 沒找到 → 使用預設帳號
│   │       ├─ 指令：get-token.sh local 12345678
│   │       └─ ⚠️ 預設帳號帳密相同，禁止加 /password
```

### 需要同步更新的檔案

| 檔案 | 變更內容 | 狀態 |
|------|----------|------|
| `check-result_skill_proposal.md` | 新增此設計變更記錄 | ✅ 已更新 |
| `check-result_flowchart.md` | 步驟 2.5 加入預設帳號防呆 | ⏳ 待 review 後更新 |
| `curl-token.md` module | 已在 debug 修正時一併更新 | ✅ 已更新 |

---

## 功能擴充：檔案上傳輔助模式 `/check-result -f`（2026-02-03）

### 需求背景

在 `/check-result` 驗證檔案上傳相關的實作時，遇到以下問題：

1. **Step 6.4 檔案可存取性驗證是條件觸發**：AI 需要自行判斷是否涉及檔案，可能漏掉
2. **缺少檔案上傳架構知識**：AI 不知道 CUSTOM_PATH_PREFIX、DOCUMENT_TYPE_MAPPING 等專案特有設定，驗證時可能遺漏關鍵檢查項
3. **與 `/debugP -f` 不對稱**：debug 階段用 `-f` 載入知識，但驗證階段沒有對應的 flag

**現有流程痛點**：
```
現有流程問題
│
├─ /check-result dev（一般驗證）
│   └─ Step 6.4 檔案可存取性驗證是條件觸發，AI 可能跳過
│
├─ 驗證完才發現
│   └─ 缺少檔案可存取性驗證
│
└─ 需要手動補驗
```

**期望流程**：
```
期望流程
│
├─ /check-result dev -f（明確告知「這是檔案相關的驗證」）
│   ├─ 自動載入檔案上傳架構知識
│   ├─ 強制執行 Step 6.4
│   └─ 額外執行 4 項檔案上傳專屬檢核
│
└─ 一步到位，不遺漏
```

### 設計討論（2026-02-03）

#### 方案比較

```
方案對比
│
├─ A. 維持現狀（Step 6.4 條件觸發）
│   ├─ 優點：不需修改
│   └─ 缺點：AI 可能漏判，忘記執行 6.4
│
├─ B. 智能檢測（自動判斷是否涉及檔案）
│   ├─ 從上下文關鍵字自動啟動：file、upload、S3、圖片
│   ├─ 優點：無需額外參數
│   └─ 缺點：可能誤判，與 /debugP -f 設計模式不一致
│
└─ C. /check-result dev -f（flag 風格）✅ 最終選擇
    ├─ 沿用 /debugP -f 和 /check-result -p 的設計模式
    ├─ 優點：與既有 flag 一致，用戶明確控制
    └─ 缺點：需要用戶記得加 -f
```

#### 最終決議

**選擇方案 C**：`/check-result dev -f`

**原因**：
1. 與 `/debugP -f` 和 `/check-result -p` 設計模式一致（flag 放最後）
2. 用戶明確控制，不依賴 AI 自動判斷
3. `/debugP -f` 已有先例，學習成本低

#### 與既有 flag 的一致性

| 面向 | `/debugP -f` | `/check-result -p` | `/check-result -f`（新增） |
|------|-------------|--------------------|-----------------------------|
| 觸發方式 | `-f` flag 放最後 | `-p` flag 放最後 | `-f` flag 放最後 |
| 知識載入時機 | 一般流程前 | Step 0 | Step 0（與 -p 一致） |
| 知識載入量 | 精簡版 (~2,500 tokens) | permission-helper.md | 精簡版 (~2,500 tokens) |
| 專屬檢核 | 6 項（最後檢核階段） | dataScope 驗證（融入既有步驟） | 4 項（Step 7 結果分析時） |
| 對既有步驟的影響 | 與現有流程相同 | 影響 Step 2.5、Step 3 | 影響 Step 3、Step 6.4、Step 7 |

### 設計規格

#### 參數格式

```bash
# 一般驗證（不變）
/check-result dev

# 權限驗證（不變）
/check-result dev -p

# 檔案相關驗證（新增）
/check-result dev -f

# 同時涉及檔案和權限（可組合）
/check-result dev -f -p
```

#### 執行流程（-f 模式差異）

只描述 `-f` 模式與一般模式的差異：

```
/check-result dev -f（與一般模式的差異）
│
├─ 0. 【建立進度追蹤 + 載入檔案上傳知識】
│   ├─ 解析參數，識別 -f flag
│   ├─ TaskCreate 包含檔案專屬步驟（Step 6.5）
│   └─ 🆕 載入檔案上傳知識（精簡版，約 2,500 tokens）
│       ├─ file_upload_architecture.md（架構文件）
│       └─ file_upload_checklist.md（檢核清單）
│
├─ 3. 【DB 查詢測試資料】（🆕 增加檔案相關查詢）
│   └─ 除了一般查詢外，額外查詢：
│       ├─ files table 確認檔案紀錄存在
│       ├─ 檔案與主 Entity 的關聯（foreignKey）
│       └─ documentType 欄位值是否符合 DOCUMENT_TYPE_MAPPING
│
├─ 6.4 【強制執行】檔案可存取性驗證
│   └─ ⚠️ -f 模式下此步驟為必做，非條件觸發
│
├─ 6.5 【新增】檔案上傳 4 項專屬檢核
│   ├─ CUSTOM_PATH_PREFIX
│   ├─ DOCUMENT_TYPE_MAPPING
│   ├─ DTO 檔案欄位
│   └─ Entity 關聯
│
└─ 7. 【結果分析】（🆕 增加檔案維度）
    └─ 除了一般比對外，額外分析：
        ├─ fileUrl 路徑前綴是否正確（環境隔離）
        ├─ 檔案下載結果 vs DB 紀錄的一致性
        └─ 4 項專屬檢核結果彙整
```

#### 4 項專屬檢核說明

> 📌 `/debugP -f` 原設計有 6 項檢核，但其中「Module 設定」和「Service 方法」在 `/check-result` 打 API 的過程中自然會暴露（API 500 = Module 問題、操作失敗 = Service 問題），不需要獨立檢核。因此精簡為 4 項。

| # | 檢核項 | 驗證方法 | 預期結果 |
|---|--------|---------|---------|
| 1 | CUSTOM_PATH_PREFIX | 檢查 API 回傳的 fileUrl 路徑 | 包含正確的環境前綴（dev/staging） |
| 2 | DOCUMENT_TYPE_MAPPING | 用 psql 查 DB 中的 documentType 欄位 | 值與 mapping 表一致 |
| 3 | DTO 檔案欄位 | 檢查 API response 結構 | 包含所有必要的檔案欄位（fileUrl、fileName 等） |
| 4 | Entity 關聯 | 用 psql 查 DB 確認 foreignKey | 檔案紀錄正確關聯到主 Entity |

**與 `/debugP -f` 的 6 項對照**：

| `/debugP -f` 檢核項 | `/check-result -f` | 原因 |
|--------------------|--------------------|------|
| CUSTOM_PATH_PREFIX | ✅ 保留 | 需要從 API response 驗證 |
| DOCUMENT_TYPE_MAPPING | ✅ 保留（改用 DB 查詢） | check-result 不主動上傳，改查 DB |
| Module 設定 | ❌ 移除 | API 打得通就代表 Module 正確 |
| Service 方法 | ❌ 移除 | API 操作成功就代表 Service 正確 |
| DTO 欄位 | ✅ 保留 | 需要確認 response 結構完整 |
| Entity 關聯 | ✅ 保留 | 需要用 DB 確認關聯正確 |

#### 與各 Skill 的分工

| Skill | 用途 | 載入內容 | Token |
|-------|------|----------|-------|
| `/guideA file` | **開發前學習** | 完整知識（架構 + 程式碼） | ~8,000 |
| `/debugP -f` | **debug 檔案 bug** | 精簡知識（架構文件） | ~2,500 |
| `/check-result -f` | **驗證檔案實作** | 精簡知識（架構文件） | ~2,500 |

**使用時機**：
- 要**開發**檔案上傳功能 → 用 `/guideA file`
- 要 **debug** 檔案相關 bug → 用 `/debugP -f`
- 要**驗證**檔案相關實作 → 用 `/check-result -f`

### 輸出格式追加

驗證結果表新增檔案專屬檢核區塊：

```markdown
### 檔案上傳 4 項專屬檢核

| # | 檢核項 | 結果 | 說明 |
|---|--------|------|------|
| 1 | CUSTOM_PATH_PREFIX | ✅/❌ | {fileUrl 路徑前綴檢查結果} |
| 2 | DOCUMENT_TYPE_MAPPING | ✅/❌ | {DB documentType 欄位檢查結果} |
| 3 | DTO 檔案欄位 | ✅/❌ | {response 結構檢查結果} |
| 4 | Entity 關聯 | ✅/❌ | {DB foreignKey 檢查結果} |
```

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 記錄 `-f` 模式設計 | ✅ 已完成 |
| `/check-result` 定義檔 | 新增 `-f` flag 解析 + Step 6.5 | ⬜ 待實作 |
| `/check-result` 流程圖 | 新增 `-f` 模式分支 | ⬜ 待實作 |
| `argument-hint` 更新 | `<dev|staging> [-f] [-p]` | ⬜ 待實作 |

### 實作狀態

- [x] 設計稿撰寫（2026-02-03）
- [x] 設計稿修正（2026-02-03）
- [ ] 定義檔更新
- [ ] 流程圖更新
- [ ] 測試驗證
- [x] 修正 -f/-p 模式載入寫法（2026-02-05）

#### Bug 修正（2026-02-05）

**問題**：-f 模式引用了不存在的文件路徑

```markdown
# 錯誤路徑（文件不存在）
- @/Users/.../. claude/modules/file_upload_architecture.md
- @/Users/.../.claude/modules/file_upload_checklist.md

# 正確路徑
- /Users/.../prompts/4_diary/file_upload/architecture/file_upload_architecture.md
- /Users/.../prompts/4_diary/file_upload/architecture/file_upload_checklist.md
```

**修正內容**：
1. 修正文件路徑
2. 改為「任務步驟讀取」寫法（避免 `@` 無條件載入問題）

---

## 2026-02-03 設計變更：Step 0 TaskCreate 強制禁止合併

### 問題描述

**觸發情境**：執行 `/check-result dev` 驗證問題六時，AI 將 Step 6.1~6.4 合併為單一 Task「Step 6: API 驗證」，跳過 6.1「推導 API 序列」。

**用戶 feedback**：
> 你的驗證方式怎麼感覺怪怪的，不是該搭配 DB 與 dto 與前端送的資料來驗嗎？...你不是有索引表嗎？

**根因分析**：

2026-02-01 的設計變更已將 TaskCreate 列表更新為正確的 6.1~6.4 粒度，**但 AI 執行時沒有照著建**，自行合併為一個 Task。

| 定義檔 TaskCreate | AI 實際建立的 Task |
|-------------------|-------------------|
| Step 6.1: 推導 API 序列 | ❌ 不存在 |
| Step 6.2: 存在性確認 | ❌ 不存在 |
| Step 6.3: Bug Spec 模擬 | ❌ 不存在 |
| Step 6.4: 檔案可存取性驗證 | ❌ 不存在 |
| （以上四個）| Step 6: API 驗證（合併） |

**連鎖效應**：沒有 6.1 的 Task → 不會觸發查 UI-API 索引 → 直接用猜測的 request body 打 API → 驗證結果不正確。

### 設計決策

**問題本質**：定義檔寫對了，但缺少「禁止合併」的強制語言，AI 自行簡化。

**解法**：在 Step 0 的執行規則加入明確的禁止合併警告 + 歷史教訓。

### 修改內容

**定義檔 `check-result.md` Step 0 新增**：

```markdown
> ⛔ **禁止合併 Task**：必須嚴格按照上方列表逐一建立 Task，禁止將多個步驟合併為一個 Task（如把 6.1~6.4 合併為「Step 6: API 驗證」）。合併會導致子步驟被跳過。
>
> **2026-02-03 教訓**：AI 將 6.1~6.4 合併為單一 Task，跳過 6.1「推導 API 序列」（查 UI-API 索引），直接用猜測的 request body 打 API，導致驗證方式錯誤。
```

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| 定義檔 Step 0 | 新增「禁止合併 Task」警告 + 教訓 | ✅ 已完成 |
| 設計稿 | 記錄此次事件 | ✅ 已完成 |
| 流程圖 | 無需修改（已與定義檔一致） | ⏭️ 不需要 |

---

## 2026-02-07 設計變更：整合 /reviewDoc -c/-s/-df 結構化驗證

### 問題描述

**觸發情境**：`/reviewDoc` 新增了三個欄位驗證參數（`-c`、`-s`、`-df`），會在 proposal 中產出結構化的驗證資料。但 `/check-result` 目前不知道如何消費這些產出。

**現況問題**：

| 項目 | 現況 | 問題 |
|------|------|------|
| 驗證 cases 來源 | AI 自行判斷 | 可能遺漏情境 |
| 欄位驗證範圍 | 概念性「比對 DB 預期值 vs API 回傳值」 | 沒有逐欄位比對機制 |
| DB 查詢條件 | AI 自行決定 | 可能不夠精準 |
| 驗證報告格式 | 只分「成功/失敗」 | 沒有結構化的逐欄位、逐情境報告 |

**期望**：`/check-result` 自動偵測 proposal 中的 `-c/-s/-df` 產出，使用結構化的驗證 cases 執行驗證，產出逐欄位、逐情境的 ✅/❌ 報告。

### 設計原則

| 原則 | 說明 |
|------|------|
| **向後相容** | proposal 沒有 -c/-s/-df 產出時，維持現有行為 |
| **自動偵測** | 不需要新參數，自動掃描 proposal 區塊標題 |
| **-s 為核心** | `-s` 的驗證 cases 表是主要消費目標 |
| **-c/-df 為輔助** | `-c` 提供欄位級比對，`-df` 提供預期值追蹤 |

### 偵測機制

Step 2「上下文分析」時，掃描 proposal 中的區塊標題：

| 區塊標題 | 來源 | 偵測到後的行為 |
|---------|------|---------------|
| `## UI 欄位對應檢核` 或 `🖥️ UI Component 檢核` | `-c` | 讀取 UI ↔ API 欄位對應表 + 500 防護表 |
| `## 情境分析` 或 `📊 Situation 情境分析` | `-s` | 讀取驗證 cases 表 + 聯集比對結果 |
| `## 資料流驗證` 或 `🔄 Data Flow 資料流驗證` | `-df` | 讀取資料流鏈路驗證表 |

### 各步驟調整

#### Step 2：上下文分析（增強）

新增「掃描 proposal 中的 reviewDoc 產出」：

```
├─ 2. 【上下文分析】
│   ├─ 從對話上下文理解（原有）
│   │
│   └─ 🆕 掃描 proposal 中的 reviewDoc 產出
│       ├─ 偵測到 -c 產出 → 記錄「有欄位對應表」
│       ├─ 偵測到 -s 產出 → 記錄「有驗證 cases」
│       ├─ 偵測到 -df 產出 → 記錄「有資料流鏈路」
│       └─ 都沒偵測到 → 維持現有行為
```

#### Step 3：DB 查詢測試資料（增強）

有 `-s` 驗證 cases 時，使用 cases 中的 DB 查詢條件：

```
├─ 3. 【條件分流：DB 查詢測試資料】
│   │
│   ├─ 🆕 【有 -s 驗證 cases 時】
│   │   ├─ 讀取 -s 產出的「驗證 Cases」表
│   │   ├─ 逐一執行每個 case 的 DB 查詢條件
│   │   │   例如：WHERE "storeId" IS NOT NULL LIMIT 1
│   │   └─ 記錄每個 case 的 ID + DB 欄位值
│   │
│   ├─ 【沒有 -s 但涉及 DB】（原有行為）
│   │   └─ AI 自行判斷查詢條件
│   │
│   └─ 【不涉及 DB】
│       └─ 跳過此步驟
```

#### Step 6：API 驗證（增強）

##### 6.2 存在性確認（增強）

有 `-c` 欄位對應表時，做逐欄位比對：

```
├─ 6.2 存在性確認（增強）
│   ├─ 原有：打 findOne/findAll 確認物件存在
│   │
│   └─ 🆕 有 -c 欄位對應表時：
│       ├─ 逐欄位比對 API response vs -c 對應表
│       │   ├─ UI 欄位在 response 中是否存在？
│       │   ├─ 欄位值是否符合預期（有值/null）？
│       │   └─ 型別是否正確（timestamp → ISO string 等）？
│       └─ 產出：逐欄位 ✅/❌ 比對結果
```

##### 6.3 Bug Spec 模擬（增強）

有 `-s` 驗證 cases 時，逐 case 執行：

```
├─ 6.3 Bug Spec 模擬（增強）
│   ├─ 原有：照著 bug spec 打目標 API
│   │
│   └─ 🆕 有 -s 驗證 cases 時：
│       ├─ 逐一執行每個 case
│       │   ├─ 有值 case → 用 Step 3 查到的 ID 打 API，驗證欄位有值
│       │   ├─ 沒值 case → 用 Step 3 查到的 ID 打 API，驗證欄位為 null
│       │   └─ 邊界 case → 打 API 驗證回傳 4XX（非 500）
│       └─ 產出：逐 case ✅/❌ 驗證結果
```

##### 6.3.5 500 路徑驗證（新增）

有 `-c` 500 防護表時，驗證未防護的 500 路徑：

```
├─ 6.3.5 🆕 500 路徑驗證（有 -c 500 防護表時）
│   ├─ 讀取 -c 產出的「500 路徑清單」
│   ├─ 對每個「❌ 未防護」的 500 路徑：
│   │   └─ 嘗試觸發該路徑（送不存在的 FK、缺少必填欄位等）
│   └─ 驗證是否回 4XX 而非 500
```

#### Step 7：結果分析（增強）

有 reviewDoc 產出時，產出結構化驗證報告：

```
├─ 7. 【結果分析】
│   │
│   ├─ API 成功（2xx）
│   │   ├─ 原有：比對 DB 預期值 vs API 回傳值
│   │   │
│   │   └─ 🆕 有 reviewDoc 產出時，產出結構化驗證報告：
│   │       │
│   │       ├─ 【逐情境驗證結果】（來自 -s cases）
│   │       │   | # | 情境 | DB 查詢 | API 結果 | 狀態 |
│   │       │   |---|------|---------|---------|------|
│   │       │   | 1 | 有值 case | ID=xxx | 欄位有值 | ✅ |
│   │       │   | 2 | 沒值 case | ID=yyy | 欄位=null | ✅ |
│   │       │
│   │       ├─ 【逐欄位比對結果】（來自 -c 對應表）
│   │       │   | 欄位 | DB 預期值 | API 回傳值 | 結果 |
│   │       │   |------|-----------|-----------|------|
│   │       │   | storeName | "信義店" | "信義店" | ✅ |
│   │       │
│   │       └─ 【500 路徑驗證結果】（來自 -c 500 防護表）
│   │           | 500 路徑 | 測試方式 | 結果 |
│   │           |---------|---------|------|
│   │           | FK 不存在 | 送假 ID | ✅ 回 4XX |
│   │
│   └─ API 失敗（4xx/5xx）
│       └─ 自動查日誌（原有）
```

### 消費模型

```
/reviewDoc 產出 → proposal 中的結構化資料 → /check-result 消費
│
├─ -c 產出
│   ├─ UI ↔ API 欄位對應表
│   │   └─ Step 6.2 用來做「逐欄位比對」
│   └─ 500 防護表 + 500 路徑清單
│       └─ Step 6.3.5 用來做「500 路徑驗證」
│
├─ -s 產出（核心消費目標）
│   ├─ 驗證 Cases 表
│   │   ├─ Step 3 用 DB 查詢條件撈測試資料
│   │   └─ Step 6.3 逐 case 執行驗證
│   └─ 聯集比對結果
│       └─ Step 7 用來確認所有情境都已覆蓋
│
└─ -df 產出
    └─ 資料流鏈路驗證表
        └─ Step 7 用來追蹤「每個欄位的預期值從哪來」
            ├─ Response 方向：DB → Service → DTO → 前端
            └─ 當欄位值不符預期時，根據鏈路定位問題層
```

### 向後相容設計

| 情況 | check-result 行為 |
|------|-------------------|
| proposal 有 -c/-s/-df 全部產出 | 完整結構化驗證（最佳） |
| proposal 只有 -s 產出 | 用 -s cases 驅動驗證，欄位比對用 AI 判斷 |
| proposal 只有 -c 產出 | 用 -c 做欄位比對，情境用 AI 判斷 |
| proposal 沒有任何產出 | 完全維持現有行為 |

### 結構化驗證報告格式

當有 reviewDoc 產出時，Step 8.3 的驗證紀錄新增結構化區塊：

```markdown
### 結構化驗證報告

#### 逐情境驗證結果（來自 /reviewDoc -s）

| # | 情境 | DB 查詢 | 測試 ID | API 結果 | 狀態 |
|---|------|---------|---------|---------|------|
| 1 | 有 storeId | WHERE "storeId" IS NOT NULL | 44663 | storeName="信義店" | ✅ |
| 2 | 沒 storeId | WHERE "storeId" IS NULL | 44670 | storeName=null | ✅ |
| 3 | store 已刪除 | WHERE "storeId" NOT IN (...) | 44680 | storeName=null | ✅ |
| 4 | contractId 不存在 | POST 送假 ID | - | 400 Bad Request | ✅ |

#### 逐欄位比對結果（來自 /reviewDoc -c）

| UI 欄位 | DB 預期值 | API 回傳值 | 結果 |
|---------|-----------|-----------|------|
| storeName | "信義店" | "信義店" | ✅ |
| agentName | "王小明" | "王小明" | ✅ |
| contractNo | "C-2026-001" | "C-2026-001" | ✅ |

#### 500 路徑驗證結果（來自 /reviewDoc -c）

| # | 500 路徑 | 測試方式 | 預期結果 | 實際結果 | 狀態 |
|---|---------|---------|---------|---------|------|
| 1 | FK: contractId 不存在 | POST 送 contractId=999999 | 4XX | 400 | ✅ |
| 2 | undefined: contractId 缺失 | POST 不送 contractId | 4XX | 400 | ✅ |
```

### 實際 proposal 範例分析

> 基於 `1228_1_4_transcript_patch_and_qa_retest_proposal.md` 的實際產出

**-c 產出位置**：proposal L1279-1350
- UI ↔ API 欄位對應表（含 ✅/❌ 狀態）
- 500 防護覆蓋分析

**-s 產出位置**：proposal L1468-1688
- UI 情境流程圖（7 個操作）
- 聯集比對結果（26 個情境）
- 驗證 cases 表（13 個正常 cases + 6 個 CR-4 cases）

**-df 產出位置**：proposal L1691-1793
- Request/Response 資料流鏈路表
- 逐情境驗證結果（17 個情境）
- 斷裂點分析（2 個斷裂點）

**check-result 消費方式**：
1. Step 2 偵測到三個區塊標題 → 啟用結構化驗證
2. Step 3 使用 -s 的 13+6 個 cases 的 DB 查詢條件撈資料
3. Step 6.2 使用 -c 的欄位對應表做逐欄位比對
4. Step 6.3 逐一執行 19 個 cases
5. Step 6.3.5 驗證 -c 標記的未防護 500 路徑
6. Step 7 產出三張結構化報告表

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 記錄整合設計 | ✅ 已完成 |
| `check_result_field_verification_gaps.md` | 記錄調整計畫 | ✅ 已完成 |
| `/check-result` 定義檔 | Step 2/3/6/7 增強 + Step 6.3.5 新增 | ⬜ 待 /updateDesign |
| `/check-result` 流程圖 | 新增 reviewDoc 產出偵測分支 | ⬜ 待 /updateDesign |
| TaskCreate 列表 | 新增 Step 6.3.5 | ⬜ 待 /updateDesign |

### 設計經驗

**原則**：
1. **準備與執行分離**：`/reviewDoc` 負責準備驗證 cases，`/check-result` 負責執行驗證。兩者透過 proposal 文件傳遞資料。
2. **結構化優於概念性**：「比對 DB 預期值 vs API 回傳值」太模糊，改為逐欄位、逐情境的結構化比對。
3. **自動偵測優於手動參數**：不需要用戶記得加參數，check-result 自動判斷 proposal 中有什麼就用什麼。

---

### 2026-02-09 設計變更：新增最終步驟「更新進度表」

**變更內容**：在 skill 最後步驟完成後，自動執行 `@.claude/flowcharts/update-progress.md` 共用模組，將 proposal 進度表中 `/check-result` 對應的行標記為 ✅。

**設計背景**：見 `showFlow_skill_proposal.md`「2026-02-09 設計變更」。

**影響**：
- 流程圖：最後節點後新增「更新進度表」
- 定義檔：最後 Step 後新增引用 `@.claude/flowcharts/update-progress.md`
- TaskCreate：新增一行

---

### 2026-02-12 設計變更：Step 6.4.5 檔案內容抽樣驗證

**變更動機**：

informationSheet 的 Word 產出在 `/check-result` 驗證時，Step 6.4 只驗「格式正確（docx）、大小 > 0」就判定通過。但用戶手動打開 Word 檔後發現 5 個內容問題（E-1/E-2/F-1/G-1/G-2）和多個空白欄位。

**問題分析**：

| 現有 Step 6.4 做的 | 缺少的 |
|-------------------|--------|
| 下載檔案 | 解析檔案內容 |
| 檢查格式（file 命令） | 比對 DB 預期值 vs 檔案實際內容 |
| 檢查大小（> 0 bytes） | 空白欄位偵測 + 歸因（DB 無資料 or 程式 bug） |

**核心問題**：「檔案能下載、格式正確」≠「檔案內容正確」。

**變更內容**：

在 Step 6.4 之後新增 Step 6.4.5：

```
├─ 6.4.5 🆕 【檔案內容抽樣驗證】（有檔案產出時）
│   │
│   ├─ 觸發條件
│   │   ├─ Step 6.4 下載的檔案是 docx 或 pdf → 觸發
│   │   ├─ proposal 有「## 檔案產出欄位風險表」→ 使用風險表指引抽樣
│   │   └─ 沒有風險表 → 隨機抽樣 5~10 個欄位
│   │
│   ├─ Word (docx) 內容提取
│   │   ├─ unzip -p {file} word/document.xml > /tmp/doc_content.xml
│   │   ├─ 用 sed/grep 提取 <w:t> 標籤中的文字內容
│   │   │   └─ grep -oP '(?<=<w:t[^>]*>)[^<]+' /tmp/doc_content.xml
│   │   └─ 產出：檔案中的文字內容清單
│   │
│   ├─ PDF 內容提取
│   │   ├─ pdftotext {file} /tmp/pdf_content.txt（如有 pdftotext）
│   │   ├─ 或 strings {file} | grep -v '^[[:space:]]*$'（備用）
│   │   └─ 產出：檔案中的文字內容清單
│   │
│   ├─ 抽樣比對
│   │   ├─ 【有風險表時】優先驗證 ⚠️ 風險欄位
│   │   │   ├─ 從 /reviewDoc -data 的「📄 檔案產出測試資料」取得預期值
│   │   │   ├─ 在檔案內容中搜尋預期值
│   │   │   ├─ 找到 → ✅ 欄位有值且正確
│   │   │   ├─ 找不到 + DB 有值 → ❌ 程式 bug（資料沒帶入檔案）
│   │   │   └─ 找不到 + DB 無值 → ⚠️ DB 無資料（非程式 bug）
│   │   │
│   │   └─ 【沒有風險表時】隨機抽樣
│   │       ├─ 從 Step 3 DB 查詢結果取 5~10 個有值欄位
│   │       ├─ 在檔案內容中搜尋這些值
│   │       └─ 記錄比對結果
│   │
│   └─ 產出：檔案內容驗證結果表
```

**驗證結果表格式**：

```markdown
### 檔案內容抽樣驗證

**檔案**：{filename}
**測試資料 ID**：{id}

| # | 欄位 | DB 預期值 | 檔案中找到 | 結果 | 說明 |
|---|------|-----------|-----------|------|------|
| 1 | storeName | 信義店 | ✅ 信義店 | ✅ | - |
| 2 | ownerName | 王小明 | ✅ 王小明 | ✅ | - |
| 3 | parkingArea | (null) | ❌ 空白 | ⚠️ | DB 無資料，非程式 bug |
| 4 | legalNote | 備註文字 | ❌ 未找到 | ❌ | DB 有值但檔案沒帶入 → 程式 bug |

**摘要**：
- ✅ 正確：{N} 個
- ⚠️ DB 無資料：{M} 個（非程式 bug，記錄到 proposal）
- ❌ 程式 bug：{K} 個（需修復）
```

**與前置 skill 的銜接**：

```
/dpf Step 4.6.5 → proposal「## 檔案產出欄位風險表」
                        ↓
/reviewDoc -data → proposal「## DB 測試資料 → 📄 檔案產出測試資料」
                        ↓
/check-result Step 6.4.5 消費：
  ├─ 風險表 → 知道要驗哪些欄位
  ├─ 測試資料 → 知道用哪個 ID 生成檔案 + 預期值
  └─ 產出 → 逐欄位 ✅/⚠️/❌ 報告
```

**向後相容**：

| 情況 | Step 6.4.5 行為 |
|------|----------------|
| 有風險表 + 有測試資料 | 完整驗證（最佳） |
| 有風險表 + 沒有測試資料 | 用風險表指引，但只能驗「有/沒有值」 |
| 沒有風險表 + 有 DB 查詢結果 | 隨機抽樣 5~10 個欄位 |
| 沒有風險表 + 沒有 DB 結果 | 跳過內容驗證，只做 6.4 格式驗證 |

**技術限制**：

| 限制 | 說明 | 影響 |
|------|------|------|
| docx 中的合併欄位 | docx-templates 的 `+++INS xxx+++` 替換後，文字可能被 XML 標籤分割 | grep 可能找不到完整字串，需要容錯 |
| PDF 文字提取 | pdftotext 可能不在所有環境安裝 | 備用 strings 命令精度較低 |
| 中文搜尋 | grep 中文需要 UTF-8 環境 | 確保 LANG=en_US.UTF-8 |

**容錯策略**：
- 搜尋時用子字串匹配（不要求完全一致）
- 數字欄位允許格式差異（如 `1000` vs `1,000`）
- 找不到時先嘗試去除空白再搜尋一次

**影響**：
- 流程圖：Step 6.4 後新增 6.4.5
- 定義檔：Step 6 新增 6.4.5 邏輯
- TaskCreate：新增 `TaskCreate: subject="Step 6.4.5: 檔案內容抽樣驗證", activeForm="驗證檔案內容..."`

**實作狀態**：
- [x] 設計討論（2026-02-12）
- [x] 記錄到 check-result 設計稿（2026-02-12）
- [x] 更新 `check-result.md` 定義檔（2026-02-12 /updateDesign）
- [x] 更新 `check-result_flowchart.md` 流程圖（2026-02-12 /updateDesign）
- [ ] 測試驗證

---

## 設計變更：Step 8.4 同步修改檔案清單（2026-02-13）

### 問題發現

**觸發情境**：Proposal 1 (informationSheet) 的 DF-6 在 `/check-result` 期間發現車位範本 `RealEstats_Stall.docx` 遺漏，從舊專案複製過來補上。但這個檔案不在 proposal 的「修改檔案清單」中，後續 `/gcommit-push` 依照「只 commit 提案清單中的檔案」原則將它排除，導致 dev/staging 上範本檔案缺失。

**問題根因**：
- proposal 的「修改檔案清單」是靜態的，在 `/dpf` 或 `/reviewDoc` 階段產出
- `/check-result` 期間的「臨時修正」（新增檔案、修改程式碼）沒有機制回饋到清單
- `/gcommit-push` 嚴格按清單 commit，額外檔案被歸類為「非本次工作範圍」跳過

### 設計決策

| 問題 | 決策 | 說明 |
|------|------|------|
| 修改哪個 skill | `/check-result` | 從上游（產出修正的地方）解決，不改下游 gcommit-push |
| 插入位置 | Step 8（自動更新提案文件） | 驗證完成後統一處理，不影響驗證流程 |
| 偵測方式 | `git status` 比對 | 取得 backend-nestjs 下所有 modified + untracked 檔案，與清單比對 |
| 只追加不刪除 | 是 | 不動原有清單項目，只追加新發現的檔案 |
| 標註來源 | 是 | 追加項目標註「（check-result 期間新增）」，讓人和 gcommit-push 都看得出 |

### 新流程設計

```
├─ 8. 【自動更新提案文件】（驗證完成時）
│   ├─ 8.1 判斷是否有 proposal
│   ├─ 8.2 更新進度表
│   ├─ 8.3 確認所有帳號驗證紀錄已寫入
│   └─ 8.4 同步修改檔案清單（🆕 新增）
│       ├─ git status 取得 backend-nestjs 下所有 modified + untracked 檔案
│       ├─ 讀取 proposal「修改檔案清單」（表格或列表格式）
│       ├─ 比對：git 有但清單沒有的檔案 = 新增項目
│       │   ├─ 有新增 → 追加到清單，標註「（check-result 期間新增）」
│       │   └─ 無新增 → 跳過
│       └─ 顯示同步結果
```

**追加格式範例**（表格式清單）：

```markdown
| `src/templates/information-sheet/RealEstats_Stall.docx` | 新增 | （check-result 期間新增：補上遺漏的車位範本） |
```

**追加格式範例**（列表式清單）：

```markdown
- `src/templates/information-sheet/RealEstats_Stall.docx`（check-result 期間新增）
```

### 影響

- 流程圖：Step 8 新增 8.4
- 定義檔：Step 8 新增 8.4 邏輯
- TaskCreate：不需新增（共用 Step 8 的 task）

**實作狀態**：
- [x] 設計討論（2026-02-13）
- [x] 記錄到 check-result 設計稿（2026-02-13）
- [x] 更新 `check-result.md` 定義檔（2026-02-19 /updateDesign）
- [x] 更新 `check-result_flowchart.md` 流程圖（2026-02-19 /updateDesign）

---

### 2026-02-19 設計變更：Step 6.6 篩選參數交互驗證

#### 問題描述

`/reviewDoc -data` 已擴展產出 `🔍 篩選參數測試 Cases`（Q-1 ~ Q-4）和 `🔍 篩選參數資料分佈` 表，包含 DB 預期筆數。但 `/check-result` 沒有步驟會：

1. 讀取 proposal 的 🔍 cases
2. 用不同 query param 組合呼叫 findAll API
3. 比對 API `totalCount` vs DB 預期筆數
4. 驗證子集關係（Q-2 ≤ Q-1）

**townName bug 案例**：reviewDoc -data 產出 `Q-1: countyCodes=O 不帶 townName → DB 預期 1263 筆`，但 API 實際回傳 62 筆。如果有 Step 6.6，差距一目了然。

#### 影響範圍

| 步驟 | 現有功能 | 擴展內容 |
|------|---------|---------|
| Step 0 TaskCreate | 列出所有步驟 task | **新增** Step 6.6 task（條件建立）|
| Step 3 DB 查詢 | 查單筆測試資料 ID | **擴展** 讀取 🔍 表，記錄預期筆數 |
| Step 6.6（新增）| 不存在 | **新增** 篩選參數交互驗證 |
| Step 7 結果分析 | 比對單筆 DB vs API | **擴展** 加入篩選參數比對結果 |

不影響：Step 1、2、2.5、4、5、6.1~6.5、8~10。

#### 設計方案

##### Step 0 TaskCreate 新增

```
TaskCreate: subject="Step 6.6: 篩選參數交互驗證", activeForm="驗證篩選參數交互行為..."
# 條件建立：proposal 有 🔍 篩選參數測試 Cases 時才建立
```

##### Step 3 擴展：讀取篩選預期值

在 Step 3 末尾追加（proposal 有 `### 🔍 篩選參數測試 Cases` 時）：

1. 讀取 proposal 的「### 🔍 篩選參數資料分佈」表
2. 讀取 proposal 的「### 🔍 篩選參數測試 Cases」表
3. 從 Cases 表提取每個 Q-N 的：情境描述（= query params 組合）、DB 預期筆數、預期關係
4. 記錄為 Step 6.6 的輸入資料

> 不重查 DB。理由：check-result 在 implement 後立即執行，DB 資料不會大幅變動。

##### 新增 Step 6.6：篩選參數交互驗證

**觸發條件**：proposal 有 `### 🔍 篩選參數測試 Cases` 表
**位置**：在 6.5 之後，Step 7 之前

**執行邏輯**：

1. **推導 findAll endpoint**：從 proposal 上下文推導目標 findAll endpoint（proposal 的問題描述和修改檔案清單會指出是哪個 list API）

2. **逐 case 呼叫 API**：
   ```bash
   # Q-1: countyCodes=O 不帶 townName
   ./.claude/scripts/test-dashboard-api.sh \
     "/estate-listings?page=1&countyCodes=O" ".data.totalCount"

   # Q-2: countyCodes=O + townName=東區
   ./.claude/scripts/test-dashboard-api.sh \
     "/estate-listings?page=1&countyCodes=O&townName=%E6%9D%B1%E5%8D%80" ".data.totalCount"
   ```

3. **比對驗證**（兩種判斷）：

| 驗證類型 | 判斷方式 | pass/fail |
|---------|---------|-----------|
| 子集關係 | Q-2 ≤ Q-1 | ✅/❌（確定性判斷）|
| 筆數比對 | API totalCount vs 預期筆數 | 只標差異，不做 pass/fail |

- **子集驗證**是核心：子參數結果永遠不該比母參數多，不受 DB 資料變動影響
- **筆數差異**僅作為參考資訊，留給人判斷

##### Step 7 擴展

篩選參數驗證結果（有 Step 6.6 時）：
- 全部 ✅ → 篩選邏輯正確
- 有 ❌ → 明確指出：哪個 case 子集關係不成立、建議回到 proposal 分析篩選邏輯

#### 驗證結果表格範例

```markdown
### 篩選參數交互驗證

| # | 情境 | API totalCount | 預期筆數 | 差異 | 備註 |
|---|------|---------------|---------|------|------|
| Q-1 | countyCodes=O | 62 | 1263 | -95% | 預期全新竹市 |
| Q-2 | countyCodes=O + townName=東區 | 1201 | 50 | +2302% | 帶子參數反而更多 |

**子集驗證**：
| 關係 | 條件 | 結果 |
|------|------|------|
| Q-2 ≤ Q-1 | 1201 ≤ 62 | ❌ 不成立 |

❌ 篩選邏輯異常：帶 townName=東區（1201）比不帶（62）更多
```

#### 流程圖變更

在 Step 5-7 多帳號迭代區塊中，6.5 之後追加：

```
│   │   └─ 🆕 6.6 篩選參數交互驗證（條件觸發）
│   │       ├─ 觸發條件：proposal 有 🔍 篩選參數測試 Cases
│   │       ├─ 從 proposal 讀取 Q-N cases + 預期筆數
│   │       ├─ 推導 findAll endpoint（從 proposal 上下文）
│   │       ├─ 逐 case 呼叫 findAll API（test-dashboard-api.sh）
│   │       ├─ 子集驗證：Q-2 ≤ Q-1（確定性 pass/fail）
│   │       ├─ 筆數比對：API vs 預期（僅參考，不做 pass/fail）
│   │       └─ 產出：篩選參數驗證結果表
```

#### 與 reviewDoc -data 的銜接

```
reviewDoc -data                          check-result
│                                        │
├─ Step 2: 推導 🔍 Cases（Q-1~Q-4）     ├─ Step 3: 讀取 🔍 表
├─ Step 3: 查 DB 資料分佈               │   └─ 記錄預期筆數
├─ Step 4: 驗證子集關係                  │
├─ Step 5: 寫入 proposal                 ├─ Step 6.6: 打 API 驗證
│   ├─ 🔍 篩選參數資料分佈              │   ├─ 逐 case 呼叫 findAll
│   └─ 🔍 篩選參數測試 Cases            │   ├─ 子集驗證（確定性）
│                                        │   └─ 筆數比對（參考）
└─ 產出：DB 預期筆數                     └─ 產出：API 實際筆數 vs 預期
```

#### 設計決策

| 決策 | 選擇 | 理由 |
|------|------|------|
| 觸發方式 | 自動偵測（proposal 有 🔍） | 一致性（同 6.4、6.4.5 的條件觸發模式）|
| DB 重查 | 不重查，用 proposal 預期值 | 簡化邏輯；implement→check-result 間隔短 |
| 驗證判斷 | 子集關係做 pass/fail，筆數差異僅參考 | 子集關係不受資料變動影響，是確定性判斷 |
| 步驟編號 | 6.6（在 6.5 之後）| 6.4~6.5 是檔案相關，6.6 是獨立的篩選驗證 |
| 新增 flag | 不需要 | 自動偵測即可，不增加使用負擔 |
| endpoint 來源 | 從 proposal 上下文推導 | proposal 問題描述會指出修改的 list API |

#### 相容性

| 項目 | 影響 |
|------|------|
| reviewDoc -data | ✅ 已支援（2026-02-19 設計變更已完成）|
| check-result 定義檔 | 待更新（Step 0、3、6.6、7）|
| check-result 流程圖 | 待更新（新增 6.6 分支）|
| -f 模式 | ✅ 不衝突（6.6 獨立於 6.4~6.5）|
| -p 模式 | ✅ 不衝突 |

**實作狀態**：
- [x] 設計討論（2026-02-19）
- [x] 記錄到 check-result 設計稿（2026-02-19）
- [x] 更新 `check-result.md` 定義檔（2026-02-19 /updateDesign）
- [x] 更新 `check-result_flowchart.md` 流程圖（2026-02-19 /updateDesign）

---

## 2026-02-20 設計變更：DB 一致性驗證補強（Step 6.2.5 + Step 6.3.6）

### 問題描述

**觸發情境**：用戶提問「所有改動到的欄位，都是跟 DB 一致嗎？或是打 CRU 時，都跟送過來的資料一致嗎？」

**現況問題**：

| 驗證方向 | 現有設計 | 缺失 |
|---------|---------|------|
| GET 方向 | Step 6.2 打 findOne/findAll，概念性「比對 DB 預期值 vs API 回傳值」| 沒有逐欄位比對機制，AI 自行判斷驗哪些欄位 |
| CRU 方向 | Step 6.3 打 POST/PATCH 後看 response | 沒有「寫入後回查 DB」確認實際寫入值是否正確 |
| 計算欄位 | Step 3 找邊界案例，Step 7 比對 | 沒有明確要求「查 DB 原始欄位 → AI 自己算 → 跟 API 比對」的流程 |

**核心問題**：
- GET：API 回傳的欄位值，沒有強制逐欄對應到 DB 來源
- CRU：送出什麼 → 存什麼 → 讀什麼，這個 round-trip 驗證是缺失的
- 計算欄位：只看 API 回傳值，沒有從 DB 原始欄位自己算一次做基準

### 設計決策

#### 計算欄位驗證方式

| 方案 | 說明 | 決策 |
|------|------|------|
| A | 只驗 API 回傳值是否符合計算邏輯（不查 DB 原始欄位） | ❌ 沒有基準值，無法計算 |
| B | 查 DB 原始欄位 → AI 自己算一次 → 跟 API 比對 | ✅ 採用 |

**方案 B 邏輯**：
1. 查 DB 原始欄位（如 `signedAt = 2025-11-21`）
2. AI 根據 proposal/上下文理解的業務邏輯自己算（今天 2026-02-20，距今 91 天 → `isWithin90Days = false`）
3. 跟 API 回傳值比對（API 回 `false` → ✅）

### 新增步驟設計

#### Step 6.2.5 — DB vs API 欄位一致性驗證（GET 方向）

**插入位置**：6.2（存在性確認）之後，6.3（Bug Spec 模擬）之前

**觸發條件**：

| 情況 | 是否觸發 |
|------|---------|
| 新增/修改 GET 回傳欄位 | ✅ |
| 新增計算欄位 | ✅ |
| 新增關聯欄位 | ✅ |
| 純 DTO 重命名 | ❌ 跳過 |
| 新增固定值欄位 | ❌ 跳過 |

**執行邏輯**：

```
├─ 6.2.5 【DB vs API 欄位一致性驗證】（條件觸發）
│   │
│   ├─ 從 proposal/上下文列出「改動到的欄位」
│   │
│   ├─ 【一般欄位】（DB 直接存值）
│   │   ├─ 從 Step 3 DB 查詢結果取預期值
│   │   ├─ 打 GET API 取回傳值
│   │   └─ 逐欄比對：DB 值 vs API 回傳值
│   │
│   ├─ 【計算欄位】（DB 不直接存值）
│   │   ├─ 查 DB 原始欄位（如 signedAt、contractDate）
│   │   ├─ AI 根據業務邏輯自己算出預期值
│   │   │   例：signedAt 距今 91 天 → isWithin90Days = false
│   │   └─ 跟 API 回傳值比對
│   │
│   └─ 產出：逐欄位 ✅/❌ 比對表
│       | 欄位 | DB 值/計算依據 | API 回傳值 | 結果 |
│       |------|--------------|-----------|------|
│       | storeName | "信義店"（DB 直接值）| "信義店" | ✅ |
│       | isWithin90Days | signedAt=2025-11-21，距今91天→false | false | ✅ |
│       | realEstateStoreId | null（DB 無關聯）| null | ✅ |
```

#### Step 6.3.6 — CRU 寫入後 DB 回查驗證（CRU 方向）

> ⚠️ **編號說明**：6.3.5 已被「500 路徑驗證」（2026-02-07 reviewDoc 整合）佔用，故本步驟編號為 6.3.6。

**插入位置**：6.3.5（500 路徑驗證）之後，6.4 之前

**觸發條件**：

| 情況 | 是否觸發 |
|------|---------|
| POST（CREATE） | ✅ |
| PATCH（UPDATE） | ✅ |
| DELETE | ❌（查不到才對，不需回查） |
| 純 GET 驗證 | ❌ |

**執行邏輯**：

```
├─ 6.3.6 【CRU 寫入後 DB 回查驗證】（條件觸發）
│   │
│   ├─ 從 request body 提取「送出的欄位值」
│   ├─ 從 API response 取得新建/更新的 ID
│   │
│   ├─ 直接查 DB 確認實際寫入值：
│   │   PGPASSWORD=... psql ... -c "
│   │   SELECT [改動欄位]
│   │   FROM [table]
│   │   WHERE id = {新建/更新的 ID};
│   │   "
│   │
│   ├─ 逐欄比對：request 送出值 vs DB 實際值
│   │   | 欄位 | Request 送出值 | DB 實際值 | 結果 |
│   │   |------|--------------|---------|------|
│   │   | areaSqm | 100 | 100 | ✅ |
│   │   | status | "approved" | "approved" | ✅ |
│   │   | updatedAt | （系統產生）| 2026-02-20 | ✅ 有更新 |
│   │
│   ├─ 有業務邏輯轉換的欄位（如 enum 轉換）：
│   │   ├─ 標註「邏輯轉換」，說明預期轉換規則
│   │   └─ 例：request 送 type=1 → DB 存 "approved"
│   │
│   └─ 產出：CRU 寫入一致性驗證表
```

### 與現有流程的相容性

**補強後完整步驟序列**：

```
6.1 推導 API 序列
6.2 存在性確認
6.2.5 【新】DB vs API 欄位一致性（條件：GET 有改動欄位）
6.3 Bug Spec 模擬
6.3.5 500 路徑驗證（已存在，-c 產出）
6.3.6 【新】CRU 寫入後 DB 回查（條件：有 POST/PATCH）
6.4 檔案可存取性驗證（條件）
6.4.5 檔案內容抽樣（條件）
6.5 檔案上傳專屬（-f 模式）
6.6 篩選參數交互（條件）
```

兩個新步驟都是條件觸發，不影響純格式驗證或 DELETE 場景。

### Step 0 TaskCreate 補充

```
TaskCreate: subject="Step 6.2.5: DB vs API 欄位一致性驗證", activeForm="逐欄比對 DB 與 API 回傳值..."
# 條件建立：有新增/修改 GET 回傳欄位時才建立

TaskCreate: subject="Step 6.3.6: CRU 寫入後 DB 回查", activeForm="回查 DB 確認寫入正確..."
# 條件建立：有 POST/PATCH 操作時才建立
```

### 向後相容設計

| 情況 | 行為 |
|------|------|
| 純 GET 驗證（無欄位改動）| 跳過 6.2.5 和 6.3.6 |
| 純 DELETE 驗證 | 跳過 6.2.5 和 6.3.6 |
| 純 DTO 重命名 | 跳過 6.2.5（無 DB 依賴），跳過 6.3.6（無 CRU）|
| 有 POST/PATCH + 有欄位改動 | 兩個步驟都執行 |
| 有 -c/-s 產出 | 6.2.5 優先使用 -c 欄位對應表，不衝突 |

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 記錄問題和決策 | ✅ 已完成 |
| `/check-result` 定義檔 | Step 6 新增 6.2.5 + 6.3.6 | ✅ /updateDesign 完成 |
| `/check-result` 流程圖 | 新增 6.2.5 + 6.3.6 分支 | ✅ /updateDesign 完成 |
| Step 0 TaskCreate | 新增兩個條件 task | ✅ /updateDesign 完成 |

**實作狀態**：
- [x] 設計討論（2026-02-20）
- [x] 記錄到 check-result 設計稿（2026-02-20）
- [x] 更新 `check-result.md` 定義檔（2026-02-20）
- [x] 更新 `check-result_flowchart.md` 流程圖（2026-02-20）

## 2026-02-24 設計變更：API 效能驗證（Step 7 效能摘要）

### 問題描述

**觸發情境**：check-result 只驗正確性，漏掉效能。每個 query 都該在 1 秒內完成。

**現況問題**：

| 驗證方向 | 現有設計 | 缺失 |
|---------|---------|------|
| 正確性 | Step 6 打 API + Step 7 比對 DB 值 | ✅ 完整 |
| 效能 | 無 | ❌ 完全缺失 |

**核心問題**：
- API 回應時間沒有任何量測
- 無法發現慢查詢（如 N+1、缺索引、大量 JOIN）
- 功能正確但效能很差的情況下仍標記為 ✅ 通過

### 設計決策

#### 效能量測層級

| 方案 | 說明 | 決策 |
|------|------|------|
| A | curl 層：`-w '%{time_total}'` 量測完整 API 回應時間 | ✅ 採用 |
| B | NestJS 層：TypeORM query logging 看純 DB 時間 | ❌ 改動量大，暫不需要 |
| C | 兩者都做 | ❌ 過度設計 |

**方案 A 理由**：
- 改動最小（腳本已改好）
- 1 秒門檻下，SSH tunnel 延遲（100-200ms）不會造成誤判
- 超過 1 秒的 API 再手動查 server log 找慢 query

#### 門檻值

| 耗時 | 判定 | 顯示 |
|------|------|------|
| ≤ 1.0s | 正常 | `⏱️ {time}s` |
| > 1.0s | 偏慢 | `⚠️ {time}s（超過 1 秒）` |

### 已完成：腳本修改

`test-dashboard-api.sh` 已修改（2026-02-24），使用 `curl -o tempfile -w '%{time_total}'` 分離回應和計時：

- 每次 API 呼叫自動輸出耗時
- ≤ 1s → `⏱️ 0.645s`
- \> 1s → `⚠️ 1.107s（超過 1 秒）`

驗證結果：

| API | 耗時 | 顯示 |
|-----|------|------|
| GET /announcements?page=1&limit=10 | 0.65s | ⏱️ |
| GET /estate-listings?page=1&limit=200 | 0.97s | ⏱️ |
| GET /estate-listings?page=1&limit=500 | 1.11s | ⚠️ |

### 需要更新的部分

#### 1. 定義檔 Step 7 增加效能摘要

在 Step 7「結果分析」末尾（API 失敗診斷之後）增加：

```markdown
#### 效能摘要

收集 Step 6 所有 API 呼叫的回應時間（`test-dashboard-api.sh` 自動輸出），彙整為效能摘要表：

| API | 耗時 | 結果 |
|-----|------|------|
| GET /announcements?page=1&limit=10 | 0.65s | ✅ |
| POST /estate-transactions | 1.45s | ⚠️ 超過 1s |

**判斷標準**：
- ≤ 1.0s → ✅
- > 1.0s → ⚠️（記錄但不阻斷驗證流程）

**⚠️ API 超過 1 秒時的處理**：
- 記錄到效能摘要表
- Step 8 寫入 proposal 驗證紀錄時一併記錄
- 不自動中止驗證流程（效能問題可後續處理）
```

#### 2. 定義檔輸出格式增加效能摘要

在最終輸出格式的「驗證結果」之後增加：

```markdown
### 效能摘要

| API | 耗時 | 結果 |
|-----|------|------|
| {endpoint} | {time}s | ✅/⚠️ |

{有 ⚠️ 時} → 💡 建議排查慢查詢：查看 /tmp/dev-server.log 或開啟 TypeORM query logging
```

#### 3. 流程圖 Step 7 增加效能分支

```
├─ 7. 【結果分析】
│   ├─ API 成功（2xx）→ 比對 DB 預期值 vs API 回傳值
│   ├─ API 失敗（4xx/5xx）→ 自動查日誌
│   └─ 🆕 效能摘要 → 收集所有 API 耗時，⚠️ 標記超過 1s
```

### 與現有流程的相容性

| 面向 | 影響 |
|------|------|
| Step 6 子步驟 | 無影響（腳本自動輸出計時，不改呼叫方式） |
| Step 7 結構 | 新增子區塊，不改動現有正確性/錯誤分析 |
| Step 8 提案更新 | 效能數據自然包含在驗證紀錄中 |
| Step 0 TaskCreate | 不需要新 Task（效能分析是 Step 7 的一部分） |
| -f / -p 模式 | 同樣適用，不需特殊處理 |

### 修改清單

| 項目 | 內容 | 狀態 |
|------|------|------|
| `test-dashboard-api.sh` | 增加 curl -w 計時 + 門檻判定 | ✅ 已完成 |
| `/check-result` 設計稿 | 記錄設計決策 | ✅ 已完成 |
| `/check-result` 定義檔 | Step 7 增加效能摘要 + 輸出格式增加效能表 | ✅ /updateDesign 完成 |
| `/check-result` 流程圖 | Step 7 增加效能分支 | ✅ /updateDesign 完成 |

**實作狀態**：
- [x] 腳本修改 + 驗證（2026-02-24）
- [x] 記錄到 check-result 設計稿（2026-02-24）
- [x] 更新 `check-result.md` 定義檔（2026-02-24）
- [x] 更新 `check-result_flowchart.md` 流程圖（2026-02-24）

---

## 設計變更：Step 1 環境前置偵測（偵測優先，避免重複操作）（2026-03-03）

### 問題發現

**觸發情境**：多個 AI agent 共用同一台開發機，一個 AI 已經用 `db-tunnel.sh dev all` 連上 dev DB + MSSQL tunnel 並啟動 server，另一個 AI 執行 `/check-result dev` 時會重新跑 `db-tunnel.sh dev all`，可能把正在跑的 server 砍掉或重連 tunnel。

**用戶 feedback**：
> 我常需要跟其他 ai 說「另一個 ai 已經跑起 server 與連上 dev db，不要把 server 關掉與重連 dev db 可以直接測」。我們的流程應該要加入可以檢驗是否 server 已經跑起來，以及是否有用 script 連上該要有的 mssql db 與 dev db，已連上就不要重複做操作。

**問題分析**：

| 現行行為 | 問題 |
|---------|------|
| Step 1 無條件跑 `db-tunnel.sh $1 all` | 即使環境已就緒，仍會重連 tunnel（雖然 script 本身會跳過已連的 tunnel，但增加不必要的操作） |
| Step 4 依賴 Step 1 的「是否有切換」來判斷重啟 | 如果 Step 1 被跳過，Step 4 缺乏獨立判斷能力 |
| 需要用戶手動告知「不用重連」 | 每次都要人工介入，不符合自動化精神 |

### 設計決策

**方案**：Step 1 改為「偵測優先」模式 — 先偵測三項環境狀態，比對目標環境後決定是否需要操作。

**偵測手段**（全部使用現有指令，不需新腳本）：

| 偵測項目 | 偵測指令 | 判斷邏輯 |
|---------|---------|---------|
| Server 是否運行 | `lsof -ti:3001` | 有 PID 輸出 = 已運行 |
| PG Tunnel 是否連線 | `pgrep -f "ssh.*5433:localhost:5432"` | 有 PID = tunnel 已建立 |
| MSSQL Tunnel 是否連線 | `pgrep -f "ssh.*1433:<SERVER_IP>:1433"` | 有 PID = tunnel 已建立 |
| PG 目標環境 | `grep DB_DATABASE backend-nestjs/src/config/.env.local` | `eagle-dev` = dev / `eagle` = staging / 檔案不存在 = local |

### 新 Step 1 流程設計

```
Step 1: 環境切換（v2 — 偵測優先）
│
├─ 1.1 【偵測三項環境狀態】
│   ├─ Server: lsof -ti:3001
│   │   ├─ 有 PID → serverRunning = true
│   │   └─ 無輸出 → serverRunning = false
│   │
│   ├─ PG Tunnel: pgrep -f "ssh.*5433:localhost:5432"
│   │   ├─ 有 PID → pgTunnelUp = true
│   │   └─ 無輸出 → pgTunnelUp = false
│   │
│   ├─ MSSQL Tunnel: pgrep -f "ssh.*1433:<SERVER_IP>:1433"
│   │   ├─ 有 PID → mssqlTunnelUp = true
│   │   └─ 無輸出 → mssqlTunnelUp = false
│   │
│   └─ PG 目標環境: grep DB_DATABASE backend-nestjs/src/config/.env.local
│       ├─ eagle-dev → currentEnv = "dev"
│       ├─ eagle（非 eagle-dev）→ currentEnv = "staging"
│       └─ 檔案不存在 → currentEnv = "local"
│
├─ 1.2 【比對目標環境 vs 偵測結果】
│   │
│   ├─ 【全部吻合】currentEnv == $1 且 pgTunnelUp 且 mssqlTunnelUp
│   │   └─ 輸出「✅ 環境已就緒（PG=$1, MSSQL=✅），跳過切換」
│   │   └─ dbSwitched = false
│   │
│   ├─ 【PG 對但 MSSQL 未連】currentEnv == $1 且 pgTunnelUp 且 !mssqlTunnelUp
│   │   └─ 只跑 ./scripts/db-tunnel.sh mssql start
│   │   └─ dbSwitched = false（PG 沒切換，server 不需重啟）
│   │
│   ├─ 【環境不對】currentEnv != $1
│   │   └─ 跑 ./scripts/db-tunnel.sh $1 all（完整切換）
│   │   └─ dbSwitched = true
│   │
│   └─ 【都沒連】!pgTunnelUp
│       └─ 跑 ./scripts/db-tunnel.sh $1 all（完整切換）
│       └─ dbSwitched = true
│
├─ 1.3 【確認切換成功】
│   └─ ./scripts/db-tunnel.sh status
│
└─ 1.4 【輸出偵測摘要】
    └─ 「🔍 環境偵測：Server {✅/❌} | PG({currentEnv}) {✅ 吻合/❌ 需切換} | MSSQL {✅/❌}」
```

### Step 4 配合調整

**現行 Step 4** 的判斷邏輯是：
- Step 1 有切換 DB → 需要重啟 server
- Step 1 沒切換 → 不需要重啟

**調整後**：改為依賴 `dbSwitched` 和 `serverRunning` 兩個狀態：

```
Step 4: Server 啟動（v2 — 配合環境偵測）
│
├─ 4.1 判斷是否需要操作
│   │
│   ├─ dbSwitched = true → 需要重啟（DB 切換，server 連的是舊 DB）
│   │   └─ 走現有 4.2 流程（pkill → 確認 port → 啟動 → 確認）
│   │
│   ├─ dbSwitched = false 且 serverRunning = true → 不需要操作
│   │   └─ 輸出「✅ Server 已在 port 3001 運行，跳過」
│   │
│   └─ dbSwitched = false 且 serverRunning = false → 需要啟動（但不用 pkill）
│       └─ 直接啟動 ./.claude/scripts/start-dev-server.sh
│
└─ 4.2 【需要重啟時】（與現行流程相同）
    ├─ pkill -f "nest start" || true
    ├─ 確認 port 3001 已釋放
    ├─ 啟動 start-dev-server.sh
    └─ 確認啟動成功
```

### 與現有流程的相容性分析

| 面向 | 影響 | 說明 |
|------|------|------|
| Step 0 TaskCreate | **無影響** | Task subject 不變：「Step 1: 環境切換」、「Step 4: Server 啟動 (port 3001)」 |
| Step 1 禁止操作表 | **保留** | 禁止 `cp .env` 的規則不受影響，偵測邏輯只讀取 `.env.local`，不修改 |
| Step 2 上下文分析 | **無影響** | 不依賴 Step 1 的輸出 |
| Step 3 DB 查詢 | **無影響** | 無論 Step 1 是否跳過，PG tunnel 都已確認就緒 |
| Step 4 現有條件邏輯 | **取代** | 原本依賴 Step 1 文字輸出判斷，改為依賴 `dbSwitched` + `serverRunning` 布林值，更可靠 |
| Step 5-7 多帳號迭代 | **無影響** | 不依賴 Step 1/4 的狀態 |
| Step 8 更新提案 | **無影響** | 不依賴環境切換狀態 |
| -f / -p 模式 | **無影響** | flag 只影響 Step 3 和 Step 6，不影響環境偵測 |
| `db-tunnel.sh status` | **保留** | 偵測後仍會跑 status 確認，作為最終驗證 |

### 實際場景驗證

| 場景 | 偵測結果 | Step 1 行為 | Step 4 行為 |
|------|---------|------------|------------|
| 另一個 AI 已設好 dev 環境 | PG=dev ✅, MSSQL ✅, Server ✅ | 跳過切換 | 跳過啟動 |
| 自己剛跑完 implement（dev 環境） | PG=dev ✅, MSSQL ✅, Server ✅ | 跳過切換 | 跳過啟動 |
| 環境連 staging 但要測 dev | PG=staging ❌, MSSQL ✅, Server ✅ | 完整切換到 dev | 重啟 server |
| 完全沒連（冷啟動） | PG=local ❌, MSSQL ❌, Server ❌ | 完整切換 + tunnel | 啟動 server |
| PG 對但 MSSQL 斷了 | PG=dev ✅, MSSQL ❌, Server ✅ | 只啟動 MSSQL tunnel | 跳過啟動 |
| PG 對、MSSQL 對、Server 掛了 | PG=dev ✅, MSSQL ✅, Server ❌ | 跳過切換 | 啟動 server（不 pkill） |

### 需要的修改

| 項目 | 內容 | 狀態 |
|------|------|------|
| `/check-result` 設計稿 | 記錄問題和設計決策 | ✅ 已完成 |
| `/check-result` 定義檔 | Step 1 改為偵測優先、Step 4 配合調整 | ⏳ 待 /updateDesign |
| `/check-result` 流程圖 | Step 1 區塊更新為偵測優先流程 | ⏳ 待 /updateDesign |

### 設計經驗

**原則**：環境操作類步驟應該是「冪等」的 — 多次執行結果相同，已就緒的環境不應該被打擾。偵測優先模式讓 skill 能自動適應「環境已由他人或先前操作準備好」的情境，減少人工介入。
