---
description: 在遠端環境執行 migration
argument-hint: <env> [migration-file]
design-doc: prompts/4_diary/debug/proposal/slash/runMigration_skill_proposal.md
---

@.claude/flowcharts/runMigration_flowchart.md

@/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/dev_server_debug_prompt.md

## 參數

- `$1`：目標環境（dev/staging），必填
- `$2`：Migration 檔名（可選，從上下文自動識別）

## 環境對應

| 環境 | 專案路徑 | DB 名稱 | DB User |
|------|----------|---------|---------|
| dev | `backend-nestjs-dev` | `eagle-dev` | `<DB_USER>` |
| staging | `backend-nestjs-staging` | `eagle` | `<DB_USER>` |

## 任務

1. **解析環境參數**
   - 支援：`dev`、`staging`
   - 不支援 `production`（顯示警告並終止）
   - 無參數 → 報錯：`❌ 請指定環境：/runMigration <dev|staging>`

2. **識別 Migration 檔案**
   - 優先使用 `$2` 參數
   - 其次從對話上下文尋找最近提到的 migration 檔案（通常來自 /gcommit-push 的提醒）
   - 找不到則詢問用戶

3. **SSH 連線並確認檔案存在**
   ```bash
   ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP> "ls backend-nestjs-{ENV}/src/database/migrations/{migration-file}"
   ```
   - 檔案存在 → 繼續執行
   - 檔案不存在 → 報錯：`❌ Migration 檔案不存在，可能 CI/CD 尚未部署完成，請稍後再試`

4. **執行 Migration**
   ```bash
   ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP> "cd backend-nestjs-{ENV} && yarn migration:single src/database/migrations/{migration-file}"
   ```

5. **驗證結果**
   - 根據 migration 內容，執行對應的 DB 驗證查詢
   - **Dev 環境**：
     ```bash
     ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP> "cd backend-nestjs-dev && PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5432 -U <DB_USER> -d eagle-dev -c \"{驗證 SQL}\""
     ```
   - **Staging 環境**：
     ```bash
     ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP> "cd backend-nestjs-staging && PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5432 -U <DB_USER> -d eagle -c \"{驗證 SQL}\""
     ```

6. **輸出結果**
   - 成功時顯示：
     ```
     ✅ Migration 執行完成

     **環境**: {env}
     **Migration**: {migration-file}

     ### DB 驗證結果
     {驗證查詢結果}
     ```
   - 失敗時顯示錯誤訊息和可能原因

## 限制

- ⛔ 不支援 production 環境
- ⛔ 不執行 `yarn build`（不需要，ts-node 直接執行）
- ⛔ 不執行 `git pull`（CI/CD 自動部署）
- ⛔ 禁止使用 MCP secure-proxy（那是 production 環境）
