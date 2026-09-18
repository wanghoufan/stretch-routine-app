import type { RoutineStep } from '../../domain/routine/RoutineStep';
import type { RoutineStepDraft } from '../../domain/routine/RoutineStep';
import { createSequentialIdGenerator } from '../../shared/utils/id';
import type { TtsSpeaker } from '../../services/tts/ttsService';
import type { AmbientPlayer } from '../../services/audio/ambientAudioService';
import type { AmbientSoundOption } from '../../features/settings/ambientSound';

/** Build ordered routine steps from a compact table. */
export function makeSteps(
  table: readonly (readonly [name: string, durationSec: number, transitionSec?: number])[],
): RoutineStep[] {
  return table.map((row, index) => ({
    id: `step-${index + 1}`,
    routineId: 'routine-1',
    orderIndex: index,
    displayName: row[0],
    speakText: row[0],
    durationSec: row[1],
    transitionSec: row[2] ?? 0,
    side: 'none' as const,
  }));
}

export function makeStepDrafts(
  table: readonly (readonly [name: string, durationSec: number, transitionSec?: number])[],
): RoutineStepDraft[] {
  const nextId = createSequentialIdGenerator('step');
  return table.map((row) => ({
    id: nextId('step'),
    displayName: row[0],
    speakText: row[0],
    durationSec: row[1],
    transitionSec: row[2] ?? 0,
    side: 'none' as const,
  }));
}

export interface RecordingSpeaker extends TtsSpeaker {
  spoken: string[];
  stopCount: number;
}

/**
 * Speech double. `autoFinish` (default) resolves each utterance immediately,
 * which keeps tests deterministic; set it false to inspect queueing behaviour.
 */
export function createTestSpeaker(options: { autoFinish?: boolean } = {}): RecordingSpeaker {
  const autoFinish = options.autoFinish ?? true;
  const speaker: RecordingSpeaker = {
    spoken: [],
    stopCount: 0,
    speak(text, speechOptions) {
      speaker.spoken.push(text);
      if (autoFinish) {
        speechOptions.onDone?.();
      }
    },
    stop() {
      speaker.stopCount += 1;
    },
  };
  return speaker;
}

export interface RecordingAmbientPlayer extends AmbientPlayer {
  /** Every `play` call, in order, with the volume it was given. */
  played: { option: AmbientSoundOption; volume: number }[];
  stopCount: number;
  disposed: boolean;
}

/** Ambient loop double: records calls, creates no player, touches no native audio. */
export function createTestAmbientPlayer(): RecordingAmbientPlayer {
  const player: RecordingAmbientPlayer = {
    played: [],
    stopCount: 0,
    disposed: false,
    play(option, options) {
      player.played.push({ option, volume: options.volume });
    },
    stop() {
      player.stopCount += 1;
    },
    dispose() {
      player.disposed = true;
    },
  };
  return player;
}
