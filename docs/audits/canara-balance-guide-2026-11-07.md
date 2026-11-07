# Canara balance-check guide — existing URLs, source-correct channels

## Scope and demand

Primary upgrade: `https://balcheck.in/bank/canara/`. GSC Search Analytics, India, final aggregate data for **2026-10-08 through 2026-11-04**: **34,355 impressions / 67 clicks**. No query-row sum is substituted for the page total.

Keep its URL, title and H1. Correct the description only to remove unsupported instant/free/24×7 promises; the intervention is the actual channel guide and troubleshooting, not another title experiment. No new routes, tools, forms, schedules or paid resources. The Union Bank guide, UP Gramin guide and PSB/OGB ATM-PIN pilot remain outside the content scope.

## Primary evidence actually read on 2026-11-07

1. [Canara — Missed Call Banking](https://www.canarabank.bank.in/pages/missed-call-banking), extracted and opened in a real browser:
   - “Canara Bank Saving Account Balance inquiry by missed call”: **8886610360**.
   - “Canara Bank Account Mini Statement or last 5 Transactions”: **09015734734 (In English)**.
   - The same last-five service in Hindi: **09015613613**.
   - Preserve the leading zero on the two mini-statement numbers exactly as published.
2. [Canara — Contact Us](https://www.canarabank.bank.in/pages/contactus), extracted and opened in a real browser:
   - General call centre: **18001030**, labelled toll-free and **24*7**.
   - Separate outgoing-only, NRI and pensioner lines are not interchangeable with that general number.
3. [Canara — SMS Help Desk](https://www.canarabank.bank.in/sms-help-desk), extracted and opened in a real browser:
   - Contact **080-25129259**, **10 AM to 6 PM**.
   - Toll-free help **18001030**, **24*7**.
   - The help desk is a contact for assistance, not a published balance-SMS keyword/destination list.

The shorter service table does **not** document an SMS-send command, reply format, mobile-registration/activation procedure, response deadline, ring count or missed-call tariff/uptime. Do not borrow these details from another bank, a search snippet or an aggregator. In particular, call-centre hours and toll-free status do not establish free/24×7 missed-call banking. No call/SMS was sent, no bank login was attempted and no account data was entered.

## Coupled data-correctness fixes

The existing bank record had `customerCare: '1800-1030-1800'`, which is not the general number on the current official contact page. Replace it at `banks.ts`, the shared source of truth, with **18001030** so all consumer families stop printing/dialling the malformed value. Reconfirm the unchanged balance number, update the official website to the read `.bank.in` host and date only the actual number-record verification. Cite the missed-call and contact pages separately; the verification status is about these numbers, not a live test of every banking channel.

Do not copy the phone record into the guide. Language-specific mini numbers and procedure sources have one definition in `src/data/canara-balance-guide.ts`; the phone record imports its evidence date/URLs and the guide reads the balance/support values from the bank record. The type-only Bank import must remain type-only, so this introduces no runtime import cycle.

The new official read also disproves the existing “mini-statement number unverified” answers on `/mini-statement/canara/` and `/sms-banking/canara/`. Correct those coupled consumers using the same fact source, without duplicating the whole balance guide:
- Mini-statement URL: show the two language options, source and last-five scope; preserve the existing title/H1/canonical. Replace its unverified-number answer and steps/FAQs, without inventing SMS delivery or activation details.
- SMS URL: make its mini-statement prose and FAQ use one shared summary; continue to decline an undocumented SMS-send command.

No `missedCallAlt` is invented or overloaded: a two-language service is not a single alternate balance number. The reusable mini-number block is rendered once per relevant page.

## Acceptance and measurement

The initial behavioral test failed on the old support number before implementation. Tests cover source-dated service distinctions, leading-zero-preserving tel links, no forms or SMS-send links in the guide, no fixed-second/ring/free-delivery promises, visible HowTo/FAQ parity, mobile layout, source-factory fallback and shared-record use, secondary mini/SMS correction and removal of the malformed contact from all nine existing consumer families.

Before edits, the built HTML and sitemap were archived. Compare unaffected bank-family pages semantically, including copy, links and structured data. Permit only the regenerated shared CSS asset filename (whose real file must exist) and the exact malformed-to-published Canara support-number replacement in related-bank comparison tables. The latter intentionally propagates the shared-record fix, not unrelated copy changes. Check the full sitemap set and target title/H1/canonical against the baseline. Changes to the Canara record on hubs/lookup lists are likewise expected coupled fixes, not unrelated new content.

Run a real build, the full risk-appropriate suite, affected sitemap/redirect/runtime gates, exact-commit CI/deployment and plain public-page checks including the existing pilots and canonical redirect. Search impact is unmeasured at publication; use a fresh post-release observation window before claiming a CTR or traffic win. No cron or additional monitoring system is created.

Temporary raw evidence and executable release receipts: `/home/uttkarsh/.hermes/cache/scratch/balcheck-canara-depth-20261107/`. This audit is the durable source/limitation record; scratch files may be pruned.
