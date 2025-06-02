const AWS = require('aws-sdk');
const {
  AWS_REGION, DYNAMODB_ENDPOINT, S3_ENDPOINT,
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, LOCAL_DEV
} = require('./config');

// Simple local environment check using config.js value
function isLocalEnv() {
  return LOCAL_DEV === 'true';
}

function createAwsClients(AWSLib = AWS) {
  const baseConfig = { region: AWS_REGION };

  // Only set credentials for local/dev (assume they are set if LOCAL_DEV is true)
  if (isLocalEnv()) {
    baseConfig.credentials = {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    };
  }

  AWSLib.config.update(baseConfig);

  const s3Config = {
    endpoint: S3_ENDPOINT,
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    region: AWS_REGION
  };
  if (isLocalEnv()) {
    s3Config.credentials = {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    };
  }
  const s3 = new AWSLib.S3(s3Config);

  const dynamoDBConfig = { region: AWS_REGION, endpoint: DYNAMODB_ENDPOINT };
  if (isLocalEnv()) {
    dynamoDBConfig.credentials = {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    };
  }
  const dynamoDB = new AWSLib.DynamoDB.DocumentClient(dynamoDBConfig);
  const dynamoDBAdmin = new AWSLib.DynamoDB(dynamoDBConfig);

  return { s3, dynamoDB, dynamoDBAdmin };
}

module.exports = { createAwsClients, isLocalEnv };
