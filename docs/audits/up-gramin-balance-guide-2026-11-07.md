# UP Gramin balance-enquiry guide — existing URL only

## Approved scope and demand

Deepen `https://balcheck.in/balance-enquiry/up-gramin/` without new URLs, canonical changes or expansion of the ATM-PIN pilot. GSC Search Analytics, India, final data, 2026-10-08 through 2026-11-04: **26,862 impressions, 73 clicks** for this exact page. The aggregate was retrieved separately from query rows; no anonymized-query summation is presented as a page total.

The shared bank record already has the correct published missed-call number, so `banks.ts`, its number-review date and its verification status are not changed. Title, description, H1, route generation and canonical remain as before. This is a substantive procedure/eligibility improvement, not another metadata experiment.

## Primary source actually read

[UPGB — Miss Call Facility](https://upgb.bank.in/Miss-Call-Facility.php), opened with both extraction and a real browser on **2026-11-07**. The final effective URL is the same source URL; the rendered page is headed “Miss Call Facility / Account Balance”. It publishes:

- `9986454440` for the missed call from a registered mobile.
- Automatic disconnection **after first ring**, followed by SMS with the account's last four digits and current balance. No numeric SMS-delivery deadline is provided.
- Eligible schemes: Saving Bank **SB**, Current Account **CA**, Overdraft **OD**, Cash Credit **CC**. Information is based on linked accounts under the **same CUST ID**.
- Resident accounts with **domestic mobile numbers** only; an overseas country code/mobile number will not receive this facility's SMS.
- “Free of cost” and “24 X 7” are the bank's published service terms, not an uptime or call-success observation by BalCheck.
- For an unregistered mobile, contact the **base branch**. For a lost, stolen, surrendered or changed mobile number, contact that branch immediately for deletion/change.

No call or SMS was sent, no bank login was performed and no account data was entered. Other bank pages, social posts and aggregators are not being used as procedure evidence. No SMS command, mini-statement flow, universal app requirement, remote mobile activation, document list, DND fix or outage diagnosis is claimed from this source.

## Implementation

- `src/data/up-gramin-balance-guide.ts`: the single bank-specific procedure, FAQ and citation source. Its phone is read from the existing `Bank` record, not copied into a second record. The factory returns no guide for other bank slugs.
- `src/components/UpGraminBalanceGuide.astro`: eligibility, four ordered instructions, what the reply means, situation → next action troubleshooting, channel limits, safety warning and a separately dated procedure citation. No forms or credential collection.
- `src/pages/balance-enquiry/[slug].astro`: a UPGB-only branch uses that guide and the same steps/answers for HowTo/FAQ schema. It replaces the generic fixed two-to-three-ring/seconds claims and unsourced alternative-method block only for this bank. Other banks retain their existing branch. The above-fold CTA now discloses the domestic/resident restriction.
- Existing record evidence remains separately dated; the procedure's new review date is not backfilled into the bank-number record.
- The existing PSB/OGB ATM-PIN pilot and Union Bank's new guide remain outside this change.

## Verification and measurement

The first rendered regression was run against the old page and failed because the new guide did not exist. Required acceptance: new desktop/mobile tests; HowTo step order/text and FAQ answer parity; unchanged title/description/H1/canonical; no invented SMS action or data-collection form; no horizontal overflow; unchanged fallback-bank output and sitemap locations; existing schema/UI/redirect gates; a real build; full appropriate suite and exact-commit CI/deployment plus live public checks.

Before editing the shared template, its unaffected bank-page output and sitemap were saved. The consumer sweep covers balance-enquiry callers in missed-call, reliability, sitemap, UI, schema and the Union Bank tests; parity checks compare every unaffected family page, not just the selected screenshots. No schedule, monitoring system or paid resource is added.

Assess search impact only after a fresh post-publication observation window; no traffic improvement is claimed at release. Preserve the ATM-PIN pilot's original 28-day assessment rather than expanding it alongside this change.

Temporary raw evidence and executable checks: `/home/uttkarsh/.hermes/cache/scratch/balcheck-upgb-depth-20261107/` (official rendered page, GSC request/response, pre-change page/sitemap snapshots, tests and release receipts). The source facts and limitations above are the durable record; scratch artifacts may be pruned.
