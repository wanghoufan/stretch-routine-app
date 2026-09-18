import { screen } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { press, type as typeText } from '../support/interaction';

/**
 * TASK-014 B-3 acceptance at the UI level: the Action library groups by scene
 * (with a 部位 second level under 拉伸), collapses, and the difficulty chips +
 * search box narrow the visible groups.
 */
describe('动作库分组筛选 (TASK-014)', () => {
  async function setup() {
    const context = await createTestContext();

    await context.services.actions.create({
      name: '颈部拉伸',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['办公'],
      difficulty: '低',
      bodypart: ['颈'],
    });
    await context.services.actions.create({
      name: '髋部拉伸',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['睡前'],
      difficulty: '中',
      bodypart: ['髋臀'],
    });
    await context.services.actions.create({
      name: '无标签动作',
      defaultDurationSec: 30,
      sideMode: 'single',
    });
    await context.services.actions.create({
      name: '高抬腿',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['热身'],
      difficulty: '中',
      bodypart: ['腿'],
    });
    await context.services.actions.create({
      name: '死虫',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['核心'],
      difficulty: '高',
      bodypart: ['腰腹'],
    });
    await context.services.actions.create({
      name: '肩部环绕',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['办公'],
      difficulty: '低',
      bodypart: ['肩'],
    });

    renderApp({
      services: context.services,
      speaker: createTestSpeaker(),
      initialRoute: { name: 'ActionLibrary', params: undefined },
    });
    await screen.findByTestId('library-group-拉伸');
    return context;
  }

  it('默认只展开第一组并显示数量角标，其余折叠，拉伸组内按部位二级分组', async () => {
    const context = await setup();

    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('4');
    expect(screen.getByTestId('library-group-热身-count')).toHaveTextContent('1');
    expect(screen.getByTestId('library-group-核心训练-count')).toHaveTextContent('1');

    expect(screen.getByTestId('library-subgroup-颈')).toBeTruthy();
    expect(screen.getByTestId('library-subgroup-肩')).toBeTruthy();
    expect(screen.getByTestId('library-subgroup-髋臀')).toBeTruthy();
    expect(screen.getByTestId('library-subgroup-其他')).toBeTruthy();

    expect(screen.getByText('颈部拉伸')).toBeTruthy();
    expect(screen.queryByText('高抬腿')).toBeNull();
    expect(screen.queryByText('死虫')).toBeNull();

    context.dispose();
  });

  it('点击组头可以展开与收起', async () => {
    const context = await setup();

    expect(screen.queryByText('高抬腿')).toBeNull();
    await press('library-group-热身');
    expect(screen.getByText('高抬腿')).toBeTruthy();
    await press('library-group-热身');
    expect(screen.queryByText('高抬腿')).toBeNull();

    context.dispose();
  });

  it('难度 chips 单选过滤，命中的空组隐藏', async () => {
    const context = await setup();

    await press('filter-difficulty-高');
    expect(screen.queryByTestId('library-group-拉伸')).toBeNull();
    expect(screen.queryByTestId('library-group-热身')).toBeNull();
    expect(screen.getByTestId('library-group-核心训练-count')).toHaveTextContent('1');
    expect(screen.getByText('死虫')).toBeTruthy();
    expect(screen.queryByText('颈部拉伸')).toBeNull();

    context.dispose();
  });

  it('搜索按名称子串过滤，无命中时进入空结果态并可清除筛选', async () => {
    const context = await setup();

    await typeText('library-search', '肩');
    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('1');
    expect(screen.getByText('肩部环绕')).toBeTruthy();
    expect(screen.queryByText('颈部拉伸')).toBeNull();

    await typeText('library-search', '不存在的动作');
    expect(screen.getByTestId('library-empty')).toBeTruthy();
    expect(screen.queryByText('肩部环绕')).toBeNull();

    await press('library-clear-filters');
    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('4');
    expect(screen.getByText('颈部拉伸')).toBeTruthy();

    context.dispose();
  });
});
