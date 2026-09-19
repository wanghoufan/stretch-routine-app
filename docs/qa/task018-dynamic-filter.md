# QA｜TASK-018 动作库动态部位筛选（B-4，HD-1=A）真机＋自动化验收

- 日期：2026-09-19
- 结论：**PASS**（P0=0 / blocking P1=0）；新增 P2×1、P3×1 记 backlog，不阻塞本轮
- 验收对象：工作区未提交 diff（HEAD=554bb5a），业务改动 5 文件 `actionGroups.ts` / `ActionFilterBar.tsx` / `ActionLibraryScreen.tsx` / `actionGroups.test.ts` / `libraryFilter.test.tsx`
- 真机证据目录：`/tmp/orca-qa-018/`（34 张 PNG + 同名 uiautomator XML）

| Bug ID | Priority | Stage P0 Blocking? | Repro | Status | Current Task | 备注（截图/日志一句） |
|---|---|---:|---|---|---|---|
| T018-QA-P2-1 | P2 | 否 | 搜索激活时点非活动组头只收起不切场景；活动场景 0 命中时 chips 控制屏幕上不存在的组 | OPEN（判需改，本轮不改代码） | TASK-018 | 见「悬案结论 C-2」，证据 33/34/35 |
| T018-QA-P3-1 | P3 | 否 | 单字 chip 宽度 42.5–42.9dp < 48dp（高度 48dp 达标） | OPEN（backlog） | TASK-018 | 01-library-default.xml 实测，Plan「必要时 minWidth≥48」未设 |

> 无 P0、无新增 blocking P1。code-reviewer 的 P1-1（活动场景可见归属缺失）在本轮返工产物中已修复，真机验证通过（见 C-1）。

## 真机QA会话能力预检结果（每真机session正式用例前必填，PASS才进正式QA，否则停）

> 判据：`ok=true/exit 0/工具调用成功`但无状态或像素变化一律记 `FAIL_UNVERIFIED_ACTION`；禁跨模型/跨Runtime/跨session拼PASS。

- 日期/任务名：2026-09-19／TASK-018 动作库动态部位筛选真机验收
- session ID：本窗口直驱（无外部 session）
- 模型精确ID：本窗口（qa=true codex/gpt-5.6-luna，按 qa 卡「真机直驱」走本窗口 bash 直驱，不适用外部模型 ID）
- Runtime：本窗口 bash 直驱（adb；codex 沙箱对 adb 必 BLOCKED，按 qa 卡例外直驱）
- 原生CUA是否实际注入：未注入（本任务走 adb 直驱，不依赖 CUA；`mcp__cua_repl.js` 本 session 不存在）
- 可用工具精确名称：adb（devices/shell/exec-out）＋ screencap ＋ uiautomator dump ＋ input（tap/swipe/text/keyevent）＋ `wm size/density` ＋ `settings get/put system font_scale` ＋ jest ＋ tsc
- CLI备用入口是否存在：不适用（本窗口 bash 即通道）
- Orca Runtime（`orca status --json` 实时结果，禁沿用旧报告）：不适用（直驱，未调用 orca CLI）
- 能力（`orca computer capabilities --json` 实时结果）：不适用（直驱）
- 权限（`orca computer permissions --json` 实时结果）：不适用（直驱）；adb device 在线，screencap/input/uiautomator 实测可用
- 读屏结果（事先指定可见文字，禁拿date/静态文件/命令输出冒充）：PASS。`uiautomator dump` 取到「我的流程／动作库／设置／共 9 个流程／日常拉伸（2）／晨间全身拉伸」等真实界面文本（00-precheck-home.xml）
- 截图结果（真实截图核对目标窗口＋像素尺寸）：PASS。`00-precheck-home.png` 与控件树文本互验一致，设备 1080x2460 @ density 440（2.75 px/dp），前台 `host.exp.exponent/.experience.ExperienceActivity`
- 点击并恢复结果（只点无副作用控件如切换侧边栏，读动作后状态确认变化，刷新元素索引后恢复，窗口变化后重取状态禁复用旧索引）：PASS。点按「动作库」(694,291) → 页面从首页切到动作库（读屏文本由「我的流程」变为「拉伸部位／全部／颈…」）；点按「返回」(130,291) → 回到首页「我的流程」。每步均重新 dump，未复用旧索引
- 输入并清除结果（专用测试框写 `QA-CUA-CANARY`，AX值＋像素/真实UI双验，清除残留禁按Enter）：PASS（部分受限）。`library-search` 写入 ASCII 串后 `text=` 同步变化、`library-empty` 出现；`keyevent 123 + 67×5` 清空后 `text=` 回落为 placeholder「搜索动作名称」且列表恢复。受限项：**中文无法经 shell 注入**（`adb shell input text '颈部'` 抛 `NullPointerException: Attempt to get length of null array @ InputShellCommand.sendText:344`；`cmd clipboard` 返回 `No shell command implementation`），按通道限制记录，非产品缺陷
- 滚动及可见位移结果（明确可滚动区域，必须观察到内容或像素位移，像素差为零记 `FAIL_UNVERIFIED_ACTION`）：PASS。`swipe 540 2200 540 400` 后可见文本由「90/90转体／上斜方肌加压」变为「青蛙式／靠墙肱二头肌拉伸」，像素与控件树同步位移（02a-scrolled-bottom.xml）
- 界面恢复确认（无残留）：PASS。收尾停在首页「我的流程／共 9 个流程」；动作库恢复 36/12/11；演示动作 `QAOTHER18` 已删除并复核无残留（`grep QAOTHER *.xml` 仅命中创建/筛选/删除对话框三步，22 之后无）；系统 `font_scale` 由 1.17→1.3/1.5 后**已还原为 1.17**
- 最终结论：**PASS**
- 原始错误摘要：`adb shell input text` 中文抛 NPE（HyperOS 输入服务，与 TASK-015 记录一致）；`adb shell cmd clipboard` 无实现
- 是否允许进入正式QA：YES

## 环境

| 项 | 值 |
|---|---|
| 设备 | xagapro（Redmi Note11T Pro，`22041216UC`），SN `IN9LZTAYV4UGU4JF`，USB |
| 屏幕/密度 | 1080x2460，density 440（2.75 px/dp） |
| 宿主 | Expo Go `host.exp.exponent` 57.0.9；RN 0.86.3 |
| Metro | `curl http://127.0.0.1:8081/status` → 200；`adb reverse tcp:8081 tcp:8081` 已建立 |
| 系统字号 | 基线 font_scale=1.17；用例中临时改 1.3 / 1.5 测放大，**已还原 1.17** |
| 音频 | 本轮无音频，未执行拔线流程，USB 全程连接 |

> 全程 `export ANDROID_SERIAL=IN9LZTAYV4UGU4JF`；`adb devices` 同时在线 ruby 设备，未对其下发任何命令。

## A. 自动化验收（真跑，看 exit 码）

| # | 命令 | exit | 真实计数 |
|---|---|---:|---|
| A1 | `npm test -- --runInBand src/tests/domain/actionGroups.test.ts src/tests/integration/libraryFilter.test.tsx` | **0** | 2 suites passed / 2，Tests **22 passed / 22** |
| A2 | `npm test -- --runInBand` | **0** | 35 suites passed / 35，Tests **256 passed / 256** |
| A3 | `npm run typecheck` | **0** | `tsc --noEmit` 无输出 |

- 三份原始日志：`/tmp/orca-qa-018-a1.log`、`-a2.log`、`-a3.log`。
- 与 code-reviewer 报告（20 tests / 254 tests）的差值 **+2** 与本轮返工「补 P2-1 两条集成断言」吻合，无红灯、无 skip。**A 部分 PASS**。

## B. 真机验收（xagapro / Expo Go）

### B1 默认态：**PASS**
- 可见文字 **「拉伸部位」** 独占一行（bounds `[44,539][1036,597]`），chips 容器 `library-bodypart-chips-拉伸`（`[44,539][1036,905]`）。
- chips 顺序与可见文字：`全部 → 颈 → 肩 → 胸 → 背 → 腰腹 → 髋臀 → 腿 → 小腿 → 全身`（10 枚，分两行）。拉伸场景 9 个部位 count 均 >0（种子：颈5/肩12/胸3/背9/腰腹7/髋臀9/腿7/小腿2/全身1），故无遗漏项；**无「其他」**（拉伸无无部位标签动作）。
- **无难度 chips**：全量 dump `grep filter-difficulty` 零命中；UI 无 全部/低/中/高 难度控件。
- **无二级部位标题**：全量 dump 中 `（数字）` 只出现在首页流程分组头（日常拉伸（2）等，属 B-3④ 流程模板页，不在本任务范围），动作库内零命中；`grep library-subgroup` 零命中。
- 组头 `拉伸` badge=**36**、收起态。
- 证据：`01-library-default.png` / `01-library-default.xml`

### B2 活动场景切换：**PASS**
- 展开 `热身` → chips 整体换为 `全部 → 肩 → 腰腹 → 髋臀 → 腿 → 小腿 → 全身`（7 枚，容器 `library-bodypart-chips-热身`，label「筛选热身部位」），与种子热身实际部位集合逐一吻合（肩3/腰腹4/髋臀1/腿5/小腿1/全身4）。
- 展开 `核心训练` → chips 换为 `全部 → 背 → 腰腹 → 髋臀`（4 枚，容器 `library-bodypart-chips-核心训练`），与种子核心部位一致（背1/腰腹10/髋臀4）。
- **多组可同时展开**：一屏内同时存在 `library-group-拉伸`(36,收起) `library-group-热身`(12,收起) `library-group-核心训练`(11,收起)，三组均展开。
- 证据：`04-expand-warmup.png`、`05-expand-core.png`、`05b-core-chips-top.png`、`04-expand-warmup.xml`、`05b.xml`

### B3 单选 + 交集命中 + 去重（HD-1=A）：**PASS**
- 拉伸点 `肩` → badge **12**，逐屏收集到 12 张卡片：颈部侧屈拉伸／上斜方肌拉伸／肩胛提肌拉伸／上斜方肌加压／十字肩拉伸／毛巾绕肩／开门胸部拉伸／靠墙胸部拉伸／扶墙三角度胸拉伸／肱三头肌拉伸／靠墙肱二头肌拉伸／前臂拉伸 —— 与 `src/data/seeds.ts` 中 `bodypart ∋ 肩` 的 12 条**集合完全一致**。
- 拉伸点 `颈` → badge **5**，5 张卡片：颈部侧屈拉伸／上斜方肌拉伸／肩胛提肌拉伸／颈部旋转／上斜方肌加压 —— 与种子一致。
- 拉伸点 `髋臀` → badge **9**，与种子 9 条一致。
- **交集命中**：`颈 ∩ 肩 = 4`（颈部侧屈拉伸、上斜方肌拉伸、肩胛提肌拉伸、上斜方肌加压）在两次单选中**都出现**，即多部位动作按「与所选部位有交集」命中。
- **去重**：三组筛选下 badge 数（12/5/9）等于逐屏收集到的唯一卡片数，且等于种子条数；渲染列表无同名卡片重复（若重复渲染 badge 会大于种子数），同屏不重复出现同一张卡片。
- 证据：`06-select-shoulder.png`/`.xml`（肩，badge 12）、`10-neck-filter.png` 与 `neck_*.xml`（颈，badge 5）、`07-select-hip.png`/`.xml` + `07b.xml`（髋臀，badge 9）、`12-shoulder-filter.png` 与 `shoulder_*.xml`

### B4 作用域（部位只改活动场景）：**PASS**
- 在 `拉伸` 为活动场景、`髋臀` 已选（拉伸 badge=9）时同屏读取：
  - `library-group-拉伸-count` = **9**（被部位筛选）
  - `library-group-热身-count` = **12**（完整，未受部位影响）
  - `library-group-核心训练-count` = **11**（完整，未受部位影响）
- 收起活动场景不改变归属：收起 `拉伸` 后 chips 仍为「拉伸部位」+ 全部拉伸部位集合（`03-collapse-stretch.png`/`.xml`），符合 Plan 规则 1。
- 选择部位不自动展开其他组：B4 全程 `热身`/`核心训练` 的展开态由用户操作决定，点 chip 前后未变化。
- 证据：`08-scope-hip.png`、`08.xml`（拉伸9）、`08c.xml`（热身12）、`08d-scope-core.png`、`08f.xml`（核心11）

### B5 搜索与部位 AND（全局搜索）：**PASS（中文输入受限，见 C-3）**
- 搜索 `90`（ASCII，命中 `90/90转体`，其 bodypart=['髋臀']）+ 选 `髋臀` → `library-group-拉伸-count` = **1**，列表仅 `90/90转体`：搜索与部位**同时生效（AND）**。
- 搜索 `90` + 选 `肩` → 出现 `library-empty`（「没有符合条件的动作」）：`90/90转体` 通过搜索但未通过部位，被正确剔除。
- **搜索作用于所有场景**：搜索 `90` 时 `热身`/`核心训练` 两组整体消失（它们无 `90` 命中）；若搜索只作用于活动场景，二者会以全量显示。
- chips 不随搜索收缩：上述任一状态下 chips 仍为完整 10 枚固定顺序（Plan 规则 4）。
- 证据：`15-search90-hip.png`/`.xml`（badge 1）、`13-search90-shoulder.png`/`.xml`（library-empty）、`27-p23-step1-search.png`/`33.xml`

### B6 「其他」：**PASS（负例＋正例均验，测试数据已清除）**
- **负例**：种子三场景均无「无规范部位」动作（脚本核对 59 条种子动作全部含规范部位），真机三个场景的 chips 均**不含**「其他」。
- **正例**：动作编辑器不含 bodypart 字段 → 新建动作天然无部位。新建 `QAOTHER18`（名称因输入法被规范为 `－QAOTHER18`）后：
  - chips 末尾**追加** `filter-bodypart-其他`（`[740,773][904,905]`，排在「全身」之后）；
  - 点「其他」→ `selected=true`，`library-group-拉伸-count` = **1**，列表仅该动作；同时 `library-group-热身-count` 仍为 12（非活动场景不受影响）。
- **清理**：经界面删除该动作后，「其他」chip **消失**，拉伸 badge 回到 **36**，且所选 `其他` 因不再存在而**自动回退「全部」**（顺带验证 Plan 规则 9 的失效选择回退）。控制树残留检查：`grep QAOTHER *.xml` 仅命中创建/筛选/删除三步（18/20/21），22 起零命中。
- 证据：`19-other-chip-appeared.png`、`20-other-filter.png`、`21-delete-dialog.png`、`22-after-delete.png` 及对应 XML

### B7 空结果与清除筛选：**PASS**
- `library-empty` 出现（标题「没有符合条件的动作」+「清除筛选」按钮），触发条件见 B5。
- 点 `library-clear-filters` → 搜索框 `text=` 回落为 placeholder（已清空）、`filter-bodypart-全部` `selected=true`、拉伸 badge 恢复 **36** 且列表重现。
- **活动场景保留**：chip 条容器仍为 `library-bodypart-chips-拉伸`、可见文字仍为「拉伸部位」（Plan 规则 5）。
- 证据：`13-search90-shoulder.png`、`14-clear-filters.png`/`14clear.xml`

### B8 触控与可见性：**PASS（高度达标；宽度见 P3）**
- chip 可点区域（控件树 bounds，density 440）：

| chip | px | dp |
|---|---|---|
| 全部 | 164×132 | 59.6 × **48.0** |
| 颈/胸/腿 | 117×132 | 42.5 × **48.0** |
| 肩/背 | 118×132 | 42.9 × **48.0** |
| 腰腹/全身 | 163×132 | 59.3 × **48.0** |
| 髋臀/小腿 | 164×132 | 59.6 × **48.0** |

  全部 chip **高度 = 48.0dp**，达到 `MIN_TOUCH_SIZE`；单字 chip 宽度 42.5–42.9dp（见 P3）。
- 文字放大：`font_scale` 1.3 与 **1.5** 两次实测，chips 的 10 个标签、「拉伸部位」、组头「拉伸 36 收起」全部完整显示，无截断、无溢出、无换行挤压（chips 仍两行排布，容器高 373px）。测试后已还原 1.17。
- 证据：`37-font13-library.png`、`38-font15-library.png` 及 37.xml/38.xml

### B9 无障碍：**PASS（含 2 项 dump 不可导出字段的如实说明）**
- 容器 label 随活动场景：`content-desc` = **筛选拉伸部位 / 筛选热身部位 / 筛选核心训练部位**（`library-bodypart-chips-{场景}`），满足「label 含活动场景」。
- 每个 chip：`class=android.widget.RadioButton`（role=radio），`content-desc` = `{场景}部位：{部位}`（如「拉伸部位：肩」），`selected` 随点按正确翻转——实测 `全部 true` → `肩 true` → `髋臀 true` → `其他 true` → 删除后回 `全部 true`，其余恒 false，单选语义正确。
- 场景组头：`class=android.widget.Button`、`content-desc` = 「拉伸，36个动作」/「热身，12个动作」/「核心训练，11个动作」，`clickable=true`、`focusable=true`。
- **未能从控件树直接取证的两项（框架/dump 限制，非产品缺陷）**：
  1. 容器 `role=radiogroup`：代码已设（`ActionFilterBar.tsx:44`），RN 0.86.3 将该角色实现为 `nodeInfo.roleDescription`（`node_modules/react-native/ReactAndroid/.../ReactAccessibilityDelegate.kt:696`），而 `uiautomator dump` 不导出 roleDescription，故 dump 中该节点 class 为 `android.view.View`。**未用 TalkBack 复听**（需拔线，且本轮无音频需求）。
  2. 组头 `expanded` 状态：RN 将其实现为 `ACTION_EXPAND/ACTION_COLLAPSE`（同文件 :74-78），dump 不含该字段。已用可见文案一对一替代验证：收起态显示「展开」、展开态显示「收起」，与 B1/B2/B3 的状态变化逐条一致。
- 证据：`01-library-default.xml`、`22.xml`、`04-expand-warmup.xml`（`library-bodypart-chips-热身` + content-desc）

### B10 回归抽验：**PASS（其中「编辑器难度读改」前提与现状不符，见说明）**
- **流程模板页（首页）分组与难度角标未受影响**：分组头 `日常拉伸（2）`／`健身前后（3）`／`热身（1）`／`核心（3）`；核心三模板角标齐：`初级核心`+`低`(`content-desc=难度低`)、`中级核心`+`中`(`难度中`)、`高级核心`+`高`(`难度高`)。证据 `29-home-core-badges.png`/`29.xml`、`00-precheck-home.png`。
- **「动作编辑器里难度读改」**：本版本 `ActionEditor.tsx` **不含难度字段**（仅有 名称/默认时长/动作类型/默认朗读文本），且该文件**不在本轮 diff 中**（`git diff --name-only` 已核）。因此「在编辑器里读改难度」无 UI 入口，真机无法验证该表述——属任务前提与现状不符，非回归失败。难度读改的数据链路由既有测试 `src/tests/repositories/actionRepository.test.ts:72`「persists 场景/难度/部位 tags and updates them」覆盖，在 A2 全量 35 suites/256 tests 中通过。
- 动作编辑器本身可用（新建动作全流程走通，见 B6）。

## C. 必须回应的两个悬案

### C-1（原 code-reviewer P1-1）可见「{场景}部位」文字：**已修复合入，真机通过**
- 真机确认可见文字存在且独占一行（`[44,539][1036,597]`，width 100%），chips 在其下方自动换行，**未挤压布局**。
- 随活动场景跟随变化，实测序列：`拉伸部位`（默认）→ `热身部位`（展开热身）→ `核心训练部位`（展开核心训练）→ `拉伸部位`（再次展开拉伸）。可见文字与容器 `content-desc` 始终一致。
- 截图：`01-library-default.png`（拉伸部位）、`04-expand-warmup.png`（热身部位）、`05b-core-chips-top.png`（核心训练部位）、`06-select-shoulder.png`（切回拉伸部位）。

### C-2（code-reviewer P2-3）搜索态点非活动组头需两次点按：**复现成功，结论「别扭，建议改」（非阻塞）**
复现步骤（可重复）：
1. 进入动作库（新会话）→ 滚到 `热身` 组头并展开 → 活动场景切为 `热身`（chip 条=`library-bodypart-chips-热身`），此时 `拉伸` 组仍处于展开态；
2. 搜索框输入 `90` → 仅 `拉伸` 命中并保持展开，`热身` 组因 0 命中整体消失，chip 条仍为「热身部位」；
3. **第 1 次**点 `拉伸` 组头：只把 `拉伸` 收起（`收起`→`展开`），chip 条仍是 `library-bodypart-chips-热身`，活动场景未切换 —— 用户视角「点了没反应、结果反而消失」；
4. **第 2 次**点同一组头：`拉伸` 展开且活动场景切换，chip 条变为 `library-bodypart-chips-拉伸`。

- 证据：`33-p23-a-search-on.png`（搜索态）、`34-p23-b-first-tap.png`（第一次点按后，chip 条仍 热身）、`35-p23-c-second-tap.png`（第二次点按后，chip 条变 拉伸）及 `33.xml`/`34.xml`/`35.xml`。
- **判断：别扭，建议改**。理由：
  1. 与 Plan 规则 1 的字面规则一致（只有「由收起变展开」才切活动场景），但搜索态下所有命中组已被自动展开，用户想筛另一组的部位**必然要连点两次**，且第 1 次点按会让搜索结果整组消失，反馈与预期相反；
  2. 同源的现象（`ActionLibraryScreen.tsx:176-178` 空组隐藏 + 活动场景保持）导致 chip 条会**控制一个屏幕上完全不存在的组**：搜索 `90` 时屏上只有拉伸组，chip 条却写着「热身部位」，此时点任何 chip 都无可见反馈。P1-1 的可见归属标签修好后，这个「标签明说属于一个不存在的组」反而更刺眼。
- 影响面：仅搜索激活且活动场景命中为 0（或跨组筛选）的路径；不丢数据、不阻塞主流程。轻量改法（不在本轮实施，供 TM 决定是否走 Change B）：`toggleGroup` 中对「搜索态下已展开的非活动组」的首次点按改为「直接切活动场景」，或活动场景 0 命中时在 chip 条加一行「当前场景无命中，点组头切换」提示。

### C-3 未验证项与原因

| 项 | 状态 | 原因 |
|---|---|---|
| 真机中文搜索（如「颈部」「90」以外的中文词） | **NOT VERIFIED（通道限制）** | `adb shell input text '中文'` 在 HyperOS 抛 `NullPointerException @ InputShellCommand.sendText:344`；`cmd clipboard` 无实现；未安装第三方 ADB IME。搜索的 trim/大小写/子串语义由 `src/tests/domain/actionGroups.test.ts` + `libraryFilter.test.tsx` 覆盖并全绿（A1）。搜索的「位置/全局/AND」语义已用 ASCII `90` 在真机取证（B5） |
| chips 容器 `role=radiogroup` 的真机宣读 | **NOT VERIFIED（工具限制）** | RN 以 `roleDescription` 暴露，`uiautomator dump` 不导出；未启用 TalkBack 复听（需拔线音频链路，本轮无音频需求）。代码已设，chip 级 radio/selected 已真机取证 |
| 组头 `accessibilityState.expanded` 的 API 直读 | **NOT VERIFIED（工具限制）** | 同上，RN 以 ACTION_EXPAND/COLLAPSE 暴露，dump 无该字段；已用可见「收起/展开」文案一对一替代验证 |
| 「编辑器里动作难度读改」 | **N/A（前提不符）** | 本版本编辑器无难度字段，且该文件不在 diff 中（见 B10） |
| 拉伸数据为空时 chips/默认展开指向空组 | 未构造 | 属已知 P2-2（reviewer 挂账），需删光拉伸动作才可见，不在本轮 DoD |

## 结论

- **P0 = 0，blocking P1 = 0**。A 三条命令 exit 0；B 十项用例全部 PASS（B5/B9/B10 附受限说明，均已给出原因与替代证据）；两个悬案均给出真机结论（C-1 通过、C-2 判需改但不阻塞）。
- 新增挂账：**P2**（搜索态组头两次点按 + chips 控制隐藏组，C-2）、**P3**（单字 chip 宽度 42.5–42.9dp < 48dp，`ActionFilterBar.tsx:106` 未设 `minWidth`）。
- 测试数据全部清除，设备与系统设置（font_scale=1.17）已还原，无残留。

## Fix Attempt Fingerprint

- Task ID: TASK-018（QA 验收，不修代码）
- Root Cause Hypothesis: —
- Approach: 本窗口 adb 直驱真机取证（screencap + uiautomator dump + input）＋ jest/tsc 真跑看 exit 码
- Files Changed: 无业务代码改动；仅新增本报告 `docs/qa/task018-dynamic-filter.md`
- Verification: 见 A/B/C 各节与 `/tmp/orca-qa-018/`（34 PNG + XML）、`/tmp/orca-qa-018-a{1,2,3}.log`
- Failure Reason: —
- Difference From Previous Attempt: —

---

## 复验轮（返工 ⑨⑩⑪ 后，2026-09-19）

- Result：**PASS**（P0=0 / blocking P1=0）
- 复验对象：工作区未提交 diff，业务改动 **3 文件**（`ActionFilterBar.tsx` / `ActionLibraryScreen.tsx` / `libraryFilter.test.tsx`，按 mtime 相对 Metro 启动时刻枚举）
- 本轮证据目录：`/tmp/orca-qa-018-r2/`（PNG＋XML）；日志 `/tmp/orca-qa-018-r2-a{1,2,3}.log`
- 新增闭环：**P2-3 已闭环（CLOSED）**、**P3-1 已闭环（CLOSED）**；新开 1 条**环境/流程**发现 `ENV-018-1`（非产品缺陷）
- ⑨⑩⑪⑫ 判定：⑨ PASS、⑩ PASS、⑪ PASS、⑫ PASS

### E. 环境事件（先读，否则本轮证据会被误读）

**ENV-018-1｜设备曾长时间运行旧 bundle（非产品缺陷，环境/流程问题）**

- 现象：本轮首次真机操作（约 11:47 起）时，设备行为仍是**旧规则**——搜索态下点非活动组头只收起、不切场景（第 33/34/35 号同类现象）；chips 归属文案无「（当前无匹配）」；单字 chip 宽 42.5dp。
- 取证与根因（已定位到证据链）：
  1. `curl` 设备实际请求的 URL（`/index.ts.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=src%2Fapp&unstable_transformProfile=hermes-stable`，取自 `http://127.0.0.1:8081/` manifest 的 `launchAsset.url`）返回的 bundle **不含** `activeSceneEmpty`、不含 `（当前无匹配）`，其中 `ActionFilterBar` 是旧版（`children: \`${activeScene}部位\``，无 `minWidth: MIN_TOUCH_SIZE`）。同一时刻用**另一组参数**（`/index.bundle?platform=android&dev=true&minify=false`）取到的却是新代码 → 同一 Metro、同一磁盘源码，只有前者命中了一个陈旧缓存键。
  2. 进程时间线：Metro 启动 `11:02:17`；`ActionFilterBar.tsx` mtime `11:32:03`、`ActionLibraryScreen.tsx` mtime `11:36:53`。即编辑发生时 Metro 已在运行，其文件监听未使该 bundle 失效。
  3. `touch` 两个源文件（内容不变，sha256 前后一致，已核）后重取**仍旧**是旧 bundle → 内存缓存/监听失效，非磁盘 transform 缓存问题。
  4. 三次 `am force-stop` + `am start exp://127.0.0.1:8081`（含 `/--/` 变体）都只是重新取到同一份陈旧 bundle，设备侧无解。
- 处置（已恢复，低风险、可逆）：停掉旧 Metro（PID 66206）→ 同端口重启 `npx expo start --port 8081 --clear`（PID 558）→ 复取设备 URL，`activeSceneEmpty` 出现 4 次、`minWidth: _sharedTheme.MIN_TOUCH_SIZE` 出现、文案串为 `` `${activeScene}部位${activeSceneEmpty ? '（当前无匹配）' : ''}` `` → 判定 bundle 已刷新，此后全部用例重跑。
- 影响与提醒（给 TM/监督者）：
  1. **旧记录不失效**：上一轮 PASS 的取证发生在 ⑨⑩⑪ 落地之前的构建上，与当时验收对象自洽，不构成误判；但**本轮所有结论一律以刷新后的 bundle 为准**。
  2. 证据目录中 `01b-library-default-fresh.*`、`02a`～`07b`、`05a/05b` 均为**陈旧 bundle 期**抓图，仅作本事件佐证，**不作为任何结论依据**；有效证据从 `11-default-fresh.*` 起（每次操作前均先核 Metro `--clear` 后 bundle 已含 ⑨⑩⑪）。
  3. Metro 现由本 QA session 的后台进程承载（端口不变，`/status`=200）。**本 session 结束后若 8081 无 Metro，请 TM 重新拉起**；流程上建议：任何真机结论前先核「设备 URL 的 bundle 是否含本轮改动标记」，避免再次拿旧包验收。
- 处置中未触碰：业务源码内容（仅 `touch` 改 mtime）、其它 docs、`git`、ruby/pearl 设备、secrets。

### A. 自动化复验（真跑看 exit 码；均在新 bundle 刷新前执行，与真机结论独立）

| # | 命令 | exit | 真实计数 |
|---|---|---:|---|
| A1 | `npm test -- --runInBand src/tests/domain/actionGroups.test.ts src/tests/integration/libraryFilter.test.tsx` | **0** | 2 suites passed / 2，Tests **24 passed / 24** |
| A2 | `npm test -- --runInBand` | **0** | 35 suites passed / 35，Tests **258 passed / 258** |
| A3 | `npx tsc --noEmit` | **0** | 无输出（0 字节） |

- 与上一轮（22 / 256）差值均为 **+2**，与 ⑨⑩⑪ 新增两条集成用例吻合；无红灯、无 skip。
- ⑫「三条须有集成测试覆盖」按用例名逐条核对（`src/tests/integration/libraryFilter.test.tsx`）：
  - **⑪** `:108-111` 断言 chip `minHeight: MIN_TOUCH_SIZE` 且 `minWidth: MIN_TOUCH_SIZE`（脚本式断言，非仅文案）；
  - **⑨** `:251`「多组展开状态下点非活动组头：立即认领并保持展开、部位回全部，再次点击才收起」；`:232` 已收起的非活动组「点它才认领」；
  - **⑩** `:277-284`「活动场景 0 命中时归属文案标注「当前无匹配」，且 chip 选项不收缩」。
- 结论：**⑫ PASS**（覆盖存在，且 A1 全绿）。

### B. 真机复验（xagapro / Expo Go，均为刷新后 bundle）

#### B-⑨-1 核心复验（搜索激活态，C-2 直接闭环）：**PASS**
前置态（`18a-before-search.*`）：活动场景=**热身**、搜索框 `90` 已生效；`热身` 因 0 命中整组隐藏（chips 仍为 `library-bodypart-chips-热身`）；`拉伸` 命中 1 条、**处于展开态且非活动**（`library-group-拉伸` 文案「拉伸，1个动作」、「收起」）。
- **第 1 次点 `拉伸` 组头** →（`18b-search90-state.*` → `18c-after-1st-tap.*`）
  - chips 归属**已切换**：容器 `library-bodypart-chips-拉伸`，可见文案由「热身部位（当前无匹配）」变为「**拉伸部位**」（后缀随之消失）；
  - 部位选择**回到「全部」**：`filter-bodypart-全部` `selected=true`，其余 9 枚恒 false；
  - `拉伸` **保持展开**：组头仍是「收起」、bounds 未变 `[44,971][1036,1092]`、卡片 `90/90转体` 仍可见、badge=1；
  - **结果没有整组消失**：`library-group-拉伸` 仍在，`library-empty` 未出现。
- **第 2 次点同一组头** →（`18d-after-2nd-tap.*`）才收起：「展开」、卡片隐藏、badge 仍 1；chips 归属**不变**（仍 `-拉伸`、`全部` selected）。
- 对照证据：`18b`（第 1 次点按前）／`18c`（第 1 次点按后）／`18d`（第 2 次点按后），三张 PNG 与同名 XML 一一对应。

#### B-⑨-2 非搜索态：**PASS**
- 收起态非活动组一次点击即展开且认领：点 `热身`（收起）→ `08`/`12-warmup-claimed.*`：组头「收起」并渲染卡片，chips 切为 `library-bodypart-chips-热身`（7 枚 全部→肩→腰腹→髋臀→腿→小腿→全身，与种子热身部位集合一致），`全部` selected。
- 已展开的非活动组一次点击 → 认领且**不收起**：`14a`（点前：活动=热身、`肩`已选、`拉伸`展开 badge 36）→ 点 `拉伸` 组头 → `14b`：chips 切 `-拉伸`（10 枚）、`全部` selected（**由 `肩` 重置**）、`拉伸` 仍「收起」且 badge 仍 36、卡片仍在。
- 点自身活动组头 → 收起且归属不变：`14b` → `15-after-2nd-tap.*`：`拉伸` 变「展开」，chips 仍 `-拉伸`／`全部`；同屏 `热身` 仍「收起」（12，未被牵连）。
- 交叉印证：`17a/17b` 再次复现「已展开的非活动组被认领且保持展开」（`拉伸`→`热身`）。

#### B-⑩ 无匹配提示：**PASS**（两个来源各验一次，chip 数均未收缩）
- 来源 1（活动场景因**搜索** 0 命中 → 整组隐藏）：`16b-search90-warmup-active.*` — 活动=热身、搜索 `90`、`热身` 组隐藏；可见文案「**热身部位（当前无匹配）**」；chips 仍 **7 枚**（`全部/肩/腰腹/髋臀/腿/小腿/全身`），顺序与未筛选时一致，未隐藏。
- 来源 2（活动场景内**搜索 ∩ 部位 = 空**）：`19a-nomatch-active-scene.*` — 活动=拉伸、搜索 `90`、`颈`已选，`90/90转体`（bodypart=髋臀）被部位剔除 → 全部场景 0 命中（`library-empty` 出现）；可见文案「**拉伸部位（当前无匹配）**」；chips 仍 **10 枚**，testID 序列与默认态（`11-default-fresh.*`）**逐项相同**；`颈` 仅 `selected` 翻转，选项本身未收缩、未隐藏。
- 反例对照：`18c-after-1st-tap.*` 中活动场景重新有命中，后缀「（当前无匹配）」立即消失 → 该文案与「活动场景是否出现在列表」严格同源，非恒显。

#### B-⑪ chip 触控宽度：**PASS**（P3-1 闭环）
`11-default-fresh.xml`（density 440，2.75 px/dp）实测可点区域 bounds：

| chip | px | dp | 达标（≥48×48） |
|---|---|---|---|
| 全部 | 164×132 | 59.6 × **48.0** | ✓ |
| 颈/胸/腿 | 132×132 | **48.0** × **48.0** | ✓（上一轮 42.5） |
| 肩/背 | 132×132 | **48.0** × **48.0** | ✓（上一轮 42.9） |
| 腰腹/全身 | 163×132 | 59.3 × **48.0** | ✓ |
| 髋臀/小腿 | 164×132 | 59.6 × **48.0** | ✓ |

- 单字 chip 宽由 42.5–42.9dp → **48.0dp**，`minWidth: MIN_TOUCH_SIZE` 在真机生效；高度仍 48.0dp。
- **布局未被破坏**：两行排布，行内相邻 x 间隙恒为 22px（=8dp `spacing.sm`），**无重叠**（相邻右/左边界差 >0）；最右边界 1009px ≤ 容器右边界 1036px，**无溢出**；行高 132px=48dp 未被撑高。多字 chip（腰腹/髋臀/小腿/全身 59.3–59.6dp）宽度仅由文字决定，未被 `minWidth` 拉齐变形。
- 顺带复测（非本轮范围）：场景组头仍 `minHeight:44`（`11-default-fresh.xml` 组头 121px=44.0dp），即 backlog **P3-3 未变**，非本轮回归。

#### B-回归抽验：**PASS**
| 项 | 结论 | 证据 |
|---|---|---|
| 默认态=拉伸且仅首组展开 | ✓ 仅 `library-group-拉伸`（36，「收起」），热身/核心未渲染 | `11-default-fresh.*` |
| 三场景切换 chips 跟随 | ✓ 拉伸 10 枚／热身 7 枚（肩3·腰腹4·髋臀1·腿5·小腿1·全身4 全部>0）／核心训练 4 枚（全部+背+腰腹+髋臀），全部与种子集合逐一吻合；切核心时部位由 `肩` 自动回「全部」 | `12-warmup-claimed.*`、`21-core-chips.*` |
| 多组同时展开（非手风琴） | ✓ 同屏 `拉伸`＋`热身` 同时「收起」（`15`），`拉伸`＋`热身`＋`核心训练` 均可独立展开 | `15-after-2nd-tap.*`、`21-core-chips` 会话序列 |
| 交集命中 | ✓ `颈`∩`肩` 卡片集合交集=**4**，与种子 `levator-scapulae / neck-side-bend / upper-trap / upper-trap-press` 完全一致 | `/tmp/neck_ids.txt`、`/tmp/shoulder_ids.txt`、`seeds.ts` 脚本核对 |
| 同屏去重（HD-1=A） | ✓ `拉伸` 肩筛选 badge=**12**、跨屏分组枚举唯一卡片 id=**12**（=种子 12，32 次 dump 每次 ≥5 张卡片且 **`unique_in_dump` 恒等于 `IDS`**，即同一屏无重复卡片）；`颈` badge=5、枚举唯一 id=**5**（=种子 5） | `20a/20c/20d`、`24-shoulder-start.xml`、`/tmp/sh_ids.txt`、`/tmp/dupcheck.txt` |
| 部位只作用活动场景 | ✓ 活动=拉伸选 `肩` 时：拉伸 12（被筛）／热身 12／核心训练 11（均未受影响）；活动切核心后拉伸回到 36 | `20a-shoulder.*`、`13b`、`21-core-chips.*` |
| 搜索全局 | ✓ 搜索 `90` 时热身、核心整组消失（若只作用于活动组，二者会以全量出现） | `18b-search90-state.*` |
| 「全部」复位 | ✓ 点 `全部` 后 badge 恢复 36、列表重现 | `19b-after-clear.*` |
| 清除筛选 | ✓ 搜索框回落 placeholder、`全部` selected、拉伸 36／热身 12 恢复，**活动场景保留**（容器仍 `-拉伸`） | `19b-after-clear.*` |
| 无障碍 role/label | ✓ chip 类 `android.widget.RadioButton`、`content-desc=「{场景}部位：{部位}」`、`selected` 单选翻转正确；容器 `content-desc` 随场景=**筛选拉伸部位／筛选热身部位／筛选核心训练部位**；组头 `android.widget.Button`、`content-desc=「{场景}，N个动作」`、`clickable=true` | `11-default-fresh.xml`、`21-core-chips.xml` |
| 难度 chips／二级部位标题已移除 | ✓ 全量 dump `filter-difficulty`、`library-subgroup` 零命中 | `11-default-fresh.xml` |
| 流程模板页难度角标未受影响 | ✓ 首页分组 `日常拉伸（2）/健身前后（3）/热身（1）/核心（3）`；核心三模板角标齐：`初级核心`+`低`(`content-desc=难度低`)、`中级核心`+`中`(`难度中`)、`高级核心`+`高`(`难度高`) | `22-home.*`、`22b-home-core-badges.png` |
| 动作难度读改 | **N/A（前提不符，同上轮）**：本版本 `ActionEditor.tsx` 无难度字段；且本轮改动仅 3 文件（`ActionFilterBar.tsx`/`ActionLibraryScreen.tsx`/`libraryFilter.test.tsx`，用 `find -newermt <Metro启动时刻>` 枚举），编辑器文件不在改动集内 | — |

### C. 未验证项与原因（本轮）

| 项 | 状态 | 原因 |
|---|---|---|
| 中文搜索词真机注入（如「颈部」） | **NOT VERIFIED（通道限制，已复核仍存在）** | 本轮再次实测 `adb shell input text '颈部'` → `java.lang.NullPointerException: Attempt to get length of null array @ InputShellCommand.sendText:344`；且**该命令 shell exit code 仍为 0**，只能靠 stderr 判定（沿用上轮结论）。搜索语义改用 ASCII `90` 取证，中文 trim/子串语义由 A1 单测覆盖 |
| TalkBack 真机宣读 `role=radiogroup` 与组头 `expanded` | **NOT VERIFIED（工具限制，同上轮）** | RN 以 `roleDescription`／`ACTION_EXPAND` 暴露，`uiautomator dump` 不导出；已用容器 `content-desc`（含活动场景）与「收起/展开」可见文案一对一替代 |
| 「其他」chip 正例 | 本轮**未重跑** | 种子三场景均无无部位标签动作，需再造演示数据；上轮已正负例验证并清理，本轮 ⑨⑩⑪ 未触碰该路径（`ActionFilterBar.tsx` 仅新增 `minWidth` 与文案后缀） |
| 系统字号 1.3/1.5 放大 | 本轮**未重跑** | 不在本轮回归清单；⑪ 只涉及 `minWidth`，`flexWrap` 布局未改。设备 `font_scale` 全程保持基线 **1.17**（收尾已核） |
| P2-2（拉伸数据为空时 chips/默认展开指向空组） | 未构造 | reviewer 挂账项，需删光拉伸动作，不在本轮范围 |

### D. 问题分级

| ID | 级别 | 结论 | 说明 |
|---|---|---|---|
| T018-QA-P2-3（搜索态点非活动组头需两次点按） | **CLOSED** | 已修复合入并真机通过 | 新规则「点谁谁成为筛选对象」在搜索态与普通态、收起态与展开态四种组合下均一次点击认领且不收起（B-⑨-1 / B-⑨-2），旧现象无法复现 |
| T018-QA-P3-1（单字 chip 宽 42.5–42.9dp <48dp） | **CLOSED** | 已修复合入并真机通过 | 单字 chip 实测 48.0×48.0dp；`integration` 断言 `minWidth: MIN_TOUCH_SIZE` |
| ENV-018-1（Metro 陈旧 bundle） | **环境/流程问题（非产品缺陷，不计 P0/P1）** | 已处置并复核 | 见「E. 环境事件」；建议 TM 将「先核设备 bundle 是否含本轮改动」列入真机验收前置 |
| P2-2 / P3-2 / P3-3 / P3-4 | 挂账不变 | 非本轮范围 | P3-3 本轮复测组头仍 44dp（未回归、未修） |

- **无 P0、无新增 P1；未发现新缺陷。**

### F. 本轮收尾

- 设备：停在首页「我的流程」（`23-final-home.png`、`25-final.*`）；动作库搜索框已清空、无演示数据残留（`25-final.xml` 全量 dump `QAOTHER`／`QA-CUA` 零命中）；软键盘已关闭；`font_scale`=**1.17** 未变；USB 全程连接、未执行拔线流程；**未对 ruby/pearl 下发任何命令**。
- 本机：Metro 于 8081 `--clear` 重启后 `/status`=200（后台由本 session 承载）；未改任何业务代码（`touch` 两文件 mtime，sha256 前后一致）；未改其它 docs；未执行任何 git 操作。
- 复验辅助脚本（存于证据目录，非仓库文件）：`parse.py`（dump 解析）、`collect_ids.py`（按组边界收集卡片 id）。
- 原始日志：`/tmp/orca-qa-018-r2-a1.log`、`-a2.log`、`-a3.log`；Metro 日志 `/tmp/orca-qa-018-metro.log`（旧实例）；集合文件 `/tmp/neck_ids.txt`、`/tmp/shoulder_ids.txt`、`/tmp/dupcheck.txt`。

## supervisor 复检（2026-09-19）

- 结论：**放行**（P0=0、blocking P1=0；前两轮意见与⑨⑩⑪均已闭环；无跳步、无越界）。TM 补记账清单（不阻塞业务，落盘前补齐）：① DISPATCH-LOG 补返工2/delta复核/返工3/复验轮行（现仅到返工1）；② HANDOFF 更新 Captured/当前 Task/未闭环（P2-3 与 P3-1 已 CLOSED、新增 P3-5 注释陈旧与 ENV-018-1 流程项）；③ TASK-MODEL-LOG 落盘 TASK-018 行（草稿已验过）。
- 1｜账本整文件校验：`TASK-MODEL-LOG.jsonl` 跑角色卡校验块，**exit 0**（现 19 行，TASK-018 未落盘属正常先验后落；`_example` 无，坏行 0）。
- 2｜TASK-018 草稿校验：落 `/tmp/one.jsonl` 跑同校验块，**exit 0**。JSON 合法、11 必需键齐、result=PASS / escalated=NO / reason=null 与实际相符、rework 为 int 且 **rework=0 正确**（本 Task 从未被 supervisor 打回；reviewer/qa 返工不计 rework，计入才打回；result PASS 与 qa 复验 PASS 自洽；model 与 override builder 行完全一致）。
- 3｜DISPATCH 整文件校验：跑角色卡 DISPATCH 校验块，**exit 0**（26 行，坏行 0；used 恒主、runtime 枚举合法）。纠正任务目标措辞：本轮新增为**最后 5 行**非 4 行（planner＋builder首轮＋reviewer＋builder返工1＋qa）。
- 4｜实派==表抽查：**通过（附记账滞后说明）**。5 行派工 model 与 `USER_MODEL_OVERRIDE.md` 逐行完全一致（planner=codex/gpt-5.6-sol/codex、builder=opencode-go/deepseek-v4.1-flash/opencode×2、reviewer=opencode/muse-spark-1.3-contributor-free/本窗口、qa=codex/gpt-5.6-luna/本窗口adb直驱），used 恒主，runtime 枚举合法；builder runtime=opencode（直调），HANDOFF 执行链明记 opencode 通道且旧 codebuddy 作废，无本窗口套娃证据。滞后项（TM 补记，不算派工偏离）：HANDOFF 头仍写 14/21 行＋256 测＋返工中/待 QA，实际已 19/26 行＋258 测＋复验 PASS；DISPATCH 缺返工2/delta/返工3/复验行。
- 5｜Phase Integrity 六查：**全过**。①PLAN 阶段无 builder/qa 派工；②DEVELOP 有用户确认与 HD-1=A 拍板，无 WAITING 越界；③DEV_BASELINE=PRODUCT_PLAN_V1.2（HANDOFF＋Task Plan＋review 七查1 一致）；④⑨⑩⑪ 分类 **B 正确、不越界成 C**：⑨ 点谁认领取代计划规则1字面、⑩ 无匹配后缀、⑪ minWidth 均为同屏同功能局部交互/文案/合规补齐，未动产品边界、架构、DB、种子、依赖、流程模板页，不触发 PLAN_REOPEN_REQUIRED；⑫ 为 DoD 追加非范围扩张；⑤TM 无停摆；⑥PROJECT_PHASE=DEVELOP 合法态。
- 6｜质量复检：**全闭环**。P1-1 可见归属：diff（`ActionFilterBar.tsx` chipsSceneLabel＋`library-bodypart-chips-{场景}`）＋ QA C-1/B-⑨真机（拉伸/热身/核心跟随）闭环；P2-1 两条：测试 `:232`（收起非活动不影响归属）＋`:295`（点 chip 不自动展开）＋ review Round2 第4点可判假论证闭环；qa P2（搜索态两次点按=C-2=reviewer P2-3）：代码 `toggleGroup(scene,key)` 认领分支＋测试 `:251`＋ QA B-⑨-1/B-⑨-2 真机（一次认领＋二次才收起）闭环；P3-1 chip 宽：代码 `minWidth: MIN_TOUCH_SIZE`＋测试 `:108-111` 双断言＋ QA B-⑪（单字 48.0×48.0dp、无重叠溢出）闭环。⑫：⑨（`:251/:232`）⑩（`:277-284`）⑪（`:108-111`）均有集成覆盖，本人复跑定向 **24/24 exit 0**、全量 **258/258 exit 0**、`tsc exit 0`，与 Round2/QA 复验计数一致；真机复验 B-⑨/⑩/⑪ 均 PASS。剩余挂账 P2-2/P3-2/P3-3（本轮复测组头仍 44dp，未回归）/P3-4＋新增 P3-5（文件头注释陈旧，纯注释）均非阻塞；HANDOFF 挂账段滞后（P2-3/P3-1 仍列 OPEN、缺 P3-5/ENV-018-1）由 TM 按上文补记。无跳步（planner 例外加派→builder→reviewer→qa→返工→delta→复验→supervisor，reviewer/qa/supervisor 均未跳）；无越界（tracked 改动仅 5 业务/测试＋HANDOFF/DISPATCH 记账，untracked 仅 3 个 docs 新文件；`package.json`/`android/`/Routine/DB/种子/依赖未动）。ENV-018-1（Metro 旧 bundle）：**不影响结论有效性**——自动化与真机结论独立、QA 以 bundle 含 `activeSceneEmpty×4`/`minWidth` 标记核验刷新后全部重跑、陈旧期抓图已声明作废、上轮 PASS 与当时构建自洽；无需额外反证，建议 TM 将「先核设备 bundle 改动标记」列入真机前置。
- 目标/剩 P0/下一步：TASK-018 放行，TM 补记账后落 TASK-MODEL-LOG 行收工；剩 P0-5 native 未动；下一步 TM 更新 HANDOFF＋DISPATCH 落盘。

## neat-freak 收尾核对（2026-09-19，仅追加，不改上文证据）

- 首轮 Bug 表 Status 中 `T018-QA-P2-1`、`T018-QA-P3-1` 的 `OPEN` 已被本页「复验轮 → D. 问题分级」取代，二者均 **CLOSED**（上文保留为当轮快照，不再代表现状）。
- supervisor 所列「TM 补记账清单」①②③ 已全部落盘：DISPATCH-LOG 已补至 **30 行**、TASK-MODEL-LOG 已落 TASK-018 行至 **20 行**、HANDOFF 已更新「当前 Task / 未闭环」。
- 上文「现 19 行（TASK-MODEL-LOG）」「26 行（DISPATCH）」为 supervisor 复检当时的快照值，**非现行值**；现行值以上一条为准。
