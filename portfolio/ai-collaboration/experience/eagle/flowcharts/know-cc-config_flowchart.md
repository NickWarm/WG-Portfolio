# know-cc-config 執行流程

```
/know-cc-config 執行流程
│
├─ 1. 【讀取 Projects 配置】
│   └─ Projects/.claude/settings.json
│
├─ 2. 【讀取 backend-nestjs 配置】
│   ├─ CLAUDE.md
│   └─ .claude/settings.json
│
├─ 3. 【讀取 prompts 配置】
│   └─ prompts/.claude/settings.json
│
└─ 4. 【輸出重點摘要】
    ├─ 開發流程與規範
    ├─ Hook 系統配置
    ├─ 權限設定差異
    └─ 🚫 prompts 禁止 git checkout
```

## 重點關注

| 項目 | 說明 |
|------|------|
| 開發流程 | 各專案的工作規範 |
| Hook 系統 | PostToolUse、PreToolUse 配置 |
| 權限設定 | Write 權限的差異 |
| 特殊限制 | prompts 專案禁止 git checkout |
