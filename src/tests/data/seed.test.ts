import {
  SEED_ACTIONS,
  SEED_ROUTINES,
  SEED_VERSION,
  SEED_VERSION_KEY,
  repairSeededRoutines,
  runSeeds,
} from '../../data/seeds';
import { createActionRepository } from '../../data/repositories/actionRepository';
import { createRoutineRepository } from '../../data/repositories/routineRepository';
import { runMigrations } from '../../data/migrations';
import { FakeClock } from '../../services/clock';
import { createSequentialIdGenerator } from '../../shared/utils/id';
import { createNodeSqlDatabase, type NodeSqlDatabase } from '../support/nodeSqlDatabase';

/**
 * First-launch seed library (TASK-005 / HANDOFF B-1).
 *
 * Covers the three acceptance cases from the B-1 requirement: an empty database
 * is seeded, a database with user data is left alone, and re-entry never
 * duplicates rows.
 */

interface ActionRowShape {
  id: string;
  name: string;
  default_duration_sec: number;
  side_mode: string;
  default_speak_text: string | null;
}

function setup() {
  const db: NodeSqlDatabase = createNodeSqlDatabase();
  const clock = new FakeClock(Date.parse('2026-09-18T00:00:00.000Z'));
  return { db, clock };
}

async function count(db: NodeSqlDatabase, table: string): Promise<number> {
  const row = await db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`);
  return row?.total ?? 0;
}

describe('first-launch seed library (TASK-005)', () => {
  it('seeds the 14 actions and 2 example routines into an empty database', async () => {
    const { db, clock } = setup();
    await runMigrations(db);

    const outcome = await runSeeds({ db, clock, generateId: createSequentialIdGenerator() });
    expect(outcome).toBe('seeded');

    const actions = await db.all<ActionRowShape>('SELECT * FROM actions');
    expect(actions).toHaveLength(14);
    expect(new Set(actions.map((action) => action.name))).toEqual(
      new Set(SEED_ACTIONS.map((definition) => definition.name)),
    );
    expect(actions.filter((action) => action.side_mode === 'bilateral')).toHaveLength(9);
    expect(actions.filter((action) => action.side_mode === 'single')).toHaveLength(5);
    // Every action defaults to 30s and speaks its Chinese name aloud (TTS).
    expect(actions.every((action) => action.default_duration_sec === 30)).toBe(true);
    expect(actions.every((action) => action.default_speak_text === action.name)).toBe(true);
    expect(actions.every((action) => /[\u4e00-\u9fff]/.test(action.name))).toBe(true);

    const routines = createRoutineRepository({ db, clock, generateId: createSequentialIdGenerator() });
    const summaries = await routines.listSummaries();
    expect(summaries.map((summary) => summary.name).sort()).toEqual(
      [...SEED_ROUTINES.map((definition) => definition.name)].sort(),
    );
    expect(summaries.every((summary) => summary.defaultDurationSec === 30)).toBe(true);
    expect(summaries.every((summary) => summary.defaultTransitionSec === 5)).toBe(true);

    const morning = summaries.find((summary) => summary.name === '晨起全身拉伸');
    expect(morning?.stepCount).toBe(10);
    // 10 steps x 30s + 9 transitions x 5s.
    expect(morning?.totalDurationSec).toBe(345);

    const evening = summaries.find((summary) => summary.name === '跑后下肢放松');
    expect(evening?.stepCount).toBe(9);
    expect(evening?.totalDurationSec).toBe(310);

    const loadedMorning = await routines.getWithSteps(morning!.id);
    expect(loadedMorning?.steps.map((step) => step.displayName)).toEqual([
      '颈部侧屈拉伸（左）',
      '颈部侧屈拉伸（右）',
      '十字肩拉伸（左）',
      '十字肩拉伸（右）',
      '开门胸部拉伸',
      '体侧屈拉伸（左）',
      '体侧屈拉伸（右）',
      '猫牛式',
      '眼镜蛇式',
      '儿童式',
    ]);
    expect(loadedMorning?.steps.map((step) => step.speakText)).toEqual([
      '左侧颈部侧屈拉伸',
      '右侧颈部侧屈拉伸',
      '左侧十字肩拉伸',
      '右侧十字肩拉伸',
      '开门胸部拉伸',
      '左侧体侧屈拉伸',
      '右侧体侧屈拉伸',
      '猫牛式',
      '眼镜蛇式',
      '儿童式',
    ]);
    expect(loadedMorning?.steps.map((step) => step.side)).toEqual([
      'left',
      'right',
      'left',
      'right',
      'none',
      'left',
      'right',
      'none',
      'none',
      'none',
    ]);
    expect(loadedMorning?.steps.every((step) => step.durationSec === 30)).toBe(true);
    expect(loadedMorning?.steps.every((step) => step.transitionSec === 5)).toBe(true);

    // Bilateral actions expand into pairs: same pairGroupId per action, shared
    // by left/right only, and a single action carries no pair at all.
    const steps = loadedMorning!.steps;
    expect(steps[0]?.pairGroupId).toBe(steps[1]?.pairGroupId);
    expect(steps[2]?.pairGroupId).toBe(steps[3]?.pairGroupId);
    expect(steps[5]?.pairGroupId).toBe(steps[6]?.pairGroupId);
    expect(steps[0]?.pairGroupId).not.toBe(steps[2]?.pairGroupId);
    expect(steps[4]?.pairGroupId).toBeUndefined();
    expect(steps[7]?.pairGroupId).toBeUndefined();

    // Each step still points back at its library action (snapshot, not a link).
    const actionIds = new Set(actions.map((action) => action.id));
    expect(steps.every((step) => Boolean(step.sourceActionId) && actionIds.has(step.sourceActionId!))).toBe(
      true,
    );

    const loadedEvening = await routines.getWithSteps(evening!.id);
    expect(loadedEvening?.steps.map((step) => step.displayName)).toEqual([
      '站姿股四头肌拉伸（左）',
      '站姿股四头肌拉伸（右）',
      '坐姿腿后肌拉伸（左）',
      '坐姿腿后肌拉伸（右）',
      '站姿小腿拉伸（左）',
      '站姿小腿拉伸（右）',
      '跪姿髋屈肌拉伸（左）',
      '跪姿髋屈肌拉伸（右）',
      '蝴蝶式坐姿',
    ]);

    const marker = await db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [
      SEED_VERSION_KEY,
    ]);
    expect(marker?.value).toBe(String(SEED_VERSION));

    db.close();
  });

  it('backs off completely when the device already holds user data', async () => {
    const { db, clock } = setup();
    await runMigrations(db);

    const actions = createActionRepository({ db, clock, generateId: createSequentialIdGenerator() });
    const routines = createRoutineRepository({ db, clock, generateId: createSequentialIdGenerator() });
    const ownAction = await actions.create({ name: '我的动作', defaultDurationSec: 45, sideMode: 'single' });
    await routines.create({
      name: '我的流程',
      defaultDurationSec: 20,
      defaultTransitionSec: 0,
      steps: [{ displayName: '我的动作', durationSec: 20, transitionSec: 0 }],
    });

    const outcome = await runSeeds({ db, clock, generateId: createSequentialIdGenerator() });
    expect(outcome).toBe('skipped-user-data');

    expect(await count(db, 'actions')).toBe(1);
    expect(await count(db, 'routines')).toBe(1);
    expect(await count(db, 'routine_steps')).toBe(1);

    const stored = await actions.getById(ownAction.id);
    expect(stored?.name).toBe('我的动作');
    expect(stored?.defaultDurationSec).toBe(45);

    const marker = await db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [
      SEED_VERSION_KEY,
    ]);
    expect(marker).toBeNull();

    db.close();
  });

  it('is idempotent: a second launch adds nothing and keeps seed_version', async () => {
    const { db, clock } = setup();
    await runMigrations(db);

    expect(await runSeeds({ db, clock, generateId: createSequentialIdGenerator() })).toBe('seeded');
    const afterFirst = {
      actions: await count(db, 'actions'),
      routines: await count(db, 'routines'),
      steps: await count(db, 'routine_steps'),
    };

    expect(await runSeeds({ db, clock, generateId: createSequentialIdGenerator() })).toBe(
      'already-seeded',
    );

    expect(await count(db, 'actions')).toBe(afterFirst.actions);
    expect(await count(db, 'routines')).toBe(afterFirst.routines);
    expect(await count(db, 'routine_steps')).toBe(afterFirst.steps);
    expect(afterFirst).toEqual({ actions: 14, routines: 2, steps: 19 });

    // No duplicate routine names slipped in.
    const routines = createRoutineRepository({ db, clock, generateId: createSequentialIdGenerator() });
    const names = (await routines.list()).map((routine) => routine.name);
    expect(new Set(names).size).toBe(names.length);

    const marker = await db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [
      SEED_VERSION_KEY,
    ]);
    expect(marker?.value).toBe(String(SEED_VERSION));

    db.close();
  });
});

describe('seed repair pass (TASK-009)', () => {
  it('restores only the missing shipped routine and leaves user data untouched', async () => {
    const { db, clock } = setup();
    await runMigrations(db);

    const generateId = createSequentialIdGenerator();
    const actions = createActionRepository({ db, clock, generateId });
    const routines = createRoutineRepository({ db, clock, generateId });

    await runSeeds({ db, clock, generateId });

    // User adds their own content on top of the seeded library.
    const ownAction = await actions.create({ name: '我的动作', defaultDurationSec: 45, sideMode: 'single' });
    const ownRoutine = await routines.create({
      name: '我的流程',
      defaultDurationSec: 20,
      defaultTransitionSec: 0,
      steps: [{ displayName: '我的动作', durationSec: 20, transitionSec: 0 }],
    });

    // The reported bug: the second shipped routine disappears.
    const evening = (await routines.list()).find((routine) => routine.name === '跑后下肢放松');
    expect(evening).toBeDefined();
    await routines.remove(evening!.id);
    expect(await count(db, 'routines')).toBe(2);

    const result = await repairSeededRoutines({ db, clock, generateId });
    expect(result.outcome).toBe('repaired');
    expect(result.restoredRoutineNames).toEqual(['跑后下肢放松']);

    // Everything is back without duplicating what was still there.
    const summaries = await routines.listSummaries();
    expect(summaries.map((summary) => summary.name).sort()).toEqual(
      [...SEED_ROUTINES.map((definition) => definition.name), '我的流程'].sort(),
    );
    const restored = summaries.find((summary) => summary.name === '跑后下肢放松');
    expect(restored?.stepCount).toBe(9);
    expect(restored?.totalDurationSec).toBe(310);
    const morning = summaries.find((summary) => summary.name === '晨起全身拉伸');
    expect(morning?.stepCount).toBe(10);

    const loadedRestored = await routines.getWithSteps(restored!.id);
    expect(loadedRestored?.steps.map((step) => step.displayName)).toEqual([
      '站姿股四头肌拉伸（左）',
      '站姿股四头肌拉伸（右）',
      '坐姿腿后肌拉伸（左）',
      '坐姿腿后肌拉伸（右）',
      '站姿小腿拉伸（左）',
      '站姿小腿拉伸（右）',
      '跪姿髋屈肌拉伸（左）',
      '跪姿髋屈肌拉伸（右）',
      '蝴蝶式坐姿',
    ]);
    // Restored steps still point back at the seeded library actions.
    const seedActionIds = new Set(
      (await actions.list()).map((action) => action.id),
    );
    expect(
      loadedRestored?.steps.every(
        (step) => Boolean(step.sourceActionId) && seedActionIds.has(step.sourceActionId!),
      ),
    ).toBe(true);

    // User-owned data survived verbatim.
    expect(await count(db, 'actions')).toBe(15);
    expect(await count(db, 'routines')).toBe(3);
    expect((await actions.getById(ownAction.id))?.name).toBe('我的动作');
    expect((await routines.getById(ownRoutine.routine.id))?.name).toBe('我的流程');
    const ownWithSteps = await routines.getWithSteps(ownRoutine.routine.id);
    expect(ownWithSteps?.steps.map((step) => step.displayName)).toEqual(['我的动作']);

    // Repair does not bump the seed marker, so it can run again on next boot.
    const marker = await db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [
      SEED_VERSION_KEY,
    ]);
    expect(marker?.value).toBe(String(SEED_VERSION));

    db.close();
  });

  it('is a no-op once every shipped routine is present', async () => {
    const { db, clock } = setup();
    await runMigrations(db);

    await runSeeds({ db, clock, generateId: createSequentialIdGenerator() });
    const before = {
      actions: await count(db, 'actions'),
      routines: await count(db, 'routines'),
      steps: await count(db, 'routine_steps'),
    };

    const result = await repairSeededRoutines({ db, clock, generateId: createSequentialIdGenerator() });
    expect(result).toEqual({ outcome: 'intact', restoredRoutineNames: [] });
    expect(await count(db, 'actions')).toBe(before.actions);
    expect(await count(db, 'routines')).toBe(before.routines);
    expect(await count(db, 'routine_steps')).toBe(before.steps);

    db.close();
  });

  it('never injects seed content into a library that was never seeded', async () => {
    const { db, clock } = setup();
    await runMigrations(db);

    const actions = createActionRepository({ db, clock, generateId: createSequentialIdGenerator() });
    const routines = createRoutineRepository({ db, clock, generateId: createSequentialIdGenerator() });
    await actions.create({ name: '我的动作', defaultDurationSec: 45, sideMode: 'single' });
    await routines.create({
      name: '我的流程',
      defaultDurationSec: 20,
      defaultTransitionSec: 0,
      steps: [{ displayName: '我的动作', durationSec: 20, transitionSec: 0 }],
    });

    const result = await repairSeededRoutines({ db, clock, generateId: createSequentialIdGenerator() });
    expect(result).toEqual({ outcome: 'not-applicable', restoredRoutineNames: [] });
    expect(await count(db, 'actions')).toBe(1);
    expect(await count(db, 'routines')).toBe(1);
    expect(await count(db, 'routine_steps')).toBe(1);

    db.close();
  });
});
