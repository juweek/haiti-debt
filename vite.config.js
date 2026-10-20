import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Multi-page build: each HTML file at the root is its own entry.
export default defineConfig({
  // GitHub Pages project site: https://juweek.github.io/haiti-debt/
  base: '/haiti-debt/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sources: resolve(__dirname, 'sources.html'),
      },
    },
  },
});
