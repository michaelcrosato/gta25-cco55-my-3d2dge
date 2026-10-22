// FAN-OUT B (M13), wanted and gangs: PLAN.md 8.13's tiers say 1 star is "the nearest patrol car and foot cops. They
// try to arrest first" (D19: "1 star a cruiser, arresting"). police.js turns the police's guns on at any tier once the
// player has fought them (`fought`: a cop hit, a copAssault or copMurder filed), but only Police.reset() (the NABBED and
// WRECKED respawn) ever clears it: losing the stars by evading them, a respray, a bribe or a mission's wanted.clear()
// leaves it set. So one punch thrown at an officer in an old chase (or the heist's shootout) means every later
// one-star chase, minutes or hours on, opens fire on the player instead of arresting them.
//   node --test tests/review/wanted/fought-outlives-chase.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

const clearAround = (gtm, x, y, r) => { const C = gtm.life.crowd; for (const m of [...C.members]) if (Math.hypot(m.ped.x - x, m.ped.y - y) < r) C._drop(m); };
// an officer of the MPD put down at (x, y), facing the player (as tests/sim/wanted.test.mjs does)
const cop = (gtm, x, y, face) => { const P = gtm.life.police, ped = P._newCop(gtm.motor.get('peds', 'mpd'), x, y, 0); ped.mover.facing = Math.atan2(face.y - y, face.x - x); return P._addCop(ped, {}); };

// a one-star matter (a car stolen in front of an officer, say) with an officer 60 u off: what the police do in 6 s
async function oneStar(game, gtm) {
  const P = gtm.crew.ped, BUS = gtm.BUS, W = gtm.life.wanted, out = { shots: 0, busted: null };
  BUS.on('crime', e => { if (e.type === 'shooting' && e.lawful) out.shots++; }, 'world');
  BUS.on('busted', e => { out.busted = out.busted || e.how; }, 'world');
  cop(gtm, P.x + 60, P.y + 10, P); W.set(1);
  for (let t = 0; t < 6; t += .25) game.advance(.25);
  out.health = Math.round(P.vitals.health); out.dead = P.dead || gtm.snapshot().down === 'wrecked';
  return out;
}

test('a cop punched in an old chase, the stars since lost by evading them: the next one-star chase arrests again, it does not shoot', async () => {
  // the baseline: a fresh game, one star, an officer near: he cuffs the player, and no police round is fired
  { const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } }); game.advance(2);
    const P = gtm.crew.ped; clearAround(gtm, P.x, P.y, 600);
    const r = await oneStar(game, gtm);
    assert.equal(r.shots, 0, 'baseline: at 1 star the police hold their fire'); assert.equal(r.busted, 'cuffed', 'baseline: cuffed'); }
  // the same, after an old chase: the player punched an officer in front of him (copAssault: 2 stars), ran, and hid out
  // the evade time until the stars cleared
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } }); game.advance(2);
  const P = gtm.crew.ped, W = gtm.life.wanted, Pol = gtm.life.police, BUS = gtm.BUS;
  clearAround(gtm, P.x, P.y, 600);
  const c = cop(gtm, P.x + 60, P.y, P); game.advance(.5);
  gtm.combat.hurt(c.ped, { amount: 5, kind: 'melee', by: P.id }); BUS.emit('crime', { type: 'assault', x: c.ped.x, y: c.ped.y, by: P.id, victim: c.ped.id, severity: 1 });   // (what Combat.meleeHit emits for a punch)
  game.advance(1);
  assert.ok(W.log.some(l => l.type === 'copAssault'), 'the punch filed as an assault on an officer: ' + JSON.stringify(W.log));
  for (const k of Pol.cops) k.ped.mover.facing += Math.PI;   // (out of sight, far off: the stars clear after the evade time)
  const hide = gtm.city.poi('rats-hq'); P.place(hide.x, hide.y);
  let evaded = false; BUS.on('evaded', () => { evaded = true; }, 'world');
  for (let t = 0; t < 40 && W.stars; t += .5) game.advance(.5);
  assert.ok(evaded && W.stars === 0, 'the stars evaded');
  const flag = Pol.fought;
  // back on the street, later: a fresh one-star matter
  const sp = gtm.city.poi('greasy-spoke'); P.place(sp.x, sp.y); game.advance(1); clearAround(gtm, P.x, P.y, 600);
  const r = await oneStar(game, gtm);
  console.log(`after the evaded chase: Police.fought = ${flag}; at 1 star: ${r.shots} police rounds fired, busted: ${r.busted}, the player's health ${r.health}${r.dead ? ' (WRECKED)' : ''}`);
  assert.equal(r.shots, 0, `at 1 star the police try to arrest first: ${r.shots} rounds fired at the player (Police.fought still ${flag} from the evaded chase)`);
  assert.equal(r.busted, 'cuffed', 'and the player is cuffed, as in a fresh game');
  assert.equal(flag, false, 'the chase is over: the police no longer count the old punch (Police.fought)');
});
