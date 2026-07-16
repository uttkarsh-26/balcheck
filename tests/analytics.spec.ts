import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const layoutSource = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');

test('GA4 loader is restricted to production hostnames', () => {
  expect(layoutSource).toContain("window.location.hostname === 'balcheck.in'");
  expect(layoutSource).toContain("window.location.hostname === 'www.balcheck.in'");
  expect(layoutSource).toContain("gtag('config', 'G-ZEL0FEF89W')");
  expect(layoutSource).not.toMatch(/<script[^>]+src=["']https:\/\/www\.googletagmanager\.com\/gtag/i);
});

test('localhost does not initialize or request GA4', async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('googletagmanager.com/gtag')) analyticsRequests.push(request.url());
  });

  await page.goto('/');
  await page.waitForTimeout(250);

  expect(analyticsRequests).toEqual([]);
  await expect(page.locator('script[src*="googletagmanager.com/gtag"]')).toHaveCount(0);
  expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
});
