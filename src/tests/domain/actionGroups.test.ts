import type { Action } from '../../domain/action/Action';
import {
  BODY_PART_GROUP_ORDER,
  bodyPartOfAction,
  DEFAULT_ACTION_FILTERS,
  filterActions,
  groupActions,
  matchesActionFilters,
  sceneOfAction,
} from '../../features/actions/services/actionGroups';

function makeAction(overrides: Partial<Action> & { name: string }): Action {
  return {
    id: overrides.name,
    defaultDurationSec: 30,
    sideMode: 'single',
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('动作库分组映射 (TASK-014)', () => {
  it('按 category 判定一级场景，热身优先于核心，其余归拉伸', () => {
    expect(sceneOfAction(makeAction({ name: '无标签' }))).toBe('拉伸');
    expect(sceneOfAction(makeAction({ name: '办公', category: ['办公'] }))).toBe('拉伸');
    expect(sceneOfAction(makeAction({ name: '热身', category: ['热身'] }))).toBe('热身');
    expect(sceneOfAction(makeAction({ name: '核心', category: ['核心'] }))).toBe('核心训练');
    // 同时带热身与核心时，按 B-3 顺序热身优先。
    expect(sceneOfAction(makeAction({ name: '登山跑', category: ['热身', '核心'] }))).toBe('热身');
  });

  it('按 bodypart 归入规范顺序中的第一个部位，无标签进其他', () => {
    expect(bodyPartOfAction(makeAction({ name: '颈肩', bodypart: ['肩', '颈'] }))).toBe('颈');
    expect(bodyPartOfAction(makeAction({ name: '腰腹', bodypart: ['腰腹'] }))).toBe('腰腹');
    expect(bodyPartOfAction(makeAction({ name: '无标签' }))).toBe('其他');
    expect(bodyPartOfAction(makeAction({ name: '未知部位', bodypart: ['未知'] }))).toBe('其他');
  });

  it('groupActions 按场景顺序输出，空组隐藏，拉伸内再按部位分组', () => {
    const actions = [
      makeAction({ name: '颈部拉伸', category: ['办公'], difficulty: '低', bodypart: ['颈'] }),
      makeAction({ name: '髋部拉伸', category: ['睡前'], difficulty: '中', bodypart: ['髋臀'] }),
      makeAction({ name: '无标签', difficulty: '低' }),
      makeAction({ name: '高抬腿', category: ['热身'], difficulty: '中', bodypart: ['腿'] }),
      makeAction({ name: '死虫', category: ['核心'], difficulty: '高', bodypart: ['腰腹'] }),
    ];

    const groups = groupActions(actions);

    expect(groups.map((group) => group.scene)).toEqual(['拉伸', '热身', '核心训练']);
    expect(groups.map((group) => group.count)).toEqual([3, 1, 1]);

    const stretch = groups[0]!;
    expect(stretch.bodyParts.map((part) => part.key)).toEqual(['颈', '髋臀', '其他']);
    expect(stretch.bodyParts.every((part) => part.actions.length === part.count)).toBe(true);
    // 每个动作只出现一次。
    const stretchIds = stretch.bodyParts.flatMap((part) => part.actions.map((action) => action.id));
    expect(new Set(stretchIds).size).toBe(stretchIds.length);
    expect(groups[1]!.bodyParts).toEqual([]);
  });

  it('规范部位顺序为 颈肩胸背腰腹髋臀腿小腿全身 其他', () => {
    expect(BODY_PART_GROUP_ORDER).toEqual([
      '颈',
      '肩',
      '胸',
      '背',
      '腰腹',
      '髋臀',
      '腿',
      '小腿',
      '全身',
      '其他',
    ]);
  });

  it('难度为单选过滤，搜索按名称子串且忽略大小写', () => {
    const actions = [
      makeAction({ name: 'Neck Stretch', difficulty: '低', bodypart: ['颈'] }),
      makeAction({ name: '肩部环绕', difficulty: '中', bodypart: ['肩'] }),
      makeAction({ name: '深蹲', difficulty: '高', bodypart: ['腿'] }),
    ];

    expect(filterActions(actions, { difficulty: '高', query: '' }).map((a) => a.name)).toEqual(['深蹲']);
    expect(filterActions(actions, { difficulty: '全部', query: '肩' }).map((a) => a.name)).toEqual([
      '肩部环绕',
    ]);
    expect(filterActions(actions, { difficulty: '全部', query: 'neck' }).map((a) => a.name)).toEqual([
      'Neck Stretch',
    ]);
    // 两个条件是 AND。
    expect(filterActions(actions, { difficulty: '低', query: '深蹲' })).toEqual([]);

    const defaults = DEFAULT_ACTION_FILTERS;
    expect(matchesActionFilters(actions[0]!, defaults)).toBe(true);
  });

  it('过滤后空场景不出现在结果里', () => {
    const actions = [
      makeAction({ name: '死虫', category: ['核心'], difficulty: '高', bodypart: ['腰腹'] }),
    ];
    const groups = groupActions(actions, { difficulty: '高', query: '' });
    expect(groups.map((group) => group.scene)).toEqual(['核心训练']);
  });
});
