/**
 * Tests for the log-event API endpoint
 * 
 * This test suite verifies that:
 * 1. Events are correctly logged to DynamoDB
 * 2. Files are properly uploaded to S3
 * 3. The API handles errors appropriately 
 * 4. The API works properly with and without file attachments
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { testData } = require('./utils/test-utils');

// Mock the date functions to ensure consistent test results
const FIXED_DATE = new Date('2025-05-17T12:00:00Z');
const FIXED_TIMESTAMP = '1716804000000'; // Equivalent to the above date
const originalDate = global.Date;
global.Date = class extends Date {
  constructor() {
    if (arguments.length === 0) {
      super(FIXED_DATE);
    } else {
      super(...arguments);
    }
  }
  
  static now() {
    return FIXED_DATE.getTime();
  }
  
  toISOString() {
    return FIXED_DATE.toISOString();
  }
};

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  // We'll customize these for each test
  let mockS3 = {
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Location: 'https://s3.example.com/file.txt' })
    })
  };
  
  let mockDocumentClient = {
    put: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  };
  
  return {
    config: { update: jest.fn() },
    S3: jest.fn(() => mockS3),
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocumentClient)
    },
    // Functions to help us change the mock behavior in tests
    __setS3Mock: (mock) => { mockS3 = mock; },
    __setDynamoDBMock: (mock) => { mockDocumentClient = mock; }
  };
});

// Mock multer middleware for file uploads
jest.mock('multer', () => {
  return () => ({
    single: (fieldName) => (req, res, next) => {
      if (req.headers['x-include-file'] === 'true') {
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

// Mock console to avoid cluttering test output
console.log = jest.fn();
console.error = jest.fn();

describe('POST /log-event API Endpoint', () => {
  let app;
  let AWS;
  
  beforeEach(() => {
    // Get the mocked AWS module
    AWS = require('aws-sdk');
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(bodyParser.json());
    
    // Configure multer for file uploads
    const multer = require('multer');
    const upload = multer();
    
    // Configure the route (simplified version of what's in index.js)
    app.post('/log-event', upload.single('file'), async (req, res) => {
      const { event } = req.body;
      const file = req.file;
    
      try {
        // Save event to DynamoDB
        const params = {
          TableName: process.env.DYNAMODB_TABLE_NAME || 'DailyLogEvents',
          Item: {
            id: Date.now().toString(),
            event: event || 'No description provided',
            timestamp: new Date().toISOString(),
          },
        };
        
        const dynamoDB = new AWS.DynamoDB.DocumentClient();
        await dynamoDB.put(params).promise();
        
        // Upload file to S3 (if provided)
        if (file) {
          const s3 = new AWS.S3();
          const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME || 'my-daily-log-files',
            Key: `${params.Item.id}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype
          };
          
          await s3.upload(s3Params).promise();
        }
    
        res.status(200).send('Event logged successfully');
      } catch (error) {
        console.error('Error logging event:', error);
        res.status(500).send('Error logging event');
      }
    });
    
    // Set environment variables for testing
    process.env.S3_BUCKET_NAME = 'my-daily-log-files';
    process.env.DYNAMODB_TABLE_NAME = 'DailyLogEvents';
  });
  
  afterAll(() => {
    // Restore original Date
    global.Date = originalDate;
  });

  /**
   * Test case: Verifies events can be logged without file attachments
   */
  test('should log event without file attachment', async () => {
    // Make a request without a file
    const response = await request(app)
      .post('/log-event')
      .send({ event: 'Test event without file' });
    
    // Assert response
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
    
    // Assert DynamoDB was called with the right parameters
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    expect(dynamoDB.put).toHaveBeenCalledWith({
      TableName: 'DailyLogEvents',
      Item: {
        id: FIXED_TIMESTAMP,
        event: 'Test event without file',
        timestamp: FIXED_DATE.toISOString()
      }
    });
    
    // Assert S3 was not called
    const s3 = new AWS.S3();
    expect(s3.upload).not.toHaveBeenCalled();
  });

  /**
   * Test case: Verifies events can be logged with file attachments
   */
  test('should log event with file attachment', async () => {
    // Make a request with a file
    const response = await request(app)
      .post('/log-event')
      .set('x-include-file', 'true') // Tell our mock to include a file
      .send({ event: 'Test event with file' });
    
    // Assert response
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
    
    // Assert DynamoDB was called correctly
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    expect(dynamoDB.put).toHaveBeenCalled();
    
    // Assert S3 was called with the right parameters
    const s3 = new AWS.S3();
    expect(s3.upload).toHaveBeenCalledWith({
      Bucket: 'my-daily-log-files',
      Key: expect.stringContaining('-test-file.txt'),
      Body: expect.any(Buffer),
      ContentType: 'text/plain'
    });
  });

  /**
   * Test case: Verifies API handles DynamoDB errors correctly
   */
  test('should handle DynamoDB errors', async () => {
    // Mock DynamoDB to fail
    AWS.__setDynamoDBMock({
      put: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
      })
    });
    
    // Make request
    const response = await request(app)
      .post('/log-event')
      .send({ event: 'Test event with error' });
    
    // Assert response
    expect(response.status).toBe(500);
    expect(response.text).toBe('Error logging event');
    expect(console.error).toHaveBeenCalled();
  });

  /**
   * Test case: Verifies API handles S3 upload errors correctly
   */
  test('should handle S3 upload errors', async () => {
    // Mock S3 to fail
    AWS.__setS3Mock({
      upload: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('S3 upload error'))
      })
    });
    
    // Make request with a file
    const response = await request(app)
      .post('/log-event')
      .set('x-include-file', 'true')
      .send({ event: 'Test event with file error' });
    
    // Assert response
    expect(response.status).toBe(500);
    expect(response.text).toBe('Error logging event');
    expect(console.error).toHaveBeenCalled();
  });
});
