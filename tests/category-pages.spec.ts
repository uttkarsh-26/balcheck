import { test, expect } from '@playwright/test';
import { banks, categories, categoryHindi } from '../src/data/banks';
import { categorySlug, getJsonLdScripts, findSchema } from './utils';

for (const category of categories) {
  const slug = categorySlug(category);
  const catBanks = banks.filter(b => b.category === category);

  test.describe(`/banks/${slug}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/banks/${slug}`);
    });

    test('renders category heading and count', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1, name: new RegExp(categoryHindi[category]) })).toBeVisible();
      await expect(page.locator('body')).toContainText(`${catBanks.length} बैंक`);
    });

    test('renders a card for every bank in the category', async ({ page }) => {
      const links = page.locator('a[href^="/bank/"]');
      // Each bank has two links: name and detail button
      await expect(links).toHaveCount(catBanks.length * 2);

      for (const bank of catBanks.slice(0, 3)) {
        await expect(page.locator('body')).toContainText(bank.nameHindi);
        await expect(page.locator('body')).toContainText(bank.missedCall);
      }
    });

    test('has CollectionPage and BreadcrumbList JSON-LD', async ({ page }) => {
      const scripts = await getJsonLdScripts(page);
      const collection = findSchema(scripts, 'CollectionPage') as Record<string, unknown> | undefined;
      expect(collection).toBeDefined();
      expect(collection?.mainEntity).toBeDefined();

      const mainEntity = collection?.mainEntity as Record<string, unknown> | undefined;
      expect(mainEntity?.numberOfItems).toBe(catBanks.length);

      expect(findSchema(scripts, 'BreadcrumbList')).toBeDefined();
    });

    test('links to every other category', async ({ page }) => {
      for (const other of categories) {
        const link = page.locator(`a[href="/banks/${categorySlug(other)}/"]`).first();
        await expect(link).toBeVisible();
        await expect(link).toContainText(categoryHindi[other]);
      }
    });
  });
}
