const { HeadBucketCommand } = require('@aws-sdk/client-s3');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

module.exports = function(app, deps) {
  const { s3, dynamoDB, S3_BUCKET_NAME, DYNAMODB_TABLE_NAME } = deps;

  app.get('/health', async (req, res) => {
    try {
      const services = {
        s3: { status: 'unknown' },
        dynamodb: { status: 'unknown' }
      };
      try {
        // Check if the specific S3 bucket exists using HeadBucketCommand (requires fewer permissions)
        await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET_NAME }));
        services.s3 = {
          status: 'ok',
          bucket: S3_BUCKET_NAME
        };
      } catch (error) {
        services.s3 = {
          status: 'error',
          error: error && error.message ? error.message : String(error)
        };
      }
      try {
        const dynamoResult = await dynamoDB.send(new ScanCommand({ TableName: DYNAMODB_TABLE_NAME, Limit: 1 }));
        services.dynamodb = {
          status: 'ok',
          itemCount: typeof dynamoResult.Count === 'number' ? dynamoResult.Count : 0
        };
      } catch (error) {
        services.dynamodb = {
          status: 'error',
          error: error && error.message ? error.message : String(error)
        };
      }
      const overallStatus = Object.values(services).every(s => s.status === 'ok') ? 200 : 503;
      res.status(overallStatus).json({
        status: overallStatus === 200 ? 'ok' : 'degraded',
        services,
        environment: {
          AWS_REGION: require('../config').AWS_REGION,
          DYNAMODB_ENDPOINT: require('../config').DYNAMODB_ENDPOINT,
          S3_ENDPOINT: require('../config').S3_ENDPOINT,
          S3_BUCKET_NAME,
          DYNAMODB_TABLE_NAME
        }
      });
    } catch (error) {
      res.status(500).json({ status: 'error', error: error.message });
    }
  });
};
