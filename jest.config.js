/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testMatch: ['<rootDir>/src/tests/**/*.test.{ts,tsx}'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))',
  ],
  // Bundled audio loops (TASK-011) are Metro assets in the app; Jest maps them
  // to a stub so `require('.../tick.wav')` resolves without native audio.
  moduleNameMapper: {
    '\\.(wav|mp3|ogg|m4a|aac|opus)$': '<rootDir>/src/tests/support/audioAssetStub.js',
  },
};
