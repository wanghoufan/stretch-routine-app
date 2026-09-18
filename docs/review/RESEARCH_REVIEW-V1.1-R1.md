# RESEARCH_REVIEW（Phase1 专用；内部 role ID `product-reviewer` 不变）

- Plan Version（评的是哪版 PRODUCT_PLAN）：PRODUCT_PLAN_V1.1
- Review Round（第几轮）：Round 1
- Result：**FAIL**。核心方案方向成立，但用户主动停止/最近任务移除的可判定性，以及 FGS 类型选择的政策与权限前提尚未闭环，不能进入 Human Gate。
- P0 / P1 / P2：
  - P0：2 项（P0-1、P0-2）。
  - P1：1 项为 blocking（P1-1）；另有 1 项非 blocking（P1-2）。
  - P2：2 项。

## Key Assumptions（逐条列＋是否成立）

| 假设 | 结论 | 依据 / 限制 |
|---|---|---|
| `elapsedRealtime()` 可作为同一 boot 内的权威倒计时 | 成立 | 它自开机起计时、包含 deep sleep、单调递增，适用于一般间隔计时；不可跨 boot 比较。|
| `BOOT_COUNT` 可识别跨 boot | 成立（API 24+） | `Settings.Global.BOOT_COUNT` 是 `int`，API 24 引入；仍须以实际 minSdk 和真机读值做 native smoke。|
| `REASON_USER_REQUESTED` 可精确识别 Task Manager Stop | 不成立 | 官方同时把 Settings 的 Force stop 和从 Recents 移除列为该 reason；它不能独立区分二者。API 34 前还可能代表更新/组件状态变化。|
| Android 13+ 拒绝通知权限会阻止 FGS | 不成立 | 不需要 `POST_NOTIFICATIONS` 才能启动 FGS；拒绝后 FGS 通知不在通知抽屉，但仍会显示于 Task Manager。|
| 单一 local Expo module + CNG 可承载所需 native API | 成立 | Expo 官方支持 `--local` 本地模块，默认位于 `modules/` 并由 Autolinking 发现；custom native code 必须在 development/preview build 验证，Expo Go 不够。|
| 本产品可在开发时再决定 `mediaPlayback` / `health` / `specialUse` | 不成立为“可直接开发”的假设 | 三者均有不同的平台/政策契约；`health` 有传感器或 activity-recognition 前提，`specialUse` 仅用于其他类型不覆盖的合法情形并要求 subtype/Play 审查，不能把选择留成无约束的 R024。|

## Verified Facts（已验证事实＋证据）

1. Android `SystemClock.elapsedRealtime()` 含 deep sleep、单调递增，即使 CPU 省电也持续走时；官方建议其作为通用间隔计时基准。故计划的 WallClock/MonotonicClock 分离及 boot 边界安全丢弃方向正确。[SystemClock API](https://developer.android.com/reference/android/os/SystemClock.html)
2. `Settings.Global.BOOT_COUNT` 为 API 24 新增的 `int` boot count。该点支持 R006/R012/R034，但只证明 API 可用，不替代各 minSdk/OEM 的实机读取验证。[Settings.Global API](https://developer.android.com/reference/android/provider/Settings.Global#BOOT_COUNT)
3. `ApplicationExitInfo` 和 `REASON_USER_REQUESTED` 均从 API 30 引入；官方明示该 reason 包含用户在 Settings 选择 Force stop **或**从 Recents 移除应用。并且 API 34 前它也用于 app update / component-state change。故它只能作为保守信号，不能唯一表示 Active Apps Stop。[ApplicationExitInfo API](https://developer.android.com/reference/android/app/ApplicationExitInfo)
4. target Android 14+ 必须为每个 FGS 声明适当类型和对应普通权限。`mediaPlayback` 用于继续后台音/视频播放、无额外 runtime 前提；`health` 服务要满足 high sampling rate sensors 或一个列出的 runtime permission（含 `ACTIVITY_RECOGNITION`），并面向 fitness/exercise tracker 类长运行用例；`specialUse` 仅覆盖其他类型未覆盖的合法用例，需 manifest subtype，提交 Play 时审查。[FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)
5. Google Play 对 target Android 14+ 的发布包要求在 Play Console 声明 FGS 类型、用户影响和演示视频；FGS 必须是对核心功能有益、用户发起或可感知、可由用户终止、不可合理延期且仅运行必要时长。内部 APK 不触发 Console 提交流程，但不能把正式发布所需材料表述成“可忽略的政策问题”。[Play FGS requirements](https://support.google.com/googleplay/android-developer/answer/13392821?hl=en-GB)
6. Android 13+ 用户拒绝 `POST_NOTIFICATIONS` 时，app 仍能启动 FGS，且启动时仍必须提供通知；FGS notice 会在 Task Manager 显示、不会出现在 notification drawer（media session 另有豁免）。这支持 R023 的启动可用性断言，需收紧其可见性验收文字。[Notification runtime permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission)
7. Expo SDK 57 官方矩阵为 `compileSdkVersion=36`、`targetSdkVersion=36`、React Native 0.86；`create-expo-module --local` 创建单 app 本地模块，自动 autolink；CNG 下原生目录由 prebuild 生成，直接手改生成目录会在 clean prebuild 丢失，manifest 配置应由 config plugin 维持。[Expo SDK reference](https://docs.expo.dev/versions/latest/)；[local module](https://docs.expo.dev/more/create-expo-module/)；[CNG](https://docs.expo.dev/workflow/continuous-native-generation/)

## External Sources（Web Search / Web Fetch / 官方文档 / 官方 GitHub / 第三方 / 社区反馈，附链接）

- Android Developers：[SystemClock](https://developer.android.com/reference/android/os/SystemClock.html)、[Settings.Global.BOOT_COUNT](https://developer.android.com/reference/android/provider/Settings.Global#BOOT_COUNT)、[ApplicationExitInfo](https://developer.android.com/reference/android/app/ApplicationExitInfo)、[FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)、[notification runtime permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission)。
- Expo 官方：[SDK compatibility](https://docs.expo.dev/versions/latest/)、[create-expo-module](https://docs.expo.dev/more/create-expo-module/)、[custom native code](https://docs.expo.dev/workflow/customizing/)、[CNG](https://docs.expo.dev/workflow/continuous-native-generation/)。
- Google Play 官方：[FGS declaration / requirements](https://support.google.com/googleplay/android-developer/answer/13392821?hl=en-GB)、[Device and network abuse policy](https://support.google.com/googleplay/android-developer/answer/16559646?hl=en-GB)。

## Competitor Findings（竞品现状＋对本 Plan 的启示）

本轮目标是平台加固，并非功能竞品扩张；未引入非官方竞品资料。官方可比范式是“音乐后台播放使用 `mediaPlayback`”“运动追踪使用 `health`”。本产品是间歇 TTS cue + 倒计时，不能因属健身类或会发声就直接套任一范式；R024 必须把实际持续工作、音频会话及所需 runtime permission 逐项映射后选择最窄类型。

## Counter-evidence（反对证据＋成功的相反做法）

- **反对证据：** `REASON_USER_REQUESTED` 不是 Task Manager Stop 专属信号，官方还包含 Recents 移除，API 34 前甚至包含 package update。计划当前“Task Manager Stop 不恢复、recents swipe 按有效会话恢复”的表述若以该 reason 决策，无法同时保证两者。
- **成功的相反做法：** Android 文档将 `mediaPlayback` 明确限定为继续后台音/视频播放、将 `health` 定义为 fitness/exercise tracker 长运行场景并列出权限前提；`specialUse` 是兜底且须说明 subtype/接受审查。成功的合规做法不是多报类型或事后猜测，而是选择实际工作唯一必要的最窄类型，并让 manifest、运行时 `startForeground`、测试和 Play 声明保持同一理由链。
- **反对证据：** FGS 不等于 WakeLock，也不保证 JS 在时间边界实际获调度；`elapsedRealtime` 只能保证醒来后计算的经过时间正确。计划已用 R025–R028 设置 Gate，这一反例被正确地保留为实机验证，而不能宣称 FGS-only 已保证准点 cue。

## Unverified Items（未验证项＋验证方法）

1. **EAS 构建额度在 2026-10-01 恢复：未验证。** 以对应账户的 EAS dashboard / `eas build:list` 记录可用额度、credentials 和最早可构建时间；不可用即如计划所述转为构建阻塞。
2. **本项目实际 SDK、Android 生成配置、minSdk 和 native toolchain：未验证。** R002/R003 以锁文件、`npx expo config --type introspect`、prebuild 输出和真实 build artifact 取证，不以计划或历史 HANDOFF 代替。
3. **`BOOT_COUNT` 在目标 minSdk/OEM 上的读值与升级策略：未验证。** 在 local module 中按 API gate 读取，API <24 定义 fail-safe 策略并在 Android 14 Redmi、API 33、API 36/minSdk smoke 留证。
4. **Active Apps Stop、Force stop、Recents swipe 的真实 exit record 与 FGS 存活差异：未验证。** R033 必须逐项采集 `getHistoricalProcessExitReasons()` 原始 reason/时间、service 是否存活、session 结果；不可只断言 UI 观察。
5. **FGS-only / WakeLock / expo-speech 在 HyperOS Doze 下的 cue 及时性：未验证。** 依 R025–R028 真实 native build 做多边界、5–10 分钟息屏及 deep sleep 测试，记录 tolerance 和音频结果。

## Required Fixes（Planner 必须改项，打回依据）

1. **P0-1：重写 R012/R032/R033 与 User Flow 第 8 条的停止恢复判定。** 明确 `REASON_USER_REQUESTED` 是“保守的用户/包状态终止信号”，不是 Task Manager Stop 的唯一标识；定义每种测试结果的优先级。至少规定：若 FGS 在 Recents swipe 后未终止，可按仍有效 ActiveSession 继续；若进程已终止且最新 reason 为 `USER_REQUESTED`，一律不自动播音、仅在用户显式 Start/Continue 后恢复。API 30 以下的 fail-safe 也必须写明。将“recents 必恢复”改为可实测的条件化契约。
2. **P0-2：在计划层完成 R024 的可执行选择框架，而非仅把决定延期到开发。** 补一个 FGS Type ADR 输入/输出表：实际持续工作、候选类型、必需 manifest permission、runtime prerequisite、运行时 type、Play 对应申报、拒绝理由。明确禁止为了满足 `health` 前提而请求与功能无关的 activity/sensor permission；若没有持续媒体播放或 health 实际前提，则不得默认选 `mediaPlayback` 或 `health`，应先审查 `specialUse` 合法性和发布风险。最终类型可在 native spike 后定稿，但进入开发前必须有受控 default、fallback 和“不满足即停”的 Gate。
3. **P1-1（blocking）：把 R023 的验收改为双分支。** 允许时验证 notification drawer；拒绝时验证 FGS 可启动、Task Manager 可见、drawer 不可见（除合法 media-session 豁免）。并在 R043 的 API 33/36 矩阵中逐一记录，不以“仍可运行”掩盖可见性退化。
4. **P1-2（non-blocking）：将正式 Play 发布的 FGS declaration/video 从 P2 的宽泛描述改为明确 Release Blocker 条目。** 内部 APK 可延期提交；一旦发布轨道含 Play，类型表、描述、用户影响、演示视频均为 Release 前置条件。

## Plan Readiness Score（分项打分＋合计，口径以 PRODUCT_PLAN.template.md 为准）

- 产品目标与用户需求（20）：19/20。目标、失败体验和范围边界清晰。
- 核心方案完整性（20）：15/20。时钟/快照/迁移/风险 Gate 完整；停止信号的不可区分性和 FGS 类型决策链缺口扣分。
- 外部事实与竞品验证（20）：16/20。Android、Expo、政策事实已独立验证；关键事实揭示两项未吸收的约束。
- 技术可行性（15）：11/15。local module + CNG 可行；build 通道、OEM 深睡和 FGS 类型尚待实证/决策。
- 风险与异常场景（10）：9/10。覆盖广；仍需把 exit reason 模糊性纳入 fail-safe。
- 开发范围与 DoD（10）：9/10。任务可追溯；R023、R032/R033 需可测的精确断言。
- 未决问题（5）：2/5。存在两个 P0 与一个构建通道验证项。
- 合计：**81/100**。
- Gate 复核：不满足。分数低于 90，P0=2，blocking P1=1；且停止语义、FGS 类型与构建通道的关键假设未完成闭环。

## Human-only Decisions（只需人类拍板项）

- 若 EAS 额度/凭据不在计划日期恢复，是否授权安装本地 JDK + Android toolchain，或提供付费/其他构建通道；Planner 不得自行扩大费用或环境权限。
- 若 FGS 类型 ADR 表明目标行为无法以最窄、合规类型实现，是否接受缩减为“只在可见/实际播音期间提供后台保障”，或授权对 `specialUse` 的正式发布审查风险。技术团队只能给出证据与选项。

## Next Action（回 Planner 修订 / 进 WAITING_HUMAN_APPROVAL 找人）

**回 Planner 修订。** 修复 P0-1、P0-2 与 P1-1 后，重新提交 PRODUCT_PLAN_V1.2（或受控修订版）进入 Research Review Round 2；不得进入 `WAITING_HUMAN_APPROVAL`。
