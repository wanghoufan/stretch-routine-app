# CODE REVIEW

- Task: TASK-011 倒计时背景音 + TASK-012 种子 V2（分支 hardening/v1.1，未提交工作区）
- Commit: 工作区 diff（HEAD 起 30 文件，1276+/128-）+ 未追踪新增 src/services/audio/、assets/audio/
- Reviewer: code-reviewer（ORCA）
- Result: 过（P0=0；P1=1 流程项 + P2=2；改法见下）

> Dispatch / Evidence ID 系字段 2.0 已废弃，不填。

## 验证结果

- `npx tsc --noEmit`：EXIT 0。
- `npx jest` 全量：31 suites / 228 tests 全过（含新增 ambientAudio、migrationsV3、seed 用例）。
- 种子规模实测：`SEED action(` 行 = 59，routine `name:` 行 = 9，与宣称 9 模板 / 59 动作一致。
- 音频体积实测：tick 44K + rain 432K + waves 348K + forest 576K ≈ 1.4MB，与 README 声明一致。

## P0 / P1 Findings

- P1-1（流程，非技术否决）：`src/services/audio/`（3 文件）与 `assets/audio/`（4 wav + README）为未追踪新增（`git status` 显 `??`），当前 `git diff` 不包含它们，存在"只看 diff 会漏审/漏提交"风险。改法：builder 收工前 `git add src/services/audio assets/audio`（确认 4 个 wav 即 1.4MB 已在内），TM 在 HANDOFF 落盘清单补记这两组新文件。

## P2 / P3 Backlog Findings

- P2-1：`expoAudioAmbientPlayer.play()` 对 `silent` 有 early-return，但 `sync()` 已保证 `silent` 永不调用 player，且 `ensurePlayer()` 内 `require('expo-audio')` 懒加载——silent 零播放/零实例成立。无改动，仅记录已核验。
- P2-2：`AmbientAudioService.stop()` 在 `active === null` 时直接返回而不调 `player.stop()`；若外部（如打断）停了原生播放器而 `active` 仍有值，下次 `sync` 同选项会误判"无变化"不再 `play`。极小概率，建议 builder 后续在 `play()` 前加一次幂等 `ensureAudible` 或记录为 backlog，不阻塞本轮。

## 逐项核验（任务指令必查）

### TASK-011 背景音

- silent 零播放：`ambientAudioService.ts:61`（`option !== 'silent'` 门控）+ `expoAudioAmbientPlayer.ts:43-45` 双保险；`ASSETS` 类型为 `Exclude<..., 'silent'>`，silent 无对应资源。PASS。
- 暂停/结束即停：`runnerController.ts:241`（每次 `patch` 调 `syncAmbient`）+ `dispose:202` 停播；`sync:61-64` 非 running 状态一律 `stop()`；README 播放策略列明 6 种停止态。PASS。
- expo-audio 懒加载：`expoAudioAmbientPlayer.ts:29` 在 `ensurePlayer()` 内 `require`，模块顶层无 import；settings/seed 等纯逻辑文件不触碰原生层。PASS（`package.json:17` 声明 `expo-audio ~57.0.5`，注释"SDK57 自带/expo-av 已废弃"属实）。
- 1.4MB 资产：实测见上。PASS。
- license 记录：`assets/audio/README.md:7-12` 四行出来源/作者/License/商用列 + `:30-32` 对外分发署名段。PASS。
- TTS 共存：直叠策略（README `:36` 说明无 ducking hook）+ `sync` 失败路径不碰计时（`:75-79`），与 B-2 Requirement③"不掐断计时、不吞 cue"一致。PASS。
- 越界检查：runnerController 只新增 `ambient` 依赖 + `syncAmbient` 调用，不改计时权威路径；settings 屏新增 RadioGroup + 清除示例区，与 B-2 DoD 对齐。无 scope creep。PASS。

### TASK-012 种子 V2

- 9 模板 / 59 动作：实测见上。PASS。
- migration V3 仅加列：`src/data/migrations/index.ts` V3 仅 6 条 `ADD COLUMN`（nullable TEXT），无重写/删表；`migrationsV3.test.ts` PASS。PASS。
- 标签同步：mapper 层（actionMapper/routineMapper diff 有 joinTagList 落库）+ seed 定义 category/difficulty/bodypart 全覆盖；`seed.test.ts` 244 行扩展覆盖。PASS。
- repair/清除按名判定：`SEED_ACTION_NAMES`/`SEED_ROUTINE_NAMES` + `LEGACY_SEED_ROUTINE_NAMES`（"办公室肩颈放松"旧名兼容）+ `SEED_EXAMPLES_CLEARED_KEY` 防复活；改名/自建数据不动（name-based，非 id-based）。PASS。
- SEED_VERSION 保持 1（靠 repair 补模板而非重播种）：注释已说明，与 B-1 幂等要求一致。PASS。

## 可回滚性

- 两单均可独立回滚：TASK-011 回滚 = 移除 ambient 依赖注入 + `syncAmbient` 调用（runner 退回纯 TTS）；TASK-012 回滚 = 不执行 V3 migration（加列语句独立版本，可停在 V2）。数据层无破坏性语句。
