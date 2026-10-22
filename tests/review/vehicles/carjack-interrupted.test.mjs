// FAN-OUT B (vehicles and physics): a carjack cut short. The jacked driver is `held` by the jacker's E.Action
// (actors/ped.js: `if (this.held) { if (this.held.done) ... else { pose; return } }`), and only the jacker's
// Ped._boarding ever advances that action. When the jacker dies mid-jack (shot, run over, a blast), its _update returns
// at `if (v.dead)` and the action is never stepped again; a respawn just drops `p.boarding`. So the victim hangs where
// the yank left it, at seat height beside the car, for good: it can't move, the crowd keeps it (crowd.js keeps `held`
// peds near and on their feet), and the car's door stays open, so the car never sleeps (fleet.js: doors all shut).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal, loadGame } from '../../harness.mjs';

const E = engineGlobal();
const M = await import('../../../src/motor/index.js');
await import('../../../src/game/vehicles/cortez.js');
await import('../../../src/game/characters/crew.js');
const { get, Fleet, Ped, Combat, boardingFor, standInCity, makeIntent, clearIntent } = M;
const dt = 1 / 120;
function yard() {
  const w = 80, h = 60, map = new E.TileMap({ w, h, types: { 1: { h: 32, top: '#666', side: '#555' } } });
  map.fill(0, 0, w, 1, 1); map.fill(0, h - 1, w, 1, 1); map.fill(0, 0, 1, h, 1); map.fill(w - 1, 0, 1, h, 1);
  const city = standInCity(map, () => 'road'), combat = new Combat({ map, city, fire: false }), fleet = new Fleet({ city, map, combat });
  return { map, city, combat, fleet };
}
const ped = (Y, x, y, o = {}) => Y.combat.add(new Ped({ x, y, faction: o.faction || 'crew', look: get('characters', 'dex').outfits[0], ...o }));
function step(Y, seconds, o = {}) {
  const idle = makeIntent();
  for (let t = 0; t < seconds; t += dt) {
    Y.fleet.update(dt, { intent: () => clearIntent(idle), peds: Y.combat.bodies, night: false });
    for (const p of Y.combat.bodies) p.update(dt, o.pi ? o.pi(p) : clearIntent(idle), { map: Y.map, city: Y.city, combat: Y.combat, fleet: Y.fleet });
    Y.combat.update(dt, {});
    if (o.until && o.until()) return t;
  }
  return seconds;
}

test('a jacker shot dead mid-yank lets the driver go: free within 3 s, walking off, the door shut and the car able to sleep', () => {
  const Y = yard(), v = Y.fleet.spawn('cortez', 600, 480, 0), victim = ped(Y, 600, 480, { faction: 'civilian' }); v.sit(victim, 0); step(Y, .2);
  const [x, y] = v.toWorld(0, -v.hw - 12), jacker = ped(Y, x, y);
  assert.equal(boardingFor(jacker, v, 0).kind, 'carjack'); jacker.board(boardingFor(jacker, v, 0));
  step(Y, 3, { until: () => jacker.boarding && jacker.boarding.act && jacker.boarding.act.beat === 'yank' });
  assert.ok(victim.held && !victim.seat, 'mid-yank: the driver is out of the seat, held by the jack');
  Y.combat.hurt(jacker, { amount: 999, kind: 'bullet', by: null }); assert.ok(jacker.dead, 'the jacker is shot dead');
  const at = [victim.x, victim.y, victim.z]; step(Y, 3);
  const go = makeIntent(); go.move = [0, -1];
  step(Y, 3, { pi: q => q === victim ? go : clearIntent(makeIntent()) });
  const moved = Math.hypot(victim.x - at[0], victim.y - at[1]);
  assert.ok(!victim.held, `6 s after the jacker died the driver is still held by its action (done: ${victim.held && victim.held.done}), hanging at z ${victim.z.toFixed(1)}`);
  assert.ok(moved > 20, `told to walk away for 3 s, the driver moved ${moved.toFixed(2)} u`);
  assert.equal(v.doors.fl, 0, `the driver's door is still open: ${JSON.stringify(v.doors)} (the car never sleeps: asleep ${v.asleep})`);
});

test('in play: the player shot dead mid-carjack of a traffic car; after WRECKED and the respawn the jacked driver still hangs at the door', async () => {
  const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', seed: '7' } });
  game.advance(3);
  const F = gtm.fleet, p = gtm.crew.ped; let v = null;
  for (let k = 0; k < 60 && !v; k++) { v = F.near(p.x, p.y, 900).find(q => q.cls === 'car' && q.driver && !q.driver.dead && q.brain && q.speed < 20 && !q.kinematic) || null; if (!v) game.advance(.5); }
  assert.ok(v, 'a slow traffic car near the player');
  const victim = v.driver, [dx, dy] = v.toWorld(0, -v.hw - 10); gtm.teleport(dx, dy);
  const plan = gtm.motor.boardingFor(p, v, 0); assert.equal(plan.kind, 'carjack'); p.board(plan);
  for (let t = 0; t < 4 && !(p.boarding && p.boarding.act && p.boarding.act.beat === 'yank'); t += dt) game.advance(dt);
  assert.ok(victim.held, 'mid-yank');
  gtm.combat.hurt(p, { amount: 999, kind: 'bullet', by: null }); assert.ok(p.dead);
  const at = [victim.x, victim.y];
  game.advance(15); assert.ok(!p.dead, 'respawned');
  gtm.teleport(at[0] + 40, at[1]); game.advance(30);   // (back at the scene)
  const moved = Math.hypot(victim.x - at[0], victim.y - at[1]);
  assert.ok(!victim.held && moved > 1, `45 s on, the jacked ${v.def.id}'s driver is still held (moved ${moved.toFixed(2)} u, z ${victim.z.toFixed(1)}, kept by the crowd: ${gtm.life.crowd.members.some(m => m.ped === victim)}); the car's doors ${JSON.stringify(v.doors)}, asleep ${v.asleep}`);
});
