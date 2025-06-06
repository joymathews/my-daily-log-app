// Utility for Cognito token refresh and authenticated API calls
import { CognitoUserPool, CognitoUser, CognitoRefreshToken } from 'amazon-cognito-identity-js';
import env from '../config/env';

const poolData = {
  UserPoolId: env.VITE_COGNITO_USER_POOL_ID,
  ClientId: env.VITE_COGNITO_USER_POOL_WEB_CLIENT_ID
};

export const COGNITO_ID_TOKEN = 'cognito_id_token';
export const COGNITO_ACCESS_TOKEN = 'cognito_access_token';
export const COGNITO_REFRESH_TOKEN = 'cognito_refresh_token';
export const COGNITO_USERNAME = 'cognito_username';

export function clearCognitoStorage() {
  localStorage.removeItem(COGNITO_ID_TOKEN);
  localStorage.removeItem(COGNITO_ACCESS_TOKEN);
  localStorage.removeItem(COGNITO_REFRESH_TOKEN);
  localStorage.removeItem(COGNITO_USERNAME);
}

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
  let idToken = localStorage.getItem(COGNITO_ID_TOKEN);
  const refreshToken = localStorage.getItem(COGNITO_REFRESH_TOKEN);
  const username = localStorage.getItem(COGNITO_USERNAME);
  if (isTokenExpired(idToken)) {
    if (refreshToken && username) {
      try {
        const tokens = await refreshSession(username, refreshToken);
        localStorage.setItem(COGNITO_ID_TOKEN, tokens.idToken);
        localStorage.setItem(COGNITO_ACCESS_TOKEN, tokens.accessToken);
        if (tokens.refreshToken) {
          localStorage.setItem(COGNITO_REFRESH_TOKEN, tokens.refreshToken);
        }
        idToken = tokens.idToken;
      } catch (err) {
        clearCognitoStorage();
        window.location.href = '/login';
        throw err;
      }
    } else {
      // No refresh token or username, treat as unauthenticated
      clearCognitoStorage();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }
  return idToken;
}
