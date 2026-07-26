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
const validOutput = join(fixtureRoot, 'valid-dist');
const invalidOutput = join(fixtureRoot, 'invalid-dist');

function writeFixture(summary, includeUnsafe = false) {
  writeFileSync(join(pagesPath, 'index.astro'), `---
import ScannableArticleSummary from '../components/ScannableArticleSummary.astro';

const articleBrief = {
  summary: ${JSON.stringify(summary)},
  facts: [1, 2, 3, 4, 5].map((index) => ({ label: \`Fact \${index}\`, value: \`Value \${index}\` })),
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
  details: {
    title: 'Why this matters',
    body: 'This context is sourced from the verified update.',
  },
};

const stepOnlyBrief = {
  summary: 'This summary checks that an action with steps but no official link still renders.',
  action: {
    title: 'Step-only action',
    steps: ['Complete the first check'],
  },
};

const officialLinkOnlyBrief = {
  summary: 'This summary checks that an official link can render without action steps.',
  action: {
    title: 'Official portal',
    officialUrl: 'https://pmkisan.gov.in',
    officialLabel: 'Open official portal',
  },
};

${includeUnsafe ? `
const unsafeBrief = {
  summary: 'This summary checks that unsafe official links are rejected.',
  action: { title: 'Unsafe link', steps: [], officialUrl: 'javascript:alert(1)' },
};
` : ''}
---

<ScannableArticleSummary {...articleBrief} />
<ScannableArticleSummary {...stepOnlyBrief} />
<ScannableArticleSummary {...officialLinkOnlyBrief} />
${includeUnsafe ? '<ScannableArticleSummary {...unsafeBrief} />' : ''}
`);
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
  writeFixture('PM Kisan status is checked on the official portal after the latest verified payment update.');

  const validBuild = build(validOutput);
  assert.equal(validBuild.status, 0, `valid synthetic component build failed:\n${validBuild.output}`);
  const html = readFileSync(join(validOutput, 'index.html'), 'utf8');
  assert.match(html, /PM Kisan status is checked on the official portal/);
  assert.match(html, /href="https:\/\/pmkisan\.gov\.in\/"/);
  assert.match(html, /datetime="2026-03-01T09:30:00Z"/);
  assert.match(html, /Step-only action/);
  assert.match(html, /Complete the first check/);
  assert.match(html, /Official portal/);
  assert.match(html, /Open official portal/);
  assert.match(html, /href="https:\/\/pmkisan\.gov\.in\/"/);
  assert.match(html, /Why this matters/);
  assert.match(html, /This context is sourced from the verified update/);
  assert.doesNotMatch(html, /javascript:alert/);

  writeFixture(Array.from({ length: 36 }, (_, index) => `word${index + 1}`).join(' '));
  const invalidBuild = build(invalidOutput);
  assert.notEqual(invalidBuild.status, 0, 'invalid synthetic component build unexpectedly passed');
  assert.match(invalidBuild.output, /summary must contain at most 35 words/);

  writeFixture('This summary checks that unsafe official links fail the component contract.', true);
  const unsafeBuild = build(join(fixtureRoot, 'unsafe-dist'));
  assert.notEqual(unsafeBuild.status, 0, 'unsafe official URL unexpectedly passed component build');
  assert.match(unsafeBuild.output, /action\.officialUrl must be a safe absolute HTTPS URL without credentials/);

  console.log('ScannableArticleSummary component integration: valid render plus invalid summary and URL rejection passed');
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
