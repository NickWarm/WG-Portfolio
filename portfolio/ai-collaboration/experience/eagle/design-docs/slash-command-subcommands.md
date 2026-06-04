# Claude Code Slash Command 子選項設計研究

> 日期：2026-01-08

## 問題起源

在使用 Claude Code 時，注意到 `/status` 這個 slash command 有子項目，而且子項目底下也有選項可以選。好奇這是怎麼做到的？

---

## 研究結果

### `/status` 的真相

`/status` 是 Claude Code 的**內建命令**，它開啟的是 Settings 介面的標籤頁。看到的「子項目」其實是 **UI 元素**，不是真正的子命令系統。

**結論：Claude Code 目前沒有原生的巢狀子命令 (nested subcommands) 系統。**

---

## `/status` 的互動式 Tab 切換是怎麼做的？

### 問題

`/status` 顯示的介面可以用左右方向鍵或 Tab 來切換標籤頁：

```
Settings:  Status   Config   Usage (←/→ or tab to cycle)
```

這是怎麼實現的？

### 答案：Ink 框架

Claude Code 使用 **[Ink](https://github.com/vadimdemedes/ink)**，這是一個「React for Terminal」的框架。

**核心概念：**
- Ink 把 React 組件渲染到終端，而不是瀏覽器
- 用 React 的方式寫 CLI 介面

**技術棧：**
- **Ink** - React for interactive command-line apps
- **React** - 組件化 UI 管理
- **Yoga** - Flexbox 佈局引擎

### Tab 切換的實現原理

```typescript
import { useState } from 'react';
import { useFocus, useInput } from 'ink';

const TabNavigator = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Status', 'Config', 'Usage'];

  useInput((input, key) => {
    if (key.leftArrow || (key.tab && key.shift)) {
      setActiveTab(prev => Math.max(0, prev - 1));  // 上一個
    }
    if (key.rightArrow || key.tab) {
      setActiveTab(prev => Math.min(tabs.length - 1, prev + 1));  // 下一個
    }
  });

  return <TabBar active={activeTab} tabs={tabs} />;
};
```

**核心 Hooks：**

| Hook | 用途 |
|------|------|
| `useInput` | 捕獲鍵盤輸入（方向鍵、Tab、Shift+Tab） |
| `useFocus` | 管理焦點狀態 |

**可偵測的按鍵：**
- `key.leftArrow` - 左方向鍵
- `key.rightArrow` - 右方向鍵
- `key.tab` - Tab 鍵
- `key.shift` - Shift 修飾鍵

### Config 選項列表的實現原理

Config 標籤頁裡的選項列表也是用 Ink 實現的：

```
Configure Claude Code preferences

❯ Auto-compact                              true
  Show tips                                 true
  Thinking mode                             true
  Prompt suggestions                        true
  ...
```

這是 Ink 的 **SelectInput** 組件模式：

```typescript
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';

const ConfigMenu = () => {
  const [cursor, setCursor] = useState(0);
  const [items, setItems] = useState([
    { label: 'Auto-compact', value: true },
    { label: 'Show tips', value: true },
    { label: 'Thinking mode', value: true },
    { label: 'Verbose output', value: false },
    // ...
  ]);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setCursor(prev => Math.min(items.length - 1, prev + 1));
    }
    if (key.return) {
      // 切換選項值（boolean toggle）
      setItems(prev => prev.map((item, i) =>
        i === cursor ? { ...item, value: !item.value } : item
      ));
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Box key={i}>
          <Text>{i === cursor ? '❯ ' : '  '}</Text>
          <Text>{item.label.padEnd(40)}</Text>
          <Text color={item.value ? 'green' : 'gray'}>
            {String(item.value)}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
```

### Ink 提供的 UI 組件模式

| 模式 | 用途 | 按鍵 |
|------|------|------|
| **Tabs** | 標籤頁切換 | ←/→ 或 Tab |
| **SelectInput** | 單選列表 | ↑/↓ 選擇，Enter 確認 |
| **MultiSelect** | 多選列表 | ↑/↓ 選擇，Space 勾選 |
| **TextInput** | 文字輸入框 | 打字輸入 |
| **Spinner** | 載入動畫 | 自動播放 |

整個 `/status` 介面的組成：
- **外層 Tabs**（Status / Config / Usage）→ Tab 切換組件
- **Config 裡的選項列表** → SelectInput 組件
- **每個選項的 toggle** → boolean 切換邏輯

全部都是 Ink + React 組件化的實作。

### 自定義 Slash Command 可以用 Ink 嗎？

**目前不行。**

自定義 slash command 只能寫 Markdown prompt，無法直接使用 Ink 的互動式 UI。這是 Claude Code **內建功能專屬**的實作方式。

### 技術限制詳解

| 功能 | 內建命令（如 /status） | 自定義 Skill |
|------|------------------------|--------------|
| 互動式選單 | ✅ 可用（Ink 框架） | ❌ 不可用 |
| Tab 切換介面 | ✅ 可用 | ❌ 不可用 |
| 參數傳遞 | ✅ | ✅ |
| Markdown prompt | ✅ | ✅ |

**根本原因**：
- 自定義 slash command **只能是 Markdown 文件**
- 無法執行 JavaScript/TypeScript 代碼
- 無法使用 Ink 框架建立互動式 UI
- 這是 Claude Code 架構的限制，不是設計選擇

### 折衷方案：使用 AskUserQuestion 模擬選項介面

雖然無法使用 Ink 的原生互動式選單，但可以透過 **AskUserQuestion 工具**達到類似效果：

**設計方式**：當用戶輸入 `/command` 無參數時，AI 使用 AskUserQuestion 顯示選項

```markdown
---
argument-hint: <category>
description: 載入架構知識 (permission, file, subscriber)
---

如果 $ARGUMENTS 為空，請使用 AskUserQuestion 工具詢問用戶要載入哪個類別：
- permission（權限架構）
- file（檔案上傳）
- subscriber（異動紀錄）

如果 $ARGUMENTS 有值，直接根據指定類別執行對應操作。
```

**效果**：
- 用戶輸入 `/guideA` → Claude Code 顯示選項讓用戶點選
- 用戶輸入 `/guideA permission` → 直接執行，不顯示選項

**限制**：
- 不是原生的 Tab/Arrow 切換介面
- 需要額外的 AI 回合來處理選項
- 但能達到「點選後有選項」的使用體驗

### 社群替代方案

如果真的需要互動式 TUI，可以參考這些社群工具：

| 工具 | 說明 |
|------|------|
| [ccstatusline](https://github.com/sirmalloc/ccstatusline) | 用 React/Ink 建構的自訂狀態列 |
| [claude-slash](https://github.com/jeremyeder/claude-slash) | 提供 menuconfig 風格的 TUI 界面 |

**注意**：這些是**外部工具**，不是 Claude Code 內建的 slash command 系統。需要額外安裝和配置。

---

## 自定義 Slash Commands 可用的設計方式

### 方法一：目錄結構分類（命名空間）

透過目錄結構來組織命令，達到視覺上的分類效果：

```
.claude/commands/
├── optimize.md              # /optimize
├── frontend/
│   └── component.md         # /component (顯示為 project:frontend)
└── backend/
    └── deploy.md            # /deploy (顯示為 project:backend)
```

**注意事項：**
- 子目錄只影響命令的**描述顯示**，不影響命令名稱
- `.claude/commands/frontend/component.md` 建立的是 `/component` 命令
- 如果不同子目錄有同名檔案，會產生多個同名命令（以命名空間區分）

---

### 方法二：參數傳遞

在 `.md` 文件中使用 frontmatter 定義參數：

```markdown
---
argument-hint: [action] [target] [options]
description: 執行特定操作
---

執行 $1 操作，目標為 $2，選項為 $3
```

**使用方式：**
```
/my-command build frontend --verbose
```

**支援的 Frontmatter 配置：**

| 配置項 | 用途 | 預設值 |
|--------|------|--------|
| `allowed-tools` | 指定命令可使用的工具 | 繼承自對話 |
| `argument-hint` | 顯示期望的參數 | 無 |
| `description` | 命令描述 | 使用提示的第一行 |
| `model` | 使用特定 AI 模型 | 繼承自對話 |
| `disable-model-invocation` | 禁止 SlashCommand 工具調用 | false |

---

### 方法三：MCP 伺服器（進階）

如果需要真正的子命令系統，可以透過 MCP (Model Context Protocol) 伺服器實現：

```
/mcp__<server-name>__<prompt-name> [arguments]
```

**範例：**
```
/mcp__github__list_prs
/mcp__github__pr_review 456
/mcp__github__merge_pr 456 --squash
```

MCP 伺服器可以動態暴露多個命令和提示，提供更靈活的子命令結構。

---

## 命令存放位置

| 類型 | 路徑 |
|------|------|
| 專案命令 | `.claude/commands/` |
| 個人命令 | `~/.claude/commands/` |

---

## 完整範例

### 帶參數的 Git Commit 命令

```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
argument-hint: [message]
description: Create a git commit
model: claude-3-5-haiku-20241022
---

Create a git commit with message: $ARGUMENTS

## Additional instructions
- Follow conventional commit format
- Reference issue numbers in commit message
```

### 模擬子命令效果的設計模式

如果想模擬「子命令」的使用體驗，可以這樣設計：

```markdown
---
argument-hint: <subcommand> [options]
description: 專案管理工具 (subcommands: init, build, deploy, test)
---

根據子命令執行對應操作：

## 可用子命令
- `init`: 初始化專案
- `build`: 建置專案
- `deploy`: 部署到指定環境
- `test`: 執行測試

使用者輸入的子命令：$1
額外選項：$2
```

**使用方式：**
```
/project init
/project build --production
/project deploy staging
```

---

## 設計建議

1. **簡單需求**：使用目錄結構 + 參數傳遞
2. **複雜需求**：考慮 MCP 伺服器
3. **模擬子命令**：在 prompt 中定義子命令邏輯，讓 AI 根據第一個參數決定行為

---

## 參考資料

### Claude Code 官方文檔
- [Claude Code Settings](https://code.claude.com/docs/en/settings.md)
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide.md)
- [Slash Commands](https://code.claude.com/docs/en/slash-commands.md)
- [Interactive Mode](https://code.claude.com/docs/en/interactive-mode.md)

### Ink 終端 UI 框架
- [Ink - React for CLI](https://github.com/vadimdemedes/ink)
- [Ink UI 組件庫](https://github.com/vadimdemedes/ink-ui)
- [Ink v3 Advanced UI Components](https://developerlife.com/2021/11/25/ink-v3-advanced-ui-components/)

### 社群工具
- [ccstatusline](https://github.com/sirmalloc/ccstatusline) - 自訂狀態列
- [claude-slash](https://github.com/jeremyeder/claude-slash) - 互動式 slash commands
