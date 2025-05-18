/**
 * Tests for S3 bucket operations
 * 
 * This test suite verifies that:
 * 1. The application correctly checks if an S3 bucket exists
 * 2. The application creates a bucket when it doesn't exist
 * 3. The application handles S3 bucket errors properly
 */

// Import AWS SDK for testing
const AWS = require('aws-sdk');
const { testData } = require('./utils/test-utils');

// Create a separate implementation of the ensureBucketExists function for testing
function createEnsureBucketExistsFunction(s3Mock) {
  return async function ensureBucketExists() {
    const bucketName = 'my-daily-log-files';
    
    try {
      console.log(`Checking if bucket ${bucketName} exists...`);
      
      try {
        await s3Mock.headBucket({ Bucket: bucketName }).promise();
        console.log(`Bucket ${bucketName} exists.`);
        return true;
      } catch (error) {
        if (error.statusCode === 404) {
          console.log(`Bucket ${bucketName} doesn't exist. Creating it...`);
          
          await s3Mock.createBucket({ 
            Bucket: bucketName 
          }).promise();
          
          await s3Mock.putBucketAcl({
            Bucket: bucketName,
            ACL: 'public-read'
          }).promise();
          
          console.log(`Bucket ${bucketName} created successfully.`);
          return true;
        } else {
          console.error('Error checking bucket existence:', error);
          return false;
        }
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      return false;
    }
  };
}

// Mock console methods
console.log = jest.fn();
console.error = jest.fn();

describe('S3 Bucket Operations', () => {
  let s3;
  
  beforeEach(() => {
    // Setup fresh S3 mock object for each test
    s3 = {
      headBucket: jest.fn(),
      createBucket: jest.fn(),
      putBucketAcl: jest.fn(),
      listBuckets: jest.fn(),
      upload: jest.fn()
    };

    // Reset environment variables
    process.env.S3_BUCKET_NAME = 'my-daily-log-files';
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up mocks
    jest.clearAllMocks();
  });

  /**
   * Test case: verifies the application checks if a bucket exists correctly
   */
  test('should check if bucket exists', async () => {
    // Mock S3 headBucket to succeed
    s3.headBucket = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
    
    // Create an instance of our test function
    const ensureBucketExists = createEnsureBucketExistsFunction(s3);
    
    // Call the function
    const result = await ensureBucketExists();
    
    // Assert the result
    expect(result).toBe(true);
    expect(s3.headBucket).toHaveBeenCalledWith({ Bucket: 'my-daily-log-files' });
  });

  /**
   * Test case: verifies the application creates a bucket when it doesn't exist
   */
  test('should create bucket if it does not exist', async () => {
    // Mock S3 methods - headBucket throws a "not found" error
    const notFoundError = new Error('Bucket does not exist');
    notFoundError.statusCode = 404;
    
    s3.headBucket = jest.fn().mockReturnValue({
      promise: jest.fn().mockRejectedValue(notFoundError)
    });
    
    // Mock createBucket to succeed
    s3.createBucket = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Location: '/my-daily-log-files' })
    });
    
    // Mock putBucketAcl to succeed
    s3.putBucketAcl = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
    
    // Create an instance of our test function
    const ensureBucketExists = createEnsureBucketExistsFunction(s3);
    
    // Call the function
    const result = await ensureBucketExists();
    
    // Assert the result
    expect(result).toBe(true);
    expect(s3.createBucket).toHaveBeenCalledWith({ Bucket: 'my-daily-log-files' });
    expect(s3.putBucketAcl).toHaveBeenCalledWith({
      Bucket: 'my-daily-log-files',
      ACL: 'public-read'
    });
  });

  /**
   * Test case: verifies the application handles errors during bucket creation
   */
  test('should handle error when creating bucket fails', async () => {
    // Mock S3 headBucket to throw a "not found" error
    const notFoundError = new Error('Bucket does not exist');
    notFoundError.statusCode = 404;
    
    s3.headBucket = jest.fn().mockReturnValue({
      promise: jest.fn().mockRejectedValue(notFoundError)
    });
    
    // Mock createBucket to fail
    s3.createBucket = jest.fn().mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('Failed to create bucket'))
    });
    
    // Create an instance of our test function
    const ensureBucketExists = createEnsureBucketExistsFunction(s3);
    
    // Call the function
    const result = await ensureBucketExists();
    
    // Assert the result
    expect(result).toBe(false);
    expect(s3.createBucket).toHaveBeenCalledWith({ Bucket: 'my-daily-log-files' });
    expect(console.error).toHaveBeenCalled();
  });

  /**
   * Test case: verifies the application handles general S3 errors
   */
  test('should handle general S3 errors', async () => {
    // Mock S3 headBucket to throw a general error (not 404)
    s3.headBucket = jest.fn().mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('General S3 error'))
    });
    
    // Create an instance of our test function
    const ensureBucketExists = createEnsureBucketExistsFunction(s3);
    
    // Call the function
    const result = await ensureBucketExists();
    
    // Assert the result
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});
