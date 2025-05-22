// Re-export the correct env file based on environment
// Jest will use the manual mock, Vite will use env.vite.js
import viteEnv from './env.vite.js';
export default viteEnv;
