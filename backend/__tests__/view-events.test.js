/**
 * Tests for the view-events API endpoint
 * 
 * This test suite verifies that:
 * 1. Events are correctly retrieved from DynamoDB
 * 2. The API handles DynamoDB errors appropriately
 * 3. The API returns events in the expected format
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const AWSMock = require('aws-sdk-mock');
const { setupAwsMock, testData } = require('./utils/test-utils');

describe('GET /view-events API Endpoint', () => {
  let app;
  
  beforeEach(() => {
    // Reset AWS mocks
    const { AWS, AWSMock } = setupAwsMock();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(bodyParser.json());
    
    // Configure the route (simplified version of what's in index.js)
    app.get('/view-events', async (req, res) => {
      try {
        const params = {
          TableName: process.env.DYNAMODB_TABLE_NAME || 'DailyLogEvents',
        };
        
        const dynamoDB = new AWS.DynamoDB.DocumentClient();
        const data = await dynamoDB.scan(params).promise();
        res.status(200).json(data.Items);
      } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).send('Error fetching events');
      }
    });
    
    // Set environment variables for testing
    process.env.DYNAMODB_TABLE_NAME = 'DailyLogEvents';
    
    // Mock console to avoid cluttering test output
    console.error = jest.fn();
  });
  
  afterEach(() => {
    // Clean up
    AWSMock.restore();
    jest.clearAllMocks();
  });

  /**
   * Test case: verifies the API returns events correctly
   */
  test('should fetch events successfully', async () => {
    // Mock events data
    const mockEvents = testData.events;
    
    // Mock DynamoDB.scan
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      expect(params.TableName).toBe('DailyLogEvents');
      callback(null, { Items: mockEvents });
    });
    
    // Send request to the endpoint
    const response = await request(app).get('/view-events');
    
    // Assert response
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockEvents);
  });

  /**
   * Test case: verifies the API returns an empty array when no events exist
   */
  test('should return empty array when no events exist', async () => {
    // Mock DynamoDB.scan to return empty array
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(null, { Items: [] });
    });
    
    // Send request to the endpoint
    const response = await request(app).get('/view-events');
    
    // Assert response
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  /**
   * Test case: verifies the API handles DynamoDB errors
   */
  test('should handle DynamoDB errors', async () => {
    // Mock DynamoDB.scan to fail
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
      callback(new Error('DynamoDB scan error'));
    });
    
    // Send request to the endpoint
    const response = await request(app).get('/view-events');
    
    // Assert response
    expect(response.status).toBe(500);
    expect(response.text).toBe('Error fetching events');
    expect(console.error).toHaveBeenCalled();
  });
});
