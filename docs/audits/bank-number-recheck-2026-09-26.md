# Bank number authenticity — 2026-09-26 official re-check

**Scope:** the 16 `src/data/banks.ts` records carrying `verified: false` (2026-09-18 verdict
NO_SUPPORT / SITE_BLOCKED). Method: browser-UA fetch of candidate official paths on each recorded
host (16 hosts), plus `site:`-scoped search and targeted official pages. No repo files were
used as evidence; every claim below comes from a live read or a named official document.

**Outcome: no record could be promoted to `verified: true`.** Four records publish a number that the
official page contradicts, and three records describe entities that no longer exist.

| record | verdict | official evidence (read 2026-09-26) |
| --- | --- | --- |
| `apgb` | OBSOLETE_ENTITY + OFFICIAL_CONTRADICTS | https://apgb.bank.in/ (successor Andhra Pradesh Grameena Bank; live 200) |
| `pragathi-krishna` | OBSOLETE_ENTITY | https://apgb.bank.in/ (successor of the amalgamated bank; live 200) |
| `kvgb` | OFFICIAL_CONTRADICTS | https://www.kvgbank.com/contact-us (live 200) |
| `fincare` | OBSOLETE_ENTITY | https://www.au.bank.in/au-small-finance-bank-and-fincare-small-finance-bank-merger |
| `tamil-nadu-grama` | NO_EVIDENCE | https://tngb.bank.in/contact + https://tngb.bank.in/ (live 200) |
| `equitas` | NO_EVIDENCE | https://www.equitasbank.com/ (contact routes answer 404, no toll-free digits on-page) |
| `ippb` | OFFICIAL_CONTRADICTS | https://www.ippbonline.com/ (official help lines differ from the recorded number) |
| `esaf` | OFFICIAL_CONTRADICTS | https://www.esafbank.com/contact-us (live 200) |
| `standard-chartered` | NO_EVIDENCE | https://www.sc.com/in/bank-with-us/phone-banking/ (live 200) |
| `dbs` | NO_EVIDENCE | https://www.dbs.com/in/ (contact routes 404; no matching digits on-page) |
| `deutsche` | NO_EVIDENCE | https://www.db.com/india/en/contact.htm (live 200, carries no phone numbers) |
| `saraswat` | NO_EVIDENCE | https://www.saraswatbank.com/ (contact route 404/empty) |
| `arunachal-pradesh-rural` | NO_EVIDENCE | https://aprb.bank.in/contact (live 200) |
| `mizoram-rural` | NO_EVIDENCE | https://mizoramruralbank.in/ (live 200, no numbers; /contact-us 404) |
| `suryoday` | UNREACHABLE | site unreachable to automation (TLS handshake fails: unsafe legacy renegotiation disabled) |
| `jio-payments` | UNREACHABLE | site unreachable to automation (connection timeout on every path) |

## Defunct entities still published (needs a product decision)

- **apgb** (Andhra Pradesh Grameena Vikas Bank) and **pragathi-krishna** (Pragathi Krishna Gramin
  Bank) were both amalgamated into **Andhra Pradesh Grameena Bank** w.e.f. **2025-05-01**
  (Gazette S.O. 1625(E), 05.04.2025; sponsor Union Bank of India; HO Guntur). The successor runs
  `apgb.bank.in` and publishes missed-call **9090290912**, SMS **9902988992**, toll-free
  **1800 425 6708**, ATM-card **1800 123 6230**. `mergers.ts` has no record for either, so both
  `/bank/…/` pages still present a closed bank with a dead website link and no successor pointer.
- **fincare** (Fincare Small Finance Bank) was amalgamated into **AU Small Finance Bank** w.e.f.
  **2024-04-01** (RBI press release 57445). `fincarebank.com` no longer resolves.

## Numbers contradicted by the official page (needs UT sign-off before any edit)

| record | published here | official page carries |
| --- | --- | --- |
| apgb | customerCare `1800-123-6235` | `1800 123 6230` (ATM-card helpline; the recorded value looks like an off-by-one typo) |
| kvgb | customerCare `1800-425-1100` | `1800 10 25250` / `1800 102 5250`, ATM `1800 103 8210` |
| ippb | customerCare `1800-425-8900` | `155299` / `033-22029000`, unauthorised-transaction line `1800 8899 860` |
| esaf | customerCare `1800-303-1201` | Customer Service `1-800-103-3723` / `080-4552-0100` |
