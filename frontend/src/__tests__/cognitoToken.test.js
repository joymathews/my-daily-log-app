import * as cognitoToken from '../utils/cognitoToken';
jest.mock('amazon-cognito-identity-js', () => {
  return {
    CognitoUserPool: jest.fn().mockImplementation(() => ({ })),
    CognitoUser: jest.fn().mockImplementation(() => ({
      refreshSession: jest.fn((refreshToken, cb) => {
        // This will be overridden by jest.spyOn in individual tests
      })
    })),
    CognitoRefreshToken: jest.fn().mockImplementation(() => ({})),
  };
});

describe('cognitoToken utility', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    delete window.location;
    window.location = { href: '' };
  });

  describe('isTokenExpired', () => {
    it('returns true for expired token', () => {
      const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 10 }));
      const token = `header.${expiredPayload}.signature`;
      expect(cognitoToken.isTokenExpired(token)).toBe(true);
    });
    it('returns false for valid token', () => {
      const validPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
      const token = `header.${validPayload}.signature`;
      expect(cognitoToken.isTokenExpired(token)).toBe(false);
    });
    it('returns true for invalid token', () => {
      expect(cognitoToken.isTokenExpired('bad.token')).toBe(true);
      expect(cognitoToken.isTokenExpired()).toBe(true);
    });
  });

  describe('getValidIdToken', () => {
    let cognitoUserInstance;
    beforeEach(() => {
      jest.spyOn(cognitoToken, 'isTokenExpired').mockImplementation(token => token === 'expired.token');
      // Patch the CognitoUser mock for each test
      const { CognitoUser } = require('amazon-cognito-identity-js');
      cognitoUserInstance = {
        refreshSession: jest.fn()
      };
      CognitoUser.mockImplementation(() => cognitoUserInstance);
    });
    it('refreshes token if expired and returns new token', async () => {
      localStorage.setItem('cognito_id_token', 'expired.token');
      localStorage.setItem('cognito_refresh_token', 'refresh');
      localStorage.setItem('cognito_username', 'user');
      cognitoUserInstance.refreshSession.mockImplementation((refreshToken, cb) => {
        cb(null, {
          getIdToken: () => ({ getJwtToken: () => 'new.token' }),
          getAccessToken: () => ({ getJwtToken: () => 'new.access' }),
          getRefreshToken: () => ({ getToken: () => 'new.refresh' })
        });
      });
      const token = await cognitoToken.getValidIdToken();
      expect(token).toBe('new.token');
      expect(localStorage.getItem('cognito_id_token')).toBe('new.token');
      expect(localStorage.getItem('cognito_access_token')).toBe('new.access');
      expect(localStorage.getItem('cognito_refresh_token')).toBe('new.refresh');
    });
    it('clears storage and redirects on refresh failure', async () => {
      localStorage.setItem('cognito_id_token', 'expired.token');
      localStorage.setItem('cognito_refresh_token', 'refresh');
      localStorage.setItem('cognito_username', 'user');
      cognitoUserInstance.refreshSession.mockImplementation((refreshToken, cb) => {
        cb(new Error('fail'));
      });
      await expect(cognitoToken.getValidIdToken()).rejects.toThrow('fail');
      expect(localStorage.getItem('cognito_id_token')).toBeNull();
      expect(window.location.href).toBe('/login');
    });
  });
});
