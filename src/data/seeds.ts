import type { ActionSideMode } from '../domain/action/Action';
import { createBilateralStepDrafts } from '../domain/routine/bilateral';
import type { StepSide } from '../domain/routine/RoutineStep';
import {
  clampDuration,
  clampTransition,
  DEFAULT_STEP_DURATION_SEC,
  DEFAULT_TRANSITION_SEC,
  ROUTINE_NAME_MAX_LENGTH,
  STEP_NAME_MAX_LENGTH,
  SPEAK_TEXT_MAX_LENGTH,
} from '../domain/routine/constants';
import { SystemWallClock, type WallClock } from '../services/clock';
import { generateId, type IdGenerator } from '../shared/utils/id';
import type { SqlDatabase } from './db/Database';

/**
 * First-launch seed library (TASK-005 / HANDOFF B-1).
 *
 * Ships 14 common stretch actions plus two example routines so a brand-new
 * install is immediately usable (and so QA can verify the runner with real
 * content). Seeding is strictly additive: it runs only when `actions` and
 * `routines` are both empty and never rewrites anything a user owns.
 */

/** Stored in `app_settings`; bump when the shipped seed content changes. */
export const SEED_VERSION = 1;
export const SEED_VERSION_KEY = 'seed_version';

export interface SeedActionDefinition {
  /** Stable reference used by `SEED_ROUTINES`; never shown to the user. */
  key: string;
  name: string;
  sideMode: ActionSideMode;
}

export interface SeedRoutineDefinition {
  name: string;
  /** `SeedActionDefinition.key` values, in playback order. */
  actionKeys: readonly string[];
}

export const SEED_ACTIONS: readonly SeedActionDefinition[] = [
  { key: 'neck-side-bend', name: '颈部侧屈拉伸', sideMode: 'bilateral' },
  { key: 'cross-body-shoulder', name: '十字肩拉伸', sideMode: 'bilateral' },
  { key: 'triceps', name: '肱三头肌拉伸', sideMode: 'bilateral' },
  { key: 'side-bend', name: '体侧屈拉伸', sideMode: 'bilateral' },
  { key: 'supine-spinal-twist', name: '仰卧脊柱扭转', sideMode: 'bilateral' },
  { key: 'kneeling-hip-flexor', name: '跪姿髋屈肌拉伸', sideMode: 'bilateral' },
  { key: 'standing-quad', name: '站姿股四头肌拉伸', sideMode: 'bilateral' },
  { key: 'standing-calf', name: '站姿小腿拉伸', sideMode: 'bilateral' },
  { key: 'seated-hamstring', name: '坐姿腿后肌拉伸', sideMode: 'bilateral' },
  { key: 'doorway-chest', name: '开门胸部拉伸', sideMode: 'single' },
  { key: 'cat-cow', name: '猫牛式', sideMode: 'single' },
  { key: 'child-pose', name: '儿童式', sideMode: 'single' },
  { key: 'cobra', name: '眼镜蛇式', sideMode: 'single' },
  { key: 'butterfly', name: '蝴蝶式坐姿', sideMode: 'single' },
];

export const SEED_ROUTINES: readonly SeedRoutineDefinition[] = [
  {
    name: '晨起全身拉伸',
    actionKeys: [
      'neck-side-bend',
      'cross-body-shoulder',
      'doorway-chest',
      'side-bend',
      'cat-cow',
      'cobra',
      'child-pose',
    ],
  },
  {
    name: '跑后下肢放松',
    actionKeys: [
      'standing-quad',
      'seated-hamstring',
      'standing-calf',
      'kneeling-hip-flexor',
      'butterfly',
    ],
  },
];

/** `seeded` = rows written now; the other two are no-op outcomes. */
export type SeedOutcome = 'seeded' | 'already-seeded' | 'skipped-user-data';

/**
 * Result of the seed repair pass (TASK-009).
 *
 * `not-applicable` = this install never recorded seeding (fresh or user-owned),
 * so repairing is not our business. `intact` = the marker is set and every
 * shipped routine is still present. `repaired` = one or more shipped routines
 * had gone missing and were re-created, leaving everything else untouched.
 */
export interface SeedRepairResult {
  outcome: 'repaired' | 'intact' | 'not-applicable';
  /** Names of the shipped routines re-created by this pass, in catalog order. */
  restoredRoutineNames: string[];
}

export interface SeedDependencies {
  db: SqlDatabase;
  /** Real-world timestamps only; seeds never participate in runner timing. */
  clock?: WallClock;
  generateId?: IdGenerator;
}

interface SeedStepRow {
  id: string;
  sourceActionId: string | null;
  displayName: string;
  speakText: string;
  durationSec: number;
  transitionSec: number;
  pairGroupId: string | null;
  side: StepSide;
}

/**
 * Every seeded step uses the same 30s / 5s timing. Bilateral actions expand
 * into a left/right pair through the shared domain helper, so the seeded pairs
 * behave exactly like pairs the user adds from the library (Constitution IX).
 */
function buildSteps(
  definition: SeedActionDefinition,
  actionId: string | null,
  nextId: IdGenerator,
): SeedStepRow[] {
  const durationSec = clampDuration(DEFAULT_STEP_DURATION_SEC);
  const transitionSec = clampTransition(DEFAULT_TRANSITION_SEC);
  const name = definition.name.trim().slice(0, STEP_NAME_MAX_LENGTH);
  const speakText = name.slice(0, SPEAK_TEXT_MAX_LENGTH);

  if (definition.sideMode === 'bilateral') {
    const pairGroupId = nextId('pair');
    return createBilateralStepDrafts(
      { id: actionId ?? '', name, defaultDurationSec: durationSec, defaultSpeakText: speakText },
      { transitionSec, fallbackDurationSec: durationSec, generateId: nextId, pairGroupId },
    ).map((draft) => ({
      id: draft.id,
      sourceActionId: actionId,
      displayName: draft.displayName,
      speakText: draft.speakText,
      durationSec: draft.durationSec,
      transitionSec: draft.transitionSec,
      pairGroupId: draft.pairGroupId ?? pairGroupId,
      side: draft.side,
    }));
  }

  return [
    {
      id: nextId('step'),
      sourceActionId: actionId,
      displayName: name,
      speakText,
      durationSec,
      transitionSec,
      pairGroupId: null,
      side: 'none',
    },
  ];
}

async function hasSeedMarker(db: SqlDatabase): Promise<boolean> {
  const row = await db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [
    SEED_VERSION_KEY,
  ]);
  return row !== null && Number(row.value) >= SEED_VERSION;
}

async function countRows(db: SqlDatabase, table: 'actions' | 'routines'): Promise<number> {
  const row = await db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return row?.count ?? 0;
}

const SEED_ACTION_BY_KEY = new Map(SEED_ACTIONS.map((definition) => [definition.key, definition]));

/**
 * Insert one shipped routine plus its step snapshot. Shared by the initial seed
 * and the TASK-009 repair pass so a restored routine is byte-for-byte the same
 * shape as the one a fresh install gets.
 *
 * `resolveActionId` may return `null` when the referenced library Action is
 * gone (the user deleted it); `routine_steps.source_action_id` is nullable and
 * the step keeps its own snapshot values, so playback still works.
 */
async function insertSeedRoutine(
  db: SqlDatabase,
  routine: SeedRoutineDefinition,
  resolveActionId: (key: string) => string | null,
  timestamp: string,
  nextId: IdGenerator,
): Promise<void> {
  const durationSec = clampDuration(DEFAULT_STEP_DURATION_SEC);
  const transitionSec = clampTransition(DEFAULT_TRANSITION_SEC);
  const routineId = nextId('rtn');

  await db.run(
    `INSERT INTO routines
       (id, name, default_duration_sec, default_transition_sec, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      routineId,
      routine.name.trim().slice(0, ROUTINE_NAME_MAX_LENGTH),
      durationSec,
      transitionSec,
      timestamp,
      timestamp,
    ],
  );

  const steps = routine.actionKeys.flatMap((key) => {
    const definition = SEED_ACTION_BY_KEY.get(key);
    if (!definition) {
      // Only reachable if the catalog itself is inconsistent; fail the
      // transaction rather than silently saving an incomplete routine.
      throw new Error(`种子数据缺少动作定义：${key}`);
    }
    return buildSteps(definition, resolveActionId(key), nextId);
  });

  for (const [index, step] of steps.entries()) {
    await db.run(
      `INSERT INTO routine_steps
         (id, routine_id, source_action_id, order_index, display_name, speak_text,
          duration_sec, transition_sec, pair_group_id, side)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        step.id,
        routineId,
        step.sourceActionId,
        index,
        step.displayName,
        step.speakText,
        step.durationSec,
        step.transitionSec,
        step.pairGroupId,
        step.side,
      ],
    );
  }
}

/**
 * Seed once, atomically. Order of checks matters:
 *
 * 1. `seed_version` already stored -> nothing to do (re-entry is a no-op).
 * 2. `actions` or `routines` already holds rows -> it is the user's data, so we
 *    back off completely instead of mixing our content into it.
 * 3. otherwise write the whole library inside one transaction and only then
 *    record `seed_version`, so a failure can never leave a half-seeded library
 *    that later looks like user data.
 */
export async function runSeeds(deps: SeedDependencies): Promise<SeedOutcome> {
  const { db } = deps;
  const clock = deps.clock ?? new SystemWallClock();
  const nextId = deps.generateId ?? generateId;

  if (await hasSeedMarker(db)) {
    return 'already-seeded';
  }

  const [actionCount, routineCount] = await Promise.all([
    countRows(db, 'actions'),
    countRows(db, 'routines'),
  ]);
  if (actionCount > 0 || routineCount > 0) {
    return 'skipped-user-data';
  }

  const now = new Date(clock.nowMs()).toISOString();
  const durationSec = clampDuration(DEFAULT_STEP_DURATION_SEC);

  await db.transaction(async () => {
    const actionIdByKey = new Map<string, string>();

    for (const definition of SEED_ACTIONS) {
      const id = nextId('act');
      const name = definition.name.trim().slice(0, ROUTINE_NAME_MAX_LENGTH);
      actionIdByKey.set(definition.key, id);
      await db.run(
        `INSERT INTO actions
           (id, name, default_duration_sec, side_mode, default_speak_text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, name, durationSec, definition.sideMode, name, now, now],
      );
    }

    for (const routine of SEED_ROUTINES) {
      await insertSeedRoutine(db, routine, (key) => actionIdByKey.get(key) ?? null, now, nextId);
    }

    await db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
      SEED_VERSION_KEY,
      String(SEED_VERSION),
    ]);
  });

  return 'seeded';
}

/** Existing routine names, used to spot a shipped routine the user deleted. */
async function listRoutineNames(db: SqlDatabase): Promise<Set<string>> {
  const rows = await db.all<{ name: string }>('SELECT name FROM routines');
  return new Set(rows.map((row) => row.name));
}

/** Map each shipped Action name to the library row that still owns it. */
async function mapSeedActionIdsByName(db: SqlDatabase): Promise<Map<string, string>> {
  const wanted = new Set(SEED_ACTIONS.map((definition) => definition.name));
  const rows = await db.all<{ id: string; name: string }>('SELECT id, name FROM actions');
  const byName = new Map<string, string>();
  for (const row of rows) {
    if (wanted.has(row.name)) {
      byName.set(row.name, row.id);
    }
  }
  return byName;
}

/**
 * TASK-009 repair pass: bring back a shipped example routine the user deleted.
 *
 * `runSeeds` is one-shot by design (`seed_version`), which also meant a routine
 * that disappeared *after* the first launch could never come back. This pass
 * runs on every boot and is deliberately narrow:
 *
 * - only installs that already recorded seeding are eligible, so a fresh
 *   install and a user-owned library are both left alone;
 * - a shipped routine counts as present by its catalog name, so an existing
 *   (even user-edited) routine is never duplicated or overwritten;
 * - only the missing routines are re-created, each with a fresh step snapshot
 *   linked to the matching library Action when it still exists.
 */
export async function repairSeededRoutines(deps: SeedDependencies): Promise<SeedRepairResult> {
  const { db } = deps;
  const clock = deps.clock ?? new SystemWallClock();
  const nextId = deps.generateId ?? generateId;

  if (!(await hasSeedMarker(db))) {
    return { outcome: 'not-applicable', restoredRoutineNames: [] };
  }

  const presentNames = await listRoutineNames(db);
  const missing = SEED_ROUTINES.filter((routine) => !presentNames.has(routine.name));
  if (missing.length === 0) {
    return { outcome: 'intact', restoredRoutineNames: [] };
  }

  const actionIdByName = await mapSeedActionIdsByName(db);
  const now = new Date(clock.nowMs()).toISOString();

  await db.transaction(async () => {
    for (const routine of missing) {
      await insertSeedRoutine(
        db,
        routine,
        (key) => {
          const definition = SEED_ACTION_BY_KEY.get(key);
          return definition ? actionIdByName.get(definition.name) ?? null : null;
        },
        now,
        nextId,
      );
    }
  });

  return { outcome: 'repaired', restoredRoutineNames: missing.map((routine) => routine.name) };
}
