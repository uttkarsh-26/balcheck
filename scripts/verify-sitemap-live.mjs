// Post-deploy live sitemap gate.
//
// After `wrangler deploy` + cache purge, verify that the LIVE sitemap URL
// counts on balcheck.in and the workers.dev host match the locally built
// dist/sitemap-0.xml count, with bounded retries for edge propagation. Fails
// (exit 1) on any mismatch so stale/partial sitemap releases are caught in CI.
//
// No secrets beyond the existing workflow: uses CLOUDFLARE_ACCOUNT_ID and
// CLOUDFLARE_API_TOKEN (already present in the deploy job) to resolve the
// workers.dev hostname via the Workers subdomain API, or WORKERS_DEV_HOST to
// override.
//
// Run: node scripts/verify-sitemap-live.mjs [--expected <count>]
// Tests: node scripts/test-sitemap-live-check.mjs

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_RETRIES = 5;
const DEFAULT_DELAY_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 15_000;

/** Count URLs in a sitemap XML body (handles single-line minified output). */
export function countSitemapUrls(xml) {
  const matches = String(xml).match(/<loc>/g);
  return matches ? matches.length : 0;
}

async function fetchWithTimeout(url, { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a live sitemap and count its URLs, retrying up to `retries` times with
 * `delayMs` between attempts. Throws after the last attempt fails.
 *
 * When `expected` is provided, successful-but-stale counts (edge propagation)
 * are retried too: the attempt only succeeds when the served count matches
 * `expected`. After the last attempt, a still-stale count is returned as
 * `{ count, attempt, ok: false }` so callers can report it per host.
 */
export async function fetchSitemapCount(
  url,
  {
    fetchImpl = fetch,
    retries = DEFAULT_RETRIES,
    delayMs = DEFAULT_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    log = console.error,
    expected,
  } = {}
) {
  let lastErr;
  let lastCount;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { timeoutMs, fetchImpl });
      const text = await res.text();
      lastCount = countSitemapUrls(text);
      if (expected === undefined || lastCount === expected) {
        return { count: lastCount, attempt, ok: lastCount === expected };
      }
      // Successful but stale (new deploy not fully propagated yet): retry
      // within the same bounded budget as network errors.
      lastErr = new Error(`stale count ${lastCount} (expected ${expected})`);
      if (attempt < retries) {
        log(
          `sitemap gate: attempt ${attempt}/${retries} for ${url} served stale count ${lastCount}, expected ${expected}; retrying in ${delayMs}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        log(
          `sitemap gate: attempt ${attempt}/${retries} for ${url} failed: ${err.message}; retrying in ${delayMs}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  if (expected !== undefined && lastCount !== undefined) {
    return { count: lastCount, attempt: retries, ok: false };
  }
  throw new Error(
    `sitemap gate: could not fetch ${url} after ${retries} attempts: ${lastErr?.message}`
  );
}

/**
 * Resolve the workers.dev hostname for this worker (balcheck.<subdomain>.workers.dev).
 * Honors WORKERS_DEV_HOST; otherwise asks the Workers subdomain API with the
 * workflow's existing Cloudflare credentials.
 */
export async function resolveWorkersDevHost({
  accountId,
  token,
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  if (env.WORKERS_DEV_HOST) return env.WORKERS_DEV_HOST;
  if (!accountId || !token) {
    throw new Error(
      'sitemap gate: WORKERS_DEV_HOST or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN required to resolve the workers.dev host'
    );
  }
  const res = await fetchImpl(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`sitemap gate: workers subdomain API returned HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json?.success || !json?.result?.subdomain) {
    throw new Error(
      `sitemap gate: workers subdomain API returned no subdomain: ${JSON.stringify(json)}`
    );
  }
  return `balcheck.${json.result.subdomain}.workers.dev`;
}

/**
 * Verify every host serves exactly `expected` sitemap URLs. Throws with a
 * per-host report when any host mismatches; resolves to per-host results when
 * all match. Hosts may be bare hostnames (checked at /sitemap-0.xml over
 * https) or full URLs.
 */
export async function verifySitemapCounts({
  expected,
  hosts,
  fetchImpl = fetch,
  retries = DEFAULT_RETRIES,
  delayMs = DEFAULT_DELAY_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  log = console.error,
}) {
  const results = await Promise.all(
    hosts.map(async (host) => {
      const url = /^https?:\/\//.test(host) ? host : `https://${host}/sitemap-0.xml`;
      const { count, attempt, ok } = await fetchSitemapCount(url, {
        fetchImpl,
        retries,
        delayMs,
        timeoutMs,
        log,
        expected,
      });
      return { host, url, count, attempt, ok };
    })
  );
  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    throw new Error(
      'sitemap gate: live sitemap URL count mismatch\n' +
        failures.map((f) => `  ${f.host}: live=${f.count} expected=${expected}`).join('\n') +
        `\n  expected=${expected} (from local dist)`
    );
  }
  return results;
}

/**
 * CLI entry point. Expected count comes from --expected <n> or, by default,
 * from counting <loc> in the locally built dist/sitemap-0.xml.
 */
export async function main({
  env = process.env,
  argv = process.argv,
  cwd = process.cwd(),
  fetchImpl = fetch,
  log = console.error,
  retries = DEFAULT_RETRIES,
  delayMs = DEFAULT_DELAY_MS,
} = {}) {
  const argIndex = argv.indexOf('--expected');
  let expected;
  if (argIndex !== -1 && argv[argIndex + 1]) {
    expected = Number(argv[argIndex + 1]);
    if (!Number.isInteger(expected) || expected < 0) {
      throw new Error(`sitemap gate: invalid --expected value: ${argv[argIndex + 1]}`);
    }
  } else {
    const distPath = join(cwd, 'dist', 'sitemap-0.xml');
    const xml = readFileSync(distPath, 'utf8');
    expected = countSitemapUrls(xml);
  }

  const workersDevHost = await resolveWorkersDevHost({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    token: env.CLOUDFLARE_API_TOKEN,
    env,
    fetchImpl,
  });
  const hosts = ['balcheck.in', workersDevHost];

  const results = await verifySitemapCounts({ expected, hosts, fetchImpl, log, retries, delayMs });
  for (const r of results) {
    log(`sitemap gate OK: ${r.host} ${r.count} URLs (attempt ${r.attempt})`);
  }
  log(`sitemap gate PASS: all live hosts match local dist count ${expected}`);
  return 0;
}

// CLI entry guard: run only when executed directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
