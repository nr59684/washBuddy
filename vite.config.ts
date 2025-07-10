
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
    define: {
      // Inject Firebase config from environment variables
      // Make sure these environment variables are available during the build
      'self.__FIREBASE_CONFIG__': JSON.stringify({
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID,
      }),
    },
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
    })],
    base: '/', // IMPORTANT: Change 'wash-buddy' to your exact GitHub repository name
  }
})
