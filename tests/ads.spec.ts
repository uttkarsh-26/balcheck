import { test, expect } from '@playwright/test';

/**
 * Regression test: The ad-position-fix script (MutationObserver that set display:none
 * on "duplicate" top iframes) was killing Monetag Multitag ads. Monetag injects multiple
 * ad iframes through one tag — the fix script hid all but the first as "duplicates".
 *
 * This test ensures:
 * 1. The Monetag Multitag script tag is present
 * 2. No ad-position-fix / manageAds script exists that could hide injected ads
 */
test.describe('Monetag ads regression', () => {
  test('Monetag Multitag script is present on homepage', async ({ page }) => {
    await page.goto('/');
    const monetagScript = await page.locator('script[src*="quge5.com"]').count();
    expect(monetagScript).toBeGreaterThan(0);
  });

  test('no ad-position-fix script that hides iframes', async ({ page }) => {
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
});
