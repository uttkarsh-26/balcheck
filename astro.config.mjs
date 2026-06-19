import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://balcheck.in',
  trailingSlash: 'never',
  output: 'static',
  integrations: [
    tailwind(),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
});
