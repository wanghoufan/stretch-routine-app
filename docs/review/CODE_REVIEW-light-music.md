# CODE REVIEW

- Task: TASK-016（轻音乐替换自然音：silent/tick/morning/night/ethereal）
- Commit: hardening/v1.1 工作区未提交（`git diff HEAD`：ambient 相关已改 SettingsScreen/settingsModel；新增未追踪 assets/audio/*.wav、scripts/audio/、src/services/audio/、src/features/settings/ambientSound.ts 及 ambient 测试）
- Reviewer: code-reviewer（只给意见不改代码）
- Result: 过（P0=0；体积事项按 TM 批准执行，不作打回）

## P0 / P1 Findings

- 无 P0。
- P1-1（体积备注，非阻塞）：`assets/audio/` 实测 7.6M（3×60s 22050Hz mono16 + tick 43KB，WAV 头校验通过：PCM/1ch/22050Hz/16bit）；README 已如实记录 7.7MB 与降采样备选。TM 已批准 22050Hz、<3MB 约束作废——按批准执行，不打回，转 QA/用户终验确认包体积可接受。
- 核查通过项：①选项=5 选 1（silent/tick/morning/night/ethereal，默认 tick）；②旧值 rain/waves/forest 经 `normalizeAmbientSound`→tick（settingsModel/settingsRepository 单测覆盖）；③ASSETS 映射四项齐全（expoAudioAmbientPlayer.ts:15-19，silent=null 不建播放器）；④无缝循环=2s 等功率 crossfade 折回 60s + peak 归一 −3dBFS（脚本 foldSeamless/normalizePeak 实现与 README 一致）；⑤无 license 残留（rg 命中仅自有出处说明；三首纯 JS 合成，无第三方素材）。
- 验证：`npx tsc --noEmit` EXIT 0；ambient 相关 3 套件 42 tests 全过（ambientAudio/integration settingsRepository）。

## P2 / P3 Backlog Findings

- P2-1：toolchain.smoke 仅 assert tick 打包，建议后续把 morning/night/ethereal 一并纳入 asset 断言，防某首漏打包。
- P3-1：README 体积段仍留“<3MB 挂账待裁决”表述，TM 已裁决后建议改写为“已批准 7.6MB”，免后人误读。
