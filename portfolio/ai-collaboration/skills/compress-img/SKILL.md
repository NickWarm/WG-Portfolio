---
name: compress-img
description: 智慧壓縮本地圖片。依副檔名自動路由：PNG 走 optipng 無損、JPG 走 djpeg|cjpeg 有損（預設 q80），預設覆寫原檔。可吃單檔或整個資料夾（遞迴）。觸發：使用者給圖片/資料夾路徑並提到「壓縮圖片」「compress」「optipng」「圖片太大」「縮圖檔」。
allowed-tools: Bash, Read
---

# compress-img — 智慧圖片壓縮

依副檔名自動選工具，使用者不用再煩惱「這張是 JPG 還是 PNG、該用哪個工具」。

| 格式 | 工具 | 模式 |
| ---- | ---- | ---- |
| PNG | `optipng -o2` | 無損 |
| JPG / JPEG | `djpeg \| cjpeg -quality N` | 有損（預設 q80） |
| `--webp` | `cwebp`（無則 `ffmpeg`） | 轉檔，原圖保留 |

> ⚠️ `optipng` 只能處理 PNG，不能直接壓 JPG；`cjpeg` 不能直接讀 JPEG，需先 `djpeg` 解碼。
> 本 skill 已封裝這條路由，直接呼叫腳本即可，不要手動拆。

## 用法

```bash
bash ~/.claude/skills/compress-img/compress.sh [-q N] [--keep] [--webp] <檔案或資料夾>...
```

- `-q N` JPEG 品質（預設 80；要更小可 70）
- `--keep` 保留原圖，另存 `xxx.min.ext`（預設行為是**覆寫原檔**）
- `--webp` 一律轉 `.webp`（原圖保留；需改 Markdown 引用副檔名）
- 給資料夾 → 遞迴找所有 `png/jpg/jpeg`（自動跳過已存在的 `*.min.*`）

腳本會逐檔印出前後大小與節省比例，最後給總計；壓不小的檔案會自動保留原檔。

## 範例

```bash
# 壓單一資料夾所有圖片（覆寫）
bash ~/.claude/skills/compress-img/compress.sh portfolio/imgs/Trading

# 壓兩張、保留原圖
bash ~/.claude/skills/compress-img/compress.sh --keep a.jpg b.png

# 更激進品質 + 轉 webp
bash ~/.claude/skills/compress-img/compress.sh -q 70 --webp hero.jpg
```

## 注意

- **預設覆寫原檔**：適合圖片已在 git 版控（可 `git checkout` 還原）。不確定時加 `--keep`。
- 真實檔案位於本 repo `portfolio/ai-collaboration/skills/compress-img/`，靠 symlink
  掛到 `~/.claude/skills/`。**編輯一律改 repo 真實路徑**，不要走 `~/.claude`（會踩 .claude 自我保護權限）。
- 依賴：`optipng`、`djpeg`、`cjpeg`（mozjpeg/jpeg-turbo，`brew install mozjpeg jpeg-turbo optipng`）。
