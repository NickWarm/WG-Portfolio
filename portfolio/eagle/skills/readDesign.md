---
description: 查看 skill 設計規則或讀取特定 skill 的定義檔與流程圖
argument-hint: [skill-name]
design-doc: prompts/4_diary/debug/proposal/slash/readDesign_skill_proposal.md
---

@.claude/flowcharts/readDesign_flowchart.md

## 參數

- `$1`：可選，skill 名稱（如 findDoc、debug）

## 任務

### 無參數模式

顯示以下 Skill 設計規則：

#### 執行環境
- **Claude Code 啟動目錄**: `/Users/nicholas/Desktop/Projects/`
- AI 執行所有 skill 時都是從 Projects 目錄開始
- 設計 skill 時，路徑規劃必須以此為基準

#### 檔案位置規範
| 類型 | 位置 |
|------|------|
| Skill 定義 | `backend-nestjs/.claude/commands/*.md` |
| 流程圖 | `backend-nestjs/.claude/flowcharts/*_flowchart.md` |
| 設計稿 | `prompts/4_diary/debug/proposal/slash/*_skill_proposal.md` |
| Symlink | `Projects/.claude/commands/` → `backend-nestjs/.claude/commands/` |

#### 名詞對照
| 名詞 | 說明 | 範例 |
|------|------|------|
| **定義** | skill 本身，AI 執行的檔案 | `findDoc.md` |
| **流程圖** | 複雜 skill 的執行流程，獨立檔案 | `debug_flowchart.md` |
| **設計稿** | skill 的設計文件，記錄在 `design-doc` | `findDoc_skill_proposal.md` |

#### 流程圖獨立檔案規範

**適用範圍**：複雜 skill（debug、check-result、implement 等）

**命名規則**：
| 類型 | 命名格式 | 範例 |
|------|----------|------|
| 定義檔 | `{skill}.md` | `debug.md` |
| 流程圖 | `{skill}_flowchart.md` | `debug_flowchart.md` |

**檔案關係**：
| 檔案 | 用途 | AI 執行時載入 |
|------|------|--------------|
| `{skill}.md` | 定義檔 | ✅ 必載入 |
| `{skill}_flowchart.md` | 流程圖 | ✅ 透過 @ 引用載入 |
| `*_skill_proposal.md` | 設計稿 | ❌ 用戶要修改 skill 時 AI 自動讀取 |

**定義檔引用流程圖**：
```markdown
@.claude/flowcharts/{skill}_flowchart.md
```

#### 開發流程規範（新建 Skill）
1. **設計稿優先**：所有 skill 必須先有設計稿，才能開始實作
2. **討論階段必須附流程圖**：設計討論時必須提供文字流程圖
3. **設計稿命名**：`{skill_name}_skill_proposal.md`
4. **設計稿審核**：設計稿需經過用戶確認後才能實作
5. **design-doc 標註**：實作完成後，在 skill frontmatter 加上 `design-doc` 欄位

#### 修改流程規範（修改現有 Skill）
1. **討論設計變更**：AI 提出方案（含流程圖）
2. **用戶審核確認**：用戶確認設計變更
3. **更新設計稿**：記錄設計決策到 `*_skill_proposal.md`
   - ⛔ **禁止 commit**（設計稿的 commit 只能由 `/updateDesign` Step 8 執行）
4. **執行 `/updateDesign`**：從未 commit 的設計稿偵測變更，同步更新定義檔 + 流程圖，統一 commit 設計稿

> ⚠️ **重要**：設計稿（`*_skill_proposal.md`）的 commit 只能由 `/updateDesign` Step 8 執行，禁止在其他時機手動 commit。

#### 設計稿標準結構
1. **問題描述** - 為什麼需要這個 skill/功能
2. **執行流程圖** - 有序樹狀格式（必要）
3. **參數說明** - 輸入參數定義
4. **輸出格式** - 預期輸出範例
5. **實作細節** - 技術實作要點

> 📄 模板參考：`prompts/4_diary/debug/proposal/slash/_skill_proposal_template.md`

#### 定義檔結構規範

定義檔建議包含以下區塊（順序）：

1. **Frontmatter** - description、argument-hint、design-doc
2. **模組引用** - `@` 引用需要的模組
3. **參數** - 說明 $1, $2 等參數用途
4. **執行流程** - 樹狀流程圖（整體架構、條件分支）
5. **任務** - 數字列表（詳細執行步驟）

> 💡 **設計經驗**：流程圖讓 AI 一眼看到整體架構，數字列表提供詳細步驟，兩者互補比單獨使用更易理解。

#### 文字流程圖格式（必要）

設計討論和設計稿中必須包含流程圖，使用有序樹狀格式：

```
Skill 執行流程
│
├─ 1. 【階段名稱】
│   ├─ 條件 A → 處理 A
│   └─ 條件 B → 處理 B
│
├─ 2. 【階段名稱】
│   └─ 執行核心邏輯
│
└─ 3. 【最終階段】
    ├─ 成功 → 顯示結果
    └─ 失敗 → 顯示錯誤
```

**禁止格式**：
- ❌ 箭頭式流程圖（↓ 符號連續使用）
- ❌ 純文字段落描述流程

#### design-doc 欄位規範

**用途**：標註 skill 對應的設計稿路徑，供 `/readDesign [skill-name]` 查詢

**格式**：
```yaml
---
description: skill 說明
argument-hint: <參數>
design-doc: prompts/4_diary/debug/proposal/slash/{設計稿檔名}
---
```

**設計原則**：
- 使用相對於 Projects 目錄的路徑
- 純文字路徑，不加 `@` 前綴（不會自動讀取）
- `/readDesign {skill}` 時只記住路徑，不讀取設計稿
- 用戶表達修改 skill 意圖時，AI 自動讀取設計稿進入修改流程

最後提示：`💡 執行 /readDesign [skill-name] 查看定義檔與流程圖`

### 有參數模式（$1 = skill-name）

1. 讀取定義檔：`backend-nestjs/.claude/commands/{skill-name}.md`
2. 從 frontmatter 提取 `design-doc` 路徑（記住但不讀取）
3. 讀取流程圖：`backend-nestjs/.claude/flowcharts/{skill-name}_flowchart.md`（如存在）
4. 顯示定義檔結構 + 流程圖內容
5. 有 design-doc → 提示：`📄 設計稿位於：{路徑}`
6. 無 design-doc → 提示：`❌ {skill-name} 沒有對應的設計稿`

> 💡 設計稿不主動讀取。當用戶表達修改意圖時，AI 自動讀取設計稿進入修改流程。

### 大檔案讀取規則

當用戶表達修改意圖，AI 需要讀取設計稿時：

1. 先用 Bash `wc -l` 確認檔案行數
2. **≤ 2000 行**：直接用 Read 工具讀取
3. **> 2000 行**：分段讀取
   - 第一段：`Read(offset=1, limit=2000)` 讀取前 2000 行
   - 後續段：`Read(offset=2001, limit=2000)` 依序讀取
   - 每段讀完後分析內容，再決定是否需要繼續讀取
   - 如果只需要找特定區塊（如末尾的設計變更記錄），可用 `Grep` 定位行號後精準讀取

> ⚠️ 目前超過 2000 行的設計稿：review（4938 行）、debugP（3759 行）、check-result（2385 行）
