import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
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
    expect(axis!.notes).not.toContain('8422992272');
    expect(axis!.notes).toContain('axis.bank.in');
  });

  test('Punjab & Sind Bank uses the current official customer-care number', () => {
    const psb = banks.find(b => b.slug === 'psb');
    expect(psb).toBeDefined();
    expect(psb!.customerCare).toBe('1800-419-8300');
    expect(psb!.website).toBe('https://punjabandsind.bank.in');
    expect(psb!.verificationSource).toContain('https://punjabandsind.bank.in/');
  });

  test('Punjab Gramin Bank points to its current official .bank.in domain', () => {
    const pgb = banks.find(b => b.slug === 'punjab-gramin');
    expect(pgb).toBeDefined();
    expect(pgb!.website).toBe('https://pgb.bank.in');
    expect(pgb!.verificationSource).toContain('pgb.bank.in');
  });
});

/**
 * 2026-09-18 full-dataset number audit regression gate.
 *
 * Receipt: docs/audits/bank-number-authenticity-2026-09-18.md (79-bank verdict table).
 * Re-runnable checker: scripts/audit-number-authenticity.mjs (checks 1-4 are re-implemented
 * here as hard assertions so the data cannot drift from the report without CI failing).
 *
 *   1. every verified:true record carries non-empty verificationSource + lastVerified
 *   2. no cross-bank digit-identical missedCall/customerCare outside the §3 sponsor-line allowlist
 *   3. every stored number passes the shape rules of audit check 1
 *   4. FIX-P3-1 old → new expected numbers for idfc-first and hsbc, plus the rendered pages
 */

const digitsOf = (value: string | undefined) => String(value ?? '').replace(/\D/g, '');

/** Canonical equality form — same rule as scripts/audit-number-authenticity.mjs. */
const canonOf = (value: string | undefined) => {
  let d = digitsOf(value).replace(/^0+/, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  return d;
};

/** Shape table copied verbatim from scripts/audit-number-authenticity.mjs (check 1). */
const NUMBER_SHAPES: { name: string; re: RegExp }[] = [
  { name: 'mobile10', re: /^[6-9]\d{9}$/ },
  { name: 'mobile11-0prefix', re: /^0[6-9]\d{9}$/ },
  { name: 'tollfree-1800', re: /^1800\d{4,9}$/ },
  { name: 'tollfree-1860', re: /^1860\d{4,9}$/ },
  { name: 'tollfree-180x', re: /^180\d{7,9}$/ },
  { name: 'landline-std', re: /^0\d{2,4}\d{6,8}$/ },
  { name: 'short-code', re: /^18\d{2,4}$/ },
];

/**
 * Cross-bank digit-identical numbers that the audit confirms are real shared
 * sponsor lines, not copy-paste errors — report §3.2 `9015800700` (pragathi-krishna,
 * karnataka-grameena), §3.3 `9986454440` (baroda-up-gramin, up-gramin), §3.4
 * `18001807777` (punjab-gramin, himachal-pradesh-gramin, bihar-gramin, haryana-gramin),
 * §3.5 `18005327444` (jharkhand-gramin, uttarakhand-gramin, rajasthan-gramin).
 * `18001088222` is deliberately absent: FIX-P3-1 removed that duplicate from both
 * idfc-first and hsbc, so it must never reappear here.
 */
// 18001025250 is shared by kvgb + karnataka-grameena on purpose: Karnataka Vikas Grameena Bank
// amalgamated into Karnataka Grameena Bank (mergers.ts oldSlug 'karnataka-vikas', Gazette
// S.O. 1629(E)), so kvgb now carries the successor's own published helpline; the digits are
// read at https://karnatakagb.bank.in/contact (kvgbank.com only 302-redirects there) — see
// docs/audits/bank-number-recheck-2026-09-26.md.
const SHARED_NUMBER_ALLOWLIST = ['9015800700', '9986454440', '18001807777', '18005327444', '18001025250'];

/**
 * The 2026-09-18 audit found no evidence at all for these records (verdict
 * NO_SUPPORT / SITE_BLOCKED): no official page carried the number and no
 * aggregator corroborated it. They stay `verified:false` with no `lastVerified`,
 * so their pages print "no verification date recorded" instead of a date nobody
 * earned — the receipt in `verificationSource` documents the failed attempt.
 * Getting one of these to `verified:true` requires an actual official page read:
 * hsbc is deliberately NOT in this list, because its live
 * https://www.hsbc.bank.in/help/contact/ was read on 2026-09-18 and carries
 * tel:18002673456 / tel:18002663456 (18001088222 absent).
 */
const UNCONFIRMED_NO_EVIDENCE = [
  'apgb', 'arunachal-pradesh-rural', 'dbs', 'deutsche', 'equitas', 'esaf',
  'fincare', 'ippb', 'jio-payments', 'kvgb', 'mizoram-rural',
  'pragathi-krishna', 'saraswat', 'standard-chartered', 'suryoday',
  'tamil-nadu-grama',
].sort();

/** Receipt wording that marks a record as "checked, nothing found". */
const NO_EVIDENCE_RECEIPT_MARKERS = [
  'Official re-check 2026-09-26',
  'no on-page, index or third-party evidence captured',
  'site unreachable to automation',
];

/** FIX-P3-1 — old → new, verified live on 2026-09-18. */
const FIX_P3_1_EXPECTED: Record<string, { field: 'missedCall' | 'customerCare'; was: string; now: string }[]> = {
  // live https://www.idfcfirst.bank.in/customer-care renders "1800 10 888" with href tel:180010888
  'idfc-first': [{ field: 'customerCare', was: '1800-108-8222', now: '1800-10-888' }],
  // live https://www.hsbc.bank.in/help/contact/ carries 1800 266 3456 / 1800 267 3456 only
  hsbc: [
    { field: 'missedCall', was: '18001088222', now: '1800-267-3456' },
    { field: 'customerCare', was: '1800-108-8222', now: '1800-267-3456' },
  ],
};

test.describe('2026-09-18 number audit regression gate', () => {
  test('every verified record carries verificationSource + lastVerified', () => {
    const missing = banks
      .filter(bank => bank.verified)
      .filter(bank => !bank.verificationSource?.trim() || !bank.lastVerified?.trim())
      .map(bank => bank.slug);
    expect(missing, `verified records missing provenance: ${missing.join(', ')}`).toEqual([]);
    for (const bank of banks) {
      if (!bank.lastVerified) continue;
      expect(bank.lastVerified, `${bank.slug} lastVerified is not an ISO date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('records with no audit evidence stay verified:false and print no verification date', () => {
    // A receipt is not a verification: these records may not claim one.
    const marked = banks
      .filter(bank => NO_EVIDENCE_RECEIPT_MARKERS.some(m => bank.verificationSource?.includes(m)))
      .map(bank => bank.slug)
      .sort();
    expect(marked, 'the no-evidence receipt class drifted from the audit report').toEqual(UNCONFIRMED_NO_EVIDENCE);

    for (const bank of banks.filter(b => marked.includes(b.slug))) {
      expect(bank.verified, `${bank.slug} claims verified:true with no official evidence`).toBe(false);
      expect(bank.lastVerified, `${bank.slug} would print a verification date it never earned`).toBeUndefined();
    }

    const verifiedSlugs = banks.filter(b => b.verified).map(b => b.slug).sort();
    expect(verifiedSlugs.length, 'verified:true count moved — re-derive it from the audit report').toBe(63);
  });

  test('no cross-bank duplicate numbers outside the §3 sponsor-line allowlist', () => {
    const byValue = new Map<string, Set<string>>();
    for (const bank of banks) {
      for (const field of ['missedCall', 'customerCare'] as const) {
        const value = bank[field];
        if (!value) continue;
        const key = canonOf(value);
        if (!byValue.has(key)) byValue.set(key, new Set());
        byValue.get(key)!.add(bank.slug);
      }
    }
    const offenders = [...byValue.entries()]
      .filter(([value, slugs]) => slugs.size > 1 && !SHARED_NUMBER_ALLOWLIST.includes(value))
      .map(([value, slugs]) => `${value} shared by ${[...slugs].sort().join(', ')}`);
    expect(offenders, `duplicate numbers need an audit receipt: ${offenders.join(' | ')}`).toEqual([]);
  });

  test('every stored number passes the audit check-1 shape rules', () => {
    const unrecognized: string[] = [];
    for (const bank of banks) {
      for (const field of ['missedCall', 'missedCallAlt', 'customerCare'] as const) {
        const raw = bank[field];
        if (!raw) continue;
        const d = digitsOf(raw);
        if (!NUMBER_SHAPES.some(shape => shape.re.test(d))) {
          unrecognized.push(`${bank.slug}.${field}='${raw}' (${d.length} digits)`);
        }
      }
    }
    expect(unrecognized, `unrecognized number shapes: ${unrecognized.join(' | ')}`).toEqual([]);
  });

  test('FIX-P3-1 old → new numbers are applied and the old duplicate is gone', () => {
    for (const [slug, changes] of Object.entries(FIX_P3_1_EXPECTED)) {
      const bank = banks.find(b => b.slug === slug);
      expect(bank, `missing record ${slug}`).toBeDefined();
      for (const change of changes) {
        expect(bank![change.field], `${slug}.${change.field} regression`).toBe(change.now);
        expect(digitsOf(bank![change.field]), `${slug}.${change.field} digits`).toBe(digitsOf(change.now));
      }
      // The withdrawn value must not survive anywhere in the record.
      for (const change of changes) {
        for (const field of ['missedCall', 'missedCallAlt', 'customerCare'] as const) {
          expect(bank![field], `${slug}.${field} still carries the withdrawn ${change.was}`).not.toBe(change.was);
        }
      }
    }

    // 18001088222 was stored twice (idfc-first customerCare + hsbc both fields) — it is now
    // on neither record, so no record may hold it in any field.
    const NUMBER_FIELDS = ['missedCall', 'missedCallAlt', 'customerCare'] as const;
    const holders = banks
      .filter(bank => NUMBER_FIELDS.some(f => digitsOf(bank[f]) === '18001088222'))
      .map(bank => bank.slug);
    expect(holders, `18001088222 must not be stored anywhere: ${holders.join(', ')}`).toEqual([]);

    // HSBC publishes no missed-call facility: both fields must normalize identically so
    // balanceMode derives to 'customer-care' and no /missed-call/hsbc/ page is generated.
    const hsbc = banks.find(b => b.slug === 'hsbc')!;
    expect(hsbc.balanceMode).toBe('customer-care');
    expect(hsbc.notes).toContain('1800-266-3456');
    expect(hsbc.notes).toContain('1800-267-3456');
    expect(hsbc.verificationSource).toContain('https://www.hsbc.bank.in/help/contact/');

    const idfc = banks.find(b => b.slug === 'idfc-first')!;
    expect(idfc.verificationSource).toContain('https://www.idfcfirst.bank.in/customer-care');
  });

  test('FIX-P3-1 numbers are rendered with matching tap-to-call hrefs in dist/', () => {
    const rendered: Record<string, { page: string; digits: string[] }> = {
      'idfc-first': { page: join('bank', 'idfc-first', 'index.html'), digits: ['180010888'] },
      hsbc: { page: join('bank', 'hsbc', 'index.html'), digits: ['18002673456'] },
    };
    for (const [slug, spec] of Object.entries(rendered)) {
      const file = join(process.cwd(), 'dist', spec.page);
      expect(existsSync(file), `dist/${spec.page} missing — run npm run build`).toBe(true);
      const html = readFileSync(file, 'utf8');
      const bare = digitsOf(html);
      for (const d of spec.digits) {
        expect(bare, `${slug} page does not render ${d}`).toContain(d);
      }
      // tap-to-call targets must be the stored numbers
      for (const bank of banks.filter(b => b.slug === slug)) {
        for (const field of ['missedCall', 'customerCare'] as const) {
          const d = digitsOf(bank[field]);
          expect(d.length, `${slug}.${field} is empty`).toBeGreaterThan(0);
          expect(bare, `${slug} page does not render ${field} ${d}`).toContain(d);
        }
      }
    }

    // HSBC's removed duplicate must not be linkable, and no missed-call page may exist for it.
    const hsbcHtml = digitsOf(readFileSync(join(process.cwd(), 'dist', 'bank', 'hsbc', 'index.html'), 'utf8'));
    expect(hsbcHtml).toContain('18002673456');
    expect(existsSync(join(process.cwd(), 'dist', 'missed-call', 'hsbc', 'index.html'))).toBe(false);
  });
});
