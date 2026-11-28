import { test, expect } from './fixtures';

test.use({ localOnlyNetwork: true });

test('Odisha retail login guidance stays evidence-bounded in text and schema', async ({ page }) => {
  await page.goto('/net-banking/odisha-grameen/', { waitUntil: 'domcontentloaded' });
  const main = page.locator('main');
  const text = await main.innerText();
  expect(text).toContain('retail net banking login का पता, registration या उपलब्ध सुविधाएं सत्यापित नहीं कर पाए');
  expect(text).toContain('बैंक से सीधे प्राप्त, सत्यापित जानकारी');
  expect(text).toContain('Card Services portal को retail net banking login न मानें');
  expect(text).toContain('उस पेज पर user ID, password, OTP या card details न डालें');
  expect(text).toContain('शाखा से संपर्क करें');
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const schema = schemas.map(x => JSON.parse(x));
  const faq = schema.flatMap(x => x['@graph'] ?? []).find(x => x['@type'] === 'FAQPage');
  expect(faq.mainEntity).toHaveLength(3);
  for (const item of faq.mainEntity) {
    expect(text).toContain(item.name);
    expect(text).toContain(item.acceptedAnswer.text);
  }
  const combined = text + JSON.stringify(schema) + await page.locator('meta[name="description"]').getAttribute('content');
  expect(combined).not.toMatch(/New User Registration|Forgot Password|128-bit|Login Now|Quick access|NEFT|RTGS|IMPS|24×7|odishabank\.bank\.in/i);
  const links = await main.locator('a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  expect(links.some(href => /odishabank|ogb\.bank\.in/i.test(href || ''))).toBe(false);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://balcheck.in/net-banking/odisha-grameen/');
  const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
  expect(robots || '').not.toMatch(/noindex/i);
});

test('normal SBI control keeps its generic login, registration and schema', async ({ page }) => {
  await page.goto('/net-banking/sbi/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toContainText('New User Registration');
  await expect(page.getByRole('link', { name: 'Login Now' })).toHaveAttribute('href', '#netbanking-content');
  const data = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(x => JSON.parse(x));
  expect(data.flatMap(x => x['@graph'] ?? []).find(x => x['@type'] === 'FAQPage').mainEntity).toHaveLength(5);
});
