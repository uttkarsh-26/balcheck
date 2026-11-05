import { test, expect } from './fixtures';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { banks } from '../src/data/banks';
import { findSchema, getJsonLdScripts, gotoDom } from './utils';

const bank = banks.find(item => item.slug === 'ubi')!;
const guide = '[data-testid="union-bank-balance-guide"]';
const officialSmsPage = 'https://www.unionbankofindia.bank.in/en/details/sms-banking';
const officialCarePage = 'https://www.unionbankofindia.bank.in/en/common/customer-care';

test('Union Bank record follows the currently published official channel numbers', () => {
  expect(bank.missedCall).toBe('9152379484');
  expect(bank.customerCare).toBe('1800-2333');
  expect(bank.verificationSource).toContain(officialSmsPage);
  expect(bank.verificationSource).toContain(officialCarePage);
  expect(bank.lastVerified).toBe('2026-11-05');
});

test('offline authenticity audit evaluates the shared record rather than losing expression-backed provenance', () => {
  const output = execFileSync(process.execPath, ['scripts/audit-number-authenticity.mjs'], { encoding: 'utf8' });
  const provenance = output.split('=== check 4:')[1]?.split('=== check 5:')[0];
  expect(provenance).toBeDefined();
  expect(provenance).not.toContain('ubi:');
  expect(output).toContain(`records loaded from src/data/banks.ts: ${banks.length}`);
});

for (const scenario of [
  { name: 'missing', module: undefined, error: 'not found' },
  { name: 'throwing', module: 'throw new Error("bank fixture load failed");', error: 'could not load' },
  { name: 'empty', module: 'export const banks = [];', error: 'loaded 0 bank records' },
]) {
  test(`offline authenticity audit refuses ${scenario.name} bank records`, () => {
    const root = mkdtempSync(join(tmpdir(), 'balcheck-audit-'));
    try {
      mkdirSync(join(root, 'scripts'), { recursive: true });
      mkdirSync(join(root, 'src/data'), { recursive: true });
      copyFileSync('scripts/audit-number-authenticity.mjs', join(root, 'scripts/audit-number-authenticity.mjs'));
      if (scenario.module !== undefined) writeFileSync(join(root, 'src/data/banks.ts'), scenario.module);
      const result = spawnSync(process.execPath, [join(root, 'scripts/audit-number-authenticity.mjs')], { encoding: 'utf8' });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(scenario.error);
      expect(result.stdout).not.toContain('=== summary:');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test.describe('Union Bank source-backed balance guide', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDom(page, '/bank/ubi/');
  });

  test('answers the legacy-number query without endorsing that number', async ({ page }) => {
    const section = page.locator(guide);
    await expect(section).toBeVisible();
    await expect(section).toContainText('09223008586');
    await expect(section).toContainText('चालू या बंद');
    await expect(page.locator('a[href="tel:09223008586"]')).toHaveCount(0);
    await expect(section.locator(`a[href="tel:${bank.missedCall}"]`)).toBeVisible();
    await expect(section.locator(`a[href="tel:${bank.customerCare}"]`)).toBeVisible();
  });

  test('provides the documented primary-account SMS commands on both published destinations', async ({ page }) => {
    for (const destination of ['9152980440', '9152980449']) {
      for (const command of ['UBAL', 'UMNS']) {
        await expect(page.locator(`${guide} a[href="sms:${destination}?body=${command}"]`)).toBeVisible();
      }
    }
    await expect(page.locator(guide)).toContainText('primary account');
    await expect(page.locator(guide)).toContainText('मिनी स्टेटमेंट');
    await expect(page.locator(`${guide} a[href^="sms:09223008586"]`)).toHaveCount(0);
  });

  test('separates operator tariffs, published bank SMS charges and registration requirements', async ({ page }) => {
    const section = page.locator(guide);
    await expect(section).toContainText('₹0.25 + GST');
    await expect(section).toContainText('operator');
    await expect(section).toContainText('How To Apply');
    await expect(section).toContainText('FAQ');
    await expect(section).toContainText('संयुक्त खाते');
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /मुफ़्त|तुरंत|24×7/);
    const schemas = await getJsonLdScripts(page);
    const faq = findSchema(schemas, 'FAQPage') as { mainEntity: { acceptedAnswer: { text: string } }[] };
    const answers = faq.mainEntity.map(item => item.acceptedAnswer.text).join(' ');
    expect(answers).not.toContain('सेवा मुफ़्त है');
    expect(answers).toContain('₹0.25 + GST');
  });

  test('cites procedure-specific sources and contains no data-collection form', async ({ page }) => {
    const section = page.locator(guide);
    await expect(section.locator(`a[href="${officialSmsPage}"]`)).toBeVisible();
    await expect(section.locator(`a[href="${officialCarePage}"]`)).toBeVisible();
    await expect(section.locator('time[datetime="2026-11-05"]')).toBeVisible();
    await expect(section).toContainText('OTP, PIN');
    await expect(section.locator('form,input,textarea,select')).toHaveCount(0);
  });

  test('shows the same measured instructions in the body and HowTo schema without a timing guarantee', async ({ page }, testInfo) => {
    const schema = findSchema(await getJsonLdScripts(page), 'HowTo') as { step: { text: string }[] };
    expect(schema).toBeDefined();
    const visibleSteps = await page.locator(`${guide} [data-testid="union-balance-step"]`).allTextContents();
    expect(schema.step.map(step => step.text)).toEqual(visibleSteps.map(text => text.trim()));
    expect(visibleSteps).toHaveLength(3);
    expect(JSON.stringify(schema)).not.toMatch(/2-3 ring|कुछ सेकंड|तुरंत/);
    await expect(page.locator('main')).not.toContainText('2-3 ring');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://balcheck.in/bank/ubi/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator(guide).screenshot({ path: testInfo.outputPath('union-balance-guide.png') });
  });
});

for (const slug of ['sbi', 'canara']) {
  test(`bank-specific guide does not leak into ${slug}`, async ({ page }) => {
    await gotoDom(page, `/bank/${slug}/`);
    await expect(page.locator(guide)).toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

for (const family of ['balance-enquiry', 'missed-call', 'customer-care', 'sms-banking', 'mini-statement', 'net-banking', 'toll-free-number']) {
  test(`Union Bank ${family} consumes the corrected record without reviving the old callable numbers`, async ({ page }) => {
    await gotoDom(page, `/${family}/ubi/`);
    // Net banking exposes the support number, not a missed-call instruction.
    await expect(page.locator('body')).toContainText(family === 'net-banking' ? bank.customerCare : bank.missedCall);
    await expect(page.locator('a[href="tel:09223008586"],a[href="tel:1800-208-2244"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://balcheck.in/${family}/ubi/`);
  });
}
