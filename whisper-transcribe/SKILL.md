---
name: whisper-transcribe
description: Local audio/video transcription using faster-whisper. Automatically extracts audio from video/mp3 files and transcribes to Chinese text.
---

# Whisper Transcription Skill

Local audio/video transcription using faster-whisper.

## Quick Start

```bash
# 转录单个音频/视频文件
transcribe /path/to/audio.mp3
transcribe /path/to/video.mp4
```

## Manual Process

### Step 1: Extract Audio

```bash
ffmpeg -i "input.mp3" -vn -acodec pcm_s16le -ar 16000 -ac 1 "output.wav"
```

### Step 2: Transcribe

```python
from faster_whisper import WhisperModel

model = WhisperModel("small", device="cpu", compute_type="int8")
segments, info = model.transcribe(
    "audio.wav",
    language="zh",
    vad_filter=True,
    vad_parameters={"min_silence_duration_ms": 500}
)

with open("output.txt", "w", encoding="utf-8") as f:
    for seg in segments:
        if seg.text.strip():
            f.write(seg.text.strip() + "\n")
            print(seg.text.strip())
```

## Parameters

- **model**: `tiny`, `base`, `small` (default), `medium`, `large`
- **device**: `cpu` (default)
- **compute_type**: `int8` (recommended for memory savings), `float16`, `float32`
- **language**: `zh` for Chinese, `auto` for auto-detect
- **vad_filter**: `True` to filter silence

## Troubleshooting

- **SIGTERM errors**: Use `faster-whisper` instead of whisper CLI
- **Memory issues**: Use `compute_type="int8"`
- **Long audio**: Process in chunks or use smaller model

## Output

- Transcription saved to `/tmp/openclaw/whisper_out/transcription_YYYYMMDD.txt`
- Audio WAV saved to `/tmp/openclaw/whisper_out/audio_YYYY-MM-DD.wav`

## Notes

- faster-whisper is 2-3x faster than whisper CLI
- Install via: `pip install faster-whisper --break-system-packages -q`
- Requires ffmpeg for audio extraction