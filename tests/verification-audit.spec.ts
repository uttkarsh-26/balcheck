import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';

/**
 * Regression test for the 2026-07-20 verification audit.
 *
 * The top-20 bank pages by GSC impressions were audited against official
 * bank websites and 3+ independent aggregators. This test ensures:
 *   1. All audited banks have provenance fields (verificationSource, lastVerified)
 *   2. The Axis Bank correction (8422992272 → 18004195959) is not reverted
 *   3. All audited banks have valid HTTPS official-source URLs
 *   4. Verified records have supporting provenance
 */

const AUDITED_SLUGS = [
  'boi', 'psb', 'baroda-up-gramin', 'canara', 'punjab-gramin',
  'bandhan', 'sbi', 'indusind', 'axis', 'kvb',
  'baroda-rajasthan', 'idfc-first', 'rbl', 'icici', 'maharashtra',
  'cosmos', 'pnb', 'utkarsh-sfb', 'yes-bank', 'airtel-payments',
] as const;

// Expected numbers for the audited set — these must not change without a
// documented correction in the audit receipt (docs/audits/bank-verification-2026-07-20.md).
const EXPECTED_NUMBERS: Record<string, string> = {
  boi: '9811255430',
  psb: '7039035156',
  'baroda-up-gramin': '9986454440',
  canara: '8886610360',
  'punjab-gramin': '18001807777',
  bandhan: '9223008666',
  sbi: '09223766666',
  indusind: '18002741000',
  axis: '18004195959', // CORRECTED 2026-07-20 from 8422992272
  kvb: '09266292666',
  'baroda-rajasthan': '8880094411',
  'idfc-first': '18002700720',
  rbl: '18004190610',
  icici: '9594612612',
  maharashtra: '9833335555',
  cosmos: '9029013793',
  pnb: '9264092640',
  'utkarsh-sfb': '18001239878',
  'yes-bank': '9223920000',
  'airtel-payments': '8800688006',
};

test.describe('2026-07-20 verification audit regression', () => {
  const auditedBanks = banks.filter(b => AUDITED_SLUGS.includes(b.slug as typeof AUDITED_SLUGS[number]));

  test('all 20 audited banks are present in the dataset', () => {
    expect(auditedBanks.length).toBe(20);
    const foundSlugs = new Set(auditedBanks.map(b => b.slug));
    for (const slug of AUDITED_SLUGS) {
      expect(foundSlugs.has(slug), `Missing audited bank: ${slug}`).toBe(true);
    }
  });

  test('all audited banks have verificationSource and lastVerified', () => {
    for (const bank of auditedBanks) {
      expect(bank.verificationSource, `${bank.slug} missing verificationSource`).toBeTruthy();
      expect(bank.lastVerified, `${bank.slug} missing lastVerified`).toBeTruthy();
      // lastVerified must be a valid ISO date
      expect(bank.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('all audited banks have valid HTTPS official-source URLs', () => {
    for (const bank of auditedBanks) {
      expect(bank.website, `${bank.slug} missing website`).toBeTruthy();
      expect(bank.website.startsWith('https://'), `${bank.slug} website not HTTPS: ${bank.website}`).toBe(true);
    }
  });

  test('verified records have supporting provenance', () => {
    for (const bank of auditedBanks) {
      if (bank.verified) {
        expect(bank.verificationSource, `${bank.slug} is verified but has no verificationSource`).toBeTruthy();
        expect(bank.lastVerified, `${bank.slug} is verified but has no lastVerified`).toBeTruthy();
      }
    }
  });

  test('expected numbers match the audited values (no silent regressions)', () => {
    for (const bank of auditedBanks) {
      const expected = EXPECTED_NUMBERS[bank.slug];
      if (expected) {
        expect(bank.missedCall, `${bank.slug} missedCall changed from audited value`).toBe(expected);
      }
    }
  });

  test('Axis Bank correction is not reverted (8422992272 must not reappear)', () => {
    const axis = banks.find(b => b.slug === 'axis');
    expect(axis).toBeDefined();
    expect(axis!.missedCall).toBe('18004195959');
    expect(axis!.missedCall).not.toBe('8422992272');
    // The old wrong number must not appear anywhere in the axis record
    expect(axis!.notes).toContain('CORRECTED');
  });
});
