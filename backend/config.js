// Centralized configuration for backend defaults
module.exports = {
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'my-daily-log-files',
  DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'DailyLogEvents',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://localhost:4566',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'dummy',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  COGNITO_REGION: process.env.COGNITO_REGION || process.env.AWS_REGION || 'us-east-1',
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  COGNITO_APP_CLIENT_ID: process.env.COGNITO_APP_CLIENT_ID || process.env.COGNITO_USER_POOL_WEB_CLIENT_ID,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
