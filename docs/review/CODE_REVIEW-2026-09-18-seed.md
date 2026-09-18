# CODE REVIEW

- Task: TASK-005 种子模块（DEV_BASELINE=SDD-V1.0+B-1局部Requirement）
- Commit: 工作区现状（2026-09-18，未取commit，审src/data/seeds.ts + createAppServices启动链 + App.tsx + seed.test.ts + seedHome.test.tsx）
- Reviewer: code-reviewer
- Result: 过（P0=0，可进QA；下见2×P2 backlog）

## P0 / P1 Findings

- 无P0。七查结论：
  - 幂等真安全：marker优先（`already-seeded`）→ 双表全空才写、任一非空即`skipped-user-data`且不写marker（seeds.ts:173-188）→ 全量写入单transaction、marker最后落盘（seeds.ts:194-264）。失败半写不会被误判为用户数据，下次仍可重试。
  - 双侧命名复用既有规则：经`createBilateralStepDrafts`展开（seeds.ts:122-124），未自造`（左）/（右）/左侧/右侧`规则；测试断言与bilateral.ts一致。
  - speakText中文：action `default_speak_text=name`、step沿用domain命名（左侧/右侧+中文名），测试逐字断言（seed.test.ts:86-97）。
  - Requirement覆盖：14动作（9 bilateral+5 single）/2示例流程/30s步长/5s过渡/seed_version=1，均有测试覆盖；晨起10步345s、跑后9步310s与实现自洽。
  - 启动链：App.tsx → initializeApp（migrations→runSeeds）→ ready渲染；composition root仅透传db/clock/generateId，无新依赖。
  - 越界：seeds.ts仅依赖domain/routine、clock、id、SqlDatabase类型；无speaker/navigation/网络依赖。app.json 1.1.0/versionCode 2（HANDOFF记1.0.0）属TASK-005重打包所需版本递进，不算Scope creep。
  - 可回滚：种子只在全新空库写一次；已装机老用户走`skipped-user-data`零写入，回滚=不装新包即可。
- 验证：`npx tsc --noEmit` PASS（exit 0）；`npx jest seed.test.ts seedHome.test.tsx` 4/4 PASS。

## P2 / P3 Backlog Findings

- P2-1：`countRows`对表名做字符串拼接（seeds.ts:158-161），当前调用方写死字面量无注入面；后续若复用请加白名单断言。
- P2-2：并发双调`runSeeds`存在TOCTOU理论竞态（两次全空检查同时通过→重复写）；单进程启动链串行调用，风险极低；若将来后台+前台并发初始化再加锁/UNIQUE兜底。
