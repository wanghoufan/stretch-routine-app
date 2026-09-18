import type { RoutineSummary } from '../../domain/routine/Routine';
import { groupRoutines, sceneOfRoutine } from '../../features/routines/services/routineGroups';

function makeRoutine(
  overrides: Partial<RoutineSummary> & { name: string },
): RoutineSummary {
  return {
    id: overrides.name,
    defaultDurationSec: 30,
    defaultTransitionSec: 0,
    stepCount: 1,
    totalDurationSec: 30,
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('流程模板场景分组 (TASK-014)', () => {
  it('按 category 判定模板场景', () => {
    expect(sceneOfRoutine(makeRoutine({ name: '晨起', category: ['晨起'] }))).toBe('日常拉伸');
    expect(sceneOfRoutine(makeRoutine({ name: '睡前', category: ['睡前'] }))).toBe('日常拉伸');
    expect(sceneOfRoutine(makeRoutine({ name: '跑后', category: ['跑后'] }))).toBe('健身前后');
    expect(sceneOfRoutine(makeRoutine({ name: '办公', category: ['办公'] }))).toBe('健身前后');
    expect(sceneOfRoutine(makeRoutine({ name: '胸', category: ['胸'] }))).toBe('健身前后');
    expect(sceneOfRoutine(makeRoutine({ name: '背', category: ['背'] }))).toBe('健身前后');
    expect(sceneOfRoutine(makeRoutine({ name: '腿', category: ['腿'] }))).toBe('健身前后');
    expect(sceneOfRoutine(makeRoutine({ name: '热身', category: ['热身'] }))).toBe('热身');
    expect(sceneOfRoutine(makeRoutine({ name: '核心', category: ['核心'] }))).toBe('核心');
    expect(sceneOfRoutine(makeRoutine({ name: '无标签' }))).toBe('其他');
  });

  it('groupRoutines 按场景顺序输出且隐藏空组', () => {
    const routines = [
      makeRoutine({ name: '初级核心', category: ['核心'] }),
      makeRoutine({ name: '晨起全身拉伸', category: ['晨起'] }),
      makeRoutine({ name: '跑后下肢放松', category: ['跑后'] }),
      makeRoutine({ name: '5分钟快速热身', category: ['热身'] }),
    ];

    const groups = groupRoutines(routines);

    expect(groups.map((group) => group.scene)).toEqual([
      '日常拉伸',
      '健身前后',
      '热身',
      '核心',
    ]);
    expect(groups.map((group) => group.count)).toEqual([1, 1, 1, 1]);
    expect(groups.map((group) => group.key)).toEqual([
      'routine-group-日常拉伸',
      'routine-group-健身前后',
      'routine-group-热身',
      'routine-group-核心',
    ]);
  });

  it('没有匹配模板时不产生分组', () => {
    expect(groupRoutines([])).toEqual([]);
  });
});
