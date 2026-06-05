# guideArchitecture 執行流程

```
/guideArchitecture 執行流程
│
├─ 1. 【確認類別】
│   ├─ $ARGUMENTS 為空 → 詢問用戶選擇類別
│   │   ├─ permission（權限相關）
│   │   ├─ file（檔案上傳）
│   │   └─ subscriber（異動紀錄）
│   │
│   └─ $ARGUMENTS 有值 → 直接使用
│
├─ 2. 【根據類別讀取知識】
│   │
│   ├─ permission
│   │   ├─ 文件：role_and_permission/design/
│   │   └─ 程式：adminApi/role/、entities、constant.ts
│   │
│   ├─ file
│   │   ├─ 架構文件：file_upload/architecture/
│   │   ├─ 學習指南：templateFile.md
│   │   └─ 程式：file.service.ts、s3.service.ts、File.ts
│   │
│   └─ subscriber
│       ├─ 實作準則：subscriber/design/
│       └─ 經驗文件：subscriber/experence/
│
└─ 3. 【總結知識】
    └─ 摘要學到的知識重點
```

## 類別對照表

| 類別 | 說明 | 主要文件 |
|------|------|----------|
| permission | 權限架構 | role_and_permission/design/ |
| file | 檔案上傳 | file_upload/architecture/ |
| subscriber | 異動紀錄 | subscriber/design/ |
