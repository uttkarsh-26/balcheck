import { test, expect } from './fixtures';
import { banks } from '../src/data/banks';

const description = 'Bihar Gramin Bank का प्रकाशित टोल-फ्री संपर्क 1800-180-7777 और BGB mBanking में सूचीबद्ध balance enquiry की जानकारी।';

test.beforeEach(async ({ context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
});

test('Bihar contact claims, source scope and FAQ schema are consistent', async ({ page }) => {
  await page.goto('/bank/bihar-gramin/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Bihar Gramin Bank Balance Check Number 1800-180-7777');
  await expect(page.locator('h1')).toHaveText('Bihar Gramin Bank Customer Care Number 24x7 & Balance Check 1800-180-7777');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://balcheck.in/bank/bihar-gramin/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description);
  expect(description.length).toBeLessThanOrEqual(160);
  const links = page.locator('a[href^="tel:"]');
  await expect(links).toHaveCount(5);
  expect(await links.evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(Array(5).fill('tel:1800-180-7777'));
  await expect(page.locator('[data-hero-banner]')).toContainText('टोल-फ्री संपर्क');
  await expect(page.getByTestId('primary-balance-service')).toContainText('टोल-फ्री संपर्क');
  await expect(page.getByTestId('primary-balance-service')).toContainText('बैंक संपर्क पर कॉल करें');
  await expect(page.locator('a[href^="tel:"]').nth(1).locator('..')).toContainText('टोल-फ्री संपर्क');
  await expect(page.locator('a[href^="tel:"]').last().locator('..')).toContainText('Customer Care');
  await expect(page.locator('a[href^="sms:"]')).toHaveCount(0);
  await expect(page.locator('h1').locator('..')).toContainText('24×7');
  await expect(page.locator('a[href="https://bgb.bank.in/contact"]')).toHaveCount(1);
  await expect(page.locator('a[href="https://bgb.bank.in/mobile-banking"]')).toHaveCount(1);
  await expect(page.getByTestId('record-evidence')).toContainText('केवल संपर्क');
  await expect(page.getByTestId('record-evidence')).toContainText('2026-11-12');
  await expect(page.getByTestId('record-evidence')).not.toContainText('2026-09-14');
  await expect(page.getByTestId('record-evidence-date')).toHaveAttribute('datetime', '2026-11-12');
  const body = await page.locator('main').count() ? await page.locator('main').innerText() : await page.locator('body').innerText();
  expect(body).not.toContain('IVR menu में balance enquiry विकल्प चुनें');
  expect(body).not.toContain('Toll-free number used for both balance enquiry and customer care');
  expect(body).not.toContain('रजिस्टर्ड मोबाइल से कॉल करें');
  expect(body).not.toContain('Customer Care / IVR से balance enquiry करें');
  expect(body).not.toContain('Balance enquiry विकल्प चुनें');
  expect(body).not.toContain('Bank के निर्देशों के अनुसार verification करें');
  expect(body).toContain('registered mobile की जरूरत या 24×7 उपलब्धता की पुष्टि स्रोत में नहीं है');
  for (const share of await page.locator('a[href^="https://wa.me/"]').evaluateAll(nodes => nodes.map(n => decodeURIComponent(n.getAttribute('href')!)))) {
    expect(share).toContain('टोल-फ्री संपर्क');
    expect(share).not.toContain('बैलेंस चेक नंबर');
  }
  const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(n => JSON.parse(n.textContent!)));
  expect(schemas.filter(s => s['@type'] === 'HowTo')).toHaveLength(0);
  const bank = schemas.find(s => s['@type'] === 'BankOrCreditUnion');
  expect(bank.description).toContain('टोल-फ्री संपर्क');
  expect(bank.description).not.toContain('balance enquiry number');
  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  const rendered = await page.locator('details').evaluateAll(nodes => nodes.map(n => ({ q: n.querySelector('summary')?.textContent?.trim(), a: n.querySelector('[data-faq-answer]')?.textContent?.trim() ?? n.querySelector('p')?.textContent?.trim() })));
  expect(faq.mainEntity.length).toBeGreaterThan(0);
  expect(rendered.map(x => x.q)).toEqual(faq.mainEntity.map((x: any) => x.name));
  expect(rendered.map(x => x.a)).toEqual(faq.mainEntity.map((x: any) => x.acceptedAnswer.text));
});

test('review blocker B1: date states only the published toll-free contact was checked', async ({ page }) => {
  await page.goto('/bank/bihar-gramin/', { waitUntil: 'domcontentloaded' });
  const evidence = page.getByTestId('record-evidence');
  await expect(evidence.locator('dd').last()).toHaveText('2026-11-12 को प्रकाशित टोल-फ्री संपर्क नंबर जांचा गया था।');
  await expect(evidence).not.toContainText('इस record के numbers जांचे गए थे');
});

test('review blocker B2: unverified bank-specific balance method links are withheld', async ({ page }) => {
  await page.goto('/bank/bihar-gramin/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a[href="/sms-banking/bihar-gramin/"]')).toHaveCount(0);
  await expect(page.locator('a[href="/balance-enquiry/bihar-gramin/"]')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Balance by SMS');
  await expect(page.locator('main')).not.toContainText('Check Balance →');
  await expect(page.locator('a[href="https://bgb.bank.in/contact"]')).toHaveText('स्रोत लिंक खोलें');
  await expect(page.locator('a[href="https://bgb.bank.in/mobile-banking"]')).toHaveText('BGB mBanking पेज');
});

test('default evidence wording and undocumented-record fallback remain intact', async ({ page }) => {
  await page.goto('/bank/sbi/', { waitUntil: 'domcontentloaded' });
  const sbi = banks.find(bank => bank.slug === 'sbi')!;
  await expect(page.getByTestId('record-evidence').locator('dd').last()).toHaveText(`${sbi.lastVerified} को इस record के numbers जांचे गए थे।`);
  const undocumented = banks.find(bank => !bank.verificationSource || !bank.lastVerified)!;
  expect(undocumented).toBeTruthy();
  await page.goto(`/bank/${undocumented.slug}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('record-evidence')).toHaveCount(0);
});

test('shared evidence default remains record-scoped across its route families', async ({ page }) => {
  const paths = [
    '/', '/bank/sbi/', '/banks/public-sector/', '/customer-care/', '/customer-care/sbi/',
    '/atm-pin/sbi/', '/missed-call/', '/missed-call/sbi/', '/aadhaar-link/sbi/',
    '/merged-banks/', '/merged-banks/narmada-jhabua/', '/number-lookup/',
    '/mini-statement/', '/mini-statement/sbi/', '/sms-banking/sbi/',
    '/toll-free-number/', '/toll-free-number/sbi/', '/mobile-number-registration/sbi/',
    '/net-banking/sbi/', '/balance-enquiry/sbi/',
  ];
  for (const path of paths) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const evidence = page.getByTestId('record-evidence');
    await expect(evidence, path).toHaveCount(1);
    await expect(evidence.locator('dd').last(), path).toContainText('को इस record के numbers जांचे गए थे।');
  }
});
