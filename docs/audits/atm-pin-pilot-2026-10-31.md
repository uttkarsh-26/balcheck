# ATM-PIN pilot — baseline, measurement plan, and sources

Two-page pilot shipped 2026-10-31: `/atm-pin/odisha-grameen/` and `/atm-pin/psb/`.
No new URL, no canonical change, no new tool, no new dependency. The other 73
`/atm-pin/<slug>/` pages and the `/atm-pin/` hub are untouched (see the residual
list in `CHANGELOG.md`).

## Why these two pages

Demand evidence, taken from the raw page-query export for the **India-only,
2026-10-01 → 2026-10-28 window** (`pagequery_latest28_india.csv`, column
`page`; these are page-visible impressions/clicks, not site totals):

| URL | Impressions | Clicks | CTR |
| --- | --- | --- | --- |
| `https://balcheck.in/atm-pin/odisha-grameen/` | 8,303 | 2,425 | 29.21% |
| `https://balcheck.in/atm-pin/psb/` | 1,490 | 36 | 2.42% |

`odisha-grameen` is the site's best-converting page in this cluster and is the
page most exposed to a copy regression; `psb` is the low-CTR gap with a verified
official source.

**Pre-merger-name demand on the OGB page.** 3,124 of 8,303 impressions (37.6%)
and 905 of 2,425 clicks (37.3%) arrive under the pre-merger name "Odisha Gramya
Bank", a string that appeared nowhere on the live page. The pilot adds the name
with an official citation rather than letting that demand land on a page that
never acknowledges it. Separately, 444 impressions / 43 clicks (5.3%) arrive
under portal/site-name queries (`my card ogb bank in`, `mycards.ogb.bank.in`,
`odishabank.in login`, …), which is what the documented Card Services portal
answers.

The previously circulated "34% CTR" figure for this cluster is stale and was not
used.

## What the pilot claims, and from where

| Page | Documented channel | Official source | Read on |
| --- | --- | --- | --- |
| `/atm-pin/psb/` | PSB ATM — Green PIN | `https://punjabandsind.bank.in/document/Debit_Card_Green_PIN_poster.pdf` | 2026-10-31 |
| `/atm-pin/odisha-grameen/` | Odisha Grameen Bank Card Services portal | `https://mycards.ogb.bank.in/` (linked as "My Cards" from `https://odishabank.bank.in/`) | 2026-10-31 |
| `/atm-pin/odisha-grameen/` merger note | — | `https://odishabank.bank.in/` | 2026-10-31 |

Both dates are the date the source was actually read; nothing is back-filled.

What the sources do **not** support, and the pages therefore say so instead of
asserting: a fee amount for either procedure, the existence or absence of
net-banking / app / SMS / branch channels, and (for OGB) what happens after the
portal form is submitted — including whether an OTP is issued.

## 28-day measurement plan (for a later, separately approved run)

- Window: the first complete 28 days after the pilot is live, India-only, using
  the same page-query export shape as the baseline above.
- Compare per URL, not per site: impressions, clicks, CTR and average position
  together. Never CTR alone.
- Same query set as the baseline — each bank's own cluster from the `page`
  field of the export, not a keyword heuristic.
- Minimum support before drawing any conclusion: ≥1,000 impressions on the
  target cohort in the measured window **and** ≥20 absolute clicks on the URL.
  Below that the read is inconclusive and the correct action is no action.
- HARD REVERT trigger: any rendered step or number contradicted by the cited
  official source, or a structured-data assertion that the page does not
  display.
- CTR-drop trigger: absolute clicks on a pilot URL fall >15% vs the prior 28
  days **while impressions do not fall proportionally**.

This document is a baseline record only. It creates no cron, schedule or
automated promise.
