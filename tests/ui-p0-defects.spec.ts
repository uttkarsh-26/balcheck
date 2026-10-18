import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
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
 *
 * P1 defects from the same audit (see the P1 blocks at the bottom):
 *
 *  5. Header controls: the eight service chips measured 40px at 12px text, the
 *     Banks/कैसे? links 24px, and the logo anchor 36px.
 *  6. 12px body copy: the 79 mini-statement bank captions and the ten
 *     `MoreServices` labels on an aadhaar-link page.
 *  7. Duplicate accessible names in `#bank-grid`: 79 links named "कॉल करें"
 *     and 79 named "WhatsApp पर शेयर करें", plus number links that announced
 *     their label glued to the number ("मिस्ड कॉल नंबर9986454440").
 */

/** WCAG 2.5.5 / Apple HIG minimum touch target. */
const MIN_TAP_TARGET_PX = 44;

/** The header is the sticky band above the fold; it must not eat the viewport. */
const MAX_HEADER_HEIGHT_PX = 120;

/** Copy smaller than this is unreadable for the site's rural, low-end-phone users. */
const MIN_BODY_COPY_PX = 14;

/** Line-height / font-size floor for the copy clusters this spec guards. */
const MIN_LEADING_RATIO = 1.4;

/** `MoreServices` renders at least this many labels on the audited page. */
const MIN_AADHAAR_SERVICE_LABELS = 10;

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

/**
 * Computed accessible names for every link matching `selector`.
 *
 * Reads Chromium's accessibility tree, so the name is the one a screen reader
 * announces: aria-label, aria-labelledby, title, text content and image alt all
 * resolve through the same computation the browser performs. Reading attributes
 * in the test would re-implement that logic and drift from the real output.
 */
async function accessibleLinkNames(page: Page, selector: string): Promise<string[]> {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('DOM.enable');
    await client.send('Accessibility.enable');

    const { nodes: axNodes } = await client.send('Accessibility.getFullAXTree');
    const namesByBackendId = new Map<number, string>();
    for (const node of axNodes) {
      if (node.backendDOMNodeId === undefined || node.role?.value !== 'link') continue;
      namesByBackendId.set(node.backendDOMNodeId, (node.name?.value ?? '').trim());
    }

    const { root } = await client.send('DOM.getDocument');
    const { nodeIds } = await client.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
    const described = await Promise.all(
      nodeIds.map((nodeId) => client.send('DOM.describeNode', { nodeId })),
    );
    return described.map(({ node }) => namesByBackendId.get(node.backendNodeId) ?? '');
  } finally {
    await client.detach();
  }
}

test.describe('P1 5: header controls are 44px tap targets at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('service chips, secondary links and the logo anchor are at least 44px tall', async ({ page }) => {
    await gotoDom(page, '/');
    const header = page.locator('[data-testid="global-header"]');
    const groups = [
      { label: 'service chips', locator: header.locator('[data-testid="service-nav"] a'), expected: 8 },
      { label: 'secondary links', locator: header.locator('a[href="/banks/"], a[href="/how-it-works/"]'), expected: 2 },
      { label: 'logo anchor', locator: header.locator('a[href="/"]'), expected: 1 },
    ];

    for (const group of groups) {
      await expect(group.locator, `${group.label} in the header`).toHaveCount(group.expected);
      const heights = await group.locator.evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().height)),
      );
      const tooShort = heights.filter((height) => height < MIN_TAP_TARGET_PX);
      expect(
        tooShort,
        `${group.label} under ${MIN_TAP_TARGET_PX}px (measured ${heights.join(', ')}px)`,
      ).toEqual([]);
    }
  });

  test('service chips render their labels at 14px', async ({ page }) => {
    await gotoDom(page, '/');
    const chips = page.locator('[data-testid="service-nav"] a');
    await expect(chips).toHaveCount(8);
    const fontSizes = await chips.evaluateAll((elements) =>
      elements.map((element) => parseFloat(getComputedStyle(element).fontSize)),
    );
    expect(fontSizes, `chip font sizes (${fontSizes.join(', ')}px)`).toEqual(
      fontSizes.map(() => MIN_BODY_COPY_PX),
    );
  });

  test('the eight chips stay on one horizontally scrollable row', async ({ page }) => {
    await gotoDom(page, '/');
    const rail = page.locator('[data-testid="service-nav"] > div');
    const railStyle = await rail.evaluate((element) => {
      const style = getComputedStyle(element);
      return { overflowX: style.overflowX, flexWrap: style.flexWrap };
    });
    expect(railStyle.overflowX).toBe('auto');
    expect(railStyle.flexWrap).toBe('nowrap');

    const tops = await page
      .locator('[data-testid="service-nav"] a')
      .evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
    expect(new Set(tops).size, `chip row tops (${tops.join(', ')})`).toBe(1);

    // The rail scrolls; the document must not.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'document horizontal overflow').toBeLessThanOrEqual(0);
  });

  test('the header never exceeds 120px tall', async ({ page }) => {
    for (const path of ['/', '/mini-statement/', '/aadhaar-link/sbi/', '/banks/']) {
      await gotoDom(page, path);
      const height = await page
        .locator('[data-testid="global-header"]')
        .evaluate((element) => Math.round(element.getBoundingClientRect().height));
      expect(height, `header height on ${path}`).toBeGreaterThan(0);
      expect(height, `header height on ${path}`).toBeLessThanOrEqual(MAX_HEADER_HEIGHT_PX);
    }
  });
});

test.describe('P1 6: 12px body copy is raised to 14px', () => {
  /** Font size and leading ratio for every match — the two numbers this block guards. */
  const measureCopy = (page: Page, selector: string) =>
    page.locator(selector).evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        const fontSize = parseFloat(style.fontSize);
        return {
          text: (element.textContent ?? '').trim().slice(0, 30),
          fontSize,
          leading: parseFloat(style.lineHeight) / fontSize,
        };
      }),
    );

  const expectReadable = (samples: Awaited<ReturnType<typeof measureCopy>>, where: string) => {
    expect(
      samples.filter((sample) => sample.fontSize < MIN_BODY_COPY_PX).map((sample) => `${sample.fontSize}px "${sample.text}"`),
      `${where}: copy under ${MIN_BODY_COPY_PX}px`,
    ).toEqual([]);
    expect(
      samples.filter((sample) => !(sample.leading >= MIN_LEADING_RATIO)).map((sample) => `${sample.leading.toFixed(2)} "${sample.text}"`),
      `${where}: leading under ${MIN_LEADING_RATIO}`,
    ).toEqual([]);
  };

  test('the mini-statement bank captions render at 14px with adequate leading', async ({ page }) => {
    await gotoDom(page, '/mini-statement/');
    await expect(page.locator('[data-testid="mini-statement-caption"]')).toHaveCount(banks.length);
    expectReadable(await measureCopy(page, '[data-testid="mini-statement-caption"]'), '/mini-statement/');
  });

  test('the aadhaar-link service labels render at 14px with adequate leading', async ({ page }) => {
    await gotoDom(page, '/aadhaar-link/sbi/');
    const labels = page.locator('[data-testid="more-services-label"]');
    expect(
      await labels.count(),
      'service labels on the audited aadhaar-link page',
    ).toBeGreaterThanOrEqual(MIN_AADHAAR_SERVICE_LABELS);
    expectReadable(await measureCopy(page, '[data-testid="more-services-label"]'), '/aadhaar-link/sbi/');
  });
});

test.describe('P1 7: bank-grid links have unique accessible names', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /** Bank page, balance number, call button, WhatsApp share. */
  const LINKS_PER_CARD = 4;

  test('no two #bank-grid links share an accessible name', async ({ page }) => {
    await gotoDom(page, '/');
    await expect(page.locator('#bank-grid a')).toHaveCount(banks.length * LINKS_PER_CARD);

    const names = await accessibleLinkNames(page, '#bank-grid a');
    expect(names).toHaveLength(banks.length * LINKS_PER_CARD);
    expect(names.filter((name) => name === ''), 'links with no accessible name').toEqual([]);

    const counts = new Map<string, number>();
    for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
    const duplicates = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([name, count]) => `${count}× "${name}"`);
    expect(duplicates, 'duplicate accessible names inside #bank-grid').toEqual([]);
  });

  test('every number link announces its bank and keeps the label off the number', async ({ page }) => {
    await gotoDom(page, '/');
    const names = await accessibleLinkNames(page, '#bank-grid a[href^="tel:"]');
    const numberNames = names.filter((name) => /\d/.test(name));
    expect(numberNames, 'one number-announcing link per bank card').toHaveLength(banks.length);

    // Chromium joins the card's block children into one name, so a number link
    // has to say which bank it belongs to or a shared number announces twice.
    const unspecific = numberNames.filter((name, index) => !name.startsWith(banks[index].nameHindi));
    expect(unspecific, 'number links whose accessible name does not start with the bank name').toEqual([]);

    // The audited defect: "मिस्ड कॉल नंबर9986454440" — a letter running into a digit.
    expect(
      numberNames.filter((name) => /\p{L}\d/u.test(name)),
      'accessible names with a label glued to the number',
    ).toEqual([]);
  });
});
