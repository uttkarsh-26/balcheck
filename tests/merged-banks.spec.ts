import { test, expect } from '@playwright/test';
import { getMerger, mergers } from '../src/data/mergers';
import { banks } from '../src/data/banks';
import { getJsonLdScripts, findSchema } from './utils';

// Research-backed lineage expectations (verified 2026-08-10 against gazette/RBI/
// DICGC/official .bank.in sources — see delegation research receipts):
// oldSlug -> [effectiveDate of each event, oldest first] -> successorSlug
const EXPECTED_LINEAGE: Record<string, { dates: string[]; successor: string }> = {
  'baroda-up-gramin': { dates: ['2020-04-01', '2025-05-01'], successor: 'up-gramin' },
  'baroda-rajasthan': { dates: ['2025-05-01'], successor: 'rajasthan-gramin' },
  'narmada-jhabua': { dates: ['2019-04-01'], successor: 'mp-gramin' },
  'central-madhya-pradesh': { dates: ['2019-04-01'], successor: 'mp-gramin' },
  'madhyanchal': { dates: ['2025-05-01'], successor: 'mp-gramin' },
  'malwa': { dates: ['2019-01-01'], successor: 'punjab-gramin' },
  'sutlej': { dates: ['2019-01-01'], successor: 'punjab-gramin' },
  'kashi-gomti-samyut': { dates: ['2020-04-01', '2025-05-01'], successor: 'up-gramin' },
  'purvanchal': { dates: ['2020-04-01', '2025-05-01'], successor: 'up-gramin' },
  'karnataka-vikas': { dates: ['2025-05-01'], successor: 'karnataka-grameena' },
  'allahabad-up-gramin': { dates: ['2019-04-01', '2025-05-01'], successor: 'up-gramin' },
};

const FORBIDDEN_NUMBER = '9224150150';

test.describe('merged-banks data integrity', () => {
  test('batch contains exactly the researched 11 records with unique oldSlugs', () => {
    expect(mergers).toHaveLength(11);
    const slugs = mergers.map((m) => m.oldSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(Object.keys(EXPECTED_LINEAGE).sort()).toEqual(slugs.sort());
  });

  test('every successorSlug resolves in banks.ts', () => {
    const bankSlugs = new Set(banks.map((b) => b.slug));
    for (const m of mergers) {
      expect(bankSlugs, `${m.oldSlug} -> ${m.successorSlug}`).toContain(m.successorSlug);
    }
  });

  test('existing legacy bank slug aliases resolve to their canonical merger record', () => {
    expect(getMerger('kvgb')?.oldSlug).toBe('karnataka-vikas');
  });

  test('every event sourceUrl is HTTPS', () => {
    const authoritativeHosts = new Set([
      'egazette.gov.in',
      'upgb.bank.in',
      'mpgb.bank.in',
      'www.rbi.org.in',
    ]);
    for (const m of mergers) {
      for (const event of m.events) {
        expect(event.sourceUrl, `${m.oldSlug} ${event.effectiveDate}`).toMatch(/^https:\/\/.+/);
        expect(
          authoritativeHosts.has(new URL(event.sourceUrl).hostname),
          `${m.oldSlug} must cite a government, RBI, or official-bank source`
        ).toBe(true);
      }
    }
  });

  test('every effectiveDate is an ISO YYYY-MM-DD date', () => {
    for (const m of mergers) {
      for (const event of m.events) {
        expect(event.effectiveDate, `${m.oldSlug}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(event.effectiveDate)), `${m.oldSlug} ${event.effectiveDate}`).toBe(false);
      }
    }
  });

  test('events are chronological and the final resultingName matches the successor bank name', () => {
    for (const m of mergers) {
      expect(m.events.length, `${m.oldSlug} needs at least one event`).toBeGreaterThan(0);
      for (let i = 1; i < m.events.length; i++) {
        expect(
          m.events[i].effectiveDate >= m.events[i - 1].effectiveDate,
          `${m.oldSlug} events must be chronological`
        ).toBe(true);
      }
      const successor = banks.find((b) => b.slug === m.successorSlug)!;
      expect(m.events[m.events.length - 1].resultingName, `${m.oldSlug} final result`).toBe(successor.name);
    }
  });

  test('lineage dates match the researched receipts exactly', () => {
    for (const m of mergers) {
      const expected = EXPECTED_LINEAGE[m.oldSlug];
      expect(expected, `unexpected record ${m.oldSlug}`).toBeDefined();
      expect(m.events.map((e) => e.effectiveDate), m.oldSlug).toEqual(expected.dates);
      expect(m.successorSlug, m.oldSlug).toBe(expected.successor);
    }
  });

  test('merger records carry no phone fields and no forbidden stale number', () => {
    const serialized = JSON.stringify(mergers);
    expect(serialized).not.toContain(FORBIDDEN_NUMBER);
    for (const m of mergers) {
      const keys = Object.keys(m);
      expect(keys).not.toContain('missedCall');
      expect(keys).not.toContain('customerCare');
      expect(keys).not.toContain('phone');
      for (const event of m.events) {
        expect(Object.keys(event)).not.toContain('phone');
      }
    }
  });
});

test.describe('merged-banks hub', () => {
  test('hub lists all 11 records with detail and successor links', async ({ page }) => {
    await page.goto('/merged-banks/');
    await expect(page).toHaveTitle(/विलय/);
    await expect(page.locator('h1')).toHaveCount(1);

    for (const m of mergers) {
      await expect(page.locator('body')).toContainText(m.oldNameHindi);
      await expect(page.locator(`a[href="/merged-banks/${m.oldSlug}/"]`).first()).toBeVisible();
      await expect(page.locator(`a[href="/bank/${m.successorSlug}/"]`).first()).toBeVisible();
      const card = page.locator(`[data-old-slug="${m.oldSlug}"]`);
      await expect(card).toBeVisible();
      await expect(card).toContainText(m.events[0].effectiveDate);
    }
  });

  test('hub emits CollectionPage JSON-LD with an ItemList of all records', async ({ page }) => {
    await page.goto('/merged-banks/');
    const scripts = await getJsonLdScripts(page);
    const collection = findSchema(scripts, 'CollectionPage');
    expect(collection).toBeDefined();
    const itemList = (collection as { mainEntity?: unknown })?.mainEntity as
      | { '@type'?: string; itemListElement?: unknown[] }
      | undefined;
    expect(itemList).toBeDefined();
    expect(itemList?.['@type']).toBe('ItemList');
    const itemListElement = itemList?.itemListElement;
    expect(itemListElement).toBeDefined();
    expect((itemListElement as unknown[]).length).toBe(mergers.length);
  });

  test('hub does not claim every legacy number is definitively closed', async ({ page }) => {
    await page.goto('/merged-banks/');
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('अब काम नहीं करते');
    expect(body).not.toContain('बंद हो चुके हैं');
  });
});

test.describe('merged-banks detail pages', () => {
  for (const m of mergers) {
    test(`${m.oldSlug}: single-intent H1 with old RRB name + balance check intent, successor explained`, async ({ page }) => {
      await page.goto(`/merged-banks/${m.oldSlug}/`);
      await expect(page.locator('h1')).toHaveCount(1);

      const h1 = page.locator('h1').first();
      await expect(h1).toContainText(m.oldNameHindi);
      await expect(h1).toContainText('बैलेंस चेक');

      // Current successor and official timeline must be visible in the body
      const successor = banks.find((b) => b.slug === m.successorSlug)!;
      await expect(page.locator('body')).toContainText(successor.nameHindi);
      for (const event of m.events) {
        await expect(page.locator('body')).toContainText(event.effectiveDate);
      }
    });

    test(`${m.oldSlug}: title, canonical self URL, successor number; no forbidden stale number`, async ({ page }) => {
      await page.goto(`/merged-banks/${m.oldSlug}/`);
      const successor = banks.find((b) => b.slug === m.successorSlug)!;

      await expect(page).toHaveTitle(new RegExp(m.oldName));
      await expect(page).toHaveTitle(/Balance Check Number/i);

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description, `${m.oldSlug} needs a useful search snippet`).toBeTruthy();
      expect(description!.length, `${m.oldSlug} description should avoid SERP truncation`).toBeLessThanOrEqual(170);
      expect(description).toContain(m.events[0].effectiveDate);
      expect(description).toContain(successor.missedCall);

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute(
        'href',
        `https://balcheck.in/merged-banks/${m.oldSlug}/`
      );

      // Only the current successor number is rendered (from banks.ts)
      await expect(page.locator('body')).toContainText(successor.missedCall);
      await expect(page.locator('body')).not.toContainText(FORBIDDEN_NUMBER);
    });

    test(`${m.oldSlug}: JSON-LD has BankOrCreditUnion + FAQPage + BreadcrumbList, no HowTo`, async ({ page }) => {
      await page.goto(`/merged-banks/${m.oldSlug}/`);
      const scripts = await getJsonLdScripts(page);

      const bank = findSchema(scripts, 'BankOrCreditUnion') as Record<string, unknown> | undefined;
      expect(bank).toBeDefined();
      expect(String(bank?.name)).toContain(m.oldName);
      expect(bank?.telephone, 'old entity must not carry a telephone').toBeUndefined();
      expect(bank?.dissolutionDate, 'old entity dissolved at the first merger event').toBe(
        m.events[0].effectiveDate
      );

      expect(findSchema(scripts, 'FAQPage')).toBeDefined();
      expect(findSchema(scripts, 'BreadcrumbList')).toBeDefined();
      expect(findSchema(scripts, 'HowTo'), 'no HowTo on merger pages').toBeUndefined();
    });

    test(`${m.oldSlug}: avoids unsupported claims that every old number is closed`, async ({ page }) => {
      await page.goto(`/merged-banks/${m.oldSlug}/`);
      const body = await page.locator('body').textContent();
      expect(body).not.toContain('बंद हो चुके हैं');
      expect(body).not.toContain('अब काम नहीं करते');
    });

    test(`${m.oldSlug}: visible official citations, successor page link, hub link, slash-terminated internal links`, async ({ page }) => {
      await page.goto(`/merged-banks/${m.oldSlug}/`);

      const notice = page.getByTestId('merger-notice');
      await expect(notice).toBeVisible();
      for (const event of m.events) {
        await expect(notice.locator(`a[href="${event.sourceUrl}"]`)).toBeVisible();
        await expect(page.locator(`a[href="${event.sourceUrl}"]`).first()).toBeVisible();
        await expect(page.locator('body')).toContainText(event.sourceLabel);
      }

      await expect(page.locator(`a[href="/bank/${m.successorSlug}/"]`).first()).toBeVisible();
      await expect(page.locator('a[href="/merged-banks/"]').first()).toBeVisible();

      const internalHrefs = await page
        .locator('a[href^="/"]')
        .evaluateAll((links) => links.map((l) => l.getAttribute('href')).filter(Boolean) as string[]);
      for (const href of internalHrefs) {
        expect(href, `${m.oldSlug} internal href must end with /`).toMatch(/\/$/);
      }
    });
  }
});

test.describe('cross-links from existing bank pages', () => {
  test('old RRB bank pages show an accurate first-event banner linking to the canonical merger page', async ({ page }) => {
    const legacyBankPages: Record<string, string> = {
      'baroda-up-gramin': 'baroda-up-gramin',
      'baroda-rajasthan': 'baroda-rajasthan',
      kvgb: 'karnataka-vikas',
    };
    for (const [bankSlug, oldSlug] of Object.entries(legacyBankPages)) {
      const merger = mergers.find((m) => m.oldSlug === oldSlug)!;
      await page.goto(`/bank/${bankSlug}/`);
      const bannerLink = page.locator(`a[href="/merged-banks/${oldSlug}/"]`);
      await expect(bannerLink).toBeVisible();
      const banner = bannerLink.locator('..');
      await expect(banner).toContainText(merger.events[0].effectiveDate);
      await expect(banner).toContainText(merger.events[0].resultingNameHindi);
    }
  });

  test('successor bank pages show a reverse पूर्व बैंक section', async ({ page }) => {
    const expected: Record<string, string[]> = {
      'up-gramin': ['baroda-up-gramin', 'kashi-gomti-samyut', 'purvanchal', 'allahabad-up-gramin'],
      'mp-gramin': ['narmada-jhabua', 'central-madhya-pradesh', 'madhyanchal'],
      'punjab-gramin': ['malwa', 'sutlej'],
      'karnataka-grameena': ['karnataka-vikas'],
      'rajasthan-gramin': ['baroda-rajasthan'],
    };
    for (const [slug, oldSlugs] of Object.entries(expected)) {
      await page.goto(`/bank/${slug}/`);
      await expect(page.locator('h2', { hasText: 'पूर्व बैंक' })).toBeVisible();
      for (const oldSlug of oldSlugs) {
        await expect(page.locator(`a[href="/merged-banks/${oldSlug}/"]`)).toBeVisible();
      }
    }
  });

  test('non-merger bank pages are untouched (no banner, no पूर्व बैंक section)', async ({ page }) => {
    await page.goto('/bank/sbi/');
    await expect(page.locator('a[href^="/merged-banks/"]')).toHaveCount(0);
    await expect(page.locator('h2', { hasText: 'पूर्व बैंक' })).toHaveCount(0);
  });

  test('homepage links to the merged-banks hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/merged-banks/"]').first()).toBeVisible();
  });
});
