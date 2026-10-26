// test:full's city soaks (PLAN.md 8.9 and 8.10: "a 10-minute headless sim"): Lowtown by day for 10 minutes and at
// night in the rain for 5, and Ironside and Glass Heights by day for 10 (EXPANSION.md X1, X5), the focus hopping its sights, held to the same
// bounds as the 90-second soak in tests/sim/city-life.test.mjs. Exits 1 on a breach.
//   node tests/full/city-soak.mjs [--secs 600]
import { citySoak } from '../city-soak.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const secs = arg('secs', 600);
let failed = 0;
for (const run of [{ secs, seed: 1999, time: 'day', weather: 'clear' }, { secs: Math.round(secs / 2), seed: 7, time: 'night', weather: 'rain' }, { secs, seed: 2027, time: 'day', weather: 'clear', district: 'ironside' }, { secs, seed: 2031, time: 'day', weather: 'clear', district: 'glass-heights' }]) {
  const tag = (run.district ? run.district + ' ' : '') + `${run.time}/${run.weather}`;
  const r = await citySoak({ ...run, log: s => console.log(`  ${tag} ${s}`) });
  const bad = [
    r.overlaps && `${r.overlaps} overlaps ${JSON.stringify(r.overlapAt)}`,
    r.maxStall >= 20 && `a stall of ${r.maxStall.toFixed(1)} s ${JSON.stringify(r.stallAt)}`,
    r.redRuns && `${r.redRuns} red runs ${JSON.stringify(r.redAt)}`,
    !(r.meanSpeed > 20 && r.meanSpeed < 90) && `mean speed ${r.meanSpeed.toFixed(1)}`,
    r.spawnsInside && `${r.spawnsInside} cars spawned in sight ${JSON.stringify(r.insideAt)}`,
    r.pedsInside && `${r.pedsInside} peds spawned in sight`,
    r.worstStuck > 15 && `a ped stuck ${r.worstStuck} s ${JSON.stringify(r.stuckAt)}`,
    r.worstCrossWait > 30 && `a crossing wait of ${r.worstCrossWait} s`,
  ].filter(Boolean);
  console.log(`${bad.length ? 'FAIL' : 'ok'} ${tag} ${run.secs} s: ${r.carsSeen} cars, ${r.pedsSeen} peds seen (at most ${r.maxCars} and ${r.maxPeds}), mean speed ${r.meanSpeed.toFixed(1)}, longest stall ${r.maxStall.toFixed(1)} s, worst stuck ped ${r.worstStuck} s, worst crossing wait ${r.worstCrossWait} s, the longest wait behind a unit at its scene ${r.maxScene.toFixed(1)} s, ${r.ms.toFixed(2)} ms a step (with the checks)`);
  for (const b of bad) console.log('  ' + b);
  failed += bad.length ? 1 : 0;
}
process.exit(failed ? 1 : 0);
