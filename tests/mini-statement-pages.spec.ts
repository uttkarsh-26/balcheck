import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';
import { getJsonLdScripts, findSchema } from './utils';

const cases = ['sbi', 'boi', 'axis'].map(slug => banks.find(bank => bank.slug === slug)!);

for (const bank of cases) {
  test(`${bank.slug}: mini-statement page contract`, async ({ page }) => {
    await page.goto(`/mini-statement/${bank.slug}/`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href', `https://balcheck.in/mini-statement/${bank.slug}/`,
    );
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(bank.shortName);
    await expect(page.locator('body')).toContainText(bank.customerCare);
    const expectedNumber = bank.missedCallAlt ?? bank.missedCall;
    await expect(page.locator(`a[href="tel:${expectedNumber}"]`).first()).toBeVisible();

    const scripts = await getJsonLdScripts(page);
    expect(findSchema(scripts, 'HowTo')).toBeDefined();
    expect(findSchema(scripts, 'FAQPage')).toBeDefined();
    expect(findSchema(scripts, 'BreadcrumbList')).toBeDefined();
  });
}

test('BOI targets its verified dedicated mini-statement number', async ({ page }) => {
  const boi = banks.find(bank => bank.slug === 'boi')!;
  await page.goto('/mini-statement/boi/');
  await expect(page).toHaveTitle(/^BOI Mini Statement Number/);
  await expect(page).toHaveTitle(new RegExp(boi.missedCallAlt!));
  await expect(page.locator('h1')).toHaveText('BOI Mini Statement Number');
  await expect(page.locator('.bg-white.rounded-xl').first()).toContainText(boi.missedCallAlt!);
});

test('Axis answers demand without mislabelling its balance number', async ({ page }) => {
  const axis = banks.find(bank => bank.slug === 'axis')!;
  await page.goto('/mini-statement/axis/');
  await expect(page).toHaveTitle(/^Axis Bank Mini Statement/);
  await expect(page).not.toHaveTitle(new RegExp(axis.missedCall));
  await expect(page.locator('h1')).toHaveText('Axis Bank Mini Statement');
  const answer = page.locator('.bg-white.rounded-xl').first();
  await expect(answer).toContainText('verified नहीं');
  await expect(answer).toContainText(axis.customerCare);
});

test('TMB uses its official dedicated last-five-transactions number', async ({ page }) => {
  const tmb = banks.find(bank => bank.slug === 'tmb')!;
  expect(tmb.missedCallAlt).toBe('09211947474');
  await page.goto('/mini-statement/tmb/');
  await expect(page.locator('h1')).toHaveText('TMB Mini Statement');
  await expect(page.locator('a[href="tel:09211947474"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('09211947474');
});
