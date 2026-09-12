import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Three builds come out of this config:
//   npm run build         the real app, talking to the Express backend
//   npm run build:demo    a standalone build that runs entirely in the browser
//   npm run build:single  the same standalone build as ONE self-contained .html file
//
// The standalone builds are selected with `--mode`, which behaves the same on
// Windows, macOS and Linux. Each mode loads its own .env file, which sets VITE_DEMO.
export default defineConfig(({ mode }) => {
  const isSingle = mode === 'singlefile';
  const isDemo = isSingle || mode === 'demo' || process.env.VITE_DEMO === 'true';

  return {
    // A standalone build can be hosted in any folder (for example a GitHub Pages
    // subpath), so its asset URLs have to be relative.
    base: isDemo ? './' : '/',

    plugins: [react(), tailwindcss()],

    build: isSingle
      ? {
          outDir: 'dist-single',
          // A single file has nothing to preload, and it is opened straight from
          // disk as often as over http - so the bundle must be a classic script,
          // not an ES module. Browsers refuse module scripts on file:// URLs.
          modulePreload: false,
          cssCodeSplit: false,
          assetsInlineLimit: 100_000_000,
          rollupOptions: {
            output: {
              format: 'iife',
              inlineDynamicImports: true,
              entryFileNames: 'app.js',
              assetFileNames: 'app.[ext]',
            },
          },
        }
      : {},

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
