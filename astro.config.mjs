import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import { banks } from './src/data/banks';
import { isTrueTollFreeNumber } from './src/lib/phone';

// Legacy /toll-free-number/<bank>/ URLs for banks WITHOUT a real 1800 number
// canonicalise to /customer-care/<slug>/ (see
// src/pages/toll-free-number/[slug].astro). Those pages stay reachable for
// users, but a sitemap may only list canonical URLs — submitting a URL that
// declares a different canonical makes Google drop it as "Duplicate, submitted
// URL not selected as canonical". Keep them out of the sitemap.
const nonTollFreeLegacyPaths = new Set(
  banks
    .filter((bank) => !isTrueTollFreeNumber(bank.customerCare))
    .map((bank) => `/toll-free-number/${bank.slug}/`),
);

export default defineConfig({
  site: 'https://balcheck.in',
  trailingSlash: 'always',
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      filter: (page) => !nonTollFreeLegacyPaths.has(new URL(page).pathname),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
