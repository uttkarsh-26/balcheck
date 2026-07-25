#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const ZERO_SHA = /^0+$/u;

function git(args, cwd = process.cwd()) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function isArticleFile(filePath) {
  const normalized = filePath.split(/[\\/]/u).join(sep);
  const articleMarker = `src${sep}pages${sep}article${sep}`;
  const markerIndex = normalized.indexOf(articleMarker);
  if (markerIndex < 0) return false;
  const articleFile = normalized.slice(markerIndex + articleMarker.length);
  return articleFile.length > 0 && !articleFile.includes(sep) && articleFile.endsWith('.astro');
}

function resolveBaseRef(cwd = process.cwd()) {
  const configured = process.env.SUMMARY_BASE_REF?.trim();
  const eventName = process.env.GITHUB_EVENT_NAME?.trim();

  // GitHub uses an all-zero "before" SHA for a first push. It is not a real
  // commit and must not be replaced with the local parent commit.
  if (configured && ZERO_SHA.test(configured)) return null;

  if (configured && !ZERO_SHA.test(configured)) {
    try {
      return git(['rev-parse', '--verify', `${configured}^{commit}`], cwd);
    } catch {
      return null;
    }
  }

  // A manual dispatch has no event.before. Do not infer a commit range from
  // the checkout, because that could validate an unrelated local change.
  if (eventName === 'workflow_dispatch') return null;

  // For GitHub-triggered runs, an absent base is not a safe signal to infer.
  // Local invocations (with no event name) may use HEAD^ as a convenience.
  if (eventName) return null;

  try {
    const head = git(['rev-parse', '--verify', 'HEAD'], cwd);
    return git(['rev-parse', '--verify', `${head}^`], cwd);
  } catch {
    return null;
  }
}

function addedArticleFiles(cwd = process.cwd()) {
  const base = resolveBaseRef(cwd);
  if (!base) return { base: null, files: [] };

  try {
    const output = git(['diff', '--name-only', '--diff-filter=A', base, 'HEAD', '--', 'src/pages/article'], cwd);
    return { base, files: output.split('\n').filter((file) => file && isArticleFile(file)) };
  } catch {
    return { base, files: [] };
  }
}

function hasSummaryImport(source) {
  return /import\s+ScannableArticleSummary\s+from\s+['"][^'"]*ScannableArticleSummary\.astro['"]/u.test(source);
}

function splitFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match) return { frontmatter: '', body: source };
  return { frontmatter: match[1], body: source.slice(match[0].length) };
}

function stripComments(source) {
  return source
    .replace(/<!--[\s\S]*?-->/gu, '')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|\n)\s*\/\/.*(?=\n|$)/gu, '$1');
}

function renderedSummaryPosition(body) {
  return stripComments(body).search(/<ScannableArticleSummary\b[^>]*\/?>/u);
}

function firstLongFormHeadingPosition(body) {
  return stripComments(body).search(/<h2\b[^>]*>/iu);
}

export function validateArticleFile(filePath, cwd = process.cwd()) {
  const absolutePath = resolve(cwd, filePath);
  if (!isArticleFile(filePath) || !existsSync(absolutePath)) {
    return [`${filePath}: expected an existing src/pages/article/*.astro file`];
  }

  const source = readFileSync(absolutePath, 'utf8');
  const { frontmatter, body } = splitFrontmatter(source);
  const errors = [];
  if (!hasSummaryImport(frontmatter)) errors.push(`${filePath}: missing ScannableArticleSummary import`);

  const summaryPosition = renderedSummaryPosition(body);
  if (summaryPosition < 0) {
    errors.push(`${filePath}: missing rendered <ScannableArticleSummary usage`);
    return errors;
  }

  const firstH2Position = firstLongFormHeadingPosition(body);
  if (firstH2Position >= 0 && summaryPosition > firstH2Position) {
    errors.push(`${filePath}: ScannableArticleSummary must render before the first long-form <h2>`);
  }
  return errors;
}

export function checkFiles(filePaths, cwd = process.cwd()) {
  return filePaths.flatMap((filePath) => validateArticleFile(filePath, cwd));
}

function main() {
  const explicitFiles = process.argv.slice(2).filter((argument) => argument !== '--');
  const cwd = process.cwd();
  const selection = explicitFiles.length > 0 ? { base: 'explicit file arguments', files: explicitFiles } : addedArticleFiles(cwd);
  if (selection.files.length === 0) {
    console.log(`New article summary check: no added article files${selection.base ? ` (base ${selection.base})` : ''}`);
    return;
  }

  const errors = checkFiles(selection.files, cwd);
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }

  console.log(`New article summary check: ${selection.files.length} added article file(s) passed`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
