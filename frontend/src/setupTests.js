import '@testing-library/jest-dom';

// Mock import.meta.env for Vite environment variables
Object.defineProperty(global, 'import', {
  value: { meta: { env: {
    VITE_COGNITO_USER_POOL_ID: 'dummy-pool-id',
    VITE_COGNITO_USER_POOL_WEB_CLIENT_ID: 'dummy-client-id'
  } } },
  writable: true
});

global.import = { meta: { env: {
  VITE_COGNITO_USER_POOL_ID: 'dummy-pool-id',
  VITE_COGNITO_USER_POOL_WEB_CLIENT_ID: 'dummy-client-id'
} } };

// Remove the global mock for 'amazon-cognito-identity-js' to allow per-test-file mocks to work
