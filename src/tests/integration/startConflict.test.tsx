import { screen, within } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext, createTestStartService, loadActiveSession } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { press } from '../support/interaction';

/**
 * R017/R018 through the real UI: starting a second routine must ask first, and
 * each of the three choices must do exactly what it says.
 */
async function arrangeTwoRoutines() {
  const context = await createTestContext();
  const a = await context.services.routines.create({
    name: '流程A',
    defaultDurationSec: 10,
    defaultTransitionSec: 0,
    steps: [{ displayName: 'A1', durationSec: 10, transitionSec: 0 }],
  });
  const b = await context.services.routines.create({
    name: '流程B',
    defaultDurationSec: 10,
    defaultTransitionSec: 0,
    steps: [{ displayName: 'B1', durationSec: 10, transitionSec: 0 }],
  });

  // Routine A is already running before the screen is opened.
  const service = createTestStartService(context.services);
  await service.start(a.routine.id);
  return { context, a, b };
}

describe('start conflict UI (R017, R018)', () => {
  it('keeps the current routine when the user chooses 继续当前流程', async () => {
    const { context, a, b } = await arrangeTwoRoutines();
    renderApp({ services: context.services, speaker: createTestSpeaker() });

    expect(await screen.findByTestId('home-active-session-banner')).toBeTruthy();
    await press(`routine-start-${b.routine.id}`);

    expect(await screen.findByTestId('start-conflict-prompt')).toBeTruthy();
    expect(within(screen.getByTestId('start-conflict-prompt')).getByText(/流程A/)).toBeTruthy();

    await press('conflict-continue');

    expect(await screen.findByTestId('runner-current-step')).toHaveTextContent('A1');
    expect((await loadActiveSession(context.services))?.routineId).toBe(a.routine.id);
    context.dispose();
  });

  it('cancels without touching the running session', async () => {
    const { context, a, b } = await arrangeTwoRoutines();
    renderApp({ services: context.services, speaker: createTestSpeaker() });
    await screen.findByTestId('home-active-session-banner');
    await press(`routine-start-${b.routine.id}`);
    await screen.findByTestId('start-conflict-prompt');

    await press('conflict-cancel');

    expect(screen.queryByTestId('start-conflict-prompt')).toBeNull();
    expect(screen.getByTestId('home-active-session-name')).toHaveTextContent('流程A');
    expect((await loadActiveSession(context.services))?.routineId).toBe(a.routine.id);
    context.dispose();
  });

  it('starts the new routine only after explicit confirmation', async () => {
    const { context, a, b } = await arrangeTwoRoutines();
    renderApp({ services: context.services, speaker: createTestSpeaker() });
    await screen.findByTestId('home-active-session-banner');
    await press(`routine-start-${b.routine.id}`);
    await screen.findByTestId('start-conflict-prompt');

    await press('conflict-replace');

    expect(await screen.findByTestId('runner-current-step')).toHaveTextContent('B1');
    expect((await loadActiveSession(context.services))?.routineId).toBe(b.routine.id);
    expect((await loadActiveSession(context.services))?.routineId).not.toBe(a.routine.id);
    context.dispose();
  });
});
