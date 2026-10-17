// The vehicle handling bench in a terminal (sim/vehicle/handling.js): each definition's measured numbers and its
// checks against its spec, for tuning a definition's handling.   node tools/vehicle-bench.mjs [id ...]
import { readdirSync } from 'node:fs';
import { engineGlobal } from '../tests/harness.mjs';
engineGlobal();
await import('../src/motor/index.js');
for (const f of readdirSync(new URL('../src/game/vehicles/', import.meta.url)).filter(f => f.endsWith('.js')).sort()) await import('../src/game/vehicles/' + f);
const { all } = await import('../src/motor/core/registry.js');
const { measureHandling, handlingChecks } = await import('../src/motor/sim/vehicle/handling.js');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all('vehicles').map(d => d.id);
for (const id of ids) { const m = measureHandling(id); console.log(id, JSON.stringify(m, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v)); for (const c of handlingChecks(id, m)) console.log('  ', c.ok ? 'ok ' : 'BAD', c.check, c.value, 'want', c.want); }
