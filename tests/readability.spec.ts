import { test, expect } from '@playwright/test';

/**
 * Readability contract: Hindi body copy must stay legible on cheap phones.
 *
 * Regressions this guards:
 * - gray-400 (#9ca3af) on white is 2.5:1 contrast — below WCAG AA (4.5:1) — so it
 *   must never carry content text. Decorative icons/aria-hidden separators are fine.
 * - 11px text is below the site's readable floor for rural users on small screens.
 */
const PAGES = ['/', '/missed-call/', '/bank/sbi/', '/banks/public-sector/', '/customer-care/sbi/'];

for (const path of PAGES) {
  test(`readability contract holds on ${path}`, async ({ page }) => {
    await page.goto(path);

    const violations = await page.evaluate(() => {
      const lowContrast: string[] = [];
      const tooSmall: string[] = [];

      for (const el of Array.from(document.querySelectorAll('p, span, div, li, td, strong, em'))) {
        if (el.closest('[aria-hidden="true"]')) continue;
        if (el.children.length > 0) continue;
        const text = (el.textContent || '').trim();
        const className = typeof el.className === 'string' ? el.className : '';
        if (text.length >= 15 && className.includes('text-gray-400')) {
          lowContrast.push(text.slice(0, 40));
        }
        const fontSize = parseFloat(getComputedStyle(el).fontSize);
        if (text.length >= 25 && fontSize > 0 && fontSize < 12) {
          tooSmall.push(`${fontSize}px: ${text.slice(0, 40)}`);
        }
      }

      return { lowContrast, tooSmall };
    });

    expect(violations.lowContrast, `gray-400 content text found on ${path}`).toEqual([]);
    expect(violations.tooSmall, `sub-12px content text found on ${path}`).toEqual([]);
  });
}
