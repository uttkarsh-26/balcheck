import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * AdSense monetization regression coverage (Monetag removed Sep 2026).
 *
 * Monetag Multitag was stripped ahead of Auto ads enablement: its vignette
 * collides with AdSense overlay formats and the old z-index reposition script
 * mutated Google anchor-ad iframes (z-index >= 2147480000). These tests keep
 * it removed and keep the AdSense integration intact.
 */
const layoutSource = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');

const adsenseLine = 'google.com, pub-2164302228306652, DIRECT, f08c47fec0942fa0';

test.describe('AdSense monetization regression', () => {
  test('Layout keeps the AdSense loader and drops Monetag entirely', () => {
    // AdSense async loader with approved publisher id + crossorigin must stay.
    expect(layoutSource).toMatch(
      /<script[\s\S]*?src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-2164302228306652"[\s\S]*?>/i
    );
    expect(layoutSource).toContain('crossorigin="anonymous"');

    // Monetag zones and their iframe-reposition script must stay removed.
    expect(layoutSource).not.toMatch(/quge5\.com/);
    expect(layoutSource).not.toContain('data-zone="251914"');
    expect(layoutSource).not.toContain('MONETAG_Z_INDEX_MIN');
    expect(layoutSource).not.toContain('positionTopAd');
  });

  test('Monetag script is absent on homepage', async ({ page }) => {
    await page.goto('/');
    const monetagScript = await page.locator('script[src*="quge5.com"]').count();
    expect(monetagScript).toBe(0);
  });

  test('Monetag script is absent on bank detail pages', async ({ page }) => {
    await page.goto('/bank/sbi');
    const monetagScript = await page.locator('script[src*="quge5.com"]').count();
    expect(monetagScript).toBe(0);
  });

  test('runtime page includes the AdSense loader only', async ({ page }) => {
    await page.goto('/');

    const adsenseLoader = page.locator(
      'head script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
    );
    await expect(adsenseLoader).toHaveCount(1);
    await expect(adsenseLoader).toHaveAttribute('crossorigin', 'anonymous');
    await expect(adsenseLoader).toHaveAttribute('src', /ca-pub-2164302228306652/);

    const monetagScripts = page.locator('head script[src*="quge5.com"], body script[src*="quge5.com"]');
    await expect(monetagScripts).toHaveCount(0);
  });

  test('ads.txt contains exact AdSense ownership line', async ({ request }) => {
    const response = await request.get('/ads.txt');
    expect(response.status()).toBe(200);
    expect(await response.text()).toBe(`${adsenseLine}\n`);
  });
});
