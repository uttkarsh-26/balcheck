#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = mkdtempSync(join(repoRoot, '.scannable-article-summary-'));
const componentsPath = join(fixtureRoot, 'src', 'components');
const pagesPath = join(fixtureRoot, 'src', 'pages');

const validBrief = {
  summary: 'PM Kisan status is checked on the official portal after the latest verified payment update.',
  facts: [1, 2, 3, 4, 5].map((index) => ({ label: `Fact ${index}`, value: `Value ${index}` })),
  timeline: [
    { date: '28 February 2026', text: 'The verified update was published.', datetime: '2026-02-28' },
    { date: '1 March 2026', text: 'The portal reflected the update.', datetime: '2026-03-01T09:30:00Z' },
  ],
  action: {
    title: 'Next steps',
    steps: ['Check the official portal', 'Review the displayed status'],
    officialUrl: 'https://pmkisan.gov.in',
    officialLabel: 'Official source',
  },
  details: { title: 'Why this matters', body: 'This context is sourced from the verified update.' },
};

function writeFixture(briefs) {
  const entries = briefs.map((brief, index) => `const brief${index} = ${JSON.stringify(brief)};`).join('\n');
  const usages = briefs.map((_, index) => `<ScannableArticleSummary {...brief${index}} />`).join('\n');
  writeFileSync(join(pagesPath, 'index.astro'), `---\nimport ScannableArticleSummary from '../components/ScannableArticleSummary.astro';\n\n${entries}\n---\n${usages}\n`);
}

function build(outputPath) {
  try {
    execFileSync('npx', ['--no-install', 'astro', 'build', '--root', fixtureRoot, '--outDir', outputPath], {
      cwd: repoRoot,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return { status: 0, output: '' };
  } catch (error) {
    return { status: error.status ?? 1, output: `${error.stdout ?? ''}\n${error.stderr ?? ''}` };
  }
}

try {
  mkdirSync(pagesPath, { recursive: true });
  writeFileSync(join(fixtureRoot, '.gitignore'), '');
  writeFileSync(join(fixtureRoot, 'src', '.gitkeep'), '');
  symlinkSync(join(repoRoot, 'src', 'components'), componentsPath, 'dir');

  const stepOnlyBrief = {
    summary: 'This summary checks that an action with steps but no official link still renders.',
    action: { title: 'Step-only action', steps: ['Complete the first check'] },
  };
  const officialLinkOnlyBrief = {
    summary: 'This summary checks that an official link can render without action steps.',
    action: { title: 'Official portal', officialUrl: 'https://pmkisan.gov.in', officialLabel: 'Open official portal' },
  };
  const unsafeBrief = {
    summary: 'This second summary checks that unsafe official links are not rendered.',
    action: { title: 'Unsafe link', steps: [], officialUrl: 'javascript:alert(1)' },
  };

  writeFixture([validBrief, stepOnlyBrief, officialLinkOnlyBrief, unsafeBrief]);
  const validBuild = build(join(fixtureRoot, 'valid-dist'));
  assert.equal(validBuild.status, 0, `valid synthetic component build failed:\n${validBuild.output}`);
  const html = readFileSync(join(fixtureRoot, 'valid-dist', 'index.html'), 'utf8');
  assert.match(html, /PM Kisan status is checked on the official portal/);
  assert.match(html, /href="https:\/\/pmkisan\.gov\.in\/"/);
  assert.match(html, /datetime="2026-03-01T09:30:00Z"/);
  assert.match(html, /Step-only action/);
  assert.match(html, /Complete the first check/);
  assert.match(html, /Official portal/);
  assert.match(html, /Open official portal/);
  assert.doesNotMatch(html, /javascript:alert/);

  const malformedBriefs = [
    { name: 'null-fact', brief: { ...validBrief, facts: [null] }, message: 'facts[0] must be a non-null object' },
    { name: 'empty-fact-label', brief: { ...validBrief, facts: [{ label: '', value: 'Value' }] }, message: 'facts[0].label must be a non-empty string' },
    { name: 'null-timeline-event', brief: { ...validBrief, timeline: [null] }, message: 'timeline[0] must be a non-null object' },
    { name: 'empty-timeline-date', brief: { ...validBrief, timeline: [{ date: '', text: 'Text' }] }, message: 'timeline[0].date must be a non-empty string' },
    { name: 'null-action', brief: { ...validBrief, action: null }, message: 'action must be a non-null object' },
    { name: 'non-string-official-url', brief: { ...validBrief, action: { title: 'Action', officialUrl: 123 } }, message: 'action.officialUrl must be a string when supplied' },
    { name: 'null-details', brief: { ...validBrief, details: null }, message: 'details must be a non-null object' },
  ];

  for (const [index, malformed] of malformedBriefs.entries()) {
    writeFixture([malformed.brief]);
    const result = build(join(fixtureRoot, `invalid-${index}-dist`));
    assert.notEqual(result.status, 0, `${malformed.name}: invalid component build unexpectedly passed`);
    assert.match(result.output, /ScannableArticleSummary contract violation/);
    assert.match(result.output, new RegExp(malformed.message.replace(/[.[\]\\]/gu, '\\$&')));
    assert.doesNotMatch(result.output, /TypeError/);
  }

  console.log(`ScannableArticleSummary component integration: valid render plus ${malformedBriefs.length} malformed rejection cases passed`);
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
