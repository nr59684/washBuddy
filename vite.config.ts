import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This base path is crucial for GitHub Pages
  base: '/washBuddy/', // <-- IMPORTANT: Change 'your-repo-name' to your GitHub repo's name
});