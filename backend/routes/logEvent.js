const { v4: uuidv4 } = require('uuid');

module.exports = function(app, deps) {
  const { authenticateJWT, upload, dynamoDB, s3, S3_BUCKET_NAME, DYNAMODB_TABLE_NAME } = deps;

  app.post('/log-event', authenticateJWT, upload.single('file'), async (req, res) => {
    const { event } = req.body;
    const file = req.file;
    const userSub = req.user.sub;

    if (!event && !file) {
      res.status(400).send('Event description or file is required');
      return;
    }

    console.log('Received event:', event);
    if (file) {
      console.log('Received file:', file.originalname);
    } else {
      console.log('No file provided');
    }

    try {
      const params = {
        TableName: DYNAMODB_TABLE_NAME,
        Item: {
          id: uuidv4(),
          event: event || 'No description provided',
          timestamp: new Date().toISOString(),
          userSub
        },
      };
      console.log('Saving event to DynamoDB:', params);
      await dynamoDB.put(params).promise();
      if (file) {
        try {
          const s3Params = {
            Bucket: S3_BUCKET_NAME,
            Key: `${params.Item.id}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype
          };
          console.log('Uploading file to S3:', s3Params);
          const uploadResult = await s3.upload(s3Params).promise();
          console.log('File uploaded successfully:', uploadResult.Location);
        } catch (uploadError) {
          console.error('Error uploading file to S3:', uploadError);
          res.status(500).send('File upload failed');
          return;
        }
      }
      res.status(200).send('Event logged successfully');
    } catch (error) {
      console.error('Error logging event:', error);
      res.status(500).send('Error logging event');
    }
  });
};
