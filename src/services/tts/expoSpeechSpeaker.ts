import type { TtsSpeaker } from './ttsService';

/**
 * `expo-speech` adapter.
 *
 * The module is required lazily so importing the TTS layer never pulls native
 * code into a non-device environment (tests, node validation).
 */
export function createExpoSpeechSpeaker(): TtsSpeaker {
  return {
    speak(text, options) {
      const Speech = require('expo-speech') as typeof import('expo-speech');
      Speech.speak(text, {
        language: 'zh-CN',
        rate: options.rate,
        onDone: options.onDone,
        onStopped: options.onDone,
        onError: options.onError,
      });
    },
    stop() {
      const Speech = require('expo-speech') as typeof import('expo-speech');
      Speech.stop();
    },
  };
}
