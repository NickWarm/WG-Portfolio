---
name: pv
description: Play Video — 用 mpv 播放指定影片，可跳到指定時間點。觸發條件：使用者說「播放」「play」「開影片」，或呼叫 /pv。
---

# PV — Play Video

用 mpv 播放影片，支援跳到指定時間點。通用播放器，不限於特定來源。

## 前置條件

- mpv 已安裝（`brew install mpv`，目前版本 v0.41.0）

## 使用方式

### 1. 直接指定影片 + 時間

```
/pv "/path/to/video.mp4" 00:04:32
```

執行：
```bash
mpv --start=00:04:32 "/path/to/video.mp4"
```

若不指定時間，從頭播放：
```bash
mpv "/path/to/video.mp4"
```

### 2. 從 vck 定位文件播放指定片段

```
/pv satisfaction-zone #3
```

流程：
1. 讀取 `docs/strategies/video-clips/local-course/{topic}.md`
2. 找到編號 `#3` 的片段
3. 從該片段的播放指令欄位提取 mpv 指令
4. 執行播放

### 3. 從 vck 定位文件播放（只指定 topic）

```
/pv satisfaction-zone
```

流程：
1. 讀取定位文件
2. 列出所有片段供使用者選擇
3. 使用者指定編號後播放

## 執行流程

### Step 1：解析參數

判斷使用者輸入的是哪種模式：

| 輸入 | 模式 |
|------|------|
| 完整路徑 + 時間 | 直接播放 |
| topic + #編號 | 從 vck 文件查詢播放 |
| topic（無編號） | 列出片段供選擇 |

### Step 2：執行播放

```bash
mpv --start={HH:MM:SS} "{video_path}"
```

- 使用 Bash 工具執行
- mpv 會在背景開啟播放視窗
- 時間格式：`HH:MM:SS`（與 SRT 一致）

## 路徑常數

```
VCK_OUTPUT_DIR = /Users/nicholas/Desktop/Trading/Forex_program/docs/strategies/video-clips/local-course
```

## 注意事項

- 播放前需使用者確認，不可自動播放
- 影片路徑含空格時必須加雙引號
- 若 mpv 未安裝，提示 `brew install mpv`
- `/pv` 是通用播放器，可播放任何本地影片，不限於 vck 的結果
