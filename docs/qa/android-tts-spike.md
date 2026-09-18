# Android TTS 技术尖刺记录（T005）

- 日期：2026-09-17
- 执行：builder（TASK-001-stretch-app-v1-build）
- 状态：**代码/接口层已验证；真机音频与打断场景待 T095 完成**

## 1. 结论

V1 使用 `expo-speech`（Expo Go 兼容，无需自定义原生模块）作为唯一发声通道。

## 2. 选择依据（对照 SPEC / PLAN）

| 需求 | 结论 | 依据 |
|---|---|---|
| 使用设备原生 TTS | 满足 | `expo-speech` 走 Android 系统 TextToSpeech 引擎 |
| 离线可用（Constitution II） | 满足 | 使用系统已安装的离线语音包，不依赖网络 |
| Expo Go 可运行 | 满足 | 纯 JS 模块，无 config plugin、无 dev build 需求 |
| 触发/完成回调 | 满足 | `onDone` / `onStopped` / `onError` 均可用 |
| TTS 回调不得驱动计时（Constitution V） | 满足 | 见下节实现约定 |

## 3. 实现约定（代码位置）

- `src/services/tts/expoSpeechSpeaker.ts`：唯一调用 `expo-speech` 的文件。
  - `Speech.speak(text, { language: 'zh-CN', rate, onDone, onStopped, onError })`
  - `Speech.stop()` 用于打断
  - 通过 `require('expo-speech')` 惰性加载，保证数据层/域层测试不引入原生模块
- `src/services/tts/ttsService.ts`：去重、队列、错误处理
  - 每条播报有稳定 key（`step:<sessionId>:<index>:start` 等），同一 key 只播一次 → UI 重渲染不会重复播报（PLAN §8）
  - 「待播」队列长度最多 1，新播报替换旧的待播播报，避免快速跳过时刷屏（T054）
  - `interrupt: true` 的播报（换动作、完成）会 `stop()` 当前播报并立即发声
  - speaker 抛异常或回调报错时，只记录 `getLastError()` 并继续，不影响计时（FR-031）
- `src/services/tts/ttsService.ts` 的 `isEnabled` / `getRate` 每次发声时惰性读取设置，设置页改动对下一条播报立即生效（T084）

## 4. 明确不依赖 TTS 回调计时

计时权威来源只有 `ActiveSession` 的时间戳（`phaseStartedAtEpochMs` / `accumulatedPauseMs`）。
`onDone` 只用于推进「待播队列」，不参与任何 elapsed/remaining 计算。已有单测覆盖（`src/tests/domain/runnerMachine.test.ts`、`ttsService.test.ts`）。

## 5. 已知限制（挂账）

1. **后台/锁屏发声**：Expo Go 无前台服务，进程被系统挂起时到期的播报不会发声。返回前台后只播报「当前动作」，不回放过期播报（PLAN §8 明确要求不得盲目回放）。详见 `docs/architecture/background-decision.md`。
2. **设备语音包**：若手机未安装中文离线语音包，朗读质量或语言可能回退；属设备侧问题，应用不崩溃、不阻断计时。
3. **真实打断场景**（蓝牙音频、来电、其他 App 抢占音频焦点）尚未在真机验证，属 T095 范围。

## 6. 待真机验证清单（交接给 T095 / T062）

- [ ] 中文文本朗读清晰、语速设置生效
- [ ] 锁屏状态下播报是否持续、可支撑到哪一步
- [ ] 蓝牙耳机 / 来电打断后是否恢复
- [ ] TTS 关闭后流程仍按时间正常切换
