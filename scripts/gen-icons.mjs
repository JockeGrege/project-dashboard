/**
 * Rasterises the Hypomone mark into the PWA / Apple PNG icons.
 *
 *   node scripts/gen-icons.mjs
 *
 * Uses the Chromium that Playwright already installs. The SVG geometry is kept
 * in sync by hand with public/symbol.svg and src/ui/AnvilMark.tsx.
 */
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));

/** Inner markup of the mark (anvil + sparks + raised hammer), fill inherited. */
const MARK = `
  <path d="M84 268 Q126 244 168 244 L424 244 L424 296 L388 296 Q384 328 360 360 L360 380 Q378 408 424 412 L440 452 L128 452 L144 412 Q194 408 216 380 L216 360 Q192 328 188 296 L168 296 Q126 296 84 268 Z"/>
  <path d="M210 244 L224 236 L178 196 Z"/>
  <path d="M226 248 L238 243 L216 186 Z"/>
  <path d="M242 245 L251 252 L264 192 Z"/>
  <g transform="rotate(-34 235 170)"><rect x="202" y="112" width="66" height="116" rx="10"/><rect x="254" y="151" width="196" height="38" rx="17"/></g>`;
const CHARCOAL = "#151617";
const GOLD = "#C59A55";

/** Mark bounding-box centre inside its own 512 viewBox. */
const CX = 262;
const CY = 246;

function markup({ size, radius, scale }) {
  const tx = (256 - CX * scale).toFixed(2);
  const ty = (256 - CY * scale).toFixed(2);
  const bg =
    radius > 0
      ? `<rect width="512" height="512" rx="${radius}" fill="${CHARCOAL}"/>`
      : `<rect width="512" height="512" fill="${CHARCOAL}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${bg}<g transform="translate(${tx} ${ty}) scale(${scale})" fill="${GOLD}">${MARK}</g></svg>`;
}

const TARGETS = [
  { file: "pwa-192.png", size: 192, radius: 42, scale: 0.8 },
  { file: "pwa-512.png", size: 512, radius: 112, scale: 0.8 },
  // maskable: full-bleed, art kept well inside the safe zone
  { file: "pwa-maskable-512.png", size: 512, radius: 0, scale: 0.64 },
  { file: "apple-touch-icon.png", size: 180, radius: 0, scale: 0.8 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const t of TARGETS) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${markup(t)}</body></html>`,
    { waitUntil: "networkidle" },
  );
  const buffer = await page.screenshot({
    clip: { x: 0, y: 0, width: t.size, height: t.size },
  });
  await writeFile(path.join(PUBLIC_DIR, t.file), buffer);
  console.log(`wrote public/${t.file}  (${t.size}x${t.size})`);
}

await browser.close();
