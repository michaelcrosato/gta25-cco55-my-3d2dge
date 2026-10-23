// FAN-OUT B (vehicles and physics): Dex's OVERDRIVE, the one ability that touches vehicles (PLAN.md 8.11: "time x 0.5,
// handling x 1.3, 8 s"; meters "filled by playing in character"; the Driving stat "time at speed, near misses ... act on
// handling"). In play it can't be charged by driving, can't be switched on at the wheel, and never changes the car.
//   - nothing feeds the 'driveFast' / 'nearMiss' / 'takedown' deeds (combat/abilities.js fills, combat/stats.js DEEDS):
//     the meter stays 0 and the Driving stat 10 however the player drives;
//   - Ped._seated ignores I.tap.ability (only the on-foot path toggles it), though the vehicle context binds Ability
//     (L3 + R3, F: input/bindings.js SHARED, docs/CONTROLS.md "In a vehicle");
//   - Ability.handling (1.3) is read by nothing: the car turns the same with OVERDRIVE on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../../harness.mjs';

const T = 16;
const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0', seed: '7' } });
game.advance(.5);
const M = gtm.motor, F = gtm.fleet, dex = gtm.crew.ped;

test('driving flat out fills Dex\'s OVERDRIVE meter and raises his Driving stat (PLAN.md 8.11)', () => {
  assert.equal(gtm.crew.active, 'dex'); assert.equal(dex.ability.id, 'overdrive');
  const m0 = dex.ability.meter, d0 = dex.stats.driving;
  // a Zephyr GT down the middle of Sunset Strip (one-way west, row 30), the road ahead cleared
  const y0 = 30 * T + 8; for (const o of F.near(120 * T, y0, 1800)) if (Math.abs(o.y - y0) < 40) F.remove(o);
  const v = F.spawn('zephyr', 140 * T, y0, Math.PI); gtm.teleport(v.x, v.y - 30); game.advance(.1); v.sit(dex, 0); game.advance(.1);
  let fast = 0, top = 0; const I = M.makeIntent();
  gtm.pilot(dt => { M.clearIntent(I); I.throttle = 1; const err = Math.atan2(Math.sin(Math.PI - v.heading), Math.cos(Math.PI - v.heading)) + (v.y - y0) * .01; I.steer = Math.max(-1, Math.min(1, -err * 2)); if (v.speed > v.body.h.top * .5) fast += dt; top = Math.max(top, v.speed); return I; });
  game.advance(6); gtm.pilot(null);
  assert.ok(fast > 4, `the run: ${fast.toFixed(2)} s over half the top speed (${top.toFixed(0)} u/s at most)`);
  assert.ok(dex.ability.meter > m0, `OVERDRIVE's meter after ${fast.toFixed(2)} s at speed: ${m0} -> ${dex.ability.meter} (fills.driveFast .012 a second)`);
  assert.ok(dex.stats.driving > d0, `the Driving stat after ${fast.toFixed(2)} s at speed: ${d0} -> ${dex.stats.driving} (DEEDS.driveFast)`);
});

test('at the wheel, the Ability button (F; L3 + R3) switches a full OVERDRIVE on, as it does on foot', () => {
  if (!dex.seat) { const v = F.spawn('cortez', dex.x + 40, dex.y, 0); v.sit(dex, 0); game.advance(.2); }
  assert.ok(dex.seat, 'seated');
  dex.ability.meter = 1; dex.ability.active = false;
  holdCode(game, 'KeyF', 1 / 30); game.advance(1 / 60);
  const atWheel = dex.ability.active, scale = game.timeScale;
  dex.ability.active = false; game.advance(1 / 60);   // (off again before getting out: at half time the exit would not be over in 1.5 s)
  // the same press on foot
  dex.leave(M.exitFor(dex, dex.seat.vehicle)); game.advance(1.5); dex.ability.meter = 1; dex.ability.active = false;
  holdCode(game, 'KeyF', 1 / 30); game.advance(1 / 60);
  const onFoot = dex.ability.active;
  assert.ok(onFoot, 'on foot F switches it on (the control case)');
  assert.ok(atWheel, `at the wheel F did nothing: active ${atWheel}, the game's time scale ${scale} (on foot: active ${onFoot})`);
});

test('OVERDRIVE\'s handling x1.3 reaches the car: a full-lock turn at 160 u/s turns further with it on', async () => {
  const H = await loadGame({ hash: 'proving/handling', query: { seed: '7' } });   // (the handling ground: an open apron, the crew at the wheel of a Cortez)
  H.game.advance(.5);
  const p = H.gtm.crew.ped, v = p.seat && p.seat.vehicle, MM = H.gtm.motor; assert.ok(v, 'seated in the ground\'s car'); assert.equal(p.ability.id, 'overdrive');
  const turn = on => {
    const b = v.body; Object.assign(b, { x: 1300, y: 380, z: 0, heading: 0, u: 160, v: 0, w: 0, vz: 0, steerAngle: 0, airborne: false, flipped: false }); v.asleep = false;
    p.ability.meter = 1; p.ability.active = on;
    let t = 0, lat = 0, steps = 0, scale = 1; const I = MM.makeIntent();
    H.gtm.pilot(dt => { t += dt; steps++; scale = H.game.timeScale; MM.clearIntent(I); I.throttle = .45; I.steer = -1; lat = Math.max(lat, Math.abs(b.felt.lat)); return I; });
    while (t < .6) H.game.advance(1 / 120);
    H.gtm.pilot(null); const yaw = Math.abs(Math.atan2(Math.sin(b.heading), Math.cos(b.heading)));
    p.ability.active = false; H.game.advance(1 / 120);
    return { yaw, lat, steps, scale };
  };
  const off = turn(false), on = turn(true);
  assert.ok(on.scale === .5 && on.steps > off.steps * 1.8, `OVERDRIVE was on: time scale ${on.scale}, ${on.steps} steps against ${off.steps}`);
  assert.ok(on.yaw > off.yaw * 1.1 || on.lat > off.lat * 1.1,
    `the same 0.6 s (game time) full-lock turn from 160 u/s: OVERDRIVE off ${(off.yaw * 57.3).toFixed(1)} deg, ${off.lat.toFixed(0)} u/s2 lateral (${off.steps} steps); on (time scale ${on.scale}, ${on.steps} steps) ${(on.yaw * 57.3).toFixed(1)} deg, ${on.lat.toFixed(0)} u/s2: Ability.handling (1.3) is read by nothing`);
});
