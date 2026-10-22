// FAN-OUT B (vehicles and physics): the bail-out (PLAN.md 8.8: "getting out above 60 u/s is a dive roll"). exitFor picks
// the seat's own door (the driver's on the left, side -1) or a clear one, and play.js checks that door's spot is
// walkable; but E.ACTIONS.bailOut's setup aims the dive at `v.heading - side * PI/2 * .55`, the way *into* the car from
// that door (boarding.js's `inward` has the same sign). So the driver dives right, through the car's body, out of the
// passenger side, and up to ~100 u on, never checked: beside a building on the right the dive ends inside its wall
// (E.Action moves the body without collision).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineGlobal } from '../../harness.mjs';

const E = engineGlobal();
const M = await import('../../../src/motor/index.js');
await import('../../../src/game/vehicles/cortez.js');
await import('../../../src/game/characters/crew.js');
const { get, Fleet, Ped, Combat, exitFor, standInCity, makeIntent, clearIntent } = M;
const dt = 1 / 120;
function yard(fill) {
  const w = 80, h = 60, map = new E.TileMap({ w, h, types: { 1: { h: 32, top: '#666', side: '#555' } } });
  map.fill(0, 0, w, 1, 1); map.fill(0, h - 1, w, 1, 1); map.fill(0, 0, 1, h, 1); map.fill(w - 1, 0, 1, h, 1);
  if (fill) fill(map);
  const city = standInCity(map, () => 'road'), combat = new Combat({ map, city, fire: false }), fleet = new Fleet({ city, map, combat });
  return { map, city, combat, fleet };
}
const ped = (Y, x, y) => Y.combat.add(new Ped({ x, y, faction: 'crew', look: get('characters', 'dex').outfits[0] }));
function step(Y, seconds, until) {
  const idle = makeIntent();
  for (let t = 0; t < seconds; t += dt) {
    Y.fleet.update(dt, { intent: () => clearIntent(idle), peds: Y.combat.bodies, night: false });
    for (const p of Y.combat.bodies) p.update(dt, clearIntent(idle), { map: Y.map, city: Y.city, combat: Y.combat, fleet: Y.fleet });
    Y.combat.update(dt, {});
    if (until && until()) return t;
  }
}
/** a Cortez heading east along y 480 at `speed`, the ped in `seat`, bailing out by play.js's rule (a walkable door) */
function bail(fill, seat = 0, speed = 160) {
  const Y = yard(fill), v = Y.fleet.spawn('cortez', 300, 480, 0), p = ped(Y, 300, 480); v.sit(p, seat); step(Y, .1);
  v.body.u = speed; const plan = exitFor(p, v, (x, y) => Y.city.walkable(Math.floor(x / 16), Math.floor(y / 16)));
  p.leave(plan); let crossed = false;
  step(Y, 1.5, () => { const [, ly] = v.toLocal(p.x, p.y); if (plan.door.side * ly < -v.hw) crossed = true; return !p.boarding; });
  return { Y, v, p, plan, crossed, cell: Y.map.cell(Math.floor(p.x / 16), Math.floor(p.y / 16)) };
}

test('a bail-out dives out of the door it chose: the driver to the left (north, heading east), a passenger to the right', () => {
  const bad = [];
  for (const [seat, want] of [[0, 'north'], [1, 'south']]) {
    const { p, plan, crossed } = bail(null, seat), side = p.y < 480 ? 'north' : 'south';
    assert.equal(plan.kind, 'bailOut');
    if (side !== want) bad.push(`seat ${seat}: the plan's door is '${plan.door.id}' (side ${plan.door.side}), but the dive ended ${side} of the car's line, at y ${p.y.toFixed(1)} (car line 480)${crossed ? ', passing through the car to its far flank' : ''}`);
  }
  assert.deepEqual(bad, []);
});

test('in play: bailing out on the Loop at 160 u/s, eastbound in its south lane, leaves the player on the deck (E at speed)', async () => {
  const { loadGame, holdCode } = await import('../../harness.mjs');
  const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0', seed: '7' } });
  game.advance(.5);
  const MM = gtm.motor, F = gtm.fleet, p = gtm.crew.ped, city = gtm.city, T = 16, lane = 1264;   // (the north arm: deck rows 75..80, its south railing at y 1296)
  for (const o of F.near(60 * T, 1248, 900)) F.remove(o);
  p.place(50 * T, lane - 40, 64); const v = F.spawn('cortez', 50 * T, lane, 0); v.body.z = 64; game.advance(.1); v.sit(p, 0); game.advance(.3);
  const I = MM.makeIntent();
  gtm.pilot(() => { MM.clearIntent(I); I.throttle = 1; I.steer = Math.max(-1, Math.min(1, (-v.heading + (lane - v.y) * .01) * 2)); return I; });
  for (let t = 0; v.speed < 160 && t < 5; t += 1 / 60) game.advance(1 / 60);
  gtm.pilot(null); const sp = v.speed;
  holdCode(game, 'KeyE', 1 / 30); game.advance(2.5);
  assert.ok(!p.seat, 'out');
  assert.ok(city.deckAt(p.x, p.y, 64, 6) && p.z > 60, `bailed out at ${sp.toFixed(0)} u/s by the driver's (north) door, the player dived south through the deck's railing (y 1296) and fell to the street: at y ${p.y.toFixed(1)}, z ${p.z.toFixed(1)}`);
});

test('a bail-out beside a building never ends inside its wall (the door\'s side clear, the building across the car, or past the door)', () => {
  // a building south of the street (rows 32..45: its face at y 512, 19 u off the car's right flank), and one north of it
  // whose face is 30 u past the driver's door spot (rows 24..28: its face at y 464)
  for (const [name, fill] of [['south', m => m.fill(2, 32, 76, 14, 1)], ['north', m => m.fill(2, 20, 76, 5, 1)]]) {
    const { p, plan, cell } = bail(fill);
    assert.ok(cell === 0, `a building ${name} of the street: the driver's door spot (${plan.at.x.toFixed(0)}, ${plan.at.y.toFixed(0)}) was walkable, and the dive ended inside the wall at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) (cell type ${cell}, height 32)`);
  }
});
