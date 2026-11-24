import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  plugins: [react()],
  css: {
    postcss: {},
  },
  server: {
    port: 5173,
    host: true,
    fs: {
      strict: true,
      allow: [path.resolve(__dirname)],
      deny: [path.resolve(__dirname, '..')],
    },
  },
});
