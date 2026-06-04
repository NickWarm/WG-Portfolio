---
name: rwp-prepare
description: 載入交易練習審閱所需的知識資源。觸發條件：使用者說「準備審閱」「prepare review」，或呼叫 /rwp-prepare。
---

# RWP-Prepare — 載入審閱知識基礎

為 `/rwp` 審閱交易練習截圖做準備，載入對應主題的 Eli 交易規則。

## 參數

| 參數 | 必填 | 說明 |
|------|------|------|
| topic | 否 | 指定主題（如 `box-drawing`）。不指定則載入核心資源 |

## 執行流程

### Step 1：載入核心資源（Layer 1）

必讀，不論主題：

```bash
Read docs/strategies/test-cases/INDEX.md
Read docs/strategies/flowcharts/00-main-flow.md
```

### Step 2：RAG 搜尋相關資源（Layer 2）

根據 topic 參數（或使用者描述的場景）搜尋相關段落：

```bash
source ~/.nvm/nvm.sh && nvm use default
MODEL_NAME=onnx-community/embeddinggemma-300m-ONNX \
npx -y mcp-local-rag query "{topic 相關關鍵字}" --limit 5
```

範例查詢：
- topic=box-drawing → query "畫框怎麼畫 盤整震盪"
- topic=breakout → query "破框三條件 站穩回測"
- topic=entry → query "進場時機 賺賠比 B型態"
- topic=exit → query "出場SOP TP1 保力"

### Step 3：精確載入（Layer 3）

根據 RAG 命中的檔案，讀取完整文件：

```
RAG 命中 test-cases/02-box-drawing.md → Read 該檔（正確/錯誤範例）
RAG 命中 concept-docs/box-drawing.md → Read 該檔（圖文參考）
RAG 命中 flowcharts/.../02-box-drawing.md → Read 該檔（演算法邏輯）
```

只讀 RAG 指向的檔案，不讀無關的。

### Step 4：輸出確認

```markdown
✅ rwp-prepare 完成

已載入知識：
- 主題：{topic}
- test-cases：{N} 正確 + {M} 錯誤範例
- flowchart：{子流程名稱}
- RAG 命中：{命中的檔案清單}

可以開始 /rwp 審閱了。請提供截圖。
```

## 注意事項

- 每次 prepare 只載入一個主題（節省 context）
- 如果不指定 topic，讀核心資源後等使用者提供截圖再用 RAG 搜尋
- RAG 索引需已建立（`mcp-local-rag ingest` 已跑過）
- 同一 session 內只需 prepare 一次，審閱多張截圖不需重複
