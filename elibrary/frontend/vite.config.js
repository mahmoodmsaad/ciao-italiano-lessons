import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Demo build (VITE_DEMO=true) kahin bhi host ho sakti hai, is liye relative paths.
const isDemo = process.env.VITE_DEMO === 'true';

export default defineConfig({
  base: isDemo ? './' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Frontend /api ki requests backend (port 5000) ko bhej deta hai.
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
