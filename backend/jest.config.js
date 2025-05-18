module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'clover', 'html'],  coverageThreshold: {
    global: {
      branches: 73,
      functions: 70, 
      lines: 72,
      statements: 72
    }
  },  testMatch: ['**/__tests__/{server,integration,view-events,basic}.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/utils/'],
  collectCoverageFrom: [
    'index.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js'
  ],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetModules: true
};
