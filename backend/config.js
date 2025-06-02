// Centralized configuration for backend defaults
module.exports = {
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
  AWS_REGION: process.env.AWS_REGION,
  DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  COGNITO_REGION: process.env.COGNITO_REGION,
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  COGNITO_USER_POOL_WEB_CLIENT_ID: process.env.COGNITO_USER_POOL_WEB_CLIENT_ID,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  LOCAL_DEV: typeof process.env.LOCAL_DEV !== 'undefined' ? process.env.LOCAL_DEV : 'false',
};
