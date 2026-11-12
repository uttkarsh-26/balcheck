import { test as base, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';

/**
 * Network isolation for the browser suite: one vocabulary, one predicate, one
 * block installed on every browser context Playwright creates.
 *
 * Why: the site ships the live AdSense loader and, on production hostnames, the
 * GA4 loader — so a page load from a localhost test run is a real
 * ad/measurement request. AdSense books it as a page view with zero
 * impressions and GA4 books a session: both are invalid-traffic surface on the
 * publisher account. Aborting on the context stops the request without touching
 * the page, so loader/tag contracts still assert against a DOM that renders
 * exactly as it ships.
 *
 * Matching is by hostname label, never by substring: `www.google-analytics.com`
 * and `region1.google-analytics.com` are the network's own hosts, while
 * `www.google-analytics.com.attacker.test` and `notgoogletagmanager.com` are
 * not — a substring rule gets both of those backwards.
 *
 * Scope: routing covers page loads plus any navigation/fetch a page issues.
 * API-request-context calls (the `request` fixture, `page.request`) are
 * Node-side HTTP and cannot be routed; no spec may reach a blocked host through
 * one. Neither site registers a service worker (no `serviceWorker` reference in
 * `src/`, `public/` or `tests/`), so nothing bypasses context routing today —
 * re-check this note before adding one.
 *
 * Guard: tests/ad-network-guard.spec.ts.
 */

/** One network owner: a label for the failure line plus its registrable host. */
export type BlockedHost = {
  readonly label: string;
  readonly host: string;
};

/** One endpoint shape: a label plus the path or token pattern that identifies it. */
export type BlockedPattern = {
  readonly label: string;
  readonly pattern: RegExp;
};

/**
 * Hosts every blocked network owns. A request to the host itself or to any
 * subdomain (`region1.`, `ssl.`, `www.`, `pagead2.` …) is blocked; lookalikes
 * that merely contain the string are not.
 */
export const AD_NETWORK_HOSTS: readonly BlockedHost[] = [
  { label: 'googlesyndication.com (adsbygoogle loader, tpc)', host: 'googlesyndication.com' },
  { label: 'doubleclick.net (ad serving, googleads, stats)', host: 'doubleclick.net' },
  { label: 'googleadservices.com (conversion, remarketing)', host: 'googleadservices.com' },
  { label: 'googletagservices.com (ad tag services)', host: 'googletagservices.com' },
  { label: 'adtrafficquality.google (ad quality, sodar)', host: 'adtrafficquality.google' },
  { label: 'google-analytics.com (GA4 collection, regional + subdomains)', host: 'google-analytics.com' },
  { label: 'analytics.google.com (GA4 endpoint)', host: 'analytics.google.com' },
  { label: 'googletagmanager.com (gtag.js loader, GTM containers)', host: 'googletagmanager.com' },
];

/**
 * Path shapes that identify a network endpoint even on an unexpected host, so a
 * moved or CDN-fronted collector cannot slip through. Matched against
 * `pathname` only: a query string that merely mentions one of these paths is
 * not that endpoint.
 */
export const AD_NETWORK_PATH_PATTERNS: readonly BlockedPattern[] = [
  { label: 'adsbygoogle.js loader on any host', pattern: /^\/adsbygoogle\.js$/i },
  { label: 'GA4 /g/collect collector on any host', pattern: /^\/g\/collect$/i },
  { label: 'GA4 /j/collect collector on any host', pattern: /^\/j\/collect$/i },
];

/** Host-independent endpoint tokens, matched against path + query. */
export const AD_NETWORK_URL_TOKENS: readonly BlockedPattern[] = [
  { label: 'google-adsense endpoints', pattern: /google-adsense/i },
];

const hostMatches = (hostname: string, host: string): boolean =>
  hostname === host || hostname.endsWith(`.${host}`);

/**
 * The blocked-network label for `url`, or `null` when the request is ordinary.
 * Only http(s) is inspected; other schemes (`data:`, `blob:` …) are not
 * requests to anyone.
 */
export const adNetworkBlockReason = (url: string | URL): string | null => {
  let parsed: URL;
  try {
    parsed = typeof url === 'string' ? new URL(url) : url;
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  // A trailing dot is the same DNS label boundary (`www.google-analytics.com.`
  // resolves identically), so strip it before matching — otherwise a dotted
  // spelling walks past the host rule and only the path rules could catch it.
  const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  for (const entry of AD_NETWORK_HOSTS) {
    if (hostMatches(hostname, entry.host)) return entry.label;
  }
  for (const entry of AD_NETWORK_PATH_PATTERNS) {
    if (entry.pattern.test(parsed.pathname)) return entry.label;
  }
  const pathAndQuery = `${parsed.pathname}${parsed.search}`;
  for (const entry of AD_NETWORK_URL_TOKENS) {
    if (entry.pattern.test(pathAndQuery)) return entry.label;
  }
  return null;
};

/** True when a request must die before it leaves the machine. */
export const isAdNetworkRequest = (url: string | URL): boolean => adNetworkBlockReason(url) !== null;

/**
 * Abort every blocked-network request on `context`. Exported so a spec that
 * launches its own browser (the fake-collector regression) installs the exact
 * same block instead of a copy.
 */
export const installAdNetworkBlock = async (context: BrowserContext): Promise<void> => {
  await context.route(isAdNetworkRequest, (route) => route.abort('blockedbyclient'));
};

// All specs import test from this fixture; production ad/analytics tags remain unchanged.
export const test = base.extend<{ localOnlyNetwork: boolean }>({
  localOnlyNetwork: [false, { option: true }],
  serviceWorkers: async ({ serviceWorkers, localOnlyNetwork }, use) => {
    await use(localOnlyNetwork ? 'block' : serviceWorkers);
  },
  context: async ({ context, localOnlyNetwork }, use) => {
    await installAdNetworkBlock(context);
    // Opt-in strict isolation for source-scoped page tests: no remote requests.
    if (localOnlyNetwork) {
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
          ? route.fallback() : route.abort('blockedbyclient');
      });
    }
    await use(context);
  },
});

export { expect };
export type { Page } from '@playwright/test';
