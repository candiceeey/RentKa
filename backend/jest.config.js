// maxWorkers 1: both test files share one emulator, so they must not run at the same time.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  maxWorkers: 1,
  testTimeout: 30000,
};
