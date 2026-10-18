import { test, expect, type Page } from '@playwright/test';
import { gotoDom } from './utils';

/**
 * Desktop-consistency regression guards for the 2026-10 desktop audit.
 *
 * Every assertion is computed from the rendered DOM at a 1280px viewport:
 * computed font sizes, bounding boxes, computed grid/font properties. No
 * snapshots, no source reading.
 *
 * Findings covered (audit numbering):
 *  1. Type scale — one H1 and one H2 size, section H2 > card h3.
 *  2. Content measures — prose sections and the wide grid use exactly two
 *     container tokens; no element measures between them.
 *  3. Bank-card height contract on / — notes clamp to 2 lines, cards uniform.
 *  4. Chip consolidation — one Chip implementation path (data-chip markers).
 *  5. PhoneNumber consolidation — one component path with variants.
 *  6. MoreServices distribution — no single-chip orphan row.
 *  7. /number-lookup/ — submit control, Enter affordance, visible empty state.
 *  8. /bank/[slug]/ bottom CTAs >= 44px.
 *  9. Auto-ad resilience — vertical link grids align to start and give an
 *     injected ad its own full-width row.
 * 10. Latin-first font stack with tabular numerals on phone numbers.
 */

const DESKTOP = { width: 1280, height: 800 };

/** Single H1 step (desktop) from --text-h1. */
const H1_DESKTOP_PX = 36;
/** Single H2 step from --text-h2. */
const H2_PX = 20;
/** Card h3 stays one step below the section H2. */
const CARD_H3_PX = 16;
/** The two container measures: --container-copy (48rem) and --container-wide (72rem). */
const COPY_MEASURE_PX = 768;
const WIDE_MEASURE_PX = 1152;
/** Bank-card height tolerance for the 2-line note contract. */
const CARD_HEIGHT_TOLERANCE_PX = 12;
/** WCAG 2.5.5 tap-target floor. */
const MIN_TAP_TARGET_PX = 44;

test.beforeEach(({ }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'desktop-only spec');
});

test.use({ viewport: DESKTOP });

const SAMPLED_PAGES = ['/', '/about/', '/bank/sbi/', '/balance-enquiry/sbi/', '/number-lookup/', '/how-it-works/'];

async function fontSizeOf(page: Page, selector: string): Promise<number[]> {
  return page.$$eval(selector, els => els.map(el => parseFloat(getComputedStyle(el).fontSize)));
}

test('finding 1: one H1 size across template families', async ({ page }) => {
  for (const path of SAMPLED_PAGES) {
    await gotoDom(page, path);
    const sizes = await fontSizeOf(page, 'main h1');
    expect(sizes.length, `${path} has an h1`).toBeGreaterThan(0);
    expect([...new Set(sizes)], `${path} h1s share one size`).toHaveLength(1);
    expect(sizes[0], `${path} h1 is the token size`).toBe(H1_DESKTOP_PX);
  }
});

test('finding 1: one H2 size and section H2 outranks card h3', async ({ page }) => {
  for (const path of SAMPLED_PAGES) {
    await gotoDom(page, path);
    // The video hero banner title is a display element with its own token,
    // documented in AGENTS.md; every other h2 is a section heading.
    const sizes = await page.$$eval('main h2', els =>
      els
        .filter(el => !el.closest('[data-hero-banner]'))
        .map(el => parseFloat(getComputedStyle(el).fontSize)),
    );
    expect([...new Set(sizes)], `${path} section h2s share one size`).toHaveLength(1);
    expect(sizes[0], `${path} h2 is the token size`).toBe(H2_PX);
  }
  await gotoDom(page, '/');
  const h3 = await fontSizeOf(page, '.bank-card h3');
  expect(h3[0]).toBe(CARD_H3_PX);
  expect(H2_PX).toBeGreaterThan(CARD_H3_PX);
});

test('finding 2: exactly two container measures, nothing between them', async ({ page }) => {
  for (const path of ['/', '/bank/sbi/', '/number-lookup/', '/banks/']) {
    await gotoDom(page, path);
    const offenders = await page.evaluate(() => {
      const bad: number[] = [];
      for (const el of document.querySelectorAll('main *')) {
        const mw = parseFloat(getComputedStyle(el).maxWidth);
        if (!Number.isNaN(mw) && mw > 768 && mw < 1152) bad.push(Math.round(mw));
      }
      return bad;
    });
    expect(offenders, `${path} has no ad-hoc container measure`).toEqual([]);
  }
  await gotoDom(page, '/');
  const hasCopy = await page.evaluate(px => [...document.querySelectorAll('main *')].some(el => Math.abs(parseFloat(getComputedStyle(el).maxWidth) - px) < 0.5), COPY_MEASURE_PX);
  const hasWide = await page.evaluate(px => [...document.querySelectorAll('main *')].some(el => Math.abs(parseFloat(getComputedStyle(el).maxWidth) - px) < 0.5), WIDE_MEASURE_PX);
  expect(hasCopy, 'the copy measure is in use').toBe(true);
  expect(hasWide, 'the wide measure is in use').toBe(true);
});

test('finding 3: bank cards share one height and notes clamp to 2 lines', async ({ page }) => {
  await gotoDom(page, '/');
  const contract = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.bank-card')];
    const heights = cards.map(c => Math.round(c.getBoundingClientRect().height));
    const note = document.querySelector('.bank-card [data-testid="bank-note"]');
    return {
      min: Math.min(...heights),
      max: Math.max(...heights),
      lineClamp: note ? getComputedStyle(note).webkitLineClamp : null,
    };
  });
  expect(contract.max - contract.min, 'card heights uniform').toBeLessThanOrEqual(CARD_HEIGHT_TOLERANCE_PX);
  expect(contract.lineClamp, 'note clamped to 2 lines').toBe('2');
});

test('finding 4: every chip renders through the Chip component', async ({ page }) => {
  await gotoDom(page, '/');
  const categoryChips = await page.$$eval('#categories button', els =>
    els.map(el => ({ chip: el.hasAttribute('data-chip'), h: Math.round(el.getBoundingClientRect().height) })),
  );
  expect(categoryChips.length).toBeGreaterThanOrEqual(8);
  for (const c of categoryChips) {
    expect(c.chip, 'category chip comes from Chip').toBe(true);
    expect(c.h, 'category chip meets the tap floor').toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);
  }
  const railChips = await page.$$eval('[data-testid="service-nav"] a', els =>
    els.map(el => ({ chip: el.hasAttribute('data-chip'), h: Math.round(el.getBoundingClientRect().height) })),
  );
  expect(railChips.length).toBeGreaterThanOrEqual(8);
  for (const c of railChips) {
    expect(c.chip, 'header rail chip comes from Chip').toBe(true);
    expect(c.h).toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);
  }
  await gotoDom(page, '/bank/sbi/');
  const cardChips = await page.$$eval('[data-testid="more-services"] [data-chip]', els =>
    els.map(el => ({ h: Math.round(el.getBoundingClientRect().height) })),
  );
  expect(cardChips.length).toBeGreaterThanOrEqual(8);
  for (const c of cardChips) expect(c.h, 'MoreServices chip keeps its larger step').toBe(52);
});

test('finding 5: PhoneNumber renders through one component with variants', async ({ page }) => {
  await gotoDom(page, '/');
  const boxed = await page.$$eval('[data-phone="boxed"]', els =>
    els.map(el => {
      const s = getComputedStyle(el);
      return { size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight), color: s.color, numeric: s.fontVariantNumeric };
    }),
  );
  expect(boxed.length).toBeGreaterThan(0);
  for (const p of boxed) {
    expect(p.size).toBe(20);
    expect(p.weight).toBe(700);
    expect(p.color).toBe('rgb(29, 78, 216)'); // brand-700
    expect(p.numeric).toContain('tabular-nums');
  }
  await gotoDom(page, '/bank/sbi/');
  const variants = await page.$$eval('[data-phone]', els =>
    els.map(el => {
      const s = getComputedStyle(el);
      return { variant: el.getAttribute('data-phone'), size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight), color: s.color, numeric: s.fontVariantNumeric };
    }),
  );
  expect(variants.length).toBeGreaterThan(0);
  for (const p of variants) expect(p.numeric, `${p.variant} uses tabular numerals`).toContain('tabular-nums');
  const inline = variants.filter(v => v.variant === 'inline');
  expect(inline.length).toBeGreaterThan(0);
  for (const p of inline) {
    expect(p.size).toBe(18);
    expect(p.weight).toBe(600);
    expect(p.color).toBe('rgb(29, 78, 216)'); // brand-700
  }
  const pill = variants.filter(v => v.variant === 'pill');
  expect(pill.length).toBeGreaterThan(0);
  for (const p of pill) {
    expect(p.size).toBe(16);
    expect(p.weight).toBe(500);
    expect(p.color).toBe('rgb(255, 255, 255)');
  }
  // One measure per variant on the page: the display number stays the hero size.
  const display = variants.filter(v => v.variant === 'display');
  for (const p of display) expect(p.size).toBe(36);
});

test('finding 6: MoreServices grid never orphans a single chip', async ({ page }) => {
  await gotoDom(page, '/bank/sbi/');
  const rows = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('[data-testid="more-services"] [data-chip]')];
    const byTop = new Map<number, number>();
    for (const c of chips) {
      const top = Math.round(c.getBoundingClientRect().top);
      byTop.set(top, (byTop.get(top) ?? 0) + 1);
    }
    return [...byTop.values()];
  });
  expect(rows.length).toBeGreaterThanOrEqual(2);
  expect(rows[rows.length - 1], 'last row holds more than one chip').toBeGreaterThanOrEqual(2);
});

test('finding 7: number-lookup has a submit control and a visible empty state', async ({ page }) => {
  await gotoDom(page, '/number-lookup/');
  const tool = page.locator('[data-testid="number-lookup-tool"]');
  const submit = tool.locator('button[type="submit"]');
  await expect(submit, 'an explicit submit button exists').toHaveCount(1);
  const formOwnsInput = await page.evaluate(() => Boolean(document.getElementById('number-input')?.closest('form')));
  expect(formOwnsInput, 'the input is inside a form so Enter submits').toBe(true);
  const emptyBox = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="lookup-empty"]');
    if (!el) return null;
    return Math.round(el.getBoundingClientRect().height);
  });
  expect(emptyBox, 'the empty state renders with real height before any input').toBeGreaterThan(40);
  // Functional: Enter submits and a known SBI number resolves.
  await page.fill('#number-input', '9223766666');
  await page.press('#number-input', 'Enter');
  await expect(page.locator('[data-testid="match-card"]').first()).toBeVisible();
});

test('finding 8: bank page bottom CTAs meet the 44px floor', async ({ page }) => {
  await gotoDom(page, '/bank/sbi/');
  const heights = await page.evaluate(() =>
    [...document.querySelectorAll('footer a[href^="https://wa.me/"], footer a[href^="mailto:"]')].map(
      a => Math.round(a.getBoundingClientRect().height),
    ),
  );
  expect(heights.length).toBeGreaterThanOrEqual(2);
  for (const h of heights) expect(h, 'bottom CTA >= 44px').toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);
});

test('finding 9: vertical link grids are ad-resilient', async ({ page }) => {
  await gotoDom(page, '/balance-enquiry/sbi/');
  const grids = await page.evaluate(() => {
    const grids = [...document.querySelectorAll('main div.grid')].filter(g => g.className.includes('ads-resilient'));
    return grids.map(g => {
      const probe = document.createElement('div');
      probe.className = 'google-auto-placed';
      g.appendChild(probe);
      const s = getComputedStyle(probe);
      const result = { align: getComputedStyle(g).alignItems, colStart: s.gridColumnStart, colEnd: s.gridColumnEnd };
      probe.remove();
      return result;
    });
  });
  expect(grids.length).toBeGreaterThanOrEqual(1);
  for (const g of grids) {
    expect(g.align, 'cards align to start, not stretch').toBe('start');
    expect(g.colStart, 'an injected ad takes its own full-width row').toBe('1');
    expect(g.colEnd).toBe('-1');
  }
});

test('finding 10: Latin-first font stack and tabular phone numerals', async ({ page }) => {
  await gotoDom(page, '/bank/sbi/');
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(bodyFont.toLowerCase().startsWith('noto sans devanagari'), 'Latin glyphs come first, not Devanagari Latin').toBe(false);
  expect(bodyFont.toLowerCase()).toContain('noto sans devanagari');
  const numerics = await page.$$eval('[data-phone]', els => els.map(el => getComputedStyle(el).fontVariantNumeric));
  expect(numerics.length).toBeGreaterThan(0);
  for (const n of numerics) expect(n).toContain('tabular-nums');
});
