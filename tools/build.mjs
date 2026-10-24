// Build GRAND THEFT MOTO into one self-contained page: dist/index.html = the template + MOTOR's prelude (the
// deterministic Math, D33) + the vendored engine (a classic script that defines My3D2dge, then its mocap player and GTM's
// cut of the clips) + the game bundle (src/main.js and every content module under src/game, bundled by esbuild into one
// IIFE). A rebuild of an unchanged tree is byte-identical: no dates, no hashes, sorted inputs.
//   node tools/build.mjs            write dist/index.html
//   node tools/build.mjs --check    fail if dist/index.html is not what the sources build (CI, the test gate)
//   node tools/build.mjs --out x    write the page to x instead (a worker's own build: never dist/)
// Other tools import bundle() to get the game script without writing anything.
import { build, buildSync } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ENGINE = join(ROOT, 'vendor/my-3d2dge/engine/my-3d2dge.js');
/** the engine's mocap player and GTM's cut of its clips, each a classic script loaded after the engine (in this order) */
export const MOCAP = ['mocap/readable.js', 'mocap/mocap.js', 'mocap/sets/gtm.js'].map(f => join(ROOT, 'vendor/my-3d2dge', f));
const outArg = process.argv.indexOf('--out'), OUT = outArg > 0 ? resolve(process.argv[outArg + 1]) : join(ROOT, 'dist/index.html');

/** every .js file under src/game, sorted by path: content registers itself when imported */
export function contentFiles() {
  const base = join(ROOT, 'src/game'), out = [];
  const walk = d => { for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.js')) out.push(p); } };
  walk(base);
  return out.map(p => relative(base, p).split('\\').join('/')).sort();
}

/** the content modules, sorted by path; extra ([{ file, as }]: a recipe test's fixtures) are imported as if each file
 *  were at src/game/<as>, in its sorted place, its imports resolved from there */
const contentPlugin = (extra = []) => ({
  name: 'content',
  setup(b) {
    const list = [...contentFiles().map(f => ({ as: f })), ...extra].sort((a, b) => (a.as < b.as ? -1 : a.as > b.as ? 1 : 0));
    b.onResolve({ filter: /^virtual:content$/ }, () => ({ path: 'content', namespace: 'content' }));
    b.onLoad({ filter: /.*/, namespace: 'content' }, () => ({
      contents: list.map(f => `import ${JSON.stringify(f.file ? 'virtual:extra:' + f.as : './' + f.as)};`).join('\n') + '\nexport const CONTENT_FILES = ' + JSON.stringify(list.map(f => f.as)) + ';\n',
      resolveDir: join(ROOT, 'src/game'), loader: 'js',
    }));
    b.onResolve({ filter: /^virtual:extra:/ }, a => ({ path: a.path.slice('virtual:extra:'.length), namespace: 'extra' }));
    b.onLoad({ filter: /.*/, namespace: 'extra' }, a => { const f = extra.find(q => q.as === a.path); return { contents: readFileSync(resolve(ROOT, f.file), 'utf8'), resolveDir: dirname(join(ROOT, 'src/game', f.as)), loader: 'js' }; });
    b.onResolve({ filter: /^\./, namespace: 'extra' }, a => ({ path: resolve(a.resolveDir, a.path) }));   // (by path: its folder may be one no file is in yet)
  },
});

/** the game bundle as one IIFE (a string); extra: content files bundled as if they were under src/game (the recipe
 *  tests' fixtures: [{ file, as }]) */
export async function bundle({ minify = false, extra = [] } = {}) {
  const r = await build({
    entryPoints: [join(ROOT, 'src/main.js')], bundle: true, format: 'iife', target: 'es2022', platform: 'browser',
    write: false, plugins: [contentPlugin(extra)], legalComments: 'none', charset: 'utf8', logLevel: 'warning', minify,
  });
  return r.outputFiles[0].text;
}

let preludeCode = null;
/** MOTOR's prelude (src/motor/core/prelude.js) as one classic script: it runs before the engine, in the page and in every
 *  headless loader (tests/harness.mjs), and puts the deterministic Math in place (D33) */
export function prelude() {
  if (preludeCode === null) {
    preludeCode = buildSync({
      entryPoints: [join(ROOT, 'src/motor/core/prelude.js')], bundle: true, format: 'iife', target: 'es2022', platform: 'browser',
      write: false, legalComments: 'none', charset: 'utf8', logLevel: 'warning',
    }).outputFiles[0].text;
  }
  return preludeCode;
}

/** the engine's boot splash markup, taken from the engine itself (as the engine's own build does) */
function bootSplash(title) {
  const ctx = { console: { log() {}, warn() {}, error() {} } };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(ENGINE, 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  return ctx.My3D2dge.bootSplash(title);
}

const esc = s => s.replace(/<\/script/gi, '<\\/script');
const block = (rows, indent = '  ') => rows.map(r => indent + (Array.isArray(r) ? `* ${r[0]}: ${r[1]}` : '- ' + r)).join('\n').replace(/--/g, '- -');

export async function page() {
  const about = await import(pathToFileURL(join(ROOT, 'src/about.js')).href);
  const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
  const template = readFileSync(join(ROOT, 'src/index.template.html'), 'utf8');
  const parts = {
    '{{VERSION}}': version, '{{BUILD}}': 'dev-build',
    '{{SOURCE_INFO}}': block(about.SOURCE_INFO), '{{ENGINE_SUMMARY}}': block(about.ENGINE_SUMMARY),
    '<!-- @boot -->': bootSplash(about.GAME.title),
    '<!-- @engine -->': ['<script>\n' + esc(prelude()) + '\n</script>', ...[ENGINE, ...MOCAP].map(f => '<script>\n' + esc(readFileSync(f, 'utf8')) + '\n</script>')].join('\n'),
    '<!-- @bundle -->': '<script>\n' + esc(await bundle()) + '\n</script>',
  };
  let html = template;
  // a function replacement, so '$' sequences in the engine or the bundle are taken literally
  for (const [k, v] of Object.entries(parts)) { if (!html.includes(k)) throw new Error('template is missing ' + k); html = html.replace(k, () => v); }
  return html;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const html = await page(), check = process.argv.includes('--check');
  if (check) {
    let now = ''; try { now = readFileSync(OUT, 'utf8'); } catch {}
    if (now !== html) { console.error('dist/index.html is stale: run npm run build and commit it'); process.exit(1); }
    console.log('dist/index.html is current (' + (html.length / 1024).toFixed(0) + ' KB)');
  } else {
    mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, html);
    const again = await page();
    if (again !== html) { console.error('the build is not repeatable: two builds of the same tree differ'); process.exit(1); }
    console.log('wrote ' + relative(ROOT, OUT) + ' (' + (html.length / 1024).toFixed(0) + ' KB, ' + contentFiles().length + ' content files)');
  }
}
