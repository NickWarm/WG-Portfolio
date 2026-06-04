# Claude Code Memory vs Skill 設計決策

## 背景

研究 Claude Code 的 memory 功能後，評估其是否適合用於跨專案的開發規則管理。

---

## Memory 功能概覽

### 記憶類型與位置

| 類型 | 位置 | 用途 |
|------|------|------|
| 企業政策 | 系統目錄 | 組織級別說明 |
| 專案記憶 | `./CLAUDE.md` 或 `./.claude/CLAUDE.md` | 團隊共享的專案指導 |
| 專案規則 | `./.claude/rules/*.md` | 模組化、特定主題的規則 |
| 用戶記憶 | `~/.claude/CLAUDE.md` | 個人偏好（所有專案） |
| 專案本地記憶 | `./CLAUDE.local.md` | 個人專案特定偏好 |

### 關鍵發現：Token 消耗

- **載入動作**：讀取檔案本身不消耗 token
- **使用時**：所有載入的記憶會注入到每次 API 請求的上下文中，**每次對話都消耗 token**
- `@` 引用的檔案也會在啟動時一起載入，**無法減少 token 消耗**

### paths 過濾

可用 YAML frontmatter 限制規則只在處理特定檔案時載入：

```markdown
---
paths:
  - "src/api/**/*.ts"
---
# API 規則（只有編輯 API 檔案時才載入）
```

但這是基於「正在編輯的檔案」觸發，不是基於「開發任務開始前」觸發。

---

## 需求分析

### 我的情境

1. 開發規則/經驗放在**外部獨立專案**，無法放在目標專案內
2. 只有在**相關開發開始前**才需要讀取規則
3. 希望**按需載入**，避免不必要的 token 消耗

### Memory 的限制

- 自動載入機制適合「每次都需要」的內容
- 無法滿足「跨專案 + 按需觸發」的需求
- `@` 引用雖可指向外部路徑，但仍會自動載入

---

## 採用方案：Skill + 指示 AI 主動讀取

### 設計原則

1. **不使用 Memory**：避免自動載入消耗 token
2. **不使用 `@` 語法**：
   - `@` 只能引用單一檔案，不支援 folder
   - `@` 會在 Skill 載入時全部讀取，無法按需選擇
3. **使用 Skill 指示 AI 主動讀取**：根據參數只讀取對應類別的檔案

### 優點

| 特性 | 效果 |
|------|------|
| 不自動載入 | 省 token |
| 規則集中管理 | 多專案共用 |
| Skill 觸發 | 簡單快速 |
| 按需讀取 | 只在開發前消耗 |
| 支援 folder | 可讀取整個資料夾的文件 |

---

## 具體設計：/guideA

> guideA 的 A = Architecture（架構）

### 設計概念

使用「模擬子命令」模式，透過參數傳遞來選擇要載入的知識類別。

### 初期子選項

| 子選項 | 說明 |
|--------|------|
| `permission` | 權限相關架構經驗 |
| `file` | 檔案上傳相關架構經驗 |
| `subscriber` | 異動紀錄相關架構經驗 |

### 使用方式

```
/guideA               # 顯示選項讓用戶選擇（AskUserQuestion）
/guideA permission    # 直接載入權限架構知識
/guideA file          # 直接載入檔案上傳架構知識
/guideA subscriber    # 直接載入異動紀錄架構知識
```

### 各子選項的知識來源

#### permission（權限架構）

**文件**
- `/Users/nicholas/Desktop/Projects/prompts/4_diary/role_and_permission/design/` 底下的文件

**程式參考**
- `/Users/nicholas/Desktop/Projects/backend-nestjs/src/api/adminApi/role/` 底下的程式
- 相關 entities
- `constant.ts`

#### file（檔案上傳）

**文件**
- `/Users/nicholas/Desktop/Projects/prompts/5_workflow/templateFile.md`

**程式參考**
- `/Users/nicholas/Desktop/Projects/backend-nestjs/src/common/services/file.service.ts`
- `/Users/nicholas/Desktop/Projects/backend-nestjs/src/services/s3.service.ts`
- `/Users/nicholas/Desktop/Projects/backend-nestjs/src/entities/file.entity.ts`

#### subscriber（異動紀錄）

**實作準則與文件**
- `/Users/nicholas/Desktop/Projects/prompts/4_diary/subscriber/design/` 底下的文件

**各種異動紀錄的經驗**
- `/Users/nicholas/Desktop/Projects/prompts/4_diary/subscriber/experence/` 底下的文件

### Skill 檔案位置

```
backend-nestjs/
└── .claude/
    └── commands/
        ├── guideArchitecture.md  # 主要 Skill 定義 ✅ 已建立
        └── guideA.md             # 簡寫別名 ✅ 已建立
```

**實作狀態**：✅ 已完成（2025-01-12）

**檔案路徑**：
- 主要：`/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/guideArchitecture.md`
- 別名：`/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/commands/guideA.md`

**Slash Command**：
- `/guideArchitecture` - 完整名稱
- `/guideA` - 簡寫（自動轉向 /guideArchitecture）

### Skill 內容設計

> **設計說明**：不使用 `@` 語法，因為：
> 1. `@` 只能引用單一檔案，不支援 folder
> 2. `@` 會在 Skill 載入時全部讀取，無法根據參數按需選擇
>
> 改為**指示 AI 主動讀取**對應類別的檔案。

```markdown
---
argument-hint: <category>
description: 載入架構知識 (permission, file, subscriber)
---

## 步驟一：確認類別

如果 $ARGUMENTS 為空，請使用 AskUserQuestion 工具詢問用戶要載入哪個類別：
- permission（權限相關架構經驗）
- file（檔案上傳相關架構經驗）
- subscriber（異動紀錄相關架構經驗）

如果 $ARGUMENTS 有值，直接跳到步驟二。

## 步驟二：根據類別讀取對應知識

### permission（權限架構）

**文件**
- /Users/nicholas/Desktop/Projects/prompts/4_diary/role_and_permission/design/ 底下的文件

**程式**
- /Users/nicholas/Desktop/Projects/backend-nestjs/src/api/adminApi/role/ 底下的程式
- 用到的 entities
- constant.ts

### file（檔案上傳）

**文件**
- /Users/nicholas/Desktop/Projects/prompts/5_workflow/templateFile.md

**程式**
- /Users/nicholas/Desktop/Projects/backend-nestjs/src/common/services/file.service.ts
- /Users/nicholas/Desktop/Projects/backend-nestjs/src/services/s3.service.ts
- /Users/nicholas/Desktop/Projects/backend-nestjs/src/entities/file.entity.ts

### subscriber（異動紀錄）

**subscriber 的實作準則與文件**
- /Users/nicholas/Desktop/Projects/prompts/4_diary/subscriber/design/ 底下的文件

**各種異動紀錄的經驗**
- /Users/nicholas/Desktop/Projects/prompts/4_diary/subscriber/experence/ 底下的文件

---

## 步驟三：總結知識

讀取完成後，請總結學到的知識重點，並在後續開發中依照這些經驗進行。
```

### 擴展性

未來可新增更多子選項：

```
/guideA permission    # 權限
/guideA file          # 檔案上傳
/guideA subscriber    # 異動紀錄
/guideA api           # API 設計（未來）
/guideA database      # 資料庫設計（未來）
```

---

## 結論

對於「跨專案 + 按需載入」的需求，**不使用 Memory**，也**不使用 `@` 語法**，改用 **Skill + 指示 AI 主動讀取**的設計。

### Memory 適合的場景
- 專案內固定需要的基本資訊（專案結構、常用命令）
- 團隊共享且每次都需要的規則

### Skill + 指示 AI 主動讀取適合的場景
- 跨專案共用的開發規則
- 只在特定開發任務前需要載入的內容
- 需要精細控制 token 消耗的情況
- 需要讀取整個資料夾的文件
