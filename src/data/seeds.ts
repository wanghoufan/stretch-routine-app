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
import { SystemClock, type Clock } from '../services/clock/Clock';
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

export interface SeedDependencies {
  db: SqlDatabase;
  clock?: Clock;
  generateId?: IdGenerator;
}

interface SeedStepRow {
  id: string;
  sourceActionId: string;
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
  actionId: string,
  nextId: IdGenerator,
): SeedStepRow[] {
  const durationSec = clampDuration(DEFAULT_STEP_DURATION_SEC);
  const transitionSec = clampTransition(DEFAULT_TRANSITION_SEC);
  const name = definition.name.trim().slice(0, STEP_NAME_MAX_LENGTH);
  const speakText = name.slice(0, SPEAK_TEXT_MAX_LENGTH);

  if (definition.sideMode === 'bilateral') {
    const pairGroupId = nextId('pair');
    return createBilateralStepDrafts(
      { id: actionId, name, defaultDurationSec: durationSec, defaultSpeakText: speakText },
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
  const clock = deps.clock ?? new SystemClock();
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
  const transitionSec = clampTransition(DEFAULT_TRANSITION_SEC);

  await db.transaction(async () => {
    const actionIdByKey = new Map<string, string>();
    const definitionByKey = new Map<string, SeedActionDefinition>();

    for (const definition of SEED_ACTIONS) {
      const id = nextId('act');
      const name = definition.name.trim().slice(0, ROUTINE_NAME_MAX_LENGTH);
      actionIdByKey.set(definition.key, id);
      definitionByKey.set(definition.key, definition);
      await db.run(
        `INSERT INTO actions
           (id, name, default_duration_sec, side_mode, default_speak_text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, name, durationSec, definition.sideMode, name, now, now],
      );
    }

    for (const routine of SEED_ROUTINES) {
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
          now,
          now,
        ],
      );

      const steps = routine.actionKeys.flatMap((key) => {
        const definition = definitionByKey.get(key);
        const actionId = actionIdByKey.get(key);
        if (!definition || !actionId) {
          // Only reachable if the catalog itself is inconsistent; fail the
          // transaction rather than silently saving an incomplete routine.
          throw new Error(`种子数据缺少动作定义：${key}`);
        }
        return buildSteps(definition, actionId, nextId);
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

    await db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
      SEED_VERSION_KEY,
      String(SEED_VERSION),
    ]);
  });

  return 'seeded';
}
