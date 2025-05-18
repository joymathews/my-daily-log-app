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

// Configure S3 to use LocalStack
const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:4566',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

// Define constants for resource names
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'my-daily-log-files';
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'DailyLogEvents';

// Function to ensure S3 bucket exists
async function ensureBucketExists() {
  try {
    console.log(`Checking if bucket ${S3_BUCKET_NAME} exists...`);
    
    // Try to get the bucket
    try {
      await s3.headBucket({ Bucket: S3_BUCKET_NAME }).promise();
      console.log(`Bucket ${S3_BUCKET_NAME} exists.`);
      return true; // Bucket exists
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`Bucket ${S3_BUCKET_NAME} doesn't exist. Creating it...`);
        
        // Create the bucket
        await s3.createBucket({ 
          Bucket: S3_BUCKET_NAME 
        }).promise();
        
        // Set public read access
        await s3.putBucketAcl({
          Bucket: S3_BUCKET_NAME,
          ACL: 'public-read'
        }).promise();
        
        console.log(`Bucket ${S3_BUCKET_NAME} created successfully.`);
        return true;
      } else {
        console.error('Error checking bucket existence:', error);
        return false;
      }
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    return false;
  }
}

// Call the function when the server starts
ensureBucketExists().catch(err => {
  console.error('Failed to initialize S3 bucket:', err);
});

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
app.post('/log-event', upload.single('file'), async (req, res) => {
  const { event } = req.body;
  const file = req.file; // File will now be processed by multer

  // Add detailed logging
  console.log('Received event:', event);
  if (file) {
    console.log('Received file:', file.originalname);
  } else {
    console.log('No file provided');
  }

  try {    // Save event to DynamoDB
    const params = {
      TableName: DYNAMODB_TABLE_NAME,
      Item: {
        id: Date.now().toString(),
        event: event || 'No description provided',
        timestamp: new Date().toISOString(),
      },
    };
    console.log('Saving event to DynamoDB:', params);
    await dynamoDB.put(params).promise();    // Upload file to S3 (if provided)
    if (file) {
      try {
        // The bucket existence is already checked during server initialization
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
        throw new Error(`File upload failed: ${uploadError.message}`);
      }
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
      TableName: DYNAMODB_TABLE_NAME,
    };
    const data = await dynamoDB.scan(params).promise();
    res.status(200).json(data.Items);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send('Error fetching events');
  }
});

// Health check endpoint that verifies S3 and DynamoDB connections
app.get('/health', async (req, res) => {
  try {
    const services = {
      s3: { status: 'unknown' },
      dynamodb: { status: 'unknown' }
    };
    
    // Check S3
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
      // Check DynamoDB
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
    
    // Overall status
    const overallStatus = Object.values(services).every(s => s.status === 'ok') ? 200 : 503;
    
    res.status(overallStatus).json({
      status: overallStatus === 200 ? 'ok' : 'degraded',
      services,      environment: {
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

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
    console.log(`Environment: 
      AWS_REGION: ${process.env.AWS_REGION || 'us-east-1'}
      DYNAMODB_ENDPOINT: ${process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'}
      S3_ENDPOINT: ${process.env.S3_ENDPOINT || 'http://localhost:4566'}
      S3_BUCKET_NAME: ${S3_BUCKET_NAME}
      DYNAMODB_TABLE_NAME: ${DYNAMODB_TABLE_NAME}
    `);
  });
}

// Export for testing
module.exports = app;
