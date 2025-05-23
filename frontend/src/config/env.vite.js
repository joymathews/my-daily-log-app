// Vite/browser environment variables
// Add API base URL for frontend to use
export default {
  ...import.meta.env,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
};
