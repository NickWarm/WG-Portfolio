# Slash Command 提案：/know-cc-config

> **cc** = Claude Code

## 目的

取代每次開啟 Claude Code 時需要手動貼上的文字：

```
請先讀一下 /Users/nicholas/Desktop/Projects/backend-nestjs 的 CLAUDE.md，與 claude code 的配置，請採用分段讀取，一次讀 1000 行的方式讀檔案
```

## 設計

### 指令格式

```
/know-cc-config
```

### 指令內容

檔案位置：`/Users/nicholas/Desktop/Projects/.claude/commands/know-cc-config.md`

```markdown
---
description: 讀取 backend-nestjs 專案的 CLAUDE.md 與 Claude Code 配置（cc = Claude Code）
---

請先讀一下 /Users/nicholas/Desktop/Projects/backend-nestjs 的：
1. CLAUDE.md
2. .claude/settings.json（包含 hooks 和 permissions）

請採用分段讀取，一次讀 1000 行的方式讀檔案
```

## 驗證結果

```bash
# 在 Claude Code 中輸入
/know-cc-config

# 結果：✅ 驗證成功
# AI 開始分段讀取 backend-nestjs 的 CLAUDE.md 與 .claude/settings.json
```

---

## 問題發現：Token 消耗過高

### 背景

由於需要跨專案工作（backend-nestjs、prompts、.claude），只能在 `Projects` 目錄開啟 Claude Code，而非在單一專案中開啟。這導致 Claude Code 無法自動載入子專案的 CLAUDE.md。

### 舊方案的缺點

使用「分段讀取，一次讀 1000 行」的方式，實際 Token 消耗：

| 項目 | 估計 Token |
|------|-----------|
| CLAUDE.md (~1860 行) | ~15,000-20,000 |
| settings.json (~315 行) | ~3,000-4,000 |
| 摘要輸出 | ~2,000-3,000 |
| **總計** | **~20,000-27,000** |

這個消耗量對於「理解配置」這個需求來說過於昂貴。

---

## 替代方案研究

### 研究發現

1. **`--add-dir` 是 CLI 啟動參數**，無法在 slash command 定義中使用
2. **`/add-dir` 是內建命令**，可在互動模式中動態添加目錄
3. **Slash command 支援的 frontmatter** 只有：`allowed-tools`、`argument-hint`、`description`、`model`、`disable-model-invocation`

### 替代方案比較

#### 方案 1：使用內建 `/add-dir` 命令

在互動模式中動態添加目錄：
```
/add-dir ../backend-nestjs
```

**優點**：簡單直接
**缺點**：需要手動執行，無法自動化

#### 方案 2：使用 `@` 檔案引用（✅ 採用）

```markdown
---
description: 讀取 backend-nestjs 專案的配置
---

請閱讀以下配置檔案並提供重點摘要：
- @/Users/nicholas/Desktop/Projects/backend-nestjs/CLAUDE.md
- @/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/settings.json
```

**優點**：
- Claude Code 自動處理檔案引用，更有效率
- 不需要指定分段讀取
- 語法簡潔

**缺點**：
- 需要使用絕對路徑

#### 方案 3：使用 Bash 命令讀取

```markdown
---
allowed-tools: Bash(cat:*)
---

專案配置：!`cat ../backend-nestjs/CLAUDE.md`
```

**優點**：可使用相對路徑
**缺點**：需要額外的 `allowed-tools` 權限設定

---

## 優化後的設計

### 採用方案 2：`@` 檔案引用

檔案位置：`/Users/nicholas/Desktop/Projects/.claude/commands/know-cc-config.md`

```markdown
---
description: 讀取 backend-nestjs 專案的 CLAUDE.md 與 Claude Code 配置（cc = Claude Code）(project)
---

請閱讀以下配置檔案並提供重點摘要：
- @/Users/nicholas/Desktop/Projects/backend-nestjs/CLAUDE.md
- @/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/settings.json

重點關注：
1. 開發流程與規範
2. Hook 系統配置
3. 權限設定
```

### 預期改善

- **Token 消耗**：預計減少 50-70%（由 Claude Code 自動優化讀取）
- **執行效率**：不需要多次分段讀取
- **維護性**：語法更簡潔易懂

---

## 實測結果（2026-01-07）

### 發現：Token 消耗反而增加

使用 `@` 檔案引用後，Claude Code **自動載入了更多相關檔案**：

| 項目 | 估計 Token |
|------|-----------|
| **輸入 (Input)** | |
| 系統提示 + 工具定義 | ~18,000 |
| settings.json | ~3,000 |
| CLAUDE.md (根目錄) | ~8,000 |
| CLAUDE.md (.claude/) | ~8,000 |
| workflowSteps.md | ~1,200 |
| InteractionFirstContext.md | ~1,500 |
| pre_merge_deployment_check_workflow.md | ~1,200 |
| **輸入小計** | **~41,000** |
| **輸出 (Output)** | ~600 |
| **總計** | **~41,600** |

### 分析

1. **系統開銷固定**：~18,000 tokens（無法減少）
2. **`@` 引用會連帶載入**：CLAUDE.md 中引用的其他檔案也被自動載入
3. **速度變快**：體感執行速度明顯提升（單次請求 vs 多次分段讀取）

### 結論

| 指標 | 舊方案（分段讀取） | 新方案（`@` 引用） |
|------|-------------------|-------------------|
| Token 消耗 | ~20,000-27,000 | ~41,600 |
| 執行速度 | 較慢（多次請求） | 較快（單次請求） |
| 使用體驗 | 需等待分段 | 即時回應 |

**取捨**：Token 消耗增加約 50%，但速度和體驗大幅改善。

### 優化行動：清理過時的 `@` 引用

**問題根因**：CLAUDE.md 中使用 `@` 引用了三個過時的工作流程文件，導致連帶載入。

### 🔍 重要發現：專案有兩個 CLAUDE.md

**問題現象**：第一次修改後，測試 `/know-cc-config` 仍然載入過時文件。

**原因分析**：
```
backend-nestjs/
├── CLAUDE.md                 ← 根目錄配置（第一次修改）
└── .claude/
    └── CLAUDE.md             ← 子目錄配置（被遺漏！）
```

Claude Code 啟動時會載入**兩個** CLAUDE.md：
1. `backend-nestjs/CLAUDE.md` - 主配置檔
2. `backend-nestjs/.claude/CLAUDE.md` - Claude Code 專用目錄的配置

**教訓**：修改 Claude Code 配置時，必須同時檢查並修改這兩個檔案！

**清理的引用**：
1. `@/Users/nicholas/Desktop/Projects/prompts/5_workflow/workflowSteps.md` - 過時，已有更簡便的 fnd 模式
2. `@/Users/nicholas/Desktop/Projects/prompts/5_workflow/InteractionFirstContext.md` - 過時，文件都會被 review 多次才實作
3. `@/Users/nicholas/Desktop/Projects/prompts/4_diary/deployment/pre_merge_deployment_check_workflow.md` - 過時，開發結束後都會執行 yarn build

**執行的修改**：

⚠️ **注意**：專案有**兩個** CLAUDE.md 檔案，都需要修改！
- `backend-nestjs/CLAUDE.md` - 主配置
- `backend-nestjs/.claude/CLAUDE.md` - 子目錄配置（Claude Code 也會載入）

**兩個檔案都執行的修改**：
- ✅ 刪除「## 工作流程整合」區塊（含 2 個 `@` 引用）
- ✅ 刪除「## 合併前部署驗證工作流程」整個區塊（含 1 個 `@` 引用）
- ✅ 更新「Prompt 快速查看功能」的快速回應模板

**預期效果**：
- Token 消耗從 ~41,600 降至 ~30,000（預估減少 ~25%）
- 移除 3 個過時文件的連帶載入

### 未來優化方向

1. **建立精簡版配置**：`CLAUDE_SUMMARY.md`（只保留核心規則）
2. **按需載入**：根據任務類型只載入相關配置

---

## 未來擴展

當需要支援其他專案時，可以：
1. 修改此指令加入 `$ARGUMENTS` 參數
2. 或建立新的專案專屬指令（如 `/know-cc-config-frontend`）

---

---

## 估算錯誤發現（2026-01-07）

### 問題

之前的估算 (~20,000-27,000 tokens) **漏算了系統開銷**：

| 項目 | 遺漏的部分 |
|------|-----------|
| 系統 prompt + 工具定義 | ~18,000 tokens |
| Hook 輸出 | ~5,000-8,000 tokens |

### 重新實測數據

| 方案 | 錯誤估算 | 實測數據 |
|------|---------|---------|
| 分段讀取 | ~20,000-27,000 | **~38,000-54,000** |
| `@` 引用 | ~41,600 | ~37,000-43,000 (清理後) |

### 結論

兩者 Token 消耗**差不多**，`@` 引用甚至可能更省！

加上 `@` 引用速度更快，最終決定採用 `@` 引用方案。

---

## 最終決定：採用 `@` 引用（2026-01-07）

### 最終 Slash Command 內容

```markdown
---
description: 讀取 backend-nestjs 專案的 CLAUDE.md 與 Claude Code 配置（cc = Claude Code）(project)
---

請閱讀以下配置檔案並提供重點摘要：
- @/Users/nicholas/Desktop/Projects/backend-nestjs/CLAUDE.md
- @/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/settings.json

重點關注：
1. 開發流程與規範
2. Hook 系統配置
3. 權限設定
```

### 已完成的優化

- ✅ CLAUDE.md 中過時的 `@` 引用已清理（減少連帶載入）
- ✅ 記錄「兩個 CLAUDE.md」的發現（避免未來遺漏）
- ✅ 修正 Token 估算方法（必須包含系統開銷）

---

**建立日期**：2026-01-07
**驗證日期**：2026-01-07
**優化日期**：2026-01-07
**最終決定**：2026-01-07
**狀態**：✅ 採用 `@` 引用方案
