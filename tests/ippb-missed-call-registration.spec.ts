import { test, expect } from './fixtures';
import { findSchema, getJsonLdScripts, gotoDom } from './utils';

test.use({ localOnlyNetwork: true });

// IPPB official missed-call banking, checked 2026-11-26:
// https://ippbonline.bank.in/web/ippb/missed-call-banking
test('IPPB requires missed-call banking registration before balance enquiry', async ({ page }) => {
  await gotoDom(page, '/missed-call/ippb/');
  const notice = page.locator('[data-testid="ippb-missed-call-registration"]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('खाते से जुड़े');
  await expect(notice).toContainText('पहले');
  await expect(notice).toContainText('9650121379');
  await expect(notice).toContainText('8424054994');
  await expect(notice.locator('a[href="https://ippbonline.bank.in/web/ippb/missed-call-banking"]')).toBeVisible();
  await expect(page.locator('[data-testid="missed-call-service"] a[href="tel:7799022509"]')).toBeVisible();
  const order = await page.evaluate(() => {
    const notice = document.querySelector('[data-testid="ippb-missed-call-registration"]')!;
    const button = document.querySelector('[data-testid="missed-call-service"] a[href="tel:7799022509"]')!;
    return Boolean(notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(order).toBe(true);
  const schemas = await getJsonLdScripts(page);
  const howto = findSchema(schemas, 'HowTo') as { step: { text: string }[] };
  expect(howto.step[0].text).toContain('9650121379');
  expect(howto.step[0].text).toContain('8424054994');
  expect(howto.step[0].text).toContain('खाते से जुड़े');
  const firstVisibleStep = page.locator('main ol').first().locator('li').first();
  await expect(firstVisibleStep).toContainText(howto.step[0].text);
  const faq = findSchema(schemas, 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
  const prerequisite = faq.mainEntity.find(item => item.name.includes('mobile app या net banking'))!;
  expect(prerequisite.acceptedAnswer.text).toContain('missed call banking');
  expect(prerequisite.acceptedAnswer.text).not.toContain('ज़रूरी सिर्फ़ इतना');
  await expect(page.locator('h3', { hasText: prerequisite.name }).locator('..').locator('p')).toHaveText(prerequisite.acceptedAnswer.text);
  await expect(page.locator('main')).not.toContainText('ज़रूरी सिर्फ़ इतना');
});

test('other banks do not receive IPPB registration guidance', async ({ page }) => {
  await gotoDom(page, '/missed-call/sbi/');
  await expect(page.locator('[data-testid="ippb-missed-call-registration"]')).toHaveCount(0);
  const howto = findSchema(await getJsonLdScripts(page), 'HowTo') as { step: { text: string }[] };
  expect(howto.step[0].text).not.toContain('9650121379');
});
