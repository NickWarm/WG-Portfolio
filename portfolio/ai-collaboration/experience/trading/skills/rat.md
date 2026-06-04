---
description: Research And Think — 搜尋 WG-SOP 研究文件索引，快速定位已研究過的主題
---

## 固定路徑

- 索引：`Forex_program/pinescript/indicators/wg-sop/debug/INDEX.md`
- 文件目錄：`Forex_program/pinescript/indicators/wg-sop/debug/`

## 任務

根據使用者的關鍵字，在索引中找到相關文件並回報。

### 步驟

1. 讀 `debug/INDEX.md`（索引檔，~100 行）
2. 比對使用者的關鍵字（中/英文皆可），找出相關文件
3. 回報：文件名、說明、狀態
4. 如果使用者要求深入某個文件，才去讀該文件內容

### 如果找不到

- 回報「索引中無相關主題」
- 建議使用者是否要新建研究文件

## 維護規則

當新增研究文件到 `debug/` 時，同步更新 `INDEX.md`：
- 判斷屬於哪個分類（盤整偵測 / 突破 / MTF / 功能提案 / 設計決策 / 版本問題 / Sim 腳本）
- 加一行到對應表格
- .md 文件標狀態（✅ / 🔬 / 📋 / ⏸），.mjs 文件標對應功能

## 使用情境

- `/rat 盤整` → 列出所有盤整相關研究
- `/rat SAZ` → 找 SAZ-OB 提案
- `/rat 突破` → 找突破相關文件
- 對話中提到研究主題時，先查索引再決定是否需要讀文件
