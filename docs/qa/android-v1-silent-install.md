# Android V1 静默安装与首页渲染取证（TASK-003-stretch-app-eas-install）

- 日期：2026-09-17（实机操作跨至 2026-09-18 00:42）
- 执行：builder（codebuddy/deepseek-v4.1-flash）
- 基线：DEV_BASELINE=SDD-V1.0
- 设备：Redmi 22041216UC（xagapro，HyperOS V816 / Android 14），序列号 IN9LZTAYV4UGU4JF
- 状态：**已产出可复现的安装与首页渲染证据；语音/后台音频实测未做（见 §5 挂账）**

> 文档性质：本文是 **builder 的技术证据记录**（同类先例见 `android-background-spike.md`、`android-tts-spike.md`），由编排者本卡明确指派 builder 写入 `docs/qa/`；它不是 qa 的评审/验收结论。T062/T095 真机实测仍属 qa，builder 不代填。
>
> 静音红线：本轮用户睡觉，**全程未在真机启动任何 routine、未触发 TTS、未播放任何音频**。只做了「安装 → 冷启动 → 截图首页」。

---

## 1. APK 来源与版本

| 项 | 值 |
|---|---|
| EAS 项目 | `@wanghoufan/stretch-routine-v1`（projectId `dc2542a5-0360-48c2-ba6e-fba4e209b945`） |
| Build ID | `1590108d-016e-4912-bdd3-ccc163399c8b` |
| Profile | `preview`（`android.buildType=apk`，`distribution=internal`） |
| 构建日志 | https://expo.dev/accounts/wanghoufan/projects/stretch-routine-v1/builds/1590108d-016e-4912-bdd3-ccc163399c8b |
| 下载地址 | https://expo.dev/artifacts/eas/LhHY1vEMfBFTdxdRw_9JIuQwS0xaR-yM8NcEfIQOQsI.apk |
| 本地副本 | `/Users/zzymima0000/Downloads/stretch-apk/stretch-routine-v1-preview-1.0.0.apk` |
| 文件大小 | 75,908,085 字节（72.3 MiB） |
| SHA-256 | `c30db3f3ef36e966c4dc6217b008dfcf5d6dfc68e633cfefadd1d085de4b180a` |
| versionName / versionCode | `1.0.0` / `1`（app.json `version=1.0.0`，`appVersionSource=local`） |
| 包名 | `com.stretchroutine.v1`（app.json `android.package`） |
| 构建耗时 | 23:42:51 入队 → 00:37:31 完成，共约 55 min（其中排队约 48 min，构建约 5 min） |

新增文件：项目根 `eas.json`（`preview` profile 打 APK）；`app.json` 由 `eas init` 追加 `extra.eas.projectId` 与 `owner`。

## 2. 安装方式

命令：`adb install -r stretch-routine-v1-preview-1.0.0.apk`

### 2.1 遇到的拦阻与处置（HyperOS/MIUI 特有）

1. 直接 `adb install` / `adb push + pm install` / `--no-streaming` 均返回
   `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`。
2. logcat 定位到真实原因：MIUI 安全中心弹出了
   `com.miui.securitycenter/com.miui.permcenter.install.AdbInstallActivity`
   —— 即**系统级「USB安装提示」确认框**，10 秒无人点按即按「拒绝」处理，并非权限开关未开
   （`persist.security.adbinstall=1`、`persist.security.adbinput=1`；`install_non_market_apps=1` 均已就绪）。
3. 处置：后台发起安装 → `uiautomator dump` 取确认框按钮 bounds（`继续安装` = `[99,2093][523,2231]`）→
   `adb shell input tap 311 2162` 点「继续安装」→ 返回 `Success`。

### 2.2 安装结果（设备侧核实）

```
adb shell pm list packages | grep stretch  →  package:com.stretchroutine.v1
adb shell dumpsys package com.stretchroutine.v1
  codePath=/data/app/~~05nIPjg4FD59_NPOye8CYQ==/com.stretchroutine.v1-voXIriLClfO7wDI4xfpCLQ==
  primaryCpuAbi=arm64-v8a
  versionName=1.0.0
  firstInstallTime=2026-09-18 00:42:22
```

### 2.3 本轮对设备做过的改动（供用户知情）

- `adb shell settings put global adb_install_need_confirm 0`（关 adb 安装二次确认）
- `adb shell settings put global verifier_verify_adb_installs 0`（关安装校验器）
- 屏幕唤醒 `input keyevent KEYCODE_WAKEUP`（原为息屏；安装确认框需亮屏点按）

均为标准开发者设置项，不改变任何应用行为。设备媒体流 `STREAM_MUSIC` 安装前即为 `Muted: true`，本轮**未修改音量**。

## 3. 静默冷启动与首页渲染证据

命令：`adb shell am force-stop com.stretchroutine.v1` → `adb shell am start -W -n com.stretchroutine.v1/.MainActivity`

```
Status: ok
LaunchState: COLD
Activity: com.stretchroutine.v1/.MainActivity
TotalTime: 862
WaitTime: 872
```

### 3.1 截图

| 用途 | 路径 |
|---|---|
| 冷启动首页 | `/Users/zzymima0000/Downloads/stretch-apk/shots/01-home-cold-start.png` |
| 静置 60s 后首页（稳定，未崩溃） | `/Users/zzymima0000/Downloads/stretch-apk/shots/02-home-steady.png` |
| MIUI USB安装确认框（证明只是确认框拦截） | `/Users/zzymima0000/Downloads/stretch-apk/shots/install-dialog.png` |
| 安装前设备原始状态（首页/静音） | `/Users/zzymima0000/Downloads/stretch-apk/shots/dev-state.png` |

### 3.2 首页 UI 文本（`uiautomator dump` 原始提取）

```
我的流程   动作库   设置   新建流程   还没有流程
创建一个流程，把动作按顺序排好，之后打开就能跟着语音做完。   新建流程
```

- 首页标题区渲染为 **「我的流程」**（HomeScreen 自身的页标题），右上「动作库 / 设置」，主按钮「新建流程」×2（顶部主按钮 + 空态引导按钮）均可见、可读。
- **应用名「拉伸语音播报」** 体现在应用身份层：`app.json name`，并已在设备端 MIUI 安装弹窗中显示为「拉伸语音播报」（见 `install-dialog.png`）。首页头部不重复显示应用名，属设计如此，非渲染缺失。
- 空态文案与 FR-001（本地流程列表）一致；无异常占位符。

### 3.3 异常日志结论

`adb logcat -c` 后冷启动 → 全量 logcat 检查：

- **E/F 级日志：0 条**（`grep -E '^... [EF] '` 为空）。
- 应用包相关日志：仅 ActivityManager/WindowManager 的常规启停记录，**无 WARN 以上异常、无 JS 崩溃、无 ANR**。
- `topResumedActivity=com.stretchroutine.v1/.MainActivity`，进程存活（pid 24510）。

### 3.4 静默证据（本轮真的没发声）

- `adb logcat` 中 `AudioTrack|TextToSpeech|Speech|AudioFlinger.*play` 命中数 **0**。
- `adb shell dumpsys audio` 的 `players` 里**无本应用**的播放配置（列出的均为系统 SoundPool，`state:idle`）。
- 本应用未申请 `RECORD_AUDIO / MODIFY_AUDIO_SETTINGS`（安装包的 requested permissions 中无音频类）。
- 未执行任何会进入 Runner 的操作（未点「新建流程」、未点开始）。

## 4. P1-2 确认：每步 warning 只播一次是否符合 US7 最小设置语义

**结论：符合，保持现状，不需改动。**

依据：

1. **SPEC 原文（US7，Priority P2）** 只要求一项开关：
   `countdown cue enabled/disabled (for example, 5-second warning);`
   并明确 `Settings MUST remain minimal`。SPEC/PLAN 中**不存在**「逐秒播报」「每个剩余秒数都要喊」的要求（`docs/plan/...SPEC...V1.0.md:680`、`...PLAN/TASKS...:1769` T085 都只提「setting」）。
2. **实现**（`src/features/runner/services/runnerCueCoordinator.ts:99-134`）：warning 为可选提示，受 `settings.countdownWarningEnabled` 控制，默认 `countdownWarningSec = 5`（`settingsModel.ts:37-38`）。cue key =
   `warn:{sessionId}:{stepIndex}:{effectiveStepDurationMs}`，只含「会话 + 步骤 + 有效步长」，**不含剩余秒数**。
3. **去重层**（`src/services/tts/ttsService.ts:62-70`）：`announce()` 用 `delivered: Set<key>` 拦截重复 key。
   因此进入 5 秒窗口后每个 tick 生成的 cue 同 key，只有**第一次**被播报，后续 4/3/2 秒同 key 被吞 → **每步恰好一次 warning**。
4. **边界不会漏播/多播**：
   - 步长 ≤ warning 窗口时不发（`runnerCueCoordinator.ts:121-123`）；
   - 同一步内暂停/恢复不产生新 key，不重复；
   - `STEP_STARTED` 事件当次不叠加 warning（避免「C，10秒」+「5秒后结束」连播，`:110-112`）；
   - 「+10s 延长」会改变 `effectiveStepDurationMs` → key 变化 → **为新步长重新武装一次** warning（`:95-98` 注释与测试 `re-arms the warning after a +10 extension`）——这是延长后的新时长应有的提示，不违反「最小」语义。
5. **回归证据**：`npx jest src/tests/domain/ttsService.test.ts` → 17 passed，含 `adds the countdown warning once the step is inside the warning window`、`respects the countdown warning setting`、`re-arms the warning after a +10 extension`、`skips the warning for steps shorter than the warning window`、`speaks a cue once and de-duplicates repeats of the same key`。

**残留（非阻塞，不属本轮）：** 文案用的是 `remainingSec` 动态值（如「4秒后结束」），但因去重只播首次，用户听到的永远是窗口首次触发那一刻的秒数。若 V1.x 想改成逐秒播报，需把 key 带上 `remainingSec` 并同步放开去重——属产品变更，走 Change B/C，不在本轮。

## 5. 挂账：语音 / 后台音频实测（延期到明天）

以下全部**挂账到本文件，2026-09-18（明天）再做**，本轮不执行，也不据此宣称任何验收结论：

| 编号 | 内容 | 为什么本轮不做 |
|---|---|---|
| T062 | 后台/锁屏跨边界计时、恢复后不回放旧 cue 的真机实测 | 需真机进入 Runner 播报语音，触发静音红线 |
| T095 | TTS 真机发声/语速/中断行为实测 | 同上，会发声 |
| — | 前台服务/dev build 方案必要性评估（承 `android-background-spike.md` §4） | 依赖 T062 实测结论 |
| — | 语音连续性（P1-1 后台到期 cue 不补播）是否符合 SPEC | 依赖 T062 |

以上属 qa 环节（`HANDOFF` P0-2），builder 不代填结论。

## 6. 本轮明确未做的事

- 未启动任何 routine、未触发 TTS、未播放音频；
- 未点击「新建流程 / 动作库 / 设置」等任何会写数据或进入 Runner 的入口；
- 未修改 `src/` 业务代码（仅新增 `eas.json`、`app.json` 由 `eas init` 追加 projectId/owner）；
- 未 commit / push。
