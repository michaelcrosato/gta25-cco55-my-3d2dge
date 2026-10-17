// The vehicle model sheet (PLAN.md 8.8's Accept): every vehicle definition alone in the Proving Ground's garage,
// shot in ISO, TOP-DOWN and MODE 7, cropped round it and laid out with its name, model, class and role, into
// docs/media/m4/model-sheet.png (rows: definitions; columns: the views; a day and a night column for ISO).
//   node tools/model-sheet.mjs [--only cortez,saint] [--out docs/media/m4/model-sheet.png] [--dist dist/index.html]
// Each shot is the built page at ?only=<id>&sheet=1, so this reads exactly what players see.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('out', 'docs/media/m4/model-sheet.png'), dist = arg('dist', 'dist/index.html'), only = arg('only', '');
const COLS = [{ view: 'iso', night: 0, label: 'ISO' }, { view: 'iso', night: 1, label: 'ISO, NIGHT' }, { view: 'top', night: 0, label: 'TOP-DOWN' }, { view: 'side7', night: 0, label: 'MODE 7' }];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const base = pathToFileURL(resolve(dist)).href;
  await page.goto(base + '?sheet=1#proving/garage');
  await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
  const defs = await page.evaluate(() => window.__gtm.vehicles());
  const ids = only ? only.split(',') : defs.map(d => d.id), shots = [];
  let n = 0;
  for (const id of ids) for (const c of COLS) {
    await page.goto(base + `?sheet=1&only=${id}&view=${c.view}&night=${c.night}&siren=${c.night}&zoom=1.4&n=${n++}#proving/garage`);
    await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
    await page.waitForTimeout(900);
    shots.push({ id, col: c.label, url: 'data:image/png;base64,' + (await page.screenshot()).toString('base64') });
  }
  const sheet = await page.evaluate(async ({ shots, ids, cols, defs }) => {
    const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const cw = 300, ch = 170, lw = 190, head = 26, c = document.createElement('canvas'); c.width = lw + cw * cols.length; c.height = head + ch * ids.length;
    const g = c.getContext('2d'); g.fillStyle = '#0c0a14'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
    g.font = 'bold 14px monospace'; g.fillStyle = '#ffe066'; cols.forEach((k, i) => g.fillText(k.label, lw + i * cw + 8, 18));
    for (const [r, id] of ids.entries()) {
      const d = defs.find(q => q.id === id) || { name: id };
      g.fillStyle = '#ffe066'; g.font = 'bold 15px monospace'; g.fillText(d.name.toUpperCase(), 8, head + r * ch + 24);
      g.fillStyle = '#c8c0e0'; g.font = '12px monospace';
      [`${id}`, `model ${d.model}${d.kit ? ' + ' + d.kit : ''}`, `${d.class}, ${d.role}`, ...(d.spec || '').split(', ')].forEach((t, i) => g.fillText(t, 8, head + r * ch + 46 + i * 16));
      for (const [i, k] of cols.entries()) {
        const s = shots.find(q => q.id === id && q.col === k.label); if (!s) continue;
        const img = await load(s.url), sw = img.width * .5, sh = img.height * .5;   // (the middle half of the frame, round the vehicle)
        g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, lw + i * cw, head + r * ch, cw, ch);
        g.strokeStyle = '#2a2440'; g.strokeRect(lw + i * cw + .5, head + r * ch + .5, cw - 1, ch - 1);
      }
    }
    return c.toDataURL('image/png');
  }, { shots, ids, cols: COLS, defs });
  mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log(`model sheet: ${ids.length} definitions x ${COLS.length} shots -> ${out}${errors.length ? '; page errors: ' + errors.join(' | ') : ''}`);
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
