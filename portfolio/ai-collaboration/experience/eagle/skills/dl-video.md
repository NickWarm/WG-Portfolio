---
description: 下載 HLS/DASH 串流影片到 EliForex 資料夾
allowed-tools: Bash(yt-dlp:*), Bash(ls:*), Bash(which:*)
---

# Download Streaming Video

使用 yt-dlp 平行下載 HLS (.m3u8) 或 DASH (.mpd) 串流影片。

## 使用方式

```
/dl-video <m3u8 或 mpd URL> [檔名]
```

- `URL`：必填，從瀏覽器 DevTools Network 取得的 `.m3u8` 或 `.mpd` URL
- `檔名`：選填，不含副檔名。未指定時使用 `video_YYYYMMDD_HHmmss`

## 輸出路徑

```
~/Desktop/EliForex/
```

## 執行步驟

### Step 1: 檢查 yt-dlp

確認 yt-dlp 已安裝：
```bash
which yt-dlp
```
如果沒有，提示用戶執行 `brew install yt-dlp`，**不要自動安裝**。

### Step 2: 解析參數

從 $ARGUMENTS 解析：
1. 找出 URL（包含 `.m3u8` 或 `.mpd` 的字串）
2. 剩餘部分作為檔名（去除空白和特殊字元）
3. 若無指定檔名，使用 `video_YYYYMMDD_HHmmss` 格式

### Step 3: 判斷協定

| URL 包含 | 協定 |
|----------|------|
| `.m3u8`  | HLS  |
| `.mpd`   | DASH |

### Step 4: 執行下載（含 Fallback 機制）

使用 yt-dlp 下載，**帶完整 Headers 避免 403 + 平行下載加速**。

依序嘗試以下 3 種 domain 組合，第一個成功就停止：

| 順序 | Referer / Origin | 範例（skool.com） |
|------|-----------------|-------------------|
| 1st | `https://www.{主域名}/` | `https://www.skool.com/` |
| 2nd | `https://{主域名}/` | `https://skool.com/` |
| 3rd | `https://{完整子域名}/` | `https://stream.video.skool.com/` |

**每次嘗試的指令模板**：

```bash
yt-dlp \
  --concurrent-fragments 5 \
  --referer 'https://{嘗試的domain}/' \
  --add-header 'Origin: https://{嘗試的domain}' \
  --add-header 'Sec-Fetch-Dest: empty' \
  --add-header 'Sec-Fetch-Mode: cors' \
  --add-header 'Sec-Fetch-Site: same-site' \
  --user-agent 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<SERVER_IP> Safari/537.36' \
  -o ~/Desktop/EliForex/{檔名}.mp4 \
  '{URL}'
```

**Fallback 執行規則**：
1. 從 URL 提取主域名（CDN 子域 `stream`、`cdn`、`video`、`manifest`、`chunk` 等取上層）
2. 第 1 次：用 `www.{主域名}` 嘗試
3. 若 403 或失敗 → 第 2 次：用 `{主域名}`（不帶 www）嘗試
4. 若仍失敗 → 第 3 次：用 URL 的完整原始 domain 嘗試
5. 3 次都失敗 → 報告錯誤，進入失敗輸出格式
6. **每次重試前不需要詢問用戶，直接執行**

**Headers 規則**：
- 必須帶完整 CORS headers（`Sec-Fetch-Dest`、`Sec-Fetch-Mode`、`Sec-Fetch-Site`），否則部分站台會 403
- `User-Agent` 固定使用 Chrome

### Step 5: 驗證結果

下載完成後檢查檔案：
```bash
ls -lh ~/Desktop/EliForex/{檔名}.mp4
```

## 輸出格式

### 成功

```
✅ 影片下載完成

📁 路徑：~/Desktop/EliForex/{檔名}.mp4
📦 大小：{size}
🔗 協定：HLS / DASH
```

### 失敗

```
❌ 下載失敗

🔗 URL：{URL}
💥 錯誤：{error message}

可能原因：
- Token 已過期（重新從 DevTools 複製 URL）
- 需要登入才能存取（確認瀏覽器已登入）
- DRM 加密內容（無法下載）
```
