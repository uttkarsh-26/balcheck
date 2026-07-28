import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Regression test: The ad-position-fix script (MutationObserver that set display:none
 * on "duplicate" top iframes) was killing Monetag Multitag ads. Monetag injects multiple
 * ad iframes through one tag — the fix script hid all but the first as "duplicates".
 *
 * This test ensures:
 * 1. The Monetag Multitag script tag is present
 * 2. AdSense loader is present and has the approved publisher id
 * 3. ads.txt has the exact AdSense ownership line
 * 4. No ad-position-fix script exists that could hide injected ads
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

  test('No ad-position-fix script that hides iframes', async ({ page }) => {
    await page.goto('/');
    const pageContent = await page.content();

    // The buggy script contained manageAds and display:none logic
    expect(pageContent).not.toContain('manageAds');
    expect(pageContent).not.toContain('duplicate top ad');

    // No MutationObserver targeting iframes for ad manipulation
    const scripts = await page.locator('script').allTextContents();
    const hasAdObserver = scripts.some(
      (s) => s.includes('MutationObserver') && s.includes('iframe')
    );
    expect(hasAdObserver).toBe(false);
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
