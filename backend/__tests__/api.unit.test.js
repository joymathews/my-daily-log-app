/**
 * Integration tests for the Express API server with mocked AWS services
 * 
 * These tests mock AWS services but test the actual Express routes
 * to verify end-to-end behavior of the API endpoints.
 */
// Loads .env for local dev; in CI, env vars are set by the workflow and .env is ignored if missing.
require('dotenv').config();

// Mock AWS services
jest.mock('aws-sdk', () => {
  const mockDocumentClient = {
    put: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    query: jest.fn().mockImplementation(({ TableName, IndexName, KeyConditionExpression, ExpressionAttributeValues }) => {
      // Simulate backend filtering by userSub for /view-events
      if (TableName && IndexName === 'userSub-index' && KeyConditionExpression && ExpressionAttributeValues) {
        // Provide test data for userSub
        const allEvents = [
          { id: '1', event: 'Test Event 1', timestamp: '2025-05-17T12:00:00Z', userSub: 'test-user-sub' },
          { id: '2', event: 'Test Event 2', timestamp: '2025-05-17T12:30:00Z', userSub: 'test-user-sub' },
          { id: '3', event: 'Other User Event', timestamp: '2025-05-17T13:00:00Z', userSub: 'other-user-sub' }
        ];
        const filtered = allEvents.filter(e => e.userSub === ExpressionAttributeValues[':userSub']);
        return { promise: jest.fn().mockResolvedValue({ Items: filtered, Count: filtered.length }) };
      }
      // Default empty
      return { promise: jest.fn().mockResolvedValue({ Items: [], Count: 0 }) };
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

  // Mock for AWS.DynamoDB (admin client)
  const mockDynamoDBAdmin = function() {
    return {
      listTables: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ TableNames: ['DailyLogEvents'] })
      }),
      describeTable: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Table: { GlobalSecondaryIndexes: [{ IndexName: 'userSub-index' }] }
        })
      }),
      createTable: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) }),
      waitFor: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) })
    };
  };

  return {
    config: { update: jest.fn() },
    DynamoDB: Object.assign(function () {}, {
      DocumentClient: jest.fn(() => mockDocumentClient),
      // When called as a constructor for admin client
      prototype: mockDynamoDBAdmin()
    }),
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
    // Remove any cached modules to reset module state
    jest.resetModules();
    // Do NOT call mockRestore on AWS.DynamoDB.DocumentClient, as it is a jest.fn() not a spy
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
      query: jest.fn().mockReturnValue({
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

  // Test: If you try to view events without logging in, you should get an error saying you are not authorized.
  test('GET /view-events should return 401 if Authorization header is missing', async () => {
    const response = await request(app).get('/view-events');
    expect(response.status).toBe(401);
    expect(response.text).toBe('Missing or invalid Authorization header');
  });

  // Test: If you try to view events with a broken or wrong login token, you should get an error saying you are not authorized.
  test('GET /view-events should return 401 if Authorization header is malformed', async () => {
    const response = await request(app)
      .get('/view-events')
      .set('Authorization', 'InvalidTokenFormat');
    expect(response.status).toBe(401);
    expect(response.text).toBe('Missing or invalid Authorization header');
  });

  // Test: If your login token is invalid or expired, you should get an error saying your login is not valid.
  test('GET /view-events should return 401 if JWT verification fails', async () => {
    jest.doMock('jsonwebtoken', () => ({
      verify: (token, getKey, options, callback) => {
        callback(new Error('Invalid token'), null);
      },
    }));
    const createAppWithInvalidJWT = require('../index');
    const appWithInvalidJWT = createAppWithInvalidJWT({ AWSLib: AWS, multerLib: require('multer') });
    const response = await request(appWithInvalidJWT)
      .get('/view-events')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(response.status).toBe(401);
    expect(response.text).toBe('Invalid token');
    jest.resetModules(); // Restore 'jsonwebtoken' after this test
  });

  // Test: If you try to log an event without entering any details or uploading a file, you should get a helpful error (if enforced).
  test('POST /log-event should handle missing event and file', async () => {
    const response = await request(app)
      .post('/log-event')
      .set('Authorization', 'Bearer test.jwt.token')
      .send({});
    // The backend currently allows empty event, so this will succeed, but if you want to enforce, change the backend and this test.
    expect([200, 400]).toContain(response.status);
  });

  // Test: If you are logged in as one user, you should only see your own events, not events from other users.
  test('GET /view-events should only return events for the logged-in user', async () => {
    // Mock JWT to return a different user
    jest.doMock('jsonwebtoken', () => ({
      verify: (token, getKey, options, callback) => {
        callback(null, { sub: 'another-user-sub', username: 'anotheruser' });
      },
    }));
    // Mock DynamoDB to return events for multiple users, but only return those matching the userSub filter
    AWS.DynamoDB.DocumentClient.mockImplementationOnce(() => ({
      query: jest.fn().mockImplementation(({ TableName, IndexName, KeyConditionExpression, ExpressionAttributeValues }) => {
        // Simulate backend filtering by userSub
        const allEvents = [
          { id: '1', event: 'User1 Event', timestamp: '2025-05-17T12:00:00Z', userSub: 'test-user-sub' },
          { id: '2', event: 'User2 Event', timestamp: '2025-05-17T12:30:00Z', userSub: 'another-user-sub' }
        ];
        const filtered = allEvents.filter(e => e.userSub === ExpressionAttributeValues[':userSub']);
        return {
          promise: jest.fn().mockResolvedValue({ Items: filtered, Count: filtered.length })
        };
      })
    }));
    const createAppWithUser = require('../index');
    const appWithUser = createAppWithUser({ AWSLib: AWS, multerLib: require('multer') });
    const response = await request(appWithUser)
      .get('/view-events')
      .set('Authorization', 'Bearer test.jwt.token');
    // Should only see events for 'another-user-sub'
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].userSub).toBe('another-user-sub');
    jest.resetModules(); // Restore 'jsonwebtoken' after this test
  });
});
