// Re-export the correct env file based on environment
// Jest will use the manual mock, Vite will use env.vite.js
let viteEnv;
if (typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID) {
  // In Jest, do nothing (manual mock will be used)
  viteEnv = {};
} else {
  // In Vite, import the real env
  viteEnv = require('./env.vite.js').default;
}
export default viteEnv;
