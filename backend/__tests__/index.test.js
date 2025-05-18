/**
 * Main test file for testing the Express server with mocked AWS services
 * 
 * This suite tests the actual Express application from index.js
 * with AWS services mocked for isolated unit testing.
 */

// Import required modules
const request = require('supertest');
const app = require('../index');

// Test data
const testEvents = [
  {
    id: '1621234567890',
    event: 'Test event 1',
    timestamp: '2025-05-17T12:00:00.000Z'
  },
  {
    id: '1621234567891',
    event: 'Test event 2',
    timestamp: '2025-05-17T12:30:00.000Z'
  }
];

// Mock Date for consistent testing
const FIXED_DATE = new Date('2025-05-17T12:00:00Z');
const FIXED_TIMESTAMP = '1716804000000'; // Equivalent to the above date

// Store the original Date constructor
const OriginalDate = global.Date;
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

// Mock AWS SDK - using moduleFactory pattern to ensure fresh mocks for each test
jest.mock('aws-sdk', () => {
  const mockFn = jest.fn;
  
  return {
    config: { update: mockFn() },
    S3: jest.fn(() => ({
      headBucket: mockFn().mockReturnValue({ 
        promise: mockFn().mockResolvedValue({}) 
      }),
      createBucket: mockFn().mockReturnValue({ 
        promise: mockFn().mockResolvedValue({ Location: '/my-daily-log-files' }) 
      }),
      putBucketAcl: mockFn().mockReturnValue({ 
        promise: mockFn().mockResolvedValue({}) 
      }),
      listBuckets: mockFn().mockReturnValue({
        promise: mockFn().mockResolvedValue({ 
          Buckets: [{ Name: 'my-daily-log-files' }] 
        })
      }),
      upload: mockFn().mockReturnValue({
        promise: mockFn().mockResolvedValue({ 
          Location: 'https://s3.example.com/test-file.txt' 
        })
      })
    })),
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        put: mockFn().mockReturnValue({
          promise: mockFn().mockResolvedValue({})
        }),
        scan: mockFn().mockReturnValue({
          promise: mockFn().mockResolvedValue({ 
            Items: testEvents, 
            Count: testEvents.length 
          })
        })
      }))
    }
  };
});

// Mock console to avoid cluttering test output
console.log = jest.fn();
console.error = jest.fn();

describe('Express Server Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env.S3_BUCKET_NAME = 'my-daily-log-files';
    process.env.DYNAMODB_TABLE_NAME = 'DailyLogEvents';
  });
  
  afterAll(() => {
    // Restore original Date
    global.Date = OriginalDate;
  });

  // Test: Initialize S3 bucket
  test('should ensure S3 bucket exists during initialization', async () => {
    // The test doesn't need to do anything special because
    // the app initialization will call ensureBucketExists automatically
    // We just need to assert that the S3 methods were called as expected
    
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    
    // Verify the headBucket method was called during initialization
    expect(s3.headBucket).toHaveBeenCalled();
  });

  // Test: GET /health endpoint
  test('GET /health should return 200 OK with service status', async () => {
    const response = await request(app).get('/health');
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.services.s3.status).toBe('ok');
    expect(response.body.services.dynamodb.status).toBe('ok');
  });

  // Test: POST /log-event endpoint without file
  test('POST /log-event should store event in DynamoDB without file', async () => {
    const response = await request(app)
      .post('/log-event')
      .send({ event: 'Test event' });
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
    
    // Verify DynamoDB was called
    const AWS = require('aws-sdk');
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    expect(dynamoDB.put).toHaveBeenCalled();
    
    // No file included, so S3 upload should not be called
    const s3 = new AWS.S3();
    expect(s3.upload).not.toHaveBeenCalled();
  });

  // Test: POST /log-event endpoint with file
  test('POST /log-event should store event and upload file to S3', async () => {
    const response = await request(app)
      .post('/log-event')
      .set('x-include-file', 'true') // Tell our mock to include a file
      .send({ event: 'Test event with file' });
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
    
    // Verify DynamoDB and S3 were called
    const AWS = require('aws-sdk');
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    expect(dynamoDB.put).toHaveBeenCalled();
    
    const s3 = new AWS.S3();
    expect(s3.upload).toHaveBeenCalled();
  });

  // Test: GET /view-events endpoint
  test('GET /view-events should return events from DynamoDB', async () => {
    const response = await request(app).get('/view-events');
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.body).toEqual(testEvents);
    
    // Verify DynamoDB was called
    const AWS = require('aws-sdk');
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    expect(dynamoDB.scan).toHaveBeenCalled();
  });
  
  // Test: Handle DynamoDB errors in POST /log-event
  test('POST /log-event should handle DynamoDB errors', async () => {
    // Mock DynamoDB to throw an error
    const AWS = require('aws-sdk');
    const dynamoClient = AWS.DynamoDB.DocumentClient.mock.instances[0];
    dynamoClient.put.mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
    });
    
    // Make the request
    const response = await request(app)
      .post('/log-event')
      .send({ event: 'Test error handling' });
    
    // Verify error handling
    expect(response.status).toBe(500);
    expect(response.text).toBe('Error logging event');
    expect(console.error).toHaveBeenCalled();
  });
  
  // Test: Handle DynamoDB errors in GET /view-events
  test('GET /view-events should handle DynamoDB errors', async () => {
    // Mock DynamoDB to throw an error
    const AWS = require('aws-sdk');
    const dynamoClient = AWS.DynamoDB.DocumentClient.mock.instances[0];
    dynamoClient.scan.mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
    });
    
    // Make the request
    const response = await request(app).get('/view-events');
    
    // Verify error handling
    expect(response.status).toBe(500);
    expect(response.text).toBe('Error fetching events');
    expect(console.error).toHaveBeenCalled();
  });
  
  // Test: Handle S3 errors in POST /log-event
  test('POST /log-event should handle S3 upload errors', async () => {
    // Mock S3 to throw an error
    const AWS = require('aws-sdk');
    const s3Client = AWS.S3.mock.instances[0];
    s3Client.upload.mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('S3 upload error'))
    });
    
    // Make the request
    const response = await request(app)
      .post('/log-event')
      .set('x-include-file', 'true')
      .send({ event: 'Test S3 error handling' });
    
    // Verify error handling
    expect(response.status).toBe(500);
    expect(response.text).toBe('Error logging event');
    expect(console.error).toHaveBeenCalled();
  });
});
