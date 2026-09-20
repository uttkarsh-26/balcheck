// Renders public/favicon.svg -> public/favicon.ico (16/32/48 px, PNG-in-ICO).
// Googlebot-Image, WhatsApp previews and plain browsers request /favicon.ico
// even when Layout.astro declares the SVG icon, so the file must exist.
// Re-run after editing the SVG: node scripts/render-favicon.mjs
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const svgPath = new URL('../public/favicon.svg', import.meta.url).href;
const out = new URL('../public/favicon.ico', import.meta.url).pathname;
const SIZES = [16, 32, 48];

/** Assemble PNG buffers into a single .ico (PNG-compressed entries). */
function pngToIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + 16 * entries.length;
  entries.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2); // palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });

  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)]);
}

const svg = fs.readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
const pngs = [];

for (const size of SIZES) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg
      .replace('width="64" height="64"', `width="${size}" height="${size}"`)
      .replace('<svg ', `<svg style="display:block" `)}</body></html>`,
    { waitUntil: 'load' },
  );
  const buf = await page.screenshot({ type: 'png', omitBackground: true });
  pngs.push({ size, buf });
  await page.close();
}

await browser.close();
fs.writeFileSync(out, pngToIco(pngs));
console.log(`wrote ${out} (${SIZES.join('/')} px, ${fs.statSync(out).size} bytes)`);
