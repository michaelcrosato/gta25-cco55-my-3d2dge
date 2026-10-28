// The desktop build (L7): the packaged app for this machine, or for --platform and --arch (the Steam Deck: linux x64),
// in desktop/out. The wrapper and the one-file page are staged together (main.cjs, dist/index.html and a package.json
// naming them) and packed as asar; the page is the tree's own build, unchanged (npm run desktop:build builds it first).
//   node desktop/build.mjs [--platform linux|win32|darwin] [--arch x64|arm64]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..'), out = path.join(here, 'out'), stage = path.join(out, 'stage');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const page = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(page)) { console.error('dist/index.html is missing: npm run build first'); process.exit(1); }
const pkg = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8')), game = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.rmSync(stage, { recursive: true, force: true }); fs.mkdirSync(path.join(stage, 'dist'), { recursive: true });
fs.copyFileSync(path.join(here, 'main.cjs'), path.join(stage, 'main.cjs'));
fs.copyFileSync(page, path.join(stage, 'dist', 'index.html'));
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({ name: pkg.name, productName: pkg.productName, version: game.version, description: pkg.description, main: 'main.cjs' }, null, 2) + '\n');
const made = await packager({ dir: stage, out, name: 'grand-theft-moto', executableName: 'grand-theft-moto', platform: arg('platform', process.platform), arch: arg('arch', process.arch),
  electronVersion: pkg.devDependencies.electron, asar: true, overwrite: true, prune: false, quiet: true });
console.log(made.map(p => path.relative(root, p)).join('\n'));
