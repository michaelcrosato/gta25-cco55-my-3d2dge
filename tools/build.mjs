// Build GRAND THEFT MOTO into one self-contained page: dist/index.html = the template + the vendored engine (a classic
// script that defines My3D2dge) + the game bundle (src/main.js and every content module under src/game, bundled by
// esbuild into one IIFE). A rebuild of an unchanged tree is byte-identical: no dates, no hashes, sorted inputs.
//   node tools/build.mjs            write dist/index.html
//   node tools/build.mjs --check    fail if dist/index.html is not what the sources build (CI, the test gate)
//   node tools/build.mjs --out x    write the page to x instead (a worker's own build: never dist/)
// Other tools import bundle() to get the game script without writing anything.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ENGINE = join(ROOT, 'vendor/my-3d2dge/engine/my-3d2dge.js');
const outArg = process.argv.indexOf('--out'), OUT = outArg > 0 ? resolve(process.argv[outArg + 1]) : join(ROOT, 'dist/index.html');

/** every .js file under src/game, sorted by path: content registers itself when imported */
export function contentFiles() {
  const base = join(ROOT, 'src/game'), out = [];
  const walk = d => { for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.js')) out.push(p); } };
  walk(base);
  return out.map(p => relative(base, p).split('\\').join('/')).sort();
}

const contentPlugin = {
  name: 'content',
  setup(b) {
    b.onResolve({ filter: /^virtual:content$/ }, () => ({ path: 'content', namespace: 'content' }));
    b.onLoad({ filter: /.*/, namespace: 'content' }, () => ({
      contents: contentFiles().map(f => `import ${JSON.stringify('./' + f)};`).join('\n') + '\nexport const CONTENT_FILES = ' + JSON.stringify(contentFiles()) + ';\n',
      resolveDir: join(ROOT, 'src/game'), loader: 'js',
    }));
  },
};

/** the game bundle as one IIFE (a string) */
export async function bundle({ minify = false } = {}) {
  const r = await build({
    entryPoints: [join(ROOT, 'src/main.js')], bundle: true, format: 'iife', target: 'es2022', platform: 'browser',
    write: false, plugins: [contentPlugin], legalComments: 'none', charset: 'utf8', logLevel: 'warning', minify,
  });
  return r.outputFiles[0].text;
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
    '<!-- @engine -->': '<script>\n' + esc(readFileSync(ENGINE, 'utf8')) + '\n</script>',
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
