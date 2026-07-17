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
    const expectedNumber = bank.missedCallAlt ?? bank.customerCare;
    await expect(page.locator(`a[href="tel:${expectedNumber}"]`).first()).toBeVisible();

    const scripts = await getJsonLdScripts(page);
    if (bank.missedCallAlt) expect(findSchema(scripts, 'HowTo')).toBeDefined();
    else expect(findSchema(scripts, 'HowTo')).toBeUndefined();
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
  await expect(page.locator('h1')).toHaveText('TMB Mini Statement Number');
  await expect(page).toHaveTitle(/^TMB Mini Statement Number/);
  await expect(page).toHaveTitle(new RegExp(tmb.missedCallAlt!));
  await expect(page.locator('a[href="tel:09211947474"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('09211947474');
});

test('KVB shows its verified dedicated mini-statement number (last 3 transactions)', async ({ page }) => {
  const kvb = banks.find(bank => bank.slug === 'kvb')!;
  expect(kvb.missedCallAlt).toBe('09266292665');
  await page.goto('/mini-statement/kvb/');
  await expect(page).toHaveTitle(/^KVB Mini Statement Number/);
  await expect(page).toHaveTitle(new RegExp(kvb.missedCallAlt!));
  await expect(page.locator('h1')).toHaveText('KVB Mini Statement Number');
  await expect(page.locator('a[href="tel:09266292665"]').first()).toBeVisible();
  // Must mention "last 3" because KVB returns 3 transactions, not 5
  await expect(page.locator('body')).toContainText('last 3 transactions');
  await expect(page.locator('body')).toContainText('09266292665');
});

test('Federal mini-statement page does not claim balance number gives mini statement', async ({ page }) => {
  const federal = banks.find(bank => bank.slug === 'federal')!;
  await page.goto('/mini-statement/federal/');
  await expect(page).toHaveTitle(/^Federal Bank Mini Statement/);
  await expect(page.locator('h1')).toHaveText('Federal Bank Mini Statement');
  // Must NOT claim the balance number is a mini-statement number
  await expect(page).not.toHaveTitle(new RegExp(federal.missedCall));
  const answer = page.locator('.bg-white.rounded-xl').first();
  await expect(answer).toContainText('verified नहीं');
  await expect(answer).toContainText(federal.customerCare);
});

test('KVB data has separate balance and mini-statement numbers', () => {
  const kvb = banks.find(bank => bank.slug === 'kvb')!;
  expect(kvb.missedCall).toBe('09266292666');
  expect(kvb.missedCallAlt).toBe('09266292665');
  expect(kvb.missedCall).not.toBe(kvb.missedCallAlt);
});

test('Net-banking pages have GSC-matched titles for SIB and Nainital', async ({ page }) => {
  await page.goto('/net-banking/sib/');
  await expect(page).toHaveTitle(/^SIB Net Banking Login/);
  await page.goto('/net-banking/nainital/');
  await expect(page).toHaveTitle(/^Nainital Bank Net Banking Login/);
});

test('IOB data has verified official numbers from iob.in', () => {
  const iob = banks.find(bank => bank.slug === 'iob')!;
  expect(iob.missedCall).toBe('9210622122');
  expect(iob.missedCallAlt).toBeUndefined();
  expect(iob.customerCare).toBe('1800-425-4445');
  // The old wrong customer care number must not be present
  expect(iob.customerCare).not.toBe('1800-425-4411');
  expect(iob.verified).toBe(true);
});


test('IOB bank page has GSC-matched title', async ({ page }) => {
  await page.goto('/bank/iob/');
  await expect(page).toHaveTitle(/^Indian Overseas Bank/);
  const iob = banks.find(bank => bank.slug === 'iob')!;
  await expect(page).toHaveTitle(new RegExp(iob.missedCall));
});

test('IOB mini-statement page does not claim balance number gives mini statement', async ({ page }) => {
  const iob = banks.find(bank => bank.slug === 'iob')!;
  await page.goto('/mini-statement/iob/');
  await expect(page).toHaveTitle(/^IOB Mini Statement/);
  await expect(page.locator('h1')).toHaveText('IOB Mini Statement');
  // Must NOT claim the balance number is a mini-statement number in the title
  await expect(page).not.toHaveTitle(new RegExp(iob.missedCall));
  const answer = page.locator('.bg-white.rounded-xl').first();
  await expect(answer).toContainText('verified नहीं');
  await expect(answer).toContainText(iob.customerCare);
  await expect(page.locator('body')).not.toContainText('8424022122');
});
