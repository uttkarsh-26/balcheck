import { test, expect } from '@playwright/test';
import { banks } from '../src/data/banks';
import { getJsonLdScripts, findSchema } from './utils';

test.describe('/how-it-works', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/how-it-works');
  });

  test('renders guide heading and overview', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'मिस्ड कॉल से बैंक बैलेंस कैसे चेक करें' })).toBeVisible();
    await expect(page.locator('body')).toContainText(`${banks.length}+ बैंकों के मिस्ड कॉल नंबर`);
  });

  test('renders five numbered steps', async ({ page }) => {
    const steps = page.locator('section').filter({ has: page.locator('h2') }).nth(0).locator('h2');
    await expect(steps).toHaveCount(5);

    const headings = await steps.allTextContents();
    expect(headings.join(' ')).toContain('रजिस्टर्ड मोबाइल नंबर');
    expect(headings.join(' ')).toContain('SMS में बैलेंस');
  });

  test('renders FAQ section', async ({ page }) => {
    const faqs = page.locator('details');
    await expect(faqs).toHaveCount(4);
    await expect(page.locator('body')).toContainText('मिस्ड कॉल बैलेंस सेवा मुफ़्त है?');
  });

  test('has HowTo and FAQPage JSON-LD', async ({ page }) => {
    const scripts = await getJsonLdScripts(page);
    const howTo = findSchema(scripts, 'HowTo') as Record<string, unknown> | undefined;
    expect(howTo).toBeDefined();

    const steps = Array.isArray(howTo?.step) ? (howTo.step as unknown[]).length : 0;
    expect(steps).toBe(5);

    expect(findSchema(scripts, 'FAQPage')).toBeDefined();
    expect(findSchema(scripts, 'BreadcrumbList')).toBeDefined();
  });
});
