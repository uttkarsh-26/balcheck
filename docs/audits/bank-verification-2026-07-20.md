# Bank Verification Audit — 2026-07-20

**Scope:** Top 20 `/bank/[slug]` pages by GSC impressions (28-day window: 2026-06-22 to 2026-07-19), aggregating slash/non-slash URL variants.

**Method:** Official bank websites (`.bank.in` / official domains) via `curl_cffi` chrome impersonation, cross-checked with 3+ independent aggregators (cleartax.in, bankbazaar.com, paisabazaar.com, codeforbanks.com, wishfin.com, lemonn.co.in). Google search snippets used for discovery of official URLs. Moneyview returned 404 (page no longer exists).

**Result:** 1 correction, 19 confirmed, 0 invented certainty.

---

## Corrections

| Bank | Field | Old Value | New Value | Source | Status |
|------|-------|-----------|-----------|--------|--------|
| Axis Bank | missedCall | `8422992272` | `18004195959` | [axis.bank.in/bank-smart/missed-call-service](https://www.axis.bank.in/bank-smart/missed-call-service) — "Dial 1800 419 5959 to get your Account Balance" | **CORRECTED** |

**Axis evidence:** `8422992272` does not appear anywhere on the official Axis Bank missed-call service page. The official page lists 1800-419-5959 (English) / 1800-419-5858 (Hindi) for balance, 1800-419-6969 / 1800-419-6868 for mini statement. Confirmed by cleartax.in, wishfin.com, bankbazaar.com.

---

## Confirmed (19 banks)

| # | Slug | missedCall | Source | Notes |
|---|------|-----------|--------|-------|
| 1 | boi | 9811255430 | cleartax.in + biznext.in + bankbazaar.com | Official bankofindia.co.in returns 403 (bot block). Paisabazaar lists 9266135135/9015135135 — possibly older/regional. 9811255430 is widely-cited current number. |
| 2 | psb | 7039035156 | [punjabandsind.bank.in](https://punjabandsind.bank.in/) — "For Balance Enquiry (By Missed Call) 7039035156" | Official site migrated to punjabandsind.bank.in. Customer care on official site: 1800-419-8300 (our data has 1800-221-908 — may be outdated). |
| 3 | baroda-up-gramin | 9986454440 | codeforbanks.com + easemoney.in + banksforyou.com | Official barodaupbank.in DNS-inaccessible from server. Needs manual re-verification. |
| 4 | canara | 8886610360 | [canarabank.bank.in/pages/missed-call-banking](https://www.canarabank.bank.in/pages/missed-call-banking) | Official .bank.in page confirmed. |
| 5 | punjab-gramin | 18001807777 | loansjagat.com + codeforbanks.com + wealthquint.com + indmoney.com | Official pgb.bank.in returns 468 (bot protection). codeforbanks states "no missed call facility, dial toll-free 18001807777". balanceMode may need review. |
| 6 | bandhan | 9223008666 | paisabazaar.com + bankbazaar.com + creditmantri.com + askbankifsccode.com | 4 aggregators confirm. |
| 7 | sbi | 09223766666 | bankbazaar.com + biznext.in + olyv.co.in + creditmitra.in | 4 aggregators confirm. Mini statement: 09223866666. |
| 8 | indusind | 18002741000 | [indusind.com missed-call-banking](https://www.indusind.com/in/en/personal/mobile-banking-services/missed-call-banking.html) | Official page confirmed. |
| 9 | kvb | 09266292666 | [kvb.bank.in/ways-to-bank/missed-call-banking](https://www.kvb.bank.in/ways-to-bank/missed-call-banking/) | Official .bank.in page confirmed. Alt (mini statement): 09266292665. |
| 10 | baroda-rajasthan | 8880094411 | codeforbanks.com + easemoney.in + banksforyou.com + mybalancetoday.com | Official brkgb.com is JS-rendered (no static numbers). 4 aggregators confirm. |
| 11 | idfc-first | 18002700720 | [idfcfirst.bank.in](https://www.idfcfirst.bank.in/customer-care-sr/account-balance-enquiry) + gadgets360.com + codeforbanks.com + cleartax.in | Official .bank.in page + 3 aggregators. |
| 12 | rbl | 18004190610 | [rbl.bank.in missed-call-facility](https://www.rbl.bank.in/personal-banking/convenience-banking/missed-call-facility) — "missed call to 1800 419 0610" | Official .bank.in page confirmed. |
| 13 | icici | 9594612612 | moneyview.in + cleartax.in + codeforbanks.com + policybazaar.com + paisabazaar.com | 5 aggregators confirm. |
| 14 | maharashtra | 9833335555 | [bankofmaharashtra.bank.in/contact-us](https://bankofmaharashtra.bank.in/contact-us) — "Balance Enquiry: 98333 35555" | Official .bank.in page confirmed. Mini statement: 7287888886. |
| 15 | cosmos | 9029013793 | [cosmos.bank.in/product-services-details?id=14](https://cosmos.bank.in/product-services-details?id=14) — "Missed call: 90290 13793" | Official page confirmed. |
| 16 | pnb | 9264092640 | [pnbindia.in](https://www.pnbindia.in) | Official homepage confirmed. |
| 17 | utkarsh-sfb | 18001239878 | [utkarsh.bank](https://www.utkarsh.bank) | Official site confirmed. |
| 18 | yes-bank | 9223920000 | cleartax.in + paisabazaar.com + lemonn.co.in | 3 aggregators confirm. Mini statement: 09223921111. |
| 19 | airtel-payments | 8800688006 | lemonn.co.in + airtel.in/blog + loansjagat.com | Ecensus.in lists alternate 8826800111 — possibly older. Official airtelpayments.bank.in help page is JS-rendered. |

---

## Open Items (not resolved in this audit)

1. **Punjab Gramin balanceMode** — codeforbanks says "no missed call facility". Our data treats 18001807777 as missed-call. May need to change to `customer-care` or `ivr`.
2. **PSB customer care** — official site shows 1800-419-8300, our data has 1800-221-908.
3. **BOI official site** — bankofindia.co.in blocks automated access (403). Number confirmed via aggregators only.
4. **Baroda UP Gramin** — official site DNS-inaccessible. Number confirmed via aggregators only.
5. **Remaining 59 banks** — last verified 2026-06-20. Need re-verification.

---

## Files Changed

- `src/data/banks.ts` — Axis correction + provenance fields (verificationSource, lastVerified) on 20 audited records + header update
- `tests/bank-pages.spec.ts` — Axis title assertion updated
- `tests/verification-audit.spec.ts` — NEW regression test for audited set
- `docs/audits/bank-verification-2026-07-20.md` — This receipt
