// The screenshot matrix (PLAN.md 10): neighbourhood x time x view shots of the built page into docs/media/shots/, and
// a contact sheet of them all (shots/sheet-<views>-<weather>.jpg), for the look review recorded in PROGRESS.
//   node tools/shot-matrix.mjs [--hoods palm,neon,brick,harbor,foundry,scrapyard,voltage] [--times day,dusk,night] [--views iso,top,side7]
//                              [--weather clear] [--scale .5] [--out docs/media/shots] [--sheet-only]
// Each shot stands at a point of interest that shows its neighbourhood (SPOTS), in its district (Ironside's three by
// ?dev=1&district=ironside: EXPANSION.md X1). --bank shoots the First Lowtown Bank's
// lobby in each view instead (bank-<view>.png, no sheet): M13's full matrix adds the bank (the UI screens are the UI
// audit's: tools/ui-audit.mjs --shots).
import { chromium } from 'playwright';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
export const SPOTS = { palm: 'gas-n-sip', neon: 'hotel-marquee', brick: 'boom-box', harbor: 'cranes', foundry: 'union-hall', scrapyard: 'scrap-cathedral', voltage: 'power-station' };
const DISTRICT = { foundry: 'ironside', scrapyard: 'ironside', voltage: 'ironside' };   // (Lowtown's when unsaid)
const hoods = arg('hoods', Object.keys(SPOTS).join(',')).split(','), times = arg('times', 'day,dusk,night').split(','), views = arg('views', 'iso').split(',');
const weather = arg('weather', 'clear'), scale = +arg('scale', .5), out = arg('out', 'docs/media/shots');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  mkdirSync(out, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }), errors = [], shots = [];
  page.on('pageerror', e => errors.push(String(e)));
  if (process.argv.includes('--bank')) {   // (the bank in each view, its lobby from the front door)
    for (const view of views) {
      await page.goto(pathToFileURL(resolve('dist/index.html')).href + `?view=${view}&shot=${view}#interior/bank`);
      await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
      await page.waitForTimeout(2000);
      const png = await page.screenshot(), W = Math.round(1920 * scale), H = Math.round(1080 * scale);
      const small = await page.evaluate(async ({ u, W, H }) => { const i = new Image(); await new Promise(r => { i.onload = r; i.src = u; }); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(i, 0, 0, W, H); return c.toDataURL('image/png'); }, { u: 'data:image/png;base64,' + png.toString('base64'), W, H });
      writeFileSync(join(out, `bank-${view}.png`), Buffer.from(small.split(',')[1], 'base64'));
    }
    console.log(`the bank in ${views.join(', ')} in ${out}${errors.length ? '; page errors: ' + errors.join(' | ') : ''}`);
    if (errors.length) process.exitCode = 1;
  } else await matrix(page, errors, shots);
} finally { await browser.close(); }

// the neighbourhoods' matrix, and its contact sheet
async function matrix(page, errors, shots) {
  for (const view of views) for (const hood of hoods) for (const time of times) {
    const where = DISTRICT[hood] ? `&dev=1&district=${DISTRICT[hood]}` : '';
    await page.goto(pathToFileURL(resolve('dist/index.html')).href + `?time=${time}&weather=${weather}&view=${view}${where}&shot=${shots.length}#play/${SPOTS[hood]}`);   // (shot=: a new query each time, so the page reloads, never just its hash)
    await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
    await page.waitForTimeout(2000);
    const png = await page.screenshot(), name = `${hood}-${time}-${view}.png`;
    shots.push({ name, hood, time, view, url: 'data:image/png;base64,' + png.toString('base64') });
  }
  // the shots at their scale, and the contact sheet (rows: neighbourhoods; columns: times, then views), in the page
  const res = await page.evaluate(async ({ shots, scale, cols }) => {
    const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const out = {}, W = Math.round(1920 * scale), H = Math.round(1080 * scale), sw = 480, sh = 270, rows = shots.length / cols;
    const sheet = document.createElement('canvas'); sheet.width = sw * cols; sheet.height = sh * rows; const sg = sheet.getContext('2d');
    for (const [n, s] of shots.entries()) {
      const img = await load(s.url), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, W, H); out[s.name] = c.toDataURL('image/png');
      sg.imageSmoothingEnabled = true; sg.drawImage(img, (n % cols) * sw, Math.floor(n / cols) * sh, sw, sh);
    }
    out.sheet = sheet.toDataURL('image/jpeg', .86); return out;
  }, { shots, scale, cols: times.length * 1 });
  if (!process.argv.includes('--sheet-only')) for (const s of shots) writeFileSync(join(out, s.name.replace('.png', weather === 'clear' ? '.png' : `-${weather}.png`)), Buffer.from(res[s.name].split(',')[1], 'base64'));
  const sheetName = `sheet-${views.join('-')}-${weather}.jpg`; writeFileSync(join(out, sheetName), Buffer.from(res.sheet.split(',')[1], 'base64'));
  console.log(`${shots.length} shots and ${sheetName} in ${out}${errors.length ? '; page errors: ' + errors.join(' | ') : ''}`);
  if (errors.length) process.exitCode = 1;
}
