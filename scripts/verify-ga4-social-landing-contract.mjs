#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
const siteConfig = readFileSync(new URL('../src/lib/site-config.ts', import.meta.url), 'utf8');

// The measurement id is defined exactly once, in the shared config module,
// and Layout interpolates it — no hardcoded id may exist in the layout.
const idMatch = siteConfig.match(/GA4_MEASUREMENT_ID = '([A-Z0-9-]+)'/);
assert.ok(idMatch, 'GA4_MEASUREMENT_ID constant missing from src/lib/site-config.ts');
assert.equal((siteConfig.match(/GA4_MEASUREMENT_ID =/g) || []).length, 1, 'GA4 id must be defined exactly once');
const ga4Id = idMatch[1];

const gaBlock = source.match(/const ga4BootstrapScript = `([\s\S]*?)`\.trim\(\);/);
assert.ok(gaBlock, 'GA4 bootstrap script template not found in Layout.astro');

const body = gaBlock[1];

assert.ok(body.includes("gtag('config', '${GA4_MEASUREMENT_ID}')"), 'GA4 config call missing');
assert.ok(body.includes("gtag/js?id=${GA4_MEASUREMENT_ID}"), 'GA4 loader URL missing');
assert.ok(!/G-[A-Z0-9]{10}/.test(body), 'GA4 id must not be hardcoded in Layout.astro');

// The interpolated template must actually yield the configured id.
const rendered = body.replaceAll('${GA4_MEASUREMENT_ID}', ga4Id);

assert.ok(rendered.includes("if (window.location.hostname === 'balcheck.in' || window.location.hostname === 'www.balcheck.in') {"), 'Production hostname guard missing');
assert.ok(rendered.includes('try {'), 'URL param parsing try block missing');
assert.ok(/new URLSearchParams\(window\.location\.search\)/.test(rendered), 'URLSearchParams(window.location.search) missing');
assert.ok(/utm_medium/.test(rendered), 'utm_medium lookup missing');
assert.ok(rendered.includes("utmMedium.toLowerCase() === 'social'"), 'utm_medium case-insensitive check missing');

assert.ok(rendered.includes('landing_path: window.location.pathname'), 'landing_path must come from window.location.pathname');

const configIndex = rendered.indexOf(`gtag('config', '${ga4Id}')`);
const eventIndex = rendered.indexOf("gtag('event', 'social_landing'");
assert.ok(configIndex >= 0, 'GA config index not found');
assert.ok(eventIndex > configIndex, 'social_landing event must be emitted after gtag config');

const socialEventCalls = rendered.match(/gtag\(\s*'event'\s*,\s*'social_landing'\s*,/g) || [];
assert.equal(socialEventCalls.length, 1, 'social_landing event must be emitted exactly once');

const eventPayloadMatch = rendered.match(/gtag\(\s*'event'\s*,\s*'social_landing'\s*,\s*\{([\s\S]*?)\}\s*\)/);
assert.ok(eventPayloadMatch, 'social_landing event payload could not be parsed');

const payload = eventPayloadMatch[1];
const keyMatches = [...payload.matchAll(/^\s*([a-z_]+)\s*:/gm)].map((match) => match[1]);
const uniqueKeys = [...new Set(keyMatches)];
assert.deepEqual(uniqueKeys.sort(), ['landing_path', 'utm_campaign', 'utm_content', 'utm_source'].sort(), 'social_landing event payload keys mismatch');

assert.ok(!/dataLayer\(/.test(rendered), 'No custom dataLayer API usage outside gtag bridge');

// Behavioral contract: the built page must emit the configured id verbatim.
const distHome = new URL('../dist/index.html', import.meta.url);
if (existsSync(distHome)) {
  const html = readFileSync(distHome, 'utf8');
  assert.ok(html.includes(`gtag('config', '${ga4Id}')`), 'built page missing gtag config call');
  assert.ok(html.includes(`gtag/js?id=${ga4Id}`), 'built page missing gtag.js loader URL');
}

console.log('GA4 social_landing source contract checks passed.');
