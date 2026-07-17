import { test, expect } from '@playwright/test';

test('Cooperative category aligns title, H1 and body with GSC demand', async ({ page }) => {
  await page.goto('/banks/cooperative-bank/');
  await expect(page).toHaveTitle(/Cooperative Bank Balance Check Number/i);
  await expect(page.locator('h1')).toContainText('Cooperative Bank Balance Check Number');
  await expect(page.locator('main')).toContainText('Cooperative bank balance check number');
});

test('TMB net-banking page targets login and netbanking variants', async ({ page }) => {
  await page.goto('/net-banking/tmb/');
  await expect(page).toHaveTitle(/TMB Net Banking Login/i);
  await expect(page).toHaveTitle(/TMB Netbanking/i);
  await expect(page.locator('h1')).toContainText('TMB Net Banking');
});

test('Punjab Gramin SMS page targets balance-check-number demand', async ({ page }) => {
  await page.goto('/sms-banking/punjab-gramin/');
  await expect(page).toHaveTitle(/Punjab Gramin Bank Balance Check Number/i);
  await expect(page.locator('h1')).toHaveText('Punjab Gramin Bank Balance Check Number');
});

test('service pages expose reciprocal discovery links', async ({ page }) => {
  const cases = [
    ['/sms-banking/sbi/', ['/mini-statement/sbi/', '/balance-enquiry/sbi/']],
    ['/mini-statement/sbi/', ['/sms-banking/sbi/', '/balance-enquiry/sbi/']],
    ['/balance-enquiry/sbi/', ['/sms-banking/sbi/', '/mini-statement/sbi/']],
    ['/net-banking/sbi/', ['/sms-banking/sbi/', '/balance-enquiry/sbi/']],
  ] as const;

  for (const [path, links] of cases) {
    await page.goto(path);
    for (const href of links) {
      await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
    }
  }
});

test('breadcrumb schema uses canonical slash for Home', async ({ page }) => {
  for (const path of ['/net-banking/sbi/', '/sms-banking/sbi/', '/mini-statement/sbi/']) {
    await page.goto(path);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const breadcrumb = schemas
      .map((value) => JSON.parse(value))
      .flatMap((value) => value['@graph'] ?? [value])
      .find((value) => value['@type'] === 'BreadcrumbList');
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement[0].item).toBe('https://balcheck.in/');
  }
});
