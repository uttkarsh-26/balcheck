import { expect, test } from '@playwright/test';

// Parse JPEG dimensions from the SOF marker (covers baseline + progressive).
function jpegSize(buf: Buffer): { width: number; height: number } {
  let o = 2; // skip SOI
  while (o < buf.length - 9) {
    if (buf[o] !== 0xff) throw new Error('bad marker at ' + o);
    const marker = buf[o + 1];
    const len = buf.readUInt16BE(o + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7) };
    }
    o += 2 + len;
  }
  throw new Error('no SOF marker');
}

// Social crawlers (WhatsApp, Facebook, X) do not render SVG og:images, so the
// preview must be a raster with real dimensions.
test('og:image is a 1200x630 raster with declared size', async ({ page, request }) => {
  await page.goto('/');

  const url = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(url).toBeTruthy();
  expect(new URL(url!).pathname).toMatch(/\.(jpe?g|png|webp)$/);

  // resolve against the local test server, not the production origin in the meta tag
  const res = await request.get(new URL(url!).pathname);
  expect(res.status()).toBe(200);
  const type = res.headers()['content-type'] || '';
  expect(type).toMatch(/^image\/(jpeg|png|webp)/);

  const buf = await res.body();
  let width = 0;
  let height = 0;
  if (type.includes('jpeg')) {
    ({ width, height } = jpegSize(buf));
  } else {
    width = buf.readUInt32BE(16);
    height = buf.readUInt32BE(20);
  }
  expect({ width, height }).toEqual({ width: 1200, height: 630 });
  expect(buf.length).toBeLessThan(300 * 1024);

  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /\.(jpe?g|png|webp)$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
});
