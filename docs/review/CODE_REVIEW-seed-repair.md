
# CODE REVIEW

- Task: TASK-009 种子修复（shipped routine 误删后恢复）
- Commit: hardening/v1.1 工作区增量（seeds.ts + createAppServices.ts + seed.test.ts）
- Reviewer: code-reviewer
- Result: 过（无 P0；1 个 P2 备注，不阻塞）

> Dispatch / Evidence ID 系字段 2.0 已废弃，不填。

## P0 / P1 Findings

- 无 P0，无 P1。四项指定复核点逐项结论：
  - 只补缺失不动用户数据：通过。`repairSeededRoutines` 先按目录名 diff 出 missing，仅对 missing 做 `insertSeedRoutine`；现存 routine（含用户自建与用户编辑过的）既不删除也不重写；事务内只 INSERT 新 routine + steps；测试证实修复后 actions 15、routines 3，用户自建动作/流程 verbatim 存活，seed marker 未被 bump。
  - 未播种库不注入：通过。无 `seed_version` marker 直接返回 `not-applicable`，不读名、不写行；测试证实用户自建 1 action + 1 routine 库修复后行数不变。
  - source_action_id null 与 V2 schema 兼容：通过。`routine_steps.source_action_id TEXT` 可空、无 FK 约束（migrations/index.ts:40-51，V2 迁移未动该表）；mapper 已是 `string | null`（routineMapper.ts:18，`?? undefined`）；既有删除动作路径已用 `SET source_action_id = NULL`（actionRepository.ts:140），语义一致。另核实 bilateral 分支 `actionId ?? ''` 仅作 draft 中间值，最终落库被 `sourceActionId: actionId` 覆盖（seeds.ts:142），空串不会持久化。
  - 启动链调用安全：通过。`initializeApp` 顺序 migrations → runSeeds → repairSeededRoutines，均幂等、无网络、无新依赖（仅透传 db/wallClock/generateId）；repair 内部失败会抛错走 App.tsx 既有 error 分支，不静默吞错；新增 `seedRepair` 返回字段向后兼容（App.tsx 直接 `.then(() => ready)` 忽略返回值）。时钟改名 `clock → wallClock`（SystemWallClock）符合 R007/R008 约束，种子只用 wall 时间戳。
- 验证证据：`npx tsc --noEmit` 干净（exit 0）；`npx jest src/tests/data/seed.test.ts` 6/6 通过（含 TASK-005 原 3 项 + TASK-009 新增 3 项）。

## P2 / P3 Backlog Findings

- P2（不阻塞，后续可考虑）：repair 以 routine **name** 判存在。若用户自建同名 routine，会被视为"已存在"而跳过恢复——当前窄修复语义下可接受（避免重名 duplicate），但若将来种子改名/用户重名冲突增多，可考虑按稳定 key（如 seed origin 标记）而非 name 判定。
