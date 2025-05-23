/**
 * Integration tests for the Express API server with mocked AWS services
 * 
 * These tests mock AWS services but test the actual Express routes
 * to verify end-to-end behavior of the API endpoints.
 */
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

// Mock JWT verification middleware for tests
jest.mock('jsonwebtoken', () => ({
  verify: (token, getKey, options, callback) => {
    // Always succeed and return a mock user
    callback(null, { sub: 'test-user-sub', username: 'testuser' });
  },
}));

const request = require('supertest');
const AWS = require('aws-sdk');
const createApp = require('../index');

// Mock console methods
console.log = jest.fn();
console.error = jest.fn();

describe('API Unit Tests (using real app)', () => {
  let app;

  beforeEach(() => {
    app = createApp({ AWSLib: AWS, multerLib: require('multer') });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.services.s3.status).toBe('ok');
    expect(response.body.services.dynamodb.status).toBe('ok');
  });

  test('POST /log-event should log events without file', async () => {
    const response = await request(app)
      .post('/log-event')
      .set('Authorization', 'Bearer test.jwt.token')
      .send({ event: 'Test event' });
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
  });

  test('POST /log-event should log events with file', async () => {
    const response = await request(app)
      .post('/log-event')
      .set('Authorization', 'Bearer test.jwt.token')
      .set('x-with-file', 'true')
      .send({ event: 'Test event with file' });
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
  });

  test('GET /view-events should return events', async () => {
    const response = await request(app)
      .get('/view-events')
      .set('Authorization', 'Bearer test.jwt.token');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(response.body[0].event).toBe('Test Event 1');
  });

  test('GET /view-events should return empty array when no events exist', async () => {
    AWS.DynamoDB.DocumentClient.mockImplementationOnce(() => ({
      scan: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Items: [], Count: 0 })
      })
    }));
    app = createApp({ AWSLib: AWS, multerLib: require('multer') });
    const response = await request(app)
      .get('/view-events')
      .set('Authorization', 'Bearer test.jwt.token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('GET /view-events should handle DynamoDB errors', async () => {
    AWS.DynamoDB.DocumentClient.mockImplementationOnce(() => ({
      scan: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB failure'))
      })
    }));
    app = createApp({ AWSLib: AWS, multerLib: require('multer') });
    const response = await request(app)
      .get('/view-events')
      .set('Authorization', 'Bearer test.jwt.token');
    expect(response.status).toBe(500);
    expect(response.text).toBe('Error fetching events');
    expect(console.error).toHaveBeenCalled();
  });
});
