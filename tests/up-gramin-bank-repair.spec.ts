import { test, expect } from './fixtures';
import { banks } from '../src/data/banks';
import { getUpGraminBalanceGuide } from '../src/data/up-gramin-balance-guide';
import { getBankPageGuide } from '../src/data/bank-page-guides';

const bank = banks.find(b => b.slug === 'up-gramin')!;
const description = `UPGB (उत्तर प्रदेश ग्रामीण बैंक) बैलेंस चेक नंबर ${bank.missedCall}। रजिस्टर्ड घरेलू मोबाइल से मिस्ड कॉल के बाद बैलेंस SMS की जानकारी।`;
test.use({ localOnlyNetwork: true });
test.beforeEach(async ({ page }) => {
  await page.goto('/bank/up-gramin/', { waitUntil: 'domcontentloaded' });
});

test('source-scoped procedure and schema', async ({ page }) => {
  const body = await page.locator('body').innerText();
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const values = schemas.map(s => JSON.parse(s));
  const how = values.find(s => s['@type'] === 'HowTo');
  const bankSchema = values.find(s => s['@type'] === 'BankOrCreditUnion');
  const faq = values.find(s => s['@type'] === 'FAQPage');
  const guide = getUpGraminBalanceGuide(bank)!;
  const serviceDescription = getBankPageGuide(bank)!.serviceDescription;
  expect(serviceDescription).toBe(guide.serviceDescription);
  await expect(page.getByTestId('bank-page-procedure')).toContainText(serviceDescription);
  expect(guide.faqs.map(item => item.a)).toContain(serviceDescription);
  expect(bankSchema.telephone).toBe(bank.missedCall);
  expect(bankSchema.description).toContain('पहली ring');
  const answers = faq.mainEntity.map((q: {acceptedAnswer: {text: string}}) => q.acceptedAnswer.text);
  expect(answers).toContain(getBankPageGuide(bank)!.whatsappAnswer);
  for (const item of guide.faqs) expect(answers).toContain(item.a);
  expect(how.step.map((s: {text: string}) => s.text)).toEqual(guide.steps.map(s => s.text));
  expect(body).toContain(guide.steps[1].text);
  expect(body).toMatch(/resident accounts/i);
  for (const t of ['SB', 'CA', 'OD', 'CC', 'घरेलू', 'base branch']) expect(body).toContain(t);
  expect(body).not.toMatch(/2-3 ring|कुछ सेकंड में SMS|SMS में तुरंत बैलेंस/);
  expect(JSON.stringify(values)).not.toMatch(/2-3 ring|कुछ सेकंड में SMS|SMS में तुरंत बैलेंस/);
  expect(body).toContain('2026-11-07');
  expect(body).toContain('2026-09-18');
  expect(body).toContain('2026-11-12');
  await expect(page.getByRole('link', { name: /मिस्ड कॉल:/ })).toHaveAttribute('href', `tel:${bank.missedCall}`);
  await expect(page.locator(`[data-testid="record-evidence-source"]`)).toContainText(bank.verificationSource!);
  await expect(page.locator(`[data-testid="bank-page-procedure"] a[href="${guide.sourceUrl}"]`)).toBeVisible();
  await expect(page.locator(`a[href="${getBankPageGuide(bank)!.mergerSource}"]`)).toBeVisible();
});

test('metadata, contact, merger and historically scoped WhatsApp', async ({ page }) => {
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description);
  expect(description.length).toBeLessThanOrEqual(160);
  await expect(page.locator('h1')).toHaveText(`Uttar Pradesh Gramin Bank Balance Check Number ${bank.missedCall}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://balcheck.in/bank/up-gramin/');
  const body = await page.locator('body').innerText();
  for (const text of ['Baroda UP Bank', 'Prathama UP Gramin Bank', 'Aryavart Bank', '1 मई 2025', 'Lucknow', bank.customerCare]) expect(body).toContain(text);
  const wa = await page.getByTestId('whatsapp-banking').innerText();
  expect(wa).toContain(bank.whatsappBanking!.checkedOn);
  expect(wa).toContain('जांचे गए');
  expect(wa).not.toMatch(/<strong>नहीं|कोई भी.*आधिकारिक नहीं|2-3 ring|तुरंत बैलेंस/);
});

test('service labels and exact destinations', async ({ page }) => {
  const rail = page.getByTestId('bank-services');
  for (const [label, href] of [['Customer Care', '/customer-care/up-gramin/'], ['मिस्ड कॉल से बैलेंस SMS', '/sms-banking/up-gramin/'], ['Balance Enquiry', '/balance-enquiry/up-gramin/'], ['Toll Free Number', '/toll-free-number/up-gramin/']]) {
    await expect(rail.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', href);
  }
  for (const slug of ['net-banking', 'mini-statement', 'mobile-number-registration', 'aadhaar-link', 'atm-pin']) await expect(page.locator(`a[href="/${slug}/up-gramin/"]`)).toHaveCount(0);
});

test('guide has a safe default for other banks', async () => {
  expect(getUpGraminBalanceGuide(banks.find(b => b.slug === 'sbi')!)).toBeUndefined();
  expect(getBankPageGuide(banks.find(b => b.slug === 'sbi')!)).toBeUndefined();
  const changed = getBankPageGuide({ ...bank, missedCall: 'TEST', customerCare: 'CARE' })!;
  expect(changed.procedure.steps[0].text).toContain('TEST');
  expect(changed.whatsappAnswer).toContain('CARE');
  expect(getUpGraminBalanceGuide(bank)?.checkedOn).toBe('2026-11-07');
});
