// Runs inside `firebase emulators:exec` (see the test script): Firestore and Auth are emulators, nothing touches rentka.
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }] },
  // firebase-admin pulls in `jose`, which ships only as ES modules; convert it to CommonJS for Jest.
  transformIgnorePatterns: ['node_modules/(?!jose/)'],
  maxWorkers: 1,
  testTimeout: 30000,
};
