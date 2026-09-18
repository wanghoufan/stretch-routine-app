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
});
