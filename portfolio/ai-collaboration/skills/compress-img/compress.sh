#!/usr/bin/env bash
# compress-img — 智慧圖片壓縮
#   PNG  → optipng（無損）
#   JPG  → djpeg | cjpeg -quality N（有損，預設 q80）
# 用法: compress.sh [-q N] [--keep] [--webp] <檔案或資料夾> [更多...]
#   -q N     JPEG 品質（預設 80）
#   --keep   保留原圖，另存 xxx.min.ext（預設：覆寫原檔）
#   --webp   一律轉成 .webp（需 cwebp 或 ffmpeg；原圖保留）
set -euo pipefail

QUALITY=80
KEEP=0
WEBP=0
PATHS=()

while [ $# -gt 0 ]; do
  case "$1" in
    -q|--quality) QUALITY="$2"; shift 2 ;;
    --keep)  KEEP=1; shift ;;
    --webp)  WEBP=1; shift ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    -*) echo "未知參數: $1" >&2; exit 1 ;;
    *)  PATHS+=("$1"); shift ;;
  esac
done

[ ${#PATHS[@]} -eq 0 ] && { echo "用法: compress.sh [-q 80] [--keep] [--webp] <檔案或資料夾>..." >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || { echo "✗ 缺少工具: $1（請 brew install）" >&2; return 1; }; }
fsize() { stat -f%z "$1"; }
kb() { awk "BEGIN{printf \"%.0f\", $1/1024}"; }

# 收集圖片清單（資料夾遞迴找 png/jpg/jpeg）
files=()
for p in "${PATHS[@]}"; do
  if [ -d "$p" ]; then
    while IFS= read -r f; do files+=("$f"); done \
      < <(find "$p" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) ! -iname '*.min.*')
  elif [ -f "$p" ]; then
    files+=("$p")
  else
    echo "略過（不存在）: $p" >&2
  fi
done
[ ${#files[@]} -eq 0 ] && { echo "沒有找到可壓縮的圖片"; exit 0; }

total_before=0; total_after=0; count=0

for f in "${files[@]}"; do
  before=$(fsize "$f")
  ext=$(printf '%s' "${f##*.}" | tr '[:upper:]' '[:lower:]')
  base=$(basename "$f")

  # --webp：不分原格式一律轉 webp，原圖保留
  if [ "$WEBP" -eq 1 ]; then
    out="${f%.*}.webp"
    if command -v cwebp >/dev/null 2>&1; then
      cwebp -quiet -q "$QUALITY" "$f" -o "$out" || { echo "✗ 失敗: $base" >&2; continue; }
    elif command -v ffmpeg >/dev/null 2>&1; then
      ffmpeg -loglevel error -y -i "$f" -quality "$QUALITY" "$out" || { echo "✗ 失敗: $base" >&2; continue; }
    else
      echo "✗ 缺少 cwebp / ffmpeg" >&2; exit 1
    fi
    after=$(fsize "$out")
    pct=$(awk "BEGIN{printf \"%.1f\", (1-$after/$before)*100}")
    printf "✓ %-38s %5sKB -> %5sKB  省 %s%%  -> %s\n" "$base" "$(kb $before)" "$(kb $after)" "$pct" "$(basename "$out")"
    total_before=$((total_before+before)); total_after=$((total_after+after)); count=$((count+1))
    continue
  fi

  tmp="${f}.cmptmp"
  case "$ext" in
    png)
      need optipng || exit 1
      cp "$f" "$tmp"
      optipng -quiet -o2 "$tmp" >/dev/null 2>&1 || true
      ;;
    jpg|jpeg)
      need djpeg || exit 1; need cjpeg || exit 1
      if ! djpeg "$f" 2>/dev/null | cjpeg -quality "$QUALITY" -outfile "$tmp" 2>/dev/null; then
        rm -f "$tmp"; echo "✗ 失敗: $base" >&2; continue
      fi
      ;;
    *)
      echo "略過（非 png/jpg）: $base" >&2; continue ;;
  esac

  after=$(fsize "$tmp")
  # 壓不小就保留原檔，不採用
  if [ "$after" -ge "$before" ]; then
    rm -f "$tmp"
    printf "= %-38s %5sKB（已是最佳，保留原檔）\n" "$base" "$(kb $before)"
    total_before=$((total_before+before)); total_after=$((total_after+before)); count=$((count+1))
    continue
  fi

  if [ "$KEEP" -eq 1 ]; then
    out="${f%.*}.min.${f##*.}"; mv "$tmp" "$out"; dest="-> $(basename "$out")"
  else
    mv "$tmp" "$f"; dest="(覆寫)"
  fi
  pct=$(awk "BEGIN{printf \"%.1f\", (1-$after/$before)*100}")
  printf "✓ %-38s %5sKB -> %5sKB  省 %s%%  %s\n" "$base" "$(kb $before)" "$(kb $after)" "$pct" "$dest"
  total_before=$((total_before+before)); total_after=$((total_after+after)); count=$((count+1))
done

echo "────────────────────────────────────────"
tpct=$(awk "BEGIN{if($total_before>0)printf \"%.1f\", (1-$total_after/$total_before)*100; else print 0}")
printf "共 %d 張：%sKB -> %sKB  省 %s%%\n" "$count" "$(kb $total_before)" "$(kb $total_after)" "$tpct"
