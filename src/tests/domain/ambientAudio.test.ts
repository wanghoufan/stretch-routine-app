import { AmbientAudioService } from '../../services/audio/ambientAudioService';
import {
  AMBIENT_SOUND_META,
  AMBIENT_SOUND_OPTIONS,
  DEFAULT_AMBIENT_SOUND,
  ambientSoundTestId,
  normalizeAmbientSound,
  type AmbientSoundOption,
} from '../../features/settings/ambientSound';
import { createTestAmbientPlayer, type RecordingAmbientPlayer } from '../support/fixtures';

function createService(): { service: AmbientAudioService; player: RecordingAmbientPlayer } {
  const player = createTestAmbientPlayer();
  return { service: new AmbientAudioService({ player }), player };
}

describe('ambient sound option model (TASK-011 / TASK-016)', () => {
  it('offers exactly the five documented choices, tick by default', () => {
    expect(AMBIENT_SOUND_OPTIONS).toEqual(['silent', 'tick', 'morning', 'night', 'ethereal']);
    expect(DEFAULT_AMBIENT_SOUND).toBe('tick');
  });

  it('maps every option to a Chinese label, asset and volume', () => {
    for (const option of AMBIENT_SOUND_OPTIONS) {
      const meta = AMBIENT_SOUND_META[option];
      expect(meta.option).toBe(option);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(ambientSoundTestId(option)).toBe(`settings-ambient-${option}`);
      if (option === 'silent') {
        expect(meta.assetFile).toBeNull();
        expect(meta.volume).toBe(0);
      } else {
        expect(meta.assetFile).toMatch(/\.wav$/);
        expect(meta.volume).toBeGreaterThan(0);
        expect(meta.volume).toBeLessThanOrEqual(1);
      }
    }
  });

  it('labels are the expected Chinese names', () => {
    expect(AMBIENT_SOUND_META.silent.label).toBe('无声');
    expect(AMBIENT_SOUND_META.tick.label).toBe('滴答');
    expect(AMBIENT_SOUND_META.morning.label).toBe('轻音乐·晨曦');
    expect(AMBIENT_SOUND_META.night.label).toBe('轻音乐·静夜');
    expect(AMBIENT_SOUND_META.ethereal.label).toBe('轻音乐·空山');
  });

  it('normalises unknown or missing values back to tick', () => {
    expect(normalizeAmbientSound('morning')).toBe('morning');
    expect(normalizeAmbientSound('night')).toBe('night');
    expect(normalizeAmbientSound('ethereal')).toBe('ethereal');
    expect(normalizeAmbientSound(undefined)).toBe('tick');
    expect(normalizeAmbientSound('thunderstorm')).toBe('tick');
    expect(normalizeAmbientSound(7)).toBe('tick');
    expect(normalizeAmbientSound({})).toBe('tick');
  });

  it('rewrites the retired rain/waves/forest values to tick (forward compatible)', () => {
    expect(normalizeAmbientSound('rain')).toBe('tick');
    expect(normalizeAmbientSound('waves')).toBe('tick');
    expect(normalizeAmbientSound('forest')).toBe('tick');
  });
});

describe('ambient audio service (TASK-011)', () => {
  it('plays the selected loop while the runner is running', () => {
    const { service, player } = createService();

    expect(service.sync('RUNNING_STEP', 'morning')).toBe('morning');
    expect(player.played).toEqual([{ option: 'morning', volume: AMBIENT_SOUND_META.morning.volume }]);
    expect(service.getActiveOption()).toBe('morning');
  });

  it('plays during a transition too', () => {
    const { service, player } = createService();
    expect(service.sync('RUNNING_TRANSITION', 'night')).toBe('night');
    expect(player.played.map((entry) => entry.option)).toEqual(['night']);
  });

  it('creates no player at all for silent', () => {
    const { service, player } = createService();

    expect(service.sync('RUNNING_STEP', 'silent')).toBeNull();
    expect(player.played).toEqual([]);
    expect(player.stopCount).toBe(0);
    expect(service.getActiveOption()).toBeNull();
  });

  it.each(['PAUSED_STEP', 'PAUSED_TRANSITION'] as const)('stops when paused (%s)', (state) => {
    const { service, player } = createService();
    service.sync('RUNNING_STEP', 'ethereal');

    expect(service.sync(state, 'ethereal')).toBeNull();
    expect(service.getActiveOption()).toBeNull();
    expect(player.stopCount).toBe(1);
    expect(player.played.map((entry) => entry.option)).toEqual(['ethereal']);
  });

  it.each(['COMPLETED', 'STOPPED', 'ERROR', 'IDLE', 'PREPARING'] as const)(
    'stops on %s',
    (state) => {
      const { service, player } = createService();
      service.sync('RUNNING_STEP', 'tick');

      service.sync(state, 'tick');

      expect(service.getActiveOption()).toBeNull();
      expect(player.stopCount).toBe(1);
    },
  );

  it('resumes the loop after a pause when the state runs again', () => {
    const { service, player } = createService();
    service.sync('RUNNING_STEP', 'morning');
    service.sync('PAUSED_STEP', 'morning');
    service.sync('RUNNING_STEP', 'morning');

    expect(player.played.map((entry) => entry.option)).toEqual(['morning', 'morning']);
    expect(player.stopCount).toBe(1);
  });

  it('switches source immediately when the option changes mid-run', () => {
    const { service, player } = createService();
    service.sync('RUNNING_STEP', 'tick');
    service.sync('RUNNING_STEP', 'night');

    expect(service.getActiveOption()).toBe('night');
    expect(player.played.map((entry) => entry.option)).toEqual(['tick', 'night']);
    // The old loop is stopped before the new one starts.
    expect(player.stopCount).toBe(1);
  });

  it('keeps playing without touching the player when nothing changed', () => {
    const { service, player } = createService();
    service.sync('RUNNING_STEP', 'tick');
    service.sync('RUNNING_STEP', 'tick');
    service.sync('RUNNING_TRANSITION', 'tick');

    expect(player.played).toHaveLength(1);
    expect(player.stopCount).toBe(0);
  });

  it('switching to silent mid-run stops the loop', () => {
    const { service, player } = createService();
    service.sync('RUNNING_STEP', 'ethereal');
    service.sync('RUNNING_STEP', 'silent');

    expect(service.getActiveOption()).toBeNull();
    expect(player.stopCount).toBe(1);
  });

  it('treats a null session as "not playing"', () => {
    const { service, player } = createService();
    service.sync('RUNNING_STEP', 'tick');
    service.sync(null, 'tick');

    expect(service.getActiveOption()).toBeNull();
    expect(player.stopCount).toBe(1);
  });

  it('never lets a failing player break the routine', () => {
    const errors: unknown[] = [];
    const service = new AmbientAudioService({
      player: {
        play() {
          throw new Error('decoder unavailable');
        },
        stop() {
          throw new Error('cannot stop');
        },
      },
      onError: (error) => errors.push(error),
    });

    expect(() => service.sync('RUNNING_STEP', 'morning')).not.toThrow();
    expect(service.getActiveOption()).toBeNull();
    expect(service.getLastError()).toBe('decoder unavailable');

    service.sync('PAUSED_STEP', 'morning');
    expect(errors).toHaveLength(1);
  });

  it('stops and releases the player on dispose', () => {
    const { service, player } = createService();
    service.sync('RUNNING_STEP', 'night');
    service.dispose();

    expect(player.stopCount).toBe(1);
    expect(player.disposed).toBe(true);
  });

  it('covers every option through sync without throwing', () => {
    const { service } = createService();
    for (const option of AMBIENT_SOUND_OPTIONS as readonly AmbientSoundOption[]) {
      expect(() => service.sync('RUNNING_STEP', option)).not.toThrow();
    }
  });
});
