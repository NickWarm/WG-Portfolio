# /fixPermissionError 執行流程

```
/fixPermissionError $1 執行流程
│
├─ P. 【參數模式判斷】
│   ├─ $1 以 `-` 開頭 → flag 模式
│   │   └─ `-list` → Step L
│   └─ 其他 → apiName → Step 0（掃描模式）
│
├─ L. 【顯示掃描進度】（`-list` 專用）
│   ├─ 讀取追蹤表
│   ├─ 解析統計數字和各 API 狀態
│   ├─ 輸出掃描進度摘要
│   │   ├─ 統計表（已掃描/總計 + 各結果數量）
│   │   ├─ 按區段分組的未掃描清單
│   │   └─ 建議下一個掃描的 API（已有403 > 400+404 > 只有400 > 特殊）
│   └─ 結束（不進入 Step 0~8）
│
├─ 0. 【建立進度追蹤】（掃描模式）
│   └─ TaskCreate 建立所有步驟
│
├─ 1. 【讀取範本】
│   └─ 讀取 permission_error_fix_pattern.md
│       ├─ 問題模式定義
│       ├─ 掃描標準
│       ├─ 修復 Pattern
│       └─ Proposal 產出模板
│
├─ 2. 【定位目標 API 檔案】
│   ├─ 找 Service：src/api/adminApi/{apiName}/{apiName}.service.ts
│   ├─ 找 Controller：src/api/adminApi/{apiName}/{apiName}.controller.ts
│   ├─ 找子 Service（如有）：src/api/adminApi/{apiName}/services/*.service.ts
│   ├─ 都找到 → 繼續
│   └─ 找不到 → 報錯結束
│
├─ 3. 【掃描 Service】
│   ├─ 3.1 找出所有 validate* 方法
│   ├─ 3.2 搜尋 dataScope / storeIds / storeId 相關邏輯
│   ├─ 3.3 分析各 validate 方法的錯誤回傳
│   │   ├─ 是否有 errorType 欄位
│   │   ├─ 各失敗情境的 message 內容
│   │   └─ 是否混淆「找不到」和「權限不足」
│   ├─ 3.4 找出使用 validate 回傳的 public methods
│   ├─ 3.5 分析 errorType 傳播鏈
│   │   ├─ spread（{ ...validation, data: null }）→ ✅ 安全
│   │   ├─ 逐欄位（{ message: validation.message }）→ ❌ 截斷 errorType
│   │   └─ 記錄每個 method 的回傳 key name（data / files / 其他）
│   └─ 3.6 判斷：有存取/權限驗證邏輯？
│       ├─ 有 → 繼續
│       └─ 無（只有資料格式驗證）→ Step 7 報告不適用
│
├─ 4. 【掃描 Controller】
│   ├─ 4.1 檢查 import 的 Exception 類型
│   ├─ 4.2 統計各 Exception 使用頻率
│   ├─ 4.3 找出所有 throw new ...Exception 語句
│   ├─ 4.4 找出軟性錯誤 handler（return { success: false } 不丟 Exception）
│   └─ 4.5 對照 Service 錯誤情境，列出需修正的 handler + 軟性錯誤 handler
│
├─ 5. 【分析匹配結果】
│   ├─ 套用範本的判斷矩陣
│   ├─ ❌ 需要修正 → 繼續 Step 6
│   ├─ ⚠️ 部分修正（已有 403 但用字串匹配/非標準命名）→ 繼續 Step 6（含遷移指引）
│   └─ ✅ 已修正 / ⏭️ 不適用 → Step 7 報告結果
│
├─ 6. 【產出 Proposal】
│   ├─ 6.1 套用範本的 Proposal 產出模板
│   ├─ 6.2 生成問題摘要表
│   ├─ 6.3 生成現況 vs 修改後對照表
│   ├─ 6.4 生成 Service 具體修改（含傳播鏈分析 + 回傳 key name）
│   ├─ 6.5 生成 Controller 具體修改（throw Exception handler）
│   ├─ 6.6 生成軟性錯誤 handler 清單（後續改進項）
│   ├─ 6.7 生成預期修改檔案清單
│   ├─ 6.8 生成驗證建議
│   ├─ 6.9 （⚠️ 模式）生成次優模式遷移指引
│   └─ 6.10 寫入檔案：prompts/4_diary/role_and_permission/debug/{MMDD}_{apiName}_permission_error_fix_proposal.md
│
├─ 7. 【輸出結果】
│   ├─ 有問題 → 顯示掃描摘要 + proposal 路徑 + 後續步驟提醒
│   └─ 無問題 → 顯示「不需要修正」+ 原因
│
├─ 7.5 【更新追蹤表】（僅 ✅/⏭️ 時）
│   ├─ 結果為 ✅ 已修正 或 ⏭️ 不適用 → 更新追蹤表
│   ├─ 結果為 ❌ 或 ⚠️ → 跳過（由 /gcommit-push 更新）
│   └─ 更新內容：
│       ├─ 該 API 的「掃描」欄位 → ✅
│       ├─ 該 API 的「結果」欄位 → ✅ 已修正 / ⏭️ 不適用
│       ├─ 該 API 的「日期」欄位 → 當天日期
│       ├─ 更新「進度統計」（已掃描數量 + 百分比）
│       ├─ 更新「掃描結果分佈」（結果數量 + API 清單）
│       └─ 更新「最後更新」日期
│
└─ 8. 【更新進度】
    └─ 標記所有 Task 為 completed
```

## 掃描策略細節

### Step 3：Service 層掃描

```
掃描策略
│
├─ 3.1 Grep "validate" → 找出所有 validate 方法名
│   └─ 讀取每個 validate 方法的完整邏輯
│
├─ 3.2 Grep "dataScope|storeIds|storeId" → 找權限相關邏輯
│   └─ 分析這些邏輯在錯誤回傳中的表現
│
├─ 3.3 分析每個 validate 方法的回傳
│   ├─ 有 errorType → 記錄為「已修正」
│   ├─ 無 errorType + 有權限邏輯 → 記錄為「需要修正」
│   └─ 無 errorType + 無權限邏輯（純資料驗證）→ 記錄為「不適用」
│
├─ 3.4 找出使用 validate 回傳的 public methods
│   └─ Grep "validation.success|validation.message" 或類似 pattern
│
├─ 3.5 分析 errorType 傳播鏈（DF-4 reviewDoc 經驗）
│   ├─ 每個 public method 如何轉發 validation 結果？
│   │   ├─ { ...validation, data: null } → ✅ spread 安全
│   │   └─ { success: false, message: validation.message, data: null } → ❌ 截斷
│   ├─ 記錄每個 method 的回傳 key name
│   │   ├─ 大多數用 data: null
│   │   └─ 特殊 key（如 uploadFiles 用 files: []）需個別處理
│   └─ 標記需要修改的 method 和修改方式
│
└─ 3.6 判斷整體結論
    ├─ 至少一個 validate 方法「需要修正」→ 有問題
    └─ 全部「已修正」或「不適用」→ 無問題
```

### Step 4：Controller 層掃描

```
掃描策略
│
├─ 4.1 讀取 import 區塊
│   └─ 找 BadRequestException, NotFoundException, ForbiddenException
│
├─ 4.2 Grep "throw new" → 統計各 Exception
│   ├─ 只有 BadRequestException → 全部需要修正
│   ├─ 有 NotFoundException 無 ForbiddenException → 部分需要修正
│   └─ 已有 ForbiddenException → 檢查是否用 errorType 分支
│       ├─ 用 errorType 分支 → ✅ 已修正
│       ├─ 用 messageEN 字串匹配 → ⚠️ 次優，需遷移
│       └─ 用 result.type（非標準命名）→ ⚠️ 次優，需統一命名
│
├─ 4.3 找出軟性錯誤 handler
│   ├─ 搜尋 return { success: false 但不 throw Exception 的 handler
│   └─ 記錄為「後續改進項」（FORBIDDEN 時前端收 200，不觸發錯誤 toast）
│
└─ 4.4 對照 Service 掃描結果
    └─ 列出：需修正的 handler + 軟性錯誤 handler（分開列）
```
