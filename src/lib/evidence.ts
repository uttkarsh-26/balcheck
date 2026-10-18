import { banks, type Bank } from '../data/banks';

/** ISO calendar date, the format every `lastVerified` field uses. */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The audit receipt that documents where the registry's numbers come from. */
export const AUDIT_RECEIPT = 'docs/audits/bank-number-authenticity-2026-09-18.md';

/**
 * A record is only citable when it carries both a source line and an ISO date.
 * Anything less renders no citation at all: a half-empty or invented evidence
 * block is worse than none.
 */
export function hasDocumentedEvidence(bank: Bank): boolean {
  return Boolean(
    bank.verificationSource?.trim() &&
      bank.lastVerified &&
      ISO_DATE.test(bank.lastVerified),
  );
}

/** First http(s) URL inside the free-text `verificationSource`, if any. */
export function evidenceSourceUrl(source: string | null | undefined): string | undefined {
  return source?.match(/https?:\/\/[^\s)|]+/)?.[0];
}

/**
 * Registry-level citation for directory templates (`/mini-statement/`,
 * `/number-lookup/`), which list records rather than one bank's number.
 *
 * Both values are derived from the data at build time - the count of documented
 * records and the newest review date actually present - so neither can be a
 * hardcoded or invented claim. Returns null when nothing is documented.
 */
export function directoryEvidence(): { source: string; lastVerified: string } | null {
  const documented = banks.filter(hasDocumentedEvidence);
  const lastVerified = documented
    .map((bank) => bank.lastVerified!)
    .sort()
    .at(-1);

  if (!lastVerified) return null;

  return {
    source: `${documented.length}/${banks.length} bank records carry a verificationSource (official bank pages plus cross-check aggregators), audited per ${AUDIT_RECEIPT}`,
    lastVerified,
  };
}
