// The vendored engine stays honest: every file matches its pristine upstream hash (VERSION.json) or the patched hash in
// PATCHES.json, and every GTM-PATCH(n) marker in a vendored file is listed in PATCHES.json (and vice versa).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from './build.mjs';

const V = join(ROOT, 'vendor/my-3d2dge');
const version = JSON.parse(readFileSync(join(V, 'VERSION.json'), 'utf8'));
const patches = JSON.parse(readFileSync(join(V, 'PATCHES.json'), 'utf8'));
const problems = [], seen = new Set();
for (const [file, info] of Object.entries(version.files)) {
  const text = readFileSync(join(V, file)), hash = createHash('sha256').update(text).digest('hex');
  const patched = patches.files[file];
  if (hash !== info.sha256 && (!patched || patched.sha256 !== hash)) problems.push(`${file}: changed without a PATCHES.json entry (run the patch tests, then record its sha256)`);
  for (const m of text.toString().matchAll(/GTM-PATCH\((\d+)\)/g)) seen.add(+m[1]);
}
const listed = new Set(patches.patches.map(p => p.n));
for (const n of seen) if (!listed.has(n)) problems.push(`GTM-PATCH(${n}) is in the code but not in PATCHES.json`);
for (const n of listed) if (!seen.has(n)) problems.push(`GTM-PATCH(${n}) is listed but no marker is in the code`);
if (problems.length) { console.error('vendor-check:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`vendor-check: my-3D2dge ${version.version} @ ${version.commit.slice(0, 7)}, ${Object.keys(version.files).length} files, ${listed.size} patch(es)`);
