import { screen } from '@testing-library/react-native';
import { runSeeds } from '../../data/seeds';
import { renderApp } from '../support/renderApp';
import { createTestContext } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';

/**
 * TASK-005 acceptance at the UI level: a brand-new install boots straight into
 * a Home list holding the two example routines, and the second launch (seeding
 * already recorded) still shows exactly those two.
 *
 * This complements the row-level seed tests; it is the closest thing to the
 * on-device "首页出现 2 条示例流程" check that can run without an APK.
 */
describe('seed library on Home (TASK-005)', () => {
  it('shows both example routines on first launch and keeps them after a relaunch', async () => {
    const context = await createTestContext();

    expect(
      await runSeeds({ db: context.db, clock: context.clock, generateId: context.services.generateId }),
    ).toBe('seeded');
    // Simulate the next cold start: seeding is already recorded.
    expect(
      await runSeeds({ db: context.db, clock: context.clock, generateId: context.services.generateId }),
    ).toBe('already-seeded');

    renderApp({ services: context.services, speaker: createTestSpeaker() });

    expect(await screen.findByText('共 2 个流程')).toBeTruthy();
    expect(screen.getByText('晨起全身拉伸')).toBeTruthy();
    expect(screen.getByText('跑后下肢放松')).toBeTruthy();
    expect(screen.getByText('10 个动作 · 约 5分45秒')).toBeTruthy();
    expect(screen.getByText('9 个动作 · 约 5分10秒')).toBeTruthy();
    expect(screen.queryByText('还没有流程')).toBeNull();

    context.dispose();
  });
});
