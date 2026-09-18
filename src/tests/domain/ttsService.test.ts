import { TtsService } from '../../services/tts/ttsService';
import { buildCues, describeStepStart } from '../../features/runner/services/runnerCueCoordinator';
import { startRunner } from '../../features/runner/domain/runnerMachine';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../features/settings/settingsModel';
import { createTestSpeaker, makeSteps } from '../support/fixtures';

function createService(options: { enabled?: boolean; speaker?: ReturnType<typeof createTestSpeaker> } = {}) {
  const speaker = options.speaker ?? createTestSpeaker();
  const errors: unknown[] = [];
  const enabled = options.enabled ?? true;
  const service = new TtsService({
    speaker,
    isEnabled: () => enabled,
    getRate: () => 1,
    onError: (error) => errors.push(error),
  });
  return { service, speaker, errors };
}

describe('TTS cue service (T043, T054, T060)', () => {
  it('speaks a cue once and de-duplicates repeats of the same key', () => {
    const { service, speaker } = createService();

    expect(service.announce({ key: 'step:s1:0:start', text: '肩部拉伸，30秒' })).toBe(true);
    expect(service.announce({ key: 'step:s1:0:start', text: '肩部拉伸，30秒' })).toBe(false);

    expect(speaker.spoken).toEqual(['肩部拉伸，30秒']);
  });

  it('says nothing when speech is disabled in settings', () => {
    const { service, speaker } = createService({ enabled: false });
    expect(service.announce({ key: 'k', text: '不应播报' })).toBe(false);
    expect(speaker.spoken).toEqual([]);
  });

  it('replaces the queued cue instead of flooding the device queue', () => {
    const speaker = createTestSpeaker({ autoFinish: false });
    const { service } = createService({ speaker });

    service.announce({ key: 'a', text: 'A' });
    service.announce({ key: 'b', text: 'B' });
    service.announce({ key: 'c', text: 'C' });

    // Only the first cue is speaking; the newest pending one replaced B.
    expect(speaker.spoken).toEqual(['A']);
  });

  it('interrupts the current utterance for a step change', () => {
    const speaker = createTestSpeaker({ autoFinish: false });
    const { service } = createService({ speaker });

    service.announce({ key: 'warn', text: '5秒后结束' });
    service.announce({ key: 'step', text: '下一个动作', interrupt: true });

    expect(speaker.stopCount).toBe(1);
    expect(speaker.spoken).toEqual(['5秒后结束', '下一个动作']);
  });

  it('ignores a stale completion callback from an interrupted utterance', () => {
    const speaker = createTestSpeaker({ autoFinish: false });
    const { service } = createService({ speaker });

    service.announce({ key: 'warn', text: '5秒后结束' });
    service.announce({ key: 'step', text: '下一个动作', interrupt: true });
    // A pending cue is still queued behind the interruption.
    service.announce({ key: 'next', text: '准备' });

    expect(speaker.spoken).toEqual(['5秒后结束', '下一个动作']);
  });

  it('treats a throwing speaker as non-fatal and keeps later cues working', () => {
    const errors: unknown[] = [];
    let calls = 0;
    const service = new TtsService({
      speaker: {
        speak: () => {
          calls += 1;
          throw new Error('speech engine unavailable');
        },
        stop: () => undefined,
      },
      isEnabled: () => true,
      getRate: () => 1,
      onError: (error) => errors.push(error),
    });

    expect(() => service.announce({ key: 'a', text: 'A' })).not.toThrow();
    expect(errors).toHaveLength(1);
    expect(service.getLastError()).toBe('speech engine unavailable');

    service.announce({ key: 'b', text: 'B' });
    expect(calls).toBe(2);
  });

  it('clears delivered keys when a new session starts', () => {
    const { service, speaker } = createService();

    service.announce({ key: 'step:s1:0:start', text: 'A' });
    service.resetSession();
    service.announce({ key: 'step:s1:0:start', text: 'A' });

    expect(speaker.spoken).toEqual(['A', 'A']);
  });

  it('silences queued speech without forgetting de-duplication', () => {
    const speaker = createTestSpeaker({ autoFinish: false });
    const { service } = createService({ speaker });

    service.announce({ key: 'a', text: 'A' });
    service.silence();
    service.announce({ key: 'a', text: 'A' });

    expect(speaker.spoken).toEqual(['A']);
  });
});

describe('runner cue coordinator (T044, T085)', () => {
  const steps = makeSteps([
    ['A', 10, 5],
    ['B', 20, 0],
  ]);

  it('announces the step name and duration', () => {
    expect(describeStepStart(steps[0]!)).toBe('A，10秒');
  });

  it('announces a step start, the next action and completion', () => {
    const started = startRunner({ sessionId: 's1', routineId: 'r1', steps, nowMs: 0 });
    const cues = buildCues({
      session: started.session,
      steps,
      events: started.events,
      settings: DEFAULT_SETTINGS,
      nowMs: 0,
    });

    expect(cues[0]).toMatchObject({ key: 'step:s1:0:start', text: 'A，10秒', interrupt: true });
  });

  it('never speaks a suppressed step start', () => {
    const started = startRunner({ sessionId: 's1', routineId: 'r1', steps, nowMs: 0 });
    const cues = buildCues({
      session: started.session,
      steps,
      events: [{ type: 'STEP_STARTED', stepIndex: 1, suppressed: true }],
      settings: DEFAULT_SETTINGS,
      nowMs: 0,
    });

    expect(cues).toEqual([]);
  });

  it('announces the upcoming action during a transition', () => {
    const started = startRunner({ sessionId: 's1', routineId: 'r1', steps, nowMs: 0 });
    const cues = buildCues({
      session: started.session,
      steps,
      events: [{ type: 'TRANSITION_STARTED', fromStepIndex: 0, toStepIndex: 1, suppressed: false }],
      settings: DEFAULT_SETTINGS,
      nowMs: 10_000,
    });

    expect(cues).toEqual([
      { key: 'transition:s1:1:next', text: '下一个，B' },
    ]);
  });

  it('adds the countdown warning once the step is inside the warning window', () => {
    const started = startRunner({ sessionId: 's1', routineId: 'r1', steps, nowMs: 0 });
    const settings = normalizeSettings({ countdownWarningSec: 5, countdownWarningEnabled: true });

    const early = buildCues({ session: started.session, steps, events: [], settings, nowMs: 4_000 });
    expect(early).toEqual([]);

    const late = buildCues({ session: started.session, steps, events: [], settings, nowMs: 6_000 });
    expect(late).toHaveLength(1);
    expect(late[0]?.text).toBe('4秒后结束');
    expect(late[0]?.key).toBe('warn:s1:0:10000');
  });

  it('respects the countdown warning setting', () => {
    const started = startRunner({ sessionId: 's1', routineId: 'r1', steps, nowMs: 0 });
    const settings = normalizeSettings({ countdownWarningEnabled: false });
    expect(buildCues({ session: started.session, steps, events: [], settings, nowMs: 6_000 })).toEqual([]);
  });

  it('re-arms the warning after a +10 extension', () => {
    const started = startRunner({ sessionId: 's1', routineId: 'r1', steps, nowMs: 0 });
    const extended = { ...started.session, effectiveStepDurationMs: 20_000, runtimeExtensionMs: 10_000 };
    const settings = normalizeSettings({ countdownWarningSec: 5 });

    const cues = buildCues({ session: extended, steps, events: [], settings, nowMs: 16_000 });
    expect(cues[0]?.key).toBe('warn:s1:0:20000');
  });

  it('announces completion', () => {
    const started = startRunner({ sessionId: 's1', routineId: 'r1', steps, nowMs: 0 });
    const cues = buildCues({
      session: started.session,
      steps,
      events: [{ type: 'COMPLETED' }],
      settings: DEFAULT_SETTINGS,
      nowMs: 0,
    });
    expect(cues).toEqual([{ key: 'complete:s1', text: '流程完成', interrupt: true }]);
  });

  it('skips the warning for steps shorter than the warning window', () => {
    const shortSteps = makeSteps([['短', 5, 0]]);
    const started = startRunner({ sessionId: 's1', routineId: 'r1', steps: shortSteps, nowMs: 0 });
    const settings = normalizeSettings({ countdownWarningSec: 5 });

    expect(
      buildCues({ session: started.session, steps: shortSteps, events: [], settings, nowMs: 1_000 }),
    ).toEqual([]);
  });
});
