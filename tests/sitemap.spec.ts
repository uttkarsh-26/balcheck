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

  test('sitemap contains vertical hub URLs', async ({ request }) => {
    const response = await request.get('/sitemap-0.xml');
    const text = await response.text();

    const verticalHubs = [
      '/customer-care/',
      '/sms-banking/',
      '/net-banking/',
      '/mini-statement/',
      '/mobile-number-registration/',
      '/aadhaar-link/',
      '/atm-pin/',
      '/balance-enquiry/',
      '/toll-free-number/',
    ];

    for (const hub of verticalHubs) {
      expect(text, `sitemap should contain ${hub}`).toContain(`https://balcheck.in${hub}`);
    }
  });

  test('sitemap contains balance-enquiry and toll-free-number bank pages', async ({ request }) => {
    const response = await request.get('/sitemap-0.xml');
    const text = await response.text();

    // Check a sample of banks for each new vertical
    const sampleSlugs = ['sbi', 'hdfc', 'icici', 'pnb', 'boi', 'canara', 'psb', 'baroda-up-gramin'];

    for (const slug of sampleSlugs) {
      expect(text).toContain(`https://balcheck.in/balance-enquiry/${slug}/`);
      expect(text).toContain(`https://balcheck.in/toll-free-number/${slug}/`);
    }
  });

  test('bank pages have cross-links to new verticals', async ({ page }) => {
    await page.goto('/bank/sbi/');
    const balanceEnquiryLink = page.locator(`a[href="/balance-enquiry/sbi/"]`);
    const tollFreeLink = page.locator(`a[href="/toll-free-number/sbi/"]`);
    await expect(balanceEnquiryLink).toBeVisible();
    await expect(tollFreeLink).toBeVisible();
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
      '/balance-enquiry/',
      '/toll-free-number/',
      '/balance-enquiry/sbi/',
      '/toll-free-number/sbi/',
    ];

    for (const path of samples) {
      const res = await request.get(path);
      expect(res.status(), `${path} should return 200`).toBe(200);
    }
  });
});
