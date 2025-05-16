const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const multer = require('multer');
const cors = require('cors'); // Import CORS


const app = express();
const port = 3001;
const upload = multer();

app.use(bodyParser.json());

// Enable CORS
app.use(cors());


// AWS Configuration
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});
const s3 = new AWS.S3();
const dynamoDBConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
};

const dynamoDB = new AWS.DynamoDB.DocumentClient(dynamoDBConfig);

// Route for logging events
app.post('/log-event', upload.none(), async (req, res) => {
  const { event } = req.body;
  const file = req.file; // Adjusted to handle file uploads if needed

  // Add detailed logging
  console.log('Received event:', event);
  if (file) {
    console.log('Received file:', file.name);
  } else {
    console.log('No file provided');
  }

  try {
    // Save event to DynamoDB
    const params = {
      TableName: 'DailyLogEvents',
      Item: {
        id: Date.now().toString(),
        event: event || 'No description provided',
        timestamp: new Date().toISOString(),
      },
    };
    console.log('Saving event to DynamoDB:', params);
    await dynamoDB.put(params).promise();

    // Upload file to S3 (if provided)
    if (file) {
      const s3Params = {
        Bucket: 'my-daily-log-files',
        Key: `${params.Item.id}-${file.name}`,
        Body: Buffer.from(file.content, 'base64'),
      };
      console.log('Uploading file to S3:', s3Params);
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
