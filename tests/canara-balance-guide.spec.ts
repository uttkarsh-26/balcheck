import { test, expect } from './fixtures';
import { banks } from '../src/data/banks';
import { getCanaraBalanceGuide } from '../src/data/canara-balance-guide';
import { findSchema, getJsonLdScripts, gotoDom } from './utils';

const bank = banks.find(item => item.slug === 'canara')!;
const guide = '[data-testid="canara-balance-guide"]';
const miniOptions = '[data-testid="canara-mini-options"]';

test('guide uses shared record values and returns no content for unsupported banks', () => {
  const changed = getCanaraBalanceGuide({ ...bank, missedCall: 'NUMBER-SENTINEL', customerCare: 'CARE-SENTINEL' })!;
  expect(changed.steps.join(' ')).toContain('NUMBER-SENTINEL');
  expect(changed.steps.join(' ')).toContain('CARE-SENTINEL');
  expect(getCanaraBalanceGuide(banks.find(item => item.slug === 'sbi')!)).toBeUndefined();
});

test('Canara record uses the currently published support number and scoped evidence', () => {
  expect(bank.missedCall).toBe('8886610360');
  expect(bank.customerCare).toBe('18001030');
  expect(bank.website).toBe('https://www.canarabank.bank.in');
  expect(bank.verificationSource).toContain('/pages/missed-call-banking');
  expect(bank.verificationSource).toContain('/pages/contactus');
  expect(bank.lastVerified).toBe('2026-11-07');
});

test.describe('Canara existing balance-check guide', () => {
  test.beforeEach(async ({ page }) => { await gotoDom(page, '/bank/canara/'); });

  test('separates savings balance, language-specific last-five transactions and support', async ({ page }) => {
    const section = page.locator(guide);
    await expect(section).toBeVisible();
    await expect(section).toContainText(bank.missedCall);
    await expect(section).toContainText('Saving Account');
    const mini = section.locator(miniOptions);
    await expect(mini.locator('a[href="tel:09015734734"]')).toHaveText('09015734734');
    await expect(mini.locator('a[href="tel:09015613613"]')).toHaveText('09015613613');
    await expect(mini).toContainText('English');
    await expect(mini).toContainText('हिंदी');
    await expect(mini).toContainText('5');
    await expect(section.locator('a[href="tel:18001030"]')).toBeVisible();
    await expect(section).toContainText('080-25129259');
    await expect(section).toContainText('10 AM');
  });

  test('publishes explicit source limits rather than inventing SMS commands or fees', async ({ page }) => {
    const section = page.locator(guide);
    await expect(section).toContainText('SMS command');
    await expect(section).toContainText('शुल्क');
    await expect(section).toContainText('registration');
    await expect(section).toContainText('live call');
    await expect(section).toContainText('OTP, PIN');
    await expect(section.locator('a[href^="sms:"],form,input,textarea,select')).toHaveCount(0);
    await expect(section.locator('a[href="https://www.canarabank.bank.in/pages/missed-call-banking"]')).toHaveCount(1);
    await expect(section.locator('a[href="https://www.canarabank.bank.in/pages/contactus"]')).toHaveCount(1);
    await expect(section.locator('a[href="https://www.canarabank.bank.in/sms-help-desk"]')).toHaveCount(1);
    for (const unsupported of ['2-3 ring', 'कुछ सेकंड में SMS', 'SMS में तुरंत', 'verified missed-call balance enquiry सेवा मुफ़्त है']) {
      await expect(page.locator('main')).not.toContainText(unsupported);
    }
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).not.toMatch(/तुरंत|मुफ़्त|24×7/);
    expect(description).toContain('8886610360');
  });

  test('keeps visible instructions and FAQs equal to structured data', async ({ page }) => {
    const schemas = await getJsonLdScripts(page);
    const howto = findSchema(schemas, 'HowTo') as { step: { text: string }[] };
    const visible = await page.locator(`${guide} [data-testid="canara-balance-step"]`).allTextContents();
    expect(howto.step.map(step => step.text)).toEqual(visible.map(text => text.trim()));
    expect(howto.step).toHaveLength(3);
    const faq = findSchema(schemas, 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(faq.mainEntity.map(item => item.name)).toEqual((await page.locator('[data-testid="faq-accordion"] summary').allTextContents()).map(text => text.trim()));
    expect(faq.mainEntity.map(item => item.acceptedAnswer.text)).toEqual((await page.locator('[data-testid="faq-accordion"] details p').allTextContents()).map(text => text.trim()));
  });

  test('retains the existing title intent, H1 and canonical on mobile', async ({ page }, testInfo) => {
    await expect(page.locator('h1')).toHaveText('Canara Bank Balance Check Number 8886610360');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://balcheck.in/bank/canara/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator(guide).screenshot({ path: testInfo.outputPath('canara-balance-guide.png') });
  });
});

test('existing Canara mini-statement and SMS pages no longer deny the newly verified options', async ({ page }) => {
  await gotoDom(page, '/mini-statement/canara/');
  await expect(page.locator(miniOptions)).toBeVisible();
  for (const number of ['09015734734', '09015613613']) await expect(page.locator(`${miniOptions} a[href="tel:${number}"]`)).toBeVisible();
  await expect(page.locator('main')).not.toContainText('dedicated mini-statement missed-call number verified नहीं है');
  await expect(page.locator('h1')).toHaveText('Canara Mini Statement');
  const publishedSteps = (await page.locator('[data-testid="mini-statement-guide"] ol').allTextContents()).join(' ');
  expect(publishedSteps).toContain('09015613613');
  expect(publishedSteps).toContain('09015734734');
  await gotoDom(page, '/sms-banking/canara/');
  await expect(page.locator('main')).not.toContainText('dedicated mini-statement missed-call number इस dataset में verified नहीं है');
  const faq = findSchema(await getJsonLdScripts(page), 'FAQPage') as { mainEntity: { acceptedAnswer: { text: string } }[] };
  expect(faq.mainEntity.map(item => item.acceptedAnswer.text).join(' ')).toContain('09015613613');
});

for (const family of ['bank', 'balance-enquiry', 'customer-care', 'toll-free-number', 'net-banking', 'sms-banking', 'mini-statement', 'missed-call', 'atm-pin']) {
  test(`Canara ${family} no longer exposes the malformed support number`, async ({ page }) => {
    await gotoDom(page, `/${family}/canara/`);
    await expect(page.locator('main')).not.toContainText('1800-1030-1800');
    await expect(page.locator('a[href="tel:1800-1030-1800"],a[href="tel:180010301800"]')).toHaveCount(0);
  });
}
