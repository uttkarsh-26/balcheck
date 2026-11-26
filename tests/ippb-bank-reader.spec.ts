import { test, expect } from './fixtures';
import { findSchema, getJsonLdScripts, gotoDom } from './utils';

test.use({ localOnlyNetwork: true });

// https://ippbonline.bank.in/web/ippb/missed-call-banking, checked 2026-11-26.
test('IPPB bank page distinguishes registration and balance enquiry', async ({ page }) => {
  await gotoDom(page, '/bank/ippb/');
  const guide = page.getByTestId('ippb-bank-registration');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('खाते से जुड़े');
  await expect(guide).toContainText('9650121379');
  await expect(guide).toContainText('8424054994');
  await expect(guide.locator('a[href="https://ippbonline.bank.in/web/ippb/missed-call-banking"]')).toBeVisible();
  await expect(page.locator('a[href="tel:7799022509"]').first()).toBeVisible();
  expect(await page.evaluate(() => Boolean(document.querySelector('[data-testid="ippb-bank-registration"]')!.compareDocumentPosition(document.querySelector('a[href="tel:7799022509"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  const howto = findSchema(await getJsonLdScripts(page), 'HowTo') as { step: { text: string }[] };
  expect(howto.step[0].text).toContain('9650121379');
  expect(howto.step[0].text).toContain('8424054994');
  await expect(page.locator('main ol').last().locator('li').first()).toHaveText(howto.step[0].text);
  await expect(page.locator('main')).not.toContainText('2-3 ring');
  await expect(page.locator('main')).not.toContainText('कुछ सेकंड में SMS');
  await expect(page.locator('main')).not.toContainText('तुरंत बैलेंस');
  const faq = findSchema(await getJsonLdScripts(page), 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
  const fee = faq.mainEntity.find(item => item.name.includes('मुफ़्त'))!;
  expect(fee.acceptedAnswer.text).not.toContain('सेवा मुफ़्त है');
});

test('other bank page does not get IPPB registration', async ({ page }) => {
  await gotoDom(page, '/bank/sbi/');
  await expect(page.getByTestId('ippb-bank-registration')).toHaveCount(0);
  const howto = findSchema(await getJsonLdScripts(page), 'HowTo') as { step: { text: string }[] };
  expect(howto.step[0].text).not.toContain('9650121379');
});
