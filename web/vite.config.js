import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: { port: 5173, open: false },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        nameGenerator: resolve(__dirname, 'tools/name-generator/index.html'),
        passwordGenerator: resolve(__dirname, 'tools/password-generator/index.html'),
      },
    },
  },
});
