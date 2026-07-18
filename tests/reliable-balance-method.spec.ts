import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';

const normalize = (value: string) => value.replace(/\D/g, '');
const fallbacks = banks.filter(bank => normalize(bank.missedCall) === normalize(bank.customerCare));

test('every overloaded balance/customer-care number is conservatively classified', () => {
  expect(fallbacks.length).toBeGreaterThan(0);
  for (const bank of fallbacks) {
    expect(bank.balanceMode, bank.slug).toMatch(/customer-care|ivr/);
  }
});

test('fallback bank and balance pages never present customer care as missed call', async ({ page }) => {
  for (const slug of ['rbl', 'indusind', 'punjab-gramin']) {
    await page.goto(`/bank/${slug}/`);
    const primary = page.locator('[data-testid="primary-balance-service"]');
    await expect(primary).toContainText(/Customer Care|IVR/);
    await expect(primary).not.toContainText(/missed call/i);

    await page.goto(`/balance-enquiry/${slug}/`);
    const section = page.getByTestId('balance-enquiry-service');
    await expect(section).toContainText('Customer Care / IVR');
    await expect(section).not.toContainText(/missed call/i);
    const hero = page.getByTestId('balance-enquiry-hero');
    await expect(hero).toContainText('Customer Care / IVR');
    await expect(hero).not.toContainText(/missed call|मिस्ड कॉल/i);

    for (const route of ['customer-care', 'toll-free-number']) {
      await page.goto(`/${route}/${slug}/`);
      await expect(page.locator('body')).not.toContainText('Missed call balance SMS नहीं आया');
      await expect(page.locator('body')).toContainText(/Balance enquiry या IVR में सहायता चाहिए/i);
    }
  }
});

test('verified dedicated missed-call bank keeps its original service flow', async ({ page }) => {
  await page.goto('/bank/sbi/');
  const primary = page.locator('[data-testid="primary-balance-service"]');
  await expect(primary).toContainText('मिस्ड कॉल');
  await expect(primary).not.toContainText('Customer Care / IVR');
});
