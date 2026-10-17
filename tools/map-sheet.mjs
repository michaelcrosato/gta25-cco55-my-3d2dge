// The district's map sheet (PLAN.md 8.3): the whole of a district drawn from above into one PNG, for review. It builds
// the city in the browser (the built page's own MOTOR), paints the floor with the street painter, then lays on the
// buildings (shaded by height), the decks (the Loop, the L), the props, the points of interest with their names, and
// the neighbourhood and zone outlines.
//   node tools/map-sheet.mjs [--district lowtown] [--seed n] [--scale .5] [--out docs/media/lowtown-map-sheet.png]
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const district = arg('district', 'lowtown'), out = arg('out', `docs/media/${district}-map-sheet.png`), scale = +arg('scale', .5), seed = arg('seed', null);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href + '#title');
  await page.waitForFunction(() => window.__gtm && window.__gtm.ready, null, { timeout: 20000 });
  const res = await page.evaluate(({ district, scale, seed }) => {
    const M = window.__gtm.motor, E = M.E, C = M.buildCity(district, seed === null ? undefined : +seed), T = C.T, Wp = C.w * T, Hp = C.h * T;
    const full = E.mkCanvas(Wp, Hp), g = full.getContext('2d'); g.imageSmoothingEnabled = false;
    C.painter.paint(g, 0, 0, Wp, Hp);
    // buildings, shaded by height (taller lighter), with their outlines
    const maxH = Math.max(...Object.values(C.types).map(t => t.h));
    for (let cy = 0; cy < C.h; cy++) for (let cx = 0; cx < C.w; cx++) {
      const id = C.map.cell(cx, cy); if (id <= 0) continue;
      const t = C.types[id], k = .55 + .45 * (t.h / maxH);
      g.fillStyle = E.shade(t.top, (k - .75) * .9); g.fillRect(cx * T, cy * T, T, T);
      g.fillStyle = 'rgba(0,0,0,.35)';
      if (C.map.cell(cx, cy - 1) !== id) g.fillRect(cx * T, cy * T, T, 1);
      if (C.map.cell(cx - 1, cy) !== id) g.fillRect(cx * T, cy * T, 1, T);
    }
    // decks: translucent slabs, ramps lighter, pillars as dots
    for (const d of C.decks) for (const c of d.cells) { g.fillStyle = d.kind === 'rail' ? 'rgba(200,120,60,.55)' : c.z0 !== c.z1 ? 'rgba(170,200,255,.45)' : 'rgba(120,140,190,.5)'; g.fillRect(c.cx * T, c.cy * T, T, T); }
    for (const p of C.props) {
      if (p.kind === 'pillar') { g.fillStyle = '#20202a'; g.fillRect(p.x - 3, p.y - 3, 6, 6); }
      else if (p.kind === 'lamp') { g.fillStyle = '#ffe08a'; g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
      else if (p.kind === 'palm' || p.kind === 'tree') { g.fillStyle = '#2a7a3a'; g.beginPath(); g.arc(p.x, p.y, 6, 0, 6.3); g.fill(); }
    }
    // neighbourhood outlines and names
    g.lineWidth = 6; g.font = 'bold 64px monospace'; g.textAlign = 'center';
    const hoodColor = { palm: '#ff9ad8', neon: '#5af0ff', brick: '#ff9a5a', harbor: '#ffe05a' };
    for (const z of C.zones.filter(z => z.kind === 'hood')) {
      const [x0, y0, x1, y1] = z.rect; g.strokeStyle = hoodColor[z.hood] || '#fff'; g.globalAlpha = .7; g.strokeRect(x0 * T + 3, y0 * T + 3, (x1 - x0 + 1) * T - 6, (y1 - y0 + 1) * T - 6);
      g.globalAlpha = .85; g.fillStyle = hoodColor[z.hood] || '#fff'; const h = C.hoods.find(h => h.id === z.hood); g.fillText(h.name.toUpperCase(), (x0 + x1 + 1) / 2 * T, (y0 + 4) * T + 40); g.globalAlpha = 1;
    }
    // points of interest: a pin and the name
    g.font = 'bold 26px monospace';
    const pinColor = { shop: '#5aff8a', gang: '#ff5a5a', payphone: '#ffd23a', safehouse: '#7af0ff', hospital: '#ff4a4a', police: '#5a8aff', door: '#ffffff', property: '#d08aff', stunt: '#ffa23a', landmark: '#e8e8ec', marina: '#5ad0ff', crusher: '#ff8a3a' };
    for (const p of C.pois) {
      g.fillStyle = '#000'; g.beginPath(); g.arc(p.x, p.y, 12, 0, 6.3); g.fill();
      g.fillStyle = pinColor[p.kind] || '#fff'; g.beginPath(); g.arc(p.x, p.y, 9, 0, 6.3); g.fill();
      if (p.label) { g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(p.label, p.x, p.y - 18); g.fillText(p.label, p.x, p.y - 18); }
    }
    // road names along the roads
    g.font = 'bold 22px monospace'; g.fillStyle = '#f0f0f0';
    for (const r of C.roads) if (r.name) {
      const ns = r.axis === 'y', x = ((r.band[0] + r.band[2] + 1) / 2) * T, y = ((r.band[1] + r.band[3] + 1) / 2) * T;
      g.save(); g.translate(ns ? x : (r.from + 12) * T, ns ? (r.from + 12) * T : y); if (ns) g.rotate(Math.PI / 2); g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(r.name, 0, 8); g.fillText(r.name, 0, 8); g.restore();
    }
    const small = E.mkCanvas(Math.round(Wp * scale), Math.round(Hp * scale)), sg = small.getContext('2d'); sg.imageSmoothingEnabled = true; sg.drawImage(full, 0, 0, small.width, small.height);
    return { png: small.toDataURL('image/png'), lots: C.lots.length, pois: C.pois.length, size: [small.width, small.height] };
  }, { district, scale, seed });
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
  console.log(`map sheet: ${out} (${res.size.join('x')}, ${res.lots} lots, ${res.pois} points of interest)`);
} finally { await browser.close(); }
