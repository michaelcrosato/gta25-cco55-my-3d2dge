// Vendor my-3D2dge at an exact commit: copies the files MOTOR and the tools need from a checkout of the engine
// repository into vendor/my-3d2dge/, and records where they came from and their sha256 in VERSION.json.
// Usage: node tools/vendor-sync.mjs <engine-checkout> [--expect <full sha>]
// The checkout must be clean and at the expected commit. Patches (GTM-PATCH markers) are applied by hand afterwards
// and listed in vendor/my-3d2dge/PATCHES.md; vendor-check.mjs tells pristine files from patched ones by these hashes.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const SHA = 'cfa866aa45474868350cad1a7fc015e612f9305f';
const args = process.argv.slice(2), src = args.find(a => !a.startsWith('--'));
const expect = args.includes('--expect') ? args[args.indexOf('--expect') + 1] : SHA;
if (!src) { console.error('Usage: node tools/vendor-sync.mjs <engine-checkout> [--expect <sha>]'); process.exit(2); }
const head = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD']).toString().trim();
if (head !== expect) { console.error(`engine checkout is at ${head}, expected ${expect}`); process.exit(1); }
if (execFileSync('git', ['-C', src, 'status', '--porcelain']).toString().trim()) { console.error('engine checkout is not clean'); process.exit(1); }

// [source path in the engine repo, destination under vendor/my-3d2dge]
const FILES = [
  ['engine/my-3d2dge.js', 'engine/my-3d2dge.js'],
  ['API.md', 'API.md'], ['API-INDEX.md', 'API-INDEX.md'], ['AI_GUIDE.md', 'AI_GUIDE.md'],
  ['docs/STANDARD-FEATURES.md', 'docs/STANDARD-FEATURES.md'], ['docs/ASSETS.md', 'docs/ASSETS.md'],
  ['docs/MOCAP.md', 'docs/MOCAP.md'], ['docs/LAB-3D.md', 'docs/LAB-3D.md'],
  ['tools/check.mjs', 'tools/check.mjs'], ['tools/filmstrip.mjs', 'tools/filmstrip.mjs'], ['tools/replay.mjs', 'tools/replay.mjs'],
  ['tools/anim-set.mjs', 'tools/anim-set.mjs'], ['tools/mocap-lib.mjs', 'tools/mocap-lib.mjs'],
  ['src/mocap/readable.js', 'mocap/readable.js'], ['src/mocap/mocap.js', 'mocap/mocap.js'],
  ['src/mocap/catalogs/quaternius.json', 'mocap/catalogs/quaternius.json'], ['src/mocap/catalogs/mesh2motion.json', 'mocap/catalogs/mesh2motion.json'],
  ['src/mocap/sets/quaternius.js', 'mocap/sets/quaternius.js'], ['src/mocap/sets/mesh2motion.js', 'mocap/sets/mesh2motion.js'],
  ['src/stress.game.js', 'reference/stress.game.js'], ['src/starter/30-shooter.js', 'reference/starter-30-shooter.js'],
  ['src/starter/50-brawler.js', 'reference/starter-50-brawler.js'], ['src/starter/70-stealth.js', 'reference/starter-70-stealth.js'],
  ['src/handoff/game/test.mjs', 'reference/handoff-test.mjs'], ['src/emberdeep/93-autopilot.js', 'reference/emberdeep-93-autopilot.js'],
  ['LICENSE', 'LICENSE'], ['README.md', 'UPSTREAM-README.md'],
];
const out = resolve(dirname(new URL(import.meta.url).pathname), '../vendor/my-3d2dge');
const sha256 = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const files = {};
for (const [from, to] of FILES) {
  const dst = join(out, to); mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(join(src, from), dst);
  files[to] = { from, sha256: sha256(dst) };
}
const version = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8')).version;
writeFileSync(join(out, 'VERSION.json'), JSON.stringify({
  upstream: 'https://github.com/michaelcrosato/my-3d2dge', version, commit: head, license: 'MIT',
  note: 'Pristine hashes of the upstream files. Patched files are listed in PATCHES.md; vendor-check.mjs verifies both.', files,
}, null, 2) + '\n');
console.log(`vendored my-3D2dge ${version} @ ${head.slice(0, 7)}: ${FILES.length} files into vendor/my-3d2dge`);
