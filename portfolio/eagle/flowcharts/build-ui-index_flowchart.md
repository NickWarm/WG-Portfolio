# build-ui-index 執行流程

⚠️ **重要**：此 skill 必須直接執行，禁止使用 Task tool 開啟 agent

```
/build-ui-index 執行流程
│
├─ 1. 【參數解析】
│   ├─ dashboard → 只掃描 dashboard-nuxt
│   ├─ frontend → 只掃描 frontend-nuxt
│   ├─ all（預設）→ 兩個都掃描
│   └─ --full → 強制全量掃描
│
├─ 2. 【判斷掃描模式】
│   ├─ 有 --full → 全量掃描
│   ├─ 有變動紀錄 → 增量掃描（只掃描變動檔案）
│   └─ 無變動紀錄 → 全量掃描
│
├─ 3. 【掃描前端專案】
│   ├─ 3.1 掃描 API 定義（api/core/*.ts）
│   ├─ 3.2 掃描頁面（views/**/*.vue）
│   ├─ 3.3 掃描功能操作（@click handler）
│   ├─ 3.4 掃描 Dialog（components/Dialog*.vue）
│   └─ 3.5 掃描 Composables（有封裝 API 的）
│
├─ 4. 【產出索引文件】
│   ├─ 全量 → 重新產出完整索引
│   └─ 增量 → 合併更新到現有索引
│
└─ 5. 【輸出結果】
    └─ 顯示統計與索引位置
```

## 前後端對應

| 後端 API 目錄 | 前端專案 | 索引文件 |
|--------------|----------|----------|
| adminApi/ | dashboard-nuxt | ui-api-index-dashboard.md |
| publicApi/ | frontend-nuxt | ui-api-index-frontend.md |

## Task 流程

**全量掃描（10 步）**：解析參數 → API 定義 → 頁面 → 功能操作 → Dialog → Composables → Dashboard 索引 → Frontend 索引 → 驗證 → 輸出

**增量掃描（6 步）**：解析參數 → 讀取變動清單 → 掃描變動檔案 → 更新索引 → 驗證 → 輸出

## Task 追蹤說明

**重要**：使用 TaskCreate 追蹤進度，但**禁止使用 Task tool 開啟 agent**

### 全量掃描 Task 列表（10 步）

1. 解析參數與判斷模式
2. 掃描 API 定義 (api/core/*.ts)
3. 掃描頁面 (views/**/*.vue)
4. 掃描功能操作 (@click handler)
5. 掃描 Dialog (components/Dialog*.vue)
6. 掃描 Composables
7. 產出 Dashboard 索引
8. 產出 Frontend 索引
9. 驗證索引文件
10. 輸出結果統計

### 增量掃描 Task 列表（6 步）

1. 解析參數與判斷模式
2. 讀取變動檔案清單
3. 掃描變動檔案
4. 更新索引文件
5. 驗證索引文件
6. 輸出結果統計

## 效率原則

| 方法 | Context 消耗 |
|------|-------------|
| ❌ 逐一讀取所有檔案 | 高 |
| ✅ Grep 篩選 + 少量 Read | 低 |
