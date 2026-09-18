
# CODE REVIEW

- Task: TASK-014（动作库分组筛选，B-3）
- Commit: hardening/v1.1 工作区（未提交 diff 复核）
- Reviewer: code-reviewer
- Result: 过（P0=0；P1=1 记 backlog，不阻塞）

## P0 / P1 Findings

- P1-1：HomeScreen 难度角标仅 `group.scene === '核心'` 时透传（HomeScreen.tsx:146），B-3 DoD 写“流程模板页按场景分组（难度角标）”未限定仅核心。若意图为全场景角标，需把 badge 透传去掉场景条件；若意图仅核心，需在 HANDOFF B-3 补一句“角标仅核心组”以固化范围。当前实现 + templateGroups 测试均按仅核心断言，自洽但与字面 DoD 有歧义——记 backlog，由 TM 定口径。

## P2 / P3 Backlog Findings

- P2-1：命名不一致：动作侧 `核心训练`（actionGroups.ts:20）vs 模板侧 `核心`（routineGroups.ts:17）。各自 testID 前缀不同（library-group- / routine-group-）无冲突，仅展示口径建议统一或在 B-3 备注说明。
- P2-2：筛选激活时自动展开所有命中组（ActionLibraryScreen.tsx:67-71），B-3 只写“默认展第一组”。当前行为合理（否则命中不可见）且折叠记忆（expandedOverrides）保留，已有集成测试覆盖；建议 B-3 补一句说明即可。

## 验证

- `npx tsc --noEmit`：PASS（exit 0）。
- 4 套件全绿（14 tests）：domain/actionGroups、domain/routineGroups、integration/libraryFilter（4）、integration/templateGroups。
- 七查：分组映射（场景→部位二级、空组隐藏、默认展第一组+折叠记忆）、难度 chips 单选 + 搜索子串、组头 count badge、testID（library-group-*/library-subgroup-*/routine-group-*/routine-badge-*）、无障碍（group header expanded/label/hint、chips radiogroup/radio selected、badge 难度 label）均与 B-3 一致；无越界业务改动（同 diff 内 settings/背景音属 B-2，不属本次评审）。
