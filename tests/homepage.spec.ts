import { test, expect } from './fixtures';
import { banks, categories, categoryHindi } from '../src/data/banks';
import { gotoDom, categorySlug, getJsonLdScripts, findSchema } from './utils';

test.describe('homepage', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDom(page, '/');
  });

  test('renders demand-led hero without unsupported universal claims', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'बैंक बैलेंस चेक नंबर' })).toBeVisible();
    await expect(page.locator('body')).toContainText(`${banks.length} बैंक`);
    await expect(page.locator('body')).not.toContainText('100%');
    await expect(page.locator('body')).not.toContainText('24×7');
  });

  test('renders one bank card for every bank', async ({ page }) => {
    const cards = page.locator('.bank-card');
    await expect(cards).toHaveCount(banks.length);

    const first = banks[0];
    await expect(cards.first()).toContainText(first.nameHindi);
    await expect(cards.first()).toContainText(first.missedCall);
  });

  test('search input filters bank cards', async ({ page }) => {
    const search = page.locator('#search');
    await search.fill('SBI');

    const visibleCards = page.locator('.bank-card:not([style*="display: none"])');
    await expect(visibleCards).toHaveCount(1);
    await expect(visibleCards.first()).toContainText('भारतीय स्टेट बैंक');
  });

  test('search matches the Devanagari spelling of bank acronyms', async ({ page }) => {
    const search = page.locator('#search');
    const visibleCards = page.locator('.bank-card:not([style*="display: none"])');

    // Rural users type the Hindi acronym; these banks' Hindi names are
    // translations (भारतीय स्टेट बैंक), so the query used to return nothing.
    await search.fill('एसबीआई');
    await expect(visibleCards).toHaveCount(1);
    await expect(visibleCards.first()).toContainText('भारतीय स्टेट बैंक');

    await search.fill('पीएनबी');
    await expect(visibleCards).toHaveCount(1);
    await expect(visibleCards.first()).toContainText('पंजाब नेशनल बैंक');

    // multi-word queries match token-wise, any order
    await search.fill('sbi bank');
    await expect(visibleCards).toHaveCount(1);
    await expect(visibleCards.first()).toContainText('भारतीय स्टेट बैंक');

    // "union बैंक" matches Union Bank of India AND City Union Bank (सिटी यूनियन बैंक)
    await search.fill('union बैंक');
    await expect(visibleCards).toHaveCount(2);
    await expect(visibleCards.first()).toContainText('यूनियन बैंक');

    await search.fill('ककककक');
    await expect(page.getByRole('status')).toContainText('कोई बैंक नहीं मिला');
  });

  for (const viewport of [{ width: 1280, height: 720 }, { width: 393, height: 727 }]) {
    test(`search feedback stays near the field at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const search = page.locator('#search');
      const status = page.getByRole('status');
      await expect(status).toHaveAttribute('aria-live', 'polite');
      await expect(status).toHaveAttribute('aria-atomic', 'true');
      await expect(status).toBeEmpty();
      await search.evaluate(el => el.scrollIntoView({ block: 'center' }));
      await search.fill('xyznotabank');
      await expect(status).toContainText('कोई बैंक नहीं मिला');
      await expect(status).toContainText('अलग नाम');
      await expect(search).toBeFocused();
      const inputBox = (await search.boundingBox())!;
      const statusBox = (await status.boundingBox())!;
      expect(statusBox.y - (inputBox.y + inputBox.height)).toBeLessThan(24);
      expect(statusBox.y + statusBox.height).toBeLessThan(viewport.height);

      await search.fill('09223766666');
      await expect(status).toContainText('Number Lookup');
      const hint = page.getByTestId('number-hint');
      const link = hint.getByRole('link', { name: /Number Lookup/ });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/number-lookup/');
      await expect(search).toBeFocused();
      const linkBox = (await link.boundingBox())!;
      expect(linkBox.height).toBeGreaterThanOrEqual(44);
      expect(linkBox.y - (inputBox.y + inputBox.height)).toBeLessThan(100);
      expect(linkBox.y + linkBox.height).toBeLessThan(viewport.height);
      await expect(status.locator('a')).toHaveCount(0);

      await search.fill('');
      await expect(hint).toBeHidden();
      await expect(page.locator('.bank-card:visible')).toHaveCount(banks.length);
      await expect(status).toContainText(`${banks.length}`);
    });
  }

  test('search feedback follows the latest query and selected category', async ({ page }) => {
    const search = page.locator('#search');
    const status = page.getByRole('status');
    const cards = page.locator('.bank-card:visible');
    await page.clock.install();
    await search.fill('xyznotabank');
    await expect(cards).toHaveCount(0);
    await page.clock.fastForward(100);
    await search.fill('sbi bank');
    await expect(cards).toHaveCount(1);
    await page.clock.fastForward(200);
    await expect(status).toBeEmpty();
    await page.clock.fastForward(1000);
    await expect(status).toContainText('1');
    await page.locator('button[data-cat="Private Sector"]').click();
    await expect(cards).toHaveCount(0);
    await page.clock.fastForward(1000);
    await expect(status).toContainText('कोई बैंक नहीं मिला');
    await search.fill('');
    const privateCount = banks.filter(b => b.category === 'Private Sector').length;
    await expect(cards).toHaveCount(privateCount);
    await page.clock.fastForward(1000);
    await expect(status).toContainText(`${privateCount}`);
  });

  test('search feedback stays visible for an empty category intersection', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 727 });
    await page.locator('#search').fill('sbi bank');
    await expect(page.locator('.bank-card:visible')).toHaveCount(1);
    const privateCategory = page.locator('button[data-cat="Private Sector"]');
    await privateCategory.evaluate(element => element.scrollIntoView({ block: 'center' }));
    await expect(page.locator('#search')).not.toBeInViewport();
    await privateCategory.click();
    await expect(page.locator('.bank-card:visible')).toHaveCount(0);
    const empty = page.getByTestId('bank-search-empty');
    await expect(empty).toContainText('category');
    await expect(empty).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('status')).toHaveCount(1);
    await page.locator('button[data-cat="all"]').click();
    await expect(empty).toBeHidden();
  });

  test('category tabs filter bank cards', async ({ page }) => {
    const privateCategory = categories.find(c => c === 'Private Sector')!;
    const privateCount = banks.filter(b => b.category === privateCategory).length;

    await page.locator(`button[data-cat="${privateCategory}"]`).click();

    const visibleCards = page.locator('.bank-card:not([style*="display: none"])');
    await expect(visibleCards).toHaveCount(privateCount);
  });

  test('category quick links point to valid category pages', async ({ page }) => {
    for (const cat of categories) {
      const link = page.locator(`a[href="/banks/${categorySlug(cat)}/"]`).first();
      await expect(link).toContainText(categoryHindi[cat]);
    }
  });

  test('links directly to every banking service hub', async ({ page }) => {
    const serviceHubs = [
      'customer-care', 'net-banking', 'sms-banking', 'mini-statement',
      'balance-enquiry', 'toll-free-number', 'mobile-number-registration',
      'aadhaar-link', 'atm-pin', 'missed-call',
    ];

    // Scoped to the page body: the header rail is collapsed behind a disclosure
    // on mobile (see SiteHeader), so chrome links are not the surface under test.
    for (const hub of serviceHubs) {
      await expect(page.locator(`main a[href="/${hub}/"]`).first()).toBeVisible();
    }
  });

  test('has homepage JSON-LD schemas', async ({ page }) => {
    const scripts = await getJsonLdScripts(page);
    expect(findSchema(scripts, 'WebSite')).toBeDefined();
    expect(findSchema(scripts, 'Organization')).toBeDefined();
    expect(findSchema(scripts, 'FAQPage')).toBeDefined();
    expect(findSchema(scripts, 'BreadcrumbList')).toBeDefined();
  });

  test('navigates to how-it-works page', async ({ page }) => {
    await page.locator('main a[href="/how-it-works/"]').first().click();
    await expect(page).toHaveURL('/how-it-works/');
    await expect(page.getByRole('heading', { level: 1, name: 'मिस्ड कॉल से बैंक बैलेंस कैसे चेक करें' })).toBeVisible();
  });
});
