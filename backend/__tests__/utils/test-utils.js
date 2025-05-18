/**
 * Test utility functions and mock setup for AWS services
 * This is not a test file, but a helper module for tests.
 */
const AWS = require('aws-sdk');
const AWSMock = require('aws-sdk-mock');
const sinon = require('sinon');

// Configure AWS Mock
function setupAwsMock() {
  // Reset any previous mocks
  AWSMock.restore();
  
  // Set the AWS SDK instance for mocking
  AWSMock.setSDKInstance(AWS);
  
  return {
    AWS,
    AWSMock
  };
}

// Sample test data
const testData = {
  events: [
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
  ],
  files: {
    sample: {
      buffer: Buffer.from('test file content'),
      originalname: 'test-file.txt',
      mimetype: 'text/plain'
    }
  },
  bucket: 'my-daily-log-files',
  table: 'DailyLogEvents'
};

module.exports = {
  setupAwsMock,
  testData
};
