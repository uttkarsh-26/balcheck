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
  return scripts.find(s => typeof s === 'object' && s !== null && (s as Record<string, unknown>)['@type'] === type);
}
