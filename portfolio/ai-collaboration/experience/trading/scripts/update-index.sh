#!/bin/bash
# 掃描 youtube-streams 的 audio 和 srt，更新 index.json

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

python3 -c "
import os, json

audio_dir = '$SCRIPT_DIR/audio'
srt_dir = '$SCRIPT_DIR/srt'
index_path = '$SCRIPT_DIR/index.json'

files = sorted([f for f in os.listdir(audio_dir) if f.endswith('.mp3')])
videos = []
for f in files:
    vid_id = f.split(' - ', 1)[0]
    title = f.split(' - ', 1)[1].rsplit('.mp3', 1)[0] if ' - ' in f else f.rsplit('.mp3', 1)[0]
    srt_name = f.rsplit('.mp3', 1)[0] + '.srt'
    srt_exists = os.path.exists(os.path.join(srt_dir, srt_name))
    videos.append({
        'youtube_id': vid_id,
        'title': title,
        'audio': 'audio/' + f,
        'srt': 'srt/' + srt_name if srt_exists else None,
        'status': 'completed' if srt_exists else 'pending'
    })

completed = sum(1 for v in videos if v['status'] == 'completed')
data = {
    'videos': videos,
    'summary': {
        'total': len(videos),
        'completed': completed,
        'pending': len(videos) - completed
    }
}

with open(index_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'索引更新完成：{completed}/{len(videos)} completed, {len(videos) - completed} pending')
"
