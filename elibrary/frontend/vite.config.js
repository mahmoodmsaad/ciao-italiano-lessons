import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Two builds come out of this config:
//   npm run build        the real app, talking to the Express backend
//   npm run build:demo   a standalone build that runs entirely in the browser
//
// The demo build is selected with `--mode demo`, which works the same on
// Windows, macOS and Linux. It loads .env.demo, which sets VITE_DEMO=true.
export default defineConfig(({ mode }) => {
  const isDemo = mode === 'demo' || process.env.VITE_DEMO === 'true';

  return {
    // A demo build can be hosted in any folder (for example a GitHub Pages
    // subpath), so its asset URLs have to be relative.
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
  };
});
