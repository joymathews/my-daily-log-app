import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Polyfill global and Buffer for amazon-cognito-identity-js
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true,
        })
      ]
    }
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
    },
    extensions: ['.js', '.jsx', '.json']
  },
  server: {
    port: 3000,
    host: '0.0.0.0', // Explicitly bind to all interfaces
    strictPort: true, // Don't try other ports if 3000 is in use
    watch: {
      usePolling: true, // Better for Docker environments
    }
  }
});
