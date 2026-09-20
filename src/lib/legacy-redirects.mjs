// Legacy / speculative URL → canonical target map for balcheck.in.
//
// Source of the entries: Google-requested paths that return 404 without this
// map. Two evidence bases, both re-checkable:
//   1. Cloudflare GraphQL `httpRequestsAdaptiveGroups` filtered on
//      edgeResponseStatus=404 + a Googlebot user agent (see the
//      `seo-incident-investigation` workflow) — the mobile Googlebot UA
//      (Nexus 5X / Android 6.0.1) is the one that harvests bogus paths from
//      served HTML.
//   2. GSC Search Analytics `dimension=page` over the property's full life,
//      intersected with a live status sweep — URLs that earned impressions and
//      now 404.
//
// Contract (enforced by scripts/test-legacy-redirects.mjs):
//   * every SOURCE path must NOT exist in dist/ (a redirect must never shadow a
//     real route),
//   * every TARGET path MUST exist in dist/ (never redirect into another 404).
// Add entries only with a live status check of the target.

export const EXACT_REDIRECTS = {
  // Crawler probes for the sitemap. robots.txt declares /sitemap-index.xml,
  // but Googlebot and third-party tools still request these two forms.
  '/sitemap.xml': '/sitemap-index.xml',
  '/sitemap_index.xml': '/sitemap-index.xml',

  // Slug variants Google holds that never existed under these exact names.
  '/banks/cooperative/': '/banks/cooperative-bank/',
  '/bank/central/': '/bank/central-bank/',
  '/bank/central-wood/': '/bank/central-bank/',
  '/bank/banhan/': '/bank/bandhan/',
  '/bank/bihar-regon/': '/bank/bihar-gramin/',
  '/bank/up-in/': '/bank/up-gramin/',
  '/bank/brkgb-balance-check-number/': '/bank/baroda-rajasthan/',
  '/atm-pin/kerala-gramin-bank/': '/atm-pin/kerala-grameena/',
  '/mini-statement/himachal-gramin/': '/mini-statement/himachal-pradesh-gramin/',
  '/sms-banking/rajasthan-regasthan/': '/sms-banking/rajasthan-gramin/',

  // A pre-pivot path shape on this host with no current equivalent; the
  // closest live page is the SBI toll-free query.
  '/hindi/insights/sbi-account-balance-check-toll-free-enquiry-number': '/toll-free-number/sbi/',

  // Crawler-mutated forms: a trailing "|" segment, and a doubled path pair.
  '/mobile-number-registration/psb/%7C': '/mobile-number-registration/psb/',
  '/mobile-number-registration/psb/|': '/mobile-number-registration/psb/',
  '/mobile-number-registration/iob/mobile-number-registration/iob/':
    '/mobile-number-registration/iob/',
};

// Prefix rewrites, applied in order, only on paths with no dist/ match.
const PREFIX_REDIRECTS = [
  // Wrong vertical name (typo'd once in a page template, since fixed).
  // Matches mobile-registration, mobile_number-registration and the canonical
  // mobile-number-registration form — the canonical form rewrites to itself and
  // is skipped below, so only the variants redirect.
  [/^\/mobile[-_]?(?:number[-_]?)?registration\//, '/mobile-number-registration/'],
  // Literal `${e.slug}` URLs Googlebot harvested from the inline template
  // literals on /number-lookup/ before those hrefs were built by concatenation.
  [/^\/(bank|missed-call|customer-care)\/(\$\{e\.slug\}|%24%7Be\.slug%7D)\/?$/, 'HUB'],
  // Doubled pair: /<vertical>/<slug>/<vertical>/<slug>/ → /<vertical>/<slug>/
  [/^\/([a-z-]+)\/([a-z0-9-]+)\/\1\/\2\/?$/, '/$1/$2/'],
];

const HUB_FOR = {
  bank: '/banks/',
  'missed-call': '/missed-call/',
  'customer-care': '/customer-care/',
};

/**
 * Resolve a request pathname to a 301 target, or null when the path deserves
 * its normal 404. Trailing-slash variants of the keys are accepted.
 */
export function resolveLegacyRedirect(pathname) {
  const candidates = [pathname];
  if (!pathname.endsWith('/')) candidates.push(`${pathname}/`);
  else candidates.push(pathname.slice(0, -1));

  for (const candidate of candidates) {
    const exact = EXACT_REDIRECTS[candidate];
    if (exact) return exact;
  }

  for (const [pattern, replacement] of PREFIX_REDIRECTS) {
    const match = pathname.match(pattern);
    if (!match) continue;
    if (replacement === 'HUB') return HUB_FOR[match[1]] ?? null;
    const rewritten = pathname.replace(pattern, replacement);
    const normalized = rewritten.endsWith('/') ? rewritten : `${rewritten}/`;
    // A no-op rewrite means this was already the canonical form.
    if (normalized === pathname) continue;
    return normalized;
  }

  return null;
}
