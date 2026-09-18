import { screen } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext, createTestStartService, loadActiveSession } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { press } from '../support/interaction';
import type { FakeBootInfoProvider } from '../../services/runtime/BootInfo';

/**
 * R020: the Home Banner comes from the session snapshot, so a session keeps
 * offering 继续 even after its source Routine was deleted.
 */
describe('Home active session banner (R020)', () => {
  it('shows the running routine and continues it from the snapshot', async () => {
    const context = await createTestContext();
    const routine = await context.services.routines.create({
      name: '会被删除的流程',
      defaultDurationSec: 10,
      defaultTransitionSec: 0,
      steps: [{ displayName: '快照动作', durationSec: 10, transitionSec: 0 }],
    });

    const service = createTestStartService(context.services);
    await service.start(routine.routine.id);

    // The source routine is gone; the session snapshot is all that is left.
    await context.services.routines.remove(routine.routine.id);
    expect(await context.services.routines.getWithSteps(routine.routine.id)).toBeNull();
    expect((await loadActiveSession(context.services))?.snapshot.steps[0]?.displayName).toBe('快照动作');

    renderApp({ services: context.services, speaker: createTestSpeaker() });

    expect(await screen.findByTestId('home-active-session-banner')).toBeTruthy();
    expect(screen.getByTestId('home-active-session-name')).toHaveTextContent('会被删除的流程');

    await press('home-continue-session');

    expect(await screen.findByTestId('runner-current-step')).toHaveTextContent('快照动作');
    context.dispose();
  });

  it('shows no banner when nothing is running', async () => {
    const context = await createTestContext();
    await context.services.routines.create({
      name: '空闲流程',
      defaultDurationSec: 10,
      defaultTransitionSec: 0,
      steps: [{ displayName: 'A', durationSec: 10, transitionSec: 0 }],
    });

    renderApp({ services: context.services, speaker: createTestSpeaker() });

    expect(await screen.findByText('共 1 个流程')).toBeTruthy();
    expect(screen.queryByTestId('home-active-session-banner')).toBeNull();
    context.dispose();
  });

  it('does not offer to continue a session left over from a previous boot', async () => {
    const context = await createTestContext();
    const routine = await context.services.routines.create({
      name: '旧会话流程',
      defaultDurationSec: 10,
      defaultTransitionSec: 0,
      steps: [{ displayName: 'A', durationSec: 10, transitionSec: 0 }],
    });

    const service = createTestStartService(context.services);
    await service.start(routine.routine.id);

    // The process restarted: the stored session's monotonic origin is gone.
    (context.services.bootInfo as FakeBootInfoProvider).setBootCount(99);

    renderApp({ services: context.services, speaker: createTestSpeaker() });

    expect(await screen.findByText('共 1 个流程')).toBeTruthy();
    expect(screen.queryByTestId('home-active-session-banner')).toBeNull();
    context.dispose();
  });
});
