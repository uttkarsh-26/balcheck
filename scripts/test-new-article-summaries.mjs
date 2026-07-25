#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const checker = join(repoRoot, 'scripts', 'check-new-article-summaries.mjs');
const fixtureRoot = mkdtempSync(join(repoRoot, '.new-article-summary-check-'));
const articleRoot = join(fixtureRoot, 'src', 'pages', 'article');

function run(args = [], env = {}) {
  return execFileSync(process.execPath, [checker, ...args], {
    cwd: fixtureRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function runExpectFailure(args, env = {}) {
  try {
    run(args, env);
  } catch (error) {
    assert.equal(error.status, 1);
    return String(error.stderr ?? '');
  }
  assert.fail('expected the summary checker to fail');
}

try {
  mkdirSync(articleRoot, { recursive: true });
  const valid = join(articleRoot, 'valid.astro');
  const beforeH2 = join(articleRoot, 'before-h2.astro');
  const afterH2 = join(articleRoot, 'after-h2.astro');
  const importOnly = join(articleRoot, 'import-only.astro');
  const usageOnly = join(articleRoot, 'usage-only.astro');
  const importLine = "import ScannableArticleSummary from '../../components/ScannableArticleSummary.astro';";
  writeFileSync(valid, `---\n${importLine}\n---\n<nav aria-label="breadcrumb">Home</nav>\n<h1>Article title</h1>\n<ScannableArticleSummary summary="Verified summary" />\n`);
  writeFileSync(beforeH2, `---\n${importLine}\n---\n<nav aria-label="breadcrumb">Home</nav>\n<h1>Article title</h1>\n<p>Short introduction.</p>\n<ScannableArticleSummary summary="Verified summary" />\n<h2>First long-form section</h2>\n<p>Article body.</p>\n`);
  writeFileSync(afterH2, `---\n${importLine}\n---\n<nav aria-label="breadcrumb">Home</nav>\n<h1>Article title</h1>\n<h2>First long-form section</h2>\n<ScannableArticleSummary summary="Too late" />\n`);
  writeFileSync(importOnly, `---\nimport ScannableArticleSummary from '../../components/ScannableArticleSummary.astro';\n---\n<p>No summary component here.</p>\n`);
  writeFileSync(usageOnly, `---\n---\n<ScannableArticleSummary summary="Missing import" />\n`);

  assert.match(run([valid]), /1 added article file\(s\) passed/);
  assert.match(run([beforeH2]), /1 added article file\(s\) passed/);
  assert.match(runExpectFailure([afterH2]), /before the first long-form <h2>/);
  runExpectFailure([importOnly]);
  runExpectFailure([usageOnly]);

  execFileSync('git', ['init', '-q'], { cwd: fixtureRoot });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: fixtureRoot });
  execFileSync('git', ['config', 'user.name', 'Summary checker test'], { cwd: fixtureRoot });
  const existing = join(articleRoot, 'existing.astro');
  writeFileSync(existing, '<p>Existing article without the summary.</p>\n');
  execFileSync('git', ['add', '.'], { cwd: fixtureRoot });
  execFileSync('git', ['commit', '-qm', 'base'], { cwd: fixtureRoot });
  const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fixtureRoot, encoding: 'utf8' }).trim();
  writeFileSync(existing, '<p>Modified old article still without the summary.</p>\n');
  writeFileSync(join(articleRoot, 'new-valid.astro'), readFileSync(beforeH2));
  execFileSync('git', ['add', '.'], { cwd: fixtureRoot });
  execFileSync('git', ['commit', '-qm', 'new articles'], { cwd: fixtureRoot });
  assert.match(run([], { SUMMARY_BASE_REF: base, GITHUB_EVENT_NAME: 'push' }), /1 added article file\(s\) passed/);
  assert.match(run([], { SUMMARY_BASE_REF: base, GITHUB_EVENT_NAME: 'pull_request' }), /1 added article file\(s\) passed/);

  writeFileSync(join(articleRoot, 'new-invalid.astro'), readFileSync(afterH2));
  execFileSync('git', ['add', '.'], { cwd: fixtureRoot });
  execFileSync('git', ['commit', '-qm', 'bad new article'], { cwd: fixtureRoot });
  const zeroSha = '0'.repeat(40);
  assert.match(run([], { SUMMARY_BASE_REF: zeroSha, GITHUB_EVENT_NAME: 'push' }), /no added article files/);
  assert.match(run([], { SUMMARY_BASE_REF: '', GITHUB_EVENT_NAME: 'workflow_dispatch' }), /no added article files/);
  assert.match(
    runExpectFailure([], { SUMMARY_BASE_REF: '', GITHUB_EVENT_NAME: '' }),
    /new-invalid\.astro: ScannableArticleSummary must render before the first long-form <h2>/,
  );

  console.log('New article summary checker: placement, event-base, modified-old, and added-new cases passed');
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
