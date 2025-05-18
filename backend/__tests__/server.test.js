/**
 * Simple unit tests for the Express server with mocked AWS services
 */
const request = require('supertest');

// Sample test events
const testEvents = [
  { id: '1621234567890', event: 'Test event 1', timestamp: '2025-05-17T12:00:00.000Z' },
  { id: '1621234567891', event: 'Test event 2', timestamp: '2025-05-17T12:30:00.000Z' }
];

// Mock Date for consistent testing
const FIXED_DATE = new Date('2025-05-17T12:00:00Z');
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
  // Mock S3 service
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
    listBuckets: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ 
        Buckets: [{ Name: 'my-daily-log-files' }] 
      })
    }),
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Location: 'https://s3.example.com/test.txt' })
    })
  };

  // Mock DynamoDB DocumentClient
  const mockDocumentClient = {
    put: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    scan: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ 
        Items: testEvents, 
        Count: testEvents.length 
      })
    })
  };

  return {
    config: {
      update: jest.fn()
    },
    S3: jest.fn(() => mockS3),
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocumentClient)
    }
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

// Mock console to reduce noise in test output
console.log = jest.fn();
console.error = jest.fn();

describe('Express Server', () => {
  let app;
  let server;
  
  beforeAll(() => {
    // Import the app after mocks are set up
    jest.resetModules();
    app = require('../index');
    // app is exported directly as the Express application
  });
  
  afterAll(() => {
    // Restore original Date
    global.Date = originalDate;
    jest.restoreAllMocks();
  });

  /**
   * Test case: verify the health endpoint works correctly
   */
  test('GET /health should return 200 OK with service status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.services.s3.status).toBe('ok');
  });

  /**
   * Test case: verify the log-event endpoint works without a file
   */
  test('POST /log-event should store event without file', async () => {
    const response = await request(app)
      .post('/log-event')
      .send({ event: 'Test event' });
    
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
  });
  
  /**
   * Test case: verify the log-event endpoint works with a file
   */
  test('POST /log-event should store event with file', async () => {
    const response = await request(app)
      .post('/log-event')
      .set('x-include-file', 'true')
      .send({ event: 'Test event with file' });
    
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
  });
  
  /**
   * Test case: verify the view-events endpoint works correctly
   */
  test('GET /view-events should return events', async () => {
    const response = await request(app).get('/view-events');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
  });
});
