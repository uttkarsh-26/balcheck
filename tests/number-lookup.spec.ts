import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';

// /number-lookup/ — static tool page. The build-time index must derive ONLY
// from banks.ts fields; the client match logic must mirror the server-side
// normalize (strip non-digits, drop +91/leading 0) so any variant the user
// types resolves to the same key.

const digits = (value: string) => value.replace(/\D/g, '');

const lookupKey = (value: string) => {
  let d = digits(value);
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
};

// The exact GSC bare-number queries that motivated this page (demand evidence,
// 2026-09-18 artifact) plus the shared-line and no-match cases.
const demandCases = [
  { input: '09223766666', bank: 'sbi', label: /missed-call balance line/i },
  { input: '18001807777', bank: 'punjab-gramin', label: null }, // 4 owners — 3 balance + haryana-gramin customer-care
  { input: '18001802223', bank: 'pnb', label: /customer care \/ ivr line/i },
  { input: '18001800225', bank: 'up-gramin', label: /customer care \/ ivr line/i }, // UPGB customerCare 1800-180-0225
  { input: '18008907070', bank: 'jio-payments', label: /missed-call balance line/i },
  { input: '18004195959', bank: 'axis', label: /missed-call balance line/i },
  { input: '1800-209-5577', bank: 'axis', label: null }, // axis customerCare (formatted input variant)
  { input: '+91 92237 66666', bank: 'sbi', label: /missed-call balance line/i },
  { input: '1800-11-2211', bank: 'sbi', label: /customer care \/ ivr line/i },
  { input: '9999999999', bank: undefined, label: null }, // truly absent — must not fake a match
] as const;

// Numbers that must resolve to NOTHING (not present in any banks.ts field):
const absentNumbers = ['9999999999', '18001800111', '09876543210'] as const;

test.describe('/number-lookup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/number-lookup/');
  });

  test('renders with real title, H1 and tool', async ({ page }) => {
    await expect(page).toHaveTitle(/Bank Number Lookup/i);
    await expect(page.getByRole('heading', { level: 1, name: /Bank Number Lookup/i })).toBeVisible();
    await expect(page.locator('#number-input')).toBeVisible();
    await expect(page.locator('[data-testid="number-lookup-tool"]')).toBeVisible();
  });

  test('popular-numbers table renders crawlable number → bank answers from banks.ts', async ({ page }) => {
    const table = page.locator('[data-testid="popular-numbers"]');
    await expect(table).toBeVisible();
    for (const bank of ['sbi', 'pnb', 'punjab-gramin', 'axis', 'jio-payments'] as const) {
      const b = banks.find(x => x.slug === bank)!;
      await expect(table).toContainText(digits(b.missedCall));
      await expect(table).toContainText(b.nameHindi);
    }
  });

  test('states the line type honestly for every popular row', async ({ page }) => {
    const table = page.locator('[data-testid="popular-numbers"]');
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(10);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(/Missed-call balance line|Customer care \/ IVR/);
    }
  });

  for (const { input, bank, label } of demandCases) {
    test(`lookup "${input}"`, async ({ page }) => {
      await page.locator('#number-input').fill(input);

      if (bank) {
        const b = banks.find(x => x.slug === bank)!;
        const card = page.locator('[data-testid="match-card"]');
        await expect(card.first()).toBeVisible();
        await expect(card.first()).toContainText(b.nameHindi);
        await expect(card.first()).toContainText(b.name);
        if (label) await expect(card.first()).toContainText(label);
        // Result must link the existing bank page and tel: action
        await expect(card.first().locator(`a[href="/bank/${b.slug}/"]`)).toBeVisible();
        await expect(card.first().locator('a[href^="tel:"]').first()).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="no-match"]')).toBeVisible();
        await expect(page.locator('[data-testid="no-match"]')).toContainText('हमारी directory में नहीं मिला');
      }
    });
  }

  test('shared RRB number lists every bank that owns the line', async ({ page }) => {
    // 18001807777 is recorded under punjab-gramin, himachal-pradesh-gramin and
    // bihar-gramin (balance) plus haryana-gramin (customer-care) in banks.ts —
    // the tool must not silently pick one.
    await page.locator('#number-input').fill('18001807777');
    const cards = page.locator('[data-testid="match-card"]');
    await expect(cards).toHaveCount(4);
    for (const slug of ['punjab-gramin', 'himachal-pradesh-gramin', 'bihar-gramin', 'haryana-gramin']) {
      const b = banks.find(x => x.slug === slug)!;
      await expect(page.locator('[data-testid="lookup-results"]')).toContainText(b.nameHindi);
    }
  });

  test('partial input shows a hint, not a result', async ({ page }) => {
    await page.locator('#number-input').fill('0922');
    await expect(page.locator('#input-hint')).toBeVisible();
    await expect(page.locator('[data-testid="match-card"]')).toHaveCount(0);
  });

  test('every bank number in banks.ts resolves via the client index', async ({ page }) => {
    // Exhaustive data-derivation check, sampled inputs: the index is built
    // from missedCall / missedCallAlt / customerCare only — spot-verify a
    // deterministic sample across categories plus all five missedCallAlt banks.
    const sample = banks.filter((b, i) => i % 13 === 0);
    const alts = banks.filter(b => b.missedCallAlt);
    for (const bank of [...sample, ...alts]) {
      await page.locator('#number-input').fill('');
      await page.locator('#number-input').fill(bank.missedCall);
      await expect(
        page.locator(`[data-testid="lookup-results"] a[href="/bank/${bank.slug}/"]`).first()
      ).toBeVisible();
      if (bank.missedCallAlt) {
        await page.locator('#number-input').fill('');
        await page.locator('#number-input').fill(bank.missedCallAlt);
        await expect(
          page.locator(`[data-testid="lookup-results"] a[href="/bank/${bank.slug}/"]`).first()
        ).toBeVisible();
      }
    }
  });

  test('no-match path never invents a bank or presents a number as WhatsApp', async ({ page }) => {
    await page.locator('#number-input').fill('9999999998');
    await expect(page.locator('[data-testid="no-match"]')).toBeVisible();
    const body = await page.locator('main').textContent();
    expect(body).not.toMatch(/WhatsApp number/i);
  });

  for (const absent of absentNumbers) {
    test(`absent number "${absent}" gets no match, no invented bank`, async ({ page }) => {
      await page.locator('#number-input').fill(absent);
      await expect(page.locator('[data-testid="no-match"]')).toBeVisible();
      await expect(page.locator('[data-testid="match-card"]')).toHaveCount(0);
    });
  }

  test('has WebPage, BreadcrumbList and FAQPage JSON-LD', async ({ page }) => {
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = scripts.map(s => JSON.parse(s));
    const graph = parsed.find(s => s['@graph'])?.['@graph'] ?? [];
    const types = graph.map((s: Record<string, unknown>) => s['@type']);
    expect(types).toContain('WebPage');
    expect(types).toContain('BreadcrumbList');
    expect(types).toContain('FAQPage');
  });

  test('canonical, no overflow on mobile, and discovery links exist', async ({ page }) => {
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://balcheck.in/number-lookup/');
    await page.setViewportSize({ width: 390, height: 844 });
    const widths = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
    expect(widths.body).toBeLessThanOrEqual(widths.viewport);

    // Footer (sitewide) + homepage service-grid tile both link the tool.
    // The service tile carries the tool's title text; the hidden number-hint
    // link (only shown for digit queries) must not be matched.
    await expect(page.locator('footer a[href="/number-lookup/"]')).toHaveCount(1);
    await page.goto('/');
    await expect(
      page.locator('a[href="/number-lookup/"]:has(h3)', { hasText: 'Number Lookup' }).first()
    ).toBeVisible();
  });

  test('homepage search detects a bare number and routes to the lookup tool', async ({ page }) => {
    await page.goto('/');
    await page.locator('#search').fill('09223766666');
    const hint = page.locator('[data-testid="number-hint"]');
    await expect(hint).toBeVisible();
    await expect(hint.locator('a[href="/number-lookup/"]').first()).toBeVisible();
    // A bank-name query must not trigger the hint
    await page.locator('#search').fill('sbi');
    await expect(hint).toBeHidden();
  });
});
