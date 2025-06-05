const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const { S3_BUCKET_NAME, DYNAMODB_TABLE_NAME, COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_APP_CLIENT_ID, CORS_ORIGIN, LOCAL_DEV, S3_ENDPOINT } = require('./config');
const { createAwsClients } = require('./aws-factory');

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(cors({ origin: CORS_ORIGIN }));

function createApp({ } = {}) {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors({ origin: CORS_ORIGIN }));
  // Explicitly use memoryStorage for multer
  const upload = multer({ storage: multer.memoryStorage() });

  // Use v3 AWS clients
  const { s3, dynamoDB } = createAwsClients();

  const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
  const client = jwksClient({
    jwksUri: `${COGNITO_ISSUER}/.well-known/jwks.json`
  });

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
        audience: COGNITO_APP_CLIENT_ID
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

  /**
   * Dependencies injected into route modules:
   * @property {function} authenticateJWT - Middleware for verifying JWT tokens using AWS Cognito.
   * @property {object} upload - Multer middleware instance for handling file uploads.
   * @property {object} dynamoDB - AWS DynamoDB DocumentClient for database operations.
   * @property {object} s3 - AWS S3 client for file storage operations.
   * @property {string} S3_BUCKET_NAME - Name of the S3 bucket used for file uploads.
   * @property {string} DYNAMODB_TABLE_NAME - Name of the DynamoDB table for log events.
   */
  const deps = {
    authenticateJWT,
    upload,
    dynamoDB,
    s3,
    S3_BUCKET_NAME,
    DYNAMODB_TABLE_NAME,
    LOCAL_DEV,
    S3_ENDPOINT
  };
  require('./routes/logEvent')(app, deps);
  require('./routes/viewEvents')(app, deps);
  require('./routes/health')(app, deps);

  return app;
}

module.exports = createApp;
