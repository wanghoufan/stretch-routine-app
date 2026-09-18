/**
 * Countdown background sound options (TASK-011, music swapped in TASK-016).
 *
 * A single global choice, persisted with the rest of `AppSettings`. The label
 * and asset mapping live here so the settings UI, the tests and the audio
 * adapter all agree on one source of truth.
 *
 * TASK-016 removed the three sampled nature loops (`rain` / `waves` / `forest`)
 * in favour of three original, fully synthesised light-music loops.
 */
export type AmbientSoundOption = 'silent' | 'tick' | 'morning' | 'night' | 'ethereal';

/** Display order in the settings radio group. */
export const AMBIENT_SOUND_OPTIONS: readonly AmbientSoundOption[] = [
  'silent',
  'tick',
  'morning',
  'night',
  'ethereal',
];

export const DEFAULT_AMBIENT_SOUND: AmbientSoundOption = 'tick';

export interface AmbientSoundMeta {
  option: AmbientSoundOption;
  /** Chinese label shown to the user and used as the accessibility label. */
  label: string;
  /** One-line hint under the label. */
  description: string;
  /** Bundled asset basename, or null for `silent` (no player is ever created). */
  assetFile: string | null;
  /** Playback volume 0..1; 0 for `silent`. */
  volume: number;
}

export const AMBIENT_SOUND_META: Record<AmbientSoundOption, AmbientSoundMeta> = {
  silent: {
    option: 'silent',
    label: '无声',
    description: '不播放背景音',
    assetFile: null,
    volume: 0,
  },
  tick: {
    option: 'tick',
    label: '滴答',
    description: '轻节拍滴答声',
    assetFile: 'tick.wav',
    volume: 0.5,
  },
  morning: {
    option: 'morning',
    label: '轻音乐·晨曦',
    description: '上行音阶的温暖晨光',
    assetFile: 'morning.wav',
    volume: 0.5,
  },
  night: {
    option: 'night',
    label: '轻音乐·静夜',
    description: '低音慢琶音与长混响',
    assetFile: 'night.wav',
    volume: 0.5,
  },
  ethereal: {
    option: 'ethereal',
    label: '轻音乐·空山',
    description: '高音稀疏钟声与留白',
    assetFile: 'ethereal.wav',
    volume: 0.5,
  },
};

/**
 * Options removed in TASK-016. Stored values from an older install must not
 * resurrect the nature loops, so they are silently rewritten to the default.
 */
const LEGACY_AMBIENT_SOUND_ALIASES: Record<string, AmbientSoundOption> = {
  rain: DEFAULT_AMBIENT_SOUND,
  waves: DEFAULT_AMBIENT_SOUND,
  forest: DEFAULT_AMBIENT_SOUND,
};

export function isAmbientSoundOption(value: unknown): value is AmbientSoundOption {
  return typeof value === 'string' && (AMBIENT_SOUND_OPTIONS as readonly string[]).includes(value);
}

/**
 * Coerce any stored/partial value into a valid option. Unknown values and the
 * retired `rain` / `waves` / `forest` aliases fall back to tick.
 */
export function normalizeAmbientSound(value: unknown): AmbientSoundOption {
  if (isAmbientSoundOption(value)) {
    return value;
  }
  if (typeof value === 'string' && value in LEGACY_AMBIENT_SOUND_ALIASES) {
    return LEGACY_AMBIENT_SOUND_ALIASES[value];
  }
  return DEFAULT_AMBIENT_SOUND;
}

/** testID for a given option's radio row. */
export function ambientSoundTestId(option: AmbientSoundOption): string {
  return `settings-ambient-${option}`;
}
