const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

module.exports = function(app, deps) {
  const { authenticateJWT, dynamoDB, DYNAMODB_TABLE_NAME, S3_BUCKET_NAME, LOCAL_DEV, S3_ENDPOINT, s3 } = deps;

  app.get('/view-events', authenticateJWT, async (req, res) => {
    const userSub = req.user.sub;
    try {
      const params = {
        TableName: DYNAMODB_TABLE_NAME,
        IndexName: 'userSub-index',
        KeyConditionExpression: 'userSub = :userSub',
        ExpressionAttributeValues: { ':userSub': userSub }
      };
      const data = await dynamoDB.send(new QueryCommand(params));
      const events = Array.isArray(data.Items) ? data.Items : [];

      // For local dev, use direct URL; for prod, use pre-signed URL
      const eventsWithFileUrl = await Promise.all(events.map(async event => {
        if (event.s3Key) {
          if (LOCAL_DEV === 'true') {
            event.fileUrl = `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET_NAME}/${event.s3Key}`;
          } else {
            const command = new GetObjectCommand({
              Bucket: S3_BUCKET_NAME,
              Key: event.s3Key
            });
            event.fileUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          }
        }
        return event;
      }));

      res.status(200).json(eventsWithFileUrl);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).send('Error fetching events');
    }
  });
};
