import { URL, fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import VueDevTools from 'vite-plugin-vue-devtools';
import svgLoader from 'vite-svg-loader';

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.pdf'],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
      },
    },
  },
  plugins: [
    vue(),
    tailwindcss(),
    svgLoader(),
    VueDevTools(),
  ],
  resolve: {
    alias: {
      '@data': fileURLToPath(new URL('./data', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
