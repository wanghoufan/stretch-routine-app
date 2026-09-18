# 简化版拉伸流程 APP｜V1.0 已开发完成后增量整改计划

**文档版本：** V1.1  
**生成日期：** 2026-09-18  
**审查对象：** `wanghoufan/stretch-routine-app`  
**代码基线：** `main` / `bc1f39f041cfa4a71696534ed86aee25c44d09d1`  
**基线提交：** `V1: stretch routine app (Expo RN+SQLite+TTS) with seed data, 154 tests green`  
**定位：** V1.0 Release Hardening / 增量整改，不是重新开发 V1  
**本版状态：** 对 V1.0 增量计划 V1.0 做二次代码审查后的修正版

---

# 0. 本版为什么升级到 V1.1

V1.0 增量整改计划的大方向正确，但二次审查发现几个会导致开发返工或过度设计的问题：

1. **Native Build 顺序错误**：原计划先做 Android native monotonic clock，后面才建立 Development Build/native 基础。实际必须先建立一个统一的 local Expo native module，再扩展 clock / boot count / FGS。
2. **SessionSnapshot 存储过重**：原计划新增 `session_snapshots` + `session_snapshot_steps` 两张表；当前产品只有一个 ActiveSession、没有历史会话查询需求，单例 `active_session` 内存不可变 JSON snapshot 更符合 V1 最小设计。
3. **Foreground Service 不等于 CPU 保持唤醒**：FGS 提高进程重要性，但不自动阻止 CPU 在息屏后睡眠。锁屏准时播报必须实测是否需要 `PARTIAL_WAKE_LOCK`。
4. **用户主动 Stop 判定遗漏**：Android 13+ Task Manager 的 Stop 会杀掉整个 App，且不给 callback。下次启动必须识别 `ApplicationExitInfo.REASON_USER_REQUESTED`，否则可能错误恢复用户主动终止的流程。
5. **Runner 应从“routineId 驱动”升级为“ActiveSession 驱动”**：否则源 Routine 被删除后，虽然有 snapshot，Runner/首页仍可能没有入口继续。
6. **原 V1.1 PLAN 不能继续完整作为实施基线**：如果改成 snapshot JSON，就与原 PLAN 的两张 snapshot 表发生冲突。Constitution/SPEC 保留；本增量计划明确 supersede 原 PLAN/TASKS 的冲突实现部分。
7. **真机矩阵不够**：只测 Android 14 Redmi 不足以覆盖 target API 36、Android 13 通知/Task Manager 行为和最低支持版本。
8. **缺少 FGS + deep sleep / Doze / HyperOS 电池策略验证**。
9. **Notification permission 语义需要明确**：Android 13+ 即使用户拒绝通知权限，FGS 仍可运行，只是通知栏展示不同，不能把“拒绝通知”误判为“不能启动流程”。
10. **Session stale 判断不应继续依赖 Wall Clock**：Wall Clock 会跳变；同一 boot 内恢复判断应优先使用 monotonic elapsed time，跨 boot 用 boot count。

---

# 1. 治理关系

## 1.1 继续有效

以下仍作为最高层要求：

1. Constitution V1.1
2. SPEC V1.1

其中核心要求继续有效：

- 不加 AI；
- 本地优先；
- Android first；
- Expo SDK 57；
- Monotonic timing；
- Immutable Session Snapshot；
- One Active Session；
- Background/Lock-screen continuity；
- TTS 非权威；
- SQLite migration-safe。

## 1.2 被本计划覆盖的内容

以下文档中的**实施细节**，如与本文冲突，以本文为准：

- 原 PLAN V1.1 中的 SessionSnapshot 两表实现；
- 原 PLAN V1.1 中与本次代码现状不符的全量实施顺序；
- 原 TASKS V1.1 T001–T135 全量执行清单。

因此实际执行关系为：

```text
Constitution V1.1
        ↓
SPEC V1.1
        ↓
当前 GitHub 代码事实
        ↓
本 Incremental Remediation Plan V1.1
        ↓
Delta Tasks R001–R044
```

开发智能体禁止重新执行已经在 V1.0 中完成的整套业务开发任务。

---

# 2. 当前仓库真实结论

## 2.1 已完成，原则上不重做

### 技术基线

已存在：

- Expo `~57.0.23`
- React Native `0.86.3`
- React `19.2.3`
- `expo-speech ~57.0.3`
- `expo-sqlite ~57.0.3`
- `package-lock.json`
- EAS 配置
- Android APK 安装记录

Expo SDK 57 当前默认：

- compileSdk 36
- targetSdk 36
- Android 7+

但最终 build 仍需在整改开始时重新核验，不仅靠文档推断。

### 业务功能

已实现：

- Home
- Routine Detail
- Routine Editor
- Batch Input
- Action Library
- Bilateral
- Runner
- Pause / Resume
- Previous
- Skip
- +10s
- End
- Completion
- Settings
- Seed data

### Runner Domain

已存在显式状态机：

```text
IDLE
PREPARING
RUNNING_STEP
RUNNING_TRANSITION
PAUSED_STEP
PAUSED_TRANSITION
COMPLETED
STOPPED
ERROR
```

并且：

- timer callback 不直接递减 authoritative counter；
- TTS callback 不驱动时间；
- 多边界 catch-up 已实现；
- FakeClock 已存在。

### SQLite

已实现：

- migrations；
- `PRAGMA user_version`；
- `foreign_keys=ON`；
- repository；
- transaction；
- singleton `active_session`；
- RoutineStep snapshot；
- SQLite 测试。

### TTS

已实现：

- `expo-speech`；
- cue 去重；
- queue；
- rapid skip protection；
- TTS failure non-fatal；
- countdown warning。

### 测试

仓库基线提交声明：

> 154 tests green

本轮开始必须重新跑，以实际结果为准。

---

# 3. 最终整改范围

真正需要改的是：

1. Native runtime foundation；
2. MonotonicClock / WallClock 分离；
3. ActiveSession schema V2；
4. ActiveSession 内 immutable playback snapshot；
5. Runner 从 Routine-driven 改为 ActiveSession-driven；
6. Start conflict gate；
7. Foreground Service；
8. Deep sleep / WakeLock 判定；
9. Boot count / user-requested stop recovery；
10. WAL；
11. Android API / OEM 真机矩阵；
12. 版本和 ADR 治理。

---

# 4. 关键架构修正

## 4.1 一个 Native Runtime Module，不拆多个小模块

新增一个本地 Expo module，例如：

```text
modules/stretch-runtime/
```

Android 侧统一承载：

```text
nowElapsedMs()
getBootCount()
getLastProcessExitReason()
startSessionService()
stopSessionService()
isSessionServiceRunning()
[可选] getTtsVoiceCapabilities()
```

好处：

- 不为 Clock 建一个模块、FGS 再建一个模块；
- config/native build 只搭一次；
- 后续 Android 平台能力统一收口；
- 测试 JS domain 仍然通过 port/mock 与 native 解耦。

优先使用：

```text
npx create-expo-module@latest --local
```

保持 CNG / prebuild 思路。

只有 Manifest 动态修改确实需要时再加 config plugin。

不要求为了本轮专门引入额外大型原生框架。

---

## 4.2 Clock 必须拆成两类

### MonotonicClock

只用于：

- Runner elapsed；
- pause/resume；
- phase boundaries；
- same-boot recovery；
- stale duration。

Android：

```text
SystemClock.elapsedRealtime()
```

接口：

```ts
interface MonotonicClock {
  nowElapsedMs(): number;
}
```

### WallClock

只用于：

- createdAt；
- updatedAt；
- release/debug metadata；
- 用户可读日期。

接口：

```ts
interface WallClock {
  nowWallMs(): number;
}
```

生产：

```text
Date.now()
```

### 禁止

禁止把一个统一 `Clock.nowMs()` 同时用于：

- Runner interval
- ISO 日期

否则后续极易再次混用。

---

## 4.3 ActiveSession V2 直接保存不可变 Snapshot JSON

V1.1 不新增：

```text
session_snapshots
session_snapshot_steps
```

原因：

- V1 同时只有一个活动会话；
- 当前没有 session history；
- 不需要对历史 snapshot 做 SQL 查询；
- 两张表会增加 repository / migration / cascade / transaction 复杂度。

推荐：

```text
active_session
```

保存：

```text
id = 1
session_id
source_routine_id
source_routine_name
snapshot_version
snapshot_json
state
current_step_index
phase_started_elapsed_ms
paused_at_elapsed_ms
accumulated_pause_ms
effective_step_duration_ms
effective_transition_duration_ms
runtime_extension_ms
completed_phase_ms
last_updated_elapsed_ms
boot_count
created_at_wall_ms       // 可选，仅诊断
```

`snapshot_json` 至少包含：

```ts
interface PlaybackSnapshot {
  version: 1;
  sourceRoutineId: string;
  sourceRoutineName: string;
  steps: Array<{
    displayName: string;
    speakText: string;
    durationSec: number;
    transitionSec: number;
    pairGroupId?: string;
    side: 'none' | 'left' | 'right';
  }>;
}
```

Runner 运行以后不再读取 mutable RoutineSteps 作为播放权威。

---

## 4.4 Start 不再等于 Navigate

当前：

```text
点击开始
→ navigate('Runner', routineId)
→ RunnerController 自己决定创建 session
```

V1.1 改成：

```text
点击开始
→ StartRoutineService
→ 处理 active session 冲突
→ 创建 ActiveSession + Snapshot
→ 确保 FGS 已启动
→ 成功后进入 Runner
```

Runner 页面只负责：

> 打开当前 ActiveSession。

Runner 不再把 `routineId` 当作 authoritative playback key。

推荐 Runner route：

```text
Runner
```

不强依赖 source routine id。

这样即使源 Routine 被删除：

- ActiveSession 仍存在；
- snapshot 仍存在；
- Home 仍能展示“进行中的流程”；
- Runner 仍可继续。

---

## 4.5 ActiveSession 数据层禁止静默 Replace

当前：

```sql
INSERT OR REPLACE INTO active_session
```

会让“启动 B 覆盖 A”过于容易。

V1.1：

### New Start

```sql
INSERT INTO active_session (...)
```

若 singleton id 已存在：

> 返回 ActiveSessionConflict。

### Persist Existing Session

```sql
UPDATE active_session
SET ...
WHERE id = 1 AND session_id = ?
```

### Explicit Replace

只有用户确认：

> 结束当前并开始新流程

后才允许显式 replace/update。

这样 One Active Session 不只是 UI 约定，而是数据层也有防线。

---

## 4.6 Session stale 不再依赖 Wall Clock

当前 stale：

```text
nowEpoch - updatedAtEpoch
```

会受系统时间修改影响。

V1.1：

同一 boot：

```text
nowElapsedMs - lastUpdatedElapsedMs
```

跨 boot：

```text
bootCount mismatch
→ session invalid
```

WallClock 不参与恢复正确性判断。

---

## 4.7 Boot Marker 直接优先使用 Android BOOT_COUNT

Expo SDK 57 最低 Android 7 / API 24。

Android：

```text
Settings.Global.BOOT_COUNT
```

从 API 24 已存在。

因此优先：

```text
bootCount: Int
```

而不是自造 boot hash。

如果某 OEM 读取异常：

> native spike 再定义 fallback。

---

# 5. Foreground Service 方案

## 5.1 FGS 是必要候选，但不是完整答案

Foreground Service：

- 提高进程优先级；
- 表明这是用户可感知的持续任务；
- 满足 Android 后台音频/Audio Focus 的重要前提之一。

但：

> FGS 不自动阻止 CPU 在息屏后进入睡眠。

因此必须把：

```text
FGS only
```

与：

```text
FGS + PARTIAL_WAKE_LOCK
```

分别实测。

---

## 5.2 FGS 启动规则

必须：

```text
用户在可见 Activity 中点击 Start / Continue
→ startForegroundService()
→ Service 在系统要求时间内调用 startForeground()
```

禁止：

- App 已在后台时无条件自行启动 FGS；
- Boot 后自动启动；
- WorkManager 代替 Runner 实时计时。

---

## 5.3 FGS Type Decision

当前 App：

- 不读取 location；
- 不读取 body sensors；
- 不同步 health data；
- 主要后台输出是语音提示。

因此：

### `health`

默认不选。

仅“健身 App”这个标签不足以使用 health type。

### `mediaPlayback`

需要正式评估：

- TTS 是否可被合理解释为 background audio playback；
- Play Console use case 是否与真实行为一致。

### `specialUse`

如果没有标准 type 真正匹配：

> 作为 fallback 候选。

若采用必须：

- `FOREGROUND_SERVICE_SPECIAL_USE`
- manifest subtype property
- Play Console review 描述

最终类型必须由真实实现和 Play policy 对齐决定，不允许拍脑袋。

---

## 5.4 Notification permission

Android 13+：

用户拒绝 `POST_NOTIFICATIONS`：

- 不应阻止 FGS 本身启动；
- FGS 信息仍会出现在系统 Task Manager；
- 通知抽屉展示会受影响。

因此产品行为：

```text
Permission denied
≠
Runner blocked
```

App 可提示：

> 建议开启通知，方便看到进行中的流程。

但不能把它做成硬前置权限。

---

## 5.5 Deep Sleep / WakeLock Gate

必须做：

### Test A

```text
FGS only
+ screen off
+ 10s step × 6
```

### Test B

```text
FGS only
+ screen off 5–10 min
```

### Test C

进入 Doze / idle 环境验证。

如果 cue 明显延迟：

> 进入 WakeLock 路径。

### WakeLock 路径

使用：

```text
PARTIAL_WAKE_LOCK
```

仅在 ActiveSession 真正在运行时持有。

必须：

- Manifest `WAKE_LOCK`
- End/Complete 时 release
- Service destroy 时 finally release
- timeout safety
- 不允许 stuck wakelock

Pause 是否 release：

> Phase 0 真机验证后固定。

优先原则：

- Pause 长时间不应无意义持有 CPU；
- Resume 由用户可见操作触发时重新 acquire。

---

## 5.6 Path A / Path B

### Path A — 最小改动优先

```text
FGS
+ 必要时 Partial WakeLock
+ 现有 JS Runner
+ expo-speech
```

如果：

- screen off boundary 准时；
- TTS 连续；
- audio interruption 可接受；

则保留。

### Path B — 仅实测失败才启用

如果 JS timer / expo-speech 在后台仍不可靠：

只把后台必要部分下沉：

```text
Native Service
→ boundary scheduling
→ Android TTS
```

不要重写：

- Routine editor；
- Runner state machine全部逻辑；
- UI；
- SQLite 业务层。

进入 Path B 前必须做一次 Architecture Review。

---

## 5.7 Service restart mode

V1 默认倾向：

```text
START_NOT_STICKY
```

理由：

- 避免系统无 UI 上下文时静默复活并突然播音；
- FGS 本身已经显著降低正常运行中被杀概率；
- 进程真的死后，让用户重新打开 App 再决定 Continue 更安全。

如果实测证明必须使用 sticky：

> 单独 ADR，补 user-stop 保护后才能采用。

---

# 6. User Stop / Force Stop / Swipe Away

必须区分：

## A. 普通后台 / 锁屏

继续。

## B. Activity recreation

继续。

## C. Recents swipe

本轮需要固定一个明确行为。

建议 V1.1：

> 只要 ActiveSession 正在运行，普通 swipe-away 不视为 End；FGS 继续，通知仍可返回 Runner。

这样符合“开始以后把手机放下”的核心定位。

## D. Android Task Manager → Stop

Android 13+ 会：

- 杀整个进程；
- 清 Activity back stack；
- 停 FGS；
- 无 callback。

下次启动：

读取：

```text
ApplicationExitInfo.REASON_USER_REQUESTED
```

若最后退出原因是用户主动 Stop：

> 清理旧 active_session / 标记 interrupted，不自动恢复。

## E. Settings Force Stop / adb stop-app

必须真机验证。

原则同用户显式停止：

> 不自动恢复播放。

## F. Reboot

`bootCount` 改变：

> old active_session invalid。

V1 不做 BOOT_COMPLETED auto resume。

---

# 7. Active Session Home Entry

V1.0 Home 当前只把：

```text
activeSessionRoutineId
```

映射到已有 RoutineCard。

如果源 Routine 已经被删除：

> Home 没有卡片，Continue 入口也消失。

V1.1 必须新增独立：

```text
ActiveSessionBanner / ActiveSessionCard
```

内容来自 snapshot：

```text
正在进行：肩颈拉伸
第 3 / 8 个动作
[继续]
[结束]
```

即使：

- 原 Routine 被删除；
- 原 Routine 被改名；

仍能继续。

---

# 8. 数据迁移 V2

V1.0 → V1.1：

## 保留

```text
actions
routines
routine_steps
app_settings
seed data
```

## 仅替换瞬时状态

`active_session` 是 runtime state，不是用户资产。

Migration V2 可以：

```text
DROP TABLE active_session
CREATE TABLE active_session V2 (...)
```

这是允许的，因为：

- 不删除 Action；
- 不删除 Routine；
- 不删除 RoutineStep；
- 只结束旧版本未完成的一次临时会话。

升级提示无需复杂 UI。

开发/Release Note 记录：

> 升级版本时，正在进行中的旧版流程不会继续；已保存的动作和流程不会丢失。

---

# 9. SQLite

## 9.1 WAL

启动初始化增加：

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

都应在 transaction 外。

## 9.2 现有 transaction 不做无必要大改

Expo SQLite 的普通 async transaction 不是 exclusive。

当前 V1 的主要 repository 写入规模小、单用户、单进程。

因为 V1.1 改成：

> snapshot JSON + singleton row

Start 本身可用单次 `INSERT`，不必为 SessionSnapshot 引入跨多表 transaction。

因此本轮：

- 不为追求理论完美重写全部 repository transaction API；
- 把 `withExclusiveTransactionAsync` 评估列为 P2 hardening；
- 若实现中新增真实并发写场景，再升级 transaction abstraction。

---

# 10. TTS / Audio

## 10.1 离线能力

正确表述：

> Runner 100% 离线；TTS 是否完全离线取决于设备安装的 voice。

如果 native runtime module 已经存在，P1 可增加：

```text
voice name
language
requiresNetworkConnection
```

检测。

无离线 voice：

- 不崩；
- Timer 正常；
- 视觉流程正常；
- 设置页给提示。

## 10.2 Audio Focus

target API 36 已包含 Android 15+ 行为约束。

后台语音必须测试：

- 正在播放音乐；
- TTS 发声；
- 来电/语音打断；
- 蓝牙耳机。

如果 expo-speech 无法提供稳定行为：

> 这也是进入 Native TTS Path B 的证据之一。

---

# 11. Android 支持矩阵

只测当前 Redmi Android 14 不够。

最低矩阵：

## Physical

### Redmi / HyperOS / Android 14

重点：

- OEM 后台限制；
- 锁屏；
- 电池优化默认状态；
- TTS；
- 长时间息屏；
- Bluetooth。

## Emulator / Secondary Device

### Android 13 / API 33

重点：

- notification permission；
- Active Apps / Task Manager Stop。

### Android 16 / API 36

重点：

- targetSdk 36；
- FGS type；
- permission；
- background audio；
- notification；
- process behavior。

## Minimum SDK

Expo SDK 57 默认支持 Android 7+。

二选一：

### Option A

保留 Android 7+：

> 至少做 API 24 emulator smoke test。

### Option B

主动提高 minSdk：

> 必须记录产品决定与理由。

禁止“默认支持 Android 7，但从未测试最低版本”。

---

# 12. HyperOS / Battery Test

当前真实设备是 Redmi / HyperOS。

必须额外记录：

1. 默认电池策略下 FGS 是否稳定；
2. 锁屏 10 分钟；
3. App 切后台；
4. 设备进入省电模式；
5. 是否需要用户手动改“无限制/自启动”。

原则：

> 不预设要求用户关闭电池优化。

只有实测失败后才能给设置引导。

---

# 13. Delta Tasks

---

## Phase R0｜Freeze + Baseline

### R001 — Freeze 当前工作版本

创建：

```text
tag: v1.0-implemented-bc1f39f
branch: hardening/v1.1
```

### R002 — 重跑基线

```bash
npm ci
npm run typecheck
npm test -- --runInBand
npx expo-doctor
```

记录真实：

- suites；
- tests；
- typecheck；
- Expo Doctor。

### R003 — Build Baseline

验证：

- Expo 57；
- RN 0.86.3；
- compileSdk 36；
- targetSdk 36；
- minSdk；
- package；
- versionName；
- versionCode。

产出：

```text
docs/qa/v1.1-baseline.md
```

---

## Phase R1｜统一 Native Runtime Foundation

### R004 — 创建 local Expo module

建议：

```text
modules/stretch-runtime
```

Android only。

### R005 — 固定 CNG / native build 工作流

验证：

```text
prebuild
expo run:android
或 EAS development/preview build
```

不要依赖 Expo Go 做 native 功能验收。

### R006 — 首批 Native API

实现：

```text
nowElapsedMs()
getBootCount()
getLastProcessExitReason()
```

测试 native ↔ JS 调用。

**Exit Gate：**

Native module 可在真机 debug/preview build 调用。

---

## Phase R2｜Clock + ActiveSession V2 一次性迁移

> Clock 和 ActiveSession schema 必须同轮完成，避免中间出现 TS 字段和数据库字段不一致。

### R007 — 拆 WallClock / MonotonicClock

现有：

```text
Clock
```

拆为：

```text
WallClock
MonotonicClock
```

### R008 — Repository 改用 WallClock

调整：

- ActionRepository；
- RoutineRepository；
- Seeds。

### R009 — ActiveSession V2 Domain

改为：

```text
phaseStartedElapsedMs
pausedAtElapsedMs
lastUpdatedElapsedMs
bootCount
snapshotVersion
snapshot
```

### R010 — Migration V2

只重建：

```text
active_session
```

其余用户数据完整保留。

### R011 — Session Mapper / Repository V2

实现：

- snapshot JSON encode/decode；
- schema version validation；
- corrupt snapshot fail-safe；
- new start 用 INSERT；
- normal persist 用 UPDATE；
- 禁止无条件 INSERT OR REPLACE。

### R012 — Recovery V2

规则：

```text
bootCount mismatch → discard/interrupted
same boot → monotonic calculation
wall clock jump → ignored
REASON_USER_REQUESTED → discard/interrupted
```

### R013 — Tests

覆盖：

- wall clock ±1h / ±1d；
- monotonic timer；
- reboot/bootCount mismatch；
- corrupt JSON；
- V1 schema → V2；
- user data retained；
- old active session cleared。

**Exit Gate：**

Clock / Session V2 全绿。

---

## Phase R3｜Session-driven Runner + Start Conflict

### R014 — StartRoutineService

职责：

```text
load active
resolve conflict
load source routine
build immutable snapshot
insert ActiveSession
start/ensure native service
return result
```

### R015 — Start Result Contract

例如：

```text
started
continue-current
conflict
failed
```

### R016 — Same Routine

已有同源 ActiveSession：

> Continue，不新建。

### R017 — Different Routine Conflict

展示：

```text
继续当前流程
结束当前并开始新的
取消
```

### R018 — Explicit Replace

只有用户确认后允许替换 session。

### R019 — Runner 改为 ActiveSession-driven

Runner 页面不再必须依赖 `routineId` 才能工作。

### R020 — ActiveSession Banner

Home 独立显示活动会话。

即使源 Routine 被删也能继续。

### R021 — Snapshot Immutability Tests

覆盖：

- Start 后 edit source Routine；
- reorder；
- rename；
- delete；
- app restart；
- active session仍按旧 snapshot；
- 下一次 Start 使用新版 Routine。

**Exit Gate：**

Runner 已完全解耦 mutable Routine。

---

## Phase R4｜Foreground Service Risk Gate

### R022 — Minimal FGS

从 visible Activity Start/Continue 启动。

### R023 — Notification

实现：

- channel；
- ongoing notification；
- tap 返回 Runner；
- notification permission denied 仍可运行。

### R024 — FGS Type Decision

形成：

```text
docs/architecture/foreground-service-v1.1.md
```

至少比较：

- mediaPlayback；
- specialUse；
- health（说明为什么不选，除非实现发生变化）。

### R025 — FGS Only Screen-off Test

测试：

- 10s × 6；
- ≥2 boundaries；
- 5–10 min screen off。

### R026 — Deep Sleep / Doze Test

确认 cue 是否迟到。

### R027 — WakeLock Decision

如果需要：

```text
FGS + PARTIAL_WAKE_LOCK
```

并补：

- acquire；
- release；
- timeout；
- no stuck wakelock。

### R028 — Path A Gate

验证：

```text
FGS
(+ WakeLock if necessary)
+ JS Runner
+ expo-speech
```

### R029 — Path B Gate

只有 R028 FAIL 才进入：

```text
Native boundary scheduler / Android TTS
```

先 Architecture Review，禁止直接大改。

**Exit Gate：**

锁屏期间动作 cue 连续、时间正确。

---

## Phase R5｜Service Lifecycle / Explicit Stop

### R030 — Lifecycle

定义并实现：

```text
Start/Continue → ensure FGS
Pause → 按 ADR 决定 WakeLock
Resume → ensure WakeLock
End → stop FGS + release
Complete → stop FGS + release
```

### R031 — START_NOT_STICKY Baseline

先采用：

```text
START_NOT_STICKY
```

若要改 sticky，必须另做 ADR。

### R032 — User Stop Detection

使用：

```text
ApplicationExitInfo.REASON_USER_REQUESTED
```

### R033 — Stop Matrix

测试：

- Active Apps → Stop；
- `adb shell cmd activity stop-app`；
- Settings Force Stop；
- recents swipe；
- ordinary background。

### R034 — Reboot

验证：

- bootCount changed；
- old session不自动播放；
- no BOOT_COMPLETED resume。

---

## Phase R6｜SQLite / TTS / Platform P1

### R035 — WAL

增加：

```sql
PRAGMA journal_mode = WAL;
```

### R036 — TTS Offline Capability

如果 native API 成本合理：

> 加 voice network requirement 检测。

否则：

> 只修正产品说明/设置提示。

### R037 — Audio Focus QA

验证：

- music；
- phone call；
- Bluetooth。

### R038 — HyperOS Battery QA

默认策略测试。

---

## Phase R7｜版本与文档

### R039 — Version Governance

统一：

- package.json version；
- app.json version；
- versionCode；
- Git tag；
- HANDOFF。

### R040 — ADR Update

新增/更新：

```text
clock-v1.1.md
session-snapshot-v1.1.md
background-decision-v1.1.md
persistence-decision.md
```

旧 ADR 标记 superseded，不删除。

### R041 — SDD Delta Consistency

逐条核对：

```text
Constitution V1.1
SPEC V1.1
Incremental Plan V1.1
当前代码
```

保证无冲突。

---

## Phase R8｜Final QA

### R042 — Automated Regression

要求：

- 所有旧测试继续 PASS；
- 新 hardening tests PASS；
- typecheck PASS；
- Expo Doctor 无阻塞问题。

### R043 — Android Matrix

至少：

```text
API 33
Android 14 HyperOS physical
API 36
minSdk smoke 或明确提高 minSdk
```

### R044 — Final Acceptance

必须验证：

1. 创建/编辑/删除 Routine；
2. Action Library；
3. bilateral；
4. Start；
5. same routine Continue；
6. different routine conflict；
7. Pause/Resume；
8. +10；
9. Previous/Skip；
10. screen off；
11. background；
12. deep sleep；
13. notification granted/denied；
14. user Task Manager Stop；
15. reboot；
16. system wall-clock change；
17. running session source Routine edit；
18. running session source Routine delete；
19. offline；
20. TTS failure；
21. End/Complete 后无 FGS/wakelock 泄漏。

最终状态：

```text
V1.1 HARDENING COMPLETE
```

---

# 14. Priority

## P0

- R001–R034
- R039
- R041–R044
- R035 若数据库初始化改动同轮顺手完成

## P1

- R036–R038
- 文档整理中的非阻塞项

## Conditional

Google Play Console FGS declaration：

> 只有准备正式发布 Play 时成为 Release Blocker。

本地自用 / internal APK 阶段：

> Manifest/runtime 合规必须做；Play Console 表单和演示视频不阻塞本地 hardening。

---

# 15. 代码改动范围

## 基本保留

```text
src/features/actions/**
大部分 src/features/routines/**
大部分 src/features/settings/**
Runner UI components
seed data
shared UI
现有 TTS queue
```

## 重点修改

```text
src/services/clock/**
src/domain/session/**
src/data/mappers/sessionMapper.ts
src/data/repositories/sessionRepository.ts
src/data/migrations/index.ts
src/app/providers/createAppServices.ts
src/features/runner/services/runnerController.ts
src/features/runner/services/sessionPersistence.ts
src/features/runner/services/sessionRecovery.ts
src/features/routines/screens/HomeScreen.tsx
src/features/routines/screens/RoutineDetailScreen.tsx
navigation Runner params
```

## 新增

```text
modules/stretch-runtime/**
StartRoutineService
ActiveSessionBanner
FGS native service
FGS / clock / session ADR
hardening tests
```

---

# 16. 明确禁止

- 禁止重新做整个 V1 UI；
- 禁止重跑全量 T001–T135 开发任务；
- 禁止直接全局把 `Date.now()` 替换成 elapsedRealtime；
- 禁止为 SessionSnapshot 建两张表，除非未来新增历史会话需求；
- 禁止为了 migration 清整个用户数据库；
- 禁止 FGS 未实测就全量重写 Runner 为 Kotlin；
- 禁止把 `health` FGS type 当成“健身 App 默认类型”；
- 禁止把 notification permission 拒绝当作不能运行 FGS；
- 禁止后台自行启动 FGS；
- 禁止 Boot 后自动恢复播音；
- 禁止 wall clock 参与 authoritative countdown；
- 禁止源 Routine 变更影响正在运行的 snapshot；
- 禁止用户 Task Manager Stop 后自动恢复播音；
- 禁止 WakeLock 无超时/无 release；
- 禁止为理论并发问题大规模重写数据库层，除非出现真实需求或证据。

---

# 17. Definition of Done

V1.1 Hardening 完成必须同时满足：

- [ ] V1.0 用户业务功能保留；
- [ ] 旧测试全部继续通过；
- [ ] WallClock / MonotonicClock 分离；
- [ ] Android monotonic source = elapsedRealtime semantics；
- [ ] ActiveSession V2；
- [ ] immutable snapshot 存入 ActiveSession；
- [ ] Runner session-driven；
- [ ] source Routine edit/delete 不影响 active run；
- [ ] one active session 数据层 + UI 均成立；
- [ ] second routine 不再静默覆盖；
- [ ] FGS 真机成立；
- [ ] deep sleep 行为验证；
- [ ] WakeLock 如使用则无泄漏；
- [ ] Android 13 notification denial 路径正确；
- [ ] Task Manager Stop 不恢复；
- [ ] reboot 不恢复；
- [ ] wall-clock 修改不影响倒计时；
- [ ] SQLite WAL；
- [ ] V1 schema → V2 不丢 Actions/Routines/Steps/Settings；
- [ ] Android 14 HyperOS 真机通过；
- [ ] API 36 通过；
- [ ] minimum Android 策略明确；
- [ ] offline core flow 通过；
- [ ] TTS failure non-fatal；
- [ ] 无 AI/backend/auth/payment scope creep；
- [ ] 无 zombie FGS；
- [ ] 无 stuck wakelock；
- [ ] ADR / HANDOFF / version 一致；
- [ ] final review 无 P0/P1 未闭环。

---

# 18. 最终结论

当前仓库仍然**不需要重做**。

V1.0 的产品功能、Runner domain、SQLite 基础、TTS 基础和测试资产都值得保留。

本轮最正确的升级路线不是：

> “照 V1.1 全量计划重写一次。”

而是：

```text
Freeze V1.0
    ↓
建立统一 Native Runtime Foundation
    ↓
Clock + ActiveSession V2 一次性迁移
    ↓
Session-driven Runner + Conflict Gate
    ↓
FGS + Deep Sleep Proof
    ↓
Stop / Reboot Hardening
    ↓
Android Matrix
    ↓
Release Hardening Complete
```

相比增量计划 V1.0，本 V1.1：

- 减少了不必要的 snapshot 两表；
- 修正了 native build 顺序；
- 减少了数据库重构；
- 补了 WakeLock / Doze；
- 补了 user-requested stop；
- 补了 Runner 无 source Routine 仍可恢复；
- 补了 Android 13 / 16 测试矩阵；
- 明确 Play Console 合规与本地运行合规分离。

**建议后续开发以本 V1.1 为唯一增量整改执行清单。**
