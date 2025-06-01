const AWS = require('aws-sdk');

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'my-daily-log-files';
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'DailyLogEvents';

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:4566',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});
const dynamoDBAdmin = new AWS.DynamoDB({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

async function ensureBucketExists() {
  try {
    console.log(`Checking if bucket ${S3_BUCKET_NAME} exists...`);
    try {
      await s3.headBucket({ Bucket: S3_BUCKET_NAME }).promise();
      console.log(`Bucket ${S3_BUCKET_NAME} exists.`);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`Bucket ${S3_BUCKET_NAME} doesn't exist. Creating it...`);
        await s3.createBucket({ Bucket: S3_BUCKET_NAME }).promise();
        await s3.putBucketAcl({ Bucket: S3_BUCKET_NAME, ACL: 'public-read' }).promise();
        console.log(`Bucket ${S3_BUCKET_NAME} created successfully.`);
        return true;
      } else {
        console.error('Error checking bucket existence:', error);
        return false;
      }
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    return false;
  }
}

async function ensureTableExists() {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'userSub', AttributeType: 'S' },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userSub-index',
        KeySchema: [
          { AttributeName: 'userSub', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
  };
  try {
    console.log(`Checking if DynamoDB table ${DYNAMODB_TABLE_NAME} exists...`);
    const tables = await dynamoDBAdmin.listTables().promise();
    if (tables.TableNames.includes(DYNAMODB_TABLE_NAME)) {
      const desc = await dynamoDBAdmin.describeTable({ TableName: DYNAMODB_TABLE_NAME }).promise();
      const gsis = desc.Table.GlobalSecondaryIndexes || [];
      const hasUserSubIndex = gsis.some(idx => idx.IndexName === 'userSub-index');
      if (!hasUserSubIndex) {
        console.warn(`WARNING: Table ${DYNAMODB_TABLE_NAME} exists but is missing userSub-index. Queries by user will fail. Please migrate or recreate the table with the correct index.`);
      } else {
        console.log(`Table ${DYNAMODB_TABLE_NAME} exists and has userSub-index.`);
      }
      return true;
    } else {
      console.log(`Table ${DYNAMODB_TABLE_NAME} doesn't exist. Creating it...`);
      await dynamoDBAdmin.createTable(params).promise();
      await dynamoDBAdmin.waitFor('tableExists', { TableName: DYNAMODB_TABLE_NAME }).promise();
      console.log(`Table ${DYNAMODB_TABLE_NAME} created successfully.`);
      return true;
    }
  } catch (error) {
    console.error('Error ensuring DynamoDB table exists:', error);
    return false;
  }
}

module.exports = { ensureBucketExists, ensureTableExists };
