import { test, expect } from '@playwright/test';
import { ATM_PIN_GUIDES, getAtmPinGuide } from '../src/data/atm-pin-guides';
import { banks } from '../src/data/banks';

/**
 * Data-layer contract for the two-page ATM-PIN pilot.
 *
 * The audited defect: `/atm-pin/[slug]/` rendered ONE generic 5-step procedure
 * plus an unconditional "free" fee claim and a four-channel list for all 75
 * banks, with no per-bank source. The pilot replaces that on the two approved
 * pages only (odisha-grameen, psb) with a typed, source-cited guide; every
 * other bank keeps the generic template as its deterministic fallback.
 */
const PILOT_SLUGS = ['odisha-grameen', 'psb'] as const;

/** Claims the audited template made that no cited source supports. */
const UNSUPPORTED_CLAIMS = [
  'मुफ़्त है', // unconditional fee claim
  'Net banking, ATM, SMS', // the four-channel list
  '4 तरीके', // the four-channel count
  'सबसे आसान तरीका', // "net banking is easiest"
  'यह सेवा मुफ़्त', // "this service is free"
] as const;

test('the ATM-PIN pilot covers exactly the two approved banks', () => {
  expect(Object.keys(ATM_PIN_GUIDES).sort()).toEqual([...PILOT_SLUGS].sort());
  for (const slug of PILOT_SLUGS) {
    expect(banks.find((bank) => bank.slug === slug), `${slug} must exist in banks.ts`).toBeTruthy();
  }
});

test('every pilot guide cites an official https source read on a stated ISO date', () => {
  for (const slug of PILOT_SLUGS) {
    const guide = getAtmPinGuide(slug)!;
    expect(guide, `${slug} guide`).toBeTruthy();
    expect(guide.sourceUrl.startsWith('https://'), `${slug} sourceUrl`).toBe(true);
    expect(guide.checkedOn, `${slug} checkedOn`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(guide.sourceLabel.trim().length, `${slug} sourceLabel`).toBeGreaterThan(10);
    expect(guide.officialEntry.url.startsWith('https://'), `${slug} entry url`).toBe(true);
    expect(guide.officialEntry.label.trim().length, `${slug} entry label`).toBeGreaterThan(5);
    expect(guide.channel.trim().length, `${slug} channel`).toBeGreaterThan(5);
    expect(guide.summary.trim().length, `${slug} summary`).toBeGreaterThan(40);
    expect(guide.metaDescription.trim().length, `${slug} metaDescription`).toBeGreaterThan(40);
  }
});

test('pilot procedure steps are contiguous, ordered and substantial', () => {
  for (const slug of PILOT_SLUGS) {
    const guide = getAtmPinGuide(slug)!;
    expect(guide.steps.length, `${slug} step count`).toBeGreaterThanOrEqual(7);
    guide.steps.forEach((step, index) => {
      expect(step.label.trim().length, `${slug} step ${index + 1} label`).toBeGreaterThan(2);
      expect(step.detail.trim().length, `${slug} step ${index + 1} detail`).toBeGreaterThan(20);
    });
    expect(new Set(guide.steps.map((step) => step.label)).size, `${slug} duplicate labels`).toBe(
      guide.steps.length,
    );
  }
});

test('the PSB guide keeps the documented nine-step ATM flow in source order', () => {
  const steps = getAtmPinGuide('psb')!.steps;
  expect(steps).toHaveLength(9);
  expect(steps[1].detail).toContain('OTP generation');
  expect(steps[2].detail).toContain('आधे घंटे');
  expect(steps[3].detail).toContain('दोबारा');
  expect(steps[4].detail).toContain('OTP validation');
  expect(steps[7].detail).toContain('4 अंक');
});

test('no pilot guide repeats the unsupported four-channel, free or easiest-channel claims', () => {
  for (const slug of PILOT_SLUGS) {
    const guide = getAtmPinGuide(slug)!;
    const haystack = JSON.stringify(guide);
    for (const phrase of UNSUPPORTED_CLAIMS) {
      expect(haystack, `${slug} must not claim "${phrase}"`).not.toContain(phrase);
    }
  }
});

test('pilot guides declare the channels the cited source does not document', () => {
  for (const slug of PILOT_SLUGS) {
    const guide = getAtmPinGuide(slug)!;
    expect(guide.undocumented.length, `${slug} undocumented lines`).toBeGreaterThan(0);
    for (const line of guide.undocumented) {
      expect(line.trim().length, `${slug} undocumented line`).toBeGreaterThan(20);
    }
  }
});

test('pilot prerequisites, troubleshooting and FAQs are present and non-empty', () => {
  for (const slug of PILOT_SLUGS) {
    const guide = getAtmPinGuide(slug)!;
    expect(guide.prerequisites.length, `${slug} prerequisites`).toBeGreaterThan(0);
    for (const line of guide.prerequisites) {
      expect(line.trim().length, `${slug} prerequisite`).toBeGreaterThan(15);
    }
    expect(guide.troubleshooting.length, `${slug} troubleshooting`).toBeGreaterThan(0);
    for (const item of guide.troubleshooting) {
      expect(item.q.trim().length, `${slug} troubleshooting question`).toBeGreaterThan(5);
      expect(item.a.trim().length, `${slug} troubleshooting answer`).toBeGreaterThan(20);
    }
    expect(guide.faqs.length, `${slug} faqs`).toBeGreaterThanOrEqual(4);
    for (const faq of guide.faqs) {
      expect(faq.q.trim().length, `${slug} faq question`).toBeGreaterThan(5);
      expect(faq.a.trim().length, `${slug} faq answer`).toBeGreaterThan(40);
    }
  }
});

test('the Odisha Grameen guide names the pre-merger bank with an official merger source', () => {
  const guide = getAtmPinGuide('odisha-grameen')!;
  expect(guide.contextNote, 'odisha-grameen context note').toBeTruthy();
  expect(guide.contextNote!.text).toContain('Odisha Gramya Bank');
  expect(guide.contextNote!.sourceUrl).toBe('https://odishabank.bank.in/');
  expect(guide.contextNote!.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('a non-pilot bank has no guide, so the generic template stays the fallback', () => {
  for (const slug of ['sbi', 'indian-bank', 'upi', 'not-a-bank']) {
    expect(getAtmPinGuide(slug), `${slug} must have no pilot guide`).toBeUndefined();
  }
  expect(Object.keys(ATM_PIN_GUIDES).length).toBeLessThan(banks.length);
});
