#!/bin/bash
# 批次生成 YouTube 直播音訊的 SRT 逐字稿
# 用法：
#   ./generate-srt.sh                              # 跑所有音訊
#   ./generate-srt.sh "音訊1.mp3" "音訊2.mp3" ...   # 跑指定音訊

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUDIO_DIR="$SCRIPT_DIR/audio"
SRT_DIR="$SCRIPT_DIR/srt"
MODEL="mlx-community/whisper-medium-mlx"
WHISPER="$HOME/Library/Python/3.9/bin/mlx_whisper"

mkdir -p "$SRT_DIR"

transcribe() {
    local file="$1"
    local basename="$(basename "$file" .mp3)"
    local output="$SRT_DIR/$basename.srt"

    if [ -f "$output" ]; then
        echo "[跳過] 已存在: $basename.srt"
        return
    fi

    echo "[處理中] $basename"
    "$WHISPER" "$file" \
        --language zh \
        --model "$MODEL" \
        --output-format srt \
        --output-dir "$SRT_DIR" \
        2>&1 | tail -1

    # mlx-whisper 可能改檔名，找到實際輸出並 rename
    if [ ! -f "$output" ]; then
        local whisper_name="$(basename "$file")"
        whisper_name="${whisper_name%.*}"   # 去掉 .mp3
        whisper_name="${whisper_name%.*}"   # mlx-whisper 可能再去掉一層
        local actual="$SRT_DIR/$whisper_name.srt"
        if [ -f "$actual" ]; then
            mv "$actual" "$output"
        fi
    fi

    echo "[完成] $basename.srt"
    echo "---"
}

if [ $# -gt 0 ]; then
    for arg in "$@"; do
        transcribe "$arg"
    done
else
    find "$AUDIO_DIR" -name "*.mp3" -type f | sort | while IFS= read -r file; do
        transcribe "$file"
    done
fi

echo "全部完成！"
echo "SRT 檔案數：$(ls "$SRT_DIR"/*.srt 2>/dev/null | wc -l)"

# 自動更新索引
"$SCRIPT_DIR/update-index.sh"
