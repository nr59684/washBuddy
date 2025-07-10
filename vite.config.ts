import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
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
              src: 'https://i.imgur.com/O9N4p5p.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'https://i.imgur.com/O9N4p5p.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'https://i.imgur.com/O9N4p5p.png',
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

    /**
     * ---- NEW PART ----
     * Tell Rollup about the service-worker entry and force it to
     * keep the filename exactly "firebase-messaging-sw.js".
     */
    build: {
      rollupOptions: {
        input: {
          // regular site entry (index.html) – adjust if yours lives elsewhere
          main: resolve(__dirname, 'index.html'),
          // service-worker entry
          'firebase-messaging-sw': resolve(
            __dirname,
            'src/firebase-messaging-sw.js'
          ),
        },
        output: {
          // keep SW filename stable, hash everything else
          entryFileNames: (chunk) =>
            chunk.name === 'firebase-messaging-sw'
              ? '[name].js'
              : 'assets/[name]-[hash].js',
        },
      },
    },
  };
});
