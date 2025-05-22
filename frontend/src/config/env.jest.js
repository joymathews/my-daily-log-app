// Jest/Node environment variables
export default {
  VITE_COGNITO_USER_POOL_ID: process.env.VITE_COGNITO_USER_POOL_ID || 'dummy-pool-id',
  VITE_COGNITO_USER_POOL_WEB_CLIENT_ID: process.env.VITE_COGNITO_USER_POOL_WEB_CLIENT_ID || 'dummy-client-id',
};
