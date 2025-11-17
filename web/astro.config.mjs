import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [vue()],
  server: {
    port: 4321,
    host: true
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    },
  },
});