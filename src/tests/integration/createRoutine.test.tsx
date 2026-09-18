import { screen, waitFor } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { press, type } from '../support/interaction';

/**
 * US2 independent test (T033): with an empty database, create a five-step
 * routine from five lines, save it, restart the app, and confirm it is there.
 */
describe('US2 快速创建流程 (T033)', () => {
  it('creates a five-step routine from five lines and survives a restart', async () => {
    const context = await createTestContext();
    const speaker = createTestSpeaker();

    const first = renderApp({ services: context.services, speaker });

    // Home starts empty.
    expect(await screen.findByText('还没有流程')).toBeTruthy();

    await press('home-new-routine');
    await type('routine-name-input', '肩颈放松');
    await type('batch-input', '肩部拉伸\n\n颈部拉伸\n胸部打开\n猫牛式\n   \n婴儿式');
    await press('batch-add');

    // Blank lines are ignored, so exactly five ordered steps exist.
    expect(await screen.findByText('动作顺序（共 5 个）')).toBeTruthy();
    expect(screen.getByText('已添加 5 个动作')).toBeTruthy();

    await press('routine-save');

    // Saving a new routine lands on its detail screen.
    expect(await screen.findByTestId('detail-start')).toBeTruthy();
    expect(screen.getAllByText('肩颈放松').length).toBeGreaterThan(0);
    // 5 steps x 30s + 4 transitions x 5s = 170s.
    expect(screen.getByText('5 个动作 · 约 2分50秒')).toBeTruthy();

    first.unmount();

    // "Restart the app": a fresh render over the same local database.
    renderApp({ services: context.services, speaker });

    expect(await screen.findByText('共 1 个流程')).toBeTruthy();
    expect(screen.getByText('5 个动作 · 约 2分50秒')).toBeTruthy();
    expect(screen.getByText('肩颈放松')).toBeTruthy();

    context.dispose();
  });

  it('refuses to save a routine with no steps', async () => {
    const context = await createTestContext();
    const speaker = createTestSpeaker();
    renderApp({ services: context.services, speaker });

    await screen.findByText('还没有流程');
    await press('home-new-routine');
    await type('routine-name-input', '空流程');
    await press('routine-save');

    expect(await screen.findByText('请至少添加一个动作')).toBeTruthy();
    // Still on the editor, so nothing was persisted.
    expect(await context.services.routines.list()).toHaveLength(0);

    context.dispose();
  });

  it('applies per-step edits without touching the other steps', async () => {
    const context = await createTestContext();
    const speaker = createTestSpeaker();
    renderApp({ services: context.services, speaker });

    await screen.findByText('还没有流程');
    await press('home-new-routine');
    await type('routine-name-input', '测试');
    await type('batch-input', 'A\nB');
    await press('batch-add');

    // Open the first step and override its duration only.
    await press('step-row-1');
    expect(await screen.findByText('编辑动作')).toBeTruthy();

    await type('step-editor-name', 'A 改名');
    await press('step-editor-duration-plus');
    await press('step-editor-duration-plus');
    await press('step-editor-save-single');

    await press('routine-save');

    const saved = await context.services.routines.list();
    const loaded = await context.services.routines.getWithSteps(saved[0]!.id);

    expect(loaded?.steps[0]?.displayName).toBe('A 改名');
    // Default 30s, +5s twice.
    expect(loaded?.steps[0]?.durationSec).toBe(40);
    expect(loaded?.steps[1]?.displayName).toBe('B');
    expect(loaded?.steps[1]?.durationSec).toBe(30);

    context.dispose();
  });

  it('shows the number of imported actions and keeps their input order', async () => {
    const context = await createTestContext();
    const speaker = createTestSpeaker();
    renderApp({ services: context.services, speaker });

    await screen.findByText('还没有流程');
    await press('home-new-routine');
    await type('batch-input', '第三\n第一\n第二');
    await press('batch-add');

    await waitFor(() => {
      expect(screen.getByText('动作顺序（共 3 个）')).toBeTruthy();
    });

    const saved = await (async () => {
      await type('routine-name-input', '顺序');
      await press('routine-save');
      return context.services.routines.list();
    })();

    const loaded = await context.services.routines.getWithSteps(saved[0]!.id);
    expect(loaded?.steps.map((step) => step.displayName)).toEqual(['第三', '第一', '第二']);

    context.dispose();
  });
});
