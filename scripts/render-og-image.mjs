// Renders public/og-image.svg -> public/og-image.jpg (1200x630, JPEG q90).
// Social crawlers don't render SVG previews, so og:image must stay a raster.
// Re-run after editing the SVG: node scripts/render-og-image.mjs
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const svgPath = new URL('../public/og-image.svg', import.meta.url).href;
const out = new URL('../public/og-image.jpg', import.meta.url).pathname;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(svgPath, { waitUntil: 'load' });
await page.screenshot({
  path: out,
  clip: { x: 0, y: 0, width: 1200, height: 630 },
  type: 'jpeg',
  quality: 90,
});
await browser.close();

const buf = fs.readFileSync(out);
console.log(
  `wrote ${out}: ${(buf.length / 1024).toFixed(1)} KB, magic=${buf.subarray(0, 3).toString('hex')} (ffd8ff = JPEG)`
);
