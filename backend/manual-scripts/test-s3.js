// Test script for S3 connectivity
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { S3_BUCKET_NAME, AWS_REGION, S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = require('./config');

// Configure AWS
AWS.config.update({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Configure S3 to use LocalStack
const s3 = new AWS.S3({
  endpoint: S3_ENDPOINT,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

// Define bucket name
const BUCKET_NAME = S3_BUCKET_NAME;
const TEST_FILE_PATH = path.join(__dirname, 'test-s3.js'); // Use this script as the test file

// Helper function to create the bucket if it doesn't exist
async function createBucketIfNotExists() {
  try {
    console.log(`Checking if bucket ${BUCKET_NAME} exists...`);
    
    try {
      await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
      console.log(`Bucket ${BUCKET_NAME} exists.`);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`Bucket ${BUCKET_NAME} doesn't exist. Creating it...`);
        
        await s3.createBucket({ 
          Bucket: BUCKET_NAME 
        }).promise();
        
        await s3.putBucketAcl({
          Bucket: BUCKET_NAME,
          ACL: 'public-read'
        }).promise();
        
        console.log(`Bucket ${BUCKET_NAME} created successfully.`);
        return true;
      } else {
        console.error(`Error checking bucket existence: ${error.code} - ${error.message}`);
        throw error;
      }
    }
  } catch (error) {
    console.error(`Failed to create bucket: ${error.code} - ${error.message}`);
    throw error;
  }
}

// Function to list all buckets
async function listBuckets() {
  try {
    console.log('Listing all S3 buckets:');
    const data = await s3.listBuckets().promise();
    console.log('Buckets:', data.Buckets.map(b => b.Name));
  } catch (error) {
    console.error(`Failed to list buckets: ${error.code} - ${error.message}`);
  }
}

// Function to upload a test file
async function uploadTestFile() {
  try {
    console.log(`Uploading test file to bucket ${BUCKET_NAME}...`);
    
    const fileContent = fs.readFileSync(TEST_FILE_PATH);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: `test-file-${Date.now()}.js`,
      Body: fileContent
    };
    
    const data = await s3.upload(params).promise();
    console.log(`File uploaded successfully. Location: ${data.Location}`);
    return data.Key;
  } catch (error) {
    console.error(`Failed to upload file: ${error.code} - ${error.message}`);
    throw error;
  }
}

// Function to list files in the bucket
async function listFiles() {
  try {
    console.log(`Listing files in bucket ${BUCKET_NAME}:`);
    
    const data = await s3.listObjects({
      Bucket: BUCKET_NAME
    }).promise();
    
    if (data.Contents.length === 0) {
      console.log('No files in bucket');
    } else {
      console.log('Files:');
      data.Contents.forEach(item => {
        console.log(` - ${item.Key} (${item.Size} bytes)`);
      });
    }
  } catch (error) {
    console.error(`Failed to list files: ${error.code} - ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  console.log('ENVIRONMENT:');
  console.log(`AWS_REGION: ${AWS_REGION}`);
  console.log(`S3_ENDPOINT: ${S3_ENDPOINT}`);
  console.log(`BUCKET_NAME: ${BUCKET_NAME}`);
  
  try {
    await createBucketIfNotExists();
    await listBuckets();
    const uploadedKey = await uploadTestFile();
    await listFiles();
    
    console.log('\nAll S3 tests completed successfully!');
    console.log(`You can verify the uploaded file at: ${S3_ENDPOINT}/${BUCKET_NAME}/${uploadedKey}`);
  } catch (error) {
    console.error('\nFailed to complete S3 tests:', error);
  }
}

// Run the tests
runTests();
