import { createActionRepository } from '../../data/repositories/actionRepository';
import { createRoutineRepository } from '../../data/repositories/routineRepository';
import { FakeClock } from '../../services/clock';
import { createSequentialIdGenerator } from '../../shared/utils/id';
import { createNodeSqlDatabase, type NodeSqlDatabase } from '../support/nodeSqlDatabase';
import { runMigrations } from '../../data/migrations';

function setup() {
  const db: NodeSqlDatabase = createNodeSqlDatabase();
  const clock = new FakeClock(Date.parse('2026-09-17T00:00:00.000Z'));
  const generateId = createSequentialIdGenerator();
  return {
    db,
    clock,
    actions: createActionRepository({ db, clock, generateId }),
    routines: createRoutineRepository({ db, clock, generateId }),
  };
}

describe('action repository', () => {
  it('creates, lists and reads back an action', async () => {
    const { db, actions } = setup();
    await runMigrations(db);

    const created = await actions.create({
      name: '  肩部拉伸  ',
      defaultDurationSec: 45,
      sideMode: 'bilateral',
      defaultSpeakText: ' 左侧肩部拉伸 ',
    });

    expect(created.name).toBe('肩部拉伸');
    expect(created.sideMode).toBe('bilateral');
    expect(created.createdAt).toBe('2026-09-17T00:00:00.000Z');

    const loaded = await actions.getById(created.id);
    expect(loaded).toEqual(created);

    const listed = await actions.list();
    expect(listed).toHaveLength(1);
    db.close();
  });

  it('rejects an empty name and clamps the duration', async () => {
    const { db, actions } = setup();
    await runMigrations(db);

    await expect(
      actions.create({ name: '   ', defaultDurationSec: 30, sideMode: 'single' }),
    ).rejects.toThrow('动作名称不能为空');

    const clamped = await actions.create({ name: '深蹲', defaultDurationSec: 0, sideMode: 'single' });
    expect(clamped.defaultDurationSec).toBe(1);
    db.close();
  });

  it('updates an action and refreshes updatedAt', async () => {
    const { db, clock, actions } = setup();
    await runMigrations(db);

    const created = await actions.create({ name: 'A', defaultDurationSec: 30, sideMode: 'single' });
    clock.advance(60_000);
    const updated = await actions.update(created.id, { name: 'B', sideMode: 'bilateral' });

    expect(updated.name).toBe('B');
    expect(updated.sideMode).toBe('bilateral');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).not.toBe(created.updatedAt);
    db.close();
  });

  it('persists 场景/难度/部位 tags and updates them', async () => {
    const { db, actions } = setup();
    await runMigrations(db);

    const created = await actions.create({
      name: '门框扩胸',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['胸', '办公'],
      difficulty: '中',
      bodypart: ['胸', '肩'],
    });

    const loaded = await actions.getById(created.id);
    expect(loaded?.category).toEqual(['胸', '办公']);
    expect(loaded?.difficulty).toBe('中');
    expect(loaded?.bodypart).toEqual(['胸', '肩']);

    const updated = await actions.update(created.id, { difficulty: '高', bodypart: ['胸'] });
    expect(updated.category).toEqual(['胸', '办公']);
    expect(updated.difficulty).toBe('高');
    expect((await actions.getById(created.id))?.bodypart).toEqual(['胸']);

    // An untagged action stays untagged.
    const plain = await actions.create({ name: '无标签', defaultDurationSec: 30, sideMode: 'single' });
    expect((await actions.getById(plain.id))?.difficulty).toBeUndefined();
    db.close();
  });

  it('keeps existing routine snapshots intact when an action is deleted (T079/FR-015)', async () => {
    const { db, actions, routines } = setup();
    await runMigrations(db);

    const action = await actions.create({
      name: '原始名字',
      defaultDurationSec: 40,
      sideMode: 'single',
    });
    const saved = await routines.create({
      name: '早操',
      defaultDurationSec: 30,
      defaultTransitionSec: 5,
      steps: [
        {
          sourceActionId: action.id,
          displayName: '原始名字',
          speakText: '原始名字',
          durationSec: 40,
          transitionSec: 0,
        },
      ],
    });

    await actions.remove(action.id);

    expect(await actions.list()).toHaveLength(0);
    const afterDelete = await routines.getWithSteps(saved.routine.id);
    expect(afterDelete?.steps[0]?.displayName).toBe('原始名字');
    expect(afterDelete?.steps[0]?.durationSec).toBe(40);
    // The back-reference is released, but the playback snapshot is untouched.
    expect(afterDelete?.steps[0]?.sourceActionId).toBeUndefined();
    db.close();
  });

  it('updating an action never rewrites routine step snapshots', async () => {
    const { db, actions, routines } = setup();
    await runMigrations(db);

    const action = await actions.create({ name: '拉伸', defaultDurationSec: 30, sideMode: 'single' });
    const saved = await routines.create({
      name: '流程',
      defaultDurationSec: 30,
      defaultTransitionSec: 0,
      steps: [
        {
          sourceActionId: action.id,
          displayName: '拉伸',
          speakText: '拉伸',
          durationSec: 30,
          transitionSec: 0,
        },
      ],
    });

    await actions.update(action.id, { name: '完全不同的名字', defaultDurationSec: 99 });

    const after = await routines.getWithSteps(saved.routine.id);
    expect(after?.steps[0]?.displayName).toBe('拉伸');
    expect(after?.steps[0]?.durationSec).toBe(30);
    db.close();
  });
});
