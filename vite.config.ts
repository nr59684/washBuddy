
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Wash Buddy - Dorm Laundry Tracker',
        short_name: 'Wash Buddy',
        description: 'A Progressive Web App to track and manage the status of washing machines in a dorm.',
        theme_color: '#0284c7',
        background_color: '#f1f5f9',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'https://i.imgur.com/O9N4p5p.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://i.imgur.com/O9N4p5p.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'https://i.imgur.com/O9N4p5p.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }),
      {
        name: 'replace-env-in-sw',
        // This hook runs after the entire bundle has been generated.
        writeBundle(options) {
          if (!options.dir) {
            console.error('vite-plugin-replace-env-in-sw: options.dir is not defined.');
            return;
          }
          const swPath = resolve(options.dir, 'firebase-messaging-sw.js');
          
          try {
            let swCode = readFileSync(swPath, 'utf-8');
            Object.keys(env).forEach((key) => {
              if (key.startsWith('VITE_')) {
                const regex = new RegExp(`%${key}%`, 'g');
                swCode = swCode.replace(regex, env[key]);
              }
            });
            writeFileSync(swPath, swCode);
            console.log('Successfully replaced environment variables in service worker.');
          } catch (error) {
            // It might fail if the file doesn't exist, which is fine during dev.
            if (mode !== 'development') {
                console.error('Failed to replace environment variables in service worker:', error);
            }
          }
        },
      },
    ],
    base: '/', // IMPORTANT: Change 'wash-buddy' to your exact GitHub repository name
  }
})
