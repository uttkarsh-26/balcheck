// Fail-closed sitemap ↔ canonical consistency gate.
//
// Offline check over the build output: every URL listed in the generated
// sitemap must declare ITSELF as canonical in its built HTML. Submitting a URL
// that points its canonical somewhere else makes Google ignore the submission
// ("Duplicate, submitted URL not selected as canonical") and wastes crawl
// budget — this is exactly how 13 legacy /toll-free-number/<bank>/ pages were
// shipped before the sitemap filter was added.
//
// Run after `npm run build`:  node scripts/verify-sitemap-canonical.mjs
//
// Exports the pure helpers so scripts/test-sitemap-canonical.mjs can unit test
// them without a real build.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://balcheck.in';

/** Normalise a URL/path for comparison: no trailing slash, no www. */
export function normalise(url) {
  return String(url).trim().replace(/^https:\/\/www\./, 'https://').replace(/\/+$/, '');
}

/** Pull every <loc> out of a sitemap document (handles minified one-line XML). */
export function extractLocs(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/** Pull the canonical href out of a built HTML document, or null. */
export function extractCanonical(html) {
  const m = String(html).match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!m) return null;
  const href = m[0].match(/href=["']([^"']+)["']/i);
  return href ? href[1] : null;
}

/** Map an absolute sitemap URL to its built HTML file inside dist/. */
export function distFileFor(distDir, loc) {
  const { pathname } = new URL(loc);
  const rel = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  return join(distDir, rel === '' ? 'index.html' : join(rel, 'index.html'));
}

/** Read the sitemap index (or a single sitemap) and return all listed URLs. */
export function readSitemapUrls(distDir) {
  const indexPath = join(distDir, 'sitemap-index.xml');
  const singlePath = join(distDir, 'sitemap-0.xml');
  const files = [];
  if (existsSync(indexPath)) {
    const index = readFileSync(indexPath, 'utf8');
    files.push(...extractLocs(index));
  } else if (existsSync(singlePath)) {
    files.push(singlePath);
  } else {
    throw new Error(`No sitemap found in ${distDir}`);
  }

  const urls = [];
  for (const file of files) {
    const isLocal = !/^https?:/.test(file);
    const xml = readFileSync(isLocal ? file : join(distDir, new URL(file).pathname.split('/').pop()), 'utf8');
    urls.push(...extractLocs(xml));
  }
  return urls;
}

/** Check every sitemap URL self-canonicalises. Returns { checked, offenders }. */
export function checkSitemapCanonicals(distDir) {
  const urls = readSitemapUrls(distDir);
  const offenders = [];
  let checked = 0;

  for (const loc of urls) {
    const file = distFileFor(distDir, loc);
    if (!existsSync(file)) {
      offenders.push({ url: loc, reason: 'listed in sitemap but no built page' });
      continue;
    }
    const canonical = extractCanonical(readFileSync(file, 'utf8'));
    checked += 1;
    if (!canonical) {
      offenders.push({ url: loc, reason: 'built page has no <link rel="canonical">' });
      continue;
    }
    if (normalise(canonical) !== normalise(loc)) {
      offenders.push({ url: loc, reason: `canonical points elsewhere: ${canonical}` });
    }
  }

  return { checked, offenders };
}

function main() {
  const distDir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
  const { checked, offenders } = checkSitemapCanonicals(distDir);

  if (offenders.length > 0) {
    console.error(`❌ ${offenders.length}/${checked + offenders.length} sitemap URLs are not self-canonical:`);
    for (const o of offenders) console.error(`   ${o.url} — ${o.reason}`);
    console.error('   Fix: either self-canonicalise the page or drop it from the sitemap');
    console.error('   (see the sitemap filter in astro.config.mjs for the legacy-route pattern).');
    process.exit(1);
  }

  console.log(`✅ Every sitemap URL self-canonicalises (${checked} checked)`);
}

if (process.argv[1] && process.argv[1].endsWith('verify-sitemap-canonical.mjs')) {
  main();
}
