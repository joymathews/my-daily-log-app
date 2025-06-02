class ListBucketsCommand { constructor() {} }
class PutObjectCommand { constructor() {} }
class HeadBucketCommand { constructor() {} }
class CreateBucketCommand { constructor() {} }
class PutBucketAclCommand { constructor() {} }

// Allow per-test override of send
const s3SendMock = jest.fn((command) => {
  if (command instanceof ListBucketsCommand) {
    return Promise.resolve({ Buckets: [{ Name: 'my-daily-log-files' }] });
  }
  if (command instanceof PutObjectCommand) {
    return Promise.resolve({ Location: 'https://s3.example.com/test-file.txt', ETag: 'mock-etag' });
  }
  if (command instanceof HeadBucketCommand) {
    return Promise.resolve({});
  }
  if (command instanceof CreateBucketCommand) {
    return Promise.resolve({});
  }
  if (command instanceof PutBucketAclCommand) {
    return Promise.resolve({});
  }
  return Promise.resolve({});
});

// Singleton mock instance for S3Client
const s3MockInstance = { send: s3SendMock };
function S3Client() {
  return s3MockInstance;
}
S3Client.__mockSend = s3SendMock;

module.exports = {
  S3Client,
  ListBucketsCommand,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketAclCommand,
};
