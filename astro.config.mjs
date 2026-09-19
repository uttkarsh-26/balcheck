import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import { banks } from './src/data/banks';
import { isTrueTollFreeNumber } from './src/lib/phone';
import { buildRouteLastmodTable, lastmodForUrl } from './scripts/lib/git-modified-dates.mjs';

// Real <lastmod> per URL, from git (audit 2026-09-19: all 879 URLs had none).
// The table is route template → committer date of the last commit touching that
// template or the data module it reads; URLs git cannot date simply omit the
// element (no fabricated build dates). Built once here in the Node build
// process — the helper shells out to git and must never enter the bundle.
const lastmodTable = buildRouteLastmodTable();

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
      // Emit the git-derived date when there is one; otherwise leave the element
      // out entirely (a missing <lastmod> is honest, a build date is not).
      serialize: (item) => {
        const lastmod = lastmodForUrl(item.url, lastmodTable);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
