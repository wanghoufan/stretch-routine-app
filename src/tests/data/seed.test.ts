import {
  SEED_ACTIONS,
  SEED_EXAMPLES_CLEARED_KEY,
  SEED_ROUTINES,
  SEED_VERSION,
  SEED_VERSION_KEY,
  clearSeededExamples,
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
  category: string | null;
  difficulty: string | null;
  bodypart: string | null;
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
  it('seeds the V2 catalog (59 actions, 9 routines) with tags into an empty database', async () => {
    const { db, clock } = setup();
    await runMigrations(db);

    const outcome = await runSeeds({ db, clock, generateId: createSequentialIdGenerator() });
    expect(outcome).toBe('seeded');

    const actions = await db.all<ActionRowShape>('SELECT * FROM actions');
    expect(actions).toHaveLength(59);
    expect(actions).toHaveLength(SEED_ACTIONS.length);
    expect(new Set(actions.map((action) => action.name))).toEqual(
      new Set(SEED_ACTIONS.map((definition) => definition.name)),
    );
    expect(actions.filter((action) => action.side_mode === 'bilateral')).toHaveLength(26);
    expect(actions.filter((action) => action.side_mode === 'single')).toHaveLength(33);
    // Every action defaults to 30s and speaks its Chinese name aloud (TTS).
    expect(actions.every((action) => action.default_duration_sec === 30)).toBe(true);
    expect(actions.every((action) => action.default_speak_text === action.name)).toBe(true);
    expect(actions.every((action) => /[\u4e00-\u9fff]/.test(action.name))).toBe(true);

    // V2 §5 tags: every seeded action carries 场景/难度/部位 drawn from the
    // agreed vocabulary.
    for (const row of actions) {
      const categories = (row.category ?? '').split(',').filter(Boolean);
      const bodyparts = (row.bodypart ?? '').split(',').filter(Boolean);
      expect(categories.length).toBeGreaterThan(0);
      expect(bodyparts.length).toBeGreaterThan(0);
      expect(['低', '中', '高']).toContain(row.difficulty);
    }
    const triceps = actions.find((row) => row.name === '肱三头肌拉伸');
    expect(triceps?.bodypart).toBe('肩');
    expect(triceps?.difficulty).toBe('中');
    const chest = actions.find((row) => row.name === '开门胸部拉伸');
    expect(chest?.category?.split(',')).toEqual(expect.arrayContaining(['胸']));

    const routines = createRoutineRepository({ db, clock, generateId: createSequentialIdGenerator() });
    const summaries = await routines.listSummaries();
    expect(summaries).toHaveLength(9);
    expect(summaries.map((summary) => summary.name).sort()).toEqual(
      [...SEED_ROUTINES.map((definition) => definition.name)].sort(),
    );
    // Stretch/warm-up templates keep the 30s/5s defaults; core templates use
    // their own rest (45/30/20) expressed as transition seconds.
    expect(
      summaries
        .filter((summary) => !summary.name.includes('核心'))
        .every((summary) => summary.defaultDurationSec === 30 && summary.defaultTransitionSec === 5),
    ).toBe(true);
    expect(summaries.find((summary) => summary.name === '初级核心')?.defaultTransitionSec).toBe(45);
    expect(summaries.find((summary) => summary.name === '中级核心')?.defaultTransitionSec).toBe(30);
    expect(summaries.find((summary) => summary.name === '高级核心')?.defaultTransitionSec).toBe(20);

    // Routine tags follow the same schema.
    const core = summaries.find((summary) => summary.name === '中级核心');
    expect(core?.category).toEqual(['核心']);
    expect(core?.difficulty).toBe('中');
    expect(core?.bodypart).toEqual(expect.arrayContaining(['腰腹', '髋臀']));

    const morning = summaries.find((summary) => summary.name === '晨起全身拉伸');
    expect(morning?.stepCount).toBe(10);
    // 10 steps x 30s + 9 transitions x 5s.
    expect(morning?.totalDurationSec).toBe(345);

    const evening = summaries.find((summary) => summary.name === '跑后下肢放松');
    expect(evening?.stepCount).toBe(9);
    expect(evening?.totalDurationSec).toBe(310);

    // Renamed + lengthened office template (TASK-012): 5 + 腰背 4 + 臀腿 3.
    const office = summaries.find((summary) => summary.name === '办公室久坐放松');
    expect(office?.stepCount).toBe(21);
    expect(office?.totalDurationSec).toBe(730);
    expect(summaries.find((summary) => summary.name === '办公室肩颈放松')).toBeUndefined();

    const bedtime = summaries.find((summary) => summary.name === '睡前全身放松');
    expect(bedtime?.stepCount).toBe(10);
    expect(bedtime?.totalDurationSec).toBe(345);
    const warmup = summaries.find((summary) => summary.name === '5分钟快速热身');
    expect(warmup?.stepCount).toBe(9);
    expect(warmup?.totalDurationSec).toBe(310);

    // New templates.
    const desk = summaries.find((summary) => summary.name === '久坐办公族拉伸');
    expect(desk?.stepCount).toBe(20);
    expect(desk?.totalDurationSec).toBe(695);
    const beginner = summaries.find((summary) => summary.name === '初级核心');
    expect(beginner?.stepCount).toBe(3);
    expect(beginner?.totalDurationSec).toBe(180);
    const intermediate = summaries.find((summary) => summary.name === '中级核心');
    expect(intermediate?.stepCount).toBe(5);
    expect(intermediate?.totalDurationSec).toBe(270);
    const advanced = summaries.find((summary) => summary.name === '高级核心');
    expect(advanced?.stepCount).toBe(5);
    expect(advanced?.totalDurationSec).toBe(230);

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
    expect(afterFirst).toEqual({ actions: 59, routines: 9, steps: 92 });

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
    expect(await count(db, 'routines')).toBe(9);

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
    expect(await count(db, 'actions')).toBe(60);
    expect(await count(db, 'routines')).toBe(10);
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

  it('tops up an upgraded install with the new V2 templates it is missing (TASK-012)', async () => {
    const { db, clock } = setup();
    await runMigrations(db);

    const generateId = createSequentialIdGenerator();
    const routines = createRoutineRepository({ db, clock, generateId });
    await runSeeds({ db, clock, generateId });

    // Simulate a pre-V2 install: the office template still carries its old name
    // and the four brand-new templates do not exist yet.
    const office = (await routines.list()).find((routine) => routine.name === '办公室久坐放松');
    expect(office).toBeDefined();
    const officeLoaded = await routines.getWithSteps(office!.id);
    await routines.update(office!.id, {
      name: '办公室肩颈放松',
      defaultDurationSec: officeLoaded!.routine.defaultDurationSec,
      defaultTransitionSec: officeLoaded!.routine.defaultTransitionSec,
      steps: officeLoaded!.steps.map((step) => ({
        displayName: step.displayName,
        speakText: step.speakText,
        durationSec: step.durationSec,
        transitionSec: step.transitionSec,
      })),
    });
    const addedTemplates = ['办公室久坐放松', '久坐办公族拉伸', '初级核心', '中级核心', '高级核心'];
    for (const name of addedTemplates.slice(1)) {
      const routine = (await routines.list()).find((candidate) => candidate.name === name);
      expect(routine).toBeDefined();
      await routines.remove(routine!.id);
    }
    expect(await count(db, 'routines')).toBe(5);
    const beforeActions = await count(db, 'actions');

    const result = await repairSeededRoutines({ db, clock, generateId });
    expect(result.outcome).toBe('repaired');
    expect([...result.restoredRoutineNames].sort()).toEqual([...addedTemplates].sort());

    // Only rows were added: the library is whole again and no Action was
    // duplicated or rewritten ("只增不改"). The legacy-named office routine
    // stays put next to the freshly added renamed one.
    expect(await count(db, 'routines')).toBe(10);
    expect(await count(db, 'actions')).toBe(beforeActions);
    const restored = await routines.listSummaries();
    expect(restored.find((summary) => summary.name === '办公室久坐放松')?.stepCount).toBe(21);
    expect(restored.find((summary) => summary.name === '久坐办公族拉伸')?.stepCount).toBe(20);
    expect(restored.find((summary) => summary.name === '初级核心')?.stepCount).toBe(3);
    expect(restored.find((summary) => summary.name === '中级核心')?.stepCount).toBe(5);
    expect(restored.find((summary) => summary.name === '高级核心')?.stepCount).toBe(5);
    expect(restored.find((summary) => summary.name === '办公室肩颈放松')?.stepCount).toBe(21);

    db.close();
  });
});

describe('clear seeded examples (TASK-010 R3)', () => {
  async function seedWithUserContent(db: NodeSqlDatabase, clock: FakeClock) {
    const generateId = createSequentialIdGenerator();
    const actions = createActionRepository({ db, clock, generateId });
    const routines = createRoutineRepository({ db, clock, generateId });

    await runSeeds({ db, clock, generateId });
    const ownAction = await actions.create({
      name: '我的动作',
      defaultDurationSec: 45,
      sideMode: 'single',
    });
    const ownRoutine = await routines.create({
      name: '我的流程',
      defaultDurationSec: 20,
      defaultTransitionSec: 0,
      steps: [{ displayName: '我的动作', durationSec: 20, transitionSec: 0 }],
    });

    return { generateId, actions, routines, ownAction, ownRoutine: ownRoutine.routine };
  }

  it('removes only catalog-named seed rows and never touches user data', async () => {
    const { db, clock } = setup();
    await runMigrations(db);
    const { generateId, actions, routines, ownAction, ownRoutine } = await seedWithUserContent(db, clock);

    // The user renames one shipped routine; it stops being "the shipped one"
    // and must survive the clear verbatim.
    const office = (await routines.list()).find((routine) => routine.name === '办公室久坐放松');
    expect(office).toBeDefined();
    const officeLoaded = await routines.getWithSteps(office!.id);
    await routines.update(office!.id, {
      name: '我的办公室放松',
      defaultDurationSec: officeLoaded!.routine.defaultDurationSec,
      defaultTransitionSec: officeLoaded!.routine.defaultTransitionSec,
      steps: officeLoaded!.steps.map((step) => ({
        displayName: step.displayName,
        speakText: step.speakText,
        durationSec: step.durationSec,
        transitionSec: step.transitionSec,
      })),
    });

    const result = await clearSeededExamples({ db, clock, generateId });
    expect(result.removedRoutineNames).toHaveLength(8);
    expect(result.removedRoutineNames).not.toContain('我的办公室放松');
    expect(result.removedActionNames).toHaveLength(59);

    // Only the renamed routine plus the user's own routine remain.
    expect((await routines.list()).map((routine) => routine.name).sort()).toEqual(
      ['我的办公室放松', '我的流程'].sort(),
    );
    // Every seed Action is gone; the user's own Action survives untouched.
    const remainingActions = await actions.list();
    expect(remainingActions.map((action) => action.name)).toEqual(['我的动作']);
    expect((await actions.getById(ownAction.id))?.defaultDurationSec).toBe(45);

    // User-owned data is byte-for-byte intact, and dangling links were cleared.
    expect((await routines.getById(ownRoutine.id))?.name).toBe('我的流程');
    const renamed = (await routines.list()).find((routine) => routine.name === '我的办公室放松');
    const renamedSteps = await routines.getWithSteps(renamed!.id);
    expect(renamedSteps?.steps).toHaveLength(21);
    expect(renamedSteps?.steps.every((step) => step.sourceActionId === undefined)).toBe(true);

    // The one-shot seed marker stays so `runSeeds` will not reseed, and the
    // cleared marker is recorded.
    const seedMarker = await db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [
      SEED_VERSION_KEY,
    ]);
    expect(seedMarker?.value).toBe(String(SEED_VERSION));
    const clearedMarker = await db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [
      SEED_EXAMPLES_CLEARED_KEY,
    ]);
    expect(clearedMarker?.value).toBe('true');

    // Repair must no longer resurrect anything.
    const repair = await repairSeededRoutines({ db, clock, generateId });
    expect(repair).toEqual({ outcome: 'skipped-cleared', restoredRoutineNames: [] });
    expect(await count(db, 'routines')).toBe(2);
    expect(await count(db, 'actions')).toBe(1);

    db.close();
  });

  it('is idempotent: clearing twice removes nothing and never reseeds', async () => {
    const { db, clock } = setup();
    await runMigrations(db);
    const { generateId } = await seedWithUserContent(db, clock);

    await clearSeededExamples({ db, clock, generateId });
    const routinesAfter = await count(db, 'routines');
    const actionsAfter = await count(db, 'actions');

    const second = await clearSeededExamples({ db, clock, generateId });
    expect(second).toEqual({ removedRoutineNames: [], removedActionNames: [] });
    expect(await count(db, 'routines')).toBe(routinesAfter);
    expect(await count(db, 'actions')).toBe(actionsAfter);

    // A subsequent launch still does not reseed or repair.
    expect(await runSeeds({ db, clock, generateId })).toBe('already-seeded');
    const repair = await repairSeededRoutines({ db, clock, generateId });
    expect(repair.outcome).toBe('skipped-cleared');

    db.close();
  });
});
