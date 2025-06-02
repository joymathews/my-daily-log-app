require('dotenv').config();
const { ensureBucketExists, ensureTableExists } = require('./aws-ensure');
const createApp = require('./index');
const { CORS_ORIGIN } = require('./config');

const port = process.env.PORT || 3001;

(async () => {
  await ensureBucketExists();
  await ensureTableExists();
  const app = createApp();
  app.listen(port, () => {
    console.log(`Local server running on http://localhost:${port} (CORS: ${CORS_ORIGIN})`);
  });
})();
