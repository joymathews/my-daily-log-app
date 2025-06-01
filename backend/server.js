require('dotenv').config();
const { ensureBucketExists, ensureTableExists } = require('./aws-ensure');
const createApp = require('./index');
const { CORS_ORIGIN } = require('./config');

const port = 3001;

(async () => {
  await ensureBucketExists();
  await ensureTableExists();
  const app = createApp();
  app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port} (CORS: ${CORS_ORIGIN})`);
  });
})();
