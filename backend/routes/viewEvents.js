const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { apiLimiter, ipLimiter } = require('../middleware/rateLimiter');

module.exports = function(app, deps) {
  const { authenticateJWT, dynamoDB, DYNAMODB_TABLE_NAME, S3_BUCKET_NAME, LOCAL_DEV, S3_ENDPOINT, s3 } = deps;

  // Dual rate limiting: ipLimiter blocks floods/DoS before auth (satisfies CodeQL),
  // apiLimiter enforces fair per-user limits after auth (req.user.sub available)
  // This order is important for both security and compliance.
  app.get('/view-events',
    ipLimiter,                // IP-based, pre-auth, blocks DoS and satisfies security scanners
    authenticateJWT,          // Sets req.user.sub for per-user limiting
    apiLimiter,               // Per-user (JWT sub) or fallback to IP
    async (req, res) => {
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
        res.status(500).json({ error: 'Error fetching events' });
      }
    }
  );

  app.get('/view-events-by-date',
    ipLimiter,                // IP-based, pre-auth, blocks DoS and satisfies security scanners
    authenticateJWT,          // Sets req.user.sub for per-user limiting
    apiLimiter,               // Per-user (JWT sub) or fallback to IP
    async (req, res) => {
      const userSub = req.user.sub;
      const { date } = req.query; // Expecting 'YYYY-MM-DD'
      if (!date) {
        return res.status(400).json({ error: 'Missing date parameter' });
      }
      try {
        // Calculate start and end ISO strings for the day in UTC
        const start = new Date(`${date}T00:00:00Z`);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // next day 00:00:00Z

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
        res.status(500).json({ error: 'Error fetching events by date' });
      }
    }
  );

  app.get('/event-dates',
    ipLimiter,                // IP-based, pre-auth, blocks DoS and satisfies security scanners
    authenticateJWT,          // Sets req.user.sub for per-user limiting
    apiLimiter,               // Per-user (JWT sub) or fallback to IP
    async (req, res) => {
      const userSub = req.user.sub;
      try {
        const params = {
          TableName: DYNAMODB_TABLE_NAME,
          IndexName: 'userSub-index',
          KeyConditionExpression: 'userSub = :userSub',
          ExpressionAttributeValues: { ':userSub': userSub },
          ProjectionExpression: '#ts',
          ExpressionAttributeNames: { '#ts': 'timestamp' }
        };
        const data = await dynamoDB.send(new QueryCommand(params));
        const events = Array.isArray(data.Items) ? data.Items : [];
        // Extract unique dates (YYYY-MM-DD)
        const dateSet = new Set(events.map(e => e.timestamp.slice(0, 10)));
        res.json(Array.from(dateSet));
      } catch (error) {
        console.error('Error fetching event dates:', error);
        res.status(500).json({ error: 'Error fetching event dates' });
      }
    }
  );
};
