module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'clover', 'html'],  testMatch: [
    "**/__tests__/*.test.js",
    "**/__tests__/*.unit.test.js"
  ],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/utils/'],
  collectCoverageFrom: [
    'index.js',
    'routes/**/*.js', // Include all route files for coverage
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js'
  ],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetModules: true
};
