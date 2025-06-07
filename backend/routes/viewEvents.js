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
        const eventClone = { ...event };
        if (eventClone.s3Key) {
          if (LOCAL_DEV === 'true') {
            eventClone.fileUrl = `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET_NAME}/${eventClone.s3Key}`;
          } else {
            const command = new GetObjectCommand({
              Bucket: S3_BUCKET_NAME,
              Key: eventClone.s3Key
            });
            eventClone.fileUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          }
        }
        return eventClone;
      }));

      res.status(200).json(eventsWithFileUrl);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).send('Error fetching events');
    }
  });

  // New endpoint: Get events for a specific date
  app.get('/view-events-by-date', authenticateJWT, async (req, res) => {
    const userSub = req.user.sub;
    const { date } = req.query; // Expecting 'YYYY-MM-DD'
    if (!date) {
      return res.status(400).json({ error: 'Missing date parameter' });
    }
    try {
      // Calculate start and end ISO strings for the day
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);

      const params = {
        TableName: DYNAMODB_TABLE_NAME,
        IndexName: 'userSub-index',
        KeyConditionExpression: 'userSub = :userSub AND #ts BETWEEN :start AND :end',
        ExpressionAttributeNames: { '#ts': 'timestamp' },
        ExpressionAttributeValues: {
          ':userSub': userSub,
          ':start': start.toISOString(),
          ':end': end.toISOString()
        }
      };

      const data = await dynamoDB.send(new QueryCommand(params));
      const events = Array.isArray(data.Items) ? data.Items : [];

      // File URL logic (same as existing)
      const eventsWithFileUrl = await Promise.all(events.map(async event => {
        const eventClone = { ...event };
        if (eventClone.s3Key) {
          if (LOCAL_DEV === 'true') {
            eventClone.fileUrl = `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET_NAME}/${eventClone.s3Key}`;
          } else {
            const command = new GetObjectCommand({
              Bucket: S3_BUCKET_NAME,
              Key: eventClone.s3Key
            });
            eventClone.fileUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          }
        }
        return eventClone;
      }));

      res.status(200).json(eventsWithFileUrl);
    } catch (error) {
      console.error('Error fetching events by date:', error);
      res.status(500).send('Error fetching events by date');
    }
  });
};
