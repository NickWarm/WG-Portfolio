---
description: 拉取兩個前端專案（dashboard-nuxt、frontend-nuxt）的最新進度
allowed-tools: Bash(git:*)
---

@.claude/flowcharts/pull-frontend_flowchart.md

# Pull Frontend Projects

拉取兩個前端專案的最新 git 進度。

## 專案資訊

| 專案 | 路徑 | 對應後端 |
|------|------|----------|
| dashboard-nuxt | `/Users/nicholas/Desktop/Projects/dashboard-nuxt` | adminApi |
| frontend-nuxt | `/Users/nicholas/Desktop/Projects/frontend-nuxt` | publicApi |

## 執行步驟

### Step 1: Pull dashboard-nuxt

```bash
git -C /Users/nicholas/Desktop/Projects/dashboard-nuxt pull
```

### Step 2: Pull frontend-nuxt

```bash
git -C /Users/nicholas/Desktop/Projects/frontend-nuxt pull
```

## 輸出格式

完成後請輸出：

```
✅ Pull Frontend 完成

| 專案 | 狀態 | 分支 | 更新內容 |
|------|------|------|----------|
| dashboard-nuxt | ✅/❌ | [branch] | [summary] |
| frontend-nuxt | ✅/❌ | [branch] | [summary] |
```

## 索引更新提示

### 判斷邏輯

檢查 git pull 輸出：
- 包含 `Already up to date` → 沒有更新
- 其他情況（如 `Updating xxx..xxx`、檔案變更清單）→ 有更新

### 提示規則

| dashboard-nuxt | frontend-nuxt | 提示內容 |
|----------------|---------------|----------|
| 有更新 | 有更新 | `💡 建議執行 /build-ui-index all` |
| 有更新 | 沒更新 | `💡 建議執行 /build-ui-index dashboard` |
| 沒更新 | 有更新 | `💡 建議執行 /build-ui-index frontend` |
| 沒更新 | 沒更新 | （不顯示提示）|

### 輸出範例

**有更新時**：
```
✅ Pull Frontend 完成

| 專案 | 狀態 | 分支 | 更新內容 |
|------|------|------|----------|
| dashboard-nuxt | ✅ | main | 3 files changed |
| frontend-nuxt | ✅ | main | Already up to date |

💡 建議執行 /build-ui-index dashboard
   → 更新 UI-API 索引以保持 /debugP 查詢準確
```

**都沒更新時**：
```
✅ Pull Frontend 完成

| 專案 | 狀態 | 分支 | 更新內容 |
|------|------|------|----------|
| dashboard-nuxt | ✅ | main | Already up to date |
| frontend-nuxt | ✅ | main | Already up to date |
```
