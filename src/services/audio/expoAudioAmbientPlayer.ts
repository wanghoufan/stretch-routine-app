import type { AmbientSoundOption } from '../../features/settings/ambientSound';
import type { AmbientPlayer } from './ambientAudioService';

/**
 * `expo-audio` adapter for the ambient loop (TASK-011).
 *
 * SDK 57 ships `expo-audio`; `expo-av` is deprecated and not used. Both the
 * native module and the bundled WAVs are loaded lazily, and the player is only
 * created on the first `play()` call — so `silent` never creates an instance and
 * tests / non-device targets never pull native audio.
 *
 * `expo-audio` exposes no ducking hook for the TTS channel, so the two simply
 * overlay (documented in `assets/audio/README.md`).
 */
const ASSETS: Record<Exclude<AmbientSoundOption, 'silent'>, number> = {
  tick: require('../../../assets/audio/tick.wav'),
  morning: require('../../../assets/audio/morning.wav'),
  night: require('../../../assets/audio/night.wav'),
  ethereal: require('../../../assets/audio/ethereal.wav'),
};

export function createExpoAudioAmbientPlayer(): AmbientPlayer {
  let player: import('expo-audio').AudioPlayer | null = null;

  function ensurePlayer(): import('expo-audio').AudioPlayer {
    if (player) {
      return player;
    }
    const Audio = require('expo-audio') as typeof import('expo-audio');
    player = Audio.createAudioPlayer(null, { keepAudioSessionActive: true });
    player.loop = true;
    // Best-effort session setup: ambient audio must never take focus away from
    // device speech, so it mixes instead of requesting exclusive focus.
    void Audio.setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
    return player;
  }

  return {
    play(option, options) {
      if (option === 'silent') {
        return;
      }
      const asset = ASSETS[option];
      const active = ensurePlayer();
      active.replace(asset);
      active.loop = true;
      active.volume = options.volume;
      active.play();
    },
    stop() {
      if (!player) {
        return;
      }
      player.pause();
    },
    dispose() {
      if (!player) {
        return;
      }
      player.remove();
      player = null;
    },
  };
}
