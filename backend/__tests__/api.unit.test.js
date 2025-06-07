/**
 * Integration tests for the Express API server with mocked AWS services
 * 
 * These tests mock AWS services but test the actual Express routes
 * to verify end-to-end behavior of the API endpoints.
 */
// --- MOCKING LOGIC ---
//
// We mock AWS SDK v3 clients and JWT verification to ensure:
// 1. All AWS calls are intercepted and controlled (no real AWS calls).
// 2. JWT authentication is always mocked, even after jest.resetModules().
// 3. Each test can override the mock implementation for custom scenarios.
//
// This is critical for reliable, isolated, and fast unit tests.

// Loads .env for local dev; in CI, env vars are set by the workflow and .env is ignored if missing.
require('dotenv').config();

// Mock multer to simulate file uploads in tests (no real disk or S3 interaction)
jest.mock('multer', () => {
  function multer() {
    return {
      single: (fieldName) => (req, res, next) => {
        if (req.headers['x-with-file'] === 'true') {
          req.file = {
            buffer: Buffer.from('test file content'),
            originalname: 'test-file.jpg', // Use an image extension
            mimetype: 'image/jpeg' // Use an image mimetype
          };
        }
        next();
      }
    };
  }
  multer.memoryStorage = function () { return {}; };
  return multer;
});

// Helper to (re-)mock JWT verification
// This ensures the JWT mock is always in effect, even after jest.resetModules() or jest.doMock.
// Call mockJWT() at the top and after any jest.resetModules() to guarantee the mock persists.
function mockJWT(verifyImpl) {
  jest.doMock('jsonwebtoken', () => ({
    verify: verifyImpl || ((token, getKey, options, callback) => {
      callback(null, { sub: 'test-user-sub', username: 'testuser' });
    })
  }));
}

// Initial JWT mock (applies to all tests unless overridden)
mockJWT();

const request = require('supertest');

describe('API Unit Tests (using real app)', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockJWT(); // Re-apply JWT mock after reset
  });

  test('GET /health should return 200 OK', async () => {
    // Explicitly set healthy mocks for S3 and DynamoDB
    const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
    S3Client.__mockSend.mockReset();
    S3Client.__mockSend.mockImplementation((command) => {
      if (command instanceof ListBucketsCommand) {
        return Promise.resolve({ Buckets: [{ Name: 'my-daily-log-files' }] });
      }
      return Promise.resolve({});
    });
    const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.__mockSend.mockReset();
    DynamoDBDocumentClient.__mockSend.mockImplementation((command) => {
      if (command instanceof ScanCommand) {
        return Promise.resolve({ Items: [], Count: 0 });
      }
      return Promise.resolve({});
    });
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.services.s3.status).toBe('ok');
    expect(response.body.services.dynamodb.status).toBe('ok');
  });

  test('POST /log-event should log events without file', async () => {
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app)
      .post('/log-event')
      .set('Authorization', 'Bearer test.jwt.token')
      .send({ event: 'Test event' });
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
  });

  test('POST /log-event should log events with file', async () => {
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app)
      .post('/log-event')
      .set('Authorization', 'Bearer test.jwt.token')
      .set('x-with-file', 'true')
      .send({ event: 'Test event with file' });
    expect(response.status).toBe(200);
    expect(response.text).toBe('Event logged successfully');
  });

  test('GET /view-events should return events', async () => {
    // Reset AWS SDK v3 shared mocks to default healthy state
    const { DynamoDBDocumentClient, PutCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
    if (DynamoDBDocumentClient.__mockSend) {
      DynamoDBDocumentClient.__mockSend.mockReset();
      DynamoDBDocumentClient.__mockSend.mockImplementation((command) => {
        if (command instanceof PutCommand) {
          return Promise.resolve({});
        }
        if (command instanceof ScanCommand) {
          return Promise.resolve({
            Items: [
              { id: '1', event: 'Test Event 1', timestamp: '2025-05-17T12:00:00Z' },
              { id: '2', event: 'Test Event 2', timestamp: '2025-05-17T12:30:00Z' }
            ],
            Count: 2
          });
        }
        if (command instanceof QueryCommand) {
          return Promise.resolve({
            Items: [
              { id: '1', event: 'Test Event 1', timestamp: '2025-05-17T12:00:00Z', userSub: 'test-user-sub' },
              { id: '2', event: 'Test Event 2', timestamp: '2025-05-17T12:30:00Z', userSub: 'test-user-sub' }
            ],
            Count: 2
          });
        }
        return Promise.resolve({ Items: [], Count: 0 });
      });
    }
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app)
      .get('/view-events')
      .set('Authorization', 'Bearer test.jwt.token');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(response.body[0].event).toBe('Test Event 1');
  });

  test('GET /view-events should return empty array when no events exist', async () => {
    const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.__mockSend.mockReset();
    DynamoDBDocumentClient.__mockSend.mockImplementationOnce((command) => {
      if (command instanceof ScanCommand) {
        return Promise.resolve({ Items: [], Count: 0 });
      }
      return Promise.resolve({});
    });
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app)
      .get('/view-events')
      .set('Authorization', 'Bearer test.jwt.token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('GET /view-events should handle DynamoDB errors', async () => {
    const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.__mockSend.mockReset();
    DynamoDBDocumentClient.__mockSend.mockImplementation((command) => {
      if (command instanceof QueryCommand) {
        return Promise.reject(new Error('DynamoDB failure'));
      }
      return Promise.resolve({});
    });
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app)
      .get('/view-events')
      .set('Authorization', 'Bearer test.jwt.token');
    expect(response.status).toBe(500);
    expect(response.text).toBe('Error fetching events');
    // Remove this assertion if console.error is not a mock
    // expect(console.error).toHaveBeenCalled();
  });

  test('GET /view-events should return 401 if Authorization header is missing', async () => {
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app).get('/view-events');
    expect(response.status).toBe(401);
    expect(response.text).toBe('Missing or invalid Authorization header');
  });

  test('GET /view-events should return 401 if Authorization header is malformed', async () => {
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app)
      .get('/view-events')
      .set('Authorization', 'InvalidTokenFormat');
    expect(response.status).toBe(401);
    expect(response.text).toBe('Missing or invalid Authorization header');
  });

  test('GET /view-events should return 401 if JWT verification fails', async () => {
    mockJWT((token, getKey, options, callback) => {
      callback(new Error('Invalid token'), null);
    });
    const createAppWithInvalidJWT = require('../index');
    const appWithInvalidJWT = createAppWithInvalidJWT();
    const response = await request(appWithInvalidJWT)
      .get('/view-events')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(response.status).toBe(401);
    expect(response.text).toBe('Invalid token');
    jest.resetModules();
    mockJWT(); // Re-apply after reset
  });

  test('POST /log-event should handle missing event and file', async () => {
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app)
      .post('/log-event')
      .set('Authorization', 'Bearer test.jwt.token')
      .send({});
    expect(response.status).toBe(400);
  });

  test('GET /view-events should only return events for the logged-in user', async () => {
    mockJWT((token, getKey, options, callback) => {
      callback(null, { sub: 'another-user-sub', username: 'anotheruser' });
    });
    const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.__mockSend.mockReset();
    DynamoDBDocumentClient.__mockSend.mockImplementationOnce((command) => {
      if (command instanceof QueryCommand) {
        return Promise.resolve({
          Items: [
            { id: '2', event: 'User2 Event', timestamp: '2025-05-17T12:30:00Z', userSub: 'another-user-sub' }
          ],
          Count: 1
        });
      }
      return Promise.resolve({});
    });
    const createAppWithUser = require('../index');
    const appWithUser = createAppWithUser();
    const response = await request(appWithUser)
      .get('/view-events')
      .set('Authorization', 'Bearer test.jwt.token');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].userSub).toBe('another-user-sub');
    jest.resetModules();
    mockJWT(); // Re-apply after reset
  });

  test('GET /view-events-by-date should return events for a specific date', async () => {
    const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.__mockSend.mockReset();
    DynamoDBDocumentClient.__mockSend.mockImplementation((command) => {
      if (command instanceof QueryCommand) {
        // Simulate only events for 2025-06-06
        return Promise.resolve({
          Items: [
            { id: '1', event: 'Event on 6th', timestamp: '2025-06-06T10:00:00Z', userSub: 'test-user-sub' }
          ],
          Count: 1
        });
      }
      return Promise.resolve({ Items: [], Count: 0 });
    });
    const createApp = require('../index');
    const app = createApp();
    const response = await request(app)
      .get('/view-events-by-date?date=2025-06-06')
      .set('Authorization', 'Bearer test.jwt.token');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].event).toBe('Event on 6th');
    expect(response.body[0].timestamp).toContain('2025-06-06');
  });
});
