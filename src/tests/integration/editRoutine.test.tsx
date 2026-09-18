import { Alert } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { renderApp } from '../support/renderApp';
import { createTestContext } from '../support/testContext';
import { createTestSpeaker } from '../support/fixtures';
import { press, type } from '../support/interaction';

type AlertButton = { text?: string; style?: string; onPress?: () => void };

/** Auto-confirm destructive dialogs so the UI flow can be exercised. */
function autoConfirmDialogs(): void {
  const spy = jest.spyOn(Alert, 'alert') as unknown as jest.SpyInstance<
    void,
    [string, string?, AlertButton[]?]
  >;
  spy.mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });
}

async function seedThreeStepRoutine(context: Awaited<ReturnType<typeof createTestContext>>) {
  return context.services.routines.create({
    name: '肩颈放松',
    defaultDurationSec: 30,
    defaultTransitionSec: 5,
    steps: [
      { displayName: 'A', durationSec: 30, transitionSec: 5 },
      { displayName: 'B', durationSec: 30, transitionSec: 5 },
      { displayName: 'C', durationSec: 30, transitionSec: 5 },
    ],
  });
}

/**
 * US3 independent test (T068): edit, reorder, duplicate and delete a routine
 * while proving the original and the copy stay independent.
 */
describe('US3 编辑与复用流程 (T068)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reorders, renames and deletes steps, then saves the new ordering', async () => {
    const context = await createTestContext();
    const seeded = await seedThreeStepRoutine(context);

    renderApp({ services: context.services, speaker: createTestSpeaker() });
    await screen.findByText('共 1 个流程');

    await press(`routine-open-${seeded.routine.id}`);
    await press('detail-edit');

    expect(await screen.findByText('动作顺序（共 3 个）')).toBeTruthy();

    // Move A down one position -> B, A, C.
    await press('step-1-move-down');

    // Rename the step that is now first (B).
    await press('step-row-1');
    await type('step-editor-name', 'B 改名');
    await press('step-editor-save-single');

    // Duplicate the last step, then delete the trailing duplicate.
    await press('step-3-duplicate');
    expect(await screen.findByText('动作顺序（共 4 个）')).toBeTruthy();
    await press('step-4-delete');
    expect(await screen.findByText('动作顺序（共 3 个）')).toBeTruthy();

    await press('routine-save');

    const reloaded = await context.services.routines.getWithSteps(seeded.routine.id);
    expect(reloaded?.steps.map((step) => step.displayName)).toEqual(['B 改名', 'A', 'C']);
    expect(reloaded?.steps.map((step) => step.orderIndex)).toEqual([0, 1, 2]);

    context.dispose();
  });

  it('duplicates a routine into an independent copy', async () => {
    const context = await createTestContext();
    const seeded = await seedThreeStepRoutine(context);

    renderApp({ services: context.services, speaker: createTestSpeaker() });
    await screen.findByText('共 1 个流程');

    await press(`routine-open-${seeded.routine.id}`);
    await press('detail-duplicate');

    await waitFor(async () => {
      expect(await context.services.routines.list()).toHaveLength(2);
    });

    expect(await screen.findByText('共 2 个流程')).toBeTruthy();
    expect(screen.getByText('肩颈放松 副本')).toBeTruthy();

    // Renaming a step in the copy must not touch the original.
    const all = await context.services.routines.list();
    const copy = all.find((routine) => routine.name === '肩颈放松 副本')!;

    await press(`routine-open-${copy.id}`);
    await press('detail-edit');
    await screen.findByText('动作顺序（共 3 个）');
    await press('step-row-1');
    await type('step-editor-name', '只改副本');
    await press('step-editor-save-single');
    await press('routine-save');

    const copyLoaded = await context.services.routines.getWithSteps(copy.id);
    const originalLoaded = await context.services.routines.getWithSteps(seeded.routine.id);

    expect(copyLoaded?.steps[0]?.displayName).toBe('只改副本');
    expect(originalLoaded?.steps[0]?.displayName).toBe('A');
    // Copies get brand-new step ids, so nothing is shared by reference.
    expect(copyLoaded?.steps[0]?.id).not.toBe(originalLoaded?.steps[0]?.id);

    context.dispose();
  });

  it('deletes a routine only after a confirmation', async () => {
    const context = await createTestContext();
    const seeded = await seedThreeStepRoutine(context);
    autoConfirmDialogs();

    renderApp({ services: context.services, speaker: createTestSpeaker() });
    await screen.findByText('共 1 个流程');

    await press(`routine-open-${seeded.routine.id}`);
    await press('detail-delete');

    await waitFor(async () => {
      expect(await context.services.routines.list()).toHaveLength(0);
    });
    expect(await screen.findByText('还没有流程')).toBeTruthy();

    context.dispose();
  });

  it('keeps the routine when the confirmation is cancelled', async () => {
    const context = await createTestContext();
    const seeded = await seedThreeStepRoutine(context);

    const spy = jest.spyOn(Alert, 'alert') as unknown as jest.SpyInstance<
      void,
      [string, string?, AlertButton[]?]
    >;
    spy.mockImplementation(() => undefined);

    renderApp({ services: context.services, speaker: createTestSpeaker() });
    await screen.findByText('共 1 个流程');

    await press(`routine-open-${seeded.routine.id}`);
    await press('detail-delete');

    expect(await context.services.routines.list()).toHaveLength(1);
    context.dispose();
  });
});
