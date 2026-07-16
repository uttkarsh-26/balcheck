import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';
import { getJsonLdScripts, findSchema } from './utils';

const cases = ['sbi', 'uco-bank', 'ippb'].map(slug => banks.find(bank => bank.slug === slug)!);

for (const bank of cases) {
  test(`${bank.slug}: mobile-registration page contract`, async ({ page }) => {
    await page.goto(`/mobile-number-registration/${bank.slug}/`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href', `https://balcheck.in/mobile-number-registration/${bank.slug}/`,
    );
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(bank.shortName);
    await expect(page.locator(`a[href="tel:${bank.customerCare}"]`).first()).toBeVisible();
    await expect(page.locator('[data-testid="quick-answer"]')).toBeVisible();

    const body = ((await page.locator('body').textContent()) ?? '').replace(/\s+/g, ' ');
    expect(body).not.toMatch(/(?:registration|link|update)\s+पूरी तरह(?:\s+से)?\s+online\s+(?:होता|होती|कर सकते)/i);
    expect(body).not.toContain('branch जाने की जरूरत नहीं');

    const scripts = await getJsonLdScripts(page);
    expect(findSchema(scripts, 'HowTo')).toBeDefined();
    expect(findSchema(scripts, 'FAQPage')).toBeDefined();
    expect(findSchema(scripts, 'BreadcrumbList')).toBeDefined();
  });
}

test('UCO targets online-link intent while recommending verified channels', async ({ page }) => {
  const bank = banks.find(item => item.slug === 'uco-bank')!;
  await page.goto('/mobile-number-registration/uco-bank/');
  await expect(page).toHaveTitle(/UCO Bank Mobile Number Link Online/);
  await expect(page.locator('h1')).toContainText('UCO Bank Mobile Number Link Online');
  const answer = page.locator('[data-testid="quick-answer"]');
  await expect(answer).toContainText(bank.customerCare);
  await expect(answer).toContainText('Branch');
  await expect(answer).toContainText('दावा नहीं करते');
});

test('IPPB targets online-link intent without claiming online completion', async ({ page }) => {
  const bank = banks.find(item => item.slug === 'ippb')!;
  await page.goto('/mobile-number-registration/ippb/');
  await expect(page).toHaveTitle(/IPPB Mobile Number Link Online/);
  await expect(page.locator('h1')).toContainText('IPPB Mobile Number Link Online');
  const answer = page.locator('[data-testid="quick-answer"]');
  await expect(answer).toContainText(bank.customerCare);
  await expect(answer).toContainText(/post-office branch/i);
  await expect(answer).toContainText('दावा नहीं करते');
});
