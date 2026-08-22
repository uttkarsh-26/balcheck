import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';
import { categorySlug, getJsonLdScripts, findSchema } from './utils';

const ctrTitles: Record<string, string> = {
  boi: 'BOI बैलेंस चेक नंबर 9811255430 | Missed Call',
  bandhan: 'बंधन बैंक बैलेंस चेक नंबर 9223008666 | Bandhan Bank',
  sbi: 'SBI बैलेंस चेक नंबर 09223766666 | मिस्ड कॉल सेवा',
  'baroda-up-gramin': 'Baroda UP Gramin Bank Balance Check Number 9986454440',
  'idfc-first': 'IDFC FIRST बैलेंस चेक नंबर 18002700720 | Missed Call',
  kvb: 'KVB बैलेंस चेक नंबर 09266292666 | Karur Vysya Missed Call',
  cosmos: 'Cosmos Bank Balance Check Number 9029013793',
  maharashtra: 'Bank of Maharashtra Balance Check Number 9833335555',
  icici: 'ICICI Bank Balance Check Number 9594612612',
  axis: 'Axis Bank Balance Enquiry Number 18004195959 | Missed Call',
  'up-gramin': 'Uttar Pradesh Gramin Bank Balance Check Number 9986454440',
  psb: 'PSB Balance Check Number 7039035156 | Punjab & Sind Bank',
  iob: 'Indian Overseas Bank Balance Check Number 9210622122',
  'central-bank': 'सेंट्रल बैंक बैलेंस चेक नंबर 9555244442 | Missed Call',
  'mp-gramin': 'MPGB Balance Check Number 8010968293 | Missed Call',
  'indian-bank': 'Indian Bank Balance Check Number 7827170170',
};

const sprint3Banks = new Set(['canara', 'psb', 'boi']);
const englishAnswerTitleBanks = new Set(['up-gramin', 'psb']);
const exactQueryTitleBanks = new Set(['axis']);

for (const bank of banks) {
  test.describe(`/bank/${bank.slug}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/bank/${bank.slug}`);
    });

    test('renders bank name and balance-enquiry number', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1, name: bank.nameHindi })).toBeVisible();
      await expect(page.locator('body')).toContainText(bank.missedCall);
    });

    test('keeps search metadata within snippet length contracts', async ({ page }) => {
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');

      expect(title.length).toBeLessThanOrEqual(60);
      expect(description).not.toBeNull();
      expect(description!.length).toBeLessThanOrEqual(155);
    });

    if (bank.slug === 'canara') {
      test('uses the scalable default title template', async ({ page }) => {
        await expect(page).toHaveTitle(
          `${bank.nameHindi} बैलेंस चेक नंबर ${bank.missedCall} | ${bank.shortName} Missed Call`
        );
      });

      test('uses the scalable default description and correct bank spelling', async ({ page }) => {
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        const expectedDescription = `${bank.nameHindi} (${bank.shortName}) का आधिकारिक बैलेंस चेक नंबर ${bank.missedCall} है। रजिस्टर्ड मोबाइल से मिस्ड कॉल दें, SMS में तुरंत बैलेंस पाएं। मुफ़्त, 24×7।`;

        expect(description).toBe(expectedDescription);
        expect(description).not.toContain('सिंद');
      });
    }

    test('call link uses tel: scheme', async ({ page }) => {
      const callLink = page.locator(`a[href="tel:${bank.missedCall}"]`).first();
      await expect(callLink).toBeVisible();
    });

    if (ctrTitles[bank.slug]) {
      test('uses the GSC-driven page title', async ({ page }) => {
        await expect(page).toHaveTitle(ctrTitles[bank.slug]);
      });

      if (englishAnswerTitleBanks.has(bank.slug)) {
        test('uses a concise English answer-in-title for English-dominant queries', async ({ page }) => {
          const title = await page.title();
          expect(title).toContain('Balance Check Number');
          expect(title).toContain(bank.missedCall);
          expect(title.length).toBeLessThanOrEqual(60);
        });
      }

      if (exactQueryTitleBanks.has(bank.slug)) {
        test('frontloads the exact balance-enquiry query and preserves a concise title', async ({ page }) => {
          const title = await page.title();
          const description = await page.locator('meta[name="description"]').getAttribute('content');
          expect(title).toContain('Balance Enquiry Number');
          expect(title).toContain(bank.missedCall);
          expect(title.length).toBeLessThanOrEqual(60);
          expect(description).toBe(`Axis Bank balance enquiry number: ${bank.missedCall}. आधिकारिक missed call सेवा — registered mobile से call करें, SMS में तुरंत बैलेंस पाएं। मुफ़्त, 24×7।`);
          expect(description?.length).toBeLessThanOrEqual(155);
        });
      }

      test('uses a verified, action-oriented meta description', async ({ page }) => {
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description).toContain('आधिकारिक');
        expect(description).toContain('तुरंत');
        if (bank.slug === 'boi') expect(description).toContain(bank.missedCallAlt);
      });
    }

    if (bank.balanceMode !== 'missed-call') {
      test('matches balance-check query intent without mislabeling customer-care lines', async ({ page }) => {
        const fullTitle = `${bank.name} Balance Check Number ${bank.missedCall}`;
        const expectedTitle = fullTitle.length <= 60
          ? fullTitle
          : `${bank.shortName} Balance Check Number ${bank.missedCall}`;
        const description = await page.locator('meta[name="description"]').getAttribute('content');

        await expect(page).toHaveTitle(expectedTitle);
        expect(expectedTitle.length).toBeLessThanOrEqual(60);
        expect(expectedTitle).not.toContain('Missed Call');
        expect(description).toContain(`${bank.name} balance check number ${bank.missedCall}`);
        expect(description).toContain('customer-care/IVR');
        expect(description).toContain('dedicated missed-call service verified नहीं है');
        expect(description?.length).toBeLessThanOrEqual(155);
      });
    }

    if (sprint3Banks.has(bank.slug)) {
      test('shows the Sprint 3 quick answer with the correct number', async ({ page }) => {
        const answer = page.locator('section').filter({
          hasText: `${bank.nameHindi} बैलेंस चेक नंबर:`,
        }).first();
        await expect(answer).toBeVisible();
        await expect(answer).toContainText(bank.missedCall);
        await expect(answer.locator(`a[href="tel:${bank.missedCall}"]`)).toBeVisible();
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
