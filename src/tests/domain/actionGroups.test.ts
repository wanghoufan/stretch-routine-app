import type { Action } from '../../domain/action/Action';
import {
  ACTION_SCENES,
  ALL_BODY_PART,
  BODY_PART_FILTER_ORDER,
  BODY_PART_GROUPS,
  bodyPartChipsForScene,
  bodyPartsOfAction,
  DEFAULT_ACTION_FILTERS,
  groupActions,
  isOtherBodyPartAction,
  matchesActionQuery,
  matchesBodyPartFilter,
  resolveBodyPartFilter,
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

describe('动作库动态部位筛选 (TASK-018)', () => {
  describe('场景判定（B-3 规则不变）', () => {
    it('按 category 判定一级场景，热身优先于核心，其余归拉伸', () => {
      expect(sceneOfAction(makeAction({ name: '无标签' }))).toBe('拉伸');
      expect(sceneOfAction(makeAction({ name: '办公', category: ['办公'] }))).toBe('拉伸');
      expect(sceneOfAction(makeAction({ name: '热身', category: ['热身'] }))).toBe('热身');
      expect(sceneOfAction(makeAction({ name: '核心', category: ['核心'] }))).toBe('核心训练');
      // 同时带热身与核心时，按 B-3 顺序热身优先。
      expect(sceneOfAction(makeAction({ name: '登山跑', category: ['热身', '核心'] }))).toBe('热身');
    });
  });

  describe('规范部位交集与「其他」', () => {
    it('bodyPartsOfAction 返回动作携带的全部规范部位并按规范顺序排列', () => {
      expect(bodyPartsOfAction(makeAction({ name: '颈肩', bodypart: ['肩', '颈'] }))).toEqual([
        '颈',
        '肩',
      ]);
      expect(bodyPartsOfAction(makeAction({ name: '跑后', bodypart: ['腿', '髋臀', '小腿'] }))).toEqual([
        '髋臀',
        '腿',
        '小腿',
      ]);
      expect(bodyPartsOfAction(makeAction({ name: '脏标签', bodypart: ['腿', '未知', '腰腹'] }))).toEqual([
        '腰腹',
        '腿',
      ]);
      expect(bodyPartsOfAction(makeAction({ name: '无标签' }))).toEqual([]);
    });

    it('无规范部位的动作归「其他」，含任一规范部位则不算', () => {
      expect(isOtherBodyPartAction(makeAction({ name: '无标签' }))).toBe(true);
      expect(isOtherBodyPartAction(makeAction({ name: '空数组', bodypart: [] }))).toBe(true);
      expect(isOtherBodyPartAction(makeAction({ name: '未知only', bodypart: ['未知', '脏'] }))).toBe(true);
      expect(isOtherBodyPartAction(makeAction({ name: '规范加未知', bodypart: ['腿', '未知'] }))).toBe(false);
    });

    it('单选命中＝交集：多部位动作任一所选部位都命中，「其他」只命中无规范部位动作', () => {
      const action = makeAction({ name: '跑后', bodypart: ['腿', '髋臀', '小腿'] });
      expect(matchesBodyPartFilter(action, '腿')).toBe(true);
      expect(matchesBodyPartFilter(action, '髋臀')).toBe(true);
      expect(matchesBodyPartFilter(action, '小腿')).toBe(true);
      expect(matchesBodyPartFilter(action, '颈')).toBe(false);
      expect(matchesBodyPartFilter(action, ALL_BODY_PART)).toBe(true);
      expect(matchesBodyPartFilter(action, '其他')).toBe(false);
      expect(matchesBodyPartFilter(makeAction({ name: '无标签' }), '其他')).toBe(true);
    });
  });

  describe('动态 chips 生成', () => {
    const stretchActions = [
      makeAction({ name: '颈部拉伸', category: ['办公'], bodypart: ['颈'] }),
      makeAction({ name: '跑后', category: ['跑后'], bodypart: ['腿', '髋臀', '小腿'] }),
      makeAction({ name: '无标签动作' }),
    ];

    it('固定顺序为 全部→颈→肩→胸→背→腰腹→髋臀→腿→小腿→全身→其他', () => {
      expect(BODY_PART_FILTER_ORDER).toEqual([ALL_BODY_PART, ...BODY_PART_GROUPS, '其他']);
    });

    it('只输出该场景存在的部位项，「其他」仅在该场景有无规范部位动作时追加', () => {
      expect(bodyPartChipsForScene(stretchActions, '拉伸').map((chip) => chip.key)).toEqual([
        '全部',
        '颈',
        '髋臀',
        '腿',
        '小腿',
        '其他',
      ]);
      expect(
        bodyPartChipsForScene([makeAction({ name: '颈', bodypart: ['颈'] })], '拉伸').map(
          (chip) => chip.key,
        ),
      ).toEqual(['全部', '颈']);
    });

    it('chips 计数＝该选项会展示的动作数，「全部」为场景动作总数', () => {
      const chips = bodyPartChipsForScene(stretchActions, '拉伸');
      expect(chips.find((chip) => chip.key === '全部')?.count).toBe(3);
      expect(chips.find((chip) => chip.key === '腿')?.count).toBe(1);
      expect(chips.find((chip) => chip.key === '其他')?.count).toBe(1);
    });

    it('chips 只来自活动场景的完整集合，不随搜索或当前部位收缩', () => {
      const all = [
        ...stretchActions,
        makeAction({ name: '热身腿', category: ['热身'], bodypart: ['腿'] }),
      ];
      expect(bodyPartChipsForScene(all, '拉伸').map((chip) => chip.key)).toEqual([
        '全部',
        '颈',
        '髋臀',
        '腿',
        '小腿',
        '其他',
      ]);
      expect(bodyPartChipsForScene(all, '热身').map((chip) => chip.key)).toEqual(['全部', '腿']);
    });
  });

  describe('搜索与部位组合', () => {
    const actions = [
      makeAction({ name: 'Neck Stretch', category: ['办公'], bodypart: ['颈'] }),
      makeAction({ name: '肩部环绕', category: ['办公'], bodypart: ['肩'] }),
      makeAction({ name: '跑后拉伸', category: ['跑后'], bodypart: ['腿', '髋臀'] }),
      makeAction({ name: '高抬腿', category: ['热身'], bodypart: ['腿'] }),
    ];

    it('搜索按名称子串且去首尾空格、忽略大小写', () => {
      expect(matchesActionQuery(actions[0]!, '  NECK  ')).toBe(true);
      expect(matchesActionQuery(actions[0]!, '肩')).toBe(false);

      const groups = groupActions(actions, { query: '  NECK ', bodyPart: ALL_BODY_PART }, '拉伸');
      expect(groups.map((group) => group.scene)).toEqual(['拉伸']);
      expect(groups[0]!.actions.map((action) => action.name)).toEqual(['Neck Stretch']);
    });

    it('活动场景为搜索 AND 部位，其他场景只受搜索', () => {
      const groups = groupActions(actions, { query: '跑后', bodyPart: '髋臀' }, '拉伸');
      expect(groups.map((group) => group.scene)).toEqual(['拉伸']);
      expect(groups[0]!.count).toBe(1);
      expect(groups[0]!.actions.map((action) => action.name)).toEqual(['跑后拉伸']);

      // 活动场景=拉伸：搜索「腿」时拉伸内无命中，热身非活动组只受搜索仍显示。
      const searchOnly = groupActions(actions, { query: '腿', bodyPart: '髋臀' }, '拉伸');
      expect(searchOnly.map((group) => group.scene)).toEqual(['热身']);
      expect(searchOnly[0]!.actions.map((action) => action.name)).toEqual(['高抬腿']);
    });

    it('单选去重：多部位动作在同一屏只出现一次，badge＝唯一动作数', () => {
      const groups = groupActions(actions, { query: '', bodyPart: '腿' }, '拉伸');
      const stretch = groups.find((group) => group.scene === '拉伸')!;
      expect(stretch.actions.filter((action) => action.name === '跑后拉伸')).toHaveLength(1);
      expect(stretch.count).toBe(stretch.actions.length);
      expect(new Set(stretch.actions.map((action) => action.id)).size).toBe(stretch.actions.length);
    });
  });

  describe('空结果与失效回退', () => {
    it('空场景隐藏；活动场景全部被部位筛掉时返回空数组', () => {
      const actions = [makeAction({ name: '死虫', category: ['核心'], bodypart: ['腰腹'] })];
      expect(groupActions(actions, { query: '', bodyPart: '颈' }, '核心训练')).toEqual([]);
      expect(groupActions(actions, { query: '不存在', bodyPart: ALL_BODY_PART }, '核心训练')).toEqual([]);
      expect(
        groupActions(actions, { query: '', bodyPart: '腰腹' }, '核心训练').map((group) => group.scene),
      ).toEqual(['核心训练']);
    });

    it('失效部位回退「全部」', () => {
      const chips = bodyPartChipsForScene([makeAction({ name: '颈', bodypart: ['颈'] })], '拉伸');
      expect(resolveBodyPartFilter('腿', chips)).toBe(ALL_BODY_PART);
      expect(resolveBodyPartFilter('颈', chips)).toBe('颈');
      expect(resolveBodyPartFilter(ALL_BODY_PART, chips)).toBe(ALL_BODY_PART);
    });

    it('默认筛选状态只含搜索与部位，场景顺序不变', () => {
      expect(DEFAULT_ACTION_FILTERS).toEqual({ query: '', bodyPart: ALL_BODY_PART });
      expect(ACTION_SCENES).toEqual(['拉伸', '热身', '核心训练']);
    });
  });
});
