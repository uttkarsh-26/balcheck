// Unit tests for src/worker.ts sitemap cache semantics.
//
// These prove the release-protection contract for XML responses:
//   - XML responses get a content-derived ETag (SHA-256 of the body) and
//     `Cache-Control: public, max-age=0, must-revalidate`.
//   - Incoming conditional headers (If-None-Match / If-Modified-Since) are
//     STRIPPED before hitting env.ASSETS.fetch, so a stale upstream ETag
//     (Workers static assets ETags were observed NOT changing across the old
//     448-URL and new 811-URL sitemap bodies) can never make upstream return
//     a stale 304 and pin old content.
//   - A 304 is returned only when the client ETag matches the CURRENT
//     content hash.
//   - HTML / API / non-XML static asset behavior is preserved.
//
// Run: node scripts/test-worker-cache.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const worker = await import('../src/worker.ts');

// The stale upstream validator observed in production: it stayed identical
// across the old 448-URL and new 811-URL sitemap bodies.
const STALE_UPSTREAM_ETAG = '"cb9d95665ed65fc757c2731fb935f902"';

const CURRENT_XML =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  '<url><loc>https://balcheck.in/</loc></url>' +
  '<url><loc>https://balcheck.in/bank/sbi/</loc></url>' +
  '<url><loc>https://balcheck.in/bank/hdfc/</loc></url>' +
  '</urlset>';

// Content-derived validator computed independently of the worker implementation.
const CURRENT_ETAG = `"${createHash('sha256').update(CURRENT_XML).digest('hex')}"`;

const HTML_BODY = '<!doctype html><html><body>home</body></html>';
const CSS_BODY = 'body { color: red; }';
const API_BODY = '{"ok":true}';

const HTML_ETAG = '"html-etag"';

/**
 * Fake ASSETS binding that simulates the production Workers static-assets
 * behavior: it 304s on its own *stored* ETag (which is stale with respect to
 * the current body) and records every upstream request it receives.
 */
function fakeAssets() {
  const seen = [];
  return {
    seen,
    async fetch(input) {
      const req = typeof input === 'string' ? new Request(input) : input;
      seen.push({ url: req.url, headers: new Headers(req.headers) });
      const path = new URL(req.url).pathname;
      const inm = req.headers.get('If-None-Match');
      const etagList = inm ? inm.split(',').map((s) => s.trim()) : [];

      if (path === '/sitemap-0.xml') {
        if (etagList.includes(STALE_UPSTREAM_ETAG)) {
          // Static-assets bug simulation: upstream 304s on its stored ETag
          // even though the current body differs from what that ETag covered.
          return new Response(null, { status: 304, headers: { ETag: STALE_UPSTREAM_ETAG } });
        }
        return new Response(CURRENT_XML, {
          headers: { 'Content-Type': 'application/xml' },
        });
      }
      if (path === '/') {
        if (etagList.includes(HTML_ETAG)) {
          return new Response(null, { status: 304, headers: { ETag: HTML_ETAG } });
        }
        return new Response(HTML_BODY, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      if (path.startsWith('/api/')) {
        return new Response(API_BODY, { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(CSS_BODY, { headers: { 'Content-Type': 'text/css' } });
    },
  };
}

test('XML sitemap: 200 carries content-derived ETag and must-revalidate cache-control', async () => {
  const assets = fakeAssets();
  const resp = await worker.handleRequest(
    new Request('https://balcheck.in/sitemap-0.xml'),
    { ASSETS: assets }
  );
  assert.equal(resp.status, 200);
  assert.equal(await resp.text(), CURRENT_XML);
  assert.equal(resp.headers.get('ETag'), CURRENT_ETAG);
  assert.equal(resp.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate');
});

test('XML sitemap: stale upstream If-None-Match cannot pin old content', async () => {
  const assets = fakeAssets();
  const resp = await worker.handleRequest(
    new Request('https://balcheck.in/sitemap-0.xml', {
      headers: { 'If-None-Match': STALE_UPSTREAM_ETAG },
    }),
    { ASSETS: assets }
  );
  // Without the fix, upstream sees the stale ETag, 304s, and the client keeps
  // the old body. With the fix, the conditional is stripped upstream, the
  // current body is served, and the stale validator is rejected.
  assert.equal(resp.status, 200);
  assert.equal(await resp.text(), CURRENT_XML);
  const upstreamReq = assets.seen[0];
  assert.equal(upstreamReq.headers.get('If-None-Match'), null);
  assert.equal(upstreamReq.headers.get('If-Modified-Since'), null);
});

test('XML sitemap: If-Modified-Since is stripped before upstream fetch', async () => {
  const assets = fakeAssets();
  const resp = await worker.handleRequest(
    new Request('https://balcheck.in/sitemap-0.xml', {
      headers: { 'If-Modified-Since': 'Wed, 01 Jan 2025 00:00:00 GMT' },
    }),
    { ASSETS: assets }
  );
  assert.equal(resp.status, 200);
  assert.equal(assets.seen[0].headers.get('If-Modified-Since'), null);
});

test('XML sitemap: current content ETag returns 304', async () => {
  const assets = fakeAssets();
  const first = await worker.handleRequest(
    new Request('https://balcheck.in/sitemap-0.xml'),
    { ASSETS: assets }
  );
  assert.equal(first.status, 200);
  const etag = first.headers.get('ETag');
  assert.equal(etag, CURRENT_ETAG);

  const second = await worker.handleRequest(
    new Request('https://balcheck.in/sitemap-0.xml', {
      headers: { 'If-None-Match': etag },
    }),
    { ASSETS: assets }
  );
  assert.equal(second.status, 304);
  assert.equal(second.headers.get('ETag'), CURRENT_ETAG);
  assert.equal(second.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate');
});

test('XML sitemap: stale (non-current) client ETag gets 200 with fresh body', async () => {
  const assets = fakeAssets();
  const resp = await worker.handleRequest(
    new Request('https://balcheck.in/sitemap-0.xml', {
      headers: { 'If-None-Match': '"some-old-client-etag"' },
    }),
    { ASSETS: assets }
  );
  assert.equal(resp.status, 200);
  assert.equal(await resp.text(), CURRENT_XML);
});

test('HTML: existing behavior preserved (conditional forwarded upstream, s-maxage cache-control)', async () => {
  const assets = fakeAssets();
  // Conditional request passes through unchanged: upstream 304 is relayed.
  const conditional = await worker.handleRequest(
    new Request('https://balcheck.in/', { headers: { 'If-None-Match': HTML_ETAG } }),
    { ASSETS: assets }
  );
  assert.equal(conditional.status, 304);
  assert.equal(assets.seen[0].headers.get('If-None-Match'), HTML_ETAG);

  const plain = await worker.handleRequest(new Request('https://balcheck.in/'), {
    ASSETS: assets,
  });
  assert.equal(plain.status, 200);
  assert.equal(
    plain.headers.get('Cache-Control'),
    'public, s-maxage=3600, max-age=0, stale-while-revalidate=86400'
  );
});

test('API: no-store behavior preserved', async () => {
  const assets = fakeAssets();
  const resp = await worker.handleRequest(
    new Request('https://balcheck.in/api/foo'),
    { ASSETS: assets }
  );
  assert.equal(resp.status, 200);
  assert.equal(await resp.text(), API_BODY);
  assert.equal(resp.headers.get('Cache-Control'), 'no-store, max-age=0');
});

test('non-XML static asset: pass-through preserved (no worker cache-control/ETag)', async () => {
  const assets = fakeAssets();
  const resp = await worker.handleRequest(
    new Request('https://balcheck.in/_astro/main.css'),
    { ASSETS: assets }
  );
  assert.equal(resp.status, 200);
  assert.equal(await resp.text(), CSS_BODY);
  assert.equal(resp.headers.get('Cache-Control'), null);
  assert.equal(resp.headers.get('ETag'), null);
});

test('etagMatches: exact, weak, comma-separated, and null handling', () => {
  assert.equal(worker.etagMatches('"abc"', '"abc"'), true);
  assert.equal(worker.etagMatches('W/"abc"', '"abc"'), true);
  assert.equal(worker.etagMatches('"xyz", "abc"', '"abc"'), true);
  assert.equal(worker.etagMatches('"xyz"', '"abc"'), false);
  assert.equal(worker.etagMatches(null, '"abc"'), false);
  assert.equal(worker.etagMatches(undefined, '"abc"'), false);
});
