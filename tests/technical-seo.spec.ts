import { test, expect } from '@playwright/test';
import { gotoDom } from './utils';

test('Cooperative category aligns title, H1 and body with GSC demand', async ({ page }) => {
  await gotoDom(page, '/banks/cooperative-bank/');
  await expect(page).toHaveTitle(/Cooperative Bank Balance Check Number/i);
  await expect(page.locator('h1')).toContainText('Cooperative Bank Balance Check Number');
  await expect(page.locator('main')).toContainText('Cooperative bank balance check number');
});

test('TMB net-banking page targets login and netbanking variants', async ({ page }) => {
  await gotoDom(page, '/net-banking/tmb/');
  await expect(page).toHaveTitle(/TMB Net Banking Login/i);
  await expect(page).toHaveTitle(/TMB Netbanking/i);
  await expect(page.locator('h1')).toContainText('TMB Net Banking');
});

// GSC-driven net-banking overrides: each one leads the snippet with the Latin
// query phrase its cluster is actually searched in (the default title led with
// the Devanagari bank name, so the snippet never bold-matched the query) and
// must stay inside the site's 155-char meta-description contract.
const netBankingOverrideContracts: Array<{
  slug: string;
  title: RegExp[];
  lead: string;
  host: string;
}> = [
  {
    slug: 'tmb',
    title: [/TMB Net Banking Login/i, /TMB Netbanking/i],
    lead: 'TMB net banking login',
    host: 'tmb.in',
  },
  // 30d pull 2026-10-09: 'mpgb net banking' 2,785 impr @ 2.73% CTR pos 5.0,
  // 'mpgb internet banking' 244 @ 3.28%, '...registration' 220, '...login' 151.
  {
    slug: 'mp-gramin',
    title: [/MPGB Net Banking Login/i, /Madhya Pradesh Gramin Bank Netbanking/i],
    lead: 'MPGB net banking login',
    host: 'mpgb.bank.in',
  },
  {
    slug: 'sib',
    title: [/SIB Net Banking Login/i, /SIBnet/i],
    lead: 'SIB net banking login',
    host: 'southindianbank.com',
  },
  {
    slug: 'nainital',
    title: [/Nainital Bank Net Banking Login/i],
    lead: 'Nainital Bank net banking login',
    host: 'nainitalbank.co.in',
  },
];

for (const { slug, title, lead, host } of netBankingOverrideContracts) {
  test(`net-banking ${slug} override leads with the Latin query phrase`, async ({ page }) => {
    await gotoDom(page, `/net-banking/${slug}/`);
    for (const pattern of title) {
      await expect(page).toHaveTitle(pattern);
    }
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain(lead);
    expect(description).toContain(host);
    expect(description!.length).toBeLessThanOrEqual(155);
  });
}

test('Punjab Gramin SMS page targets balance-check-number demand', async ({ page }) => {
  await gotoDom(page, '/sms-banking/punjab-gramin/');
  await expect(page).toHaveTitle(/Punjab Gramin Bank Balance Check Number/i);
  await expect(page.locator('h1')).toHaveText('Punjab Gramin Bank Balance Check Number');
});

test('service pages expose reciprocal discovery links', async ({ page }) => {
  const cases = [
    ['/sms-banking/sbi/', ['/mini-statement/sbi/', '/balance-enquiry/sbi/']],
    ['/mini-statement/sbi/', ['/sms-banking/sbi/', '/balance-enquiry/sbi/']],
    ['/balance-enquiry/sbi/', ['/sms-banking/sbi/', '/mini-statement/sbi/']],
    ['/net-banking/sbi/', ['/sms-banking/sbi/', '/balance-enquiry/sbi/']],
  ] as const;

  for (const [path, links] of cases) {
    await gotoDom(page, path);
    for (const href of links) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
    }
  }
});

test('breadcrumb schema uses canonical slash for Home', async ({ page }) => {
  for (const path of ['/net-banking/sbi/', '/sms-banking/sbi/', '/mini-statement/sbi/']) {
    await gotoDom(page, path);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const breadcrumb = schemas
      .map((value) => JSON.parse(value))
      .flatMap((value) => value['@graph'] ?? [value])
      .find((value) => value['@type'] === 'BreadcrumbList');
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement[0].item).toBe('https://balcheck.in/');
  }
});
