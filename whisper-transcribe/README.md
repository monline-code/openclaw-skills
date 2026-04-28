# Whisper 转录技能

基于 faster-whisper 的本地音频/视频转录技能。自动从视频/MP3 文件中提取音频并转录为中文文本。

## 概述

该技能提供了一个便捷的命令 `transcribe`，使用 faster-whisper 库将音频或视频文件转换为文本转录。转录过程完全在本地进行，不需要任何外部 API 密钥。

## 特点

- 通过 ffmpeg 从常见媒体格式中提取音频
- 使用 faster-whisper 进行高效转录（比原始 whisper 快 2-3 倍）
- 支持多种模型大小：tiny、base、small（默认）、medium、large
- 可配置的计算类型（int8 以节省内存）
- 语言指定（zh 表示中文，auto 表示自动检测）
- 语音活动检测（VAD）以过滤静音
- 输出转录文本和提取的 WAV 音频
- 包含通过 OpenCC（如果已安装）自动转换为简体中文的功能

## 安装

该技能已在此 OpenClaw 环境中安装。`transcribe` 命令可全局使用。

依赖项：
- faster-whisper
- ffmpeg（用于音频提取）
- opencc-python-reimplemented（可选，用于简体中文转换）

## 使用方法

### 基础转录

```bash
transcribe /path/to/audio.mp3
transcribe /path/to/video.mp4
```

### 指定输出文件

```bash
transcribe /path/to/input.mp3 /path/to/output.txt
```

如果未提供输出文件，转录将保存至：
```
/tmp/openclaw/whisper_out/transcription_YYYYMMDD.txt
```

提取的 WAV 音频将保存至：
```
/tmp/openclaw/whisper_out/audio_YYYY-MM-DD.wav
```

### 内部原理

位于 `/root/.agents/skills/whisper-transcribe/transcribe.sh` 的 `transcribe` 脚本执行以下步骤：

1. 音频提取：`ffmpeg -i input -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav`
2. 使用 faster-whisper 按指定参数进行转录
3. 如果可用，通过 OpenCC（t2s）进行可选的简体中文转换
4. 将结果写入指定的输出文件

## 配置

您可以通过编辑脚本来修改默认行为：
- 模型：在 Python 块中将 `"small"` 更改为 `"tiny"`、`"base"`、`"medium"` 或 `"large"`
- 计算类型：调整 `compute_type`（例如 `"float16"`、`"float32"`）
- VAD 参数：调整 `model.transcribe` 调用中的 `vad_parameters`
- 语言：将 `language="zh"` 更改为其他语言代码或 `"auto"`

## 示例输出

运行 `transcribe lecture.mp3` 后，您可能会得到类似以下内容：

```
大家好，欢迎参加今天的讲座。
首先，我们来介绍一下今天的议程。
...
```

## 注意事项

- 所使用的 Whisper 模型默认输出繁体中文。如果已安装 opencc-python-reimplemented，转录将自动转换为简体中文。
- 对于较长的音频文件，建议使用较小的模型（tiny/base）以降低内存占用并提高速度。
- 该技能专为本地离线使用设计，安装后不需要网络连接。

## 故障排查

- **SIGTERM / 超时错误**：尝试使用较小的模型或将音频分块处理。
- **内存错误**：将 `compute_type` 设置为 `"int8"` 以减少内存占用。
- **找不到 OpenCC**：使用 `pip install opencc-python-reimplemented --break-system-packages` 安装以启用简体中文转换，否则技能将回退到繁体中文输出。
- **找不到 ffmpeg**：请确保 ffmpeg 已安装并在您的 PATH 中。

## 许可证

此技能作为 OpenClaw 技能集合的一部分提供。
