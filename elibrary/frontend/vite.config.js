import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// A demo build (VITE_DEMO=true) can be hosted anywhere, so it uses relative paths.
const isDemo = process.env.VITE_DEMO === 'true';

export default defineConfig({
  base: isDemo ? './' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forwards /api requests to the backend on port 5000.
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
