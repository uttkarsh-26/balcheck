import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';
import { categorySlug, getJsonLdScripts, findSchema } from './utils';

const ctrTitles: Record<string, string> = {
  boi: 'BOI बैलेंस चेक नंबर 9811255430 | Missed Call',
  bandhan: 'Bandhan Bank Balance Check Number 9223008666 | Missed Call',
  hdfc: 'HDFC Bank Balance Check Number 18002703333 | Missed Call',
  'uco-bank': 'UCO Bank Balance Check Number 8334001234 | Missed Call',
  sbi: 'SBI बैलेंस चेक नंबर 09223766666 | मिस्ड कॉल सेवा',
  'baroda-up-gramin': 'Baroda UP Gramin Bank Balance Check Number 9986454440',
  'idfc-first': 'IDFC FIRST बैलेंस चेक नंबर 18002700720 | Missed Call',
  kvb: 'KVB बैलेंस चेक नंबर 09266292666 | Karur Vysya Missed Call',
  cosmos: 'Cosmos Bank Balance Check Number 9029013793',
  maharashtra: 'Bank of Maharashtra Balance Check Number 9833335555',
  icici: 'ICICI Bank Balance Check Number 9594612612',
  axis: 'Axis Bank Balance Enquiry Number 18004195959 | Missed Call',
  'up-gramin': 'Uttar Pradesh Gramin Bank WhatsApp Number नहीं | 9986454440',
  psb: 'Punjab & Sind Bank Balance Check Number 7039035156 | PSB',
  iob: 'Indian Overseas Bank Balance Check Number 9210622122',
  'central-bank': 'सेंट्रल बैंक बैलेंस चेक नंबर 9555244442 | Missed Call',
  'mp-gramin': 'MPGB Balance Check Number 8010968293 | Missed Call',
  'indian-bank': 'Indian Bank Balance Check Number 7827170170',
  canara: 'केनरा बैंक बैलेंस चेक नंबर 8886610360 | मिस्ड कॉल सेवा',
  indusind: 'IndusInd Bank Balance Check Number 18002741000 — Toll Free',
  'bihar-gramin': 'Bihar Gramin Bank Balance Check Number 1800-180-7777',
  'punjab-gramin': 'Punjab Gramin Bank Balance Check Number 18001807777',
  idbi: 'IDBI Bank Balance Check Number 18008431122 | Missed Call',
};

const sprint3Banks = new Set(['canara', 'psb', 'boi']);
// up-gramin left this set 2026-09-18: its top query cluster is the WhatsApp
// intent (2,705 impr, pos 8.3, ~0 clicks), so the title now leads with the
// WhatsApp answer + missed-call number instead of the generic English phrase.
const englishAnswerTitleBanks = new Set(['psb']);
const exactQueryTitleBanks = new Set(['axis']);

// Scalable-default contract: the missed-call template must still render for a
// bank with NO override, so resolve the carrier dynamically — hard-coding a
// slug here fails CI the moment that page earns its own CTR override.
const defaultTemplateBank = banks.find(
  bank => bank.balanceMode === 'missed-call' &&
    !ctrTitles[bank.slug] &&
    `${bank.nameHindi} बैलेंस चेक नंबर ${bank.missedCall} | ${bank.shortName} Missed Call`.length <= 60
);

for (const bank of banks) {
  test.describe(`/bank/${bank.slug}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/bank/${bank.slug}`);
    });

    test('renders bank name and balance-enquiry number', async ({ page }) => {
      // Demand-matched H1 overrides live in src/pages/bank/[slug].astro (h1Overrides);
      // keep this map in step with them — a new override without a matching entry
      // here fails CI on the wrong assertion.
      const h1Overrides: Record<string, string> = {
        psb: 'Punjab & Sind Bank (PSB) बैलेंस चेक नंबर',
        axis: `Axis Bank Balance Enquiry Number ${bank.missedCall}`,
      };
      const expectedH1 = h1Overrides[bank.slug] ?? bank.nameHindi;
      await expect(page.getByRole('heading', { level: 1, name: expectedH1 })).toBeVisible();
      await expect(page.locator('body')).toContainText(bank.missedCall);
    });

    if (bank.slug === 'psb') {
      test('PSB page owns the full-name spellings (Punjab & Sind Bank / punjab and sind)', async ({ page }) => {
        const h1 = await page.locator('h1').textContent();
        expect(h1).toContain('Punjab & Sind Bank');
        expect(h1).toContain('PSB');
        await expect(page.locator('body')).toContainText('पंजाब एंड सिंध बैंक');

        const schemas = await getJsonLdScripts(page);
        const bankSchema = findSchema(schemas, 'BankOrCreditUnion') as Record<string, unknown> | undefined;
        expect(bankSchema).toBeDefined();
        expect(bankSchema?.telephone).toBe(bank.missedCall);
      });
    }

    test('keeps search metadata within snippet length contracts', async ({ page }) => {
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');

      expect(title.length).toBeLessThanOrEqual(60);
      expect(description).not.toBeNull();
      expect(description!.length).toBeLessThanOrEqual(155);
    });

    // Scalable-default contract: a missed-call bank with no GSC override still
    // renders the generic template (canara/uco-bank now have overrides).
    if (defaultTemplateBank && bank.slug === defaultTemplateBank.slug) {
      test('uses the scalable default title template', async ({ page }) => {
        await expect(page).toHaveTitle(
          `${bank.nameHindi} बैलेंस चेक नंबर ${bank.missedCall} | ${bank.shortName} Missed Call`
        );
      });

      test('uses the scalable default description and correct bank spelling', async ({ page }) => {
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        const expectedDescription = `${bank.nameHindi} (${bank.shortName}) का आधिकारिक बैलेंस चेक नंबर ${bank.missedCall} है। रजिस्टर्ड मोबाइल से मिस्ड कॉल दें, SMS में तुरंत बैलेंस पाएं। मुफ़्त, 24×7।`;

        expect(description).toBe(expectedDescription);
        expect(description).toContain(bank.nameHindi);
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
        // punjab-gramin's number is aggregator-confirmed only (official site bot-blocked),
        // so its snippet deliberately avoids the आधिकारिक claim — see seoOverrides.
        if (bank.slug !== 'punjab-gramin') {
          expect(description).toContain('आधिकारिक');
        }
        expect(description).toContain('तुरंत');
        if (bank.slug === 'boi') expect(description).toContain(bank.missedCallAlt);
      });
    }

    if (bank.balanceMode !== 'missed-call' && !ctrTitles[bank.slug]) {
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

    // Demand-matched overrides on customer-care pages keep their CTR-optimized
    // snippet, but must stay truthful: never advertise a missed-call facility
    // on a customer-care/IVR line, and always carry the number.
    if (bank.balanceMode !== 'missed-call' && ctrTitles[bank.slug]) {
      test('demand-matched override stays truthful for customer-care lines', async ({ page }) => {
        const title = await page.title();
        const description = await page.locator('meta[name="description"]').getAttribute('content');

        expect(title).not.toContain('Missed Call');
        expect(title).not.toContain('मिस्ड कॉल');
        expect(description).not.toContain('मिस्ड कॉल');
        expect(description).toContain(bank.missedCall);
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

    // WhatsApp-banking section renders ONLY for banks whose official site was
    // checked (whatsappBanking field). Other banks must not hint at a channel
    // they never published.
    if (bank.whatsappBanking) {
      const wa = bank.whatsappBanking;
      test('renders the WhatsApp-banking answer with the official-source link', async ({ page }) => {
        const section = page.getByTestId('whatsapp-banking');
        await expect(section).toBeVisible();
        await expect(section).toContainText('WhatsApp बैंकिंग');
        await expect(section).toContainText('नहीं');
        await expect(section).toContainText(wa.checkedOn);
        await expect(section.locator(`a[href="${wa.sourceUrl}"]`)).toBeVisible();
        await expect(section.locator('a[target="_blank"]')).toHaveAttribute('rel', /noopener noreferrer/);
        await expect(section).toContainText(bank.missedCall);
        await expect(section).toContainText('मिस्ड कॉल');
        // Third-party disclaimer is mandatory whenever the snippet could be
        // read as endorsing any non-official channel.
        await expect(section).toContainText('आधिकारिक नहीं');
      });

      test('extends the existing FAQPage schema with the WhatsApp question', async ({ page }) => {
        const scripts = await getJsonLdScripts(page);
        const faqSchema = findSchema(scripts, 'FAQPage') as Record<string, unknown> | undefined;
        expect(faqSchema).toBeDefined();
        const questions = Array.isArray(faqSchema?.mainEntity)
          ? (faqSchema.mainEntity as Array<{ name?: string }>).map(q => q.name ?? '')
          : [];
        expect(questions.some(q => q.includes('WhatsApp बैंकिंग नंबर'))).toBe(true);
        // Exactly one FAQPage block — the WhatsApp Q&A must extend it, not fork it.
        const faqBlocks = scripts.filter(
          s => typeof s === 'object' && s !== null && (s as Record<string, unknown>)['@type'] === 'FAQPage'
        );
        expect(faqBlocks.length).toBe(1);
      });
    } else {
      test('renders no WhatsApp-banking section when the field is absent', async ({ page }) => {
        await expect(page.getByTestId('whatsapp-banking')).toHaveCount(0);
      });
    }
  });
}
