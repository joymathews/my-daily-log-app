class PutCommand { constructor() {} }
class ScanCommand { constructor() {} }
class QueryCommand { constructor() {} }

// Allow per-test override of send
const docSendMock = jest.fn((command) => {
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

// Singleton mock instance for DynamoDBDocumentClient
const docMockInstance = { send: docSendMock };
const DynamoDBDocumentClient = {
  from: jest.fn().mockImplementation(() => docMockInstance)
};
DynamoDBDocumentClient.__mockSend = docSendMock;

module.exports = {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  QueryCommand,
};
