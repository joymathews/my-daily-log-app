// Utility for Cognito token refresh and authenticated API calls
import { CognitoUserPool, CognitoUser, CognitoRefreshToken } from 'amazon-cognito-identity-js';
import env from '../config/env';

const poolData = {
  UserPoolId: env.VITE_COGNITO_USER_POOL_ID,
  ClientId: env.VITE_COGNITO_USER_POOL_WEB_CLIENT_ID
};

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function refreshSession(username, refreshToken) {
  return new Promise((resolve, reject) => {
    const userPool = new CognitoUserPool(poolData);
    const user = new CognitoUser({ Username: username, Pool: userPool });
    const cognitoRefreshToken = new CognitoRefreshToken({ RefreshToken: refreshToken });
    user.refreshSession(cognitoRefreshToken, (err, session) => {
      if (err) return reject(err);
      resolve({
        idToken: session.getIdToken().getJwtToken(),
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken()
      });
    });
  });
}

// Wrapper for fetch/axios with auto token refresh
export async function getValidIdToken() {
  let idToken = localStorage.getItem('cognito_id_token');
  const refreshToken = localStorage.getItem('cognito_refresh_token');
  const username = localStorage.getItem('cognito_username');
  if (isTokenExpired(idToken) && refreshToken && username) {
    try {
      const tokens = await refreshSession(username, refreshToken);
      localStorage.setItem('cognito_id_token', tokens.idToken);
      localStorage.setItem('cognito_access_token', tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem('cognito_refresh_token', tokens.refreshToken);
      }
      idToken = tokens.idToken;
    } catch (err) {
      localStorage.clear();
      window.location.href = '/login';
      throw err;
    }
  }
  return idToken;
}
