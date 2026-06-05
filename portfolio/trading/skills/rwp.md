---
name: rwp
description: 審閱交易練習截圖，判斷操作對錯並給出改進建議。觸發條件：使用者說「審閱」「review」「幫我看這張」，或呼叫 /rwp。
---

# RWP — Review Practice（交易練習審閱）

審閱交易練習截圖（TradingView 或 AI 標記圖），比對 Eli 交易規則，判斷操作對錯。

## 前提

- 同一 session 內已執行過 `/rwp-prepare`（或本次直接帶截圖，會自動 prepare）

## 參數

| 參數 | 必填 | 說明 |
|------|------|------|
| 截圖路徑 | 是 | 使用者提供的截圖檔案路徑 |
| 規劃描述 | 否 | 文字說明交易規劃（如「黃金 15M 偏多，等回測 3350 進場」） |
| 審閱重點 | 否 | 如「幫我看框畫得對不對」或「賺賠比夠嗎」 |

## 執行流程

### Step 1：讀取截圖

用 Read 工具讀取截圖，辨識：
- 商品名稱和時區
- 畫的框（矩形範圍、位置）
- 標記的進出場點、停損停利
- 指標設定（如有）
- K 棒結構、趨勢方向

### Step 2：判斷截圖主題

根據截圖內容判斷涉及哪些流程節點：

| 截圖內容 | 對應主題 |
|---------|---------|
| 畫框 | box-drawing |
| 首K 方向 | opening-k |
| PLT 趨勢 | trend-bias |
| 破框進場 | breakout-outside |
| 框內操作 | inside-box |
| 逆勢單 | counter-trend |
| 框邊等待 | box-edge-wait |
| 分批進場 | scaling-in |
| 風控停損 | risk-control |
| 滿足區 | satisfaction-zone |
| 出場 | exit-sop |

### Step 3：RAG 搜尋規則（如尚未 prepare）

如果本 session 尚未執行 /rwp-prepare，用 RAG 搜尋相關規則：

```bash
source ~/.nvm/nvm.sh && nvm use default
MODEL_NAME=onnx-community/embeddinggemma-300m-ONNX \
npx -y mcp-local-rag query "{截圖主題相關關鍵字}" --limit 5
```

根據 RAG 結果讀取對應的 test-cases 完整文件。

### Step 4：比對規則

逐項檢查截圖內容 vs Eli 規則：

1. **比對正確範例**：截圖的操作是否符合 test-cases 中的「正確範例」
2. **比對錯誤範例**：截圖是否踩到 test-cases 中的「錯誤範例」
3. **檢查流程圖邏輯**：操作順序是否符合 flowchart 的 SOP
4. **跨子流程檢查**：是否遺漏了相關子流程（如畫框後沒算賺賠比）

### Step 5：輸出審閱報告

結構化輸出：

```markdown
## 交易規劃審閱

**商品/時區**：{商品} {時區}
**截圖主題**：{判斷出的主題}

### ✅ 正確的部分
- {具體描述} — 符合 {引用 test-case 正確範例 #N}

### ❌ 需要改進
- {具體描述} — 踩到 {引用 test-case 錯誤範例 #N}
- 建議：{具體改進方式}

### ⚠️ 建議
- {不是錯但可以更好的地方}

### 📎 參考
- {相關 test-case 檔案}
- {相關 flowchart 節點}
```

## 注意事項

- Claude 的圖片理解有限，複雜圖表可能看不清 → 使用者應附文字描述補充
- 審閱結果基於 Eli 教學標準，不是交易建議
- 如果截圖太模糊或無法辨識，請使用者重新截圖並放大
- NLM 查詢只在 test-cases 無法判斷的邊界情況使用（節省每日 50 次額度）
- 同一 session 可連續審閱多張截圖，不需重複 prepare

## 適用來源

本 command 是通用圖片審閱器，不區分截圖來源：
- **你的練習**：TradingView 截圖
- **Visual TDD Session C**：AI 用 PIL 標記的回放截圖
- 審閱邏輯完全相同
