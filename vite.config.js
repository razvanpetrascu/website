import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative paths for assets (good for GH Pages)
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  }
});
