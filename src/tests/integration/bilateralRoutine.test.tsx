import { screen } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { press, type, advanceTime } from '../support/interaction';

/**
 * US4 independent test (T073): add one bilateral action, generate two paired
 * steps, edit both durations together, then override one side.
 */
describe('US4 双侧配对动作 (T073)', () => {
  async function seedBilateralAction(context: Awaited<ReturnType<typeof createTestContext>>) {
    return context.services.actions.create({
      name: '斜方肌拉伸',
      defaultDurationSec: 45,
      sideMode: 'bilateral',
    });
  }

  it('generates left/right steps and keeps timing symmetrical by default', async () => {
    const context = await createTestContext();
    const action = await seedBilateralAction(context);

    renderApp({ services: context.services, speaker: createTestSpeaker() });
    await screen.findByText('还没有流程');

    await press('home-new-routine');
    await press('routine-open-picker');
    await press(`picker-action-${action.id}`);
    await press('picker-confirm');

    // One selection, two ordered steps.
    expect(await screen.findByText('动作顺序（共 2 个）')).toBeTruthy();
    expect(screen.getByText('斜方肌拉伸（左）')).toBeTruthy();
    expect(screen.getByText('斜方肌拉伸（右）')).toBeTruthy();
    expect(screen.getByText('左侧 · 45秒 · 过渡 5秒')).toBeTruthy();
    expect(screen.getByText('右侧 · 45秒 · 过渡 5秒')).toBeTruthy();

    // "Edit both sides" keeps the pair symmetric.
    await press('step-row-1');
    expect(await screen.findByText(/左右配对动作/)).toBeTruthy();
    await press('step-editor-duration-plus');
    await press('step-editor-duration-plus');
    await press('step-editor-save-pair');

    expect(await screen.findByText('左侧 · 55秒 · 过渡 5秒')).toBeTruthy();
    expect(screen.getByText('右侧 · 55秒 · 过渡 5秒')).toBeTruthy();

    await type('routine-name-input', '配对流程');
    await press('routine-save');

    const saved = await context.services.routines.list();
    const loaded = await context.services.routines.getWithSteps(saved[0]!.id);

    expect(loaded?.steps.map((step) => step.side)).toEqual(['left', 'right']);
    expect(loaded?.steps[0]?.pairGroupId).toBe(loaded?.steps[1]?.pairGroupId);
    expect(loaded?.steps.map((step) => step.durationSec)).toEqual([55, 55]);

    context.dispose();
  });

  it('preserves a deliberate one-side override without breaking the pair', async () => {
    const context = await createTestContext();
    const action = await seedBilateralAction(context);

    renderApp({ services: context.services, speaker: createTestSpeaker() });
    await screen.findByText('还没有流程');

    await press('home-new-routine');
    await press('routine-open-picker');
    await press(`picker-action-${action.id}`);
    await press('picker-confirm');
    await screen.findByText('动作顺序（共 2 个）');

    // Change only the left side.
    await press('step-row-1');
    await screen.findByText(/左右配对动作/);
    await press('step-editor-duration-plus');
    await press('step-editor-save-single');

    expect(await screen.findByText('左侧 · 50秒 · 过渡 5秒')).toBeTruthy();
    expect(screen.getByText('右侧 · 45秒 · 过渡 5秒')).toBeTruthy();

    await type('routine-name-input', '不对称流程');
    await press('routine-save');

    const saved = await context.services.routines.list();
    const loaded = await context.services.routines.getWithSteps(saved[0]!.id);

    expect(loaded?.steps.map((step) => step.durationSec)).toEqual([50, 45]);
    // Pair metadata survives, so "edit both sides" is still available afterwards.
    expect(loaded?.steps[0]?.pairGroupId).toBe(loaded?.steps[1]?.pairGroupId);
    expect(loaded?.steps.every((step) => Boolean(step.pairGroupId))).toBe(true);

    context.dispose();
  });

  it('plays the pair in order with both sides spoken', async () => {
    const context = await createTestContext();
    const action = await seedBilateralAction(context);
    const speaker = createTestSpeaker();

    await context.services.routines.create({
      name: '配对播放',
      defaultDurationSec: 30,
      defaultTransitionSec: 0,
      steps: [
        {
          sourceActionId: action.id,
          displayName: '斜方肌拉伸（左）',
          speakText: '左侧斜方肌拉伸',
          durationSec: 10,
          transitionSec: 0,
          side: 'left',
          pairGroupId: 'pair-1',
        },
        {
          sourceActionId: action.id,
          displayName: '斜方肌拉伸（右）',
          speakText: '右侧斜方肌拉伸',
          durationSec: 10,
          transitionSec: 0,
          side: 'right',
          pairGroupId: 'pair-1',
        },
      ],
    });

    renderApp({ services: context.services, speaker });
    await screen.findByText('共 1 个流程');
    const routine = (await context.services.routines.list())[0]!;

    await press(`routine-start-${routine.id}`);
    expect(await screen.findByTestId('runner-current-step')).toHaveTextContent('斜方肌拉伸（左）');

    advanceTime(context, 10_000);

    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('斜方肌拉伸（右）');
    expect(speaker.spoken).toEqual(['左侧斜方肌拉伸，10秒', '右侧斜方肌拉伸，10秒']);

    context.dispose();
  });
});
