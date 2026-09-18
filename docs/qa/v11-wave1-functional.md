# v11-wave1-functional 真机功能验收（TASK-008 Wave1，R014-R021）

- 日期：2026-09-18 10:47-12:04（UTC+8）
- 分支：hardening/v1.1｜设备：IN9LZTAYV4UGU4JF（xagapro，1080x2460，ruby未动）
- Metro：8092（adb reverse已做，中途未掉）｜TTS引擎：com.reecedunn.espeak（默认）
- 方式：本窗口bash直驱（adb screencap＋uiautomator dump＋input tap/swipe；codex沙箱不适用）
- 单测：`npx jest src/tests/domain src/tests/integration` → 20 suites / 139 tests 全绿（含runnerControls、startConflict UI）

## 真机QA会话能力预检（本session）

- 读屏：uiautomator dump可取全量文本＋bounds（HOME/Runner/Editor/对话框均验证）
- 截图：screencap 1080x2460真实像素，每关键断言均有截图对版
- 点击：tap/长按swipe均有状态或像素变化（误触扫码页后BACK恢复；坐标以后续dump bounds为准）
- 输入：英文可靠（ENTER确认上屏）；中文未测（测试全用英文命名规避）
- 滚动：swipe动作库滚动取到14个动作全量
- 结论：PASS（直驱无Orca Runtime，note记直驱原因：adb真机任务按qa卡走本窗口bash）

## 验收结论

| # | 用例（R） | 过/挂 | 证据一句 |
|---|---|---|---|
| 1 | 启动「晨起全身拉伸」→Runner＋中文播报（R019/R011） | 过 | Runner显示第1/10项颈部侧屈拉伸（左）0:11；logcat同期eSpeak `nativeSetVoiceByProperties(language=cmn)`＋`nativeSynthesize`＋AudioTrack start，默认TTS即eSpeak |
| 2 | 返回首页启动另一流程→三选一冲突框；取消→原会话继续（R017） | 过 | 「已有正在进行的流程」「晨起全身拉伸还在进行中」＋继续当前流程/结束当前并开始新的/取消；点取消后框消失，Banner＋上次还没结束仍在 |
| 3a | 选「结束当前并开始新的」→新会话开始（R018） | 过 | ConflictB Runner第1/1项计时启动（已用0:17） |
| 3b | 删除源Routine→Home仍有Banner且能继续（R020） | 过 | 删ConflictD后共2个流程无ConflictD但Banner（ConflictD/7个动作/继续）仍在；点继续回到Runner第2/7项已用0:46继续计时（快照驱动） |
| 4 | 同一流程点开始→Continue不新建（R016） | 过 | 无冲突框直回Runner，已用0:12→1:35连续累积未重置 |
| 5a | 暂停/恢复（R019） | 过 | 点暂停出现已暂停＋按钮变继续（＋10置灰）；点继续恢复计时 |
| 5b | ＋10秒 | 过 | 体侧屈左（30秒标称）剩余0:35超出标称；本轮晨起完成用时5分54秒（比5分45秒基线多约10秒） |
| 5c | 跳过 | 过 | 第6/10项（剩余0:35）点跳过后到第7/10项体侧屈（右）0:27 |
| 5d | 完成页 | 过 | ConflictB/ConflictC/晨起均见「流程完成＋共N个动作·用时」页 |
| 5e | 种子数据14动作 | 过 | 动作库三屏共14个（仰卧脊柱扭转…颈部侧屈拉伸），无测试污染（NeckStretch5等未进库） |
| 5f | 种子数据2流程 | 挂（P1） | 开测时首页仅共1个流程（晨起），「跑后下肢放松」缺失，测试前已缺失非本轮造成；测试流程ConflictB/C/D已建后删，终态仅剩种子晨起 |

## Bug

| Bug ID | Priority | Stage P0 Blocking? | Repro | Status | Current Task | 备注 |
|---|---|---:|---|---|---|---|
| WAVE1-SEED-001 | P1 | 否 | 必现（开测即如此） | CLOSED | TASK-008 | 2026-09-18 12:13-12:15复验关闭：冷重载（force-stop＋exp://localhost:8092，Metro8092）后首页共2个流程（跑后下肢放松9动作约5分10秒＋晨起10动作约5分45秒，截图/tmp/qa_121324.png）；点跑后下肢放松开始→Runner第1/9站姿股四头肌拉伸（左）计时推进（已用0:17→0:29→0:54，第1/9→第2/9），logcat同期eSpeak cmn＋nativeSynthesize＋AudioTrack播报正常（截图/tmp/qa_121340.png）；暂停/继续/结束确认框正常，已结束；首页无Conflict*残留，用户自建测试流程无（未被动过，截图/tmp/qa_home3.png） |

## 附注（测试方法，供复现）

- `input tap`零时长点按在本机多次无反应，改用`input swipe x y x y 150-300`（长按式）后全部命中；dump bounds是大按钮/小按钮通用的唯一定位依据，目测截图估算曾多次打偏。
- Runner计时中のuiautomator dump报`could not get idle state`属预期，改截图断言；暂停态可dump。
- 30秒短流程不适合删源/继续类测试（自然跑完），R020用7动作/约4分流程验证。
- 终态：无活跃会话，首页共1个流程（晨起），动作库14个；ruby设备未动。

## WAVE1-SEED-001 复验（2026-09-18 12:13-12:15，CLOSED）

- 方式：本窗口bash直驱；Metro8092（reverse已在）＋force-stop冷重载exp://localhost:8092；uiautomator dump＋screencap＋logcat。
- 能力预检：沿用本文件预检节（读屏/截图/点击/输入/滚动均已PASS，直驱note同上），Runner计时中dump报idle属预期改截图断言。
- 结论：PASS（见Bug表WAVE1-SEED-001行）。结束后Banner“上次还没结束/继续”属快照驱动预期行为（同R020），非残留。
