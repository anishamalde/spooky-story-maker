// Renders the Claude Design scene art (art/*.dc.html, exported from the
// "Spooky Story Maker scenes" canvas) to PNGs in app/assets/art/.
// Characters keep a transparent background so the app can layer them.
// Usage: node scripts/render-art.mjs
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'app/assets/art');

const boards = {
  Main: 'title',
  TheEnd: 'the-end',
  HauntedHouse: 'place-house',
  PumpkinPatch: 'place-patch',
  WhisperingWoods: 'place-woods',
  LittleWitch: 'hero-witch',
  FriendlyGhost: 'hero-ghost',
  PumpkinKid: 'hero-pumpkin',
  BlackCat: 'sidekick-cat',
  Bat: 'sidekick-bat',
  SillySkeleton: 'sidekick-skeleton',
};

// A .dc.html file is plain markup inside <x-dc>, with <helmet> holding the
// <head> extras (fonts, base styles). That is all a static render needs.
function toPlainHtml(source) {
  const dc = source.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1];
  const helmet = dc.match(/<helmet>([\s\S]*?)<\/helmet>/)?.[1] ?? '';
  const body = dc.replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  const { width, height } = JSON.parse(source.match(/data-props='([^']*)'/)[1]).$preview;
  return {
    width,
    height,
    html: `<!doctype html><html><head><meta charset="utf-8">${helmet}<style>html,body{margin:0;background:transparent}</style></head><body>${body}</body></html>`,
  };
}

// The pickers sit on the title scene without its words.
const variants = { backdrop: { from: 'Main', strip: /<div style="position: absolute; left: 0; right: 0; top: 250px[\s\S]*?<\/div>/ } };

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const jobs = [
  ...Object.entries(boards).map(([board, name]) => ({ board, name, strip: null })),
  ...Object.entries(variants).map(([name, v]) => ({ board: v.from, name, strip: v.strip })),
];
for (const { board, name, strip } of jobs) {
  let source = readFileSync(join(root, 'art', `${board}.dc.html`), 'utf8');
  if (strip) {
    if (!strip.test(source)) throw new Error(`${name}: nothing to strip from ${board}`);
    source = source.replace(strip, '');
  }
  const { width, height, html } = toPlainHtml(source);
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(outDir, `${name}.png`), omitBackground: true });
  await page.close();
  console.log(`wrote ${name}.png (${width}×${height})`);
}
await browser.close();
