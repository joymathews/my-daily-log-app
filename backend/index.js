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

// Accept AWS and multer as injectable dependencies for testability
function createApp({ AWSLib = AWS, multerLib = multer } = {}) {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());
  const upload = multerLib();

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

  // Route registration (refactored)
  const deps = {
    authenticateJWT,
    upload,
    dynamoDB,
    s3,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'my-daily-log-files',
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'DailyLogEvents',
    uuidv4
  };
  require('./routes/logEvent')(app, deps);
  require('./routes/viewEvents')(app, deps);
  require('./routes/health')(app, deps);

  return app;
}

// Export only the app factory for Lambda, local server, and tests
module.exports = createApp;
