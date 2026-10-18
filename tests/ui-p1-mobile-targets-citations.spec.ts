import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { banks } from '../src/data/banks';
import { gotoDom } from './utils';

/**
 * Regression guards for the second mobile audit batch:
 *
 *  1. The sticky header measured 117px at 360px and 390px (13-17% of the
 *     viewport) and sat above every page. It must collapse to one ~64px bar on
 *     mobile, with the service rail behind a disclosure, while the desktop
 *     two-row layout stays untouched.
 *  2. FAQ `summary` elements measured 24px (13 on `/`, 4 on `/bank/sbi/` and
 *     `/number-lookup/`), under the 44px iOS/WCAG 2.5.5 tap floor.
 *  3. Footer quick links (`a.w-fit.rounded.px-1`, ten per page) measured 28px.
 *  4. `/balance-enquiry/[slug]/`, `/aadhaar-link/[slug]/`, `/mini-statement/`
 *     and `/number-lookup/` published bank numbers with no visible source and
 *     no last-verified date, while `banks.ts` carries `verificationSource` and
 *     `lastVerified` for every documented record.
 *
 * Every assertion is computed from the rendered DOM: bounding boxes, computed
 * styles and the text of the citation block. No snapshots, no source reading.
 */

/** WCAG 2.5.5 / Apple HIG minimum touch target. */
const MIN_TAP_TARGET_PX = 44;

/** A collapsed mobile bar must not eat more than this slice of the viewport. */
const MAX_MOBILE_HEADER_PX = 72;

/** ISO calendar date, the format `lastVerified` uses in `src/data/banks.ts`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** Pages that must expose the citation block for a record that has evidence. */
const EVIDENCE_PAGES = [
  { path: '/balance-enquiry/sbi/', slug: 'sbi' },
  { path: '/aadhaar-link/sbi/', slug: 'sbi' },
  { path: '/mini-statement/sbi/', slug: 'sbi' },
] as const;

/** Directory templates: no single record, an aggregate of the whole registry. */
const EVIDENCE_DIRECTORY_PAGES = ['/mini-statement/', '/number-lookup/'] as const;

/** Templates that publish a number for every record, including undocumented ones. */
const RECORD_TEMPLATES = ['/balance-enquiry', '/aadhaar-link'] as const;

/** FAQ accordions across template families, each with at least one summary. */
const FAQ_PAGES = [
  '/',
  '/bank/sbi/',
  '/number-lookup/',
  '/how-it-works/',
  '/customer-care/',
  '/customer-care/sbi/',
  '/missed-call/',
  '/merged-banks/narmada-jhabua/',
  '/article/nbfc-loan-apps-harassment-controversy-2026/',
] as const;

const bankBySlug = (slug: string) => {
  const bank = banks.find((candidate) => candidate.slug === slug);
  if (!bank) throw new Error(`unknown bank slug: ${slug}`);
  return bank;
};

/** A record with documented provenance, used to prove the block is rendered. */
const documentedBank = bankBySlug('sbi');
/** A record with no source and no date, used to prove nothing is invented. */
const undocumentedBank = banks.find((bank) => !bank.verificationSource || !bank.lastVerified);
if (!undocumentedBank) throw new Error('no undocumented bank left in the registry');

const normalized = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Measured border-box heights of every element matching `selector`. */
async function heightsOf(page: Page, selector: string): Promise<number[]> {
  return page
    .locator(selector)
    .evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().height)),
    );
}

test.describe('P1 8: the mobile header collapses to a single bar', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  for (const width of [390, 360]) {
    test(`the header stays under ${MAX_MOBILE_HEADER_PX}px at ${width}px and clears the content`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await gotoDom(page, '/');

      const header = page.locator('[data-testid="global-header"]');
      const geometry = await page.evaluate(() => {
        const headerElement = document.querySelector('[data-testid="global-header"]')!;
        const mainElement = document.querySelector('main')!;
        const heading = mainElement.querySelector('h1');
        return {
          headerHeight: Math.round(headerElement.getBoundingClientRect().height),
          headerBottom: Math.round(headerElement.getBoundingClientRect().bottom),
          mainTop: Math.round(mainElement.getBoundingClientRect().top),
          headingTop: heading ? Math.round(heading.getBoundingClientRect().top) : null,
          position: getComputedStyle(headerElement).position,
          viewportShare: headerElement.getBoundingClientRect().height / window.innerHeight,
          documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });

      expect(geometry.headerHeight, `header height at ${width}px`).toBeLessThanOrEqual(MAX_MOBILE_HEADER_PX);
      expect(geometry.headerHeight, `header height at ${width}px`).toBeGreaterThan(0);
      // Sticky (not fixed): the bar keeps its flow space, so nothing starts underneath it.
      expect(geometry.position, 'header positioning').toBe('sticky');
      expect(geometry.mainTop, `main top vs header bottom at ${width}px`).toBeGreaterThanOrEqual(geometry.headerBottom);
      expect(geometry.headingTop ?? 0, `first heading top vs header bottom at ${width}px`).toBeGreaterThanOrEqual(
        geometry.headerBottom,
      );
      expect(geometry.viewportShare, `header share of the viewport at ${width}px`).toBeLessThanOrEqual(0.1);
      expect(geometry.documentOverflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);

      // The rail is not merely hidden under the content: it is collapsed.
      await expect(header.locator('[data-testid="service-nav"]')).toBeHidden();
    });
  }

  test('the rail sits behind a 44px disclosure that expands it on one row', async ({ page }) => {
    await gotoDom(page, '/');
    const toggle = page.locator('[data-testid="service-nav-toggle"]');
    const rail = page.locator('[data-testid="service-nav"]');

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(rail).toBeHidden();

    const toggleHeight = await toggle.evaluate((element) => Math.round(element.getBoundingClientRect().height));
    expect(toggleHeight, 'services disclosure height').toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(rail).toBeVisible();

    const chips = rail.locator('a');
    await expect(chips).toHaveCount(8);
    const chipHeights = await heightsOf(page, '[data-testid="service-nav"] a');
    expect(chipHeights.filter((height) => height < MIN_TAP_TARGET_PX), 'chips under 44px').toEqual([]);

    const railStyle = await rail.locator('> div').evaluate((element) => {
      const style = getComputedStyle(element);
      return { overflowX: style.overflowX, flexWrap: style.flexWrap };
    });
    expect(railStyle.overflowX).toBe('auto');
    expect(railStyle.flexWrap).toBe('nowrap');

    const tops = await chips.evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().top)),
    );
    expect(new Set(tops).size, `chip row tops (${tops.join(', ')})`).toBe(1);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'document overflow with the rail open').toBeLessThanOrEqual(0);
  });

  test('desktop keeps the two-row header with the rail always visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoDom(page, '/');

    const header = page.locator('[data-testid="global-header"]');
    const rail = header.locator('[data-testid="service-nav"]');
    await expect(header.locator('[data-testid="service-nav-toggle"]')).toBeHidden();
    await expect(rail).toBeVisible();
    await expect(rail.locator('a')).toHaveCount(8);

    const bands = await page.evaluate(() => {
      const headerElement = document.querySelector('[data-testid="global-header"]')!;
      const logo = headerElement.querySelector('a[href="/"]')!;
      const railElement = headerElement.querySelector('[data-testid="service-nav"]')!;
      return {
        headerHeight: Math.round(headerElement.getBoundingClientRect().height),
        logoBottom: Math.round(logo.getBoundingClientRect().bottom),
        railTop: Math.round(railElement.getBoundingClientRect().top),
      };
    });
    // Two stacked bands: the rail starts on its own row below the logo row.
    expect(bands.railTop, 'rail row position on desktop').toBeGreaterThanOrEqual(bands.logoBottom);
    expect(bands.headerHeight, 'desktop header height').toBeGreaterThan(MAX_MOBILE_HEADER_PX);
  });
});

test.describe('P1 9: FAQ summaries are 44px tap targets', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  for (const path of FAQ_PAGES) {
    test(`every FAQ summary is at least ${MIN_TAP_TARGET_PX}px tall on ${path}`, async ({ page }) => {
      await gotoDom(page, path);
      const summaries = page.locator('summary');
      const count = await summaries.count();
      expect(count, `no FAQ summary found on ${path}`).toBeGreaterThan(0);

      const heights = await heightsOf(page, 'summary');
      const tooShort = heights
        .map((height, index) => ({ index, height }))
        .filter(({ height }) => height < MIN_TAP_TARGET_PX);
      expect(
        tooShort,
        `${path}: ${tooShort.length} of ${heights.length} summaries under ${MIN_TAP_TARGET_PX}px (${heights.join(', ')}px)`,
      ).toEqual([]);
    });
  }
});

test.describe('P1 10: footer quick links are 44px tap targets', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  for (const path of ['/', '/bank/sbi/', '/number-lookup/']) {
    test(`every footer quick link is at least ${MIN_TAP_TARGET_PX}px tall on ${path}`, async ({ page }) => {
      await gotoDom(page, path);
      const links = page.locator('[data-testid="site-footer"] [data-testid="footer-quick-link"]');
      await expect(links, `footer quick links on ${path}`).toHaveCount(10);

      const heights = await links.evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().height)),
      );
      expect(
        heights.filter((height) => height < MIN_TAP_TARGET_PX),
        `${path}: footer quick link heights (${heights.join(', ')}px)`,
      ).toEqual([]);
    });
  }
});

test.describe('P1 11: pages that publish a number cite its source and review date', () => {
  for (const { path, slug } of EVIDENCE_PAGES) {
    test(`${path} shows the documented source and ISO last-verified date`, async ({ page }) => {
      const bank = bankBySlug(slug);
      await gotoDom(page, path);

      const block = page.locator('[data-testid="record-evidence"]');
      await expect(block, `${path}: citation block`).toBeVisible();

      const source = block.locator('[data-testid="record-evidence-source"]');
      await expect(source, `${path}: source line`).toBeVisible();
      const sourceText = normalized((await source.innerText()) ?? '');
      expect(sourceText.length, `${path}: source line is empty`).toBeGreaterThan(20);
      expect(
        sourceText.includes(normalized(bank.verificationSource!).slice(0, 40)),
        `${path}: source line does not carry the record's verificationSource (got "${sourceText.slice(0, 80)}")`,
      ).toBe(true);

      const date = block.locator('[data-testid="record-evidence-date"]');
      await expect(date, `${path}: last-verified date`).toBeVisible();
      const datetime = await date.getAttribute('datetime');
      expect(datetime, `${path}: <time> datetime attribute`).toMatch(ISO_DATE);
      expect(datetime, `${path}: datetime matches the record date`).toBe(bank.lastVerified);
      expect(normalized((await date.innerText()) ?? ''), `${path}: visible date text`).toContain(bank.lastVerified!);
    });
  }

  for (const path of EVIDENCE_DIRECTORY_PAGES) {
    test(`${path} shows the registry source and its latest ISO review date`, async ({ page }) => {
      await gotoDom(page, path);
      const block = page.locator('[data-testid="record-evidence"]');
      await expect(block, `${path}: citation block`).toBeVisible();

      const sourceText = normalized(
        (await block.locator('[data-testid="record-evidence-source"]').innerText()) ?? '',
      );
      expect(sourceText.length, `${path}: source line is empty`).toBeGreaterThan(20);

      const datetime = await block.locator('[data-testid="record-evidence-date"]').getAttribute('datetime');
      expect(datetime, `${path}: <time> datetime attribute`).toMatch(ISO_DATE);

      // The date must be one the registry actually carries, never an invented one.
      const documentedDates = new Set(banks.map((bank) => bank.lastVerified).filter(Boolean));
      expect(documentedDates.has(datetime!), `${path}: ${datetime} is not a registry lastVerified date`).toBe(true);
    });
  }

  for (const template of RECORD_TEMPLATES) {
    test(`${template}/${undocumentedBank.slug}/ renders no citation instead of a fake one`, async ({ page }) => {
      await gotoDom(page, `${template}/${undocumentedBank.slug}/`);
      await expect(page.locator('[data-testid="record-evidence"]')).toHaveCount(0);
      await expect(page.locator('main time[datetime]')).toHaveCount(0);
    });
  }

  test('the citation is not a copy of the record data: every bank page with evidence cites it', async ({ page }) => {
    // Two more records, so one template cannot pass by hardcoding the SBI block.
    for (const slug of ['pnb', 'axis']) {
      const bank = bankBySlug(slug);
      await gotoDom(page, `/balance-enquiry/${slug}/`);
      const block = page.locator('[data-testid="record-evidence"]');
      await expect(block, `${slug}: citation block`).toBeVisible();
      expect(normalized((await block.innerText()) ?? ''), `${slug}: wrong record cited`).toContain(
        normalized(bank.verificationSource!).slice(0, 40),
      );
      await expect(block.locator('[data-testid="record-evidence-date"]')).toHaveAttribute(
        'datetime',
        bank.lastVerified!,
      );
    }
  });

  test('the documented record used by these guards is SBI with a real date', () => {
    expect(documentedBank.verificationSource).toBeTruthy();
    expect(documentedBank.lastVerified).toMatch(ISO_DATE);
    expect(documentedBank.slug).toBe('sbi');
  });
});
