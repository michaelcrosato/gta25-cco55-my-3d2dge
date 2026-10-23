// FAN-OUT B (missions and activities). MissionActors.release() (src/motor/mission/actors.js) deals with a mission
// car's people by the seats they sit in, not by whose they are, so at a job's end (a pass, QUIT THE JOB, JOB BLOWN's
// quit) it gets both ways wrong:
//   - the job's own riders out of the seats are never released. A crew made with m.spawn.vehicle (driver, passengers)
//     is kept only in its car's entry (e.crew) and found again through the car's seats: the driver of Holy Rollers'
//     Saint at the Fish Market (PLAN.md 9.4: "a carjack"), a Vigilante suspect jacked, the Police Chase's crooks,
//     thrown out by the carjack, stay in combat.bodies with owner 'mission' for the rest of the session: never
//     updated, never drawn, yet a body every shot and blast meets and a lock-on candidate (PLAN.md 8.15: no leftover
//     mission entities once a mission ends);
//   - anyone else riding with the player in a car of the job's is taken out of the combat world, whoever they are. In
//     the Big Withdrawal Viv rides beside Dex in the getaway car; when that car is one the job made (H1's stashed
//     Zephyr wrecked, so the retry makes a fresh one), QUIT THE JOB leaves Viv, a protagonist, outside combat.bodies
//     for good (left standing inside the car): no blast, round, swing or car touches her, even once she is played.
//   node --test tests/review/missions/release-mishandles-mission-car-riders.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('QUIT THE JOB in a getaway car the job made leaves the protagonist riding with you in the combat world', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/safehouse', query: { seed: '1', time: 'night', weather: 'clear' } });
  game.advance(1);
  const C = gtm.career, R = C.R, crew = gtm.crew, combat = gtm.combat;
  // H1's getaway car, kept in the save's garage as H1 leaves it
  const stash = gtm.fleet.spawn('zephyr', 700, 1580, 0, { owner: 'world' }); C.stash(stash, 'getaway');
  C.startMission('heist_big_withdrawal', { stage: 'getaway' });
  for (let i = 0; i < 40 && !R.objective; i++) game.advance(.25);
  assert.equal(crew.member('dex').ped.seat && crew.member('dex').ped.seat.vehicle, stash, 'the job adopts the stashed Zephyr');
  // the cops ram it to a wreck: JOB BLOWN, and RETRY THIS STAGE (the job makes a fresh getaway car)
  stash.damage.explode();
  for (let i = 0; i < 80 && !(R.state === 'failed' && C.card && C.card.id === 'blown'); i++) game.advance(.25);
  assert.equal(R.state, 'failed', 'the wreck blows the job');
  C.close(); R.retry();
  for (let i = 0; i < 40 && !R.objective; i++) game.advance(.25);
  const dex = crew.member('dex').ped, viv = crew.member('viv').ped, car = dex.seat && dex.seat.vehicle;
  assert.ok(car && car !== stash && car.owner === 'mission', 'the retry\'s getaway car is the job\'s own');
  assert.equal(viv.seat && viv.seat.vehicle, car, 'Viv rides beside Dex');
  assert.ok(combat.bodies.includes(viv), 'Viv is in the combat world while the job runs');
  // the pause menu's QUIT THE JOB
  R.quit('player'); game.advance(.5);
  const inWorld = combat.bodies.includes(viv), h0 = viv.vitals.health;
  combat.explosives.blast({ x: viv.x, y: viv.y, z: 6, damage: 80, splash: 56, by: null, source: 'blast' }); game.advance(1);
  const h1 = viv.vitals.health;
  crew.possess('viv'); game.advance(.5);   // (and played: still nothing touches her)
  combat.explosives.blast({ x: viv.x, y: viv.y, z: 6, damage: 80, splash: 56, by: null, source: 'blast' }); game.advance(1);
  assert.ok(inWorld && h1 < h0, `after QUIT THE JOB Viv is in combat.bodies: ${inWorld}; a blast on her: health ${h0} -> ${h1}; ` +
    `played, another blast: -> ${viv.vitals.health}; she was left standing ${Math.round(Math.hypot(viv.x - car.x, viv.y - car.y))} u from the car's middle`);
});

test('the driver the player carjacks out of Holy Rollers\' Saint goes when the job ends', async () => {
  const { game, gtm } = await loadGame({ hash: '#mission/saints_holy_rollers/saint', query: { seed: '1', time: 'day', weather: 'clear' } });
  game.advance(1);
  const C = gtm.career, R = C.R, M = gtm.motor, combat = gtm.combat, p = gtm.crew.ped;
  const saint = R.actors.tagged('saint')[0], docker = saint && saint.driver;
  assert.ok(docker && docker.owner === 'mission', 'the Saint at the Fish Market has the job\'s driver at its wheel');
  // the carjack, from the driver's door (a player's △ at the car)
  const [x, y] = saint.toWorld(0, -saint.hw - 10); p.place(x, y, 0); game.advance(.1);
  p.board(M.boardingFor(p, saint, 0));
  for (let i = 0; i < 40 && saint.driver !== p; i++) game.advance(.25);
  assert.equal(saint.driver, p, 'the player jacked the Saint');
  game.advance(2);
  // QUIT THE JOB (the pause menu's): what the job made goes
  R.quit('player'); game.advance(.5);
  const at = [docker.x, docker.y]; game.advance(5);
  const left = combat.bodies.filter(b => b.owner === 'mission'), aimable = left.filter(b => b.aimable && !b.dead);   // (the play scene's lock-on candidates: aimCtx)
  assert.deepEqual(Array.from(left, b => b.archetype), [],
    `after the job: ${left.length} body of the job's still in combat.bodies (${left.map(b => b.archetype)}), ${aimable.length} of them a lock-on candidate; ` +
    `the thrown driver moved ${Math.hypot(docker.x - at[0], docker.y - at[1]).toFixed(1)} u in 5 s; the job's actor count says ${C.debug().actors}`);
});
