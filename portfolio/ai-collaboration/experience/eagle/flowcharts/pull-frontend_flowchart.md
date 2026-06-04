# pull-frontend 執行流程

```
/pull-frontend 執行流程
│
├─ 1. 【Pull dashboard-nuxt】
│   └─ git -C dashboard-nuxt pull
│
├─ 2. 【Pull frontend-nuxt】
│   └─ git -C frontend-nuxt pull
│
├─ 3. 【判斷更新狀態】
│   ├─ Already up to date → 沒有更新
│   └─ Updating / 檔案變更 → 有更新
│
└─ 4. 【輸出結果 + 索引提示】
    │
    ├─ 兩者都有更新 → /build-ui-index all
    ├─ 只有 dashboard 更新 → /build-ui-index dashboard
    ├─ 只有 frontend 更新 → /build-ui-index frontend
    └─ 都沒更新 → 不顯示提示
```

## 專案對應表

| 前端專案 | 後端 API |
|----------|----------|
| dashboard-nuxt | adminApi |
| frontend-nuxt | publicApi |
