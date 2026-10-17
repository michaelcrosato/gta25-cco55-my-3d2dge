// Record a vendored file's current sha256 in vendor/my-3d2dge/PATCHES.json after a GTM-PATCH lands (and its tests pass),
// adding the patch entries given: node tools/patch-record.mjs <file> [n:title ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from './build.mjs';

const [file, ...entries] = process.argv.slice(2), V = join(ROOT, 'vendor/my-3d2dge'), P = join(V, 'PATCHES.json');
const j = JSON.parse(readFileSync(P, 'utf8'));
j.files[file] = { sha256: createHash('sha256').update(readFileSync(join(V, file))).digest('hex') };
for (const e of entries) { const [n, ...t] = e.split(':'); if (!j.patches.some(p => p.n === +n)) j.patches.push({ n: +n, file, title: t.join(':') }); }
j.patches.sort((a, b) => a.n - b.n);
writeFileSync(P, JSON.stringify(j, null, 2) + '\n');
console.log(`recorded ${file} (${j.files[file].sha256.slice(0, 12)}…), patches: ${j.patches.map(p => p.n).join(', ')}`);
