import { expect, test } from '@playwright/test';

// Unknown URLs used to return a blank 0-byte page (Workers assets default).
// The recovery page must keep a 404 status, stay out of the index, and lead somewhere.
test.describe('404 page', () => {
  test('unknown URLs return a helpful 404 with recovery links', async ({ page }) => {
    const response = await page.goto('/yeh-page-maujood-nahi-hai-xyz/');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'पेज नहीं मिला' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'होम पेज पर जाएं' })).toBeVisible();

    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toBe('noindex, follow');

    // recovery paths exist and are reachable
    await expect(page.locator('a[href="/bank/sbi/"]')).toHaveCount(1);
    await expect(page.locator('a[href="/missed-call/"]')).toHaveCount(1);
    await expect(page.locator('a[href="/banks/"]').first()).toBeVisible();

    await page.getByRole('link', { name: 'होम पेज पर जाएं' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
