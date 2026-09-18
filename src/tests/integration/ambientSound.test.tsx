import { fireEvent, screen, act } from '@testing-library/react-native';
import { RunnerController } from '../../features/runner/services/runnerController';
import { createSessionPersistence } from '../../features/runner/services/sessionPersistence';
import { createStartRoutineService } from '../../features/runner/services/startRoutineService';
import { AmbientAudioService } from '../../services/audio/ambientAudioService';
import { TtsService } from '../../services/tts/ttsService';
import { DEFAULT_SETTINGS } from '../../features/settings/settingsModel';
import { renderApp } from '../support/renderApp';
import { createTestContext } from '../support/testContext';
import { createTestAmbientPlayer, createTestSpeaker } from '../support/fixtures';
import { advanceTime, press } from '../support/interaction';

/**
 * TASK-011 integration: the settings choice drives the runner's background loop.
 *
 * The ambient player is a recording double, so these tests assert the *decision*
 * (what should play when) without native audio.
 */
async function seedRoutine(context: Awaited<ReturnType<typeof createTestContext>>) {
  return context.services.routines.create({
    name: '背景音流程',
    defaultDurationSec: 20,
    defaultTransitionSec: 5,
    steps: [
      { displayName: 'A', durationSec: 20, transitionSec: 5 },
      { displayName: 'B', durationSec: 20, transitionSec: 0 },
    ],
  });
}

describe('TASK-011 倒计时背景音', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persists the chosen option across a restart', async () => {
    const context = await createTestContext();
    const speaker = createTestSpeaker();

    const first = renderApp({
      services: context.services,
      speaker,
      initialRoute: { name: 'Settings', params: undefined },
    });

    await screen.findByText('倒计时背景音');
    expect(screen.getByTestId('settings-ambient-tick').props.accessibilityState.selected).toBe(true);

    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-ambient-ethereal'));
    });

    first.unmount();

    const second = renderApp({
      services: context.services,
      speaker,
      initialRoute: { name: 'Settings', params: undefined },
    });

    await screen.findByText('倒计时背景音');
    expect(screen.getByTestId('settings-ambient-ethereal').props.accessibilityState.selected).toBe(true);
    expect((await context.services.settings.load()).ambientSound).toBe('ethereal');

    second.unmount();
    context.dispose();
  });

  it('exposes all five options as an accessible radio group', async () => {
    const context = await createTestContext();
    renderApp({
      services: context.services,
      speaker: createTestSpeaker(),
      initialRoute: { name: 'Settings', params: undefined },
    });

    await screen.findByText('倒计时背景音');

    for (const [testID, label] of [
      ['settings-ambient-silent', '无声'],
      ['settings-ambient-tick', '滴答'],
      ['settings-ambient-morning', '轻音乐·晨曦'],
      ['settings-ambient-night', '轻音乐·静夜'],
      ['settings-ambient-ethereal', '轻音乐·空山'],
    ] as const) {
      const row = screen.getByTestId(testID);
      expect(row.props.accessibilityRole).toBe('radio');
      expect(row.props.accessibilityLabel).toBe(label);
    }

    context.dispose();
  });

  it('plays tick while running and stops on pause, resume and end', async () => {
    const context = await createTestContext();
    const player = createTestAmbientPlayer();
    const seeded = await seedRoutine(context);

    renderApp({ services: context.services, speaker: createTestSpeaker(), ambientPlayer: player });
    await screen.findByText('共 1 个流程');

    await press(`routine-start-${seeded.routine.id}`);
    await screen.findByTestId('runner-current-step');

    // Default option is tick; the loop starts with the first running state.
    expect(player.played.map((entry) => entry.option)).toEqual(['tick']);
    expect(player.stopCount).toBe(0);

    // Pause stops the loop.
    await press('runner-pause');
    expect(screen.getByTestId('runner-paused')).toBeTruthy();
    expect(player.stopCount).toBe(1);

    // Resume starts it again.
    await press('runner-pause');
    expect(screen.queryByTestId('runner-paused')).toBeNull();
    expect(player.played.map((entry) => entry.option)).toEqual(['tick', 'tick']);

    // Skip past the last step: completion must silence the loop.
    await press('runner-skip');
    await press('runner-skip');
    expect(await screen.findByText('流程完成')).toBeTruthy();
    expect(player.stopCount).toBe(2);
    expect(player.played).toHaveLength(2);

    context.dispose();
  });

  it('follows the state machine through a completed step transition', async () => {
    const context = await createTestContext();
    const player = createTestAmbientPlayer();
    const seeded = await seedRoutine(context);

    renderApp({ services: context.services, speaker: createTestSpeaker(), ambientPlayer: player });
    await screen.findByText('共 1 个流程');
    await press(`routine-start-${seeded.routine.id}`);
    await screen.findByTestId('runner-current-step');

    const startsBefore = player.played.length;

    // Cross step A (20s) into its 5s transition: still running, still looping.
    advanceTime(context, 20_000);
    expect(screen.getByTestId('runner-phase')).toHaveTextContent('过渡中 · 接着做 B');
    expect(player.played).toHaveLength(startsBefore);
    expect(player.stopCount).toBe(0);

    // Cross the transition into step B: same loop, no restart, no stop.
    advanceTime(context, 5_000);
    expect(screen.getByTestId('runner-current-step')).toHaveTextContent('B');
    expect(player.played).toHaveLength(startsBefore);
    expect(player.stopCount).toBe(0);

    context.dispose();
  });

  it('stops the loop when the routine completes', async () => {
    const context = await createTestContext();
    const player = createTestAmbientPlayer();
    const seeded = await context.services.routines.create({
      name: '短流程',
      defaultDurationSec: 10,
      defaultTransitionSec: 0,
      steps: [{ displayName: 'A', durationSec: 10, transitionSec: 0 }],
    });

    renderApp({ services: context.services, speaker: createTestSpeaker(), ambientPlayer: player });
    await screen.findByText('共 1 个流程');
    await press(`routine-start-${seeded.routine.id}`);
    await screen.findByTestId('runner-current-step');

    expect(player.played.map((entry) => entry.option)).toEqual(['tick']);

    advanceTime(context, 10_000);

    expect(await screen.findByText('流程完成')).toBeTruthy();
    expect(player.stopCount).toBe(1);
    expect(player.played).toHaveLength(1);

    context.dispose();
  });

  it('switching the option mid-run takes effect immediately', async () => {
    const context = await createTestContext();
    const player = createTestAmbientPlayer();
    const seeded = await seedRoutine(context);
    await context.services.settings.save({
      ...(await context.services.settings.load()),
      ambientSound: 'morning',
    });

    renderApp({ services: context.services, speaker: createTestSpeaker(), ambientPlayer: player });
    await screen.findByText('共 1 个流程');
    await press(`routine-start-${seeded.routine.id}`);
    await screen.findByTestId('runner-current-step');

    // A quarter of the way into step A the loop is still the original source.
    advanceTime(context, 5_000);
    expect(player.played.map((entry) => entry.option)).toEqual(['morning']);

    context.dispose();
  });

  it('reconciles a live settings change through the controller (switch + pause/end)', async () => {
    const context = await createTestContext();
    const player = createTestAmbientPlayer();
    const seeded = await seedRoutine(context);
    const speaker = createTestSpeaker();

    const ambient = new AmbientAudioService({ player });
    const controller = new RunnerController({
      persistence: createSessionPersistence({
        repository: context.services.sessions,
        wallClock: context.services.wallClock,
      }),
      monotonic: context.services.monotonic,
      bootInfo: context.services.bootInfo,
      termination: context.services.termination,
      tts: new TtsService({
        speaker,
        isEnabled: () => true,
        getRate: () => 1,
      }),
      ambient,
      settings: { ...DEFAULT_SETTINGS, ambientSound: 'morning' },
    });

    await createStartRoutineService({
      routines: context.services.routines,
      sessions: context.services.sessions,
      monotonic: context.services.monotonic,
      wallClock: context.services.wallClock,
      bootInfo: context.services.bootInfo,
      generateId: context.services.generateId,
    }).start(seeded.routine.id);

    await controller.load();
    expect(player.played.map((entry) => entry.option)).toEqual(['morning']);

    // "Switch takes effect immediately": no tick in between.
    controller.setSettings({ ...DEFAULT_SETTINGS, ambientSound: 'ethereal' });
    expect(player.played.map((entry) => entry.option)).toEqual(['morning', 'ethereal']);
    expect(player.stopCount).toBe(1);

    // Same option again is a no-op.
    controller.setSettings({ ...DEFAULT_SETTINGS, ambientSound: 'ethereal' });
    expect(player.played).toHaveLength(2);

    // Pause -> silence; resume -> loop again; end -> silence for good.
    controller.togglePause();
    expect(player.stopCount).toBe(2);
    controller.togglePause();
    expect(player.played).toHaveLength(3);
    controller.control({ type: 'END' });
    expect(player.stopCount).toBe(3);
    expect(ambient.getActiveOption()).toBeNull();

    controller.dispose();
    expect(player.disposed).toBe(true);
    context.dispose();
  });

  it('plays nothing at all when the option is silent', async () => {
    const context = await createTestContext();
    const player = createTestAmbientPlayer();
    const speaker = createTestSpeaker();
    const seeded = await seedRoutine(context);
    await context.services.settings.save({
      ...(await context.services.settings.load()),
      ambientSound: 'silent',
    });

    renderApp({ services: context.services, speaker, ambientPlayer: player });
    await screen.findByText('共 1 个流程');
    await press(`routine-start-${seeded.routine.id}`);
    await screen.findByTestId('runner-current-step');

    advanceTime(context, 20_000);

    expect(player.played).toEqual([]);
    expect(player.stopCount).toBe(0);
    // Speech and timing are unaffected by ambient being silent.
    expect(speaker.spoken[0]).toBe('A，20秒');

    context.dispose();
  });

  it('keeps timing and TTS working with a non-silent loop (coexistence)', async () => {
    const context = await createTestContext();
    const player = createTestAmbientPlayer();
    const speaker = createTestSpeaker();
    const seeded = await context.services.routines.create({
      name: '叠加流程',
      defaultDurationSec: 30,
      defaultTransitionSec: 0,
      steps: [{ displayName: 'A', durationSec: 30, transitionSec: 0 }],
    });
    await context.services.settings.save({
      ...(await context.services.settings.load()),
      ambientSound: 'ethereal',
      countdownWarningEnabled: true,
      countdownWarningSec: 5,
    });

    renderApp({ services: context.services, speaker, ambientPlayer: player });
    await screen.findByText('共 1 个流程');
    await press(`routine-start-${seeded.routine.id}`);
    await screen.findByTestId('runner-current-step');

    // The countdown warning cue fires without interrupting the loop or timing.
    advanceTime(context, 26_000);
    expect(speaker.spoken).toEqual(['A，30秒', '4秒后结束']);
    expect(screen.getByTestId('runner-remaining')).toHaveTextContent('0:04');
    expect(player.played.map((entry) => entry.option)).toEqual(['ethereal']);
    expect(player.stopCount).toBe(0);

    // +10s does not touch the background loop either.
    await act(async () => {
      fireEvent.press(screen.getByTestId('runner-add-time'));
    });
    expect(player.played).toHaveLength(1);
    expect(player.stopCount).toBe(0);

    context.dispose();
  });
});
