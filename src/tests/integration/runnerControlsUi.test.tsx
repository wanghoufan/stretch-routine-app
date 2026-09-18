import { Alert } from 'react-native';
import { screen } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext, loadActiveSession } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { advanceTime, press } from '../support/interaction';

/**
 * US5 controls through the real UI (T053): pause, resume, +10, previous, skip
 * and end must all act on the authoritative session, not on a visual counter.
 */
describe('US5 播放控制 (T053)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function startTwoStepRoutine(nowMs?: number) {
    const context = await createTestContext(nowMs);
    const speaker = createTestSpeaker();
    const seeded = await context.services.routines.create({
      name: '控制测试',
      defaultDurationSec: 10,
      defaultTransitionSec: 0,
      steps: [
        { displayName: 'A', durationSec: 10, transitionSec: 0 },
        { displayName: 'B', durationSec: 10, transitionSec: 0 },
      ],
    });

    renderApp({ services: context.services, speaker });
    await screen.findByText('共 1 个流程');
    await press(`routine-start-${seeded.routine.id}`);
    await screen.findByTestId('runner-current-step');

    return { context, speaker, seeded };
  }

  it('pauses, freezes the countdown, and resumes', async () => {
    const { context } = await startTwoStepRoutine();

    advanceTime(context, 3_000);
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:07');

    await press('runner-pause');
    expect(screen.getByTestId('runner-paused')).toBeTruthy();

    // A whole minute passes while paused: nothing moves.
    advanceTime(context, 60_000);
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:07');
    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('A');

    await press('runner-pause');
    expect(screen.queryByTestId('runner-paused')).toBeNull();

    advanceTime(context, 7_000);
    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('B');

    context.dispose();
  });

  it('extends the current step by 10 seconds only', async () => {
    const { context } = await startTwoStepRoutine();

    advanceTime(context, 2_000);
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:08');

    await press('runner-add-time');
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:18');

    // The saved routine is unchanged.
    const routines = await context.services.routines.list();
    const loaded = await context.services.routines.getWithSteps(routines[0]!.id);
    expect(loaded?.steps.map((step) => step.durationSec)).toEqual([10, 10]);

    context.dispose();
  });

  it('skips to the next step and finishes when skipping the last one', async () => {
    const { context, speaker } = await startTwoStepRoutine();

    await press('runner-skip');
    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('B');

    await press('runner-skip');
    expect(await screen.findByText('流程完成')).toBeTruthy();
    expect(speaker.spoken).toContain('流程完成');

    context.dispose();
  });

  it('restarts the previous step at its full duration', async () => {
    const { context } = await startTwoStepRoutine();

    advanceTime(context, 10_000);
    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('B');
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:10');

    // Extend B, then go back: the extension must not survive the step change.
    await press('runner-add-time');
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:20');

    await press('runner-previous');
    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('A');
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:10');

    // Previous is disabled on the first step.
    const previousButton = screen.getByTestId('runner-previous');
    expect(previousButton.props.accessibilityState?.disabled).toBe(true);

    context.dispose();
  });

  it('ends the routine after a confirmation and returns Home', async () => {
    const { context } = await startTwoStepRoutine();

    const spy = jest.spyOn(Alert, 'alert') as unknown as jest.SpyInstance<
      void,
      [string, string?, { style?: string; onPress?: () => void }[]?]
    >;
    spy.mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    });

    await press('runner-end');

    expect(await screen.findByText('共 1 个流程')).toBeTruthy();
    // An ended routine leaves no session behind.
    expect(await loadActiveSession(context.services)).toBeNull();

    context.dispose();
  });

  it('persists the active session so a remount resumes the same step', async () => {
    const { context, seeded } = await startTwoStepRoutine();

    advanceTime(context, 12_000);
    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('B');

    const stored = await loadActiveSession(context.services);
    expect(stored?.routineId).toBe(seeded.routine.id);
    expect(stored?.currentStepIndex).toBe(1);
    expect(stored?.state).toBe('RUNNING_STEP');

    // Remount the app over the same database: the runner reconstructs step B
    // with the correct remaining time instead of restarting the routine.
    screen.unmount();

    renderApp({
      services: context.services,
      speaker: createTestSpeaker(),
      initialRoute: { name: 'Runner', params: undefined },
    });

    expect(await screen.findByTestId('runner-current-step')).toHaveTextContent('B');
    // 12s of the 10+10s routine have elapsed, so step B has 8s left.
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:08');

    context.dispose();
  });
});
