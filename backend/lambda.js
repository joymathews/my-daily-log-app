const serverlessExpress = require('@vendia/serverless-express');
const createApp = require('./index');

const app = createApp();
exports.handler = serverlessExpress({ app });
