import { defineConfig } from 'vite';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'copy-classic-app-script',
    closeBundle() {
      copyFileSync(resolve('app.js'), resolve('dist/app.js'));
    }
  }],
  build: {
    rolldownOptions: {
      input: {
        main: resolve('index.html'),
        mobile: resolve('mobile/index.html'),
        office: resolve('office/index.html')
      }
    },
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
