import { test, expect } from '@playwright/test';
import { gotoDom } from './utils';
import { readFileSync } from 'node:fs';
import { GA4_MEASUREMENT_ID } from '../src/lib/site-config';

const layoutSource = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
const siteConfigSource = readFileSync(new URL('../src/lib/site-config.ts', import.meta.url), 'utf8');

test('GA4 loader is restricted to production hostnames', () => {
  expect(layoutSource).toContain("window.location.hostname === 'balcheck.in'");
  expect(layoutSource).toContain("window.location.hostname === 'www.balcheck.in'");
  // The measurement id lives in exactly one place; Layout interpolates it.
  expect(siteConfigSource).toContain(`GA4_MEASUREMENT_ID = '${GA4_MEASUREMENT_ID}'`);
  expect(layoutSource).toContain("import { GA4_MEASUREMENT_ID } from '../lib/site-config'");
  expect(layoutSource).toContain("gtag('config', '${GA4_MEASUREMENT_ID}')");
  expect(layoutSource).toContain("gtag/js?id=${GA4_MEASUREMENT_ID}");
  // No hardcoded measurement id anywhere else in the layout.
  expect(layoutSource).not.toMatch(/G-[A-Z0-9]{10}/);
  expect(layoutSource).not.toMatch(/<script[^>]+src=["']https:\/\/www\.googletagmanager\.com\/gtag/i);
});

test('localhost does not initialize or request GA4', async ({ page }) => {
  const analyticsRequests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('googletagmanager.com/gtag')) analyticsRequests.push(request.url());
  });

  await gotoDom(page, '/');
  await page.waitForTimeout(250);

  expect(analyticsRequests).toEqual([]);
  await expect(page.locator('script[src*="googletagmanager.com/gtag"]')).toHaveCount(0);
  expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
});
