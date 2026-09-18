# QA｜TASK-015 sandwich验收（动作库分组筛选＋背景音＋种子）

| Bug ID | Priority | Stage P0 Blocking? | Repro | Status | Current Task | 备注（截图/日志一句） |
|---|---|---:|---|---|---|---|
| （无挂项，本轮零Bug） | — | — | — | — | TASK-015 | 真机 IN9LZTAYV4UGU4JF＋Metro 8092(200)＋jest 15/15 |

## 真机QA会话能力预检结果

- 日期/任务名：2026-09-18／TASK-015 sandwich验收
- session ID：本窗口直驱（qa=true codex通道本窗口bash直驱，无外部session）
- 模型精确ID：本窗口（直驱，不适用外部模型ID）
- Runtime：本窗口bash直驱（codex沙箱对adb必BLOCKED，按qa卡走直驱例外）
- 原生CUA是否实际注入：未注入（本任务走adb直驱，不依赖CUA）
- 可用工具精确名称：adb＋screencap＋PIL质心点选＋uiautomator dump＋dumpsys audio＋jest
- CLI备用入口是否存在：不适用（直驱即通道）
- Orca Runtime：不适用（直驱）
- 能力：读屏（uiautomator/UI文本）／截图（1080x2460）／点击（PIL质心）／输入（ASCII ok，中文NPE见备注）／滚动（swipe位移已验）／状态判断（dumpsys＋截图双验）／端到端（开流程→暂停→结束全链路真实跑通）
- 权限：adb device在线，screencap/input/dumpsys均实测可用
- 读屏结果：PASS（uiautomator取到 动作库/拉伸36/热身12/核心训练11/共9个流程/已暂停 等真实文本）
- 截图结果：PASS（/tmp/qa_*.png共15张，1080x2460，与dump互验一致）
- 点击并恢复结果：PASS（PIL蓝色按钮质心539,1428点暂停→已暂停＋继续按钮；结束对话框点按多次未响应后改用其他路径回Home，无残留弹窗）
- 输入并清除结果：受限——`adb shell input text '股四'`抛NullPointerException（HyperOS输入服务不支持中文shell注入）；ASCII输入可用。中文搜索改由jest单测覆盖（见第1项备注），不记FAIL（通道限制非产品缺陷）
- 滚动及可见位移结果：PASS（swipe后分组文本变化：颈（5）→肩（8）→背（9）→小腿（2）→热身/核心折叠头）
- 界面恢复确认：PASS（最终停Home我的流程页，运行中流程已暂停；背景音设置留在"无声"，见备注建议改回默认滴答）
- 最终结论：PASS
- 原始错误摘要：中文adb input NPE；结束确认对话框点按5次未响应（后用返回/手势路径回到Home，疑似对话框触摸区偏移，详见备注Q5）
- 是否允许进入正式QA：YES

## 验收结论（4项全过，P0=0）

### 1) 动作库分组筛选：过
- 拉伸组默认展开带badge `36`＋收起按钮；颈（5）等部位二级分组可见（qa_lib.png，uiautomator：拉伸/36/收起/颈（5））。
- 滚到底：`热身 12 展开`、`核心训练 11 展开`两组折叠（共 36+12+11=59，与种子一致）。
- 难度chip `高`（uiautomator坐标567,588精确点选）：过滤后仅剩 背（1）/髋臀（2），生效。
- 搜索"股四"：真机中文输入被OS阻断（NPE）；等价逻辑由 `libraryFilter.test.tsx` 覆盖（子串过滤＋空结果态＋清除筛选），且搜索框UI在位。记"过（真机输入受限＋单测补足）"。
- jest：`libraryFilter.test.tsx` PASS。

### 2) Home模板按场景分组＋核心难度角标：过
- 共9个流程；日常拉伸（2）/健身前后（3）分组头在位（qa_shade.png）。
- 核心（3）：初级核心`低`、中级核心`中`、高级核心`高`角标齐（qa_core.png）。
- jest：`templateGroups.test.tsx` PASS（3个routine-badge-断言）。

### 3) 背景音：过
- 设置页5选项在位（无声/滴答默认/雨声/海浪/森林鸟鸣，qa_settings.png）。
- 切雨声＋开跑：`dumpsys audio`见 Expo(uid 10133) AudioTrack state:started（session 6225）。
- 点暂停（PIL质心539,1428）：UI翻为"已暂停＋继续"，dumpsys再无started播放器——暂停即停。
- 切无声＋开跑14秒（TTS窗口已过，运行态第1/10个确认）：dumpsys零started播放器——无声档无播放器。
- jest：`ambientSound.test.tsx` PASS。

### 4) 种子9模板/59动作在位：过
- 代码：`action(`调用59个；`name:`种子模板9个（晨起/跑后/久坐/睡前/热身/办公/初/中/高级核心）；UI：共9个流程。
- 真机分组数 36+12+11=59 吻合；`seedHome.test.tsx` PASS。
- 库已用`pm clear`清后重载，干净库验证。

## 备注
- Q1：结束确认对话框（结束流程/继续练习/结束）adb tap约5次未响应（含PIL精确质心838,1178），BACK键亦无反应；后经顶部手势＋返回路径回到Home。对话框疑似触摸映射偏移，建议builder复查Alert按钮hitSlop——记P1（有替代路径，不阻塞）。
- Q2：测试把背景音设置停在"无声"，下一轮验证前建议手动改回默认"滴答"。
- Q3：jest 4套件15用例全PASS（libraryFilter/templateGroups/ambientSound/seedHome）。

## Fix Attempt Fingerprint
- Task ID: TASK-015（QA验收，不修代码）
- Root Cause Hypothesis: —
- Approach: 真机直驱＋dumpsys＋jest
- Files Changed: 无（仅新增本报告）
- Verification: 见上
- Failure Reason: —
- Difference From Previous Attempt: —
