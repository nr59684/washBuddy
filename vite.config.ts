
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
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
