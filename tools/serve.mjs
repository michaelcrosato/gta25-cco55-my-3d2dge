// Dev server: serves dist/ on http://localhost:5173 (no dependencies; PORT=0 takes a free port, and the line it
// prints says which). --watch rebuilds dist/index.html when src/ or the vendored engine changes. Reload the page to
// see a rebuild.
import { createServer } from 'node:http';
import { readFileSync, watch, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { ROOT, page } from './build.mjs';
import { writeFileSync } from 'node:fs';

const PORT = +(process.env.PORT || 5173), TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const rebuild = async () => { try { writeFileSync(join(ROOT, 'dist/index.html'), await page()); console.log('rebuilt dist/index.html'); } catch (e) { console.error('build failed: ' + e.message); } };
if (process.argv.includes('--watch') || !existsSync(join(ROOT, 'dist/index.html'))) await rebuild();
if (process.argv.includes('--watch')) {
  let timer = null;
  for (const d of ['src', 'vendor/my-3d2dge/engine']) watch(join(ROOT, d), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 150); });
}
createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]), file = join(ROOT, 'dist', p === '/' ? 'index.html' : p);
  if (!file.startsWith(join(ROOT, 'dist')) || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
}).listen(PORT, function () { console.log(`GRAND THEFT MOTO on http://localhost:${this.address().port}`); });
