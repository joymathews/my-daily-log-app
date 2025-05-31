module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],  moduleNameMapper: {
    // Always mock env.js with the manual mock for tests
    '^@/config/env$': '<rootDir>/src/config/__mocks__/env.js',
    '^src/config/env$': '<rootDir>/src/config/__mocks__/env.js',
    '^\\./config/env$': '<rootDir>/src/config/__mocks__/env.js',
    '^\\..\\/config/env$': '<rootDir>/src/config/__mocks__/env.js',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    // Mock CSS files
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
};
