# Changelog

All notable changes to this repository are recorded here, newest first.

## [Unreleased]

### UP Gramin mobile-number registration accuracy
- Replaced unverified registration promises with source-scoped branch guidance, separated account/CIF updates from SMS, missed-call and app enrolment, and withheld the unaudited service rail on this page only. Preserved title, H1, canonical and registry; corrected the description.

### UP Gramin bank page source scope
- Corrected the missed-call procedure and merger history, qualified WhatsApp and contact claims, and withheld unreviewed service links on the existing bank page. Registry, linked guides, title, H1 and canonical remain unchanged.

### Bihar Gramin Bank contact source scope
- On the existing bank page, identify the toll-free number as a published contact rather than a confirmed balance procedure, and link the bank-listed BGB mBanking balance feature. Scope the fresh evidence date sentence to that contact number, withhold the unsupported SMS-balance and balance-enquiry method links, remove unsupported instructions and balance HowTo, and correct the description. The frozen title and H1 still imply unconfirmed balance-check and 24x7 availability; title, H1, canonical and registry remain unchanged.

### UCO Bank mobile-number registration accuracy
- Replaced unsupported ATM account-linking steps, fixed timelines and mandatory-document claims with source-scoped UCO FAQ guidance and the advertised mBanking profile feature, without inferring its eligibility or effect. FAQ and HowTo reuse the visible guide; title, H1, canonical and other banks remain unchanged, with only the unsupported ATM/website description promise removed.

### Indian Bank mobile-number registration accuracy
- Replaced unverified ATM/online menus, mandatory documents and fixed completion promises on the high-value registration page with the bank's CIF policy and source-scoped guidance. Distinguished app onboarding and missing-old-number cases; preserved title, H1, canonical and other banks, correcting only the unsupported description promise.

### Odisha Grameen ATM-PIN source scope
- Rechecked the public Card Services portal without bypassing TLS validation. Removed the unsupported card-linked-mobile instruction from the shared visible/HowTo step, and qualified legacy-bank applicability in the FAQ, context note and description with the portal's account/card eligibility. Preserved the title, H1, canonical and other banks; the merger citation retains its earlier review date.

### BOI mobile-number registration accuracy
- On the existing BOI registration page, replaced unverified fixed timelines, mandatory-document and ATM/online sequences with source-scoped guidance; distinguished changes to the mobile number held on an account, mobile-app onboarding and service activation. FAQ and HowTo schema reuse the visible guidance. Corrected the description's unsupported ATM/website instruction while preserving the title, H1 and canonical; other banks remain unchanged.

### Canara balance-check depth and contact correction
- Added source-backed Savings balance versus Hindi/English last-five-transaction guidance on the existing `/bank/canara/` page, with explicit limits for SMS commands, registration, fees and response timing. Corrected the shared support record to `18001030` and the official `.bank.in` website; updated the existing Canara mini-statement/SMS consumers so they no longer deny the verified language-specific numbers. Preserved existing titles, H1s, canonicals, routes and the ATM-PIN pilot; corrected unsupported description claims rather than making a new title experiment. [Official-source audit](docs/audits/canara-balance-guide-2026-11-07.md).

### UP Gramin balance-enquiry depth
- Deepened the existing `/balance-enquiry/up-gramin/` URL with the bank's published account/mobile eligibility, first-ring missed-call flow, same-CUST-ID reply scope and base-branch recovery instructions. Procedure and FAQ schema reuse the visible guide data; the UPGB-only branch removes generic fixed-seconds, two-to-three-ring, DND and undocumented SMS/app instructions. Existing title, description, H1, canonical, bank record and ATM-PIN pilot are preserved; no new URLs. The [source audit](docs/audits/up-gramin-balance-guide-2026-11-07.md) separates the fresh procedure read from the older number-record citation.

### Security — all 21 open Dependabot alerts cleared by in-range dependency updates
- `zod` 4.6.5 → **4.6.6** (GHSA-mrhx-c7xc-m3w5, CVE-2023-54404, high), `undici` 8.10.2 → **8.12.2** (8 advisories incl. GHSA-2m5v-pch6-74hx TLS-option drop and GHSA-4w7w-5xrc-9h26 cross-origin redirect cache poisoning), `undici` 7.29.1 → **7.30.1** (same 8 advisories on the 7.x line), `fast-uri` 3.1.8 → **3.1.9** (4 advisories incl. GHSA-w74x-v6f9-j3xg scheme spoofing), `vite` 8.2.1 → **8.2.4** (5 advisories incl. GHSA-587h-7wmj-h5pm launch-editor command execution and GHSA-9jrq-w75r-8gcw cross-origin script execution via custom middleware).
- Behind those bumps: `miniflare` 5.20261019.0-beta → 5.20261103.0-beta (now pins `undici` 7.30.1 instead of the exact-pinned vulnerable 7.29.1), `wrangler` 4.151.2 → **4.157.0** (clears the wrangler→miniflare alert; range `^4.120.0` → `^4.157.0` so the fixed miniflare is the floor), `vite` range `^8.2.1` → `^8.2.4`. No `overrides` were widened: the only override is still `compression`.
- Runtime exposure, verified rather than inferred from npm's `runtime` label: `wrangler.toml` serves `dist/` through `src/worker.ts`, which imports only `src/lib/legacy-redirects.mjs` — no vulnerable package reaches the deployed Worker (no `zod`/`undici`/`fast-uri`/`vite` reference exists in `dist/` or `src/worker.ts`). `zod` is Astro's content/config schema validator and `undici` 8 arrives via Astro's `unifont` — both build-time only. `undici` 7 is `miniflare`'s (local `wrangler dev`), `fast-uri` is `ajv`'s which is pulled by the dev-only `serve` preview server, and `vite` is a build/dev-server dependency. The affected packages are outside the reviewed public Worker request path; the relevant exposure is the developer/build toolchain. These updates remediate the currently reported advisories (`npm audit`: 0), not every possible supply-chain risk.
- Verification: `npm ci` from the new lock, `npm run build` (846 pages), `node scripts/verify-sitemap-canonical.mjs`, `node scripts/test-legacy-redirects.mjs`, `node scripts/test-ci-runtime-contract.mjs`, and the full Chromium Playwright suite (1323 passed) — the ad/analytics network isolation fixtures still hold, so no real ad or GA traffic was generated.

### Test isolation — no real ad or analytics traffic from a browser test
- The shared `tests/fixtures.ts` block now matches by **hostname label** instead of substring and covers the measurement side too: `google-analytics.com` (including `www.`, `ssl.`, `region1.` …), `analytics.google.com` and `googletagmanager.com` (gtag.js + GTM) join the existing ad hosts, plus `/g/collect`, `/j/collect` and `/adsbygoogle.js` path shapes on any host. Lookalikes (`notgoogletagmanager.com`, `…google-analytics.com.attacker.test`) and proxy hosts that merely mention a GA URL are no longer at risk of a substring match, and no real host is exempted by a custom-host rule. Ad/analytics tags stay in the DOM — the block is network-level only.
- `tests/ad-network-guard.spec.ts` keeps its offline AdSense regression and gains a classification table plus a **fake-collector runtime regression**: a local HTTP collector, `--host-resolver-rules` mapping the GA/GTM hosts onto it, and a harness page inside a blocked context — the collector records zero GA/GTM requests while the same page's ordinary script, image and cross-host proof request do reach it.
- CI already runs the whole `tests/` directory (`npx playwright test --project=chromium`), so the guard is gated with no workflow change. No service worker exists in the site, so context routing has no bypass (documented in `docs/testing-network-isolation.md`).
- Review follow-up hardening (tests only, behaviour unchanged): the collector + browser lifecycle is an injectable helper (`tests/ad-network-collector.ts`), with a regression proving an injected launch failure still closes the collector (port probe returns `ECONNREFUSED`); the host rule strips a trailing dot (`www.google-analytics.com.`), with table cases for dotted lookalikes; and the attempted/blocked equality is polled to event settlement rather than sampled once.

### Fixed
- Union Bank's shared record now uses the current official SMS Banking missed-call option `9152379484` and Customer Care option `1800-2333`, with source-specific review evidence. The old missed-call number is explained without claiming it is discontinued or making it callable. Its main guide now includes primary-account SMS commands/destinations, registration limitations, published SMS charges and safe troubleshooting; no new URLs or ATM-PIN pilot expansion. Unsupported instant/free/24×7 promises were removed from this guide. The offline authenticity audit now loads the evaluated bank registry instead of silently dropping expression-backed provenance; behavioral regressions cover missing, throwing and empty registries. See [source audit](docs/audits/union-bank-balance-guide-2026-11-05.md).
- Bank of India customer care corrected from `1800-220-2299` to the bank's published `1800-220-229` and its website changed to `https://bankofindia.bank.in`; the [official StarToken help page](https://uaibconnect.bankofindia.bank.in/omnineo) confirms the phone number. The earlier missed-call-number provenance and review date remain scoped separately. The browser regression checks the correction on mobile registration, bank, customer-care and net-banking pages.
- All Playwright specs now use `tests/fixtures.ts` to abort ad-network requests before they leave the browser. An offline behavioral regression exercises the actual AdSense loader URL without contacting Google; production ad tags are unchanged.
- `src/pages/atm-pin/[slug].astro` — the header subtitle on the two pilot pages
  read `{bank.nameHindi} — Green PIN ऑनलाइन` unconditionally, claiming an online
  Green PIN channel no pilot source documents (PSB's cited poster documents the
  ATM flow only; OGB calls its portal service "Card Instant PIN
  Re-generation"). A pilot page now renders `{bank.nameHindi} — {guide.channel}`,
  and the other 73 banks keep the previous string. H1, title, meta description
  and schema are unchanged; `tests/atm-pin-pilot-pages.spec.ts` pins the
  rendered subtitle per page.
- `src/pages/article/stock-trader-investment-fraud-complaint-guide-2026.astro` —
  meta-budget violation that failed `tests/technical-seo.spec.ts` on both
  projects (title 67→61 chars, description 196→161). The title contracts
  "Verification" to "Verify"; the description drops "high returns के",
  "registration" and "पूरी". The demand phrase, the SEBI-verification and
  complaint intents, the ₹37.8 lakh figure, the Ahmedabad anchor and the
  allegation-level "मामले" framing all stay, and no article body, route or
  schema claim changed. `tests/technical-seo.spec.ts` gained a verbatim pin
  for this page's title/description and its case evidence.

### Added
- `src/data/atm-pin-guides.ts` — typed, source-cited ATM-PIN procedure guides.
  A record exists only for a bank whose official procedure was actually read:
  `psb` (Punjab & Sind Bank Debit Card Green PIN poster,
  `https://punjabandsind.bank.in/document/Debit_Card_Green_PIN_poster.pdf`) and
  `odisha-grameen` (Odisha Grameen Bank Card Services portal,
  `https://mycards.ogb.bank.in/`, reached from the `My Cards` link on
  `https://odishabank.bank.in/`). Every record carries the official URL, the ISO
  date it was read, the documented prerequisites, the ordered steps, an explicit
  list of what the source does *not* cover, limited troubleshooting, FAQs, and a
  meta description. `getAtmPinGuide(slug)` returns `undefined` for every other
  bank, which is the deterministic fallback.
- `src/components/AtmPinGuide.astro` — renders one pilot guide block: documented
  channel, the bank's own entry point, prerequisites, ordered steps,
  troubleshooting, "what this source does not say", the never-share-your-PIN/OTP
  warning, and a procedure-source citation scoped separately from the
  number-provenance block. No form, no input, no credential or account ask.
- `tests/atm-pin-guides.spec.ts` — data-layer contract (pilot scope, official
  https source + ISO read date, contiguous ordered steps, PSB's nine-step order,
  no unsupported fee/four-channel/easiest-channel claims, undocumented-channel
  statements present, non-pilot banks have no guide).
- `tests/atm-pin-pilot-pages.spec.ts` — rendered-HTML contract for both pilot
  URLs and two non-pilot URLs: preserved URL/canonical/title/H1, pilot-scoped
  meta description, channel-specific ordered steps, visible source link and read
  date, rescoped number-provenance label, never-share warning, zero
  form/input/textarea/select on the page, HowTo and FAQ schema asserting exactly
  what is displayed, non-pilot deterministic fallback, and mobile (390px) single
  heading with no horizontal overflow.

### Changed
- `src/pages/atm-pin/[slug].astro` — pilot pages only. For a bank with a guide
  record the page renders the source-cited procedure instead of the generic
  net-banking-first copy, and takes its meta description, FAQs and HowTo steps
  from that record. The `RecordEvidence` scope label on a pilot page names what
  the record actually covers (the phone numbers) instead of "customer care".
  Every other bank renders the previous template unchanged.

## Known residual (deliberately out of scope for this pilot)

The generic template still applies to the other 73 `/atm-pin/<slug>/` pages and
to the `/atm-pin/` hub. Those pages still carry the unsupported claims this
pilot removes from `psb` and `odisha-grameen`:

- an unconditional "free" fee claim (`Green PIN सेवा मुफ़्त है`,
  `यह सेवा मुफ़्त है`, `PIN generation मुफ़्त है`, and the `/atm-pin/` hub's
  `यह सेवा मुफ़्त है और ऑनलाइन उपलब्ध है`);
- a four-channel list (`Net banking, ATM, SMS या customer care से Green PIN
  generate करें`, `4 तरीके हैं`, `सबसे आसान तरीका net banking है`);
- a net-banking-first five-step menu path and a four-channel
  "other methods" list with no per-bank source;
- a `RecordEvidence` scope label reading `<bank> customer care`.

`indian-bank` is explicitly **not** part of this pilot: the only located Indian
Bank Green PIN document is credit-card-scoped, so no debit-card procedure is
claimed for it. Widening the pilot is a separate, separately approved change.
