# CODE REVIEW

- Task: TASK-018 动作库动态部位筛选（B-4，HD-1=A）
- Commit: 工作区未提交 diff（HEAD=554bb5a），业务改动 5 文件：`actionGroups.ts` / `ActionFilterBar.tsx` / `ActionLibraryScreen.tsx` / `actionGroups.test.ts` / `libraryFilter.test.tsx`
- Reviewer: code-reviewer（ORCA，独立 Session）
- Result: 过（P0=0；blocking P1=0）。P1-1 为计划设计规则未落地的体验项，不阻塞本轮验收，改法见下，由 TM 定是否随下次小改（Change A）顺手修。

> Dispatch / Evidence ID 系字段 2.0 已废弃，不填。

## P0 / P1 Findings

- P1-1（非阻塞，计划规则未落地）：活动场景的**可见**归属提示缺失。`docs/pm/PLAN-TASK-018-library-dynamic-filter.md:42`（设计审查结论 1）要求“界面须显示当前归属（如「拉伸部位」），避免 chips 控制不可见组时语义不明”。实现只把场景写进了无障碍 label：`src/features/actions/components/ActionFilterBar.tsx:45`（容器 `筛选${activeScene}部位`）与 `:56`（chip `${activeScene}部位：${chip.key}`），屏幕上没有任何可见文字说明 chips 属于哪个场景。
  - 影响：多组同开时（集成测试 3 已证明支持）用户展开热身→chips 内容整体换成热身部位，肉眼只能靠“少了几个 chip”推断；活动组被搜索隐藏时（`ActionLibraryScreen.tsx:176-178` 空组隐藏）chips 仍在控制一个屏幕上不存在的组，语义全靠推断。
  - 改法（3 行，建议）：在 `ActionFilterBar.tsx:41` 容器内、chips 之前加一行可见文本并复用它作为容器 label：
    ```tsx
    <Text style={styles.chipsSceneLabel} maxFontSizeMultiplier={1.5}>{`${activeScene}部位`}</Text>
    ```
    样式 `chipsSceneLabel: { fontSize: 13, color: colors.textMuted }`；容器 `accessibilityLabel` 保持 `筛选${activeScene}部位`。
  - 若不打算改，须由 TM 在 HANDOFF B-4 补一句“仅无障碍 label，不做可见提示”固化口径；本轮不因此打回。

## P2 / P3 Backlog Findings

- P2-1（测试覆盖缺口，对应 Plan DoD 两条未断言）：`PLAN-TASK-018-library-dynamic-filter.md:141` 要求断言“收起非活动组不改变 chips；选择部位不自动展开其他组”，`src/tests/integration/libraryFilter.test.tsx` 6 个用例均未覆盖这两条。当前实现正确（`ActionLibraryScreen.tsx:88` 只在 `!expanded && scene !== activeScene` 时切换；`:80` `searchActive` 刻意不含部位），但这是最容易被后人改坏的回归点（谁把 bodyPart 加进 `searchActive`，测试不会红）。改法：在“部位筛选只作用于活动场景”用例里补 —— ① 展开热身、再收起热身（非活动组），断言 `library-bodypart-chips-拉伸` 仍在且 `filter-bodypart-颈` 仍 selected；② 在活动组收起状态下点 chip，断言 `library-group-热身` 仍无 `高抬腿`（未被自动展开）。
- P2-2（边界态）：活动场景在数据层为空时，chips 与默认展开都会指向一个不存在的组。`ActionLibraryScreen.tsx:83` 把默认展开固定为 `library-group-拉伸`（不再随 `groups[0]` 漂移），若用户把拉伸动作全删光，页面呈“三个组头全收起 + chips 只有一枚「全部」”，而 `bodyPartChipsForScene`（`actionGroups.ts:127-128`）仍为 0 动作的拉伸生成「全部」。旧行为是 `groups[0]`（此时=热身）自动展开。改法（任选）：仅在数据层判定时兜底 `activeScene = ACTION_SCENES.find(s => actionsInScene(actions, s).length > 0) ?? ACTION_SCENES[0]`；判定条件必须是“该场景动作数为 0”而非“筛选后为 0”，否则会破坏 Plan 规则 5（chips 不随搜索结果收缩）。影响面小（需删光拉伸动作），记 backlog。
- P2-3（真机口径，待 QA 顺带确认）：搜索激活时 `searchActive`（`ActionLibraryScreen.tsx:80-85`）会让所有命中组默认展开，此时点某个非活动组只会“收起”而不会切换活动场景（`toggleGroup` 需 `由收起变展开`），用户要连点两次才能把 chips 切到该组。与 Plan 规则 1 字面一致，判为可接受；请 QA 在 xagapro 上确认实际操作不别扭，若判为问题再走 Change B（把“点非活动组头即切活动场景”写进 Requirement），本轮不改。
- P3-1：`BodyPartChip.count`（`actionGroups.ts:57-61`、`:128-140`）UI 未使用，仅单测断言；核验为 testID 契约之外的留存字段，无副作用，无需处理。
- P3-2：`BODY_PART_GROUPS`（`actionGroups.ts:22-32`）与 `TAG_BODY_PART_VALUES`（`src/domain/tags.ts:26-36`）重复定义，本次未引入也未扩大，建议后续统一取值来源。
- P3-3：场景组头 `minHeight: 44`（`ActionLibraryScreen.tsx:305`）低于 `MIN_TOUCH_SIZE=48`；HEAD 版即为 44，属既有问题、不在 B-4 范围（Plan 的 48dp 规范只约束 chip），建议后续统一。
- P3-4：`library-clear-filters` 用例（`libraryFilter.test.tsx:219-223`）未断言搜索框 `value` 被清空（只验了 chip 回「全部」+ 结果恢复）；`DEFAULT_ACTION_FILTERS`（`actionGroups.ts:55`）作为共享常量对象被直接塞进 state（`ActionLibraryScreen.tsx:51`、`:262`），当前全链路无原地写，若后续有人原地改会串状态，可考虑 `Object.freeze` 或改工厂函数。

## 七查结论

1. **DEV_BASELINE 一致**：B-4 属 `CHANGE_REQUEST: B`，Plan（`PLAN-TASK-018...md:3-4`）锁定 `DEV_BASELINE=PRODUCT_PLAN_V1.2` 不改；diff 未触碰任何 Plan/版本文件。PASS。
2. **Requirement 覆盖**（对照 HANDOFF B-4 ①-⑦ 与 HD-1=A 修正条）：①难度 chips 已移除、难度数据/编辑器/种子/流程模板角标未动（未在 diff）；②chips 顺序 `全部→颈→肩→胸→背→腰腹→髋臀→腿→小腿→全身→其他`（`actionGroups.ts:42-46`），只列 `count>0`、「其他」条件追加（`:130-140`）；③HD-1=A：单选（`ActionFilters.bodyPart` 单值 + `radio/selected`）、交集命中（`:104-112`）、同一屏去重（每场景只 `filter` 一次，`key={action.id}` 无重复渲染）、组头 badge=当前显示唯一卡片数（`:166-185` + `ActionLibraryScreen.tsx:187,199`）；④多组同开时部位只作用活动场景（`:170` `scene === activeScene`）；⑤三场景平铺、二级部位标题与 `library-subgroup-*` 已删；⑥搜索全局（`:167`）+ 并存 AND（`:166-174`）；⑦DoD 见第 3 点。PASS。
3. **DoD 达成**：Plan 单测项（chips 生成/顺序/空项剔除/「其他」条件出现、交集命中、trim+大小写、搜索 AND 部位、非活动组只受搜索、空场景删除、失效回退、单选去重+badge、语义写进测试名）逐条在 `actionGroups.test.ts` 有对应用例；集成项除 P2-1 两条外均有断言，且按 Plan `:147` 要求同时断言 testID + `radiogroup/radio/accessibilityState.selected`/label + UI 结果（含 `minHeight: 48`，`libraryFilter.test.tsx:108`）。旧测试为“改成新语义”而非改松：被删断言均有等价新断言（唯一归属→交集、难度过滤→搜索/部位、二级分组→chips、去重断言原样保留），`filter-difficulty-*`/`library-subgroup-*` 以负向断言固化不再依赖。PASS（缺口见 P2-1）。
4. **Diff 越界**：仅 5 个业务/测试文件 + 新增 Plan；未动 Routine 侧（`routineGroups`/模板页角标未在 diff）、DB/migration、种子、`android/`、依赖（`package.json` 未变）、其它 docs。`HANDOFF.md`/`DISPATCH-LOG.jsonl` 为 TM 记账、`PLAN-TASK-018...md` 为 planner 产出，不计 Builder 越界。PASS。
5. **回归影响**：全库 grep 无 `DIFFICULTY_FILTERS`/`DifficultyFilter`/`filterActions`/`matchesActionFilters`/`bodyPartOfAction`/`BODY_PART_GROUP_ORDER`/`ActionBodyPartGroup`/`library-filter-chips` 悬挂引用（仅 Plan 文本与历史 review 提及）；难度字段仍在 `TagFields`（`src/domain/tags.ts:45`）且编辑器未改，`routineGroups` 测试全绿；三场景平铺后同一动作只归属一个场景，无重复 key/重复卡片；折叠记忆（`expandedOverrides`）保留，搜索仍“命中组默认展开、显式折叠优先”，部位筛选刻意不触发自动展开。唯一行为差异（默认展开由 `groups[0]` 改为固定拉伸）仅在拉伸数据为空时可见，已记 P2-2。PASS。
6. **P0-P2 分级**：P0=0；P1=1（非阻塞，体验/口径项）；P2=3；P3=4。
7. **可回滚性**：改动均为工作区未提交的同一批文件，一次 `git checkout --`（或提交后一次 `git revert`）即可干净撤回；无 DB 迁移、无种子变更、无依赖/资产变更，筛选状态为页面内 state 不落库，回滚不产生残留数据。PASS。

## 验证（本人复跑，非采信自述）

- `npm test -- --runInBand src/tests/domain/actionGroups.test.ts src/tests/integration/libraryFilter.test.tsx`：2 suites / 20 tests 全过。
- `npm test -- --runInBand`：35 suites / 254 tests 全过。
- `npm run typecheck`：exit 0。
- 与 TM 提供的自测证据一致。

## Round 2（返工后 delta 复核，2026-09-19）

- 复核对象：工作区未提交 diff（HEAD=554bb5a）。`git status` 核对，本轮 Builder 只动 `ActionLibraryScreen.tsx` / `ActionFilterBar.tsx` / `libraryFilter.test.tsx`；`actionGroups.ts`、`actionGroups.test.ts` 为本轮未动的上一轮产物，`HANDOFF.md`、`DISPATCH-LOG.jsonl` 为 TM 记账，`docs/pm/`、`docs/qa/` 为 planner/QA 产出，均不计 Builder 越界。
- Result：**过（P0=0；blocking P1=0）**。⑨⑩ 实现正确、有可判假的集成测试；⑪ 已实现但缺集成断言（DoD ⑫ 达成 2/3），列 P2-1，不阻塞。
- 上轮 P1-1（可见归属缺失）、P2-3（搜索态点非活动组头两次点按，即 QA C-2）在本轮被修复；P2-1（两条集成断言缺失）已补齐。P2-2 仍挂账（本轮未动其路径）。

### 逐条核对

**1｜⑨ 认领规则（`ActionLibraryScreen.tsx:88-102`）— 通过**

`scene !== activeScene` 分支完成「认领 + 重置部位 + 保持展开 + 本次不收起」，`return` 阻断收起路径；`scene === activeScene` 才走 `:101` 的展开/收起切换。逐点核查：

- **无「永远无法收起」的死角**：非活动组第 1 次点按认领并保证展开（`:96-98`），第 2 次点按它已是活动场景，走 `:101` 收起；活动组 1 次点按即收起。对 `expandedOverrides[key]` 为 `undefined`/`true`/`false` 三种取值穷举：`undefined`→`previous[key]` 假 → 置 `true`（展开）；`true`→返回 `previous`（保持展开）；`false`→`previous[key]` 为假 → 置 `true`（展开）。三态都落在「展开」，随后都能被 `:101` 收起。**不存在死角**。
- **`previous[key] ? previous : {...}` 不会把「已显式收起」误当「保持展开」**：`false` 是假值，走 else 置 `true`，正是 ⑨ 要求的「把它展开」（`libraryFilter.test.tsx:143-147` 实测：拉伸先收起→认领热身→再点拉伸即展开）。
- **认领是否重置部位为「全部」**：是，`:91-95` 把 `bodyPart` 拉回 `DEFAULT_ACTION_FILTERS.bodyPart`（`actionGroups.ts:55` = `全部`），无变化时返回原对象避免多余渲染。对应断言 `libraryFilter.test.tsx:130`、`:262`。
- **是否误改其它组展开态**：否。`:96-98` 只写 `[key]`，其余靠 `...previous` 保留；`:232`（收起拉伸）→`:233-239` 断言认领热身后拉伸**仍为收起**，可判假。
- 搜索态下的原 C-2 路径已被覆盖：`:247-258` 断言「搜索激活、热身已默认展开时点热身」→ 仍展开 + chips 切到热身（旧 `!expanded && scene!==activeScene` 实现此处会收起，见第 4 点）。

**2｜⑩ 无匹配提示（`:103`）— 通过**

`activeSceneEmpty = !groups.some(g => g.scene === activeScene)`，`groups` 来自 `groupActions`（`actionGroups.ts:158-189`，空场景 `continue` 丢弃），故判定语义是「活动场景过滤后 0 命中」，**不是**「数据层为 0」，不会破坏 plan 规则 5。反向验证：若改成数据层判定，`libraryFilter.test.tsx:280` 的 `getByText('拉伸部位（当前无匹配）')` 必红（拉伸数据层有 5 条）。文案在 `ActionFilterBar.tsx:50-52` 为独立 `<Text>`，只改可见文字；chips 数据源是 `bodyPartChipsForScene(actions, …)`（`:74-77`，走全量 `actions` 而非 `groups`），`:284-286` 断言 0 命中时 6 枚 chip 一枚不少，未被收缩/隐藏。chip 的 `accessibilityLabel`（`:62`）保持不带「当前无匹配」，读屏语义干净。

**3｜⑪ chip minWidth（`ActionFilterBar.tsx:110-111`）— 实现正确，测试未覆盖（见 P2-1）**

`styles.chip` 现为 `minHeight: MIN_TOUCH_SIZE` + `minWidth: MIN_TOUCH_SIZE`（`shared/theme.ts:35` = 48）。布局副作用：chips 容器本就是 `flexWrap: 'wrap'`（`:98-103`），`:104-108` 的 `chipsSceneLabel` 用 `width: '100%'` 独占一行，单字 chip 由 42.5dp 撑到 48dp 只增加换行概率、不引入截断或横向溢出（QA 在 `font_scale=1.5` 下实测两行不截断，属同布局回归面）。**无布局副作用，无越界。**

**4｜测试改造是否被改松 — 未改松，且新增用例可判假**

- 上轮 P2-1 的「收起非活动组不改变 chips」在 ⑨ 下**作为动作已不可达**（非活动组点按必认领+展开，不存在「点一下把它收起」），前提消失是 ⑨ 的必然结果，不是偷懒删测。等价不变量由 `:228-245` 守护：先收起拉伸（此刻仍活动）再认领热身，构造出「非活动且已收起」的终态，断言 chips 仍归热身、`腿` 仍选中、拉伸卡不渲染 —— 语义等价且可判假。
- 上轮 P2-1 的另一条「选部位不自动展开其它组」由 `:291-318` 守护：活动组被显式收起后点 chip，断言拉伸仍收起、`:304-307` 热身/核心训练仍收起、手动展开后才见结果。若有人把 `bodyPart` 混进 `searchActive`（`:78-80` 正是为此显式排除），此用例必红。
- 被改写用例 `:140-166` 语义未降级：仍断言「部位只改活动场景（热身数恒 2 + 两张卡在）」，只是把「收起非活动组」改成 ⑨ 下可达的「收起活动组不改变归属」（`:159-163` 断言 chips 仍归拉伸、`颈` 仍选中、卡不渲染）。
- 新增 ⑨ 用例 `:247-271` **可判假**：旧实现（`!expanded && scene !== activeScene` 才切换）在搜索态下热身已展开，点它只会走收起分支 → `:259` 的 `toBeExpanded()` 与 `:260` chips 归属断言必红。新增 ⑩ 用例 `:273-289` 同样可判假（见第 2 点）。无恒真断言（无 `expect(true)`、无只断言「元素存在」而不区分状态的写法）。

**5｜回归与越界 — 通过**

- 默认展开 `:83-85`（固定 `library-group-拉伸`，不随活动场景漂移）；搜索自动展开（`searchActive` 进 `isExpanded`）；折叠记忆（`expandedOverrides` 跨场景保留，`:101` 只改单键）；部位只作用活动场景（`actionGroups.ts:170` `scene === activeScene`）；搜索全局（`:166-174` 对所有场景先应用）；清除筛选（`ActionLibraryScreen.tsx:269` 恢复 `DEFAULT_ACTION_FILTERS`，不动 `activeScene`）。六项在测试与代码中均有对应，未被 ⑨ 触碰。
- 越界：仅 3 文件，未动 `actionGroups.ts`/难度数据/编辑器/种子/流程模板页/`package.json`/`android/`/其它 docs；无新增依赖、无 DB、无持久化字段。

**6｜DoD ⑫ — 达成 2/3**

⑨ 有集成覆盖（`:247-271`，另 `:140`、`:228` 加固）；⑩ 有集成覆盖（`:273-289`）；**⑪ 无集成断言**（全仓 `toHaveStyle` 只有 `:108` 的 `minHeight: 48`，`minWidth` 零断言，见 P2-1）。⑫ 的「真机复验」属 QA 环节，本报告不作结论，仅提示：QA 上一轮取证（含 C-2 的 33/34/35 与 P3-1 的 42.5dp 宽度）发生在 ⑨⑩⑪ 落地**之前**，需重跑。

### Findings

- **P0 = 0。**
- **blocking P1 = 0。**（上轮 P1-1、本轮 ⑨⑩⑪ 三条 Requirement 中的 ⑨⑩⑪ 实现层均正确落地；无越界、无回归、可回滚性不变——仍是同一批未提交工作区文件，`git checkout --` 一次撤回。）
- **P2-1（DoD ⑫ 部分未达，非阻塞）**：⑪ 只有实现、没有集成断言。`src/tests/integration/libraryFilter.test.tsx:108` 仅断言 `{ minHeight: 48 }`，把 `ActionFilterBar.tsx:111` 的 `minWidth` 删掉测试不会红；`:107` 的注释「触控目标使用项目 MIN_TOUCH_SIZE（48）」与实际覆盖面不符。改法（1 行，建议随 QA 复验前顺手补，属 Change A，不重开 Plan）：
  ```tsx
  expect(screen.getByTestId('filter-bodypart-颈')).toHaveStyle({
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
  });
  ```
  （需在文件头 `import { MIN_TOUCH_SIZE } from '../../../shared/theme';`；选单字 chip `颈` 更能代表 QA 实测的 42.5dp 场景。）
- **P2-2（顺延，未修）**：活动场景在数据层为空时 chips/默认展开指向空组（`ActionLibraryScreen.tsx:83`）。⑩ 的标注在该态下会显示「拉伸部位（当前无匹配）」，比上轮更可解释，但根因未除。修法见上轮 P2-2，判定条件必须用「该场景动作数为 0」而非「筛选后为 0」，勿破坏 plan 规则 5。
- **P3-5（本轮新增，注释陈旧）**：`ActionLibraryScreen.tsx:37-40` 文件头仍写「The active scene is the last one the user expanded」「选择部位永不自动展开」式的旧口径；⑨ 已改为「点谁谁成为筛选对象」。`:86-87` 的行内注释是新的，仅文件头未同步。纯注释，不影响行为。
- **P2-3 状态更新**：上轮 P2-3（搜索态点非活动组头需两次点按，= QA C-2）**由 ⑨ 闭环**，可在 TM 侧标记关闭（真机复验后）。
- P3-1（`BodyPartChip.count` 未用）、P3-2（部位表重复定义）、P3-3（组头 minHeight=44）、P3-4（clear-filters 未断言搜索框清空 / `DEFAULT_ACTION_FILTERS` 共享常量）维持上轮口径，本轮未扩大。

### 本轮独立验证（本人复跑，非采信自述）

- `npm test -- --runInBand src/tests/domain/actionGroups.test.ts src/tests/integration/libraryFilter.test.tsx`：2 suites / **24** tests 全过，exit 0。
- `npm test -- --runInBand`：35 suites / **258** tests 全过，exit 0。
- `npm run typecheck`：exit 0。
- `git status`：改动面与本轮声明一致（3 文件），无新增文件与意外路径。
