import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';
import { gotoDom } from './utils';
import {
  AA_TEXT_RATIO,
  NON_TEXT_RATIO,
  contrastRatio,
  resolveCssColors,
  sampleTextContrast,
  toHex,
  type TextSample,
} from './contrast';

/**
 * Regression guards for the four P0 UI defects found in the live audit:
 *
 *  1. Hero subtitle on the brand-600 gradient: `text-brand-100` (#dbeafe)
 *     measured 4.24:1 against the #2563eb gradient stop — under the 4.5:1 AA
 *     floor for 14px copy.
 *  2. Home amber CTA: white on `bg-amber-600` (#e17100) measured 3.20:1.
 *  3. Bank-card tap targets: the 79 `#bank-grid a[href^="/bank/"]` anchors
 *     measured 20px tall, and their `leading-tight` h3 ran at a 1.25 ratio.
 *  4. Bank-card body copy at 12px, with the short-name chip at 4.39:1
 *     (#6a7282 on #f3f4f6).
 *
 * Every assertion is computed from the rendered DOM: WCAG ratios come from
 * `tests/contrast.ts`, geometry from bounding boxes. No snapshots.
 */

/** WCAG 2.5.5 / Apple HIG minimum touch target. */
const MIN_TAP_TARGET_PX = 44;

/** Every template that paints copy on a dark brand fill. */
const BRAND_FILL_PAGES = [
  '/',
  '/banks/',
  '/number-lookup/',
  '/how-it-works/',
  '/customer-care/',
  '/balance-enquiry/',
  '/balance-enquiry/sbi/',
  '/net-banking/',
  '/net-banking/sbi/',
  '/sms-banking/',
  '/sms-banking/sbi/',
  '/mini-statement/',
  '/mini-statement/sbi/',
  '/missed-call/',
  '/missed-call/sbi/',
  '/aadhaar-link/',
  '/aadhaar-link/sbi/',
  '/atm-pin/',
  '/atm-pin/sbi/',
  '/mobile-number-registration/',
  '/mobile-number-registration/sbi/',
  '/toll-free-number/',
  '/toll-free-number/sbi/',
  '/customer-care/sbi/',
  '/bank/sbi/',
  '/banks/public-sector/',
] as const;

function describeSample(ratio: number, sample: TextSample): string {
  return `${ratio.toFixed(2)}:1 ${toHex(sample.color)} on ${toHex(sample.backdrop)} @${sample.fontSizePx}px — <${sample.tag} class="${sample.className}"> "${sample.text}"`;
}

function describeFailure({ sample, ratio }: { sample: TextSample; ratio: number }): string {
  return describeSample(ratio, sample);
}

test.describe('P0 1: copy on a dark brand fill clears WCAG AA', () => {
  for (const path of BRAND_FILL_PAGES) {
    test(`every text node on a brand fill clears AA on ${path}`, async ({ page }) => {
      await gotoDom(page, path);
      const samples = await sampleTextContrast(page);
      const onBrandFill = samples.filter((sample) => sample.onBrandFill);
      expect(onBrandFill.length, `no brand-fill text found on ${path}`).toBeGreaterThan(0);

      const failures = onBrandFill
        .map((sample) => ({ sample, ratio: contrastRatio(sample.color, sample.backdrop) }))
        .filter(({ sample, ratio }) => ratio < (sample.pictographOnly ? NON_TEXT_RATIO : AA_TEXT_RATIO));

      expect(failures.map(describeFailure)).toEqual([]);
    });
  }
});

test.describe('P0 2: home amber CTA clears WCAG AA', () => {
  test('white label on the amber fill is at least 4.5:1', async ({ page }) => {
    await gotoDom(page, '/');
    const cta = page.locator('a[href="/merged-banks/"]').first();
    await expect(cta).toBeVisible();

    const measured = await cta.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, backgroundColor: style.backgroundColor };
    });

    const [label, fill] = await resolveCssColors(page, [measured.color, measured.backgroundColor]);
    const ratio = contrastRatio(label, fill);
    expect(
      ratio,
      `white on ${measured.backgroundColor} measured ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA_TEXT_RATIO);
  });
});

test.describe('P0 3: bank-card tap targets and heading rhythm', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('every bank-card link is at least 44px tall at 390px', async ({ page }) => {
    await gotoDom(page, '/');
    const links = page.locator('#bank-grid a[href^="/bank/"]');
    await expect(links).toHaveCount(banks.length);

    const heights = await links.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );
    const tooSmall = heights
      .map((height, index) => ({ index, height }))
      .filter(({ height }) => height < 44);
    expect(tooSmall, `${tooSmall.length} of ${heights.length} bank-card links are under 44px`).toEqual([]);
  });

  test('bank-card headings use a line-height of at least 1.4', async ({ page }) => {
    await gotoDom(page, '/');
    const ratios = await page
      .locator('#bank-grid h3')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
        }),
      );
    expect(ratios).toHaveLength(banks.length);
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(1.4);
  });

  test('the bank grid renders one column per row at 360px and 390px without overflow', async ({ page }) => {
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await gotoDom(page, '/');

      const tracks = await page
        .locator('#bank-grid')
        .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
      expect(tracks, `#bank-grid columns at ${width}px`).toBe(1);

      await expect(page.locator('.bank-card')).toHaveCount(banks.length);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test('the bank grid still reaches 2 and 3 columns on wider viewports', async ({ page }) => {
    for (const [width, expected] of [
      [640, 2],
      [1024, 3],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await gotoDom(page, '/');
      const tracks = await page
        .locator('#bank-grid')
        .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
      expect(tracks, `#bank-grid columns at ${width}px`).toBe(expected);
      await expect(page.locator('#bank-grid a[href^="/bank/"]')).toHaveCount(banks.length);
    }
  });
});

test.describe('P0 4: bank-card body copy is legible', () => {
  test('no bank-card text renders below 14px', async ({ page }) => {
    await gotoDom(page, '/');
    const samples = await sampleTextContrast(page, '.bank-card');
    expect(samples.length).toBeGreaterThan(0);
    const tooSmall = samples.filter((sample) => sample.fontSizePx > 0 && sample.fontSizePx < 14);
    expect(
      tooSmall.map((sample) => `${sample.fontSizePx}px — "${sample.text}"`),
      'bank-card copy below 14px',
    ).toEqual([]);
  });

  test('every bank-card text node clears AA on its own backdrop', async ({ page }) => {
    await gotoDom(page, '/');
    const samples = await sampleTextContrast(page, '.bank-card');
    const failures = samples
      .filter((sample) => !sample.onBrandFill)
      .map((sample) => ({ sample, ratio: contrastRatio(sample.color, sample.backdrop) }))
      .filter(({ sample, ratio }) => ratio < (sample.pictographOnly ? NON_TEXT_RATIO : AA_TEXT_RATIO));

    // The short-name chip is the audited pair: #6a7282 on #f3f4f6 was 4.39:1.
    expect(failures.map(describeFailure)).toEqual([]);
  });
});
