# runMigration 設計稿

> 📅 建立日期：2026-01-28

---

## 問題描述

### 現況痛點

1. **流程不熟悉**：AI 執行遠端 migration 時，錯誤地認為需要先 `yarn build`，浪費時間
2. **環境混淆**：不清楚 staging 機器上程式碼如何更新（CI/CD 自動部署 vs 手動 pull）
3. **指令不確定**：不確定該用 `yarn migration:run` 還是 `yarn migration:single`

### 正確理解

- staging 機器的程式碼由 **CI/CD 自動部署**，commit push 後就會更新
- `yarn migration:single` 使用 `ts-node` 直接執行 `.ts` 檔案，**不需要先 build**
- 只需要確認 migration 檔案存在，就能直接執行

### 預期效益

- 標準化 migration 執行流程
- 避免不必要的 build 步驟
- 減少操作錯誤

---

## 觸發場景

### 主要觸發：/gcommit-push 罐頭訊息

當 `/gcommit-push` 完成後，若 commit 包含 migration 檔案，會顯示：

```
📋 Migration 執行提醒
─────────────────────────────────
Migration 檔案：{migration_file_name}
影響資料表：{table_name}
新增欄位：{column_name}

環境狀態檢查：
- dev:     {✅ 已存在 / ❌ 需要執行 migration}
- staging: {✅ 已存在 / ❌ 需要執行 migration}

⚠️ 請在以下環境執行 migration：
   yarn migration:run --env={env}
─────────────────────────────────
```

用戶看到此訊息後，會告訴 AI：「幫我跑 staging migration」或類似指令。

### 次要觸發：直接呼叫

用戶也可以直接呼叫：`/runMigration staging`

---

## 執行流程圖

```
/runMigration 執行流程
│
├─ 1. 【參數解析】
│   ├─ 有環境參數（dev/staging） → 使用指定環境
│   └─ 無參數 → 報錯，環境必填
│
├─ 2. 【Migration 識別】
│   ├─ 對話上下文有 migration 檔案 → 自動識別
│   └─ 無法識別 → 詢問 migration 檔名
│
├─ 3. 【SSH 連線】
│   └─ ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP>
│
├─ 4. 【確認 Migration 存在】
│   ├─ ls 確認檔案存在 → 繼續
│   └─ 檔案不存在 → 報錯（可能 CI/CD 尚未部署完成）
│
├─ 5. 【執行 Migration】
│   └─ yarn migration:single {migration-path}
│
└─ 6. 【驗證結果】
    ├─ 成功 → 查詢 DB 確認欄位變更
    └─ 失敗 → 顯示錯誤訊息
```

---

## 參數說明

| 參數 | 必要 | 說明 | 範例 |
|------|------|------|------|
| `$1` | 是 | 目標環境（dev/staging） | `staging` |
| `$2` | 否 | Migration 檔名（可從上下文自動識別） | `1769609572000-ChangeNumLivingRoom...` |

---

## 輸出格式

### 成功時

```markdown
## Migration 執行完成

**環境**: staging
**Migration**: 1769609572000-ChangeNumLivingRoomNumBathroomToDecimal.ts

### 執行結果
Migration 已成功執行

### DB 驗證
| column_name   | data_type | numeric_precision | numeric_scale |
|---------------|-----------|-------------------|---------------|
| numLivingRoom | numeric   | 3                 | 1             |
| numBathroom   | numeric   | 3                 | 1             |
```

### 失敗時

```
❌ Migration 執行失敗

**原因**: [錯誤訊息]

**可能原因**:
- CI/CD 尚未部署完成，請稍後再試
- Migration 檔案路徑錯誤
- DB 連線問題
```

---

## 實作細節

### 環境對應

| 環境 | 專案路徑 | PM2 服務名稱 | DB 名稱 |
|------|----------|-------------|---------|
| dev | `backend-nestjs-dev` | `backend-dev` | `eagle-dev` |
| staging | `backend-nestjs-staging` | `backend-staging` | `eagle` |

### SSH 連線方式

**重要**：不使用 MCP secure-proxy（那是 production 環境）

```bash
# 連線到 dev/staging 機器
ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP>
```

### 需要執行的指令

```bash
# 1. 確認 migration 檔案存在
ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP> "ls backend-nestjs-{ENV}/src/database/migrations/*{關鍵字}*"

# 2. 執行 single migration
ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP> "cd backend-nestjs-{ENV} && yarn migration:single src/database/migrations/{migration-file}.ts"

# 3. 驗證 DB（staging 範例）
ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP> "cd backend-nestjs-staging && PGPASSWORD=<DB_PASSWORD> psql -h localhost -p 5432 -U <DB_USER> -d eagle -c \"
  SELECT column_name, data_type, numeric_precision, numeric_scale
  FROM information_schema.columns
  WHERE table_name = '{table_name}' AND column_name IN ('{column1}', '{column2}')
\""
```

### 注意事項

- **不需要 build**：`yarn migration:single` 使用 ts-node，直接執行 .ts 檔
- **不需要 pull**：CI/CD 會自動部署，用戶會告訴 AI 什麼時候可以跑
- **確認部署完成**：如果 ls 找不到檔案，可能是 CI/CD 尚未完成，稍等再試
- **production 環境**：此 skill 不支援 production，避免誤操作
- **MCP 禁用**：⛔ 禁止使用 MCP secure-proxy（那是 production 環境）

---

## Skill 定義檔

**檔案位置**: `backend-nestjs/.claude/commands/runMigration.md`

```markdown
---
description: 在遠端環境執行 migration
argument-hint: <env> [migration-file]
design-doc: prompts/4_diary/debug/proposal/slash/runMigration_skill_proposal.md
---

@/Users/nicholas/Desktop/Projects/prompts/4_diary/debug/dev_server_debug_prompt.md

## 參數

- `$1`：目標環境（dev/staging），必填
- `$2`：Migration 檔名（可選，從上下文自動識別）

## 執行流程

```
/runMigration 執行流程
│
├─ 1. 【參數解析】
│   ├─ 有環境參數 → 使用指定環境
│   └─ 無參數 → 報錯，環境必填
│
├─ 2. 【Migration 識別】
│   ├─ 有 $2 參數 → 使用指定檔案
│   ├─ 對話上下文有 migration → 自動識別
│   └─ 無法識別 → 詢問 migration 檔名
│
├─ 3. 【SSH 執行】
│   ├─ 確認檔案存在
│   ├─ 執行 migration
│   └─ 驗證結果
│
└─ 4. 【輸出結果】
    ├─ 成功 → 顯示驗證結果
    └─ 失敗 → 顯示錯誤原因
```

## 環境對應

| 環境 | 專案路徑 | DB 名稱 |
|------|----------|---------|
| dev | `backend-nestjs-dev` | `eagle-dev` |
| staging | `backend-nestjs-staging` | `eagle` |

## 任務

1. **解析環境參數**
   - 支援：`dev`、`staging`
   - 不支援 `production`（顯示警告並終止）

2. **識別 Migration 檔案**
   - 優先使用 `$2` 參數
   - 其次從對話上下文尋找最近提到的 migration 檔案（通常來自 /gcommit-push 的提醒）
   - 找不到則詢問用戶

3. **SSH 連線並確認檔案存在**
   ```bash
   ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP> "ls backend-nestjs-{ENV}/src/database/migrations/{migration-file}"
   ```
   - 檔案不存在 → 提示可能 CI/CD 尚未部署完成

4. **執行 Migration**
   ```bash
   ssh -i ~/.ssh/id_ed25519 ubuntu@<SERVER_IP> "cd backend-nestjs-{ENV} && yarn migration:single src/database/migrations/{migration-file}"
   ```

5. **驗證結果**
   - 根據 migration 內容，執行對應的 DB 驗證查詢
   - 使用 dev_server_debug_prompt.md 中的 DB 連線方式
   - 顯示驗證結果

## 限制

- ⛔ 不支援 production 環境
- ⛔ 不執行 `yarn build`（不需要）
- ⛔ 不執行 `git pull`（CI/CD 自動部署）
- ⛔ 禁止使用 MCP secure-proxy（那是 production 環境）
```

---

## 實作狀態

- [x] 問題分析（2026-01-28）
- [x] 設計稿撰寫（2026-01-28）
- [x] 環境資訊確認（2026-01-28）
- [x] Skill 定義檔實作（2026-01-28）
- [ ] 測試驗證
