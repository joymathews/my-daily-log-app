class ListTablesCommand { constructor() {} }
class DescribeTableCommand { constructor() {} }
class CreateTableCommand { constructor() {} }

// Allow per-test override of send
const dynamoSendMock = jest.fn((command) => {
  if (command instanceof ListTablesCommand) {
    return Promise.resolve({ TableNames: ['DailyLogEvents'] });
  }
  if (command instanceof DescribeTableCommand) {
    return Promise.resolve({ Table: { GlobalSecondaryIndexes: [{ IndexName: 'userSub-index' }] } });
  }
  if (command instanceof CreateTableCommand) {
    return Promise.resolve({});
  }
  return Promise.resolve({});
});

// Singleton mock instance for DynamoDBClient
const dynamoMockInstance = { send: dynamoSendMock };
function DynamoDBClient() {
  return dynamoMockInstance;
}
DynamoDBClient.__mockSend = dynamoSendMock;

module.exports = {
  DynamoDBClient,
  ListTablesCommand,
  DescribeTableCommand,
  CreateTableCommand,
};
