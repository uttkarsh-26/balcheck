import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import { buildRouteLastmodTable, lastmodForUrl } from './scripts/lib/git-modified-dates.mjs';

// Real <lastmod> per URL, from git (audit 2026-09-19: all 879 URLs had none).
// The table is route template → committer date of the last commit touching that
// template or the data module it reads; URLs git cannot date simply omit the
// element (no fabricated build dates). Built once here in the Node build
// process — the helper shells out to git and must never enter the bundle.
const lastmodTable = buildRouteLastmodTable();

export default defineConfig({
  site: 'https://balcheck.in',
  trailingSlash: 'always',
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
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
