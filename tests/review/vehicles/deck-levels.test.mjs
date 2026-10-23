// FAN-OUT B (vehicles and physics): a car on the Loop's deck (z 64) and the street under it. Getting in, getting out and
// the tow hook decide by x and y only, so they reach through the deck:
//   - play.js boardTarget -> fleet.near (2D) + boarding.js inReach (2D) + boardingFor (no height), and Ped._boarding's
//     walk to the door (2D, d <= 7): from the street, E puts the player in a car parked 64 u up on the deck (the
//     enterCar beats lift them through the slab);
//   - play.js's exit check (city.walkable at street level, fleet.near 2D): a door over the deck's edge passes, so getting
//     out of a car stopped against the railing puts the player outside it, and down on the street;
//   - fleet.js _tools 'hook' (fleet.near 2D): a Hookline on the street hooks a car on the deck above and drags it;
//   - fleet.js _tools 'cannon' (along/side in x and y only): a Pumper's jet on the street knocks down peds on the deck.
// D27 fixed the same blindness for the police's arrests ("both arrests now want the cop within 12 of the player's level").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../../harness.mjs';

const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0', seed: '7' } });
game.advance(.5);
const M = gtm.motor, F = gtm.fleet, p = gtm.crew.ped, city = gtm.city, T = city.T;
const loop = city.decks.find(d => d.id === 'loop');
// the Loop's north arm over Loop Avenue: deck rows 75..80 at z 64, the avenue open below
const X = 60.5 * T, clear = () => { for (const o of F.near(X, 1240, 420)) if (!o.occupied || o.driver !== p) F.remove(o); };
const out = () => { if (p.seat) { const v = p.seat.vehicle; v.unseat(p); p.place(v.x, v.y + 40, 0); } p.boarding = null; game.advance(.2); };

test('from the street under the Loop, E does not put the player into a car parked on the deck 64 u above', () => {
  out(); clear();
  const v = F.spawn('cortez', X, 76.5 * T, 0); v.body.z = 64; game.advance(1.5);
  assert.equal(loop.heightAt(v.x, v.y), 64); assert.equal(v.z, 64, 'the car stands on the deck');
  const [dx, dy] = v.toWorld(0, -v.hw - 10); assert.ok(city.walkable(Math.floor(dx / T), Math.floor(dy / T)), 'the street below is open');
  gtm.teleport(dx, dy); game.advance(.5); const z0 = p.z;
  holdCode(game, 'KeyE', 1 / 30); game.advance(2.5);
  const seat = p.seat && p.seat.vehicle;
  assert.ok(seat !== v, `standing on the street (z ${z0.toFixed(1)}), E got the player into the car on the deck: seated in ${seat && seat.def.id} at z ${p.z.toFixed(1)} (car z ${v.z})`);
});

test('getting out of a car stopped against the Loop\'s railing leaves the player on the deck, not through the railing and down to the street', () => {
  out(); clear();
  const v = F.spawn('cortez', X, 1200 + 13 + 1.5, 0); v.body.z = 64;   // (its left flank, the driver's door side, at the north railing: y 1200)
  gtm.teleport(v.x, v.y + 30); game.advance(.2); v.sit(p, 0); game.advance(1);
  assert.ok(Math.abs(p.z - 70) < 1 && v.z === 64, 'at the wheel on the deck');
  const h0 = p.vitals.health;
  holdCode(game, 'KeyE', 1 / 30); game.advance(3);
  assert.ok(!p.seat, 'out');
  const onDeck = !!city.deckAt(p.x, p.y, 64, 6);
  assert.ok(onDeck && p.z > 60, `got out at (${(p.x / T).toFixed(1)}, ${(p.y / T).toFixed(2)}) z ${p.z.toFixed(1)}: ${onDeck ? '' : 'off the deck, '}outside the railing at y ${1200} (the deck's edge), health ${h0} -> ${p.vitals.health.toFixed(0)}`);
});

test('a Hookline on the street does not hook a car parked on the deck above it', () => {
  out(); clear();
  const car = F.spawn('cortez', X - 80, 77.5 * T, 0); car.body.z = 64;
  const truck = F.spawn('hookline', X + 2, 77.5 * T, 0);
  gtm.teleport(truck.x, truck.y + 30); game.advance(.2); truck.sit(p, 0); game.advance(1.2);
  assert.equal(car.z, 64); assert.equal(truck.z, 0);
  const I = M.makeIntent();
  gtm.pilot(() => { M.clearIntent(I); I.tap.fire = true; return I; }); game.advance(1 / 120); gtm.pilot(null);
  const hooked = !!(truck.towing && truck.towing.car === car), x0 = car.x;
  gtm.pilot(() => { M.clearIntent(I); I.throttle = .6; return I; }); game.advance(3); gtm.pilot(null);
  assert.ok(!hooked, `the truck at z ${truck.z} hooked the car at z ${car.z} (64 u above) and dragged it ${(car.x - x0).toFixed(0)} u along the deck`);
});

test('a Pumper\'s water cannon on the street does not knock over a ped standing on the deck above it', () => {
  out(); clear();
  const truck = F.spawn('pumper', X, 77.5 * T, 0);
  gtm.teleport(truck.x, truck.y + 30); game.advance(.2); truck.sit(p, 0); game.advance(.5);
  const vic = gtm.combat.add(new M.Ped({ x: X + 70, y: 77.5 * T, z: 64, faction: 'civilian', look: M.get('characters', 'viv').outfits[0] })); vic.place(X + 70, 77.5 * T, 64); game.advance(.3);
  assert.ok(city.deckAt(vic.x, vic.y, 64, 6) && vic.z === 64 && truck.z === 0, 'the ped on the deck, the Pumper on the street under it');
  const I = M.makeIntent(); let down = false;
  gtm.pilot(() => { M.clearIntent(I); I.down.fire = true; if (vic.vitals.down > 0 || vic.floored) down = true; return I; }); game.advance(1); gtm.pilot(null);
  assert.ok(!down, `the cannon fired from z ${truck.z} knocked down the ped 70 u ahead and 64 u up on the deck (health ${vic.vitals.health.toFixed(0)}): fleet.js _tools 'cannon' tests only the jet's x and y`);
});
