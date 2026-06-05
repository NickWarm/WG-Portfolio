---
argument-hint: <category>
description: 載入架構知識 (permission, file, subscriber)
---

@.claude/flowcharts/guideArchitecture_flowchart.md

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

**架構文件**（優先閱讀）
- /Users/nicholas/Desktop/Projects/prompts/4_diary/file_upload/architecture/file_upload_architecture.md
- /Users/nicholas/Desktop/Projects/prompts/4_diary/file_upload/architecture/file_upload_checklist.md

**學習指南**
- /Users/nicholas/Desktop/Projects/prompts/5_workflow/templateFile.md

**程式**
- /Users/nicholas/Desktop/Projects/backend-nestjs/src/common/services/file.service.ts
- /Users/nicholas/Desktop/Projects/backend-nestjs/src/services/s3.service.ts
- /Users/nicholas/Desktop/Projects/backend-nestjs/src/database/entities/File.ts

### subscriber（異動紀錄）

**subscriber 的實作準則與文件**
- /Users/nicholas/Desktop/Projects/prompts/4_diary/subscriber/design/ 底下的文件

**各種異動紀錄的經驗**
- /Users/nicholas/Desktop/Projects/prompts/4_diary/subscriber/experence/ 底下的文件

---

## 步驟三：總結知識

讀取完成後，請總結學到的知識重點，並在後續開發中依照這些經驗進行。
