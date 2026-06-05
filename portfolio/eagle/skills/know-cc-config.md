---
description: 讀取 Projects、backend-nestjs、prompts 專案的 Claude Code 配置
design-doc: prompts/4_diary/debug/proposal/slash/know-cc-config_skill_proposal.md
---

@.claude/flowcharts/know-cc-config_flowchart.md

請閱讀以下配置檔案並提供重點摘要：

## Projects（主工作目錄）
- @/Users/nicholas/Desktop/Projects/.claude/settings.json

## backend-nestjs
- @/Users/nicholas/Desktop/Projects/backend-nestjs/CLAUDE.md
- @/Users/nicholas/Desktop/Projects/backend-nestjs/.claude/settings.json

## prompts
- @/Users/nicholas/Desktop/Projects/prompts/.claude/settings.json

重點關注：
1. 開發流程與規範
2. Hook 系統配置
3. 權限設定（特別注意 Write 權限的差異）
4. 🚫 **prompts 專案禁止使用 git checkout**：不允許使用 git checkout 退掉任何文件檔案，prompts 專案的文件變更應該被保留
