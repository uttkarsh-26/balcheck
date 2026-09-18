# Bank number authenticity audit — balcheck.in

- **Audit date:** 2026-09-18  
- **Scope:** all 79 bank records in `src/data/banks.ts` (`missedCall`, `missedCallAlt`, `customerCare`)  
- **Mode:** read-only. No `src/data` change, no rebuild, no deploy, no metadata change to the 9-page CTR cohort (central-bank, mp-gramin, indian-bank, airtel-payments, maharashtra, iob, ippb, gujarat-gramin, jio-payments).  
- **Pipeline:** Phase 0 static (`src/data/banks.ts` + `dist/`), Phase 1 raw-HTML fetch of official pages, Phase 2 headless-browser fetch, Phase 3 search-index cross-check. Raw run data in `/tmp/bc-audit/`.  
- **Re-run:** `node scripts/audit-number-authenticity.mjs` reproduces every Phase 0 number in this report offline from the repo.

## 1. Headline counts

| Metric | Value |
| --- | --- |
| Bank records audited | 79 |
| Final verdict CONFIRMED_OFFICIAL | 41 |
| Final verdict AGGREGATOR_ONLY | 13 |
| Final verdict SITE_BLOCKED | 11 |
| Final verdict NO_SUPPORT | 14 |
| Tier-1 (raw fetch) verdicts | CONFIRMED 20 / PARTIAL 11 / NO_MATCH 48 |
| Tier-2 (browser) verdicts | CONFIRMED 4 / PARTIAL 11 / NO_MATCH 44 |
| Tier-3 (search index) verdicts | AGGREGATOR_ONLY 16 / OFFICIAL_INDEX_HIT 7 / OFFICIAL_INDEX_HIT_CARE_ONLY 5 / WEAK_AGGREGATOR_ONLY 5 / NOT_INDEXED 2 (35 records) |
| Colliding `missedCall` values | 3 values / 8 records |
| Colliding `customerCare` values | 3 values / 9 records |
| Colliding `missedCallAlt` values | 0 |
| Cross-field collisions (A.missedCall == B.customerCare) | 0 |
| `missedCall` == `customerCare` (same record) | 17 |
| Flag `no-provenance` (verified, no verificationSource) | 57 |
| Flag `notes-only-source` | 21 |
| Flag `dead-website` (NXDOMAIN legacy host) | 5 |
| Flag `merged-legacy` | 2 |
| Legacy website host redirecting to a `*.bank.in` host | 36 |
| `dist/` HTML pages | 893 |
| Canonical stored numbers (missedCall + alt + customerCare) | 138 |
| Rendered numbers not in `banks.ts` (manual-review shortlist) | 24 (offline check) / 25 (phase2b tokenizer) |
| `/bank/` pages not displaying their own `missedCall` | 0 |

**Verdict definitions (applied per record, deterministic from the raw tier data):**

- **CONFIRMED_OFFICIAL** — at least one field of the record appears on a page served by the bank's own host set (the website host plus any host the record's own crawl actually landed on after a redirect). Evidence is the exact page URL.
- **AGGREGATOR_ONLY** — no official on-page or official-index hit, but at least one third-party/aggregator host carries the value. Evidence lists the hosts.
- **SITE_BLOCKED** — automation could not read any page of the record's site (DNS failure, TLS failure, timeout, or every response non-200: 403/404/468). The record's numbers remain unverified on-page regardless of what third parties say.
- **NO_SUPPORT** — the site was reachable but no page carried the number, no official index hit was captured, and no third-party host was captured.

Evidence URLs are taken verbatim from `phase1.jsonl`, `browser.jsonl`, `tier3.jsonl` and `suspicion_search.json`. Where a field has no official evidence the row states the honest tier instead of a number.

## 2. Per-bank verdict table (79 records)

Digits are shown normalized (non-digits stripped) so `09223766666` and `1800-11-2211` are directly comparable.

| slug | missedCall | customerCare | final verdict | evidence |
| --- | --- | --- | --- | --- |
| andhra-pradesh-grameena | 9090290912 | 18004256708 | CONFIRMED_OFFICIAL | missedCall -> https://apgb.bank.in/ ; missedCallAlt -> https://apgb.bank.in/ |
| assam-gramin | 18002023006 | 18002023006 | CONFIRMED_OFFICIAL | missedCall -> https://agvb.bank.in/sub-content/banking-product/digital-and-online-banking/missed-call-banking ; customerCare -> https://agvb.bank.in/sub-content/banking-product/digital-and-online-banking/missed-call-banking |
| au-sfb | 18001212586 | 180012001200 | CONFIRMED_OFFICIAL | missedCall -> https://www.au.bank.in/personal-banking/digital-banking/au-0101/au-0101-netbanking ; customerCare -> https://www.au.bank.in/personal-banking/digital-banking/au-0101/au-0101-netbanking |
| axis | 18004195959 | 18002095577 | CONFIRMED_OFFICIAL | customerCare -> https://www.axis.bank.in |
| bandhan | 9223008666 | 18002588181 | CONFIRMED_OFFICIAL | customerCare -> https://www.bandhan.bank.in/ |
| bihar-gramin | 18001807777 | 18001807777 | CONFIRMED_OFFICIAL | missedCall -> https://bgb.bank.in/ ; customerCare -> https://bgb.bank.in/ |
| bob | 9966066511 | 18002584435 | CONFIRMED_OFFICIAL | missedCall -> https://bankofbaroda.bank.in/digital-products/other-digital-services/phone-banking/missed-call-service ; missedCallAlt -> https://bankofbaroda.bank.in/contact-us |
| canara | 8886610360 | 180010301800 | CONFIRMED_OFFICIAL | missedCall -> https://www.canarabank.bank.in/pages/missed-call-banking ; customerCare -> https://www.canarabank.bank.in/ |
| capital-sfb | 18001201600 | 18001201600 | CONFIRMED_OFFICIAL | missedCall -> https://www.capital.bank.in/ ; customerCare -> https://www.capital.bank.in/ |
| chhattisgarh-rajya | 9289221579 | 18002332300 | CONFIRMED_OFFICIAL | missedCall -> https://cgb.bank.in/ ; customerCare -> https://cgb.bank.in/ |
| dcb | 7506660011 | 18002099830 | CONFIRMED_OFFICIAL | missedCall -> https://www.dcb.bank.in/ways-to-bank/dcb-missed-call-facility |
| dhanlaxmi | 08067747700 | 18004251747 | CONFIRMED_OFFICIAL | missedCall -> https://www.dhan.bank.in/customer-care/ ; customerCare -> https://www.dhan.bank.in/grievance-redressal/ |
| federal | 8431900900 | 18004201199 | CONFIRMED_OFFICIAL | missedCall -> https://www.federal.bank.in/missed-call-balance-enquiry ; customerCare -> https://www.federal.bank.in/ |
| gujarat-gramin | 7829977711 | 07968271260 | CONFIRMED_OFFICIAL | customerCare -> https://www.ggb.bank.in/ |
| haryana-gramin | 18002023002 | 18001807777 | CONFIRMED_OFFICIAL | customerCare -> https://hgb.bank.in/ |
| himachal-pradesh-gramin | 18001807777 | 18001807777 | CONFIRMED_OFFICIAL | missedCall -> https://www.hpgb.bank.in/ ; customerCare -> https://www.hpgb.bank.in/ |
| icici | 9594612612 | 18001080 | CONFIRMED_OFFICIAL | missedCall -> https://www.icici.bank.in/personal-banking/ways-to-bank/mobile-banking/sms-banking ; customerCare -> https://www.icici.bank.in/ |
| idfc-first | 18002700720 | 18001088222 | CONFIRMED_OFFICIAL | missedCall -> https://www.idfcfirst.bank.in/finfirst-blogs/savings-account/different-ways-to-check-bank-balance ; customerCare -> https://www.idfcfirst.bank.in/finfirst-blogs/savings-account/different-ways-to-check-bank-balance |
| indian-bank | 7827170170 | 180042500000 | CONFIRMED_OFFICIAL | missedCall -> https://indianbank.bank.in/en/ |
| indusind | 18002741000 | 18002741000 | CONFIRMED_OFFICIAL | missedCall -> https://www.indusind.bank.in/in/en/personal/mobile-banking-services/missed-call-banking.html ; customerCare -> https://www.indusind.bank.in/in/en/personal/mobile-banking-services/missed-call-banking.html |
| iob | 9210622122 | 18004254445 | CONFIRMED_OFFICIAL | customerCare -> https://www.iob.bank.in/en/ |
| jharkhand-gramin | 18005327444 | 18005327444 | CONFIRMED_OFFICIAL | missedCall -> https://jrgbank.bank.in/complaint_form ; customerCare -> https://jrgbank.bank.in/complaint_form |
| jk-bank | 18001800234 | 18001800236 | CONFIRMED_OFFICIAL | customerCare -> https://jkb.bank.in/ |
| karnataka-grameena | 9015800700 | 18001025250 | CONFIRMED_OFFICIAL | missedCall -> https://karnatakagb.bank.in/ebanking-services/balance-enquiry ; customerCare -> https://karnatakagb.bank.in/ |
| kerala-grameena | 9015800400 | 18004254000 | CONFIRMED_OFFICIAL | missedCall -> https://kgb.bank.in/services/missed-call-balance ; customerCare -> https://kgb.bank.in/ |
| maharashtra-gramin | 9549224443 | 9549224443 | CONFIRMED_OFFICIAL | missedCall -> https://www.mahagramin.bank.in/ ; customerCare -> https://www.mahagramin.bank.in/ |
| mp-gramin | 8010968293 | 8010968293 | CONFIRMED_OFFICIAL | missedCall -> https://mpgb.bank.in/ ; customerCare -> https://mpgb.bank.in/ |
| nainital | 18001804031 | 18003454500 | CONFIRMED_OFFICIAL | missedCall -> https://www.nainitalbank.bank.in/english/home.aspx |
| ne-sfb | 18001211905 | 18003139797 | CONFIRMED_OFFICIAL | missedCall -> https://slice.bank.in/ |
| odisha-grameen | 8010106686 | 03369026902 | CONFIRMED_OFFICIAL | missedCall -> https://odishabank.bank.in/erstwhile-ogb-missed-call-alert-services |
| pnb | 9264092640 | 18001802223 | CONFIRMED_OFFICIAL | missedCall -> https://pnb.bank.in/ ; customerCare -> https://pnb.bank.in/ |
| psb | 7039035156 | 18004198300 | CONFIRMED_OFFICIAL | missedCall -> https://punjabandsind.bank.in/ ; customerCare -> https://punjabandsind.bank.in/ |
| puduvai-bharathiar | 9289592895 | 04132227851 | CONFIRMED_OFFICIAL | customerCare -> https://pygb.bank.in/contact-us |
| rajasthan-gramin | 8750187504 | 18005327444 | CONFIRMED_OFFICIAL | missedCall -> https://rgb.bank.in/ ; customerCare -> https://rgb.bank.in/ |
| sib | 09223008488 | 18001029405 | CONFIRMED_OFFICIAL | missedCall -> https://www.southindianbank.bank.in/personal/other-services/sib-missed-call-service |
| telangana-grameena | 09278031313 | 9997779901 | CONFIRMED_OFFICIAL | missedCall -> https://tgb.bank.in/digital-banking/missed-call-alert ; customerCare -> https://tgb.bank.in/ |
| ubi | 09223008586 | 18002082244 | CONFIRMED_OFFICIAL | customerCare -> https://www.unionbankofindia.bank.in/en/common/contact-us |
| ujjivan | 9243232121 | 18002088877 | CONFIRMED_OFFICIAL | customerCare -> https://www.ujjivansfb.bank.in/ |
| up-gramin | 9986454440 | 18001800225 | CONFIRMED_OFFICIAL | missedCall -> https://upgb.bank.in/ ; customerCare -> https://upgb.bank.in/ |
| utkarsh-sfb | 18001239878 | 18001239878 | CONFIRMED_OFFICIAL | missedCall -> https://www.utkarsh.bank.in/ ; customerCare -> https://www.utkarsh.bank.in/ |
| uttarakhand-gramin | 9212005002 | 18005327444 | CONFIRMED_OFFICIAL | missedCall -> https://ukgb.bank.in/services/missed-call-alerts ; customerCare -> https://ukgb.bank.in/contact |
| central-bank | 9555244442 | 18002001911 | AGGREGATOR_ONLY | 3 third-party sources: bankbazaar.com, codeforbanks.com, paisabazaar.com |
| csb | 8828800900 | 18002669036 | AGGREGATOR_ONLY | 3 third-party sources: bankbazaar.com, codeforbanks.com, policybazaar.com |
| cub | 09278177444 | 04471225300 | AGGREGATOR_ONLY | 2 third-party sources: bankbazaar.com, upstox.com |
| hdfc | 18002703333 | 18002026161 | AGGREGATOR_ONLY | 3 third-party sources: bankbazaar.com, moneyview.in, paisabazaar.com |
| idbi | 18008431122 | 18002094321 | AGGREGATOR_ONLY | 2 third-party sources: bankbazaar.com, paisabazaar.com |
| jana | 18002105656 | 18002105656 | AGGREGATOR_ONLY | 1 third-party sources: bankbazaar.com |
| karnataka-bank | 18004251445 | 18004251445 | AGGREGATOR_ONLY | 1 third-party sources: moneyview.in |
| kotak | 18002740110 | 18602662666 | AGGREGATOR_ONLY | 2 third-party sources: codeforbanks.com, youtube.com |
| rbl | 18004190610 | 18004190610 | AGGREGATOR_ONLY | 3 third-party sources: paisabazaar.com, upstox.com, wishfin.com |
| sbi | 09223766666 | 1800112211 | AGGREGATOR_ONLY | 5 third-party sources: bankbazaar.com, cleartax.in, moneyview.in, paisabazaar.com |
| tmb | 09211937373 | 18004254426 | AGGREGATOR_ONLY | 3 third-party sources: bankbazaar.com, paisabazaar.com, policybazaar.com |
| uco-bank | 8334001234 | 18001030123 | AGGREGATOR_ONLY | 4 third-party sources: bankbazaar.com, paisabazaar.com, policybazaar.com, upstox.com |
| yes-bank | 9223920000 | 18001200 | AGGREGATOR_ONLY | 3 third-party sources: bankbazaar.com, codeforbanks.com, youtube.com |
| baroda-rajasthan | 8880094411 | 18001604445 | SITE_BLOCKED | site unreachable to automation (ConnectTimeout: HTTPSConnectionPool(host='brkgb.com', p) |
| baroda-up-gramin | 9986454440 | 18001807700 | SITE_BLOCKED | site unreachable to automation (ConnectionError: HTTPSConnectionPool(host='www.barodaup) |
| boi | 9811255430 | 18002202299 | SITE_BLOCKED | site unreachable to automation (non-200 responses) ; third-party: bankbazaar.com, biznext.in, moneyview.in |
| esaf | 8592866639 | 18003031201 | SITE_BLOCKED | site unreachable to automation (non-200 responses) ; third-party: paisabazaar.com |
| fincare | 18001201200 | 18003099001 | SITE_BLOCKED | site unreachable to automation (ConnectionError: HTTPSConnectionPool(host='www.fincareb) ; third-party: bankbazaar.com |
| jio-payments | 18008907070 | 18008891000 | SITE_BLOCKED | site unreachable to automation (ConnectTimeout: HTTPSConnectionPool(host='www.jiopaymen) |
| kvb | 09266292666 | 18602001913 | SITE_BLOCKED | site unreachable to automation (ConnectionError: HTTPSConnectionPool(host='www.kvb.co.i) ; third-party: codeforbanks.com, youtube.com |
| maharashtra | 9833335555 | 18002334526 | SITE_BLOCKED | site unreachable to automation (ConnectionError: HTTPSConnectionPool(host='www.bankofma) ; third-party: bankingunfold.com |
| pragathi-krishna | 9015800700 | 08392236444 | SITE_BLOCKED | site unreachable to automation (ConnectionError: HTTPSConnectionPool(host='pragathikris) |
| punjab-gramin | 18001807777 | 18001807777 | SITE_BLOCKED | site unreachable to automation (non-200 responses) |
| suryoday | 18002667711 | 18002666611 | SITE_BLOCKED | site unreachable to automation (SSLError: HTTPSConnectionPool(host='www.suryodaybank.co) ; third-party: bankbazaar.com, codeforbanks.com, paisabazaar.com |
| airtel-payments | 8800688006 | 18001034400 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| apgb | 9289222024 | 18001236235 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| arunachal-pradesh-rural | 180030000620 | 03602230051 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| cosmos | 9029013793 | 18002333583 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| dbs | 18002094555 | 18004193401 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| deutsche | 18001236601 | 18001024532 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| equitas | 18003031500 | 18003031500 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| hsbc | 18001088222 | 18001088222 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| ippb | 7799022509 | 18004258900 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| kvgb | 09278700859 | 18004251100 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| mizoram-rural | 9289902970 | 03892333024 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| saraswat | 9022211100 | 18002586161 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| standard-chartered | 18001220040 | 18001220040 | NO_SUPPORT | no on-page, index or third-party evidence captured |
| tamil-nadu-grama | 9289202222 | 9289202222 | NO_SUPPORT | no on-page, index or third-party evidence captured |

Evidence column legend: `CONFIRMED_OFFICIAL` rows give the official page URL that carries the field; `SITE_BLOCKED` rows give the observed failure plus any third-party support; `AGGREGATOR_ONLY` rows count the third-party hosts.

### 2.1 Field-level coverage inside CONFIRMED_OFFICIAL

- Both `missedCall` and `customerCare` confirmed on an official page: 26 — `andhra-pradesh-grameena`, `assam-gramin`, `au-sfb`, `bihar-gramin`, `bob`, `canara`, `capital-sfb`, `chhattisgarh-rajya`, `dhanlaxmi`, `federal`, `himachal-pradesh-gramin`, `icici`, `idfc-first`, `indusind`, `jharkhand-gramin`, `karnataka-grameena`, `kerala-grameena`, `maharashtra-gramin`, `mp-gramin`, `pnb`, `psb`, `rajasthan-gramin`, `telangana-grameena`, `up-gramin`, `utkarsh-sfb`, `uttarakhand-gramin`
- Only `customerCare` confirmed on an official page: 9 — `axis`, `bandhan`, `gujarat-gramin`, `haryana-gramin`, `iob`, `jk-bank`, `puduvai-bharathiar`, `ubi`, `ujjivan`
- Only `missedCall` confirmed on an official page: 6 — `dcb`, `indian-bank`, `nainital`, `ne-sfb`, `odisha-grameen`, `sib`

### 2.2 Format outliers found by the offline check

Every field matches a known Indian number shape (no unrecognized value anywhere in the file), but seven field values sit outside the canonical shape and should be re-read on the bank page rather than trusted as stored — six `customerCare` values and one `missedCall`:

| slug | field | value | digits | observed shape |
| --- | --- | --- | --- | --- |
| arunachal-pradesh-rural | `1800-300-00620` | 180030000620 | tollfree-1800, non-canonical length |
| au-sfb | `1800-1200-1200` | 180012001200 | tollfree-1800, non-canonical length |
| canara | `1800-1030-1800` | 180010301800 | tollfree-1800, non-canonical length |
| icici | `1800-1080` | 18001080 | tollfree-1800, non-canonical length |
| indian-bank | `1800-4250-0000` | 180042500000 | tollfree-1800, non-canonical length |
| sbi | `1800-11-2211` | 1800112211 | tollfree-1800, non-canonical length |
| yes-bank | `1800-1200` | 18001200 | tollfree-1800, non-canonical length |

The 8-digit values (`icici` `1800-1080`, `yes-bank` `1800-1200`) are short toll-free lines rather than malformed input, but they are the only `1800` values in the file with fewer than 10 digits. The 10/12-digit `1800` values (`sbi` `1800-11-2211`, `canara` `1800-1030-1800`, `indian-bank` `1800-4250-0000`, `au-sfb` `1800-1200-1200`, `arunachal-pradesh-rural` `1800-300-00620`) are legitimate toll-free formats, just not the `1800-XXX-XXXX` shape the rest of the file uses. The five STD landlines (`cub`, `odisha-grameen`, `puduvai-bharathiar`, `arunachal-pradesh-rural`, `mizoram-rural`) are the `customerCare` field's only regional landlines, which is why they look anomalous next to the toll-free majority.

## 3. Collision clusters

Values are digit-normalized. Every collision below is a real shared string in `banks.ts`, not a formatting artifact.

### 3.1 `18001088222` — idfc-first + hsbc (unresolved duplicate, highest risk)

- `idfc-first` — IDFC FIRST Bank | missedCall `18002700720` | customerCare `1800-108-8222` | verdict **CONFIRMED_OFFICIAL**
  - missedCall evidence: <https://www.idfcfirst.bank.in/finfirst-blogs/savings-account/different-ways-to-check-bank-balance>
  - customerCare evidence: <https://www.idfcfirst.bank.in/finfirst-blogs/savings-account/different-ways-to-check-bank-balance>
  - third-party hosts: bankbazaar.com, codeforbanks.com
  - banks.ts verificationSource: https://www.idfcfirst.bank.in/customer-care-sr/account-balance-enquiry (official .bank.in page) + gadgets360.com + codeforbanks.com + cleartax.in (18002700720 confirmed, 2026-07-20)

- `hsbc` — HSBC India | missedCall `18001088222` | customerCare `1800-108-8222` | verdict **NO_SUPPORT**
  - notes: HSBC India does not offer a missed-call balance service; contact PhoneBanking: 1800-108-8222 / 1800-266-3456 (Source: hsbc.co.in/help/contact).

**Resolution state from the data:** `18001088222` is stored as `customerCare` on **both** records (`idfc-first` `1800-108-8222`, `hsbc` `1800-108-8222`) and additionally as `missedCall` on `hsbc` alone. `tier3.jsonl` page-verifies it on IDFC First's own host (`https://www.idfcfirst.bank.in/finfirst-blogs/savings-account/different-ways-to-check-bank-balance`, status 200, hit field `missedCall`). HSBC has **no tier-3 record** (its homepage failed the Phase-1/Phase-2 regex crawl with `NO_MATCH`), so the HSBC side rests on the search index: `suspicion_search.json` query `"18001088222" HSBC India customer care` returns `hsbc.bank.in` at `https://www.hsbc.bank.in/help/feedback-and-complaints/grievance-redressal-mechanism/non-demat-accounts/`. That page URL was never fetched by any tier, so the HSBC claim is **index-only, not page-verified** — and the same cluster also surfaces only aggregators (tollfreenumbers4u.com, policybazaar.com, investkraft.com, bankbazaar.com).

**Live re-verification 2026-09-18 (headless browser, after the tier runs):** direct fetches of both current official pages contradict the stale evidence above.

- `https://www.hsbc.bank.in/help/contact/` (live, 7,347 chars rendered): HSBC's current phone-banking lines are `1800 266 3456` (Premier), `1800 267 3456` (personal banking and credit cards), `1800 120 4722`, `1800 121 2208/2209`, `1800 209 0100`. **`1800 108 8222` is absent.** The grievance page indexed by the search (`.../non-demat-accounts/`) also does not carry it (curl + rendered text both checked).
- `https://www.idfcfirst.bank.in/customer-care` (live): Customer Care is listed as **`1800 10 888`** (24x7) — an 8-digit toll-free, i.e. `1800108888`, NOT `18001088222`. The blog page that tier-3 page-inspected (`/finfirst-blogs/.../different-ways-to-check-bank-balance`) renders today with only `1800 2700 720` (missed call, correct per banks.ts) and `9555 555 555` — its 8222 hit is not reproducible on the live page.

Conclusion updated: `18001088222` is **not verifiable on either bank's live official pages**. The `idfc-first` `customerCare` field (`1800-108-8222`) is very likely a digit-corruption of IDFC's real line `1800 10 888` (1800108888), and the `hsbc` record's notes cite an older `hsbc.co.in/help/contact` line-up that has since changed. Do not delete either record: both banks' correct current numbers are now documented and the fix is a value correction (FIX-P3-1/FIX-P3-2 territory), applied only with the evidence URLs above.

### 3.2 `9015800700` — pragathi-krishna + karnataka-grameena

- `pragathi-krishna` — Pragathi Krishna Gramin Bank | missedCall `9015800700` | customerCare `08392-236444` | verdict **SITE_BLOCKED**
  - fetch failure: `ConnectionError: HTTPSConnectionPool(host='pragathikrishnabank.com', port=443): Max retries exceeded with url: / (Caused by NameResolutio`

- `karnataka-grameena` — Karnataka Grameena Bank | missedCall `9015800700` | customerCare `18001025250` | verdict **CONFIRMED_OFFICIAL**
  - missedCall evidence: <https://karnatakagb.bank.in/ebanking-services/balance-enquiry>
  - customerCare evidence: <https://karnatakagb.bank.in/>

**Resolution state from the data:** the number is confirmed on Karnataka Gramin Bank's own host — Phase 1 matched it on `https://karnatakagb.bank.in/ebanking-services/balance-enquiry`, and the `"9015800700" Karnataka Gramin Bank missed call` search returns the same official page first. `pragathi-krishna` has a dead legacy host (`pragathikrishnabank.com` → `NXDOMAIN`) and zero official evidence in any tier; the collision search shows pragathi-krishna only via aggregator blogs (`loansjagat.com`, `plutomoney.in`). The honest reading: the live official holder is Karnataka Gramin Bank; the pragathi-krishna record is a legacy entity that inherited the number through merger.

### 3.3 `9986454440` — baroda-up-gramin + up-gramin

- `up-gramin` — Uttar Pradesh Gramin Bank | missedCall `9986454440` | customerCare `1800-180-0225` | verdict **CONFIRMED_OFFICIAL**
  - missedCall evidence: <https://upgb.bank.in/>
  - customerCare evidence: <https://upgb.bank.in/>

- `baroda-up-gramin` — Baroda UP Gramin Bank | missedCall `9986454440` | customerCare `1800-180-7700` | verdict **SITE_BLOCKED**
  - fetch failure: `ConnectionError: HTTPSConnectionPool(host='www.barodaupbank.in', port=443): Max retries exceeded with url: / (Caused by NameResolutionErr`
  - notes: Official site barodaupbank.in DNS resolution failed from server. Number confirmed by 3+ aggregators. Needs manual re-verification when site is accessible.
  - banks.ts verificationSource: barodaupbank.in (official site DNS-inaccessible from server; number 9986454440 confirmed by codeforbanks.com + easemoney.in + banksforyou.com, 2026-07-20)

**Resolution state from the data:** `up-gramin` is confirmed on its own host (`https://upgb.bank.in/`, fields `missedCall` + `customerCare`, Phase 1 `match=text`). `baroda-up-gramin` has a dead host (`barodaupbank.in` → `NXDOMAIN`) and is flagged `merged-legacy`: `mergers.json` records 2020-04-01 (Baroda UP Gramin + Purvanchal + Kashi Gomti → Baroda U.P. Bank) and 2025-05-01 (→ Uttar Pradesh Gramin Bank, gazette S.O. 1634(E)). Distinct slugs are correct for redirect/search-intent coverage, but the number should be read as the successor's number.

### 3.4 `18001807777` — shared by 4 RRB records

- `punjab-gramin` — Punjab Gramin Bank | missedCall `18001807777` | customerCare `1800-180-7777` | verdict **SITE_BLOCKED**
  - notes: Official pgb.bank.in returns 468 (bot protection). codeforbanks.com states 'no missed call facility, dial toll-free 18001807777'. indiacustomercare.com lists 1800-202-3005 as missed-call number. balanceMode derives to customer-care (same digits for both fields); snippets must not claim missed-call or आधिकारिक until the official site is readable.
  - banks.ts verificationSource: pgb.bank.in/customer-care (official, bot-blocked 468) + loansjagat.com + codeforbanks.com + wealthquint.com + indmoney.com (18001807777 confirmed by 4 aggregators, 2026-07-20)

- `himachal-pradesh-gramin` — Himachal Pradesh Gramin Bank | missedCall `1800-180-7777` | customerCare `1800-180-7777` | verdict **CONFIRMED_OFFICIAL**
  - missedCall evidence: <https://www.hpgb.bank.in/>
  - customerCare evidence: <https://www.hpgb.bank.in/>
  - notes: Customer care confirmed; no dedicated missed-call number published

- `bihar-gramin` — Bihar Gramin Bank | missedCall `1800-180-7777` | customerCare `1800-180-7777` | verdict **CONFIRMED_OFFICIAL**
  - missedCall evidence: <https://bgb.bank.in/>
  - customerCare evidence: <https://bgb.bank.in/>
  - notes: Toll-free number used for both balance enquiry and customer care
  - banks.ts verificationSource: bgb.bank.in/welcome/contact (official; 'TOLL FREE NO 18001807777' on the contact page, 2026-09-14) + indiacustomercare.com

- `haryana-gramin` — Sarva Haryana Gramin Bank | missedCall `1800-202-3002` | customerCare `1800-180-7777` | verdict **CONFIRMED_OFFICIAL**
  - customerCare evidence: <https://hgb.bank.in/>

**Resolution state from the data:** three records store it in **both** `missedCall` and `customerCare` (punjab-gramin, himachal-pradesh-gramin, bihar-gramin) and haryana-gramin stores it as `customerCare` only. The `"18001807777" Punjab Gramin Bank toll free` search corroborates the number for the Punjab/RRB family via `helpbix.com`, `onedios.com`, `codeforbanks.com`, `banksforyou.com` — third-party only. `baroda-up-gramin`'s `customerCare` `1800-180-7700` sits in the same `1800-180-77xx` block, which is consistent with a shared sponsor-line family across these north-India RRBs. The data cannot separate "shared toll-free care line" from "copy-paste error" per record, but it does show all four records pointing at one number.

### 3.5 `18005327444` — shared by 3 RRB records

- `jharkhand-gramin` — Jharkhand Gramin Bank | missedCall `18005327444` | customerCare `18005327444` | verdict **CONFIRMED_OFFICIAL**
  - missedCall evidence: <https://jrgbank.bank.in/complaint_form>
  - customerCare evidence: <https://jrgbank.bank.in/complaint_form>
  - notes: Customer care confirmed; missed-call service not officially published separately

- `uttarakhand-gramin` — Uttarakhand Gramin Bank | missedCall `9212005002` | customerCare `1800-532-7444` | verdict **CONFIRMED_OFFICIAL**
  - missedCall evidence: <https://ukgb.bank.in/services/missed-call-alerts>
  - customerCare evidence: <https://ukgb.bank.in/contact>

- `rajasthan-gramin` — Rajasthan Gramin Bank | missedCall `8750187504` | customerCare `18005327444` | verdict **CONFIRMED_OFFICIAL**
  - missedCall evidence: <https://rgb.bank.in/>
  - customerCare evidence: <https://rgb.bank.in/>

**Resolution state from the data:** the `"18005327444" Jharkhand Rajya Gramin Bank` search returns `codeforbanks.com`, `bankingstuffs.com`, `helpbix.com`, `jugaruinfo.com`, `jharyojana.com` — all third-party. `jharkhand-gramin` additionally has official on-page evidence for this number (`https://jrgbank.bank.in/complaint_form`, Phase 1 `match=text`, stored for both fields), so at minimum the Jharkhand attribution is page-backed; the uttarakhand-gramin / rajasthan-gramin attributions are not.

### 3.6 Sponsor-line family `1800-180-7777` / `1800-180-77xx`

The `1800-180-7777` value and its `1800-180-77xx` neighbour form a single family across the RRB records:

| slug | field | value | verdict |
| --- | --- | --- | --- |
| punjab-gramin | missedCall / customerCare | 18001807777 / 1800-180-7777 | SITE_BLOCKED |
| himachal-pradesh-gramin | missedCall / customerCare | 1800-180-7777 / 1800-180-7777 | CONFIRMED_OFFICIAL |
| bihar-gramin | missedCall / customerCare | 1800-180-7777 / 1800-180-7777 | CONFIRMED_OFFICIAL |
| haryana-gramin | missedCall / customerCare | 1800-202-3002 / 1800-180-7777 | CONFIRMED_OFFICIAL |
| baroda-up-gramin | missedCall / customerCare | 9986454440 / 1800-180-7700 | SITE_BLOCKED |

Observation from the data: phones on a toll-free line cannot register a missed call, so a toll-free value stored in `missedCall` for an RRB is a modelling hazard, not a verified missed-call facility. Three of the five records in this family (`himachal-pradesh-gramin`, `bihar-gramin`, `haryana-gramin`) are confirmed on-page by Phase 1/2 crawls of the bank's own `.bank.in` host; `punjab-gramin` is bot-blocked (HTTP 468) and `baroda-up-gramin` is dead, so their rows rest on third-party evidence only.

## 4. `missedCall` == `customerCare`: the 17 records, classified

`src/data/banks.ts` derives `balanceMode` as `customer-care` when the two strings normalize to the same digits and no explicit mode is set. The 16 records whose stored mode is `customer-care` are therefore **legitimate by construction**; the 1 record whose stored mode contradicts the rule is a **data error**.

| slug | value | stored balanceMode | classification | verdict |
| --- | --- | --- | --- | --- |
| assam-gramin | 18002023006 | customer-care | legit (customer-care-only line) | CONFIRMED_OFFICIAL |
| bihar-gramin | 18001807777 | customer-care | legit (customer-care-only line) | CONFIRMED_OFFICIAL |
| capital-sfb | 18001201600 | customer-care | legit (customer-care-only line) | CONFIRMED_OFFICIAL |
| equitas | 18003031500 | customer-care | legit (customer-care-only line) | NO_SUPPORT |
| himachal-pradesh-gramin | 18001807777 | customer-care | legit (customer-care-only line) | CONFIRMED_OFFICIAL |
| hsbc | 18001088222 | customer-care | legit (customer-care-only line) | NO_SUPPORT |
| indusind | 18002741000 | customer-care | legit (customer-care-only line) | CONFIRMED_OFFICIAL |
| jana | 18002105656 | customer-care | legit (customer-care-only line) | AGGREGATOR_ONLY |
| jharkhand-gramin | 18005327444 | customer-care | legit (customer-care-only line) | CONFIRMED_OFFICIAL |
| karnataka-bank | 18004251445 | customer-care | legit (customer-care-only line) | AGGREGATOR_ONLY |
| maharashtra-gramin | 9549224443 | customer-care | legit (customer-care-only line) | CONFIRMED_OFFICIAL |
| mp-gramin | 8010968293 | missed-call | ERROR (mode says missed-call, fields are identical) | CONFIRMED_OFFICIAL |
| punjab-gramin | 18001807777 | customer-care | legit (customer-care-only line) | SITE_BLOCKED |
| rbl | 18004190610 | customer-care | legit (customer-care-only line) | AGGREGATOR_ONLY |
| standard-chartered | 18001220040 | customer-care | legit (customer-care-only line) | NO_SUPPORT |
| tamil-nadu-grama | 9289202222 | customer-care | legit (customer-care-only line) | NO_SUPPORT |
| utkarsh-sfb | 18001239878 | customer-care | legit (customer-care-only line) | CONFIRMED_OFFICIAL |

Toll-free vs mobile split inside the set: 14 values are `1800…` toll-free (a missed call cannot be registered on these) and 3 are 10-digit mobile numbers (`maharashtra-gramin` 9549224443, `mp-gramin` 8010968293, `tamil-nadu-grama` 9289202222).

Records whose stored mode contradicts the derivation rule: `mp-gramin` (`balanceMode: missed-call`, missedCall == customerCare == 8010968293).

## 5. Provenance gap: the 57 no-provenance records

All 79 records carry `verified: true`, but only 22 carry a `verificationSource` and only 22 carry `lastVerified` (57 verified records have neither). `lastVerified` values in the file are `2026-07-20` (19), `2026-08-08` (1), `2026-08-04` (1), `2026-09-14` (1), missing (57).

The 57 records with `verified: true` and no source:

`andhra-pradesh-grameena`, `apgb`, `arunachal-pradesh-rural`, `assam-gramin`, `au-sfb`, `bob`, `capital-sfb`, `central-bank`, `chhattisgarh-rajya`, `csb`, `cub`, `dbs`, `dcb`, `deutsche`, `dhanlaxmi`, `equitas`, `esaf`, `federal`, `fincare`, `gujarat-gramin`, `haryana-gramin`, `hdfc`, `himachal-pradesh-gramin`, `hsbc`, `idbi`, `indian-bank`, `iob`, `ippb`, `jana`, `jharkhand-gramin`, `jio-payments`, `jk-bank`, `karnataka-bank`, `karnataka-grameena`, `kerala-grameena`, `kotak`, `kvgb`, `maharashtra-gramin`, `mizoram-rural`, `nainital`, `ne-sfb`, `odisha-grameen`, `pragathi-krishna`, `puduvai-bharathiar`, `rajasthan-gramin`, `saraswat`, `sib`, `standard-chartered`, `suryoday`, `tamil-nadu-grama`, `telangana-grameena`, `tmb`, `ubi`, `uco-bank`, `ujjivan`, `up-gramin`, `uttarakhand-gramin`

Of those, 21 have a `notes` string that contains supporting prose (flag `notes-only-source`) — the number is traceable to a human note, not to a field a test can read:

`au-sfb`, `capital-sfb`, `csb`, `deutsche`, `equitas`, `esaf`, `fincare`, `himachal-pradesh-gramin`, `hsbc`, `iob`, `ippb`, `jana`, `jharkhand-gramin`, `jio-payments`, `jk-bank`, `ne-sfb`, `saraswat`, `standard-chartered`, `suryoday`, `tmb`, `ujjivan`

## 6. Dead / redirected legacy websites and the `*.bank.in` migration

### 6.1 Dead legacy hosts (flag `dead-website`)

- `maharashtra` — Bank of Maharashtra | missedCall `9833335555` | customerCare `1800-233-4526` | verdict **SITE_BLOCKED**
  - third-party hosts: bankingunfold.com
  - fetch failure: `ConnectionError: HTTPSConnectionPool(host='www.bankofmaharashtra.in', port=443): Max retries exceeded with url: / (Caused by NameResoluti`
  - notes: Official site migrated to bankofmaharashtra.bank.in. Old domain bankofmaharashtra.in still resolves. Mini statement: 7287888886 (per official contact-us page).
  - banks.ts verificationSource: https://bankofmaharashtra.bank.in/contact-us (official .bank.in page, 'Balance Enquiry: 98333 35555' confirmed, 2026-07-20)

- `kvb` — Karur Vysya Bank | missedCall `09266292666` | customerCare `1860-200-1913` | verdict **SITE_BLOCKED**
  - third-party hosts: codeforbanks.com, youtube.com
  - fetch failure: `ConnectionError: HTTPSConnectionPool(host='www.kvb.co.in', port=443): Max retries exceeded with url: / (Caused by NameResolutionError("HT`
  - banks.ts verificationSource: https://www.kvb.bank.in/ways-to-bank/missed-call-banking/ (official .bank.in page, 9266292666 + 9266292665 confirmed, 2026-07-20)

- `fincare` — Fincare Small Finance Bank | missedCall `18001201200` | customerCare `1800-309-9001` | verdict **SITE_BLOCKED**
  - third-party hosts: bankbazaar.com
  - fetch failure: `ConnectionError: HTTPSConnectionPool(host='www.fincarebank.com', port=443): Max retries exceeded with url: / (Caused by NameResolutionErr`
  - notes: Fincare merged into AU SFB; balance/customer care: 1800-120-1200 / 1800-26-66677 (Source: au.bank.in merger page).

- `baroda-up-gramin` — Baroda UP Gramin Bank | missedCall `9986454440` | customerCare `1800-180-7700` | verdict **SITE_BLOCKED**
  - fetch failure: `ConnectionError: HTTPSConnectionPool(host='www.barodaupbank.in', port=443): Max retries exceeded with url: / (Caused by NameResolutionErr`
  - notes: Official site barodaupbank.in DNS resolution failed from server. Number confirmed by 3+ aggregators. Needs manual re-verification when site is accessible.
  - banks.ts verificationSource: barodaupbank.in (official site DNS-inaccessible from server; number 9986454440 confirmed by codeforbanks.com + easemoney.in + banksforyou.com, 2026-07-20)

- `pragathi-krishna` — Pragathi Krishna Gramin Bank | missedCall `9015800700` | customerCare `08392-236444` | verdict **SITE_BLOCKED**
  - fetch failure: `ConnectionError: HTTPSConnectionPool(host='pragathikrishnabank.com', port=443): Max retries exceeded with url: / (Caused by NameResolutio`

All five hosts fail DNS resolution from the audit runner (`NXDOMAIN` in both Phase 1 and the Phase 2 browser tier) and all five appear in `weblive.txt` with `000` status on both `https` and `http`. Note that `weblive.txt` `000` results are **not** proof of downtime on their own — see §7.2.

### 6.2 The `*.bank.in` migration (36 records)

`banks.ts` still stores legacy `.com` / `.co.in` / `.in` hosts for 36 records, while the live site has moved to a `*.bank.in` host. Evidence is the first URL Phase 1 actually landed on after redirect:

| slug | stored website host | host actually served |
| --- | --- | --- |
| airtel-payments | airtel.in | airtelpayments.bank.in |
| au-sfb | aubank.in | au.bank.in |
| axis | axisbank.com | axis.bank.in |
| bandhan | bandhanbank.com | bandhan.bank.in |
| canara | canarabank.com | canarabank.bank.in |
| central-bank | centralbankofindia.co.in | centralbank.bank.in |
| chhattisgarh-rajya | cgbank.in | cgb.bank.in |
| dbs | dbs.com | dbs.bank.in |
| dcb | dcbbank.com | dcb.bank.in |
| deutsche | db.com | country.db.com |
| equitas | equitasbank.com | equitas.bank.in |
| esaf | esafbank.com | esaf.bank.in |
| federal | federalbank.co.in | validate.perfdrive.com |
| hdfc | hdfcbank.com | hdfc.bank.in |
| hsbc | hsbc.co.in | hsbc.bank.in |
| icici | icicibank.com | icici.bank.in |
| idfc-first | idfcfirstbank.com | idfcfirst.bank.in |
| indian-bank | indianbank.in | indianbank.bank.in |
| indusind | indusind.com | indusind.bank.in |
| iob | iob.in | iob.bank.in |
| jana | janabank.com | jana.bank.in |
| jk-bank | jkbank.com | jkb.bank.in |
| karnataka-bank | karnatakabank.com | karnatakabank.bank.in |
| kotak | kotak.com | kotak.bank.in |
| kvgb | kvgbank.com | karnatakagb.bank.in |
| nainital | nainitalbank.co.in | nainitalbank.bank.in |
| ne-sfb | nesfb.com | slice.bank.in |
| pnb | pnbindia.in | pnb.bank.in |
| rbl | rblbank.com | rbl.bank.in:443 |
| saraswat | saraswatbank.com | saraswat.bank.in |
| sbi | onlinesbi.sbi | onlinesbi.sbi.bank.in |
| standard-chartered | sc.com | sc.bank.in |
| tmb | tmb.in | tmb.bank.in |
| ujjivan | ujjivansfb.in | ujjivansfb.bank.in |
| utkarsh-sfb | utkarsh.bank | utkarsh.bank.in |
| yes-bank | yesbank.in | yes.bank.in |

Two redirects in that table are not `.bank.in` moves and need a different reading: `federal` (`federalbank.co.in` → `validate.perfdrive.com`, a bot-protection interstitial) and `deutsche` (`db.com` → `country.db.com`, a Group domain redirect).

Not every dead host has a captured live twin. `kvb` (`kvb.co.in` → NXDOMAIN) has no `.bank.in` host anywhere in `tier3.jsonl` (`official_hosts` = `kvb.co.in`, `www.kvb.co.in` only), so the migration target is unknown from this data and must be probed before the `website` field is changed.

## 7. Tier results and method notes

### 7.1 Verdict counts per tier

- Phase 1 (raw HTML fetch, 79 records): `CONFIRMED` 20, `NO_MATCH` 48, `PARTIAL` 11
- Phase 2 (headless browser, 59 records): `CONFIRMED` 4, `NO_MATCH` 44, `PARTIAL` 11
- Phase 3 (search index, 35 records): `AGGREGATOR_ONLY` 16, `NOT_INDEXED` 2, `OFFICIAL_INDEX_HIT` 7, `OFFICIAL_INDEX_HIT_CARE_ONLY` 5, `WEAK_AGGREGATOR_ONLY` 5

The browser tier re-ran only the records Phase 1 could not settle; it confirmed 4 records and left 44 as `NO_MATCH`, which is why the browser tier does not replace Phase 1.

### 7.2 `weblive.txt` `000` results are curl artifacts, not downtime

`weblive.txt` records `https 000` for many hosts — including `bankofbaroda.bank.in`, which the browser tier then fetched normally with 200 and multi-page text lengths. The `000` values come from a plain-TLS curl pass (handshake/cipher/SNI or `http` vs `https` port mismatch); they must not be used as liveness evidence. The Phase 2 browser results are the authority for reachability.

### 7.3 Corrected tier-3 host classification

The Phase 3 pipeline built `official_hosts` partly from the `notes` prose of each record, which pulled aggregator domains into the official set. Two records were affected and are **re-classified in this report** against the bank's own host set:

- `boi` — `tier3.jsonl` lists `biznext.in` and `bankbazaar.com` hits as `OFFICIAL_INDEX_HIT`; both are aggregators. `bankofindia.co.in` itself returned **403** in Phase 1 and Phase 2 (the record's own note says the site blocks automated access), so `boi` is reported here as **SITE_BLOCKED**, not confirmed.
- `axis` — `tier3.jsonl` lists `wishfin.com` as an official hit; wishfin is an aggregator. Axis still qualifies as **CONFIRMED_OFFICIAL** on its own host (`https://www.axis.bank.in`, `customerCare`, Phase 1 + Phase 2).

The strict host rule used: a hit is official only if its host is the record's `website` host or a host the record's own crawl landed on. Re-running Phase 3 with that rule is item FIX-P3-8 below.

## 8. `dist/` parity (Phase 0 rebuild check)

Method: parse `banks.ts`, walk all `dist/**/*.html` (893 pages), strip `<script>`/`<style>`, canonicalize every rendered number token and compare with the stored set. The Phase 2b run reports:

- stored canonical numbers: **138**
- `dist/` HTML pages: **893**
- `/bank/` pages missing their own `missedCall`: **0**
- rendered numbers not present in `banks.ts`: **24** distinct values (the offline check), **25** in the Phase 2b run

The 24 values (list produced by `scripts/audit-number-authenticity.mjs` check 5) are dominated by non-data text: merger timeline dates rendered as digits (`20260720` x53 occurrences, `20250501`, `20200401`, `20190401`, `20260808`, `20260804`, `20260914`, `20190101`, `20260918`), plus alternate/mini-statement numbers quoted inside `notes` prose (`7287888886`, `8422992272` — the withdrawn Axis number, `18004195858`, `18004196969`, `18004196868`, `18001212585`, `9243212121`, `8593866639`, `18002666677`, `8424054994`, `8826800111`, `18602666601`, `9223501111`, `18002663456`, `18002023005`). None of them is a `missedCall`/`customerCare` field rendering incorrectly — the earlier looser check (Phase 2, `=== pages missing their own record number === 186`) was a regex false-positive count; Phase 2b's canonical comparison puts the real number at 0.

The one-value difference between the two runs is a tokenizer artifact, not a site fact: Phase 2b used BeautifulSoup's `get_text(' ')`, which concatenates two adjacent inline date fragments into the single token `20192025`; the Node check replaces tags with a space and therefore reads the same markup as `2019` and `2025` and rejects both as sub-8-digit tokens. The 24-value count is the accurate one.

One self-referential hit is worth recording: the query `"1800-300-00620" Arunachal Pradesh Rural Bank` returns `https://balcheck.in/` itself, i.e. the site is already the search result for a number it publishes, and that number has no official corroboration (`arunachal-pradesh-rural` = `NO_SUPPORT`, its `.bank.in` host served 200 pages with no match).

## 9. Proposed Phase-3 fix list (proposed only — nothing applied)

Each item below is a proposal. No file was modified, no rebuild was run, no deploy was performed, and no metadata for the 9-page CTR cohort was touched.

| id | scope | proposal | driving evidence |
| --- | --- | --- | --- |
| FIX-P3-1 | hsbc / idfc-first | **Resolved by live re-verification (§3.1, 2026-09-18):** neither bank's live official pages carry `18001088222`. Fix is now concrete: set `idfc-first` `customerCare` to `1800 10 888` (1800108888, live `idfcfirst.bank.in/customer-care`) and update `hsbc` `notes` + fields to the live line-up (`1800 266 3456` / `1800 267 3456`, live `hsbc.bank.in/help/contact/`), removing the 8222 duplicate from both records. Ship as the Phase-3 data commit with these two evidence URLs. | §3.1 live re-verification; `suspicion_search.json` index hit superseded |
| FIX-P3-2 | pragathi-krishna | Set `website` to the successor host and surface the number as the successor's; the number is page-confirmed on `karnatakagb.bank.in/ebanking-services/balance-enquiry`. | §3.2 |
| FIX-P3-3 | baroda-up-gramin | Keep the slug for old-number search intent, but render the merger timeline (`mergers.json`: 2020-04-01, 2025-05-01) and the successor `up-gramin` number as the live value. | §3.3; `mergers.json` |
| FIX-P3-4 | punjab-gramin, himachal-pradesh-gramin, bihar-gramin, haryana-gramin | Treat `18001807777` as one shared toll-free care line; remove the toll-free from `missedCall` (a toll-free cannot register a missed call) or add an explicit shared-line field. | §3.4, §3.6 |
| FIX-P3-5 | jharkhand-gramin, uttarakhand-gramin, rajasthan-gramin | Same treatment for `18005327444`; the Jharkhand attribution is page-backed, the other two are not. | §3.5 |
| FIX-P3-6 | mp-gramin | Fix `balanceMode`: it is `missed-call` while both numbers are identical, contradicting the derivation rule in `banks.ts`. | §4 |
| FIX-P3-7 | 57 records | Backfill `verificationSource` + `lastVerified` from the tier evidence that exists (§5), or downgrade `verified` to `false` where no source exists. Currently every record claims `verified: true`. | §5 |
| FIX-P3-8 | tier-3 pipeline | Rebuild `official_hosts` from the record's own host set instead of scraping `notes` prose, then re-run the index tier; `boi`/`axis` misclassification came from that bug. | §7.3 |
| FIX-P3-9 | maharashtra, kvb, fincare, baroda-up-gramin, pragathi-krishna | Update `website` to the live `.bank.in` / successor host; `kvb` needs a fresh probe first because no `.bank.in` twin exists in the data. | §6.1, §6.2 |
| FIX-P3-10 | suryoday | `suryodaybank.com` returns **404**; the index shows `https://suryoday.bank.in/` live and the search result for `18002667711` cites it. Migrate `website` and re-verify. | §2 table, `suspicion_search.json` |
| FIX-P3-11 | boi | Record the 403 automation block as the reason the record is unverified (the `notes` field already says so) and stop presenting it as officially confirmed; schedule a manual on-page read. | §7.3 |
| FIX-P3-12 | cosmos | The browser tier was redirected from `cosmosbank.in` to a `secureserver.net` parking page while Phase 1 got 200 — probe the domain and confirm the real host before keeping the record as verified. | §2 table |
| FIX-P3-13 | ippb, apgb, arunachal-pradesh-rural | Re-probe with the browser tier rather than curl; all three returned Phase 1 TLS errors (`SSLError`) and then served 200 in Phase 2 (`ippbonline.bank.in`, `apgb.co.in`, `www.aprb.bank.in`) with no number match — so the gap is page coverage, not reachability. `esaf` is different: 403 in both tiers, so it stays `SITE_BLOCKED`. | §7.2, §2 table |
| FIX-P3-14 | jio-payments, baroda-rajasthan | Every tier timed out; keep the records but mark them unverified until a successful fetch exists. | §2 table, `weblive.txt` |
| FIX-P3-15 | 13 AGGREGATOR_ONLY records | Schedule an official re-check of specific inner pages (`/customer-care`, `/contact-us`, `/grievance-redressal`) rather than homepages; the aggregator-only records' own `.bank.in` hosts served 200 pages that simply did not carry the number. | §2 table |
| FIX-P3-16 | icici, yes-bank | Re-read the official customer-care pages for the two 8-digit toll-free values (`1800-1080`, `1800-1200`); they are the only `1800` values in the file shorter than 10 digits. | §2.2 |
| FIX-P3-17 | cub, odisha-grameen, puduvai-bharathiar, arunachal-pradesh-rural, mizoram-rural | Keep the STD landline values but confirm each is the current customer-care line, since the field is otherwise toll-free-only. | §2.2 |

## 10. Appendix — data sources and reproduction

| artifact | content |
| --- | --- |
| `/tmp/bc-audit/banks.json` | 79 records dumped from `src/data/banks.ts` (the input to every tier) |
| `/tmp/bc-audit/phase1.jsonl` | raw-HTML tier, 79 records, per-page status/length and per-field `found{}` URLs |
| `/tmp/bc-audit/browser.jsonl` | headless-browser tier, 59 records, per-page fetch log |
| `/tmp/bc-audit/tier3.jsonl` | search-index tier, 35 records, `official_hits[]` / `aggregator_hits[]` / `verified_pages[]` |
| `/tmp/bc-audit/suspicion_search.json` | 38 index results across the 5 collision clusters |
| `/tmp/bc-audit/weblive.txt` | 31 liveness probes (curl TLS pass — see §7.2) |
| `/tmp/bc-audit/phase2b.py` | `dist/` parity run used in §8 |
| `/tmp/bc-audit/consolidate.py` | first-pass consolidation (aggregator counts + flags) |
| `scripts/audit-number-authenticity.mjs` | offline re-run of every Phase 0 number in this report |

Consolidation logic for this report: a field is official if any tier has a `found`/`official_hits`/`verified_pages` URL on the record's own host set; otherwise the record is classified by reachability (`SITE_BLOCKED`) and then by third-party support (`AGGREGATOR_ONLY` / `NO_SUPPORT`). Single field = single verdict per record, so a record with one confirmed field and one unconfirmed field is reported as `CONFIRMED_OFFICIAL` in the table and split out in §2.1.

## 11. Offline check output (reproduction)

`node scripts/audit-number-authenticity.mjs` — run from the repo root on 2026-09-18, exit code 0. Checks 1–5 are Phase 0 only; the three network tiers print as documented stubs.

```
balcheck — bank number authenticity audit (Phase 0, offline)
repo: /home/uttkarsh/repos/balcheck
audit date: 2026-09-18 | records parsed from src/data/banks.ts: 79

=== check 1: field-format-validation ===
  pass 79  fail 0  notes 7
  - sbi.customerCare='1800-11-2211' -> tollfree-1800 (10 digits, non-canonical shape)
  - canara.customerCare='1800-1030-1800' -> tollfree-1800 (12 digits, non-canonical shape)
  - indian-bank.customerCare='1800-4250-0000' -> tollfree-1800 (12 digits, non-canonical shape)
  - icici.customerCare='1800-1080' -> tollfree-1800 (8 digits, non-canonical shape)
  - yes-bank.customerCare='1800-1200' -> tollfree-1800 (8 digits, non-canonical shape)
  - au-sfb.customerCare='1800-1200-1200' -> tollfree-1800 (12 digits, non-canonical shape)
  - arunachal-pradesh-rural.missedCall='1800-300-00620' -> tollfree-1800 (12 digits, non-canonical shape)

=== check 2: collision-matrix ===
  pass 147  fail 6  notes 6
  note: 153 distinct field values, 6 in-field collision values, 0 cross-field collisions
  - missedCall 9986454440 shared by baroda-up-gramin, up-gramin
  - missedCall 18001807777 shared by punjab-gramin, himachal-pradesh-gramin, bihar-gramin
  - missedCall 9015800700 shared by pragathi-krishna, karnataka-grameena
  - customerCare 18001088222 shared by idfc-first, hsbc
  - customerCare 18001807777 shared by punjab-gramin, himachal-pradesh-gramin, bihar-gramin, haryana-gramin
  - customerCare 18005327444 shared by jharkhand-gramin, uttarakhand-gramin, rajasthan-gramin

=== check 3: missed-call-equals-customer-care ===
  pass 62  fail 17  notes 17
  note: 17 records share one number for both fields; 1 of them contradict the balanceMode derivation rule
  - rbl: missedCall == customerCare == 18004190610 (balanceMode=customer-care, legit customer-care-only line)
  - karnataka-bank: missedCall == customerCare == 18004251445 (balanceMode=customer-care, legit customer-care-only line)
  - equitas: missedCall == customerCare == 18003031500 (balanceMode=customer-care, legit customer-care-only line)
  - jana: missedCall == customerCare == 18002105656 (balanceMode=customer-care, legit customer-care-only line)
  - hsbc: missedCall == customerCare == 18001088222 (balanceMode=customer-care, legit customer-care-only line)
  - standard-chartered: missedCall == customerCare == 18001220040 (balanceMode=customer-care, legit customer-care-only line)
  - indusind: missedCall == customerCare == 18002741000 (balanceMode=customer-care, legit customer-care-only line)
  - utkarsh-sfb: missedCall == customerCare == 18001239878 (balanceMode=customer-care, legit customer-care-only line)
  - punjab-gramin: missedCall == customerCare == 18001807777 (balanceMode=customer-care, legit customer-care-only line)
  - capital-sfb: missedCall == customerCare == 18001201600 (balanceMode=customer-care, legit customer-care-only line)
  - jharkhand-gramin: missedCall == customerCare == 18005327444 (balanceMode=customer-care, legit customer-care-only line)
  - himachal-pradesh-gramin: missedCall == customerCare == 18001807777 (balanceMode=customer-care, legit customer-care-only line)
  - assam-gramin: missedCall == customerCare == 18002023006 (balanceMode=customer-care, legit customer-care-only line)
  - bihar-gramin: missedCall == customerCare == 18001807777 (balanceMode=customer-care, legit customer-care-only line)
  - mp-gramin: missedCall == customerCare == 8010968293 (balanceMode=missed-call, CONTRADICTS the derivation rule in banks.ts)
  - maharashtra-gramin: missedCall == customerCare == 9549224443 (balanceMode=customer-care, legit customer-care-only line)
  - tamil-nadu-grama: missedCall == customerCare == 9289202222 (balanceMode=customer-care, legit customer-care-only line)

=== check 4: provenance-and-staleness ===
  pass 22  fail 57  notes 13
  note: 57 records claim verified:true with no verificationSource; 0 records older than 120 days
  note: lastVerified present on 22/79 records
  - bob: verified:true but no verificationSource; verified:true but no lastVerified
  - ubi: verified:true but no verificationSource; verified:true but no lastVerified
  - indian-bank: verified:true but no verificationSource; verified:true but no lastVerified
  - central-bank: verified:true but no verificationSource; verified:true but no lastVerified
  - uco-bank: verified:true but no verificationSource; verified:true but no lastVerified
  - iob: verified:true but no verificationSource; verified:true but no lastVerified
  - idbi: verified:true but no verificationSource; verified:true but no lastVerified
  - hdfc: verified:true but no verificationSource; verified:true but no lastVerified
  - kotak: verified:true but no verificationSource; verified:true but no lastVerified
  - federal: verified:true but no verificationSource; verified:true but no lastVerified
  - dbs: verified:true but no verificationSource; verified:true but no lastVerified
  - dcb: verified:true but no verificationSource; verified:true but no lastVerified
  - ... +45 more

=== check 5: dist-parity ===
  pass 79  fail 0  notes 0
  note: dist HTML pages: 893; route/index pages scanned: 877
  note: canonical stored numbers: 138
  note: rendered numbers not in banks.ts: 24 distinct values (mostly merger dates and alternate numbers quoted in notes prose)
  note:   unknown: 8826800111 in 3 route family(ies)
  note:   unknown: 18001212585 in 3 route family(ies)
  note:   unknown: 8422992272 in 3 route family(ies)
  note:   unknown: 18004195858 in 3 route family(ies)
  note:   unknown: 18004196969 in 3 route family(ies)
  note:   unknown: 18004196868 in 3 route family(ies)
  note:   unknown: 18602666601 in 3 route family(ies)
  note:   unknown: 8593866639 in 3 route family(ies)

=== external tiers (stubs — not executed, offline mode) ===
  [T1] phase1-official-page-fetch — SKIPPED
     wrapper of: /tmp/bc-audit/phase1.py, phase1_run.py, fetch_lib.py
     would: GET the stored website + candidate inner pages (/customer-care, /contact-us, /missed-call-*, /grievance-redressal), regex-match each field with digit normalization, record per-page status/length and per-field found{url,context,match}.
     yields: verdict CONFIRMED / PARTIAL / NO_MATCH per record with the exact official URL that carried the number
     gate: network + per-host TLS; 403/TLS failures are real findings, not script errors
  [T2] browser-tier-fetch — SKIPPED
     wrapper of: /tmp/bc-audit/browser_audit.mjs, verify2.mjs, deep.mjs, targeted.mjs
     would: drive a headless browser over the records Phase 1 could not settle (client-rendered pages, TLS-blocked curl hosts, download-triggered navigations), capturing rendered text length per page.
     yields: verdict CONFIRMED / PARTIAL / NO_MATCH with a per-page fetch log; this is the authority for reachability
     gate: headless browser + network; weblive.txt https 000 results are curl artifacts and must not substitute for this tier
  [T3] tier3-search-index-crosscheck — SKIPPED
     wrapper of: /tmp/bc-audit/tier3.py (SearXNG search + page verification)
     would: query a search index for each leftover (field, number) pair, split hits into official vs aggregator hosts, then re-fetch candidate pages to keep only verified_pages[] carried hits.
     yields: verdict AGGREGATOR_ONLY / OFFICIAL_INDEX_HIT / OFFICIAL_INDEX_HIT_CARE_ONLY / WEAK_AGGREGATOR_ONLY / NOT_INDEXED
     gate: network; build official_hosts from the record's own host set, never from notes prose (the 2026-09-18 run misclassified boi/axis aggregator hits as official that way)

=== summary: per-check pass/fail ===
check                               pass  fail  warn
1 field-format-validation             79     0     7
2 collision-matrix                   147     6     6
3 missed-call-equals-customer-care    62    17    17
4 provenance-and-staleness            22    57    13
5 dist-parity                         79     0     0
TOTAL                                389    80

read-only: no file was written, no network call made, no build run.
external fetch tiers: 3 stubs documented above (phase1 / browser / tier3 not executed).
```

Reading of those counts: check 2's 6 failures are the collision clusters in §3; check 3's 17 failures are the `missedCall == customerCare` set in §4 (16 legitimate by construction, 1 mode contradiction); check 4's 57 failures are the no-provenance records in §5; check 5's 79 passes mean every record's `/bank/` page exists and renders both of its numbers with the expected `/missed-call/` route presence.

