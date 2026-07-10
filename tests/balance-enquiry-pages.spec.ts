import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';
import { getJsonLdScripts, findSchema } from './utils';

// Test a representative sample of banks (not all 64 to keep CI fast)
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
  test.describe(`/balance-enquiry/${bank.slug}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/balance-enquiry/${bank.slug}/`);
    });

    test('renders heading with bank short name', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1, name: bank.shortName })).toBeVisible();
    });

    test('displays missed call number', async ({ page }) => {
      await expect(page.locator('body')).toContainText(bank.missedCall);
    });

    test('has tel: link for missed call number', async ({ page }) => {
      const callLink = page.locator(`a[href="tel:${bank.missedCall}"]`).first();
      await expect(callLink).toBeVisible();
    });

    test('displays customer care number', async ({ page }) => {
      await expect(page.locator('body')).toContainText(bank.customerCare);
    });

    test('has HowTo JSON-LD schema', async ({ page }) => {
      const scripts = await getJsonLdScripts(page);
      const howToSchema = findSchema(scripts, 'HowTo') as Record<string, unknown> | undefined;
      expect(howToSchema).toBeDefined();
      const steps = Array.isArray(howToSchema?.step) ? howToSchema.step.length : 0;
      expect(steps).toBeGreaterThanOrEqual(3);
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

    test('links back to bank detail page', async ({ page }) => {
      const bankLink = page.locator(`a[href="/bank/${bank.slug}/"]`).first();
      await expect(bankLink).toBeVisible();
    });

    test('links to customer care page', async ({ page }) => {
      const ccLink = page.locator(`a[href="/customer-care/${bank.slug}/"]`).first();
      await expect(ccLink).toBeVisible();
    });

    test('shows alternative methods section', async ({ page }) => {
      await expect(page.locator('body')).toContainText('ATM');
      await expect(page.locator('body')).toContainText('net banking');
    });
  });
}

test.describe('balance-enquiry hub page', () => {
  test('lists all banks', async ({ page }) => {
    await page.goto('/balance-enquiry/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const bank of sampleBanks) {
      const link = page.locator(`a[href="/balance-enquiry/${bank.slug}/"]`);
      await expect(link).toBeVisible();
    }
  });

  test('has CollectionPage JSON-LD', async ({ page }) => {
    await page.goto('/balance-enquiry/');
    const scripts = await getJsonLdScripts(page);
    const collectionSchema = findSchema(scripts, 'CollectionPage') as Record<string, unknown> | undefined;
    expect(collectionSchema).toBeDefined();
  });
});
