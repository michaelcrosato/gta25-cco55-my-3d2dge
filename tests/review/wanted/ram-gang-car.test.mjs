// FAN-OUT B (M13), wanted and gangs: PLAN.md 8.14's "damaging their cars -2" (D19: once a car in 10 s) only ever comes
// from Combat's `hit` (a shot, a bat, a blast): ramming a gang's car costs nothing. Two causes, both on the way: a crash
// between two cars does no damage at all (Fleet.update meets the cars after each Vehicle.update has stepped its body,
// and collideCars' impulse lands in body.felt.hit, which the next body.step() zeroes before Vehicle.update reads it for
// damage: only walls and props ever dent a car), and Gangs listens to `hit` alone (a crash would be `vehicleDamage`, whose
// `by` is the damaged car's own driver). So the player can T-bone the Saints' cars all day: no dent, no respect lost.
//   node --test tests/review/wanted/ram-gang-car.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('the player\'s car T-bones a parked Saints car at 300 u/s in Neon Mile: the Saints car is dented, and the Saints lose 2', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'day', weather: 'clear' } }), Cm = gtm.city; game.advance(1);
  let best = null; for (let r = 0; r < 20 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) if (Cm.surfaceAt(120 + dx, 60 + dy) === 'road' && Cm.walkable(120 + dx, 60 + dy)) best = [120 + dx, 60 + dy];
  gtm.teleport((best[0] + .5) * 16, (best[1] + .5) * 16); game.advance(2);
  const G = gtm.life.gangs, P = gtm.crew.ped, F = gtm.fleet, M = gtm.motor, C = gtm.life.crowd;
  for (const q of [...C.members]) C._drop(q); gtm.TUNE.gangHangout = 0; gtm.TUNE.gangPatrol = 0; gtm.TUNE.crowdDensity = 0; gtm.TUNE.gangCars = 0;
  for (const v of [...F.vehicles]) if (v.traffic && Math.hypot(v.x - P.x, v.y - P.y) < 600) F.remove(v);
  game.advance(.5);
  // a straight stretch of lane: the Saints car parked across it 130 u on, the player's car at its start
  const Gr = M.roadsOf(Cm).graph, n = Gr.nearestLane(P.x, P.y, null, 0, 200), lane = n.lane, s0 = Math.max(0, Math.min(lane.len - 200, n.s));
  const a = Gr.pointOn(lane, s0), b = Gr.pointOn(lane, s0 + 130), h = Math.atan2(lane.dir[1], lane.dir[0]);
  assert.equal(G.turfAt(b[0], b[1]), 'saints', 'in the Saints\' turf');
  const gv = F.spawn('saint', b[0], b[1], h + Math.PI / 2); gv.gang = 'saints';
  const mine = F.spawn('cortez', a[0], a[1], h); mine.sit(P, 0); game.advance(.2);
  const log = []; for (const e of ['respect', 'vehicleDamage', 'hit']) gtm.BUS.on(e, q => log.push({ n: e, ...q }), 'world');
  const hp0 = gv.damage.health, mine0 = mine.damage.health, before = G.get('saints');
  let impact = null, felt = 0;   // (felt: the impulse collideCars left in the Saints car's body.felt.hit after a step)
  for (let i = 0; i < 240; i++) {
    const d = Math.hypot(mine.x - gv.x, mine.y - gv.y);
    if (impact === null && d > mine.hl + gv.hw + 3) mine.body.setVelocity(Math.cos(h) * 300, Math.sin(h) * 300);
    else if (impact === null) impact = { step: i, speed: Math.round(mine.speed) };
    game.advance(1 / 120); felt = Math.max(felt, gv.body.felt.hit || 0);
  }
  game.advance(.5);
  const dv = felt / gv.body.h.mass, would = Math.max(0, dv - gtm.TUNE.crashDv) * gtm.TUNE.crashHurt;   // (Damage.crash's sum on that impulse)
  console.log(JSON.stringify({ impact, recordedImpulse: { dv: Math.round(dv), crashDv: gtm.TUNE.crashDv, wouldHurt: Math.round(would) }, saintsCarSpeedAfter: Math.round(gv.speed), saintsCar: { health: [hp0, gv.damage.health], dents: gv.damage.dents }, playersCar: { health: [mine0, mine.damage.health] }, respect: [before, G.get('saints')], events: log.filter(e => e.vehicle === gv.id || e.target === gv.id || e.n === 'respect') }));
  assert.ok(impact && impact.speed > 250, 'the player\'s car hit it hard');
  assert.ok(gv.damage.health < hp0, `the Saints car is dented by the crash (health ${hp0} -> ${gv.damage.health})`);
  assert.equal(G.get('saints'), before - 2, 'and the Saints lose 2 for their car');
});
