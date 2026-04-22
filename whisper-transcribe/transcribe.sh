#!/bin/bash
# Whisper转录工具 - 用法: transcribe <音频文件> [输出文件]
# 示例: transcribe /home/guo/Videos/xxx.mp3

AUDIO_FILE="$1"
OUTPUT_FILE="${2:-/tmp/openclaw/whisper_out/transcription_$(date +%Y%m%d).txt}"
WORK_DIR="/tmp/openclaw/whisper_out"

mkdir -p "$WORK_DIR"

if [ -z "$AUDIO_FILE" ]; then
    echo "用法: transcribe <音频/视频文件> [输出文件]"
    echo "示例: transcribe /home/guo/Videos/xxx.mp3"
    exit 1
fi

echo "开始转录: $AUDIO_FILE"

# 提取音频
AUDIO_WAV="$WORK_DIR/audio_$(date +%Y-%m%d_%H%M%S).wav"
ffmpeg -i "$AUDIO_FILE" -vn -acodec pcm_s16le -ar 16000 -ac 1 "$AUDIO_WAV" -y 2>/dev/null

echo "音频已提取: $AUDIO_WAV"
echo "转录中..."

# 转录
python3 << PYEOF
import sys
from faster_whisper import WhisperModel

model = WhisperModel("small", device="cpu", compute_type="int8")
segments, info = model.transcribe("$AUDIO_WAV", language="zh", vad_filter=True)

with open("$OUTPUT_FILE", "w", encoding="utf-8") as f:
    count = 0
    for seg in segments:
        if seg.text.strip():
            f.write(seg.text.strip() + "\n")
            count += 1
print(f"转录完成: {count} 行")
print(f"输出: $OUTPUT_FILE")
PYEOF

echo "✅ 完成"
