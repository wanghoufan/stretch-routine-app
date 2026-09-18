# Android 后台/锁屏技术尖刺记录（T006）

- 日期：2026-09-17
- 执行：builder（TASK-001-stretch-app-v1-build）
- 状态：**方案与代码已落地；真机证据待 T062 完成（本轮未产出设备实测证据）**

> 说明：本文只记录本轮真实做过的验证（工程可启动、逻辑单测、时间戳重建策略）。真机锁屏/后台证据属 T062，未完成前不得据此宣称「后台已验收」。

## 1. 尖刺要回答的问题

1. 后台/锁屏时，计时是否仍然正确？
2. 回到前台时，当前步骤与剩余时间是否正确？
3. 锁屏是否会导致流程重置？
4. Expo Go 能否满足，还是必须 dev build + 前台服务？

## 2. 验证结果

| 问题 | 结论 | 支撑 |
|---|---|---|
| 计时正确性 | 与回调无关，由时间戳推导 | `src/features/runner/domain/runnerTime.ts`；单测 `runnerTime.test.ts`、`runnerMachine.test.ts` |
| 跨边界追赶 | 一次 tick 可补齐任意多个已越过的边界 | `advanceRunner` 循环解析边界；单测「长间隔一次跳完整个流程」 |
| 恢复不重启 | 由存档会话重建，不重新开始 | `src/features/runner/services/sessionRecovery.ts`；单测 `sessionRecovery.test.ts` |
| 锁屏不重置 | 会话落库（单行 `active_session`），恢复时读回 | `src/data/repositories/sessionRepository.ts`；单测 `sessionRepository.test.ts` |
| 后台到期播报 | **Expo Go 下不保证**（进程挂起时无法发声） | 见下节限制 |

## 3. 采用的机制（Expo Go 兼容）

- 权威时间 = 时间戳差值，UI 的 250ms tick 仅用于刷新画面（Constitution V / PLAN §5-2）。
- 每次状态迁移（进入新步骤/过渡、暂停/恢复、+10、跳过、上一个、结束）都会写入 `active_session`。
- `AppState` 变化监听（`src/services/background/backgroundService.ts`）：
  - 转后台 → 立刻 tick 一次并落库
  - 回前台 → 立刻 tick 一次，解析离开期间越过的全部边界
- 恢复事件里，除最后一个之外的历史步骤提示音标记 `suppressed`，不播报 → 不做「过期播报回放」。

## 4. 明确限制（必须挂账，不得静默降级成「亮屏才准」）

Expo Go 无法运行前台服务/常驻通知，因此：

1. 进程被系统挂起期间到期的语音提示不会发声；视觉与计时在返回前台后仍然正确。
2. 长间隔恢复时，用户可能错过中间动作的语音提示（画面正确）。

处置：产品要求不弱化——恢复后按权威时间继续；若真机 QA（T062）判定语音连续性不达标，下一步是 **dev build + Android 前台服务/常驻通知**（T007 决策见 `background-decision.md`），属 T062 后的 Change B/C 流程。

## 5. 待真机验证清单（T062）

- [ ] 锁屏跨 ≥2 个边界，解锁后画面与权威时间一致
- [ ] 切到其他 App 后返回，步骤与剩余时间正确
- [ ] 冷启动/进程被杀后重开，能回到正确步骤（Home 卡片显示「继续」）
- [ ] 记录前台服务方案的必要性与实测差距
