import { test, expect } from '@playwright/test';

/**
 * Brand / visual-system regression tests (docs/brand-tokens.md contract).
 * Guards the Sep 2026 visual audit fixes:
 *  - OG/Twitter social meta sitewide (Layout.astro ogImage default)
 *  - VideoObject schema hygiene (no embedUrl pointing at the page's own mp4)
 *  - Header chip rail: scrollbar-hide + scroll-fade affordance (global utilities)
 *  - Sticky header
 */

const PAGES = ['/', '/bank/sbi/', '/banks/public-sector/', '/customer-care/', '/how-it-works/'] as const;

test.describe('social meta contract (sitewide)', () => {
  for (const path of PAGES) {
    test(`og:image + twitter:card on ${path}`, async ({ page }) => {
      await page.goto(path);
      const ogImage = page.locator('meta[property="og:image"]');
      await expect(ogImage).toHaveCount(1);
      const content = await ogImage.getAttribute('content');
      expect(content).toMatch(/^https:\/\/balcheck\.in\//);

      const twitterCard = page.locator('meta[name="twitter:card"]');
      await expect(twitterCard).toHaveCount(1);
      expect(await twitterCard.getAttribute('content')).toBe('summary');

      await expect(page.locator('meta[property="og:site_name"]')).toHaveCount(1);
    });
  }
});

test.describe('video hero schema hygiene', () => {
  test('VideoObject has no embedUrl / embedUrl not a same-site video file', async ({ page }) => {
    await page.goto('/bank/sbi/');
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const videoSchemas = schemas
      .map(s => JSON.parse(s))
      .filter(s => s['@type'] === 'VideoObject');
    expect(videoSchemas.length).toBeGreaterThan(0);
    for (const schema of videoSchemas) {
      // embedUrl is for a player page; pointing it at the raw mp4 is invalid
      if ('embedUrl' in schema) {
        expect(schema.embedUrl).not.toMatch(/\.mp4$/);
      }
      expect(schema.contentUrl).toMatch(/\.mp4$/);
      expect(schema.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });
});

test.describe('header visual system', () => {
  for (const path of ['/', '/bank/sbi/'] as const) {
    test(`service rail is scroll affordance-styled on ${path}`, async ({ page }) => {
      await page.goto(path);
      const nav = page.locator('[data-testid="service-nav"]');
      const rail = nav.locator('.scrollbar-hide.scroll-fade');
      await expect(rail).toHaveCount(1);
    });

    test(`header is sticky on ${path}`, async ({ page }) => {
      await page.goto(path);
      const header = page.locator('[data-testid="global-header"]');
      await expect(header).toHaveClass(/sticky/);
    });
  }
});

test.describe('homepage footer dedupe', () => {
  test('exactly one footer element', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toHaveCount(1);
    // AdSense-required policy links stay reachable from the footer
    for (const href of ['/privacy/', '/about/', '/contact/']) {
      await expect(page.locator(`footer a[href="${href}"]`)).toHaveCount(1);
    }
  });
});
