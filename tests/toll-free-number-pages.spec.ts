import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';
import { getJsonLdScripts, findSchema } from './utils';

const sampleBanks = [
  banks.find(b => b.slug === 'sbi')!,
  banks.find(b => b.slug === 'hdfc')!,
  banks.find(b => b.slug === 'icici')!,
  banks.find(b => b.slug === 'pnb')!,
  banks.find(b => b.slug === 'baroda-up-gramin')!,
  banks.find(b => b.slug === 'boi')!,
  banks.find(b => b.slug === 'psb')!,
  banks.find(b => b.slug === 'canara')!,
].filter(Boolean);

for (const bank of sampleBanks) {
  test.describe(`/toll-free-number/${bank.slug}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/toll-free-number/${bank.slug}/`);
    });

    test('renders heading with bank short name', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1, name: bank.shortName })).toBeVisible();
    });

    test('displays customer care number', async ({ page }) => {
      await expect(page.locator('body')).toContainText(bank.customerCare);
    });

    test('has tel: link for customer care', async ({ page }) => {
      const callLink = page.locator(`a[href="tel:${bank.customerCare}"]`).first();
      await expect(callLink).toBeVisible();
    });

    test('displays missed call balance number', async ({ page }) => {
      await expect(page.locator('body')).toContainText(bank.missedCall);
    });

    test('has ContactPage JSON-LD schema', async ({ page }) => {
      const scripts = await getJsonLdScripts(page);
      const contactSchema = findSchema(scripts, 'ContactPage') as Record<string, unknown> | undefined;
      expect(contactSchema).toBeDefined();
    });

    test('has FAQPage JSON-LD schema with 4+ FAQs', async ({ page }) => {
      const scripts = await getJsonLdScripts(page);
      const faqSchema = findSchema(scripts, 'FAQPage') as Record<string, unknown> | undefined;
      expect(faqSchema).toBeDefined();
      const faqCount = Array.isArray(faqSchema?.mainEntity)
        ? (faqSchema.mainEntity as unknown[]).length
        : 0;
      expect(faqCount).toBeGreaterThanOrEqual(4);
    });

    test('has BreadcrumbList JSON-LD schema', async ({ page }) => {
      const scripts = await getJsonLdScripts(page);
      const breadcrumbSchema = findSchema(scripts, 'BreadcrumbList') as Record<string, unknown> | undefined;
      expect(breadcrumbSchema).toBeDefined();
      const crumbs = Array.isArray(breadcrumbSchema?.itemListElement)
        ? (breadcrumbSchema.itemListElement as unknown[]).length
        : 0;
      expect(crumbs).toBeGreaterThanOrEqual(3);
    });

    test('has safety note section', async ({ page }) => {
      await expect(page.locator('body')).toContainText('OTP');
      await expect(page.locator('body')).toContainText('PIN');
    });

    test('links back to bank detail page', async ({ page }) => {
      const bankLink = page.locator(`a[href="/bank/${bank.slug}/"]`).first();
      await expect(bankLink).toBeVisible();
    });

    test('shows when to call section', async ({ page }) => {
      await expect(page.locator('body')).toContainText('card block');
    });
  });
}

test.describe('toll-free-number hub page', () => {
  test('lists all banks', async ({ page }) => {
    await page.goto('/toll-free-number/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const bank of sampleBanks) {
      const link = page.locator(`a[href="/toll-free-number/${bank.slug}/"]`);
      await expect(link).toBeVisible();
    }
  });

  test('has CollectionPage JSON-LD', async ({ page }) => {
    await page.goto('/toll-free-number/');
    const scripts = await getJsonLdScripts(page);
    const collectionSchema = findSchema(scripts, 'CollectionPage') as Record<string, unknown> | undefined;
    expect(collectionSchema).toBeDefined();
  });

  test('shows safety note', async ({ page }) => {
    await page.goto('/toll-free-number/');
    await expect(page.locator('body')).toContainText('OTP');
  });
});
