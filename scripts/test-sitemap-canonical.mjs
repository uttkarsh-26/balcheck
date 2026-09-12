// Unit tests for scripts/verify-sitemap-canonical.mjs — the offline sitemap ↔
// canonical gate. Covers: loc/canonical extraction on minified XML + HTML,
// dist path mapping, and fail-closed semantics for the two real regressions
// (URL listed but not built, and canonical pointing at another page).
//
// Run: node scripts/test-sitemap-canonical.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gate = await import('./verify-sitemap-canonical.mjs');

const page = (canonical) =>
  canonical
    ? `<!doctype html><html><head><link rel="canonical" href="${canonical}"></head><body>x</body></html>`
    : '<!doctype html><html><head></head><body>x</body></html>';

const sitemap = (...urls) =>
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  urls.map((u) => `<url><loc>${u}</loc></url>`).join('') +
  '</urlset>';

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'balcheck-sitemap-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

test('normalise strips trailing slash and www', () => {
  assert.equal(gate.normalise('https://www.balcheck.in/bank/sbi/'), 'https://balcheck.in/bank/sbi');
});

test('extractLocs reads minified single-line sitemap XML', () => {
  assert.deepEqual(gate.extractLocs(sitemap('https://balcheck.in/', 'https://balcheck.in/bank/sbi/')), [
    'https://balcheck.in/',
    'https://balcheck.in/bank/sbi/',
  ]);
});

test('extractCanonical finds the link regardless of attribute order', () => {
  assert.equal(
    gate.extractCanonical('<link href="https://balcheck.in/x/" rel="canonical">'),
    'https://balcheck.in/x/',
  );
  assert.equal(gate.extractCanonical(page(null)), null);
});

test('distFileFor maps URL to built index.html', () => {
  assert.equal(gate.distFileFor('/tmp/dist', 'https://balcheck.in/bank/sbi/'), '/tmp/dist/bank/sbi/index.html');
  assert.equal(gate.distFileFor('/tmp/dist', 'https://balcheck.in/'), '/tmp/dist/index.html');
});

test('passes when every sitemap URL self-canonicalises', () => {
  const dir = fixture({
    'sitemap-index.xml': sitemap('https://balcheck.in/sitemap-0.xml'),
    'sitemap-0.xml': sitemap('https://balcheck.in/', 'https://balcheck.in/bank/sbi/'),
    'index.html': page('https://balcheck.in/'),
    'bank/sbi/index.html': page('https://balcheck.in/bank/sbi/'),
  });
  const { checked, offenders } = gate.checkSitemapCanonicals(dir);
  assert.equal(checked, 2);
  assert.deepEqual(offenders, []);
  rmSync(dir, { recursive: true, force: true });
});

test('fails when a sitemap URL canonicalises to another page (legacy toll-free regression)', () => {
  const dir = fixture({
    'sitemap-index.xml': sitemap('https://balcheck.in/sitemap-0.xml'),
    'sitemap-0.xml': sitemap('https://balcheck.in/toll-free-number/kotak/'),
    'toll-free-number/kotak/index.html': page('https://balcheck.in/customer-care/kotak/'),
  });
  const { offenders } = gate.checkSitemapCanonicals(dir);
  assert.equal(offenders.length, 1);
  assert.match(offenders[0].reason, /canonical points elsewhere/);
  rmSync(dir, { recursive: true, force: true });
});

test('fails when a sitemap URL has no built page', () => {
  const dir = fixture({
    'sitemap-0.xml': sitemap('https://balcheck.in/gone/'),
  });
  const { offenders } = gate.checkSitemapCanonicals(dir);
  assert.equal(offenders.length, 1);
  assert.match(offenders[0].reason, /no built page/);
  rmSync(dir, { recursive: true, force: true });
});

test('fails when a built page omits the canonical tag', () => {
  const dir = fixture({
    'sitemap-0.xml': sitemap('https://balcheck.in/about/'),
    'about/index.html': page(null),
  });
  const { offenders } = gate.checkSitemapCanonicals(dir);
  assert.equal(offenders.length, 1);
  assert.match(offenders[0].reason, /no <link rel="canonical">/);
  rmSync(dir, { recursive: true, force: true });
});
