import type { Page } from '@playwright/test';

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
