# 倒计时背景音资产（TASK-011 / TASK-016）

本目录是「倒计时背景音」5 选 1 的本地打包音频。全部离线可用，运行时不需要联网。

## 清单与出处 / license

TASK-016 起，三段自然录音（雨声/海浪/森林鸟鸣）已删除，替换为三首**本项目自有合成**的轻音乐；连同 `tick` 在内，全部音频均由仓库内脚本程序化生成，**不含任何第三方素材，无版权与署名义务**。

| 文件 | 选项 | 时长 | 大小 | 来源 | License |
|---|---|---|---|---|---|
| `tick.wav` | 滴答 tick | 1s 循环 | 43 KB | 程序化合成（`scripts/audio/generate-ambient-audio.mjs`，纯 JS） | 项目自有（等同 CC0） |
| `morning.wav` | 轻音乐·晨曦 morning | 60s 循环 | 2584 KB | 程序化合成（`scripts/audio/generate-light-music.mjs`，纯 JS） | 项目自有（等同 CC0） |
| `night.wav` | 轻音乐·静夜 night | 60s 循环 | 2584 KB | 程序化合成（`scripts/audio/generate-light-music.mjs`，纯 JS） | 项目自有（等同 CC0） |
| `ethereal.wav` | 轻音乐·空山 ethereal | 60s 循环 | 2584 KB | 程序化合成（`scripts/audio/generate-light-music.mjs`，纯 JS） | 项目自有（等同 CC0） |

> 体积提示：22050 Hz 单声道 16-bit PCM 为 43 KB/秒，60s 约 2.5 MB/首，三首合计约 **7.7 MB**（相对删除的自然音净增约 6.4 MB）。若要严格落到「总增量 <3 MB」，需把合成脚本的 `SAMPLE_RATE` 降到 11025 Hz（约 3.9 MB 总量、净增约 2.7 MB）或缩短单曲时长；三首 60s 与 22050 Hz 无法同时满足 3 MB 预算，已挂账待裁决。

## 处理方式

`scripts/audio/generate-ambient-audio.mjs` 生成 `tick.wav`：确定性 LCG 噪声 + 指数衰减正弦，在 1s 内合成两声短促「滴答」，边界归零，天然无缝。

`scripts/audio/generate-light-music.mjs` 生成三首轻音乐（纯 JS 加法合成，**不需要 ffmpeg、不联网**）：

- 统一输出 **22050 Hz 单声道 16-bit PCM WAV**；
- `morning`：C 大调五声音阶上行 pad + 低八度柔弦层 + C3/G3 持续低音；
- `night`：低音区慢琶音（正弦长衰减）+ 反馈梳状长混响；
- `ethereal`：高音区稀疏钟声（非谐波分音）+ 大音程间隔 + 长混响；
- 每首在 60s 主循环之外多合成 `XFADE_SEC`（2s）尾巴，再以**等功率 crossfade** 折回首部，得到严格 60s 的无缝循环（首尾样值差 < 0.003）；
- 折回后做 **peak 归一化到 −3 dBFS**，避免削波与接缝爆音；音量与 `tick` 相当（选项音量均 0.5）。

重新生成：

```
node scripts/audio/generate-ambient-audio.mjs   # tick.wav
node scripts/audio/generate-light-music.mjs     # morning/night/ethereal.wav
```

两脚本均为确定性合成，重复运行产出相同文件（无需任何外部工具）。

## 旧值向前兼容

`rain` / `waves` / `forest` 已废弃。旧安装落盘的这类值会在设置读取时由 `normalizeAmbientSound` 自动归一为默认的 `tick`，不会让已删除的自然音复活。

## 与 TTS 共存

`expo-audio`（SDK 57，`expo-av` 已废弃故未采用）没有提供 API 级 ducking（压低背景音量）能力，只有 `AudioPlayer.volume` 手动属性。TASK-011 因此采用**直叠**策略：背景音与语音播报各自独立播放、互不打断，计时器不受 TTS 回调影响。

## 播放策略

- 仅在 `RUNNING_STEP` / `RUNNING_TRANSITION` 播放；
- `PAUSED_*`、`COMPLETED`、`STOPPED`、`ERROR`、`PREPARING`、`IDLE` 一律停止；
- 设置项切换即时生效（运行中直接换源）；
- `silent` 不创建、不播放任何播放器实例。
