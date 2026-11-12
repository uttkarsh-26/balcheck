import { test, expect } from './fixtures';
import { banks } from '../src/data/banks';
import { getUpGraminBalanceGuide } from '../src/data/up-gramin-balance-guide';
import { findSchema, getJsonLdScripts, gotoDom } from './utils';

test.use({ localOnlyNetwork: true });

const bank = banks.find(item => item.slug === 'up-gramin')!;
const guide = '[data-testid="upgb-balance-guide"]';
const source = 'https://upgb.bank.in/Miss-Call-Facility.php';

test('the guide follows the bank record and its unsupported-bank fallback stays empty', () => {
  const changed = { ...bank, missedCall: 'TEST-NUMBER' };
  expect(getUpGraminBalanceGuide(changed)?.number).toBe(changed.missedCall);
  expect(getUpGraminBalanceGuide(changed)?.steps[0].text).toContain(changed.missedCall);
  const original = getUpGraminBalanceGuide(bank)!;
  expect(original.faqs.map(faq => faq.a)).toContain(original.serviceDescription);
  expect(getUpGraminBalanceGuide(banks.find(item => item.slug === 'sbi')!)).toBeUndefined();
});

test.describe('UP Gramin existing balance-enquiry guide', () => {
  test.beforeEach(async ({ page }) => { await gotoDom(page, '/balance-enquiry/up-gramin/'); });

  test('publishes a bank-specific, source-dated eligibility guide', async ({ page }) => {
    const section = page.locator(guide);
    await expect(section).toBeVisible();
    await expect(section).toContainText(bank.missedCall);
    await expect(section).toContainText('CUST ID');
    for (const type of ['SB', 'CA', 'OD', 'CC']) await expect(section).toContainText(type);
    await expect(section).toContainText('विदेशी country code');
    await expect(section.locator(`a[href="${source}"]`)).toBeVisible();
    await expect(section.locator('time[datetime="2026-11-07"]')).toBeVisible();
    await expect(page.locator('a[href^="tel:"]').first()).toHaveAttribute('href', `tel:${bank.missedCall}`);
  });

  test('documents the actual reply and channel limits instead of promising a mini statement', async ({ page }) => {
    const section = page.locator(guide);
    await expect(section).toContainText('अंतिम चार अंक');
    await expect(section).toContainText('मौजूदा बैलेंस');
    await expect(section).toContainText('SMS भेजने का command');
    await expect(section).toContainText('मिनी स्टेटमेंट');
    await expect(section.locator('a[href^="sms:"]')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('DND सेवा बंद करें');
  });

  test('matches every visible step and FAQ answer to structured data', async ({ page }) => {
    const schemas = await getJsonLdScripts(page);
    const howto = findSchema(schemas, 'HowTo') as { step: { text: string; name: string; position: number }[] };
    const steps = page.locator(`${guide} [data-testid="upgb-balance-step"]`);
    expect(howto.step.map(item => item.text)).toEqual((await steps.allTextContents()).map(text => text.trim()));
    expect(howto.step.map(item => item.position)).toEqual([1, 2, 3, 4]);
    expect(JSON.stringify(howto)).not.toMatch(/2-3 ring|कुछ ही सेकंड|तुरंत (?:SMS|बैलेंस)/);
    expect(howto.step[1].text).toContain('पहली ring');
    const faq = findSchema(schemas, 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    const block = page.getByRole('heading', { name: '❓ अक्सर पूछे जाने वाले प्रश्न' }).locator('..');
    expect(faq.mainEntity.map(item => item.name)).toEqual(await block.locator('h3').allTextContents());
    expect(faq.mainEntity.map(item => item.acceptedAnswer.text)).toEqual(await block.locator('p').allTextContents());
  });

  test('gives branch-based recovery without credential collection or invented activation steps', async ({ page }) => {
    const section = page.locator(guide);
    await expect(section).toContainText('base branch');
    await expect(section).toContainText('खो');
    await expect(section).toContainText('OTP, PIN');
    await expect(section).toContainText('live call या SMS');
    await expect(section.locator('form,input,textarea,select')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('2-3 ring');
    await expect(page.locator('main')).not.toContainText('कुछ ही सेकंड');
  });

  test('preserves the existing URL identity and works without horizontal scrolling', async ({ page }, testInfo) => {
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('UPGB Balance Enquiry');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://balcheck.in/balance-enquiry/up-gramin/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator(guide).screenshot({ path: testInfo.outputPath('upgb-balance-guide.png') });
  });
});

for (const slug of ['sbi', 'ubi', 'canara']) {
  test(`${slug} keeps its existing balance-enquiry branch`, async ({ page }) => {
    await gotoDom(page, `/balance-enquiry/${slug}/`);
    await expect(page.locator(guide)).toHaveCount(0);
    await expect(page.locator('h1')).toHaveText(`${banks.find(item => item.slug === slug)!.shortName} Balance Enquiry`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://balcheck.in/balance-enquiry/${slug}/`);
  });
}
