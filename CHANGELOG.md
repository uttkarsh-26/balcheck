# Changelog

All notable changes to this repository are recorded here, newest first.

## [Unreleased]

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
