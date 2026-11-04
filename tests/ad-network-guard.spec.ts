import { expect, isAdNetworkRequest, test } from './fixtures';
import { probeCollectorPort, withFakeCollector } from './ad-network-collector';
import type { Browser } from '@playwright/test';

// Offline is a fail-safe: this regression can prove the fixture blocks the
// production ad loader without ever sending a real request to Google.
test('browser tests block the AdSense loader before it reaches the network', async ({ page, context }) => {
  await context.setOffline(true);
  const failed = page.waitForEvent('requestfailed', {
    predicate: (request) => request.url().includes('/pagead/js/adsbygoogle.js'),
  });
  await page.setContent('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2164302228306652"></script>');
  const request = await failed;
  expect(request.failure()?.errorText).toContain('ERR_BLOCKED_BY_CLIENT');
});

test('the block matches real ad/analytics hosts by label and leaves lookalikes alone', () => {
  const blocked = [
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2164302228306652',
    'https://googleads.g.doubleclick.net/pagead/ads?client=ca-pub-2164302228306652',
    'https://www.googleadservices.com/pagead/conversion/123',
    'https://www.googletagmanager.com/gtag/js?id=G-TEST123456',
    'https://googletagmanager.com/gtm.js?id=GTM-TEST1',
    'https://www.google-analytics.com/g/collect?v=2&tid=G-TEST123456',
    'https://region1.google-analytics.com/g/collect?v=2&tid=G-TEST123456',
    'https://ssl.google-analytics.com/j/collect?v=1',
    'https://analytics.google.com/g/collect?v=2&tid=G-TEST123456',
    // Endpoint shape on an unexpected host still dies: a collector fronted by a
    // CDN or a renamed host is the same invalid-traffic surface.
    'https://collector.example.test/g/collect?v=2&tid=G-TEST123456',
    'https://www.google-analytics.com.attacker.test/g/collect?v=2',
    // A trailing dot (or several) is the same DNS label boundary: the dotted
    // spelling resolves to the network host, so the label rule must normalize it
    // rather than fall through to the path rules — `/tag/js` has no path rule.
    'https://www.google-analytics.com./tag/js',
    'https://www.googletagmanager.com../gtag/js?id=G-TEST123456',
  ];
  const allowed = [
    // Lookalikes: the label is not the network's host, so a host-only rule must
    // not reach them (their paths are deliberately not collector endpoints).
    'https://notgoogletagmanager.com/gtag/js?id=G-TEST123456',
    'https://www.googletagmanager.com.attacker.test/gtag/js?id=G-TEST123456',
    'https://www.google-analytics.com.attacker.test/tag.js',
    'https://mygoogle-analytics.com/collect?v=2',
    'https://google-analytics.co/gtag/js',
    // Dotted lookalikes stay lookalikes: normalization trims the trailing dot at
    // the label boundary, it does not turn a foreign parent domain into a real one.
    'https://www.google-analytics.com.attacker.test./tag/js',
    'https://mygoogle-analytics.com./collect?v=2',
    // A custom host that merely mentions a real endpoint in its query is not
    // that endpoint; no real host is exempted either.
    'https://proxy.example.test/redirect?next=https%3A%2F%2Fwww.google-analytics.com%2Fg%2Fcollect',
    // URL-parser fallbacks: an unparseable string throws and a non-http scheme is
    // not a request to anyone, so both pass without reaching the host rules.
    'not a url',
    'data:text/html,<script></script>',
    'blob:https://example.test/abc',
    // Ordinary site traffic.
    'http://127.0.0.1:4321/',
    'http://127.0.0.1:4321/_astro/index.abc123.js',
    'http://127.0.0.1:4321/favicon.svg',
    'https://cdn.example.test/assets/collect-data.json',
  ];

  for (const url of blocked) expect(isAdNetworkRequest(url), `${url} must be blocked`).toBe(true);
  for (const url of allowed) expect(isAdNetworkRequest(url), `${url} must pass through`).toBe(false);
});

/**
 * Runtime proof, not a predicate test: a fake collector is really listening on
 * a local port, the browser is really pointed at it for the ad/analytics hosts,
 * and a page inside a blocked context really tries to reach them. The collector
 * and its browser live in tests/ad-network-collector.ts; the harness talks plain
 * http so the collector can be a plain-http server, and the block matches
 * host+path, so the production https URLs are covered by the table test above.
 */
test('a fake collector sees zero ad/analytics traffic while ordinary resources still load', async () => {
  await withFakeCollector(async ({ page, hits, url }) => {
    const attempted: string[] = [];
    const blocked: string[] = [];
    const answered: string[] = [];
    page.on('request', (request) => {
      if (isAdNetworkRequest(request.url())) attempted.push(request.url());
    });
    page.on('requestfailed', (request) => {
      if (isAdNetworkRequest(request.url())) blocked.push(request.url());
    });
    page.on('response', (response) => {
      if (isAdNetworkRequest(response.url())) answered.push(response.url());
    });

    await page.goto(url, { waitUntil: 'load' });

    // The harness really runs: its ordinary same-origin script and image load,
    // and its cross-host proof request reaches the collector.
    await expect.poll(() => hits.filter((hit) => hit.path === '/site.js').length).toBeGreaterThan(0);
    await expect.poll(() => hits.filter((hit) => hit.path === '/pixel.gif').length).toBeGreaterThan(0);
    await expect.poll(() => hits.filter((hit) => hit.path === '/proof.txt').length).toBeGreaterThan(0);
    expect(
      await page.evaluate(() => (window as unknown as { __siteScriptLoaded?: boolean }).__siteScriptLoaded),
      'ordinary page scripts must still execute under the block',
    ).toBe(true);

    // The attempts happened — the page really asked GA/GTM for data — and every
    // one of them died in the block, never answered. Polled, not sampled once:
    // the gtag script and the `new Image()` collect can still be failing after
    // the first attempt lands, so a single equality races the event stream.
    await expect.poll(() => attempted.length).toBeGreaterThan(0);
    await expect.poll(() => [...blocked].sort()).toEqual([...attempted].sort());
    expect(answered, 'no ad/analytics request may be answered').toEqual([]);

    // The collector never saw a single ad/analytics request.
    const leaked = hits.filter((hit) => isAdNetworkRequest(`http://${hit.host}${hit.path}`));
    expect(leaked, `the fake collector must see zero GA/GTM traffic, saw ${JSON.stringify(leaked)}`).toEqual(
      [],
    );
  });
});

/**
 * Failure path, executed rather than described: the launch rejects, so no page
 * is ever opened and the only code that can close the collector is the helper's
 * finally block. The port probe is the evidence that it did.
 */
test('a browser that never launches still closes the collector', async () => {
  let port = 0;
  await expect(
    withFakeCollector(
      async () => {
        throw new Error('the harness body must not run when the launch fails');
      },
      {
        launch: async () => {
          throw new Error('injected launch failure: no browser binary');
        },
        onListening: (listeningPort) => {
          port = listeningPort;
        },
      },
    ),
  ).rejects.toThrow('injected launch failure');
  expect(port, 'the collector must be listening before the launch attempt').toBeGreaterThan(0);
  expect(await probeCollectorPort(port), `collector port ${port} must be closed`).toBe('ECONNREFUSED');
});

for (const bodyFails of [false, true]) {
  test(`collector closes when browser teardown rejects (body fails: ${bodyFails})`, async () => {
    let port = 0;
    const browser = {
      newContext: async () => ({ route: async () => {}, newPage: async () => ({}) }),
      close: async () => { throw new Error('injected browser close failure'); },
    } as unknown as Browser;
    await expect(withFakeCollector(async () => {
      if (bodyFails) throw new Error('original harness failure');
    }, {
      launch: async () => browser,
      onListening: (listeningPort) => { port = listeningPort; },
    })).rejects.toThrow(bodyFails ? 'original harness failure' : 'injected browser close failure');
    expect(port).toBeGreaterThan(0);
    expect(await probeCollectorPort(port)).toBe('ECONNREFUSED');
  });
}
