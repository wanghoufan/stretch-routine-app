import { screen } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext, createTestStartService } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { advanceTime, press } from '../support/interaction';

/**
 * R021: an in-flight run is driven by its immutable snapshot. Editing or
 * deleting the source Routine must change neither the current step nor the
 * countdown; only the next Start reads the new routine.
 */
describe('snapshot immutability (R021)', () => {
  it('keeps playing the frozen steps after the source routine is edited and deleted', async () => {
    const context = await createTestContext();
    const routine = await context.services.routines.create({
      name: '原始流程',
      defaultDurationSec: 10,
      defaultTransitionSec: 0,
      steps: [
        { displayName: 'A1', durationSec: 10, transitionSec: 0 },
        { displayName: 'A2', durationSec: 10, transitionSec: 0 },
      ],
    });

    const service = createTestStartService(context.services);
    await service.start(routine.routine.id);

    renderApp({
      services: context.services,
      speaker: createTestSpeaker(),
      initialRoute: { name: 'Runner', params: undefined },
    });
    expect(await screen.findByTestId('runner-current-step')).toHaveTextContent('A1');
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:10');
    expect(screen.getByText('第 1 / 2 个')).toBeTruthy();

    // The user edits the routine mid-workout: rename, new steps, new duration.
    await context.services.routines.update(routine.routine.id, {
      name: '改名后的流程',
      defaultDurationSec: 5,
      defaultTransitionSec: 0,
      steps: [{ displayName: 'X1', durationSec: 5, transitionSec: 0 }],
    });

    // The running session is untouched.
    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('A1');
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:10');
    expect(screen.getByText('第 1 / 2 个')).toBeTruthy();

    // Deleting the routine entirely must not break the run either.
    await context.services.routines.remove(routine.routine.id);

    advanceTime(context, 10_000);
    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('A2');
    expect(screen.getByText('第 2 / 2 个')).toBeTruthy();

    advanceTime(context, 10_000);
    expect(await screen.findByText('流程完成')).toBeTruthy();
    expect(screen.getByTestId('completion-routine-name')).toHaveTextContent('原始流程');
    context.dispose();
  });

  it('a later Start reads the new routine instead of the old snapshot', async () => {
    const context = await createTestContext();
    const routine = await context.services.routines.create({
      name: '原始流程',
      defaultDurationSec: 10,
      defaultTransitionSec: 0,
      steps: [{ displayName: 'A1', durationSec: 10, transitionSec: 0 }],
    });

    const service = createTestStartService(context.services);
    const first = await service.start(routine.routine.id);
    if (first.kind !== 'started') {
      throw new Error('expected started');
    }

    await context.services.routines.update(routine.routine.id, {
      name: '新版流程',
      defaultDurationSec: 10,
      defaultTransitionSec: 0,
      steps: [{ displayName: 'NEW', durationSec: 10, transitionSec: 0 }],
    });

    // The in-flight session still plays the old snapshot...
    expect(first.session.snapshot.steps[0]?.displayName).toBe('A1');

    // ...while a fresh start (after an explicit replace) reads the new one.
    const second = await service.replaceWith(routine.routine.id);
    expect(second.kind).toBe('started');
    if (second.kind === 'started') {
      expect(second.session.snapshot.steps[0]?.displayName).toBe('NEW');
      expect(second.session.routineName).toBe('新版流程');
    }
    context.dispose();
  });

  it('keeps exactly one session row while the user pauses and resumes', async () => {
    const context = await createTestContext();
    const routine = await context.services.routines.create({
      name: '流程',
      defaultDurationSec: 10,
      defaultTransitionSec: 0,
      steps: [{ displayName: 'A1', durationSec: 10, transitionSec: 0 }],
    });

    const service = createTestStartService(context.services);
    await service.start(routine.routine.id);

    const rows = await context.db.get<{ total: number }>('SELECT COUNT(*) AS total FROM active_session');
    expect(rows?.total).toBe(1);

    renderApp({
      services: context.services,
      speaker: createTestSpeaker(),
      initialRoute: { name: 'Runner', params: undefined },
    });
    await screen.findByTestId('runner-current-step');
    await press('runner-pause');
    await press('runner-pause');

    const after = await context.db.get<{ total: number }>('SELECT COUNT(*) AS total FROM active_session');
    expect(after?.total).toBe(1);
    context.dispose();
  });
});
