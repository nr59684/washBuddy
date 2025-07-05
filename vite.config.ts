

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'process'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'replace-env-vars-in-sw',
        // This plugin is still needed to replace placeholders in your service worker
        transform: (code, id) => {
          if (id.includes('firebase-messaging-sw.js')) {
            let replacedCode = code;
            Object.keys(env).forEach((key) => {
              if (key.startsWith('VITE_')) {
                const regex = new RegExp(`%${key}%`, 'g');
                replacedCode = replacedCode.replace(regex, env[key]);
              }
            });
            return {
              code: replacedCode,
              map: null,
            };
          }
        },
      },
    ],
    base: '/', // IMPORTANT: Change 'wash-buddy' to your exact GitHub repository name
  }
})
