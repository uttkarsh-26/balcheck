import { expect, test } from '@playwright/test';

const route = '/net-banking/sbi/';
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

test.describe('VideoHeroBanner mobile contract', () => {
  for (const viewport of viewports) {
    test(`${viewport.width}px keeps the video hero compact and separated`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      const video = page.locator('video[src*="balcheck-netbanking-hero"]');
      const hero = video.locator('xpath=ancestor::section[1]');
      const cta = hero.getByRole('link', { name: 'Login Now' });

      await expect(hero).toBeVisible();
      await expect(video).toBeVisible();
      await expect(hero.getByRole('heading', { name: 'Net Banking Login' })).toBeVisible();
      await expect(cta).toBeVisible();

      const layout = await hero.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const styles = getComputedStyle(element);
        const next = document.querySelector('#netbanking-content');
        const nextRect = next?.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          radius: parseFloat(styles.borderTopLeftRadius),
          marginTop: parseFloat(styles.marginTop),
          marginBottom: parseFloat(styles.marginBottom),
          nextTop: nextRect?.top ?? 0,
          bottom: rect.bottom,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });

      expect(layout.width).toBeGreaterThan(viewport.width - 48);
      expect(layout.height / layout.width).toBeGreaterThan(0.5);
      expect(layout.height / layout.width).toBeLessThan(0.8);
      expect(layout.radius).toBeGreaterThanOrEqual(16);
      expect(layout.marginTop).toBeGreaterThanOrEqual(24);
      expect(layout.marginBottom).toBeGreaterThanOrEqual(24);
      expect(layout.nextTop - layout.bottom).toBeGreaterThanOrEqual(24);
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
    });
  }
});
