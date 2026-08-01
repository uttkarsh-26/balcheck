#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');

const gaBlock = source.match(/if \(window\.location\.hostname === 'balcheck\.in' \|\| window\.location\.hostname === 'www\.balcheck\.in'\) \{([\s\S]*?)\n\s*<\/script>/);
assert.ok(gaBlock, 'Production GA block not found in Layout.astro');

const body = gaBlock[1];

assert.ok(body.includes("gtag('config', 'G-ZEL0FEF89W');"), 'GA4 config call missing');
assert.ok(body.includes("try {"), 'URL param parsing try block missing');
assert.ok(/new URLSearchParams\(window\.location\.search\)/.test(body), 'URLSearchParams(window.location.search) missing');
assert.ok(/utm_medium/.test(body), 'utm_medium lookup missing');
assert.ok(body.includes("utmMedium.toLowerCase() === 'social'"), 'utm_medium case-insensitive check missing');

assert.ok(body.includes("landing_path: window.location.pathname"), 'landing_path must come from window.location.pathname');

const configIndex = body.indexOf("gtag('config', 'G-ZEL0FEF89W');");
const eventIndex = body.indexOf("gtag('event', 'social_landing'");
assert.ok(configIndex >= 0, 'GA config index not found');
assert.ok(eventIndex > configIndex, 'social_landing event must be emitted after gtag config');

const socialEventCalls = body.match(/gtag\(\s*'event'\s*,\s*'social_landing'\s*,/g) || [];
assert.equal(socialEventCalls.length, 1, 'social_landing event must be emitted exactly once');

const eventPayloadMatch = body.match(/gtag\(\s*'event'\s*,\s*'social_landing'\s*,\s*\{([\s\S]*?)\}\s*\)/);
assert.ok(eventPayloadMatch, 'social_landing event payload could not be parsed');

const payload = eventPayloadMatch[1];
const keyMatches = [...payload.matchAll(/^\s*([a-z_]+)\s*:/gm)].map((match) => match[1]);
const uniqueKeys = [...new Set(keyMatches)];
assert.deepEqual(uniqueKeys.sort(), ['landing_path', 'utm_campaign', 'utm_content', 'utm_source'].sort(), 'social_landing event payload keys mismatch');

assert.ok(!/dataLayer\(/.test(body), 'No custom dataLayer API usage outside gtag bridge');

console.log('GA4 social_landing source contract checks passed.');
