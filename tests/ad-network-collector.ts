import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import type { AddressInfo } from 'node:net';
import { installAdNetworkBlock } from './fixtures';

/**
 * Fake ad/measurement collector behind the runtime isolation regression.
 *
 * The regression needs its own browser (it sets `--host-resolver-rules`, which
 * maps the GA/GTM hostnames onto this collector, so a request the block misses
 * lands in `hits` and fails the spec instead of reaching Google). This module
 * owns that whole browser+collector lifecycle so the spec asserts behaviour and
 * the lifecycle itself is exercised, including the path where the launch fails.
 *
 * `launch` is injectable for exactly that reason: a failing launch is
 * reproducible in-process, and the caller can prove the collector socket was
 * closed after it — no source-string assertion involved.
 */

/** GA/GTM hostnames the resolver maps onto the local collector. */
export const COLLECTOR_AD_HOSTS: readonly string[] = [
  'www.googletagmanager.com',
  'googletagmanager.com',
  'www.google-analytics.com',
  'region1.google-analytics.com',
  'ssl.google-analytics.com',
  'analytics.google.com',
];

/** One request the collector actually received. */
export type CollectorHit = { readonly host: string; readonly path: string };

export type CollectorSession = {
  readonly page: Page;
  readonly hits: readonly CollectorHit[];
  readonly port: number;
  /** Harness page URL on the collector: the page whose requests are under test. */
  readonly url: string;
};

export type CollectorHarnessOptions = {
  /**
   * Browser factory. Production runs the real `chromium.launch`; the
   * launch-failure regression (launch-failure regression test) rejects here.
   */
  readonly launch?: (args: string[]) => Promise<Browser>;
  /** Called once the collector is listening, so a failure run can probe the port. */
  readonly onListening?: (port: number) => void;
};

// Synthetic harness page served by the fake collector itself — no production
// markup, and no `integrity` attribute on purpose: the gtag URL is the bait that
// must be requested and then aborted by the block, so it can never be loaded.
const HARNESS_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>collector harness</title>
<script src="http://www.googletagmanager.com/gtag/js?id=G-TEST123456"></script>
</head><body>
<script src="/site.js"></script>
<img src="/pixel.gif" alt="">
<script>
  fetch('http://www.google-analytics.com/g/collect?v=2&tid=G-TEST123456', { keepalive: true }).catch(() => {});
  new Image().src = 'http://region1.google-analytics.com/g/collect?v=2&tid=G-TEST123456';
  fetch('http://ordinary-resource.test/proof.txt').catch(() => {});
</script>
</body></html>`;

const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Run `body` against a real page in a private browser whose ad/analytics hosts
 * resolve to a local collector. The collector and the browser are closed on
 * every exit path — including a failed launch, where nothing else would ever
 * close the listening socket. A cleanup failure never replaces the error that
 * explains the run.
 */
export const withFakeCollector = async (
  body: (session: CollectorSession) => Promise<void>,
  { launch = (args) => chromium.launch({ args }), onListening }: CollectorHarnessOptions = {},
): Promise<void> => {
  const hits: CollectorHit[] = [];
  const server = createServer((req, res) => {
    const host = (req.headers.host ?? '').split(':')[0].toLowerCase();
    const path = req.url ?? '/';
    hits.push({ host, path });
    if (path === '/harness.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(HARNESS_HTML);
      return;
    }
    if (path === '/site.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end('window.__siteScriptLoaded = true;');
      return;
    }
    if (path === '/pixel.gif') {
      res.writeHead(200, { 'content-type': 'image/gif' });
      res.end(PIXEL_GIF);
      return;
    }
    if (path === '/proof.txt') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end('nope');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  onListening?.(port);

  const resolverRules = [
    ...COLLECTOR_AD_HOSTS.map((host) => `MAP ${host}:80 127.0.0.1:${port}`),
    `MAP ordinary-resource.test:80 127.0.0.1:${port}`,
  ].join(', ');

  let browser: Browser | undefined;
  let failed = false;
  try {
    browser = await launch([`--host-resolver-rules=${resolverRules}`]);
    const context = await browser.newContext();
    await installAdNetworkBlock(context);
    await body({ page: await context.newPage(), hits, port, url: `http://127.0.0.1:${port}/harness.html` });
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    // Browser first, so no keep-alive socket holds the server open.
    const close = async (): Promise<void> => {
      try {
        await browser?.close();
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    };
    if (failed) await close().catch(() => undefined);
    else await close();
  }
};

/**
 * Connect once to `port` and report the outcome. `ECONNREFUSED` is the proof
 * that nothing is still listening — a stronger statement than a flag.
 */
export const probeCollectorPort = (port: number): Promise<string> =>
  new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve('connected');
    });
    socket.once('error', (error: NodeJS.ErrnoException) => resolve(error.code ?? 'error'));
    socket.setTimeout(2_000, () => {
      socket.destroy();
      resolve('timeout');
    });
  });
