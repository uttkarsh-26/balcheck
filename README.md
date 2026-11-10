# BalCheck

[BalCheck.in](https://balcheck.in/) is a mobile-first Hindi directory for finding Indian banks’ balance-enquiry missed-call numbers and related banking-service information. Search for your bank on the site and check its instructions before calling; availability and registration requirements vary by bank.

**BalCheck is an independent information site, not a bank or an official bank service.** Numbers and instructions can change. Confirm details with your bank through its official website or branch before relying on them. Never share your account number, OTP, PIN or other banking details when reporting a correction.

## Data and corrections

The directory records live in [`src/data/banks.ts`](src/data/banks.ts). Their provenance can include official bank pages or historical corroboration from third-party directories; a recorded source is not always an official confirmation. Some records remain unverified where evidence was unavailable or insufficient. `lastVerified` is a past check date, not a guarantee that a number still works; checks of published sources do not necessarily include a live call. See the [bank-number authenticity audit](docs/audits/bank-number-authenticity-2026-09-18.md) and individual record notes for evidence and limitations.

To report an incorrect number or suggest a correction, use the [contact page](https://balcheck.in/contact/). Include the bank name, affected page or number, and a link to the bank's official source. Do not send personal or banking credentials. Contributors can also propose a change in this repository with the same evidence; new number claims should be checked against an official source and recorded with its URL.

## Local development

The site uses Astro, TypeScript and Tailwind CSS; GitHub Actions uses Node.js 22. From a clone of this repository:

```sh
npm ci
npm run dev
```

The development server normally runs at `http://localhost:4321/`. Other existing commands:

```sh
npm run build                    # Build the production site
npm run test:analytics-contract  # Check the analytics landing contract
npm test -- --project=chromium   # Run the Playwright Chromium suite
```

Playwright requires its Chromium browser; install it with `npx playwright install chromium` if needed. The suite may reuse a server already running on port 4321, so stop an old server or rebuild `dist/` before running it. Pushes to `main` normally run the repository's CI and deploy workflow; do not deploy manually.
