import { test, expect } from '@playwright/test';
import { banks, categories, categoryHindi } from '../src/data/banks';
import { categorySlug, getJsonLdScripts, findSchema } from './utils';

test.describe('homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero heading and key stats', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'बैंक बैलेंस मिस्ड कॉल नंबर' })).toBeVisible();
    await expect(page.locator('body')).toContainText(`${banks.length}+ बैंक`);
    await expect(page.locator('body')).toContainText('24×7');
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

  test('has homepage JSON-LD schemas', async ({ page }) => {
    const scripts = await getJsonLdScripts(page);
    expect(findSchema(scripts, 'WebSite')).toBeDefined();
    expect(findSchema(scripts, 'Organization')).toBeDefined();
    expect(findSchema(scripts, 'FAQPage')).toBeDefined();
    expect(findSchema(scripts, 'BreadcrumbList')).toBeDefined();
  });

  test('navigates to how-it-works page', async ({ page }) => {
    await page.locator('a[href="/how-it-works/"]').first().click();
    await expect(page).toHaveURL('/how-it-works/');
    await expect(page.getByRole('heading', { level: 1, name: 'मिस्ड कॉल से बैंक बैलेंस कैसे चेक करें' })).toBeVisible();
  });
});
