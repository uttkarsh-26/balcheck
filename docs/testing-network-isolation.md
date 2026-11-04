# E2E network isolation (ads + analytics)

The browser suite must never send a real ad or measurement request. Every spec
imports `test` from `tests/fixtures.ts`, whose `context` fixture installs
`installAdNetworkBlock(context)`; that aborts each request matching
`isAdNetworkRequest` with `ERR_BLOCKED_BY_CLIENT` before it leaves the machine.

## What is blocked

- **Hosts, matched by hostname label** (the host itself or a subdomain, never a
  substring): `googlesyndication.com`, `doubleclick.net`, `googleadservices.com`,
  `googletagservices.com`, `adtrafficquality.google`, `google-analytics.com`
  (covers `www.`, `ssl.`, `region1.` …), `analytics.google.com`,
  `googletagmanager.com` (gtag.js loader, GTM containers).
- **Endpoint paths on any host**: `/adsbygoogle.js`, `/g/collect`, `/j/collect`.
  A GA-shaped collector fronted by another host is the same invalid-traffic
  surface, so it dies too.
- **Token**: `google-adsense` in path + query.

Lookalikes (`notgoogletagmanager.com`, `www.google-analytics.com.attacker.test`)
and a proxy/custom host that merely mentions a GA URL in its query are **not**
blocked — a substring rule gets those backwards. A real endpoint is never
exempted by any custom-host rule. A trailing dot on the hostname
(`www.google-analytics.com.`) is the same DNS label boundary, so it is
normalized before matching; a dotted *lookalike*
(`www.google-analytics.com.attacker.test.`) is still not the network's host.

The tags stay in the DOM: the block is network-level only, so the AdSense and
GA4 contract specs still assert against markup that renders exactly as shipped.
BalCheck's GA4 loader is production-hostname-gated, so a localhost run would not
request it anyway; the block is defence in depth there (a spec that navigates a
production host, or a future un-gated loader, is still covered).

## Guard

- `tests/ad-network-guard.spec.ts`:
  - the original offline AdSense-loader regression (unchanged),
  - a classification table over real endpoints, lookalikes and ordinary URLs,
  - a **fake-collector runtime regression**: a local HTTP collector is really
    listening, `--host-resolver-rules` points the GA/GTM hostnames at it, and a
    harness page inside a blocked context tries to reach them. Asserted: the
    collector records zero GA/GTM requests, while the same page's ordinary
    script, image and cross-host proof request do reach it. The collector and
    its browser live in `tests/ad-network-collector.ts`.
  - a **launch-failure regression**: that helper takes an injectable launch, so
    an injected launch failure must still close the collector — proven by a real
    connect attempt getting `ECONNREFUSED` on that collector's port.

CI runs the whole `tests/` directory (`npx playwright test --project=chromium`),
so the guard is in the gated suite with no workflow change.

## Caveats

- `context.route` covers page loads and page-issued navigations/fetches. The
  Node-side `request` fixture / `page.request` cannot be routed; no spec reaches
  a blocked host through one.
- No service worker is registered by this site (no `serviceWorker` reference in
  `src/`, `public/`, `tests/`), so no fetch path bypasses context routing.
  Re-check this before adding one.
- The suite uses the existing `webServer` (`npm run build && npm run
  preview:static`), so the guard runs on the normal path, not a special config.
