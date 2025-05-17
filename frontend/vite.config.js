import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0', // Explicitly bind to all interfaces
    strictPort: true, // Don't try other ports if 3000 is in use
    watch: {
      usePolling: true, // Better for Docker environments
    }
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  }
});
