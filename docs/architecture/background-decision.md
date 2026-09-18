# 后台机制决策（T007）

- 日期：2026-09-17
- 决策：**方案 A —— 时间戳权威计时 + 会话持久化 + 前台重建（Expo Go 兼容）**
- 备选：**方案 B —— dev build + Android 前台服务/常驻通知**（暂不采用，条件见「切换触发条件」）

## 决策

V1 首版采用方案 A。理由：

1. Constitution V 把「计时正确性」定义为时间戳推导，方案 A 完全满足，且与回调次数无关。
2. Constitution VI 要求「返回前台后必须恢复到正确的当前步骤与剩余时间」——方案 A 直接满足。
3. Constitution §3.1 要求不要引入当前需求以外的依赖：方案 A 不需要原生模块、不需要 dev build，Expo Go 即可运行与验证。
4. Constitution VI 同时要求「不得静默降级」：方案 A 的语音限制被明确写进 `docs/qa/android-background-spike.md` 与用户可见的错误/限制说明，而不是假装支持。

## 代价（已知且明示）

- 进程被系统挂起期间到期的语音提示不会发声；返回前台后不回放过期播报。
- 无常驻通知，用户无法在通知栏看到当前进度。

## 切换触发条件（何时改走方案 B）

满足任意一条即升级为方案 B（dev build + 前台服务/常驻通知）：

1. T062 真机 QA 判定「锁屏期间语音提示不连续」为 P1 不达标；
2. 用户明确要求锁屏期间持续播报；
3. 需要在通知栏展示当前动作/剩余时间。

方案 B 需要：`expo-dev-client` + 自定义 config plugin（或原生模块实现 `ForegroundService` + 常驻通知），并新增通知权限与 Android 13+ `POST_NOTIFICATIONS` 处理。这属于关键技术路线变化，按 AGENTS 的 Change C 走（Planner + 评审 + 用户批准 + 新基线）。

## 实现落点

| 关注点 | 文件 |
|---|---|
| 权威时间戳计时 | `src/features/runner/domain/runnerTime.ts` |
| 边界追赶（跨多步） | `src/features/runner/domain/runnerMachine.ts`（`advanceRunner`） |
| 会话落库 | `src/features/runner/services/sessionPersistence.ts`、`src/data/repositories/sessionRepository.ts` |
| 恢复重建 + 安全兜底 | `src/features/runner/services/sessionRecovery.ts` |
| AppState 监听 | `src/services/background/backgroundService.ts`、`src/features/runner/hooks/useRunnerLifecycle.ts` |
| 冷启动可继续入口 | `src/features/routines/hooks/useRoutines.ts`（Home 卡片「继续」） |

## 不变式（后续改动不得违反）

1. TTS 回调、定时器次数、渲染帧率都不得参与 elapsed/remaining 计算。
2. 恢复必须幂等：对同一时刻重复恢复不改变会话。
3. 损坏/不可用的存档会话必须安全落到非运行态，绝不启动第二个计时器。
