import { test, expect } from '@playwright/test';
import { banks, categories } from '../src/data/banks';
import { gotoDom, categorySlug } from './utils';
import { isTrueTollFreeNumber } from '../src/lib/phone';
import { resolveLegacyRedirect } from '../src/lib/legacy-redirects.mjs';

const serviceOrder = [
  'balance-enquiry',
  'mini-statement',
  'customer-care',
  'net-banking',
  'sms-banking',
  'mobile-number-registration',
  'aadhaar-link',
  'atm-pin',
] as const;

const detailFamilies = [
  'balance-enquiry',
  'mini-statement',
  'customer-care',
  'net-banking',
  'sms-banking',
  'mobile-number-registration',
  'aadhaar-link',
  'atm-pin',
  'toll-free-number',
] as const;

test('classifies only normalized 1800 numbers as toll-free', () => {
  expect(isTrueTollFreeNumber('1800-123-4567')).toBe(true);
  expect(isTrueTollFreeNumber('1800 123 4567')).toBe(true);
  expect(isTrueTollFreeNumber('18001234567')).toBe(true);
  expect(isTrueTollFreeNumber('1860-123-4567')).toBe(false);
  expect(isTrueTollFreeNumber('080-12345678')).toBe(false);
});

test.describe('demand-led homepage architecture', () => {
  test('puts the concise balance-enquiry hero, search, and popular banks before the directory', async ({ page }) => {
    await gotoDom(page, '/');

    await expect(page).toHaveTitle(new RegExp(`बैंक बैलेंस चेक नंबर.*${banks.length} बैंक`));
    await expect(page.getByRole('heading', { level: 1, name: 'बैंक बैलेंस चेक नंबर' })).toBeVisible();
    await expect(page.locator('body')).toContainText(`${banks.length} बैंक`);
    await expect(page.locator('body')).not.toContainText('100%');
    await expect(page.locator('body')).not.toContainText('24×7');
    await expect(page.locator('body')).not.toContainText('सभी बैंकों की missed call balance enquiry सेवा बिल्कुल मुफ़्त');
    await expect(page.locator('video')).toHaveCount(0);

    const order = await page.locator('main').evaluate((main) => {
      const ids = ['search', 'popular-banks', 'bank-grid'];
      return ids.map(id => Array.from(main.querySelectorAll(`#${id}`))[0]?.compareDocumentPosition(main.querySelector(`#${ids[ids.indexOf(id) + 1]}`) ?? main));
    });
    expect(order.length).toBe(3);
    await expect(page.locator('#popular-banks a').first()).toBeVisible();
  });

  test('uses a single shared global header with demand-ordered service navigation', async ({ page }) => {
    await gotoDom(page, '/');
    await expect(page.locator('[data-testid="global-header"]')).toHaveCount(1);

    const hrefs = await page.locator('[data-testid="service-nav"] a').evaluateAll((links) => links.map(link => link.getAttribute('href')));
    expect(hrefs.slice(0, serviceOrder.length)).toEqual(serviceOrder.map(slug => `/${slug}/`));
  });

  test('does not create page-level horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoDom(page, '/');
    const widths = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
    expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  });

  test('links the banks hub and every bank category', async ({ page }) => {
    await gotoDom(page, '/');
    await expect(page.locator('a[href="/banks/"]').first()).toBeVisible();
    for (const category of categories) {
      await expect(page.locator(`a[href="/banks/${categorySlug(category)}/"]`).first()).toBeVisible();
    }

    await gotoDom(page, '/banks/');
    await expect(page.getByRole('heading', { level: 1, name: /bank directory/i })).toBeVisible();
    await expect(page.locator('main a[href^="/banks/"]')).toHaveCount(categories.length);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(schemas.join('\n')).toContain('ItemList');
  });
});

test.describe('truthful service architecture', () => {
  test('avoids universal source and free-service claims on public guides', async ({ page }) => {
    await gotoDom(page, '/');
    let html = await page.content();
    expect(html).not.toContain('ये सभी नंबर आधिकारिक बैंक वेबसाइटों से लिए गए हैं');
    expect(html).not.toContain('यह सेवा बिल्कुल मुफ़्त है');

    await gotoDom(page, '/how-it-works/');
    html = await page.content();
    expect(html).not.toContain('सभी बैंकों की missed call balance enquiry सेवा बिल्कुल मुफ़्त है');
    expect(html).not.toContain('�');
  });

  test('retires legacy toll-free URLs for banks without a true 1800 number', async ({ page }) => {
    const nonTollFree = banks.filter(bank => !isTrueTollFreeNumber(bank.customerCare));
    expect(nonTollFree.length).toBeGreaterThan(0);

    for (const bank of nonTollFree) {
      const legacy = `/toll-free-number/${bank.slug}/`;
      // The route is gone: a page that only declared a different canonical let
      // Google index the legacy URL itself, so consolidation is a 301 now.
      const response = await page.request.get(legacy);
      expect(response.status(), `${legacy} must not be built`).toBe(404);
      expect(resolveLegacyRedirect(legacy), `${legacy} must 301 to customer care`)
        .toBe(`/customer-care/${bank.slug}/`);
    }
  });

  test('adds the reusable more-services block to every service detail family', async ({ page }) => {
    const bank = banks.find(item => item.slug === 'sbi')!;
    // serviceOrder entries + the data-driven extras MoreServices appends:
    // missed-call (only when balanceMode === 'missed-call') and toll-free
    // (only for a real 1800 customer-care number).
    const expectedLinks =
      serviceOrder.length +
      (bank.balanceMode === 'missed-call' ? 1 : 0) +
      (isTrueTollFreeNumber(bank.customerCare) ? 1 : 0);

    for (const family of detailFamilies) {
      await gotoDom(page, `/${family}/sbi/`);
      await expect(page.locator('[data-testid="more-services"]')).toBeVisible();
      await expect(page.locator('[data-testid="more-services"] a')).toHaveCount(expectedLinks);
    }
  });

  test('retains direct customer-care calling on setup and enquiry guides', async ({ page }) => {
    const bank = banks.find(item => item.slug === 'sbi')!;
    for (const family of ['balance-enquiry', 'net-banking', 'aadhaar-link', 'atm-pin']) {
      await gotoDom(page, `/${family}/${bank.slug}/`);
      await expect(page.locator(`a[href="tel:${bank.customerCare}"]`).first()).toBeVisible();
    }
  });

  test('only exposes toll-free label/link for a true 1800 customer-care number', async ({ page }) => {
    const tollFree = banks.find(bank => isTrueTollFreeNumber(bank.customerCare));
    const nonTollFree = banks.find(bank => !isTrueTollFreeNumber(bank.customerCare));
    expect(tollFree).toBeDefined();
    expect(nonTollFree).toBeDefined();

    await gotoDom(page, `/toll-free-number/${tollFree!.slug}/`);
    await expect(page.locator('[data-testid="toll-free-label"]')).toContainText(/toll[- ]free/i);

    // No true 1800 number → no toll-free route at all, and the bank page's
    // helpline tile sends the user to customer care instead.
    await expect(page.locator('[data-testid="toll-free-label"]')).toHaveCount(1);
    const response = await page.request.get(`/toll-free-number/${nonTollFree!.slug}/`);
    expect(response.status(), `${nonTollFree!.slug} has no true 1800 number, so no toll-free page exists`).toBe(404);

    await gotoDom(page, `/bank/${nonTollFree!.slug}/`);
    await expect(page.getByTestId('helpline-tile'))
      .toHaveAttribute('href', `/customer-care/${nonTollFree!.slug}/`);
    await expect(page.getByTestId('helpline-tile')).toContainText('Customer Care');

    // A true 1800 bank keeps the toll-free route and its label.
    await gotoDom(page, `/bank/${tollFree!.slug}/`);
    await expect(page.getByTestId('helpline-tile'))
      .toHaveAttribute('href', `/toll-free-number/${tollFree!.slug}/`);
    await expect(page.getByTestId('helpline-tile')).toContainText('Toll Free Number');
  });

  test('does not misrepresent external bank login sites as BalCheck WebSite schema', async ({ page }) => {
    await gotoDom(page, '/net-banking/sbi/');
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = schemas.flatMap(value => {
      const schema = JSON.parse(value);
      return schema['@graph'] ?? [schema];
    });
    expect(parsed.some(schema => schema['@type'] === 'WebSite')).toBe(false);
    expect(parsed.some(schema => schema['@type'] === 'WebPage')).toBe(true);
  });

  test('emits GSC-compliant uploadDate on video schema and one canonical', async ({ page }) => {
    await gotoDom(page, '/net-banking/sbi/');
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const video = scripts.flatMap(value => {
      const schema = JSON.parse(value);
      return schema['@graph'] ?? [schema];
    }).find(schema => schema['@type'] === 'VideoObject');
    expect(video).toBeTruthy();
    // GSC requires uploadDate as a full ISO 8601 datetime with timezone (not date-only, not undefined)
    expect(video!.uploadDate).toBeTruthy();
    expect(video!.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/$/);
  });
});

test.describe('service hub structured data', () => {
  for (const family of detailFamilies) {
    test(`${family} hub exposes an ItemList`, async ({ page }) => {
      await gotoDom(page, `/${family}/`);
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(schemas.join('\n')).toContain('ItemList');
    });
  }
});
