module.exports = function(app, deps) {
  const { s3, dynamoDB, S3_BUCKET_NAME, DYNAMODB_TABLE_NAME } = deps;

  app.get('/health', async (req, res) => {
    try {
      const services = {
        s3: { status: 'unknown' },
        dynamodb: { status: 'unknown' }
      };
      try {
        const s3Result = await s3.listBuckets().promise();
        services.s3 = {
          status: 'ok',
          buckets: s3Result.Buckets.map(b => b.Name)
        };
      } catch (error) {
        services.s3 = {
          status: 'error',
          error: error.message
        };
      }
      try {
        const dynamoResult = await dynamoDB.scan({ TableName: DYNAMODB_TABLE_NAME, Limit: 1 }).promise();
        services.dynamodb = {
          status: 'ok',
          itemCount: dynamoResult.Count
        };
      } catch (error) {
        services.dynamodb = {
          status: 'error',
          error: error.message
        };
      }
      const overallStatus = Object.values(services).every(s => s.status === 'ok') ? 200 : 503;
      res.status(overallStatus).json({
        status: overallStatus === 200 ? 'ok' : 'degraded',
        services,
        environment: {
          AWS_REGION: process.env.AWS_REGION || 'us-east-1',
          DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
          S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://localhost:4566',
          S3_BUCKET_NAME,
          DYNAMODB_TABLE_NAME
        }
      });
    } catch (error) {
      res.status(500).json({ status: 'error', error: error.message });
    }
  });
};
