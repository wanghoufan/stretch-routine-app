
# CODE REVIEW

- Task: stretch-app-v11-harden-wave1（R007–R021 + R035条件，Clock/Session/Runner JS层）
- Commit: hardening/v1.1 工作区（基线 main@bc1f39f / tag v1.0-implemented-bc1f39f；`git diff HEAD` 43 files +1173/-509）
- Reviewer: code-reviewer（ORCA，只给意见不改代码）
- Result: 过（wave1 JS 范围；P0=0。P1=2 非阻塞 + 后续 wave 原生/FGS 门仍待闭环，不属本轮缺口）

> Dispatch / Evidence ID 系字段 2.0 已废弃，不填。

## P0 / P1 Findings

- P0：无。本轮七查均通过：
  - 基线一致：diff 相对 `bc1f39f` 为增量加固，未重做 V1 UI/全量任务；V1.0 功能文件原地保留。HANDOFF 写明的旧基线文字见 P1-1。
  - 需求覆盖（wave1 范围 R007–R021）：R007 WallClock/MonotonicClock 已拆分（`src/services/clock/{WallClock,MonotonicClock}.ts`）；R008 repos 注入 WallClock；R009 ActiveSession V2 字段齐（elapsed/boot/snapshotVersion/snapshot）；R010 migration 仅 DROP+重建 active_session；R011 INSERT/UPDATE/Explicit Replace 分离、无无条件 REPLACE（会话路径）；R012 same-boot/ boot mismatch / 保守终止三规则在 sessionRecovery 落地；R014–R018 StartRoutineService + 三选一 UI（StartConflictPrompt）；R019 Runner 路由去 routineId（`Runner: undefined`，useRunner 无 routineId）；R020 Banner 读 snapshot（源删除仍可继续）；R021 snapshot 驱动回放有单测。
  - DoD（wave1 部分）：`npx tsc --noEmit` exit 0；抽查 4 套件 49 tests 全绿（sessionRecovery/sessionRepository/runnerTime/runnerMachine）。
  - 越界：无。settingsKeyValueStore / seeds 的 `INSERT OR REPLACE` 保留，但为单 key 设置与 seed_version 幂等键，非会话静默覆盖路径，不算 R011 违规。
  - 回归：Runner/Home/Detail/测试支撑同步改到新接口（loadActive 三态、useRunner 无参），抽查套件无挂。
  - 可回滚：单分支工作区，未 push；回滚即弃 hardening/v1.1 工作区改动（migration V2 尚未发布到用户库，无已发布数据回滚问题）。
- P1-1（非阻塞，文档）：`docs/handoff/HANDOFF.md` 仍写 `DEV_BASELINE: SDD-V1.0 + Change B`，与本轮指令基线 `PRODUCT_PLAN_V1.2` 不一致。改法：TM 收尾把 HANDOFF 的 DEV_BASELINE/PLAN_VERSION 对齐到 PRODUCT_PLAN_V1.2，旧 SDD 基线句留作历史备注。
- P1-2（非阻塞，纯度）：`src/shared/utils/id.ts` 与 `BootInfo` 仍用 `Date.now()`（ID 生成 / ExpoGo boot 近似）。二者均非权威计时（ID 唯一性 / 进程内稳定、重启即变且偏保守），且有 TODO 指向 R006 native。但改法：id.ts 改为注入 WallClock 或纯 counter+random（去 Date.now），BootInfo 在 native 通道可用后第一时间替换为 `StretchRuntime.getBootCount()`；在此之前不得把 ExpoGo 单测当作 R006/R025–R028 真机通过证据。
- 非本轮缺口（提醒 QA/Supervisor，后续 wave）：R004–R006 native module、R022–R028 FGS/WakeLock/Deep Sleep、R032–R034 终止矩阵、R043 API 矩阵均未在本 diff 闭环，属预期（无 JDK + EAS 额度 10-01 前不可用）；R035 WAL 本轮未触及 DB 初始化，保持“未触发条件项”正确，不计缺口。

## P2 / P3 Backlog Findings

- P2：`save()` 先 UPDATE 后 SELECT 判存在，并发下不如 upsert 原子；当前单线程 Expo SQLite 可接受，后续如加后台线程再收紧（改法：检查 changes 或加事务）。
- P2：`MonotonicClock.ExpoGoMonotonicClock` 用 Date.now 兜底并已标注 TODO；R006 落地时同步删注释、加真机 elapsedRealtime 断言。
- P3：HANDOFF 旧 Stage（seedqa P0-3/P0-4）文字与本 wave Stage ID（stretch-app-v11-harden-wave1）并存，收尾由 TM/neat-freak 合并清理。
