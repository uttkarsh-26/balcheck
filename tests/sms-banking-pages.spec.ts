import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';

// GSC-driven sms-banking title overrides (28d GSC 2026-07-05..08-01):
// - punjab-gramin: 3,515 imp, top query "punjab gramin bank balance check number" (913 imp)
// - mp-gramin: 543 imp @ 0% CTR, top query "mpgb balance check number" (205 imp)
// - cosmos: 147 imp @ 0% CTR, top query "cosmos bank balance check number missed call" (38 imp)
// Each override must keep title <=60, description <=155, frontload the exact
// balance-check query, include the answer number, and stay honest about the
// verified balanceMode (never label a customer-care/IVR line as "Missed Call").

const overrideCases = [
  { slug: 'punjab-gramin', expectMissedCallClaim: false },
  { slug: 'mp-gramin', expectMissedCallClaim: true },
  { slug: 'cosmos', expectMissedCallClaim: true },
];

for (const { slug, expectMissedCallClaim } of overrideCases) {
  const bank = banks.find(b => b.slug === slug)!;

  test(`${slug}: sms-banking title targets balance-check query within 60 chars`, async ({ page }) => {
    await page.goto(`/sms-banking/${slug}/`);
    const title = await page.title();

    expect(title.length).toBeLessThanOrEqual(60);
    // exact query intent: the balance-check number phrase must lead
    expect(title).toContain('Balance Check Number');
    // answer number must be in the title
    expect(title).toContain(bank.missedCall);

    // honesty: never label a customer-care/IVR line as a missed-call service
    if (expectMissedCallClaim) {
      expect(title).toContain('Missed Call');
    } else {
      expect(title).not.toContain('Missed Call');
    }
  });

  test(`${slug}: sms-banking description within 155 chars and honest about mode`, async ({ page }) => {
    await page.goto(`/sms-banking/${slug}/`);
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).not.toBeNull();
    expect(desc!.length).toBeLessThanOrEqual(155);

    // description must carry the answer number and the verified mode label
    expect(desc).toContain(bank.missedCall);
    const modeLabel = bank.balanceMode === 'missed-call' ? 'missed call' : 'customer care/IVR';
    expect(desc).toContain(modeLabel);
  });
}

test('non-overridden sms-banking pages keep the generic template title', async ({ page }) => {
  await page.goto('/sms-banking/sbi/');
  const title = await page.title();
  expect(title).toContain('SBI SMS Banking');
  expect(title).toContain('Official Registration & Balance Methods');
  expect(title.length).toBeLessThanOrEqual(60);
});

test('all sms-banking pages provide substantial bank-specific guidance', async ({ page }) => {
  for (const bank of banks) {
    await page.goto(`/sms-banking/${bank.slug}/`);

    const guide = page.getByTestId('sms-banking-guide');
    await expect(guide, `${bank.slug}: missing substantive SMS guide`).toHaveCount(1);

    const text = (await guide.innerText()).replace(/\s+/g, ' ').trim();
    const words = text.match(/[A-Za-z0-9\u0900-\u097F]+/g) ?? [];

    expect(words.length, `${bank.slug}: SMS guide is thin (${words.length} words)`).toBeGreaterThanOrEqual(320);
    expect(text, `${bank.slug}: missing full bank name`).toContain(bank.name);
    expect(text, `${bank.slug}: missing Hindi bank name`).toContain(bank.nameHindi);
    expect(text, `${bank.slug}: missing balance-service number`).toContain(bank.missedCall);
    expect(text, `${bank.slug}: missing customer-care fallback`).toContain(bank.customerCare);
    expect(text, `${bank.slug}: missing bank category context`).toContain(bank.category);
    expect(text, `${bank.slug}: missing official website`).toContain(bank.website);

    const evidence = guide.getByTestId('service-evidence');
    await expect(evidence, `${bank.slug}: missing evidence status`).toHaveCount(1);
    if (bank.verificationSource && bank.lastVerified) {
      await expect(evidence, `${bank.slug}: missing review date`).toContainText(bank.lastVerified);
    } else {
      await expect(evidence, `${bank.slug}: undocumented evidence is not disclosed`).toContainText('detailed source citation और review date stored नहीं है');
      expect(text, `${bank.slug}: undocumented record is presented as verified`).not.toContain('verified balance number');
      expect(text, `${bank.slug}: undocumented service mode is presented as verified`).not.toContain('verified mode');
    }

    if (bank.missedCallAlt) {
      expect(text, `${bank.slug}: missing dedicated mini-statement number`).toContain(bank.missedCallAlt);
      await expect(guide.locator(`a[href="/mini-statement/${bank.slug}/"]`)).toHaveCount(1);
    }

    if (bank.balanceMode === 'missed-call') {
      expect(text, `${bank.slug}: missed-call flow is not explicit`).toContain('registered mobile');
    } else {
      expect(text, `${bank.slug}: IVR/customer-care flow is not explicit`).toContain('dedicated missed-call service verified नहीं है');
    }
  }
});
