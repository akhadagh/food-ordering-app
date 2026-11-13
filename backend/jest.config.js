/**
 * Jest configuration for the Afia Food Hub API.
 *
 * The backend is native ESM ("type": "module"), so the suite runs on
 * Node's own ESM loader (`--experimental-vm-modules`, see the `test`
 * script in package.json). No transformer is configured - the code under
 * test is the code that ships.
 */
export default {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup/test-env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/after-env.js'],
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',
  transform: {},
  testTimeout: 30_000,
  maxWorkers: 1,
  verbose: true,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/api/**'],
  coverageReporters: ['text-summary', 'lcov'],
};
