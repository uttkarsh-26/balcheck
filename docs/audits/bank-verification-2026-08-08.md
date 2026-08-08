# Bank Verification Audit — 2026-08-08

## Punjab & Sind Bank correction

**Scope:** Re-check the Punjab & Sind Bank (`psb`) contact and balance-enquiry fields already present in `src/data/banks.ts`.

**Official source:** <https://punjabandsind.bank.in/>

**Observed on the official homepage on 2026-08-08:**

- Toll-free customer-care number: `1800-419-8300`
- Balance enquiry by missed call: `7039035156`

**Correction shipped:**

- `customerCare`: `1800-221-908` → `1800-419-8300`
- `website`: `https://www.psbindia.com` → `https://punjabandsind.bank.in`
- The existing balance-enquiry number `7039035156` remains unchanged.

The prior record already noted that `1800-221-908` might be outdated. The old number was not present on the current official homepage during this verification. A Playwright regression assertion now pins the official customer-care number, website, and provenance URL.
