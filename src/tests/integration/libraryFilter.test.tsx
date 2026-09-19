import { screen } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { press, type as typeText } from '../support/interaction';
import { MIN_TOUCH_SIZE } from '../../shared/theme';

/**
 * TASK-018 B-4 acceptance at the UI level: the Action library drops the
 * difficulty chips and renders dynamic body-part chips for the active scene
 * (HD-1=A single-select + de-dup), combined with the global name search.
 *
 * 拉伸 scene: 颈部拉伸/髋部拉伸/肩部环绕/无标签动作/腿部拉伸 (5)
 * 热身 scene: 高抬腿/腿部热身 (2)
 * 核心训练 scene: 死虫 (1)
 */
describe('动作库动态部位筛选 (TASK-018)', () => {
  async function setup() {
    const context = await createTestContext();

    await context.services.actions.create({
      name: '颈部拉伸',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['办公'],
      bodypart: ['颈'],
    });
    await context.services.actions.create({
      name: '髋部拉伸',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['睡前'],
      bodypart: ['髋臀'],
    });
    await context.services.actions.create({
      name: '肩部环绕',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['办公'],
      bodypart: ['肩'],
    });
    await context.services.actions.create({
      name: '无标签动作',
      defaultDurationSec: 30,
      sideMode: 'single',
    });
    await context.services.actions.create({
      name: '腿部拉伸',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['跑后'],
      bodypart: ['腿'],
    });
    await context.services.actions.create({
      name: '高抬腿',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['热身'],
      bodypart: ['腿'],
    });
    await context.services.actions.create({
      name: '腿部热身',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['热身'],
      bodypart: ['腿'],
    });
    await context.services.actions.create({
      name: '死虫',
      defaultDurationSec: 30,
      sideMode: 'single',
      category: ['核心'],
      bodypart: ['腰腹'],
    });

    renderApp({
      services: context.services,
      speaker: createTestSpeaker(),
      initialRoute: { name: 'ActionLibrary', params: undefined },
    });
    await screen.findByTestId('library-group-拉伸');
    return context;
  }

  it('默认活动场景为拉伸：仅第一组展开、动态部位 chips 与角标正确，且无难度 chips/二级分组', async () => {
    const context = await setup();

    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('5');
    expect(screen.getByTestId('library-group-热身-count')).toHaveTextContent('2');
    expect(screen.getByTestId('library-group-核心训练-count')).toHaveTextContent('1');

    expect(screen.getByTestId('library-group-拉伸')).toBeExpanded();
    expect(screen.getByText('腿部拉伸')).toBeTruthy();
    expect(screen.queryByText('高抬腿')).toBeNull();
    expect(screen.queryByText('死虫')).toBeNull();

    // 动态部位 chips：容器朗读活动场景，顺序正确，缺项不出现。
    const chips = screen.getByTestId('library-bodypart-chips-拉伸');
    expect(chips.props.accessibilityRole).toBe('radiogroup');
    expect(chips.props.accessibilityLabel).toBe('筛选拉伸部位');
    for (const key of ['全部', '颈', '肩', '髋臀', '腿', '其他']) {
      expect(screen.getByTestId(`filter-bodypart-${key}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('filter-bodypart-胸')).toBeNull();
    expect(screen.queryByTestId('filter-bodypart-腰腹')).toBeNull();
    expect(screen.getByTestId('filter-bodypart-全部')).toBeSelected();
    expect(screen.getByRole('radio', { name: '拉伸部位：全部' })).toBeSelected();
    // 触控目标宽高都使用项目 MIN_TOUCH_SIZE（48），不再是旧的 36dp。
    expect(screen.getByTestId('filter-bodypart-全部')).toHaveStyle({
      minHeight: MIN_TOUCH_SIZE,
      minWidth: MIN_TOUCH_SIZE,
    });

    // 难度 chips 与二级部位分组已移除。
    expect(screen.queryByTestId('filter-difficulty-低')).toBeNull();
    expect(screen.queryByTestId('filter-difficulty-高')).toBeNull();
    expect(screen.queryByTestId('library-subgroup-颈')).toBeNull();

    context.dispose();
  });

  it('展开热身即切换活动场景并把部位选择重置为全部，chips 跟随切换', async () => {
    const context = await setup();

    await press('filter-bodypart-腿');
    expect(screen.getByTestId('filter-bodypart-腿')).toBeSelected();
    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('1');
    expect(screen.getByText('腿部拉伸')).toBeTruthy();
    expect(screen.queryByText('颈部拉伸')).toBeNull();

    await press('library-group-热身');
    expect(screen.getByTestId('library-bodypart-chips-热身')).toBeTruthy();
    expect(screen.queryByTestId('library-bodypart-chips-拉伸')).toBeNull();
    expect(screen.getByTestId('filter-bodypart-全部')).toBeSelected();
    expect(screen.getByTestId('filter-bodypart-腿')).toBeTruthy();
    // 原活动组仍展开，搜索/部位不再收窄它。
    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('5');
    expect(screen.getByText('颈部拉伸')).toBeTruthy();
    expect(screen.getByText('高抬腿')).toBeTruthy();

    context.dispose();
  });

  it('部位筛选只作用于活动场景，非活动组保持完整，收起活动组不改变归属', async () => {
    const context = await setup();

    await press('library-group-拉伸'); // 收起，活动场景仍为拉伸
    await press('library-group-热身'); // 展开，活动场景切到热身
    expect(screen.getByTestId('library-bodypart-chips-热身')).toBeTruthy();
    await press('library-group-拉伸'); // 重新展开，活动场景切回拉伸
    expect(screen.getByTestId('library-bodypart-chips-拉伸')).toBeTruthy();

    await press('filter-bodypart-颈');
    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('1');
    expect(screen.getByText('颈部拉伸')).toBeTruthy();
    expect(screen.queryByText('髋部拉伸')).toBeNull();
    expect(screen.queryByText('肩部环绕')).toBeNull();
    // 热身为非活动组，只受全局搜索，不受部位筛选影响。
    expect(screen.getByTestId('library-group-热身-count')).toHaveTextContent('2');
    expect(screen.getByText('高抬腿')).toBeTruthy();
    expect(screen.getByText('腿部热身')).toBeTruthy();

    // 收起活动组：chips 仍归拉伸，选择保留。
    await press('library-group-拉伸');
    expect(screen.getByTestId('library-bodypart-chips-拉伸')).toBeTruthy();
    expect(screen.getByTestId('filter-bodypart-颈')).toBeSelected();
    expect(screen.queryByText('颈部拉伸')).toBeNull();

    context.dispose();
  });

  it('搜索与活动场景部位取 AND：活动组隐藏但 chip 不消失，其他场景仍按搜索显示', async () => {
    const context = await setup();

    await press('filter-bodypart-肩');
    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('1');

    await typeText('library-search', '腿');
    // 拉伸内名称含「腿」的只有腿部拉伸，但其不含肩 → 活动组隐藏。
    expect(screen.queryByTestId('library-group-拉伸')).toBeNull();
    // chips 不随搜索收缩，选中项仍在。
    expect(screen.getByTestId('library-bodypart-chips-拉伸')).toBeTruthy();
    expect(screen.getByTestId('filter-bodypart-肩')).toBeSelected();
    // 热身非活动组只受搜索，仍显示。
    expect(screen.getByTestId('library-group-热身-count')).toHaveTextContent('2');
    expect(screen.getByText('高抬腿')).toBeTruthy();

    context.dispose();
  });

  it('「全部」包含无部位动作，「其他」只显示无规范部位动作，无该动作的场景不渲染该项', async () => {
    const context = await setup();

    await press('filter-bodypart-其他');
    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('1');
    expect(screen.getByText('无标签动作')).toBeTruthy();
    expect(screen.queryByText('颈部拉伸')).toBeNull();

    await press('filter-bodypart-全部');
    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('5');
    expect(screen.getByText('无标签动作')).toBeTruthy();
    expect(screen.getByText('颈部拉伸')).toBeTruthy();

    // 核心训练没有无规范部位动作，不渲染「其他」chip。
    await press('library-group-核心训练');
    expect(screen.getByTestId('library-bodypart-chips-核心训练')).toBeTruthy();
    expect(screen.queryByTestId('filter-bodypart-其他')).toBeNull();
    expect(screen.getByTestId('filter-bodypart-腰腹')).toBeTruthy();

    context.dispose();
  });

  it('所有场景无命中时显示空结果，「清除筛选」清空搜索与部位并保留活动场景', async () => {
    const context = await setup();

    await press('library-group-核心训练');
    await press('filter-bodypart-腰腹');
    expect(screen.getByTestId('library-group-核心训练-count')).toHaveTextContent('1');

    await typeText('library-search', '不存在的动作');
    expect(screen.getByTestId('library-empty')).toBeTruthy();

    await press('library-clear-filters');
    expect(screen.getByTestId('library-group-核心训练-count')).toHaveTextContent('1');
    expect(screen.getByTestId('library-bodypart-chips-核心训练')).toBeTruthy();
    expect(screen.getByTestId('filter-bodypart-全部')).toBeSelected();
    expect(screen.getByText('死虫')).toBeTruthy();

    context.dispose();
  });

  it('已收起的非活动组不影响活动场景 chips 的归属与选中项（点它才认领）', async () => {
    const context = await setup();

    // 先收起拉伸（此刻仍是活动场景），再认领热身；拉伸此后为非活动且已收起。
    await press('library-group-拉伸');
    await press('library-group-热身');
    expect(screen.getByTestId('library-bodypart-chips-热身')).toBeTruthy();
    await press('filter-bodypart-腿');
    expect(screen.getByTestId('filter-bodypart-腿')).toBeSelected();

    // 非活动且已收起的拉伸存在时，chips 归属与选中项不受影响。
    expect(screen.getByTestId('library-group-拉伸')).not.toBeExpanded();
    expect(screen.getByTestId('library-bodypart-chips-热身')).toBeTruthy();
    expect(screen.getByTestId('filter-bodypart-腿')).toBeSelected();
    expect(screen.queryByText('颈部拉伸')).toBeNull();

    context.dispose();
  });

  it('多组展开状态下点非活动组头：立即认领并保持展开、部位回全部，再次点击才收起', async () => {
    const context = await setup();

    // 搜索激活，拉伸与热身都命中且默认展开；活动场景仍为拉伸。
    await typeText('library-search', '腿');
    expect(screen.getByTestId('library-group-热身')).toBeExpanded();
    expect(screen.getByTestId('library-bodypart-chips-拉伸')).toBeTruthy();
    await press('filter-bodypart-腿');
    expect(screen.getByTestId('filter-bodypart-腿')).toBeSelected();

    // 第一次点热身组头：认领活动场景、保持展开、部位回全部。
    await press('library-group-热身');
    expect(screen.getByTestId('library-group-热身')).toBeExpanded();
    expect(screen.getByTestId('library-bodypart-chips-热身')).toBeTruthy();
    expect(screen.queryByTestId('library-bodypart-chips-拉伸')).toBeNull();
    expect(screen.getByTestId('filter-bodypart-全部')).toBeSelected();
    expect(screen.getByText('高抬腿')).toBeTruthy();

    // 第二次点同一组头：这次才收起。
    await press('library-group-热身');
    expect(screen.getByTestId('library-group-热身')).not.toBeExpanded();
    expect(screen.queryByText('高抬腿')).toBeNull();

    context.dispose();
  });

  it('活动场景 0 命中时归属文案标注「当前无匹配」，且 chip 选项不收缩', async () => {
    const context = await setup();

    // 活动场景=拉伸：部位选肩，再搜索「腿」，交集为空 → 拉伸组隐藏。
    await press('filter-bodypart-肩');
    await typeText('library-search', '腿');
    expect(screen.queryByTestId('library-group-拉伸')).toBeNull();
    expect(screen.getByText('拉伸部位（当前无匹配）')).toBeTruthy();

    // chips 集合保持稳定，不因 0 命中而收缩或隐藏。
    expect(screen.getByTestId('library-bodypart-chips-拉伸')).toBeTruthy();
    for (const key of ['全部', '颈', '肩', '髋臀', '腿', '其他']) {
      expect(screen.getByTestId(`filter-bodypart-${key}`)).toBeTruthy();
    }

    context.dispose();
  });

  it('点部位 chip 不会自动展开其它已收起组，也不强行展开收起中的活动组', async () => {
    const context = await setup();

    // 显式收起活动组（拉伸），热身/核心仍为收起。
    await press('library-group-拉伸');
    expect(screen.getByTestId('library-group-拉伸')).not.toBeExpanded();

    await press('filter-bodypart-颈');
    expect(screen.getByTestId('filter-bodypart-颈')).toBeSelected();
    // 活动组被显式收起：选 chip 不强行展开它。
    expect(screen.getByTestId('library-group-拉伸')).not.toBeExpanded();
    expect(screen.queryByText('颈部拉伸')).toBeNull();
    // 其它已收起组也不被自动展开。
    expect(screen.getByTestId('library-group-热身')).not.toBeExpanded();
    expect(screen.queryByText('高抬腿')).toBeNull();
    expect(screen.getByTestId('library-group-核心训练')).not.toBeExpanded();
    expect(screen.queryByText('死虫')).toBeNull();

    // 用户手动展开活动组后才看到筛选结果，其它组仍保持收起。
    await press('library-group-拉伸');
    expect(screen.getByTestId('library-group-拉伸')).toBeExpanded();
    expect(screen.getByTestId('library-group-拉伸-count')).toHaveTextContent('1');
    expect(screen.getByText('颈部拉伸')).toBeTruthy();
    expect(screen.getByTestId('library-group-热身')).not.toBeExpanded();
    expect(screen.queryByText('高抬腿')).toBeNull();

    context.dispose();
  });
});

