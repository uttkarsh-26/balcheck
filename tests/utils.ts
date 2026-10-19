import type { Page, Response } from '@playwright/test';
import { banks, type Bank } from '../src/data/banks';

/**
 * Open a page and stop at DOMContentLoaded — the single source of truth for how
 * this suite navigates.
 *
 * `page.goto` defaults to `waitUntil: 'load'`, which blocks until every
 * third-party resource the page pulls has settled: the AdSense and GA4 loaders,
 * and the hero-video poster that `src/pages/bank/[slug].astro` and
 * `src/pages/net-banking/[slug].astro` point at their production URL — so even a
 * localhost run fetches it over the network. That wait is unbounded and depends
 * on the runner's network (measured ~488ms average and 6.5s worst across 16 bank
 * pages, against ~19ms for DOMContentLoaded), so it is charged to every test's
 * 30s budget and a slow runner can time a test out with zero assertion failures.
 *
 * Every assertion in this suite reads static, server-rendered DOM (headings,
 * links, meta, JSON-LD) or client state that Astro's deferred module scripts
 * have already attached before DOMContentLoaded, so DOMContentLoaded is both
 * sufficient and bounded. Call `page.goto(url, { waitUntil: 'load' })` directly
 * only when a test needs a resource that arrives after DOMContentLoaded — the
 * sole such case today is `tests/video-hero-banner.spec.ts` asserting that the
 * hero video actually plays.
 */
export function gotoDom(page: Page, path: string): Promise<Response | null> {
  return page.goto(path, { waitUntil: 'domcontentloaded' });
}

export function categorySlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, '-');
}

export async function getJsonLdScripts(page: Page): Promise<unknown[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').all();
  const results: unknown[] = [];
  for (const script of scripts) {
    const text = await script.textContent();
    if (text) {
      try {
        results.push(JSON.parse(text));
      } catch {
        // skip malformed
      }
    }
  }
  return results;
}

export function findSchema(scripts: unknown[], type: string): unknown | undefined {
  // Check top-level @type first (e.g. BankOrCreditUnion, CollectionPage)
  for (const s of scripts) {
    if (typeof s === 'object' && s !== null && (s as Record<string, unknown>)['@type'] === type) {
      return s;
    }
  }
  // Then search inside @graph arrays (used by balance-enquiry/toll-free [slug] pages)
  for (const s of scripts) {
    if (typeof s === 'object' && s !== null) {
      const graph = (s as Record<string, unknown>)['@graph'];
      if (Array.isArray(graph)) {
        const found = graph.find(
          (item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            (item as Record<string, unknown>)['@type'] === type
        );
        if (found) return found;
      }
    }
  }
  return undefined;
}

/**
 * Banks walked by one sweep test.
 *
 * A monolithic walk of all 75 bank pages costs ~25s locally and ~28s on a CI
 * runner — no headroom under the 30s default test timeout, so a single slow
 * navigation fails the deploy. Splitting the sweep into bounded chunks bounds
 * each test's wall clock instead of hoping the runner keeps up.
 */
export const BANKS_PER_CHUNK = 8;

/**
 * Budgeted cost of one bank page inside a sweep chunk. Measured cost is ~0.33s
 * per page (25s for all 75 banks locally, ~28s on CI), so 5s leaves every
 * chunk an order of magnitude under its bound.
 */
export const BANK_SWEEP_PAGE_BUDGET_MS = 5_000;

/** Explicit per-test bound for one sweep chunk of BANKS_PER_CHUNK bank pages. */
export const BANK_SWEEP_TIMEOUT_MS = BANKS_PER_CHUNK * BANK_SWEEP_PAGE_BUDGET_MS;

export interface BankSweepChunk {
  /** Test-title suffix naming the chunk, e.g. `1/10: sbi..axis`. */
  label: string;
  /** The banks this chunk sweeps, in registry order. */
  banks: Bank[];
}

/**
 * Split the bank registry into bounded chunks for per-page sweep specs.
 *
 * Chunking is the single source of truth for the sweep policy: every chunk
 * walks at most BANKS_PER_CHUNK banks, and the union of all chunks is still the
 * whole registry, so coverage is unchanged. Each spec asserts that union
 * against `banks`, so a future chunking change cannot silently drop a bank.
 */
export function bankSweepChunks(): BankSweepChunk[] {
  const groups: Bank[][] = [];
  for (let start = 0; start < banks.length; start += BANKS_PER_CHUNK) {
    groups.push(banks.slice(start, start + BANKS_PER_CHUNK));
  }
  return groups.map((group, index) => ({
    label: `${index + 1}/${groups.length}: ${group[0].slug}..${group[group.length - 1].slug}`,
    banks: group,
  }));
}
