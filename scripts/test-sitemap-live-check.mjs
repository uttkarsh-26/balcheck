// Unit tests for scripts/verify-sitemap-live.mjs — the post-deploy CI live
// sitemap gate. Covers: <loc> counting on minified XML, bounded retries,
// fail-on-mismatch semantics, workers.dev host resolution, and the CLI wiring
// (expected count read from local dist, both hosts verified).
//
// Run: node scripts/test-sitemap-live-check.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gate = await import('./verify-sitemap-live.mjs');

const TWO_LOC_XML =
  '<urlset><url><loc>https://balcheck.in/</loc></url>' +
  '<url><loc>https://balcheck.in/bank/sbi/</loc></url></urlset>';

// Stale build: served by an edge that has not propagated the new deploy yet.
const ONE_LOC_XML =
  '<urlset><url><loc>https://balcheck.in/</loc></url></urlset>';

test('countSitemapUrls counts <loc> in single-line minified XML', () => {
  assert.equal(gate.countSitemapUrls(TWO_LOC_XML), 2);
});

test('countSitemapUrls returns 0 for non-XML input', () => {
  assert.equal(gate.countSitemapUrls('<!doctype html><html></html>'), 0);
});

test('fetchSitemapCount retries transient failures then succeeds', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (calls.length < 3) throw new Error('boom (transient)');
    return new Response(TWO_LOC_XML, { status: 200 });
  };
  const { count, attempt } = await gate.fetchSitemapCount(
    'https://balcheck.in/sitemap-0.xml',
    { fetchImpl, retries: 4, delayMs: 1 }
  );
  assert.equal(count, 2);
  assert.equal(attempt, 3);
  assert.equal(calls.length, 3);
});

test('fetchSitemapCount throws after exhausting retries', async () => {
  const fetchImpl = async () => {
    throw new Error('always fails');
  };
  await assert.rejects(
    () =>
      gate.fetchSitemapCount('https://balcheck.in/sitemap-0.xml', {
        fetchImpl,
        retries: 2,
        delayMs: 1,
      }),
    /after 2 attempts/
  );
});

test('verifySitemapCounts fails on live/dist mismatch and reports each host', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('workers.dev')) {
      return new Response(TWO_LOC_XML, { status: 200 });
    }
    return new Response(
      '<urlset><url><loc>https://balcheck.in/</loc></url></urlset>',
      { status: 200 }
    );
  };
  await assert.rejects(
    () =>
      gate.verifySitemapCounts({
        expected: 2,
        hosts: ['balcheck.in', 'gate.balcheck.workers.dev'],
        fetchImpl,
        retries: 2,
        delayMs: 1,
      }),
    (err) =>
      err.message.includes('mismatch') &&
      err.message.includes('balcheck.in') &&
      err.message.includes('live=1')
  );
});

test('verifySitemapCounts retries successful-but-stale counts until edge catches up', async () => {
  // Early successful responses serve the stale count; a later one serves the
  // freshly deployed count. Must be retried (bounded) and pass.
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return new Response(calls.length <= 2 ? ONE_LOC_XML : TWO_LOC_XML, {
      status: 200,
    });
  };
  const results = await gate.verifySitemapCounts({
    expected: 2,
    hosts: ['balcheck.in'],
    fetchImpl,
    retries: 4,
    delayMs: 1,
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, true);
  assert.equal(results[0].count, 2);
  assert.equal(results[0].attempt, 3);
  assert.equal(calls.length, 3);
});

test('verifySitemapCounts fails a persistently stale host after bounded retries', async () => {
  // Every successful response serves the stale count forever: must fail with
  // the per-host report and stop after exactly `retries` attempts.
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(ONE_LOC_XML, { status: 200 });
  };
  await assert.rejects(
    () =>
      gate.verifySitemapCounts({
        expected: 2,
        hosts: ['balcheck.in'],
        fetchImpl,
        retries: 3,
        delayMs: 1,
      }),
    (err) =>
      err.message.includes('mismatch') &&
      err.message.includes('balcheck.in') &&
      err.message.includes('live=1')
  );
  assert.equal(calls, 3);
});

test('verifySitemapCounts passes when all hosts match', async () => {
  const fetchImpl = async () => new Response(TWO_LOC_XML, { status: 200 });
  const results = await gate.verifySitemapCounts({
    expected: 2,
    hosts: ['balcheck.in', 'gate.balcheck.workers.dev'],
    fetchImpl,
  });
  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.ok));
});

test('verifySitemapCounts treats bare hosts as https://<host>/sitemap-0.xml', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    return new Response('<urlset></urlset>', { status: 200 });
  };
  await gate.verifySitemapCounts({ expected: 0, hosts: ['balcheck.in'], fetchImpl });
  assert.equal(seen[0], 'https://balcheck.in/sitemap-0.xml');
});

test('resolveWorkersDevHost builds host from account subdomain API', async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ success: true, result: { subdomain: 'abc123' } }), {
      status: 200,
    });
  const host = await gate.resolveWorkersDevHost({
    accountId: 'acc',
    token: 'tok',
    env: {},
    fetchImpl,
  });
  assert.equal(host, 'balcheck.abc123.workers.dev');
});

test('resolveWorkersDevHost honors WORKERS_DEV_HOST override and skips the API', async () => {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    throw new Error('should not be called');
  };
  const host = await gate.resolveWorkersDevHost({
    accountId: 'acc',
    token: 'tok',
    env: { WORKERS_DEV_HOST: 'balcheck.example.workers.dev' },
    fetchImpl,
  });
  assert.equal(host, 'balcheck.example.workers.dev');
  assert.equal(called, false);
});

test('resolveWorkersDevHost throws without creds or override', async () => {
  await assert.rejects(
    () =>
      gate.resolveWorkersDevHost({
        accountId: '',
        token: '',
        env: {},
        fetchImpl: async () => {
          throw new Error('nope');
        },
      }),
    /WORKERS_DEV_HOST/
  );
});

test('main reads expected count from local dist and verifies both hosts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'balcheck-gate-'));
  try {
    mkdirSync(join(dir, 'dist'), { recursive: true });
    writeFileSync(join(dir, 'dist', 'sitemap-0.xml'), TWO_LOC_XML);
    const seen = [];
    const fetchImpl = async (url) => {
      seen.push(url);
      return new Response(TWO_LOC_XML, { status: 200 });
    };
    const code = await gate.main({
      env: {
        WORKERS_DEV_HOST: 'balcheck.abc.workers.dev',
        CLOUDFLARE_API_TOKEN: 'x',
        CLOUDFLARE_ACCOUNT_ID: 'y',
      },
      argv: ['node', 'verify-sitemap-live.mjs'],
      cwd: dir,
      fetchImpl,
      log: () => {},
    });
    assert.equal(code, 0);
    assert.deepEqual(seen, [
      'https://balcheck.in/sitemap-0.xml',
      'https://balcheck.abc.workers.dev/sitemap-0.xml',
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('main fails on live/dist mismatch', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'balcheck-gate-'));
  try {
    mkdirSync(join(dir, 'dist'), { recursive: true });
    writeFileSync(join(dir, 'dist', 'sitemap-0.xml'), TWO_LOC_XML);
    const fetchImpl = async () =>
      new Response('<urlset><url><loc>https://balcheck.in/</loc></url></urlset>', {
        status: 200,
      });
    await assert.rejects(
      () =>
        gate.main({
          env: { WORKERS_DEV_HOST: 'balcheck.abc.workers.dev' },
          argv: ['node', 'x'],
          cwd: dir,
          fetchImpl,
          log: () => {},
          retries: 2,
          delayMs: 1,
        }),
      /mismatch/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
