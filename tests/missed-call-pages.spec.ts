import { test, expect } from '@playwright/test';
import { banks, categoryHindi } from '../src/data/banks';
import type { Bank } from '../src/data/banks';
import { mergers } from '../src/data/mergers';
import { getJsonLdScripts, findSchema } from './utils';

// /missed-call/<slug>/ covers banks whose balance number is a dedicated
// missed-call facility. The predicate must stay identical to the hub
// (src/pages/missed-call/index.astro) and the route generator.
const missedCallBanks = banks.filter(b => b.balanceMode === 'missed-call');
const ivrOnlyBanks = banks.filter(b => b.balanceMode !== 'missed-call');
const banksWithAltNumber = missedCallBanks.filter(b => b.missedCallAlt);

const digits = (value: string) => value.replace(/\D/g, '');
const spaced = (value: string) => {
  const d = digits(value);
  if (d.length === 11) return `${d.slice(0, 1)} ${d.slice(1, 6)} ${d.slice(6)}`;
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return value;
};

// Representative sample (not all 63 — keeps CI fast): a big PSB with a source
// line + verification date, a bank whose source line is an official .bank.in
// page, an RRB with legacy merger records and no source line, the shared
// balance/customer-care number case, and a bank with an alternate number.
const sampleBanks = [
  missedCallBanks.find(b => b.slug === 'sbi'),
  missedCallBanks.find(b => b.slug === 'canara'),
  missedCallBanks.find(b => b.slug === 'up-gramin'),
  missedCallBanks.find(b => b.slug === 'mp-gramin'),
  banksWithAltNumber.find(b => b.slug === 'bob'),
]
  .filter(Boolean)
  .filter((bank, index, all) => all.findIndex(b => b!.slug === bank!.slug) === index) as Bank[];

test.describe('missed-call route inventory', () => {
  test('only banks with a dedicated missed-call number get a page', () => {
    expect(missedCallBanks.length).toBeGreaterThan(0);
    expect(ivrOnlyBanks.length).toBeGreaterThan(0);
    for (const bank of ivrOnlyBanks) {
      expect(bank.balanceMode).toMatch(/customer-care|ivr/);
    }
  });

  test('every missed-call bank carries a provenance decision in the data', () => {
    // A page exists for every bank whose balance number is a dedicated missed-call
    // line (balanceMode drives the route family), but the page may only *claim*
    // verification when the record has the evidence for it: verified:true with a
    // source + date, or verified:false with a receipt documenting the failed audit
    // attempt and no date at all (the page then prints "तिथि दर्ज नहीं").
    // Stamping a verification date on a record nobody verified is the failure mode.
    for (const bank of missedCallBanks) {
      expect(bank.verificationSource, `${bank.slug}: no provenance recorded`).toBeTruthy();
      if (bank.verified) {
        expect(bank.lastVerified, `${bank.slug}: verified but no ISO date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(bank.lastVerified, `${bank.slug}: unverified record carries a verification date`).toBeUndefined();
      }
    }
  });
});

for (const bank of sampleBanks) {
  const legacyRecords = mergers.filter(
    (m) => m.successorSlug === bank.slug || m.oldSlug === bank.slug,
  );

  test.describe(`/missed-call/${bank.slug}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/missed-call/${bank.slug}/`);
    });

    test('serves a 200 page', async ({ page }) => {
      const response = await page.goto(`/missed-call/${bank.slug}/`);
      expect(response?.status()).toBe(200);
    });

    test('puts the exact number and the number-first heading on the page', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        `${bank.shortName} Missed Call Balance Check Number ${bank.missedCall}`,
      );
      // The opening sentence states the number in both unbroken and scannable form.
      const hero = page.getByTestId('missed-call-hero');
      await expect(hero).toContainText(bank.missedCall);
      await expect(hero).toContainText(spaced(bank.missedCall));
      await expect(hero).toContainText('missed call balance check number');
    });

    test('heading stays disjoint from the balance-enquiry page', async ({ page }) => {
      const h1 = (await page.locator('h1').innerText()).trim();
      await page.goto(`/balance-enquiry/${bank.slug}/`);
      const otherH1 = (await page.locator('h1').innerText()).trim();
      expect(h1).not.toBe(otherH1);
      expect(h1).not.toContain('Balance Enquiry');
    });

    test('renders no phone number that is absent from the bank record', async ({ page }) => {
      const text = await page.locator('main').innerText();
      const found = text.match(/\d{10,}/g) ?? [];
      const allowed = new Set(
        [bank.missedCall, bank.missedCallAlt, bank.customerCare]
          .filter((value): value is string => Boolean(value))
          .map(digits),
      );
      for (const number of found) {
        expect(allowed.has(number), `${bank.slug}: unexpected number ${number}`).toBe(true);
      }
      expect(found).toContain(digits(bank.missedCall));
    });

    test('displays the missed call number as tappable text', async ({ page }) => {
      await expect(page.locator(`a[href="tel:${bank.missedCall}"]`).first()).toBeVisible();
    });

    test('displays the customer care number for the no-SMS fallback', async ({ page }) => {
      await expect(page.locator('body')).toContainText(bank.customerCare);
    });

    test('states what the number does NOT do and where to go instead', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 2, name: /नहीं करता/ })).toBeVisible();
      await expect(page.locator(`a[href="/mini-statement/${bank.slug}/"]`).first()).toBeVisible();
      await expect(page.locator(`a[href="/customer-care/${bank.slug}/"]`).first()).toBeVisible();
      await expect(page.locator('body')).toContainText('card block');
    });

    test('carries a method comparison table', async ({ page }) => {
      const table = page.locator('table').first();
      await expect(table).toBeVisible();
      const rows = await table.locator('tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(5);
      const text = await table.innerText();
      expect(text).toContain('तरीका');
      expect(text).toContain('मिस्ड कॉल');
      expect(text).toMatch(/SMS banking/);
      expect(text).toMatch(/ATM/);
      expect(text).toMatch(/net banking/);
    });

    test('answers SMS-not-received as causes with corrective actions', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 2, name: /SMS नहीं आया/ })).toBeVisible();
      const causes = page.locator('ol li:has-text("वजह:")');
      const count = await causes.count();
      expect(count).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < count; i++) {
        await expect(causes.nth(i)).toContainText('हल:');
      }
    });

    test('links registration, SMS banking and mini-statement routes', async ({ page }) => {
      await expect(page.locator(`a[href="/mobile-number-registration/${bank.slug}/"]`).first()).toBeVisible();
      await expect(page.locator(`a[href="/sms-banking/${bank.slug}/"]`).first()).toBeVisible();
    });

    test('is honest about call charges', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toContainText('कॉल शुल्क');
      await expect(body).toContainText('अधिकांश बैंकों में');
      await expect(body).not.toContainText('बिल्कुल मुफ़्त है');
    });

    test('shows an auditable source line or says it is missing', async ({ page }) => {
      const source = page.getByTestId('verification-source');
      await expect(source).toBeVisible();
      if (bank.verificationSource) {
        await expect(source).toContainText(bank.verificationSource);
      } else {
        await expect(source).toContainText('स्रोत लाइन दर्ज नहीं');
      }
      const website = page.locator(`a[href="${bank.website}"]`).first();
      await expect(website).toBeVisible();
    });

    test('shows the last-verified date from the data', async ({ page }) => {
      const verified = page.getByTestId('last-verified');
      await expect(verified).toBeVisible();
      if (bank.lastVerified) {
        await expect(verified).toContainText(bank.lastVerified);
      } else {
        await expect(verified).toContainText('तिथि दर्ज नहीं');
      }
    });

    test('emits dateModified only when the record has a verification date', async ({ page }) => {
      const scripts = await getJsonLdScripts(page);
      const webPage = findSchema(scripts, 'WebPage') as Record<string, unknown> | undefined;
      expect(webPage).toBeDefined();
      if (bank.lastVerified) {
        expect(webPage?.dateModified).toBe(`${bank.lastVerified}T00:00:00+05:30`);
      } else {
        expect(webPage?.dateModified).toBeUndefined();
      }
    });

    test('grounds the page in the bank name, category and any legacy name', async ({ page }) => {
      const body = page.locator('body');
      await expect(body).toContainText(bank.nameHindi);
      await expect(body).toContainText(bank.shortName);
      await expect(body).toContainText(categoryHindi[bank.category] ?? bank.category);

      for (const record of legacyRecords) {
        await expect(page.locator(`a[href="/merged-banks/${record.oldSlug}/"]`).first()).toBeVisible();
      }
      if (legacyRecords.length === 0) {
        await expect(page.locator('[href^="/merged-banks/"]')).toHaveCount(0);
      }
    });

    test('has HowTo JSON-LD schema naming the number', async ({ page }) => {
      const scripts = await getJsonLdScripts(page);
      const howToSchema = findSchema(scripts, 'HowTo') as Record<string, unknown> | undefined;
      expect(howToSchema).toBeDefined();
      const steps = Array.isArray(howToSchema?.step) ? howToSchema.step.length : 0;
      expect(steps).toBeGreaterThanOrEqual(3);
      expect(JSON.stringify(howToSchema)).toContain(bank.missedCall);
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

    test('has BreadcrumbList JSON-LD schema through the missed-call hub', async ({ page }) => {
      const scripts = await getJsonLdScripts(page);
      const breadcrumbSchema = findSchema(scripts, 'BreadcrumbList') as Record<string, unknown> | undefined;
      expect(breadcrumbSchema).toBeDefined();
      const crumbs = Array.isArray(breadcrumbSchema?.itemListElement)
        ? (breadcrumbSchema.itemListElement as Array<Record<string, unknown>>)
        : [];
      expect(crumbs.length).toBeGreaterThanOrEqual(3);
      expect(crumbs[1]?.item).toBe('https://balcheck.in/missed-call/');
    });

    test('keeps the canonical self-referencing URL', async ({ page }) => {
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBe(`https://balcheck.in/missed-call/${bank.slug}/`);
    });

    test('cross-links to the sibling verticals', async ({ page }) => {
      for (const route of ['bank', 'balance-enquiry', 'sms-banking', 'mini-statement', 'mobile-number-registration']) {
        await expect(page.locator(`a[href="/${route}/${bank.slug}/"]`).first()).toBeVisible();
      }
    });

    test('renders the alternate number when the record has one', async ({ page }) => {
      if (!bank.missedCallAlt) return;
      await expect(page.locator('body')).toContainText(bank.missedCallAlt);
      await expect(page.locator(`a[href="tel:${bank.missedCallAlt}"]`).first()).toBeVisible();
    });
  });
}

test.describe('missed-call discovery links', () => {
  // MoreServices renders on the per-bank vertical routes (not on /bank/[slug]/,
  // which has its own link grid) — that is where the conditional entry shows.
  test('sibling vertical pages link to the missed-call page when the data supports it', async ({ page }) => {
    for (const bank of sampleBanks) {
      await page.goto(`/balance-enquiry/${bank.slug}/`);
      await expect(page.locator(`a[href="/missed-call/${bank.slug}/"]`).first()).toBeVisible();
    }
  });

  test('banks without a missed-call number never link to a missed-call page', async ({ page }) => {
    for (const bank of ivrOnlyBanks.slice(0, 3)) {
      await page.goto(`/balance-enquiry/${bank.slug}/`);
      await expect(page.locator(`a[href="/missed-call/${bank.slug}/"]`)).toHaveCount(0);
    }
  });

  test('the missed-call page itself keeps a self-link in its services block', async ({ page }) => {
    const bank = sampleBanks[0];
    await page.goto(`/missed-call/${bank.slug}/`);
    await expect(page.getByTestId('more-services')).toBeVisible();
    await expect(page.locator(`a[href="/missed-call/${bank.slug}/"]`).first()).toBeVisible();
  });

  test('hub rows point missed-call banks at the missed-call page', async ({ page }) => {
    await page.goto('/missed-call/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    for (const bank of sampleBanks) {
      await expect(page.locator(`a[href="/missed-call/${bank.slug}/"]`).first()).toBeVisible();
    }

    const ivrBank = ivrOnlyBanks[0];
    await expect(page.locator(`a[href="/balance-enquiry/${ivrBank.slug}/"]`).first()).toBeVisible();
    await expect(page.locator(`a[href="/missed-call/${ivrBank.slug}/"]`)).toHaveCount(0);
  });

  test('hub keeps CollectionPage and FAQPage JSON-LD', async ({ page }) => {
    await page.goto('/missed-call/');
    const scripts = await getJsonLdScripts(page);
    expect(findSchema(scripts, 'CollectionPage')).toBeDefined();
    expect(findSchema(scripts, 'FAQPage')).toBeDefined();
  });

  test('banks without a missed-call number have no such route', async ({ request }) => {
    const bank = ivrOnlyBanks[0];
    const response = await request.get(`/missed-call/${bank.slug}/`, { maxRedirects: 0 });
    expect(response.status()).not.toBe(200);
  });
});