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

// Mock amazon-cognito-identity-js
jest.mock('amazon-cognito-identity-js', () => {
  const mAuthenticateUser = jest.fn((authDetails, callbacks) => {
    if (authDetails.Password === 'fail') {
      callbacks.onFailure({ message: 'Invalid credentials' });
    } else {
      callbacks.onSuccess({
        getIdToken: () => ({ getJwtToken: () => 'mock-id-token' }),
        getAccessToken: () => ({ getJwtToken: () => 'mock-access-token' }),
        getRefreshToken: () => ({ getToken: () => 'mock-refresh-token' })
      });
    }
  });
  return {
    CognitoUserPool: jest.fn().mockImplementation(() => ({
      signUp: jest.fn((username, password, attributes, validationData, callback) => {
        if (password === 'fail') {
          callback({ message: 'Registration failed' }, null);
        } else {
          callback(null, { user: { getUsername: () => username } });
        }
      }),
      getCurrentUser: jest.fn(() => null)
    })),
    CognitoUser: jest.fn().mockImplementation(() => ({
      authenticateUser: mAuthenticateUser,
      confirmRegistration: jest.fn((code, forceAliasCreation, callback) => {
        if (code === 'fail') {
          callback({ message: 'Verification failed' }, null);
        } else {
          callback(null, 'Verification successful');
        }
      }),
      signOut: jest.fn()
    })),
    AuthenticationDetails: jest.fn().mockImplementation(({ Username, Password }) => ({ Username, Password }))
  };
});
