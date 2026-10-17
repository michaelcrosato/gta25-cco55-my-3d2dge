// The API boundary (PLAN.md 7.1): MOTOR and the game use my-3D2dge's public API only, and src/game imports nothing from
// MOTOR but src/motor/index.js. A line that must reach past it says why with a "boundary-ok: <reason>" comment.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from './build.mjs';

const files = [], walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.js')) files.push(p); } };
walk(join(ROOT, 'src'));
// engine objects games hold: a private member (a leading _) on any of them is a reach-through
const ENGINE_OBJ = /\b(E|My3D2dge|game|r|map|tm|input|audio|rig|view|lights|particles|screen|cam|bullets|shots)\.(_[A-Za-z]\w*)/g;
const problems = [];
for (const f of files) {
  const rel = relative(ROOT, f), src = readFileSync(f, 'utf8').split('\n');
  src.forEach((line, i) => {
    if (line.includes('boundary-ok:')) return;
    for (const m of line.matchAll(ENGINE_OBJ)) problems.push(`${rel}:${i + 1}: ${m[0]} reaches a private engine member`);
    if (rel.startsWith('src/game/')) for (const m of line.matchAll(/from\s+['"]([^'"]+)['"]/g))
      if (m[1].includes('/motor/') && !/\/motor\/index\.js$/.test(m[1])) problems.push(`${rel}:${i + 1}: content imports ${m[1]} (only src/motor/index.js is public)`);
  });
}
if (problems.length) { console.error('boundary-check: ' + problems.length + ' problem(s)\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`boundary-check: ${files.length} files, no reach-through`);
