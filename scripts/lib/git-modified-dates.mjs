// Node-only helper that derives real sitemap <lastmod> values from git history.
//
// Why: balcheck's sitemap emitted zero <lastmod> (audit 2026-09-19: 879 URLs, 0
// lastmod) while kiststatus.in derives them from git. A sitemap that never says
// when a page changed gives search engines no freshness signal — but a build
// date stamped on every URL is worse (rolameter's audit already showed Google
// treats a uniform fabricated lastmod as a false freshness signal).
//
// So each URL gets the committer date of the last commit that touched either its
// route template (src/pages/**.astro) or the data module that template reads
// (src/data/**, src/lib/** — content sources, never presentation components,
// which would smear one CSS tweak across every URL). Nothing is emitted when git
// cannot answer: no fabricated dates.
//
// This module must only ever be imported from the Node build process
// (astro.config.mjs). It shells out to git and must never reach the Worker
// bundle. Requires full history: CI checks out with `fetch-depth: 0`.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pagesRoot = join(repoRoot, 'src', 'pages');

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.json'];
// Content sources only. Component/layout edits change every page's markup, so
// folding them in would give the whole sitemap one date again.
const CONTENT_SOURCE_RE = /^src\/(data|lib)\//;

let gitRepoPresent;
const gitDateCache = new Map();
const dependencyCache = new Map();

function gitAvailable() {
  if (gitRepoPresent === undefined) gitRepoPresent = existsSync(join(repoRoot, '.git'));
  return gitRepoPresent;
}

/**
 * Committer date (YYYY-MM-DD) of the last commit that touched `absPath`, or null
 * when git history cannot answer (no repo, shallow clone, untracked file).
 */
export function gitLastModified(absPath) {
  if (gitDateCache.has(absPath)) return gitDateCache.get(absPath);

  let date = null;
  if (gitAvailable()) {
    try {
      const path = relative(repoRoot, absPath).split('\\').join('/');
      const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', path], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (DATE_ONLY_RE.test(out)) date = out;
    } catch {
      date = null;
    }
  }

  gitDateCache.set(absPath, date);
  return date;
}

function newest(dates) {
  let best = null;
  for (const date of dates) {
    if (!date || !DATE_ONLY_RE.test(date)) continue;
    if (!best || date > best) best = date;
  }
  return best;
}

function resolveModule(base) {
  const candidates = [base, ...MODULE_EXTENSIONS.map((ext) => base + ext)];
  candidates.push(...MODULE_EXTENSIONS.map((ext) => join(base, `index${ext}`)));
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

/** Content-source modules a file reads, transitively (depth-limited). */
function contentDependencies(file, depth = 0) {
  if (depth > 3) return [];
  if (dependencyCache.has(file)) return dependencyCache.get(file);

  const dependencies = [];
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const resolved = resolveModule(resolve(dirname(file), match[1]));
    if (!resolved) continue;
    if (!CONTENT_SOURCE_RE.test(relative(repoRoot, resolved).split('\\').join('/'))) continue;
    dependencies.push(resolved, ...contentDependencies(resolved, depth + 1));
  }

  dependencyCache.set(file, dependencies);
  return dependencies;
}

function pageFiles(directory = pagesRoot) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return pageFiles(full);
    return entry.isFile() && entry.name.endsWith('.astro') ? [full] : [];
  });
}

/** `/bank/[slug]/` — leading and trailing slash, matching trailingSlash: 'always'. */
function routePattern(file) {
  const relativePath = relative(pagesRoot, file).split('\\').join('/').replace(/\.astro$/, '');
  // `index.astro` is the directory route itself (/), not /index/.
  const route = `/${relativePath.replace(/(^|\/)index$/, '')}`;
  return route === '/' ? '/' : `${route}/`;
}

/**
 * Route pattern → 'YYYY-MM-DD' for every page template git has history for.
 * Dynamic routes keep their `[param]` placeholders (the template's own date is
 * the honest answer: the same file renders every one of those URLs).
 */
export function buildRouteLastmodTable() {
  const table = [];
  for (const file of pageFiles()) {
    const date = newest([gitLastModified(file), ...contentDependencies(file).map(gitLastModified)]);
    if (date) table.push({ pattern: routePattern(file), date });
  }
  return table;
}

/** Real lastmod for a full page URL, or null when git could not answer. */
export function lastmodForUrl(url, table) {
  const { pathname } = new URL(url);
  let best = null;
  for (const { pattern, date } of table) {
    const matches = pattern.includes('[')
      ? new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\[[^\]]+\\\]/g, '[^/]+')}$`).test(pathname)
      : pattern === pathname;
    if (matches && (!best || date > best)) best = date;
  }
  return best;
}
