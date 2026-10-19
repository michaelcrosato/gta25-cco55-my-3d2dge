// test:full's gang sim (PLAN.md 8.14: "a 5-minute gang sim with no errors"): Lowtown on seed 1 for 5 minutes, the focus
// touring the gangs' borders and HQs a minute at a time, the gangs left to themselves. Fails on any error the game logs,
// a fight that never ends, a war that never ends, members or fighters beyond any sane count, respect that moved with the
// player doing nothing, or no turf war at all. Exits 1 on a breach.
//   node tests/full/gang-soak.mjs [--secs 300]
import { loadGame } from '../harness.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const secs = arg('secs', 300), errors = [];
const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear' }, quiet: true });
const origError = console.error; console.error = (...a) => { errors.push(a.map(String).join(' ')); origError(...a); };
const G = gtm.life.gangs, stops = [[120, 76], [80, 38], [80, 77], [138, 46], [44, 71], [147, 143]], log = [];
for (const n of ['turfWar', 'turfWarEnd', 'respect']) gtm.BUS.on(n, e => log.push({ n, t: G.t, ...e }), 'world');
let maxMembers = 0, maxFighters = 0, longest = 0; const since = new Map();
const t0 = performance.now();
try {
  for (let s = 0, k = 0; s < secs; s += 1) {
    if (s % 60 === 0) { const [tx, ty] = stops[k++ % stops.length]; gtm.teleport((tx + .5) * 16, (ty + .5) * 16); }
    game.advance(1);
    const st = G.stats(); maxMembers = Math.max(maxMembers, st.members); maxFighters = Math.max(maxFighters, st.fighters);
    for (const f of G.fighters) { since.set(f, (since.get(f) || 0) + 1); longest = Math.max(longest, since.get(f)); }
    for (const f of [...since.keys()]) if (!G.fighters.includes(f)) since.delete(f);
  }
} catch (e) { errors.push(String(e && e.stack || e)); }
const wars = log.filter(e => e.n === 'turfWar').length, ends = log.filter(e => e.n === 'turfWarEnd').length, moved = log.filter(e => e.n === 'respect');
const bad = [
  errors.length && `${errors.length} errors: ${errors.slice(0, 3).join(' | ')}`,
  !wars && 'no turf war in the whole run',
  wars - ends > 1 && `${wars - ends} wars never ended`,
  longest > 120 && `a fighter in one fight ${longest} s`,
  maxMembers > 60 && `${maxMembers} members at once`,
  maxFighters > 30 && `${maxFighters} fighters at once`,
  moved.length && `respect moved with the player idle: ${JSON.stringify(moved.slice(0, 3))}`,
].filter(Boolean);
console.log(`${bad.length ? 'FAIL' : 'ok'} gangs ${secs} s on seed 1: ${wars} turf wars (${ends} ended), at most ${maxMembers} members and ${maxFighters} fighters, the longest fight ${longest} s, ${((performance.now() - t0) / (secs * 120)).toFixed(2)} ms a step`);
for (const b of bad) console.log('  ' + b);
process.exit(bad.length ? 1 : 0);
