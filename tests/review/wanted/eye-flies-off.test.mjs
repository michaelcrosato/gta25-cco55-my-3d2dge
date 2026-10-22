// FAN-OUT B (M13), wanted and gangs: the MPD Eye at 3 stars and up (PLAN.md 8.13; M6's acceptance: "the chopper arrives
// at 3 stars", tests/sim/wanted.test.mjs: over the player within 30 s). police.js claims the first un-wrecked 'eye' in
// the fleet, wherever it is, or, with none flying (the patrol Eye shot down), spawns one in the annulus. Released when
// the stars drop, a claimed Eye goes back to its patrol, but a spawned one has no patrol (`h.patrol` null), so
// _freeHeli gives it "fly off": straight ahead along its heading, for good. Nothing ever removes it or brings it back,
// and the next chase claims it again from tens of thousands of units off the map: after the patrol Eye has been shot
// down once, no Eye reaches a later 3-5 star chase in any useful time.
//   node --test tests/review/wanted/eye-flies-off.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('the Eye shot down in one chase, the chase over: at 3 stars again a minute later, an Eye is over the player within 30 s', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'night', weather: 'clear' } }); game.advance(2);
  const P = gtm.crew.ped, W = gtm.life.wanted, Pol = gtm.life.police, F = gtm.fleet;
  const eyes = () => F.vehicles.filter(v => v.def.id === 'eye').map(v => ({ id: v.id, wrecked: !!v.wrecked, d: Math.round(Math.hypot(v.x - P.x, v.y - P.y)) }));
  const over = () => { const h = Pol.heli && Pol.heli.v; return !!h && !h.wrecked && Math.hypot(h.x - P.x, h.y - P.y) < 200; };
  // (the player kept on their feet: at 3 stars the police shoot, and a death would end the chase; the Eye is the subject)
  const hold = s => { let t = 0; for (; t < s && !over(); t += .5) { P.vitals.health = P.vitals.maxHealth; game.advance(.5); } return t; };
  W.set(3); W.floor(3);
  const t1 = hold(30); assert.ok(over(), 'chase 1: the patrol Eye comes (' + t1 + ' s)');
  const first = Pol.heli.v; first.damage.hit(9999); F.explode(first, P.id);   // (shot down: a rocket's worth)
  const t2 = hold(30); assert.ok(over(), 'the replacement comes in from the annulus (' + t2 + ' s)');
  W.floor(0); W.clear('respray'); game.advance(60);   // (the chase over: the stars lost at Spray & Pray; a minute of peace)
  const away = eyes();
  W.set(3); W.floor(3);
  const t3 = hold(30);
  console.log(JSON.stringify({ chase1: t1, replacement: t2, eyesAfterAMinute: away, chase2: over() ? t3 : 'not over the player after 30 s', eyesNow: eyes() }));
  assert.ok(over(), 'chase 2: an Eye over the player within 30 s: ' + JSON.stringify(eyes()));
});
