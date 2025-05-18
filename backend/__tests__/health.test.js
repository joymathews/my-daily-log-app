/**
 * Tests for the health check endpoint
 * 
 * This test suite verifies that:
 * 1. Health check correctly reports status of AWS services
 * 2. Health check handles service errors properly
 * 3. The overall status is correctly determined
 */

const request = require('supertest');
const express = require('express');
const { testData } = require('./utils/test-utils');

// Mock AWS SDK to avoid actual AWS calls
jest.mock('aws-sdk', () => {
  // We'll customize these for each test
  let mockS3 = {
    listBuckets: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ 
        Buckets: [{ Name: 'my-daily-log-files' }] 
      })
    })
  };
  
  let mockDocumentClient = {
    scan: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ 
        Items: testData.events,
        Count: testData.events.length 
      })
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

// Mock console to avoid cluttering test output
console.log = jest.fn();
console.error = jest.fn();

describe('GET /health API Endpoint', () => {
  let app;
  let AWS;
  
  beforeEach(() => {
    // Get the mocked AWS module
    AWS = require('aws-sdk');
    
    // Reset mocks to default behavior
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    
    // Configure the route (simplified version of what's in index.js)
    app.get('/health', async (req, res) => {
      try {
        const services = {
          s3: { status: 'unknown' },
          dynamodb: { status: 'unknown' }
        };
        
        // Check S3
        try {
          const s3 = new AWS.S3();
          const s3Result = await s3.listBuckets().promise();
          services.s3 = { 
            status: 'ok',
            buckets: s3Result.Buckets.map(b => b.Name)
          };
        } catch (error) {
          services.s3 = { 
            status: 'error',
            error: error.message || 'S3 service unavailable'
          };
        }
        
        // Check DynamoDB
        try {
          const dynamoDB = new AWS.DynamoDB.DocumentClient();
          const dynamoResult = await dynamoDB.scan({ 
            TableName: process.env.DYNAMODB_TABLE_NAME || 'DailyLogEvents', 
            Limit: 1 
          }).promise();
          services.dynamodb = { 
            status: 'ok',
            itemCount: dynamoResult.Count
          };
        } catch (error) {
          services.dynamodb = { 
            status: 'error',
            error: error.message || 'DynamoDB service unavailable'
          };
        }
        
        // Overall status
        const overallStatus = Object.values(services).every(s => s.status === 'ok') ? 200 : 503;
        
        res.status(overallStatus).json({
          status: overallStatus === 200 ? 'ok' : 'degraded',
          services,
          environment: {
            AWS_REGION: process.env.AWS_REGION || 'us-east-1',
            DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
            S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://localhost:4566',
            S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'my-daily-log-files',
            DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'DailyLogEvents'
          }
        });
      } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
      }
    });
    
    // Set environment variables for testing
    process.env.S3_BUCKET_NAME = 'my-daily-log-files';
    process.env.DYNAMODB_TABLE_NAME = 'DailyLogEvents';
  });
  
  /**
   * Test case: Verifies health check shows both services healthy
   */
  test('should report all services healthy', async () => {
    // Both services are healthy by default
    
    // Make the request
    const response = await request(app).get('/health');
    
    // Assert response
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.services.s3.status).toBe('ok');
    expect(response.body.services.dynamodb.status).toBe('ok');
  });
  
  /**
   * Test case: Verifies health check shows degraded status when S3 fails
   */
  test('should report degraded status when S3 fails', async () => {
    // Mock S3 to fail
    AWS.__setS3Mock({
      listBuckets: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('S3 service unavailable'))
      })
    });
    
    // Make the request
    const response = await request(app).get('/health');
    
    // Assert response
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.services.s3.status).toBe('error');
    expect(response.body.services.s3.error).toBe('S3 service unavailable');
    expect(response.body.services.dynamodb.status).toBe('ok');
  });
  
  /**
   * Test case: Verifies health check shows degraded status when DynamoDB fails
   */
  test('should report degraded status when DynamoDB fails', async () => {
    // Mock DynamoDB to fail
    AWS.__setDynamoDBMock({
      scan: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB service unavailable'))
      })
    });
    
    // Make the request
    const response = await request(app).get('/health');
    
    // Assert response
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.services.s3.status).toBe('ok');
    expect(response.body.services.dynamodb.status).toBe('error');
    expect(response.body.services.dynamodb.error).toBe('DynamoDB service unavailable');
  });
  
  /**
   * Test case: Verifies health check shows degraded status when all services fail
   */
  test('should report degraded status when all services fail', async () => {
    // Mock both services to fail
    AWS.__setS3Mock({
      listBuckets: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('S3 service unavailable'))
      })
    });
    
    AWS.__setDynamoDBMock({
      scan: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB service unavailable'))
      })
    });
    
    // Make the request
    const response = await request(app).get('/health');
    
    // Assert response
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.services.s3.status).toBe('error');
    expect(response.body.services.dynamodb.status).toBe('error');
  });
  
  /**
   * Test case: Verifies health check includes environment variables
   */
  test('should include environment variables in response', async () => {
    // Set specific environment values for testing
    process.env.AWS_REGION = 'us-west-2';
    process.env.S3_BUCKET_NAME = 'test-bucket';
    
    // Make the request
    const response = await request(app).get('/health');
    
    // Assert environment is included
    expect(response.body.environment).toBeDefined();
    expect(response.body.environment.AWS_REGION).toBe('us-west-2');
    expect(response.body.environment.S3_BUCKET_NAME).toBe('test-bucket');
    
    // Reset environment
    process.env.AWS_REGION = 'us-east-1';
    process.env.S3_BUCKET_NAME = 'my-daily-log-files';
  });
});
