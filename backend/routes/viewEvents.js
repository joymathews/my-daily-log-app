const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

module.exports = function(app, deps) {
  const { authenticateJWT, dynamoDB, DYNAMODB_TABLE_NAME } = deps;

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
      res.status(200).json(Array.isArray(data.Items) ? data.Items : []);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).send('Error fetching events');
    }
  });
};
