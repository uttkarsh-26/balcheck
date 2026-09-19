#!/usr/bin/env node
/**
 * scripts/audit-number-authenticity.mjs
 *
 * Offline Phase 0 re-run of the 2026-09-18 bank-number authenticity audit.
 * Companion document: docs/audits/bank-number-authenticity-2026-09-18.md
 *
 * WHAT THIS SCRIPT DOES (all local, read-only, no network):
 *   check 1  field-format-validation   every missedCall / missedCallAlt / customerCare
 *                                      matches a known Indian number shape
 *   check 2  collision-matrix          digit-normalized duplicates inside a field and
 *                                      across fields (bank A missedCall == bank B customerCare)
 *   check 3  missed-call-equals-care   records whose two numbers normalize to the same
 *                                      digits, plus balanceMode consistency
 *   check 4  provenance-and-staleness  verified records with no verificationSource /
 *                                      lastVerified, and records not verified recently
 *   check 5  dist-parity               dist/ HTML reflects src/data/banks.ts (stored
 *                                      numbers rendered, route families present, and the
 *                                      shortlist of rendered numbers that are not fields)
 *
 * WHAT THIS SCRIPT DELIBERATELY DOES NOT DO:
 *   The three network tiers of the original audit are stubs (see the STUBS section at the
 *   bottom). They fetched official pages, ran a headless browser, and queried a search
 *   index. They are documented, not executed, so this script stays offline and exits 0.
 *   Their raw results live in /tmp/bc-audit/{phase1,browser,tier3}.jsonl and the verdicts
 *   derived from them are frozen in the companion report.
 *
 * EXIT CODES:
 *   0  checks ran (regardless of pass/fail counts; this script never writes anything)
 *   1  internal failure: src/data/banks.ts could not be parsed, so results would be unsound
 *
 * Usage: node scripts/audit-number-authenticity.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BANKS_TS = join(ROOT, 'src', 'data', 'banks.ts');
const DIST = join(ROOT, 'dist');

/** Audit reference date — every staleness comparison is relative to this, not to `now`,
 *  so the check is reproducible instead of drifting with the clock. */
const AUDIT_DATE = '2026-09-18';
const STALE_DAYS = 120;

const digits = (v) => String(v ?? '').replace(/\D/g, '');

/** Canonical form used for equality: strip a leading 0 / 91 country code. */
const canon = (v) => {
  let d = digits(v).replace(/^0+/, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  return d;
};

// ---------------------------------------------------------------------------------------
// number-shape patterns (accepted buckets + which of them are canonical)
// ---------------------------------------------------------------------------------------
const SHAPES = [
  { name: 'mobile10', re: /^[6-9]\d{9}$/, canonical: true },
  { name: 'mobile11-0prefix', re: /^0[6-9]\d{9}$/, canonical: true },
  { name: 'tollfree-1800', re: /^1800\d{4,9}$/, canonical: (d) => d.length === 11 },
  { name: 'tollfree-1860', re: /^1860\d{4,9}$/, canonical: (d) => d.length === 11 },
  { name: 'tollfree-180x', re: /^180\d{7,9}$/, canonical: true },
  { name: 'landline-std', re: /^0\d{2,4}\d{6,8}$/, canonical: true },
  { name: 'short-code', re: /^18\d{2,4}$/, canonical: true },
];

function classify(raw) {
  const d = digits(raw);
  for (const s of SHAPES) {
    if (s.re.test(d)) return { bucket: s.name, digits: d, canonical: typeof s.canonical === 'function' ? s.canonical(d) : s.canonical };
  }
  return { bucket: `UNRECOGNIZED(len${d.length})`, digits: d, canonical: false };
}

// ---------------------------------------------------------------------------------------
// src/data/banks.ts parser (no TypeScript toolchain — the file is a literal array)
// ---------------------------------------------------------------------------------------
function parseBanksTs(text) {
  const start = text.indexOf('const bankData');
  const end = text.indexOf('export const banks');
  if (start < 0 || end < 0) throw new Error('bankData array boundary not found in banks.ts');
  const body = text.slice(start, end);
  const str = (block, key) => {
    const m = block.match(new RegExp(`${key}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`, 's'));
    if (!m) return undefined;
    const v = m[1] !== undefined ? m[1] : m[2];
    return v.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  };
  const records = [];
  const blockRe = /\n  \{\n([\s\S]*?)\n  \},/g;
  let m;
  while ((m = blockRe.exec(body)) !== null) {
    const b = m[1];
    const slug = str(b, 'slug');
    if (!slug) continue;
    const missedCall = str(b, 'missedCall');
    const customerCare = str(b, 'customerCare');
    const explicitMode = str(b, 'balanceMode');
    records.push({
      slug,
      name: str(b, 'name'),
      category: str(b, 'category'),
      missedCall,
      missedCallAlt: str(b, 'missedCallAlt'),
      customerCare,
      website: str(b, 'website'),
      notes: str(b, 'notes'),
      verified: /verified:\s*true/.test(b),
      verificationSource: str(b, 'verificationSource'),
      lastVerified: str(b, 'lastVerified'),
      // banks.ts derives balanceMode when it is not stored explicitly
      balanceMode: explicitMode ?? (digits(missedCall) === digits(customerCare) ? 'customer-care' : 'missed-call'),
      explicitMode: explicitMode ?? null,
    });
  }
  return records;
}

// ---------------------------------------------------------------------------------------
// checks
// ---------------------------------------------------------------------------------------
const results = [];
function record(id, label, pass, fail, warns = [], notes = []) {
  results.push({ id, label, pass, fail, warns, notes });
}

function checkFormat(banks) {
  const warns = [];
  let pass = 0;
  let fail = 0;
  for (const b of banks) {
    let bad = false;
    for (const f of ['missedCall', 'missedCallAlt', 'customerCare']) {
      const raw = b[f];
      if (!raw) continue;
      const c = classify(raw);
      if (c.bucket.startsWith('UNRECOGNIZED')) {
        bad = true;
        warns.push(`FAIL ${b.slug}.${f}='${raw}' -> ${c.bucket}`);
      } else if (!c.canonical) {
        warns.push(`${b.slug}.${f}='${raw}' -> ${c.bucket} (${c.digits.length} digits, non-canonical shape)`);
      }
    }
    if (bad) fail += 1; else pass += 1;
  }
  record('1', 'field-format-validation', pass, fail, warns);
}

function checkCollisions(banks) {
  const warns = [];
  let collisions = 0;
  for (const f of ['missedCall', 'missedCallAlt', 'customerCare']) {
    const idx = new Map();
    for (const b of banks) {
      const raw = b[f];
      if (!raw) continue;
      const d = canon(raw);
      if (!idx.has(d)) idx.set(d, []);
      idx.get(d).push(b.slug);
    }
    for (const [d, slugs] of idx) {
      if (slugs.length > 1) {
        collisions += 1;
        warns.push(`${f} ${d} shared by ${slugs.join(', ')}`);
      }
    }
  }
  // cross-field: missedCall of one record == customerCare of a different record
  const byMissed = new Map();
  const byCare = new Map();
  for (const b of banks) {
    const a = canon(b.missedCall);
    const c = canon(b.customerCare);
    if (!byMissed.has(a)) byMissed.set(a, []);
    byMissed.get(a).push(b.slug);
    if (!byCare.has(c)) byCare.set(c, []);
    byCare.get(c).push(b.slug);
  }
  let cross = 0;
  for (const [d, slugs] of byMissed) {
    const other = byCare.get(d);
    if (!other) continue;
    if (slugs.every((s) => other.includes(s))) continue; // same record, handled by check 3
    cross += 1;
    warns.push(`cross-field ${d}: missedCall of ${slugs.join(', ')} == customerCare of ${other.join(', ')}`);
  }
  const totalValues = new Set(banks.flatMap((b) => ['missedCall', 'missedCallAlt', 'customerCare'].filter((f) => b[f]).map((f) => `${f}:${canon(b[f])}`))).size;
  record('2', 'collision-matrix', totalValues - collisions, collisions + cross, warns, [
    `${totalValues} distinct field values, ${collisions} in-field collision values, ${cross} cross-field collisions`,
  ]);
}

function checkMissedCallEqualsCare(banks) {
  const warns = [];
  let clean = 0;
  let equal = 0;
  let modeErrors = 0;
  for (const b of banks) {
    if (digits(b.missedCall) === digits(b.customerCare)) {
      equal += 1;
      const ok = b.balanceMode === 'customer-care';
      if (!ok) modeErrors += 1;
      warns.push(
        `${b.slug}: missedCall == customerCare == ${digits(b.missedCall)} ` +
        `(balanceMode=${b.balanceMode}${ok ? ', legit customer-care-only line' : ', CONTRADICTS the derivation rule in banks.ts'})`
      );
    } else {
      clean += 1;
    }
  }
  record('3', 'missed-call-equals-customer-care', clean, equal, warns, [
    `${equal} records share one number for both fields; ${modeErrors} of them contradict the balanceMode derivation rule`,
  ]);
}

function checkProvenance(banks) {
  const warns = [];
  let ok = 0;
  let documentedUnverified = 0;
  let failed = 0;
  let missingSource = 0;
  let stale = 0;
  const ref = new Date(`${AUDIT_DATE}T00:00:00Z`);
  for (const b of banks) {
    const hasReceipt = Boolean(b.verificationSource);
    // A receipt is not a verification. A record whose audit verdict found no
    // evidence (NO_SUPPORT / SITE_BLOCKED) is expected to be verified:false and
    // to carry NO lastVerified — its receipt documents the failed attempt, and
    // its pages must not print a verification date. Counting that honest state
    // as a problem ("verified is not true") would push future runs to stamp a
    // verification date on records nobody verified.
    if (b.verified !== true) {
      if (hasReceipt) documentedUnverified += 1;
      else {
        failed += 1;
        warns.push(`${b.slug}: verified is not true and no verificationSource documents the attempt`);
      }
      continue;
    }
    const problems = [];
    if (!hasReceipt) problems.push('verified:true but no verificationSource');
    if (!b.lastVerified) problems.push('verified:true but no lastVerified');
    if (b.lastVerified) {
      const days = Math.round((ref - new Date(`${b.lastVerified}T00:00:00Z`)) / 86400000);
      if (Number.isFinite(days) && days > STALE_DAYS) {
        problems.push(`lastVerified ${b.lastVerified} is ${days} days before ${AUDIT_DATE}`);
        stale += 1;
      }
    }
    if (problems.length) {
      failed += 1;
      if (!b.verificationSource) missingSource += 1;
      warns.push(`${b.slug}: ${problems.join('; ')}`);
    } else {
      ok += 1;
    }
  }
  record('4', 'provenance-and-staleness', ok + documentedUnverified, failed, warns.slice(0, 12).concat(warns.length > 12 ? [`... +${warns.length - 12} more`] : []), [
    `${documentedUnverified} records are verified:false with a receipt documenting the audit attempt (NO_SUPPORT / SITE_BLOCKED) — a receipt is not a verification`,
    `${missingSource} records claim verified:true with no verificationSource; ${stale} records older than ${STALE_DAYS} days`,
    `lastVerified present on ${banks.filter((b) => b.lastVerified).length}/${banks.length} records; verified:true on ${banks.filter((b) => b.verified === true).length}/${banks.length}`,
  ]);
}

function checkDistParity(banks) {
  if (!existsSync(DIST)) {
    record('5', 'dist-parity', 0, banks.length, [], ['dist/ not present — skipped (build first to run this check)']);
    return;
  }
  const pageFiles = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) pageFiles.push(p);
    }
  };
  walk(DIST);
  const rel = (p) => p.slice(DIST.length);
  const stored = new Set();
  for (const b of banks) {
    for (const f of ['missedCall', 'missedCallAlt', 'customerCare']) if (b[f]) stored.add(canon(b[f]));
  }
  const stripText = (html) =>
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ');
  const FAMILY = /^\/(index\.html|bank|missed-call|merged-banks|number-lookup|toll-free-number|customer-care|balance-enquiry|net-banking|sms-banking|mini-statement|mobile-number-registration|aadhaar-link|atm-pin)\//;
  const TOKEN = /^[\d\-+()]+$/;

  const warns = [];
  const notes = [];
  let pass = 0;
  let fail = 0;

  // 5a: the /bank/<slug>/ page must exist and render the record's own numbers
  for (const b of banks) {
    const page = join(DIST, 'bank', b.slug, 'index.html');
    if (!existsSync(page)) {
      fail += 1;
      warns.push(`${b.slug}: dist/bank/${b.slug}/index.html missing`);
      continue;
    }
    const html = readFileSync(page, 'utf8');
    const bare = digits(html);
    const problems = [];
    if (!bare.includes(digits(b.missedCall))) problems.push(`missedCall ${b.missedCall} not rendered`);
    if (!bare.includes(digits(b.customerCare)) && !bare.includes(canon(b.customerCare))) problems.push(`customerCare ${b.customerCare} not rendered`);
    const expectRoute = b.balanceMode === 'missed-call';
    const hasRoute = existsSync(join(DIST, 'missed-call', b.slug, 'index.html'));
    if (expectRoute !== hasRoute) problems.push(`dist/missed-call/${b.slug} presence=${hasRoute} but balanceMode=${b.balanceMode}`);
    if (problems.length) {
      fail += 1;
      warns.push(`${b.slug}: ${problems.join('; ')}`);
    } else {
      pass += 1;
    }
  }

  // 5b: rendered numbers that are not fields in banks.ts (manual-review shortlist)
  const unknown = new Map();
  let scanned = 0;
  for (const p of pageFiles) {
    const r = rel(p);
    if (!(FAMILY.test(r) || r === '/index.html')) continue;
    scanned += 1;
    const toks = stripText(readFileSync(p, 'utf8')).split(' ');
    for (const t of toks) {
      if (!TOKEN.test(t)) continue;
      const c = canon(t);
      if (c.length < 8 || c.length > 12) continue;
      if (stored.has(c)) continue;
      if (!unknown.has(c)) unknown.set(c, new Set());
      unknown.get(c).add(r.split('/')[1]);
    }
  }
  notes.push(`dist HTML pages: ${pageFiles.length}; route/index pages scanned: ${scanned}`);
  notes.push(`canonical stored numbers: ${stored.size}`);
  notes.push(`rendered numbers not in banks.ts: ${unknown.size} distinct values (mostly merger dates and alternate numbers quoted in notes prose)`);
  const top = [...unknown.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 8);
  for (const [v, fams] of top) notes.push(`  unknown: ${v} in ${fams.size} route family(ies)`);
  record('5', 'dist-parity', pass, fail, warns.slice(0, 10), notes);
}

// ---------------------------------------------------------------------------------------
// STUBS — the network tiers of the 2026-09-18 run. Not executed here (offline, read-only).
// Raw outputs: /tmp/bc-audit/{phase1,browser,tier3}.jsonl ; verdicts: companion report.
// ---------------------------------------------------------------------------------------
const STUBS = [
  {
    id: 'T1',
    name: 'phase1-official-page-fetch',
    source: '/tmp/bc-audit/phase1.py, phase1_run.py, fetch_lib.py',
    would: 'GET the stored website + candidate inner pages (/customer-care, /contact-us, /missed-call-*, /grievance-redressal), '
      + 'regex-match each field with digit normalization, record per-page status/length and per-field found{url,context,match}.',
    yields: 'verdict CONFIRMED / PARTIAL / NO_MATCH per record with the exact official URL that carried the number',
    gate: 'network + per-host TLS; 403/TLS failures are real findings, not script errors',
  },
  {
    id: 'T2',
    name: 'browser-tier-fetch',
    source: '/tmp/bc-audit/browser_audit.mjs, verify2.mjs, deep.mjs, targeted.mjs',
    would: 'drive a headless browser over the records Phase 1 could not settle (client-rendered pages, '
      + 'TLS-blocked curl hosts, download-triggered navigations), capturing rendered text length per page.',
    yields: 'verdict CONFIRMED / PARTIAL / NO_MATCH with a per-page fetch log; this is the authority for reachability',
    gate: 'headless browser + network; weblive.txt https 000 results are curl artifacts and must not substitute for this tier',
  },
  {
    id: 'T3',
    name: 'tier3-search-index-crosscheck',
    source: '/tmp/bc-audit/tier3.py (SearXNG search + page verification)',
    would: 'query a search index for each leftover (field, number) pair, split hits into official vs aggregator hosts, '
      + 'then re-fetch candidate pages to keep only verified_pages[] carried hits.',
    yields: 'verdict AGGREGATOR_ONLY / OFFICIAL_INDEX_HIT / OFFICIAL_INDEX_HIT_CARE_ONLY / WEAK_AGGREGATOR_ONLY / NOT_INDEXED',
    gate: 'network; build official_hosts from the record\'s own host set, never from notes prose '
      + '(the 2026-09-18 run misclassified boi/axis aggregator hits as official that way)',
  },
];

// ---------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------
function main() {
  if (!existsSync(BANKS_TS)) {
    console.error(`FATAL: ${BANKS_TS} not found. Run from a balcheck checkout.`);
    process.exit(1);
  }
  let banks;
  try {
    banks = parseBanksTs(readFileSync(BANKS_TS, 'utf8'));
  } catch (err) {
    console.error(`FATAL: could not parse src/data/banks.ts — ${err.message}`);
    console.error('Refusing to report counts from a partial parse.');
    process.exit(1);
  }
  if (!banks.length) {
    console.error('FATAL: parsed 0 bank records from src/data/banks.ts.');
    process.exit(1);
  }

  console.log('balcheck — bank number authenticity audit (Phase 0, offline)');
  console.log(`repo: ${ROOT}`);
  console.log(`audit date: ${AUDIT_DATE} | records parsed from src/data/banks.ts: ${banks.length}`);
  console.log('');

  checkFormat(banks);
  checkCollisions(banks);
  checkMissedCallEqualsCare(banks);
  checkProvenance(banks);
  checkDistParity(banks);

  for (const r of results) {
    console.log(`=== check ${r.id}: ${r.label} ===`);
    console.log(`  pass ${r.pass}  fail ${r.fail}  notes ${r.warns.length}`);
    for (const n of r.notes) console.log(`  note: ${n}`);
    for (const w of r.warns) console.log(`  - ${w}`);
    console.log('');
  }

  console.log('=== external tiers (stubs — not executed, offline mode) ===');
  for (const s of STUBS) {
    console.log(`  [${s.id}] ${s.name} — SKIPPED`);
    console.log(`     wrapper of: ${s.source}`);
    console.log(`     would: ${s.would}`);
    console.log(`     yields: ${s.yields}`);
    console.log(`     gate: ${s.gate}`);
  }
  console.log('');

  const totalPass = results.reduce((a, r) => a + r.pass, 0);
  const totalFail = results.reduce((a, r) => a + r.fail, 0);
  const w = 34;
  console.log('=== summary: per-check pass/fail ===');
  console.log(`${'check'.padEnd(w)}${'pass'.padStart(6)}${'fail'.padStart(6)}${'warn'.padStart(6)}`);
  for (const r of results) console.log(`${(`${r.id} ${r.label}`).padEnd(w)}${String(r.pass).padStart(6)}${String(r.fail).padStart(6)}${String(r.warns.length).padStart(6)}`);
  console.log(`${'TOTAL'.padEnd(w)}${String(totalPass).padStart(6)}${String(totalFail).padStart(6)}`);
  console.log('');
  console.log('read-only: no file was written, no network call made, no build run.');
  console.log('external fetch tiers: 3 stubs documented above (phase1 / browser / tier3 not executed).');
  process.exit(0);
}

main();
