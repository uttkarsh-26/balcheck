import { test, expect } from '@playwright/test';
import { banks, categories } from '../src/data/banks';
import { categorySlug } from './utils';

test.describe('sitemap', () => {
  test('sitemap index lists the main sitemap', async ({ request }) => {
    const response = await request.get('/sitemap-index.xml');
    expect(response.status()).toBe(200);

    const content = await response.text();
    expect(content).toContain('<sitemapindex');
    expect(content).toContain('/sitemap-0.xml');

    const sitemapRes = await request.get('/sitemap-0.xml');
    expect(sitemapRes.status()).toBe(200);
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain('<?xml');
    expect(sitemapText).toContain('<urlset');
  });

  test('sitemap contains bank and category URLs', async ({ request }) => {
    const response = await request.get('/sitemap-0.xml');
    const text = await response.text();

    for (const bank of banks) {
      expect(text).toContain(`https://balcheck.in/bank/${bank.slug}/`);
    }

    for (const category of categories) {
      expect(text).toContain(`https://balcheck.in/banks/${categorySlug(category)}/`);
    }

    expect(text).toContain('https://balcheck.in/how-it-works/');
    expect(text).toContain('https://balcheck.in/');
  });

  test('sampled pages return 200', async ({ request }) => {
    const samples = [
      '/',
      '/how-it-works/',
      '/banks/public-sector/',
      '/banks/private-sector/',
      '/bank/sbi/',
      '/bank/hdfc/',
      '/bank/icici/',
    ];

    for (const path of samples) {
      const res = await request.get(path);
      expect(res.status(), `${path} should return 200`).toBe(200);
    }
  });
});
