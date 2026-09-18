# 本地持久化决策（T008）

- 日期：2026-09-17
- 决策：**expo-sqlite（Async API）+ 版本化迁移 + 仓储层**
- 备选：AsyncStorage（仅用于小型偏好）——已评估并否决为主存储

## 决策

结构化数据（动作、流程、步骤、活动会话）使用 `expo-sqlite`；键值偏好（`app_settings`）落在同一数据库的 `app_settings` 表中。

否决 AsyncStorage 作为主存储的理由（PLAN §1 亦如此要求）：
1. 需要按 `routine_id` 查询并按 `order_index` 排序，KV 需要自行维护索引与一致性；
2. 多表写入（流程 + 步骤）需要事务，KV 无语义化事务；
3. 迁移只能靠版本号手工整包替换，容易丢失/污染数据。

## 迁移策略（Constitution XI）

- 迁移定义在 `src/data/migrations/index.ts`，`MIGRATIONS` 为**有序、只追加**的列表，每条含 `version` / `name` / `statements`。
- 版本号存放在 SQLite 的 `PRAGMA user_version`，启动时 `runMigrations()` 只应用「比当前版本新」的迁移，天然幂等。
- 每条迁移在事务中执行，失败整体回滚。
- 生产升级**不做**破坏性重建；`resetSchema()` 仅供测试/QA。

## 当前 schema（v1）

| 表 | 用途 | 关键列 |
|---|---|---|
| `actions` | 可复用动作模板 | `side_mode`（single/bilateral）、`default_duration_sec` |
| `routines` | 命名的流程 | `default_duration_sec`、`default_transition_sec` |
| `routine_steps` | 播放用步骤**快照** | `display_name`、`speak_text`、`duration_sec`、`transition_sec`、`pair_group_id`、`side`、`source_action_id`（可空） |
| `app_settings` | 扁平键值偏好 | `key` / `value` |
| `active_session` | 单行权威活动会话 | `phase_started_at_epoch_ms`、`accumulated_pause_ms`、`effective_step_duration_ms`、`runtime_extension_ms` |

索引：`idx_routine_steps_routine (routine_id, order_index)`。外键 `routine_steps.routine_id → routines.id ON DELETE CASCADE`。

## 旧版 Android SQLite 兼容（重要）

expo-sqlite 在 Android 上使用系统自带的 SQLite，其版本随系统不同：Android 11 之前为 3.22，**不支持 `ON CONFLICT ... DO UPDATE`（upsert，需 3.24+）**。因此：

- 单例行写入统一使用 `INSERT OR REPLACE`（`active_session`、`app_settings`），不使用 upsert；
- 外键开关 `PRAGMA foreign_keys = ON` 在 `runMigrations()` 内、**事务之外**单独执行——SQLite 在事务中会忽略该 pragma（旧版 Android 默认关闭）。

其余用到的语法（`CREATE TABLE IF NOT EXISTS`、`CREATE INDEX IF NOT EXISTS`、`CHECK`、`COLLATE NOCASE`、`ON DELETE CASCADE`）在 3.9+ 均可用。

注意：外键并非删除正确性的依赖——仓储删除流程时会显式删除其步骤，`ON DELETE CASCADE` 只是兜底。

## 快照不变式（Constitution XI / FR-015）

`routine_steps` 保存播放所需的全部用户可见值，**不**在播放时回读 `actions`。因此：

- 修改动作库中的 Action → 已保存流程不受影响；
- 删除 Action → 已保存流程不受影响，仅把 `source_action_id` 置空（便于后续审计/统计）；
- 两侧配对由 `pair_group_id` 维系，删掉一侧不影响另一侧播放。

以上均有测试覆盖：`src/tests/repositories/actionRepository.test.ts`、`src/tests/integration/actionSnapshot.test.tsx`。

## 可测试性（关键设计）

数据层只依赖 `SqlDatabase` 端口（`src/data/db/Database.ts`）：

```ts
exec / run / all / get / transaction
```

- 生产：`ExpoSqlDatabase`（`src/data/db/expoSqlDatabase.ts`，惰性 `openDatabaseAsync`）
- 测试：`createNodeSqlDatabase()`（`src/tests/support/nodeSqlDatabase.ts`，Node 内置 `node:sqlite`，**真实 SQLite**）

因此仓储与迁移测试跑的是设备上同一份 SQL，而不是内存假实现；同时数据层代码不需要引入任何原生模块即可在 Jest 中运行。

## 验证方式（本轮已跑）

- `src/tests/repositories/migrations.test.ts`：全新库建表、二次运行幂等、已有数据不丢、reset 后重建、外键生效。
- 其余仓储测试覆盖 CRUD、排序、快照、单例会话行。

## 已知限制

- `expo-sqlite` 的 Async API 在极低端设备首次打开可能有几十毫秒延迟；首页通过 `useRoutines` 的 loading 态兜底。
- 未做 WAL/加密；V1 数据为个人训练内容，无敏感信息，符合本地优先的最小实现要求。
