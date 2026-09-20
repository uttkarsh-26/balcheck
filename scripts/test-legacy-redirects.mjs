// Contract test for the worker's legacy-URL redirect layer.
//
// The map (src/lib/legacy-redirects.mjs) exists to clear crawler-visible 404s.
// Two failure modes are silent in production and are gated here:
//   1. A redirect that shadows a real route (source path exists in dist/) —
//      a live page would start 301-ing away.
//   2. A redirect whose target does not exist — the 404 just moves.
// Run after `npm run build`: node scripts/test-legacy-redirects.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EXACT_REDIRECTS, resolveLegacyRedirect } from '../src/lib/legacy-redirects.mjs';

const DIST = 'dist';
const exists = (urlPath) => {
  const rel = urlPath.replace(/^\//, '').replace(/\/$/, '');
  if (rel === '') return fs.existsSync(path.join(DIST, 'index.html'));
  return (
    fs.existsSync(path.join(DIST, rel)) || fs.existsSync(path.join(DIST, rel, 'index.html'))
  );
};

assert.ok(fs.existsSync(DIST), 'dist/ missing — run `npm run build` first');

for (const [source, target] of Object.entries(EXACT_REDIRECTS)) {
  assert.ok(!exists(source), `redirect source ${source} shadows a real route in dist/`);
  assert.ok(exists(target), `redirect target ${target} (from ${source}) does not exist in dist/`);
}

// Real routes must never be captured by the prefix rules.
for (const real of [
  '/',
  '/bank/sbi/',
  '/banks/public-sector/',
  '/missed-call/sbi/',
  '/mobile-number-registration/pnb/',
  '/number-lookup/',
  '/sitemap-index.xml',
  '/robots.txt',
]) {
  assert.equal(resolveLegacyRedirect(real), null, `${real} must not be redirected`);
}

// The three crawler-harvested literal paths resolve to their vertical hubs.
assert.equal(resolveLegacyRedirect('/bank/${e.slug}/'), '/banks/');
assert.equal(resolveLegacyRedirect('/missed-call/${e.slug}/'), '/missed-call/');
assert.equal(resolveLegacyRedirect('/customer-care/%24%7Be.slug%7D/'), '/customer-care/');
// Vertical-name typos, with and without a trailing slash.
assert.equal(resolveLegacyRedirect('/mobile-registration/pnb/'), '/mobile-number-registration/pnb/');
assert.equal(resolveLegacyRedirect('/mobile_number-registration/pnb'), '/mobile-number-registration/pnb/');
// Doubled path pair collapses to the single pair.
assert.equal(
  resolveLegacyRedirect('/mobile-number-registration/iob/mobile-number-registration/iob/'),
  '/mobile-number-registration/iob/',
);
assert.equal(resolveLegacyRedirect('/banks/cooperative-bank/'), null);
assert.equal(resolveLegacyRedirect('/bank/central'), '/bank/central-bank/');

// The worker must actually consult the map.
const worker = fs.readFileSync('src/worker.ts', 'utf8');
assert.match(worker, /resolveLegacyRedirect\(url\.pathname\)/, 'worker.ts no longer calls the resolver');
assert.match(worker, /hostname === `www\.\$\{CANONICAL_HOST\}`/, 'worker.ts lost the www → apex fold');

// Regression gate: no served HTML may contain a URL written as a JS template
// literal — Googlebot's parser harvested `/bank/${e.slug}/` from
// /number-lookup/ and crawled it into 404s.
const offenders = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(full, 'utf8');
      // Only crawlable URL hrefs count: "/...${...}" or "http...${...}".
      // Inside an inline script the quotes arrive backslash-escaped
      // (href=\"/bank/${e.slug}/\"), which is exactly the form Googlebot parsed.
      // tel:${...} / mailto: templates are not fetchable paths.
      if (/href=\\?"(?:\/|https?:\/\/)[^"]*\$\{[^"]*\\?"/.test(html)) offenders.push(full);
    }
  }
};
walk(DIST);
assert.deepEqual(offenders, [], `HTML contains template-literal hrefs: ${offenders.join(', ')}`);

console.log('Legacy redirect map, crawler-harvest gate and worker wiring are consistent.');
