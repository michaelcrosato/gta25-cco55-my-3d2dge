// FAN-OUT B review (traffic and peds): `npm run test:full`'s 10-minute day city soak fails at this head.
// tests/full/city-soak.mjs runs citySoak({ secs: 600, seed: 1999, time: 'day', weather: 'clear' }) and fails on any red
// run (PLAN.md 8.9: "zero signal violations by calm drivers"; D18: "a red run is a calm driver onto a signalled
// connector red for half a second (one committed on amber may reach its connector just after the change)"). The same
// run's first 180 s (deterministic: the same seed, hops and steps) already has one: at 174.36 s a Cortez rolls onto
// j20's straight connector on a red, held by no reservation. It is not a calm driver's choice: it was panicking (shots
// near it: panic ignores the lights by design), crossed the stop line on red at 172.0 s with 2.3 s of panic left, stood
// on the zebra for a ped, and reached the connector the step its panic ran out (panic -0.002). The soak reads `panic`
// only at the connector's entry, so a panic that ends past the stop line counts as a calm red run, and test:full (PLAN.md
// 15) fails.
//   node --test tests/review/traffic/soak-red-run.test.mjs     (about 70 s)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citySoak } from '../../city-soak.mjs';

test('the first 180 s of test:full\'s day city soak have no calm red run', async () => {
  let info = null;
  const r = await citySoak({ secs: 180, seed: 1999, time: 'day', weather: 'clear', watch: (step, gtm, r) => {
    if (!r.lastRed || info) return;
    const { c, cn, step: s } = r.lastRed, b = c.brain, M = gtm.motor, G = gtm.life.graph, t = gtm.life.t;
    info = { t: +(s / 120).toFixed(2), car: c.v.def.id, conn: cn.id, region: cn.region, lightNow: M.lightFor(cn, G, t), light2sAgo: M.lightFor(cn, G, t - 2), held: b.held ? b.held.conn.id : null, panicLeft: +b.panic.toFixed(4), siren: b.siren };
  } });
  assert.equal(r.redRuns, 0, `${r.redRuns} red run(s) by a "calm" driver, which fails tests/full/city-soak.mjs: ${JSON.stringify(info)}`);
});
