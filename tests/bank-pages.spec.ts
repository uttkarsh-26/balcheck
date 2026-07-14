import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';
import { categorySlug, getJsonLdScripts, findSchema } from './utils';

const ctrTitles: Record<string, string> = {
  canara: 'केनरा बैंक बैलेंस चेक नंबर 8886610360 | Missed Call',
  psb: 'पंजाब एंड सिंद बैंक बैलेंस चेक नंबर 7039035156 | PSB',
  boi: 'BOI बैलेंस चेक नंबर 9811255430 | Bank of India',
  bandhan: 'बंधन बैंक बैलेंस चेक नंबर 9223008666 | Bandhan Bank',
  sbi: 'SBI बैलेंस चेक नंबर 09223766666 | मिस्ड कॉल सेवा',
  'baroda-up-gramin': 'बड़ौदा यूपी ग्रामीण बैंक बैलेंस चेक नंबर 9986454440 | Missed Call',
  'punjab-gramin': 'पंजाब ग्रामीण बैंक बैलेंस चेक नंबर 18001807777 | Missed Call',
  indusind: 'इंडसइंड बैंक बैलेंस चेक नंबर 18002741000 | IndusInd Missed Call',
  'idfc-first': 'IDFC FIRST बैलेंस चेक नंबर 18002700720 | Missed Call',
  kvb: 'KVB बैलेंस चेक नंबर 09266292666 | Karur Vysya Missed Call',
};

for (const bank of banks) {
  test.describe(`/bank/${bank.slug}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/bank/${bank.slug}`);
    });

    test('renders bank name and missed-call number', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1, name: bank.nameHindi })).toBeVisible();
      await expect(page.locator('body')).toContainText(bank.missedCall);
    });

    test('call link uses tel: scheme', async ({ page }) => {
      const callLink = page.locator(`a[href="tel:${bank.missedCall}"]`).first();
      await expect(callLink).toBeVisible();
    });

    if (ctrTitles[bank.slug]) {
      test('uses the GSC-driven page title', async ({ page }) => {
        await expect(page).toHaveTitle(ctrTitles[bank.slug]);
      });

      test('uses a verified, action-oriented meta description', async ({ page }) => {
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description).toContain('आधिकारिक');
        expect(description).toContain('तुरंत');
        if (bank.slug === 'boi') expect(description).toContain(bank.missedCallAlt);
      });
    }

    test('shows customer care and website fields', async ({ page }) => {
      await expect(page.locator('body')).toContainText(bank.customerCare);
      await expect(page.locator('body')).toContainText(bank.website.replace('https://www.', '').replace('https://', ''));
    });

    test('has required JSON-LD schemas', async ({ page }) => {
      const scripts = await getJsonLdScripts(page);
      const bankSchema = findSchema(scripts, 'BankOrCreditUnion') as Record<string, unknown> | undefined;
      const faqSchema = findSchema(scripts, 'FAQPage') as Record<string, unknown> | undefined;
      const howToSchema = findSchema(scripts, 'HowTo') as Record<string, unknown> | undefined;
      const breadcrumbSchema = findSchema(scripts, 'BreadcrumbList') as Record<string, unknown> | undefined;

      expect(bankSchema).toBeDefined();
      expect(bankSchema?.telephone).toBe(bank.missedCall);

      expect(faqSchema).toBeDefined();
      const faqCount = Array.isArray(faqSchema?.mainEntity)
        ? (faqSchema.mainEntity as unknown[]).length
        : 0;
      expect(faqCount).toBeGreaterThanOrEqual(4);

      expect(howToSchema).toBeDefined();
      expect(breadcrumbSchema).toBeDefined();
      const crumbs = Array.isArray(breadcrumbSchema?.itemListElement)
        ? (breadcrumbSchema.itemListElement as unknown[]).length
        : 0;
      expect(crumbs).toBeGreaterThanOrEqual(3);
    });

    test('breadcrumb links to home and correct category page', async ({ page }) => {
      await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText(bank.nameHindi);
      const categoryLink = page.locator(`nav[aria-label="Breadcrumb"] a[href="/banks/${categorySlug(bank.category)}/"]`);
      await expect(categoryLink).toBeVisible();
    });
  });
}
