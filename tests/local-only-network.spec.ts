import { test, expect } from './fixtures';

test.describe('default network option', () => {
  test('omitted option defaults to false without making external calls', async ({ page, context, localOnlyNetwork }) => {
    expect(localOnlyNetwork).toBe(false);
    await context.setOffline(true);
    const failed = page.waitForEvent('requestfailed', { predicate: r => r.url().includes('default.invalid') });
    await page.goto('http://default.invalid/probe').catch(() => {});
    expect((await failed).failure()?.errorText).not.toContain('ERR_BLOCKED_BY_CLIENT');
  });
});

test.describe('local-only network option', () => {
  test.use({ localOnlyNetwork: true });
  test('blocks reserved remote host before transport and layers local handlers', async ({ page, context, baseURL, localOnlyNetwork }) => {
    expect(localOnlyNetwork).toBe(true);
    const robots = await page.goto('/robots.txt');
    expect(robots?.status()).toBe(200);
    expect(await robots?.text()).toContain('Sitemap:');
    expect(await page.evaluate(async () => (await navigator.serviceWorker.register('/sw.js')) === undefined)).toBe(true);
    expect(context.serviceWorkers()).toHaveLength(0);

    await context.route('**/adstub', route => route.fulfill({ status: 200, body: 'stubbed' }));
    expect(await page.evaluate(async () => (await fetch('/adstub')).text())).toBe('stubbed');

    const layered: string[] = [];
    await context.route('**/*', route => {
      layered.push(new URL(route.request().url()).pathname);
      return route.fallback();
    });

    const adFailure = page.waitForEvent('requestfailed', { predicate: r => r.url() === `${baseURL}/adsbygoogle.js` });
    await page.evaluate(() => fetch('/adsbygoogle.js').catch(() => {}));
    expect((await adFailure).failure()?.errorText).toContain('ERR_BLOCKED_BY_CLIENT');

    const remoteFailure = page.waitForEvent('requestfailed', { predicate: r => r.url() === 'https://remote.invalid/probe' });
    await page.evaluate(() => fetch('https://remote.invalid/probe').catch(() => {}));
    expect((await remoteFailure).failure()?.errorText).toContain('ERR_BLOCKED_BY_CLIENT');
    expect(layered).toEqual(expect.arrayContaining(['/adsbygoogle.js', '/probe']));
  });
});
