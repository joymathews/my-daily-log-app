const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

const app = express();
const port = 3001;

app.use(bodyParser.json());

// AWS Configuration
AWS.config.update({
  region: 'us-east-1',
});
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Route for logging events
app.post('/log-event', async (req, res) => {
  const { event, file } = req.body;

  try {
    // Save event to DynamoDB
    const params = {
      TableName: 'DailyLogEvents',
      Item: {
        id: Date.now().toString(),
        event,
        timestamp: new Date().toISOString(),
      },
    };
    await dynamoDB.put(params).promise();

    // Upload file to S3 (if provided)
    if (file) {
      const s3Params = {
        Bucket: 'my-daily-log-files',
        Key: `${params.Item.id}-${file.name}`,
        Body: Buffer.from(file.content, 'base64'),
      };
      await s3.upload(s3Params).promise();
    }

    res.status(200).send('Event logged successfully');
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).send('Error logging event');
  }
});

// Route for viewing events
app.get('/view-events', async (req, res) => {
  try {
    const params = {
      TableName: 'DailyLogEvents',
    };
    const data = await dynamoDB.scan(params).promise();
    res.status(200).json(data.Items);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error fetching events');
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
