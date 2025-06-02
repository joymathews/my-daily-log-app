const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

module.exports = function(app, deps) {
  const { authenticateJWT, dynamoDB, DYNAMODB_TABLE_NAME, S3_BUCKET_NAME, LOCAL_DEV, S3_ENDPOINT } = deps;

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
      // Add fileUrl if s3Key exists, using LOCAL_DEV and S3_ENDPOINT from deps
      const eventsWithFileUrl = events.map(event => {
        if (event.s3Key) {
          event.fileUrl = LOCAL_DEV === 'true'
            ? `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET_NAME}/${event.s3Key}`
            : `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${event.s3Key}`;
        }
        return event;
      });
      res.status(200).json(eventsWithFileUrl);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).send('Error fetching events');
    }
  });
};
