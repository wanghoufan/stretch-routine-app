import { Alert } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { press, type as typeText } from '../support/interaction';

/**
 * US6 independent test (T080): create an action, use it in a routine, rename the
 * Action, and verify the existing routine keeps its snapshot.
 */
describe('US6 动作库快照独立性 (T080)', () => {
  async function seedRoutineFromAction(context: Awaited<ReturnType<typeof createTestContext>>) {
    const action = await context.services.actions.create({
      name: '肩部拉伸',
      defaultDurationSec: 40,
      sideMode: 'single',
    });

    const saved = await context.services.routines.create({
      name: '每天一次',
      defaultDurationSec: 30,
      defaultTransitionSec: 0,
      steps: [
        {
          sourceActionId: action.id,
          displayName: '肩部拉伸',
          speakText: '肩部拉伸',
          durationSec: 40,
          transitionSec: 0,
        },
      ],
    });

    return { action, saved };
  }

  it('keeps the saved step unchanged when the library action is renamed', async () => {
    const context = await createTestContext();
    const { action, saved } = await seedRoutineFromAction(context);
    const speaker = createTestSpeaker();

    await context.services.actions.update(action.id, { name: '完全不同的名字', defaultDurationSec: 99 });

    renderApp({ services: context.services, speaker });
    await screen.findByText('共 1 个流程');

    await press(`routine-open-${saved.routine.id}`);
    expect(await screen.findByText('1. 肩部拉伸')).toBeTruthy();
    expect(screen.getByText('40秒 · 过渡 0秒')).toBeTruthy();

    const loaded = await context.services.routines.getWithSteps(saved.routine.id);
    expect(loaded?.steps[0]?.displayName).toBe('肩部拉伸');
    expect(loaded?.steps[0]?.durationSec).toBe(40);

    context.dispose();
  });

  it('keeps routine playback values when the library action is deleted', async () => {
    const context = await createTestContext();
    const { action, saved } = await seedRoutineFromAction(context);
    const speaker = createTestSpeaker();

    const spy = jest.spyOn(Alert, 'alert') as unknown as jest.SpyInstance<
      void,
      [string, string?, { style?: string; onPress?: () => void }[]?]
    >;
    spy.mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    });

    renderApp({
      services: context.services,
      speaker,
      initialRoute: { name: 'ActionLibrary', params: undefined },
    });

    expect(await screen.findByText('肩部拉伸')).toBeTruthy();
    await press(`action-delete-${action.id}`);

    await waitFor(async () => {
      expect(await context.services.actions.list()).toHaveLength(0);
    });

    const loaded = await context.services.routines.getWithSteps(saved.routine.id);
    expect(loaded?.steps[0]?.displayName).toBe('肩部拉伸');
    expect(loaded?.steps[0]?.durationSec).toBe(40);
    // The snapshot survives; only the back-reference is released.
    expect(loaded?.steps[0]?.sourceActionId).toBeUndefined();

    jest.restoreAllMocks();
    context.dispose();
  });

  it('adds multiple selected library actions in one operation', async () => {
    const context = await createTestContext();
    const first = await context.services.actions.create({
      name: '动作一',
      defaultDurationSec: 30,
      sideMode: 'single',
    });
    const second = await context.services.actions.create({
      name: '动作二',
      defaultDurationSec: 20,
      sideMode: 'bilateral',
    });

    renderApp({ services: context.services, speaker: createTestSpeaker() });
    await screen.findByText('还没有流程');

    await press('home-new-routine');
    await press('routine-open-picker');
    await press(`picker-action-${first.id}`);
    await press(`picker-action-${second.id}`);
    await press('picker-confirm');

    // 1 single + 2 bilateral sides.
    expect(await screen.findByText('动作顺序（共 3 个）')).toBeTruthy();
    expect(screen.getByText('动作一')).toBeTruthy();
    expect(screen.getByText('动作二（左）')).toBeTruthy();
    expect(screen.getByText('动作二（右）')).toBeTruthy();

    context.dispose();
  });

  it('routes editing through the action library without touching routines', async () => {
    const context = await createTestContext();
    const { saved } = await seedRoutineFromAction(context);

    renderApp({
      services: context.services,
      speaker: createTestSpeaker(),
      initialRoute: { name: 'ActionLibrary', params: undefined },
    });

    await screen.findByText('肩部拉伸');
    await press(`action-edit-${(await context.services.actions.list())[0]!.id}`);

    await typeText('action-editor-name', '改过的动作');
    await press('action-editor-save');

    await waitFor(async () => {
      expect((await context.services.actions.list())[0]?.name).toBe('改过的动作');
    });

    const routineSteps = await context.services.routines.getWithSteps(saved.routine.id);
    expect(routineSteps?.steps[0]?.displayName).toBe('肩部拉伸');

    context.dispose();
  });
});
