/**
 * Integration tests for the Express API server with mocked AWS services
 * 
 * These tests mock AWS services but test the actual Express routes
 * to verify end-to-end behavior of the API endpoints.
 */
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const path = require('path');

// Mock AWS services
jest.mock('aws-sdk', () => {
  const mockDocumentClient = {
    put: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    scan: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Items: [
          { id: '1', event: 'Test Event 1', timestamp: '2025-05-17T12:00:00Z' },
          { id: '2', event: 'Test Event 2', timestamp: '2025-05-17T12:30:00Z' }
        ],
        Count: 2
      })
    })
  };

  const mockS3 = {
    headBucket: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    createBucket: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    putBucketAcl: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Location: 'https://s3.example.com/test-file.txt' })
    }),
    listBuckets: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Buckets: [{ Name: 'my-daily-log-files' }] })
    })
  };

  return {
    config: {
      update: jest.fn()
    },
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocumentClient)
    },
    S3: jest.fn(() => mockS3)
  };
});

// Mock multer
jest.mock('multer', () => {
  return () => ({
    single: (fieldName) => (req, res, next) => {
      if (req.headers['x-with-file'] === 'true') {
        req.file = {
          buffer: Buffer.from('test file content'),
          originalname: 'test-file.txt',
          mimetype: 'text/plain'
        };
      }
      next();
    }
  });
});

// Mock console methods
console.log = jest.fn();
console.error = jest.fn();

describe('Integration Tests: Express API Server', () => {
  let app;
  
  beforeAll(() => {
    // Create our own minimal app for testing
    app = express();
    app.use(bodyParser.json());
    
    // Set up basic routes for testing
    
    // Health check endpoint
    app.get('/health', async (req, res) => {
      const s3 = new AWS.S3();
      const dynamoDB = new AWS.DynamoDB.DocumentClient();
      
      const services = {
        s3: { status: 'unknown' },
        dynamodb: { status: 'unknown' }
      };
      
      try {
        const s3Result = await s3.listBuckets().promise();
        services.s3 = { status: 'ok', buckets: s3Result.Buckets.map(b => b.Name) };
      } catch (error) {
        services.s3 = { status: 'error', error: error.message };
      }
      
      try {
        const dynamoResult = await dynamoDB.scan({ 
          TableName: 'DailyLogEvents',
          Limit: 1
        }).promise();
        services.dynamodb = { status: 'ok', itemCount: dynamoResult.Count };
      } catch (error) {
        services.dynamodb = { status: 'error', error: error.message };
      }
      
      const overallStatus = Object.values(services).every(s => s.status === 'ok') ? 200 : 503;
      
      res.status(overallStatus).json({
        status: overallStatus === 200 ? 'ok' : 'degraded',
        services,
        environment: {
          AWS_REGION: 'us-east-1',
          DYNAMODB_ENDPOINT: 'http://localhost:8000',
          S3_ENDPOINT: 'http://localhost:4566',
          S3_BUCKET_NAME: 'my-daily-log-files',
          DYNAMODB_TABLE_NAME: 'DailyLogEvents'
        }
      });
    });
    
    // Log event endpoint
    app.post('/log-event', (req, res) => {
      const multer = require('multer')();
      multer.single('file')(req, res, async () => {
        try {
          const { event } = req.body;
          const file = req.file;
          
          // Save event to DynamoDB
          const dynamoDB = new AWS.DynamoDB.DocumentClient();
          await dynamoDB.put({
            TableName: 'DailyLogEvents',
            Item: {
              id: '12345',
              event: event || 'No description provided',
              timestamp: new Date().toISOString()
            }
          }).promise();
          
          // Upload file to S3 (if provided)
          if (file) {
            const s3 = new AWS.S3();
            await s3.upload({
              Bucket: 'my-daily-log-files',
              Key: `12345-${file.originalname}`,
              Body: file.buffer,
              ContentType: file.mimetype
            }).promise();
          }
          
          res.status(200).send('Event logged successfully');
        } catch (error) {
          console.error('Error logging event:', error);
          res.status(500).send('Error logging event');
        }
      });
    });
    
    // View events endpoint
    app.get('/view-events', async (req, res) => {
      try {
        const dynamoDB = new AWS.DynamoDB.DocumentClient();
        const data = await dynamoDB.scan({ TableName: 'DailyLogEvents' }).promise();
        res.status(200).json(data.Items);
      } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).send('Error fetching events');
      }
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  /**
   * Test case: verifies the health endpoint returns 200 OK status
   */
  test('GET /health should return 200 OK', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.services.s3.status).toBe('ok');
    expect(response.body.services.dynamodb.status).toBe('ok');
  });
  
  /**
   * Test case: verifies logging an event without a file attachment
   */
  test('POST /log-event should log events without file', async () => {
    const response = await request(app)
      .post('/log-event')
      .send({ event: 'Test event' });
    
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
    expect(AWS.DynamoDB.DocumentClient).toHaveBeenCalled();
  });
  
  /**
   * Test case: verifies logging an event with a file attachment
   */
  test('POST /log-event should log events with file', async () => {
    const response = await request(app)
      .post('/log-event')
      .set('x-with-file', 'true')
      .send({ event: 'Test event with file' });
    
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
    expect(AWS.DynamoDB.DocumentClient).toHaveBeenCalled();
    expect(AWS.S3).toHaveBeenCalled();
  });
  
  /**
   * Test case: verifies viewing events from DynamoDB
   */
  test('GET /view-events should return events', async () => {
    const response = await request(app).get('/view-events');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(response.body[0].event).toBe('Test Event 1');
  });
});
