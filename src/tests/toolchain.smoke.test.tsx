import { Text, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';

describe('toolchain smoke test', () => {
  it('resolves node:sqlite', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
    const db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE t (a TEXT)');
    db.prepare('INSERT INTO t VALUES (?)').run('ok');
    const rows = db.prepare('SELECT a FROM t').all() as { a: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.a).toBe('ok');
  });

  it('renders React Native components', () => {
    render(
      <View>
        <Text>你好</Text>
      </View>,
    );
    expect(screen.getByText('你好')).toBeTruthy();
  });

  it('bundles the ambient loops as assets (TASK-011)', () => {
    // `require` of a WAV returns an asset module under Metro; Jest maps it to a
    // stub (see jest.config.js). Either way the import must resolve.
    const tick = require('../assets/audio/tick.wav') as number | { uri?: string };
    expect(tick).toBeDefined();

    // `expo-audio` is only reached lazily inside the adapter, so importing the
    // module (and building the port) must not touch native audio.
    const { createExpoAudioAmbientPlayer } = require('../services/audio/expoAudioAmbientPlayer') as typeof import('../services/audio/expoAudioAmbientPlayer');
    const player = createExpoAudioAmbientPlayer();
    expect(typeof player.play).toBe('function');
    expect(typeof player.stop).toBe('function');

    // Creating the adapter does not create a native player: only `play()` does.
    expect(() => player.stop()).not.toThrow();
  });
});
