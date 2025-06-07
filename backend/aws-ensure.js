const { S3Client, HeadBucketCommand, CreateBucketCommand, PutBucketAclCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, ListTablesCommand, DescribeTableCommand, CreateTableCommand, WaiterState, waitUntilTableExists } = require('@aws-sdk/client-dynamodb');
const { S3_BUCKET_NAME, DYNAMODB_TABLE_NAME, AWS_REGION, DYNAMODB_ENDPOINT, S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, LOCAL_DEV } = require('./config');

function isLocalEnv() {
  return LOCAL_DEV === 'true';
}

const sharedConfig = {
  region: AWS_REGION,
};
if (isLocalEnv()) {
  sharedConfig.credentials = {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  };
}

const s3 = new S3Client({ ...sharedConfig, endpoint: S3_ENDPOINT, forcePathStyle: true });
const dynamoDBAdmin = new DynamoDBClient({ ...sharedConfig, endpoint: DYNAMODB_ENDPOINT });

async function ensureBucketExists() {
  try {
    console.log(`Checking if bucket ${S3_BUCKET_NAME} exists...`);
    try {
      await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET_NAME }));
      console.log(`Bucket ${S3_BUCKET_NAME} exists.`);
      return true;
    } catch (error) {
      if (error.$metadata && error.$metadata.httpStatusCode === 404) {
        console.log(`Bucket ${S3_BUCKET_NAME} doesn't exist. Creating it...`);
        await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET_NAME }));
        await s3.send(new PutBucketAclCommand({ Bucket: S3_BUCKET_NAME, ACL: 'public-read' }));
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
      { AttributeName: 'timestamp', AttributeType: 'S' }, // Add timestamp attribute
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userSub-index',
        KeySchema: [
          { AttributeName: 'userSub', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' }, // Add timestamp as sort key
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  };
  try {
    console.log(`Checking if DynamoDB table ${DYNAMODB_TABLE_NAME} exists...`);
    const tables = await dynamoDBAdmin.send(new ListTablesCommand({}));
    if (tables.TableNames.includes(DYNAMODB_TABLE_NAME)) {
      const desc = await dynamoDBAdmin.send(new DescribeTableCommand({ TableName: DYNAMODB_TABLE_NAME }));
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
      await dynamoDBAdmin.send(new CreateTableCommand(params));
      await waitUntilTableExists({ client: dynamoDBAdmin, maxWaitTime: 60 }, { TableName: DYNAMODB_TABLE_NAME });
      console.log(`Table ${DYNAMODB_TABLE_NAME} created successfully.`);
      return true;
    }
  } catch (error) {
    console.error('Error ensuring DynamoDB table exists:', error);
    return false;
  }
}

module.exports = { ensureBucketExists, ensureTableExists };
