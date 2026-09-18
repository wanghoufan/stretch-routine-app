
# CODE REVIEW

- Task: TASK-001-stretch-app-v1-build（builder首轮全量交付）
- Commit: 工作区现状（无git仓库，按文件现状复核）
- Reviewer: code-reviewer（本窗口）
- Result: 过（无P0；P1×2 转QA/后续轮处理，不阻塞）

> Dispatch / Evidence ID 系字段 2.0 已废弃，不填。

## 验证手段与证据

- `npx tsc --noEmit`：EXIT 0，无类型错误。
- `npx jest` 全量：21 suites / 150 tests 全部 PASS（含 runnerMachine/runnerTime/runnerControls/sessionRecovery/ttsService/migrations/integration）。
- 必查点逐项读码验证：
  - 时间戳权威计时：`runnerTime.ts` phaseElapsedMs 仅用 phaseStartedAtEpochMs/accumulatedPauseMs/nowMs；`runnerMachine.advanceRunner` 纯函数收 nowMs；ticker 仅 presentation（`ticker.ts` 注释+`runnerController.tick` 只 patch nowMs）；TTS onDone 只推进队列（`ttsService.finish`），不驱动计时。✅ 落实。
  - RoutineStep 快照独立：`RoutineStep.ts` 注释+字段（sourceActionId 仅溯源非活链）；`actionSnapshot` 集成测试 PASS。✅。
  - 零AI/云/账号依赖：`package.json` 生产依赖仅 expo/expo-speech/expo-sqlite/expo-status-bar/react/react-native；全 src 无 fetch/axios/supabase/firebase/网络/AI 调用（唯一命中为测试 setup 的 RN 警告 mock 字符串）。✅。
  - expo-sqlite 迁移安全：版本化 MIGRATIONS + user_version 幂等、无生产 DROP（`resetSchema` 仅测试/QA helper）；migrations 测试 PASS。✅。
  - 后台/foreground 重建：`backgroundService`（Expo Go 兼容、无 foreground service，取舍已文档化）+ `sessionRecovery.recoverSession`（stale/越界/空快照 fail-safe 丢弃）+ `useRunnerLifecycle` 前后台重解边界；`advanceRunner` 多边界一次追赶 + 中间 cue suppressed。✅ 逻辑成立，真机效果待 QA T062 实证。

## P0 / P1 Findings

- P1-1：后台 trade-off 已知缺口——进程被挂起期间到期的语音 cue 不补播（`backgroundService.ts` 头注释自述），恢复时 suppressed 直接跳过。改法：V1 接受并由 QA 在 T062 真机实测确认行为符合 SPEC（锁屏/切后台后计时对、回来不重播旧 cue）；如 SPEC 要求补播，则 V1.1 以 dev build + foreground service 跟进。不阻塞本轮。
- P1-2：倒计时 warning 文案与 key 的语义——`runnerCueCoordinator.buildCountdownWarningCue` key 固定每 step+有效时长播一次（去重后只播首次，如“5秒后结束”，后续 4/3/2 秒同 key 被吞）。当前行为=每步只 warn 一次，合理；但文案用 `remainingSec` 动态值，若将来想逐秒播报会被去重吞掉。改法：保持现状（一次 warn），或逐秒播报则 key 需带 remainingSec。转 QA 确认 SPEC US7 期望即可。

## P2 / P3 Backlog Findings

- P2-1：`describeStepStart` 用快照时长播报（+10s 延长后仍报原秒数），与 routineTotalMs（planned，不含 runtime 延长）一致，是 SPEC 语义；仅记一笔，UI 倒计时与口播秒数在延长步会短暂不一致，属预期。
- P2-2：无 git 仓库，无法做 diff 级回归/回滚判定；可回滚性=整目录快照。建议编排者建仓打 tag（`SDD-V1.0-baseline` + 本轮 `TASK-001`），后续轮 review 才有 commit 可审。
- P2-3：HANDOFF 剩 P0-2（真机 adb 安装+后台/锁屏/TTS 实测）属 QA 环节，非本轮代码问题；本 review 不计 P0，QA 未出证据前不 Release。
