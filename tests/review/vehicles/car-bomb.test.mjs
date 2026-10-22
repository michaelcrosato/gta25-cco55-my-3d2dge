// FAN-OUT B (vehicles and physics): the Boom Box Garage's car bomb (PLAN.md 8.8: "a car bomb (set on exit, triggered by
// ignition or by remote from the phone)"). The shop fits `amount: 'timed'` (src/game/economy.js mod_bomb;
// play/economy.js apply: m.bomb = it.amount || 'timed'), but the Fleet knows only 'ignition' (fleet.js update: the next
// driver's throttle) and 'remote' (Fleet.detonate, which nothing calls: the phone has CONTACTS, TEXTS, JOBS, SNAP,
// SETTINGS). A 'timed' bomb arms when its fitter gets out and then never goes off: no timer, no ignition, no remote.
// The yard test that covers the bomb (tests/sim/vehicles.test.mjs) fits 'ignition' and 'remote' by hand, never the
// shop's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../../harness.mjs';

test('the car bomb bought at the Boom Box goes off: by its timer, or when the next driver floors it', async () => {
  const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0', seed: '7' } });
  game.advance(.5);
  const M = gtm.motor, F = gtm.fleet, crew = gtm.crew, dex = crew.ped, T = 16;
  const item = M.get('shops', 'boom-box').items.find(i => i.item === 'bomb'); assert.ok(item, 'the Boom Box sells a car bomb');
  // a car in the middle of Sunset Strip, Dex at its wheel, the bomb bought for it (the shop's own purchase)
  const y0 = 30 * T + 8; for (const o of F.near(100 * T, y0, 600)) if (Math.abs(o.y - y0) < 40) F.remove(o);
  const v = F.spawn('cortez', 100 * T, y0, Math.PI); gtm.teleport(v.x, v.y - 30); game.advance(.1); v.sit(dex, 0); game.advance(.2);
  crew.fund = 10000;
  const r = gtm.career.econ.buy('boom-box', item, { ped: dex, vehicle: v }); assert.ok(r.ok, 'bought: ' + JSON.stringify(r));
  const kind = v.mods.bomb;
  holdCode(game, 'KeyE', 1 / 30); game.advance(1.5);
  assert.ok(!dex.seat && v.bombArmed, `Dex got out and the bomb (${kind}) is armed`);
  dex.place(100 * T, y0 - 400); game.advance(30);   // (walked well off)
  const after30 = v.wrecked;
  // the next driver: Viv, possessed, at the wheel, floors it
  crew.possess('viv'); const viv = crew.ped; viv.place(v.x, v.y - 30); game.advance(.2); v.sit(viv, 0); game.advance(.2);
  const I = M.makeIntent(); gtm.pilot(() => { M.clearIntent(I); I.throttle = 1; return I; }); game.advance(3); gtm.pilot(null);
  assert.ok(v.wrecked, `the shop's car bomb ('${kind}', armed: ${v.bombArmed}) never went off: 30 s after its fitter got out (wrecked: ${after30}), nor when the next driver (${crew.active}) floored it for 3 s (the car is at ${(v.x / T).toFixed(0)}, ${v.damage.health.toFixed(0)} health); the Fleet sets off only 'ignition' bombs, and only Fleet.detonate() a 'remote' one, which nothing calls`);
});
