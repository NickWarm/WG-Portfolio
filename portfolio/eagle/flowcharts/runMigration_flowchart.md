# runMigration 執行流程

```
/runMigration 執行流程
│
├─ 1. 【參數解析】
│   ├─ 有環境參數 → 使用指定環境（dev/staging）
│   ├─ 無參數 → 報錯：請指定環境
│   └─ production → 🚫 警告並終止
│
├─ 2. 【Migration 識別】
│   ├─ 有 $2 參數 → 使用指定檔案
│   ├─ 對話上下文有 migration → 自動識別
│   └─ 無法識別 → 詢問 migration 檔名
│
├─ 3. 【SSH 確認檔案存在】
│   ├─ 存在 → 繼續執行
│   └─ 不存在 → 報錯：CI/CD 尚未部署完成
│
├─ 4. 【執行 Migration】
│   └─ yarn migration:single {migration-file}
│
├─ 5. 【驗證結果】
│   └─ 執行對應的 DB 驗證查詢
│
└─ 6. 【輸出結果】
    ├─ 成功 → 顯示驗證結果
    └─ 失敗 → 顯示錯誤原因
```

## 環境對應

| 環境 | 專案路徑 | DB 名稱 |
|------|----------|---------|
| dev | `backend-nestjs-dev` | `eagle-dev` |
| staging | `backend-nestjs-staging` | `eagle` |

## 限制

- ⛔ 不支援 production 環境
- ⛔ 禁止使用 MCP secure-proxy（那是 production）
