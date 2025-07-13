import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load all env vars (including those without the VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Use the public/sw.js file as the service worker
        srcDir: 'public',
        filename: 'sw.js',
        manifest: {
          name: 'Wash Buddy - Dorm Laundry Tracker',
          short_name: 'Wash Buddy',
          description:
            'A Progressive Web App to track and manage the status of washing machines in a dorm.',
          theme_color: '#0284c7',
          background_color: '#f1f5f9',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],

    // 👉 GitHub Pages needs a slash when you publish from the repo root
    base: '/',
    
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:5001/${env.VITE_FIREBASE_PROJECT_ID}/europe-west1`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
