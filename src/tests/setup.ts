/**
 * Global Jest setup for the Stretch Routine V1 test suite.
 *
 * Keeps the environment deterministic and quiet: React/RN noise from
 * `act()`-adjacent warnings would otherwise drown out real failures.
 */

const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

const IGNORED_PATTERNS = [
  'not wrapped in act',
  'componentWillReceiveProps',
  'An update to',
  'AsyncStorage has been extracted',
];

function shouldIgnore(message: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => message.includes(pattern));
}

beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (shouldIgnore(first)) {
      return;
    }
    originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (shouldIgnore(first)) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
