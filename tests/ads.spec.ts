import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Monetag Multitag regression coverage.
 *
 * The manager must move only a visible, top-positioned Monetag iframe below the
 * rendered header. It must not hide injected ads or move bottom-positioned formats.
 */
const layoutSource = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');

const adsenseLine = 'google.com, pub-2164302228306652, DIRECT, f08c47fec0942fa0';

test.describe('Monetag ads regression', () => {
  test('Monetag Multitag script is present on homepage', async ({ page }) => {
    await page.goto('/');
    const monetagScript = await page.locator('script[src*="quge5.com"]').count();
    expect(monetagScript).toBeGreaterThan(0);
  });

  test('AdSense loader is present with approved publisher id and crossorigin', () => {
    expect(layoutSource).toMatch(
      /<script[\s\S]*?src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-2164302228306652"[\s\S]*?>/i
    );
    expect(layoutSource).toContain('crossorigin="anonymous"');
  });

  test('Monetag position manager is scoped and never hides iframe formats', () => {
    const managerStart = layoutSource.indexOf('const TOP_AD_THRESHOLD = 100;');
    const managerEnd = layoutSource.indexOf('</script>', managerStart);
    const manager = layoutSource.slice(managerStart, managerEnd);

    expect(managerStart).toBeGreaterThan(-1);
    expect(managerStart).toBeGreaterThan(layoutSource.indexOf('data-zone="251914"'));
    expect(manager).toContain("document.querySelector('header')");
    expect(manager).toContain('getBoundingClientRect().bottom');
    expect(manager).toContain('HEADER_HEIGHT_FALLBACK = 64');
    expect(manager).toContain("setProperty('top', `${offset}px`, 'important')");
    expect(manager).toContain('new MutationObserver(positionTopAd)');
    expect(manager).toContain('rect.width > 0');
    expect(manager).toContain('zIndex >= MONETAG_Z_INDEX_MIN');
    expect(manager).toContain('currentTop < TOP_AD_THRESHOLD');
    expect(manager).not.toMatch(/\.style\.display|setProperty\('display'/);
  });

  test('Monetag manager moves an asynchronously injected top iframe below the header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const headerBottom = await page.locator('header[data-testid="global-header"]').evaluate((header) => {
      return Math.ceil(header.getBoundingClientRect().bottom);
    });

    await page.evaluate(() => {
      const topAd = document.createElement('iframe');
      topAd.dataset.testMonetag = 'top';
      topAd.title = 'synthetic Monetag top ad';
      topAd.style.cssText = [
        'position: fixed',
        'top: 15px',
        'left: 0',
        'width: 390px',
        'height: 60px',
        'border: 0',
        'z-index: 2147483647',
      ].join(';');
      document.body.appendChild(topAd);

      const bottomAd = document.createElement('iframe');
      bottomAd.dataset.testMonetag = 'bottom';
      bottomAd.title = 'synthetic Monetag bottom ad';
      bottomAd.style.cssText = [
        'position: fixed',
        'right: 0',
        'bottom: 0',
        'width: 320px',
        'height: 50px',
        'border: 0',
        'z-index: 2147483647',
      ].join(';');
      document.body.appendChild(bottomAd);
    });

    await expect.poll(async () => page.locator('iframe[data-test-monetag="top"]').evaluate((iframe) => {
      return {
        top: iframe.getBoundingClientRect().top,
        priority: iframe instanceof HTMLIFrameElement ? iframe.style.getPropertyPriority('top') : '',
        display: getComputedStyle(iframe).display,
      };
    })).toEqual({ top: headerBottom, priority: 'important', display: 'block' });

    await expect(page.locator('iframe[data-test-monetag="bottom"]')).toHaveCSS('bottom', '0px');
    await expect(page.locator('iframe[data-test-monetag="bottom"]')).toHaveCSS('display', 'block');
  });

  test('Monetag script present on bank detail pages', async ({ page }) => {
    await page.goto('/bank/sbi');
    const monetagScript = await page.locator('script[src*="quge5.com"]').count();
    expect(monetagScript).toBeGreaterThan(0);
  });

  test('runtime page includes AdSense and Monetag script tags', async ({ page }) => {
    await page.goto('/');

    const adsenseLoader = page.locator(
      'head script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
    );
    await expect(adsenseLoader).toHaveCount(1);
    await expect(adsenseLoader).toHaveAttribute('crossorigin', 'anonymous');
    await expect(adsenseLoader).toHaveAttribute('src', /ca-pub-2164302228306652/);

    const monetagScripts = page.locator('head script[src*="quge5.com"], body script[src*="quge5.com"]');
    await expect(monetagScripts).toHaveCount(1);
  });

  test('ads.txt contains exact AdSense ownership line', async ({ request }) => {
    const response = await request.get('/ads.txt');
    expect(response.status()).toBe(200);
    expect(await response.text()).toBe(`${adsenseLine}\n`);
  });
});
