import { test, expect } from './fixtures';
import { findSchema, getJsonLdScripts, gotoDom } from './utils';

test.use({ localOnlyNetwork: true });

test('IndSMART facts, separate ATM limits and FAQ schema agree', async ({ page, request }) => {
  await gotoDom(page, '/atm-pin/indian-bank/');
  const main = page.locator('main');
  const guide = page.getByTestId('indsmart-guide');
  await expect(guide.getByRole('heading', { name: 'IndSMART app: debit card PIN' })).toBeVisible();
  await expect(guide).toContainText('Green Pin Generation/Validation');
  await expect(guide).toContainText('Debit Card set/reset pin');
  await expect(guide).toContainText('चरण-दर-चरण प्रक्रिया नहीं मिली');
  await expect(guide).toContainText('ATM जाना हर बार ज़रूरी है, ऐसा सेवा सूची में नहीं कहा गया है');
  await expect(guide).toContainText('BalCheck पर PIN या OTP दर्ज न करें');
  const app = guide.getByRole('link', { name: /IndSMART पेज खोलें/ });
  await expect(app).toHaveAttribute('href', 'https://indianbank.bank.in/en/indsmart');
  await expect(app).toHaveAttribute('rel', /noopener/);
  await expect(guide.getByRole('link', { name: /ATM और debit card पेज/ })).toHaveAttribute('href', 'https://indianbank.bank.in/en/atm-/-debit-cards');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://balcheck.in/atm-pin/indian-bank/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('form, input, select, textarea')).toHaveCount(0);
  const schemas = await getJsonLdScripts(page);
  expect(findSchema(schemas, 'HowTo')).toBeFalsy();
  const faq = findSchema(schemas, 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
  const entries = page.getByTestId('atm-pin-faq').locator('h3');
  expect(faq.mainEntity).toHaveLength(4);
  await expect(entries).toHaveCount(4);
  for (const [index, item] of faq.mainEntity.entries()) {
    await expect(entries.nth(index)).toHaveText(item.name);
    await expect(entries.nth(index).locator('..').locator('p')).toHaveText(item.acceptedAnswer.text);
  }
  const claims = `${await main.innerText()} ${JSON.stringify(schemas)} ${await page.locator('meta[name="description"]').getAttribute('content')}`;
  for (const forbidden of ['Green PIN सेवा मुफ़्त है', 'यह सेवा मुफ़्त है', 'PIN generation मुफ़्त है', 'call करके OTP लें', 'call करके OTP लेकर', 'Net banking में login करें', 'OTP डालें और अपना नया 4-digit PIN set करें']) expect(claims).not.toContain(forbidden);
  for (const href of await main.locator('a[href^="/"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')!))) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const box = await app.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await app.focus();
  await expect(app).toBeFocused();
});

test('SBI retains the generic sibling rendering', async ({ page }) => {
  await gotoDom(page, '/atm-pin/sbi/');
  await expect(page.getByTestId('indsmart-guide')).toHaveCount(0);
  await expect(page.getByTestId('atm-pin-generic-steps').locator('li')).toHaveCount(5);
});
