import { defineConfig } from 'vite';
import { resolve, relative, join } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

// Helper to find all HTML files recursively
function getHtmlFiles(dir, allFiles = {}) {
  const files = readdirSync(dir);
  for (const file of files) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'target') {
        getHtmlFiles(path, allFiles);
      }
    } else if (file.endsWith('.html')) {
      const name = relative(__dirname, path)
        .replace(/\\/g, '/')
        .replace(/\.html$/, '');
      allFiles[name] = resolve(__dirname, path);
    }
  }
  return allFiles;
}

const htmlFiles = getHtmlFiles(__dirname);

export default defineConfig({
  server: { port: 5173, open: false },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: htmlFiles,
    },
  },
});
