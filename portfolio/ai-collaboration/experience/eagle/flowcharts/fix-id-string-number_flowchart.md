# /fix-id-string-number 執行流程

```
/fix-id-string-number {$1} 執行流程
│
├─ 入口分流
│   ├─ $1 === '-list' → 列表模式（讀追蹤表 → 輸出摘要 → 結束）
│   └─ 其他 → 掃描模式（繼續 Step 0）
│
├─ 0. 【建立進度追蹤】
│   └─ TaskCreate 建立所有步驟
│
├─ 1. 【定位目標 DTO 檔案】
│   ├─ Glob: src/api/adminApi/{apiName}/**/*.dto.ts
│   ├─ 找到 → 繼續
│   └─ 找不到 → 報錯結束
│
├─ 2. 【掃描 @IsNumber() + id 欄位】
│   ├─ 2.1 Grep @IsNumber() 找出所有位置（含行數）
│   ├─ 2.2 每個 @IsNumber() 往下一行確認欄位名是否為 id
│   │   ├─ 是 id → 繼續檢查
│   │   └─ 不是 id → 跳過
│   ├─ 2.3 往上讀 decorator 區塊
│   │   ├─ 有 @Type(() => Number) → ✅ 已修正
│   │   ├─ 有 @Transform(...Number...) → ✅ 已修正（替代方案）
│   │   └─ 都沒有 → ❌ 需修正
│   └─ 2.4 記錄：DTO 類別名、欄位名、行數、修正狀態
│
├─ 3. 【分類 DTO 類型 + 過濾】
│   ├─ 類別名含 Update* → Request Body（需修正）
│   ├─ 類別名含 Create* → 檢查 id 是否來自前端
│   ├─ 類別名含 *Query* / *Filter* → Query Params（跳過）
│   ├─ 類別名含 *Response* / *Result* → Response（跳過）
│   ├─ 其他 → 讀 Controller 確認用途
│   └─ 統計：需修正 N / 已修正 N / 不適用 N
│
├─ 4. 【判斷結果】
│   ├─ 全部 ✅ 或全部不適用 → 跳到 Step 7（無修正版）
│   └─ 有 ❌ → 繼續 Step 5
│
├─ 5. 【自動修正】
│   ├─ 5.1 確認 import { Type } from 'class-transformer' 存在
│   │   ├─ 已有完整 import → 不動
│   │   ├─ 有 class-transformer import 但缺 Type → 加入 Type
│   │   └─ 完全沒有 → 新增 import 行
│   ├─ 5.2 對每個 ❌ 欄位
│   │   └─ 在 @IsNumber() 前插入 @Type(() => Number)
│   └─ 5.3 記錄修改清單
│
├─ 6. 【Build 驗證】
│   ├─ cd backend-nestjs && yarn build
│   ├─ 成功 → 繼續
│   └─ 失敗 → 分析錯誤 → 修正 → 重 build
│
├─ 7. 【產出輕量 Proposal】
│   ├─ 有修正 → 寫入 proposal（掃描結果 + 修改清單）
│   │   └─ 路徑：prompts/4_diary/debug/{MMDD}_{apiName}_id_type_fix_proposal.md
│   └─ 無修正 → 不產出 proposal
│
├─ 8. 【更新追蹤表】
│   ├─ 路徑：prompts/4_diary/debug/id-type-fix-progress.md
│   ├─ 首次執行 → 自動建立追蹤表（含 51 個 API）
│   └─ 更新內容：
│       ├─ 該 API 的「掃描」欄位 → ✅
│       ├─ 該 API 的「結果」欄位 → ✅ 已修正 / ⏭️ 不適用
│       ├─ 該 API 的「修正數」欄位 → N
│       ├─ 該 API 的「日期」欄位 → 當天日期
│       └─ 重算頂部統計數字
│
└─ 9. 【輸出結果】
    ├─ 有修正 → 顯示摘要 + proposal 路徑 + 提醒 /gcommit-push
    └─ 無修正 → 顯示「不需修正」+ 原因
```

## 掃描策略細節

### Step 2：id 欄位識別

```
掃描策略
│
├─ 2.1 Grep "@IsNumber()" → 找出所有行數
│
├─ 2.2 每個匹配行 → 讀下一行
│   ├─ 匹配 /^\s+id[?]?\s*:\s*number/ → 是 id 欄位
│   └─ 不匹配 → 跳過
│
├─ 2.3 確認是 id 欄位 → 往上讀 3-5 行
│   ├─ 找到 @Type(() => Number) → ✅
│   ├─ 找到 @Transform(.*Number.*) → ✅
│   └─ 都沒找到 → ❌ 記錄
│
└─ 2.4 同時記錄所屬 DTO 類別名
    └─ 往上搜尋最近的 class XXX { → 提取 XXX
```

### Step 5：Import 處理

```
Import 處理
│
├─ Grep "from 'class-transformer'" → 找 import 行
│
├─ 有 import 行
│   ├─ 已包含 Type → 不動
│   └─ 不包含 Type → 加入
│       ├─ import { Transform } from → import { Transform, Type } from
│       └─ import { IsOptional, Transform } from → import { IsOptional, Transform, Type } from
│
└─ 沒有 import 行
    └─ 在檔案 import 區塊末尾加入
        import { Type } from 'class-transformer'
```
