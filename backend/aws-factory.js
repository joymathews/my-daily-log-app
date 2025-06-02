// AWS SDK v3 migration
const { S3Client } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const {
  AWS_REGION, DYNAMODB_ENDPOINT, S3_ENDPOINT,
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, LOCAL_DEV
} = require('./config');

function isLocalEnv() {
  return LOCAL_DEV === 'true';
}

function createAwsClients() {
  // Shared credentials/config
  const sharedConfig = {
    region: AWS_REGION,
  };
  if (isLocalEnv()) {
    sharedConfig.credentials = {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    };
  }

  // S3 Client
  const s3Config = {
    ...sharedConfig,
    endpoint: S3_ENDPOINT,
    forcePathStyle: true, // v3: s3ForcePathStyle -> forcePathStyle
  };
  const s3 = new S3Client(s3Config);

  // DynamoDB Client
  const dynamoConfig = {
    ...sharedConfig,
    endpoint: DYNAMODB_ENDPOINT,
  };
  const dynamoDBClient = new DynamoDBClient(dynamoConfig);
  const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

  return { s3, dynamoDB, dynamoDBClient };
}

module.exports = { createAwsClients, isLocalEnv };
