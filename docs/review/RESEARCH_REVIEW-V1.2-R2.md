# RESEARCH_REVIEW（Phase1 专用；内部 role ID `product-reviewer` 不变）

- Plan Version（评的是哪版 PRODUCT_PLAN）：PRODUCT_PLAN_V1.2
- Review Round（第几轮）：Round 2（复核 Round1 P0-1、P0-2、blocking P1-1、P1-2）
- Result：**PASS**。Round1 四项均已转为一致、可执行且可验收的计划契约；计划层 P0=0、blocking P1=0，可进入 `WAITING_HUMAN_APPROVAL`。
- P0 / P1 / P2：
  - P0：0 项。
  - P1：0 项 blocking；4 项常规非 blocking（R036/R037/R038/R040）及 1 项条件 Release Blocker（`RB-PLAY-FGS`）。
  - P2：历史会话、跨设备同步、云备份与扩展 OEM/语音矩阵，均不阻塞本轮 Gate。

## Round1 闭环复核

| Round1 项 | V1.2 证据 | 复核结论 |
|---|---|---|
| P0-1：保守终止信号 | User Flow §8、Technical Approach 的 Termination policy、R012/R032/R033 统一为：FGS/进程仍存活优先继续；进程终止后的 `REASON_USER_REQUESTED` 不细分来源且不自动播音；无/模糊信号或 API <30 同样 fail-safe；R033 要求终止后仅显式 Start/Continue 才恢复。 | 通过。消除了把 `REASON_USER_REQUESTED` 误当 Task Manager Stop 专属信号、又要求 Recents 必恢复的原有矛盾；原始 reason/时间与存活状态仍由矩阵留证。 |
| P0-2：FGS Type 可执行框架 | Technical Approach 的 FGS Type 表覆盖实际持续工作、manifest permission、runtime prerequisite、运行时 type、Play 申报和选择/拒绝规则；`specialUse` 是受控 default 候选，真实持续媒体架构才可走 `mediaPlayback` fallback，`health` 明确拒绝。 | 通过。类型选择不再无约束延期；不得以间歇 TTS 冒充持续媒体、不得为 `health` 申请无关权限。 |
| P0-2：default/fallback/Stop Gate | FGS Type default/fallback/Stop Gate 要求 default 或 fallback 均须提供真实、最窄且 manifest/runtime/Play 一致的理由；否则不实施或发布后台 FGS，并回到已列明的 Human Decision。R024 与 DoD 对应验收。 | 通过。Gate 有明确触发条件、禁止动作和回退路径，不与当前 internal APK / Play 边界冲突。 |
| blocking P1-1：R023 双分支 | User Flow §7、R023、R043 和 DoD 均要求：允许通知时 drawer 可见；拒绝时 FGS 可启动、Task Manager 可见、drawer 不可见（合法 media-session 豁免除外），且 API 33/36 逐一记录。 | 通过。可见性退化未被“FGS 仍可运行”掩盖。 |
| P1-2：Play 发布边界 | Out of Scope、P1 与 DoD 均定义 `RB-PLAY-FGS`：internal APK 阶段非 blocking；进入 Google Play 发布轨道立即成为 blocking Release Blocker，且 Console 声明、subtype/描述、用户影响、可终止性、视频必须与 R024 ADR、manifest 和 runtime type 一致。 | 通过。内部测试与 Play 发布义务被明确区分，未将发布合规问题遗忘或降级。 |

## Key Assumptions（逐条列＋是否成立）

| 假设 | 结论 | 限制 |
|---|---|---|
| `REASON_USER_REQUESTED` 只能作保守信号 | 成立 | 不可精确归因；R033 必须保留原始 evidence。 |
| `specialUse` 可作为受控候选而非默认豁免 | 成立 | 仍需 native spike/ADR 证明无更窄类型，并承担 Play 审查条件。 |
| 通知拒绝不阻止 FGS 启动 | 成立 | 必须按 R023/R043 验证 Task Manager 与 drawer 的不同可见性。 |

## Verified Facts（已验证事实＋证据）

沿用 Round1 已核验的 Android、Expo 与 Google Play 官方事实；本轮未出现新的外部事实疑点。V1.2 已把其约束落实到 User Flow、R012/R023/R024/R032/R033/R043、DoD 与 Release Blocker。

## External Sources（Web Search / Web Fetch / 官方文档 / 官方 GitHub / 第三方 / 社区反馈，附链接）

沿用 [Round1 评审](RESEARCH_REVIEW-V1.1-R1.md) 已列官方来源；依任务要求不重复检索。

## Competitor Findings（竞品现状＋对本 Plan 的启示）

沿用 Round1：持续媒体播放与真实健康/传感器追踪是不同的官方可比范式；本产品的间歇 TTS + 倒计时不得借产品类别或发声行为套用二者。V1.2 已将该结论固化进 R024。

## Counter-evidence（反对证据＋成功的相反做法）

- `REASON_USER_REQUESTED` 仍无法区分 Recents、Force Stop 与 Task Manager Stop；V1.2 不再依赖这种不可得的精确归因，而以存活事实和终止后的保守不播音处理。
- FGS 仍不等于 WakeLock 或准点 JS 调度；R025–R028 保持真实 native build 的证据 Gate，未把计划表述为已被证明的运行时保证。
- `specialUse` 仍受 Play 审查；Stop Gate 与 `RB-PLAY-FGS` 防止以未验证或不一致的类型进入发布。

## Unverified Items（未验证项＋验证方法）

1. native spike 能否为 FGS default/fallback 给出真实且最窄的理由：按 R024 形成 ADR，并以 Stop Gate 处理失败。
2. API 33/36、Redmi/HyperOS 与 minimum SDK 的通知双分支、终止矩阵和 Doze 行为：按 R023/R033/R043 真机与 smoke evidence 验证。
3. 构建通道可用性：按 R002/R003 与可用 EAS/获批替代通道取证；不可用时不得声称 native Gate 已通过。

## Required Fixes（Planner 必须改项，打回依据）

无。建议实施时将“进程已终止”的判定与 R033 原始证据字段一并记录，属于既有 R033 的执行留证，不构成计划缺口。

## Plan Readiness Score（分项打分＋合计，口径以 PRODUCT_PLAN.template.md 为准）

- 产品目标与用户需求（20）：19/20。
- 核心方案完整性（20）：20/20。
- 外部事实与竞品验证（20）：18/20。
- 技术可行性（15）：13/15。
- 风险与异常场景（10）：10/10。
- 开发范围与 DoD（10）：10/10。
- 未决问题（5）：4/5。
- 合计：**94/100**。
- Gate 复核：满足。Readiness >= 90；计划层 P0=0；当前 blocking P1=0；关键外部事实已由 Round1 核验并被 V1.2 吸收；核心假设均有 R024/R025–R028/R033/R043 的受控验证路径。

## Human-only Decisions（只需人类拍板项）

- 若构建通道未按预期可用，是否授权本地 JDK/Android toolchain 或其他付费/构建通道。
- 仅当 R024 Stop Gate 触发时，在“缩减为仅可见/实际播音期间保障”与“承担 `specialUse` 正式发布审查风险”之间选择。
- Human Gate 后，仍须用户明确口令“第二阶段，开发”才可进入开发。

## Next Action（回 Planner 修订 / 进 WAITING_HUMAN_APPROVAL 找人）

**进 `WAITING_HUMAN_APPROVAL` 找人。**Task Manager 应将 `PLAN_GATE` 更新为 `READY_FOR_HUMAN_REVIEW`，停止 PLAN 循环；不得自动启动 Phase2。
