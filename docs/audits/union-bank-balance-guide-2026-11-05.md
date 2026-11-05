# Union Bank balance guide: existing-URL upgrade

## Scope and demand

- Existing page only: `https://balcheck.in/bank/ubi/`. No new page, route, canonical, calculator or keyword variant.
- GSC Search Analytics, India, final data, 2026-10-06 through 2026-11-02: **62,679 impressions and 268 clicks** for that exact page. Aggregate and query-level responses were retrieved independently; the query response is not used as the page total.
- The source-backed ATM-PIN pilot remains limited to PSB and Odisha Grameen. This change neither expands it nor claims a search-traffic improvement.
- This is a reader-utility and data-correctness change, not another title experiment: distinguish missed call from SMS destinations; show primary-account commands, registration limitations, charges and what to do if a reply does not arrive.

## Sources actually opened on 2026-11-05

1. [Union Bank SMS Banking](https://www.unionbankofindia.bank.in/en/details/sms-banking), including the interactive **How To Use**, **How To Apply**, and FAQ content.
   - How To Use publishes missed-call destinations `9152379484`, `9152379572`, `9152379657`, `9152379697`, `9152379785`, `9152379867`. The shared bank record uses the first published option; the guide does not create six competing pages or imply that only one works.
   - Primary-account balance: `UBAL`; primary-account mini statement: `UMNS`. Published SMS destinations: `9152980440` and `9152980449`.
   - FAQ: domestic SMS charge **Rs. 0.25 + GST per SMS**; outgoing enquiry SMS can also attract the mobile operator's normal tariff. This does not establish a separate missed-call fee or a total cost for every enquiry.
   - How To Apply says to contact the call centre or branch; FAQ describes a signed branch form. The guide preserves that difference instead of inventing a universal remote-registration flow.
   - Joint-account FAQ requires all joint customers' signatures. The mobile-number-change FAQ directs users to notify the branch.
2. [Union Bank Customer Care](https://www.unionbankofindia.bank.in/en/common/customer-care).
   - General support includes `1800-2333`; the record uses that listed toll-free option, not a fraud-reporting-only number.

The previously stored `09223008586` and `1800-208-2244` were not found in the current rendered lists. No live calls or SMS were made. **Absence is not evidence of discontinuation**: the page explicitly says the old missed-call number's live status was not tested and does not make it callable. An Internet Archive availability check of the older SMS-banking URL returned no available snapshot; no historical validity claim is made.

## Implementation and shared-surface scope

- `banks.ts` remains the source of the chosen missed-call and support numbers. Its provenance and date reference the source-checked guide metadata; every existing consumer gets the corrected record.
- `union-bank-balance.ts` owns commands, destinations, source URLs, checked date, fee explanation and ordered instructions. The visible instructions and HowTo schema use the same steps.
- `UnionBankBalanceGuide.astro` renders only for `ubi`. Existing general-bank guides remain unchanged. The UBI description and answer text no longer promise immediate delivery, a fixed ring count, a universally free service or verified 24×7 availability.
- SMS links merely open the user's messaging app; BalCheck does not send messages or collect account numbers, PINs, OTPs or card details.
- Consumer sweep found source imports in route families, lookup, sitemap and redirect gates, plus a separate regex reader in the offline authenticity audit. That reader silently dropped expression-backed provenance; it now imports the evaluated registry used by the site. The regression covers the real CLI plus missing, throwing and empty registry error paths.

`audit-number-authenticity.mjs — a literal-only banks.ts regex parser drops imported/template-literal evidence and falsely reports verified records as undocumented; fix: load the evaluated banks export and fail closed on missing, invalid or empty records.`

The audit script's existing report-only exit policy is unchanged: exit 0 means it ran, not that every authenticity finding passed. Historic audits and their old source snapshots are not rewritten. The repository's protected AGENTS.md was not edited.

## Verification and measurement

Required before publication: build, full Playwright suite across desktop/mobile, existing CI node gates, runtime redirect/import compatibility, metadata/schema/visible-step checks, no new sitemap locations, mobile overflow check, and exact-commit CI deployment. The new source-check regression was observed failing against the old record before implementation; the audit-reader failure was reproduced separately before its fix.

After deployment: verify the unmodified public URL, new phone/SMS links and source citations, structured-data parity, sibling consumers and existing controls; compare sitemap locations to the saved pre-change set. Keep the original ATM-PIN pilot unchanged. Assess this guide over a fresh 28-day window after publication; number correction affects title/H1 automatically and makes this unsuitable for a clean copy-only CTR attribution claim. No cron, alert or monitoring system was added.

Execution evidence is retained under `/home/uttkarsh/.hermes/cache/scratch/balcheck-ubi-depth-20261105/`: GSC request/responses, rendered official panels, archive lookup and verification logs. Scratch evidence is temporary; the source facts above are the durable audit record.
