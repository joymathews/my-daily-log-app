require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const multer = require('multer');
const cors = require('cors'); // Import CORS
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // At the top of the file

const app = express();
const port = 3001;

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

// DynamoDB client config and initialization (move this up before ensureTableExists)
const dynamoDBConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
};
const dynamoDB = new AWS.DynamoDB.DocumentClient(dynamoDBConfig);
const dynamoDBAdmin = new AWS.DynamoDB(dynamoDBConfig); // Dedicated admin client

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

// Function to ensure DynamoDB table exists
async function ensureTableExists() {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'userSub', AttributeType: 'S' }, // Add userSub for GSI
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userSub-index',
        KeySchema: [
          { AttributeName: 'userSub', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
  };
  try {
    console.log(`Checking if DynamoDB table ${DYNAMODB_TABLE_NAME} exists...`);
    const tables = await dynamoDBAdmin.listTables().promise();
    if (tables.TableNames.includes(DYNAMODB_TABLE_NAME)) {
      // Check if the GSI exists
      const desc = await dynamoDBAdmin.describeTable({ TableName: DYNAMODB_TABLE_NAME }).promise();
      const gsis = desc.Table.GlobalSecondaryIndexes || [];
      const hasUserSubIndex = gsis.some(idx => idx.IndexName === 'userSub-index');
      if (!hasUserSubIndex) {
        console.warn(`WARNING: Table ${DYNAMODB_TABLE_NAME} exists but is missing userSub-index. Queries by user will fail. Please migrate or recreate the table with the correct index.`);
      } else {
        console.log(`Table ${DYNAMODB_TABLE_NAME} exists and has userSub-index.`);
      }
      return true;
    } else {
      console.log(`Table ${DYNAMODB_TABLE_NAME} doesn't exist. Creating it...`);
      await dynamoDBAdmin.createTable(params).promise();
      await dynamoDBAdmin.waitFor('tableExists', { TableName: DYNAMODB_TABLE_NAME }).promise();
      console.log(`Table ${DYNAMODB_TABLE_NAME} created successfully.`);
      return true;
    }
  } catch (error) {
    console.error('Error ensuring DynamoDB table exists:', error);
    return false;
  }
}

// Only start the server and initialize resources if this file is run directly
if (require.main === module) {
  // Call the function when the server starts
  ensureBucketExists().catch(err => {
    console.error('Failed to initialize S3 bucket:', err);
  });

  ensureTableExists().catch(err => {
    console.error('Failed to initialize DynamoDB table:', err);
  });

  const appInstance = createApp();
  appInstance.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
    console.log(`Environment: \
      AWS_REGION: ${process.env.AWS_REGION || 'us-east-1'}\n      DYNAMODB_ENDPOINT: ${process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'}\n      S3_ENDPOINT: ${process.env.S3_ENDPOINT || 'http://localhost:4566'}\n      S3_BUCKET_NAME: ${S3_BUCKET_NAME}\n      DYNAMODB_TABLE_NAME: ${DYNAMODB_TABLE_NAME}\n    `);
  });
}

// Accept AWS and multer as injectable dependencies for testability
function createApp({ AWSLib = AWS, multerLib = multer } = {}) {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());
  const upload = multerLib();

  // AWS Configuration
  AWSLib.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
    },
  });

  const s3 = new AWSLib.S3({
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:4566',
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
  });
  const dynamoDBConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
    },
  };
  const dynamoDB = new AWSLib.DynamoDB.DocumentClient(dynamoDBConfig);

  // Cognito config for backend verification
  const COGNITO_REGION = process.env.COGNITO_REGION || process.env.AWS_REGION || 'us-east-1';
  const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
  const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

  const client = jwksClient({
    jwksUri: `${COGNITO_ISSUER}/.well-known/jwks.json`
  });

  // Helper function to get the signing key for JWT verification
  function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
      if (err) return callback(err);
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    });
  }

  function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).send('Missing or invalid Authorization header');
      return;
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(
      token,
      getKey,
      {
        issuer: COGNITO_ISSUER,
        audience: process.env.COGNITO_APP_CLIENT_ID // Add audience validation
      },
      (err, decoded) => {
        if (err) {
          res.status(401).send('Invalid token');
          return;
        }
        req.user = decoded;
        next();
      }
    );
  }

  // Route for logging events (add authenticateJWT)
  app.post('/log-event', authenticateJWT, upload.single('file'), async (req, res) => {
    const { event } = req.body;
    const file = req.file; // File will now be processed by multer
    const userSub = req.user.sub; // Cognito user unique id

    // Input validation
    if (!event && !file) {
      res.status(400).send('Event description or file is required');
      return;
    }

    // Add detailed logging
    console.log('Received event:', event);
    if (file) {
      console.log('Received file:', file.originalname);
    } else {
      console.log('No file provided');
    }

    try {
      // Save event to DynamoDB
      const params = {
        TableName: DYNAMODB_TABLE_NAME,
        Item: {
          id: uuidv4(), // Use UUID for event ID
          event: event || 'No description provided',
          timestamp: new Date().toISOString(),
          userSub // Store user identity
        },
      };
      console.log('Saving event to DynamoDB:', params);
      await dynamoDB.put(params).promise();
      // Upload file to S3 (if provided)
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
          // Do not leak internal error details to client
          res.status(500).send('File upload failed');
          return;
        }
      }
      res.status(200).send('Event logged successfully');
    } catch (error) {
      console.error('Error logging event:', error);
      // Do not leak internal error details to client
      res.status(500).send('Error logging event');
    }
  });

  // Route for viewing events (add authenticateJWT)
  app.get('/view-events', authenticateJWT, async (req, res) => {
    const userSub = req.user.sub;
    try {
      const params = {
        TableName: DYNAMODB_TABLE_NAME,
        IndexName: 'userSub-index',
        KeyConditionExpression: 'userSub = :userSub',
        ExpressionAttributeValues: { ':userSub': userSub }
      };
      const data = await dynamoDB.query(params).promise();
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

  return app;
}

// Export for testing
module.exports = createApp;
