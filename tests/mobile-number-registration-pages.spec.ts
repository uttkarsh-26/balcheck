import { test, expect } from './fixtures';
import { banks } from '../src/data/banks';
import { gotoDom, getJsonLdScripts, findSchema } from './utils';
import { getBoiMobileRegistrationGuide } from '../src/data/boi-mobile-registration';

const cases = ['sbi', 'uco-bank', 'ippb'].map(slug => banks.find(bank => bank.slug === slug)!);

for (const bank of cases) {
  test(`${bank.slug}: mobile-registration page contract`, async ({ page }) => {
    await gotoDom(page, `/mobile-number-registration/${bank.slug}/`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href', `https://balcheck.in/mobile-number-registration/${bank.slug}/`,
    );
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(bank.shortName);
    await expect(page.locator(`a[href="tel:${bank.customerCare}"]`).first()).toBeVisible();
    await expect(page.locator('[data-testid="quick-answer"]')).toBeVisible();

    const body = ((await page.locator('body').textContent()) ?? '').replace(/\s+/g, ' ');
    expect(body).not.toMatch(/(?:registration|link|update)\s+पूरी तरह(?:\s+से)?\s+online\s+(?:होता|होती|कर सकते)/i);
    expect(body).not.toContain('branch जाने की जरूरत नहीं');

    const scripts = await getJsonLdScripts(page);
    expect(findSchema(scripts, 'HowTo')).toBeDefined();
    expect(findSchema(scripts, 'FAQPage')).toBeDefined();
    expect(findSchema(scripts, 'BreadcrumbList')).toBeDefined();
  });
}

test('BOI pages use the bank-confirmed helpline and current official website', async ({ page }) => {
  for (const path of [
    '/mobile-number-registration/boi/',
    '/bank/boi/',
    '/customer-care/boi/',
    '/net-banking/boi/',
  ]) {
    await gotoDom(page, path);
    await expect(page.locator('a[href="tel:1800-220-229"]').first()).toBeVisible();
    await expect(page.locator('a[href="tel:1800-220-2299"]')).toHaveCount(0);
    await expect(page.locator('a[href="https://bankofindia.bank.in"]').first()).toBeVisible();
  }
});

test('BOI guidance is source-scoped and matches visible FAQ and HowTo', async ({ page }) => {
  const bank = banks.find(item => item.slug === 'boi')!;
  const guide = getBoiMobileRegistrationGuide(bank)!;
  await gotoDom(page, '/mobile-number-registration/boi/');
  await expect(page).toHaveTitle('BOI Mobile Number Registration — बैंक ऑफ इंडिया | BalCheck');
  await expect(page.locator('h1')).toHaveText('BOI Mobile Number Registration');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://balcheck.in/mobile-number-registration/boi/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'बैंक ऑफ इंडिया (BOI) में mobile number registration या नंबर बदलने के लिए शाखा/customer care से प्रक्रिया पूछें। आधिकारिक स्रोत और जरूरी सावधानियाँ।');
  const section = page.locator('[data-testid="boi-registration-guide"]');
  await expect(section).toContainText('यह दूसरे विकल्पों के न होने का दावा नहीं है');
  await expect(section).toContainText('service activation अलग बातें हैं');
  await expect(page.getByTestId('category-context')).toContainText('grievance communication के संदर्भ');
  for (const source of guide.sources) await expect(section.locator(`a[href="${source.href}"]`)).toBeVisible();
  const schema = await getJsonLdScripts(page);
  const howto = findSchema(schema, 'HowTo') as { step: { name: string; text: string }[] };
  const faq = findSchema(schema, 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
  expect(howto.step.map(({ name, text }) => ({ name, text }))).toEqual(guide.steps);
  expect(faq.mainEntity.map(item => ({ q: item.name, a: item.acceptedAnswer.text }))).toEqual(guide.faqs);
  const stepItems = section.locator('[data-testid="boi-registration-steps"] li');
  await expect(stepItems).toHaveCount(howto.step.length);
  for (let i = 0; i < howto.step.length; i++) {
    await expect(stepItems.nth(i)).toContainText(howto.step[i].name);
    await expect(stepItems.nth(i)).toContainText(howto.step[i].text);
  }
  for (const item of faq.mainEntity) {
    const heading = page.getByRole('heading', { name: item.name, exact: true });
    await expect(heading).toBeVisible();
    await expect(heading.locator('..').locator('p')).toHaveText(item.acceptedAnswer.text);
  }
  const bodyAndSchema = `${await page.locator('body').innerText()} ${JSON.stringify(schema)}`;
  for (const claim of ['24-48 घंटे', 'OTP आएगा — verify करें', 'Aadhaar card और passbook की copy', 'SMS आता है → service registration active है', 'हर deposit/withdrawal की SMS', 'mobile number link का official तरीका branch visit है']) {
    expect(bodyAndSchema).not.toContain(claim);
  }
  await expect(page.locator('[data-testid="record-evidence-source"]')).toContainText(bank.verificationSource!);
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /Branch, ATM या official website से/);
});

test('unconfigured bank falls back to existing registration content', async ({ page }) => {
  const bank = banks.find(item => item.slug === 'sbi')!;
  expect(getBoiMobileRegistrationGuide(bank)).toBeUndefined();
  await gotoDom(page, '/mobile-number-registration/sbi/');
  await expect(page.locator('[data-testid="boi-registration-guide"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Branch Visit/ })).toBeVisible();
});

test('UCO targets online-link intent while recommending verified channels', async ({ page }) => {
  const bank = banks.find(item => item.slug === 'uco-bank')!;
  await gotoDom(page, '/mobile-number-registration/uco-bank/');
  await expect(page).toHaveTitle(/UCO Bank Mobile Number Link Online/);
  await expect(page.locator('h1')).toContainText('UCO Bank Mobile Number Link Online');
  const answer = page.locator('[data-testid="quick-answer"]');
  await expect(answer).toContainText(bank.customerCare);
  await expect(answer).toContainText('Branch');
  await expect(answer).toContainText('दावा नहीं करते');
});

test('IPPB targets online-link intent without claiming online completion', async ({ page }) => {
  const bank = banks.find(item => item.slug === 'ippb')!;
  await gotoDom(page, '/mobile-number-registration/ippb/');
  await expect(page).toHaveTitle(/IPPB Mobile Number Link Online/);
  await expect(page.locator('h1')).toContainText('IPPB Mobile Number Link Online');
  const answer = page.locator('[data-testid="quick-answer"]');
  await expect(answer).toContainText(bank.customerCare);
  await expect(answer).toContainText(/post-office branch/i);
  await expect(answer).toContainText('दावा नहीं करते');
});

test('every mobile-reg page carries bank-type context (anti-template differentiation)', async ({ page }) => {
  for (const slug of ['sbi', 'uco-bank', 'jnk-gramin', 'equitas', 'ippb'].filter(s => banks.some(b => b.slug === s))) {
    const bank = banks.find(item => item.slug === slug)!;
    await gotoDom(page, `/mobile-number-registration/${slug}/`);
    const ctx = page.locator('[data-testid="category-context"]');
    await expect(ctx).toBeVisible();
    await expect(ctx).toContainText(bank.name);
  }
});
