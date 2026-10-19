// The First Lowtown Bank (PLAN.md 8.21): stealth (seen, heard, a camera's alarm, a takedown), the doors in and out with
// the city held still, and the three views inside leaving the sim hash alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

const T = 16, CITY = 24;   // (a cell; the city's part of the play scene's hash: the crew, the clock, the weather, the bridge, combat, fleet, life)
async function bank(query = {}) {
  const g = await loadGame({ hash: '#interior/bank', query }); g.game.advance(.3);
  const R = g.gtm.interior().run, P = g.gtm.crew.ped;
  const at = (cx, cy, facing = 0) => { P.place((cx + .5) * T, (cy + .5) * T, 0); P.mover.facing = facing; P.mover.vx = P.mover.vy = 0; };
  return { ...g, R, P, at };
}
const until = (game, cond, secs, dt = .1) => { for (let t = 0; t < secs; t += dt) { if (cond()) return t; game.advance(dt); } return cond() ? secs : -1; };

test('the bank validates, and its doors reach what the heist needs: the front door the lobby and the offices, never the vault; the sewer the vault', async () => {
  const { gtm } = await loadGame(), M = gtm.motor, C = M.buildInterior('bank'), v = M.validateInterior(C);
  assert.deepEqual([...v.errors], []);   // (spread: arrays from the game's own realm)
  assert.deepEqual([...v.reach.front], ['the lobby', 'the tellers', 'the staff corridor', 'the records office']);
  assert.ok(v.reach.sewer.includes('the vault') && v.reach.sewer.includes('the sewer') && !v.reach.sewer.includes('the lobby'), 'the sewer: ' + v.reach.sewer);
  for (const d of C.spec.doors) { const p = gtm.motor.buildCity('lowtown', 1999).poi(d.from); assert.ok(p && p.kind === 'door' && p.interior === 'bank', 'the city\'s door ' + d.from); }
});

test('the bank: #interior/bank starts inside at the front door, the gun put away', async () => {
  const { snap, R, P } = await bank();
  const s = snap();
  assert.equal(s.interior, 'bank'); assert.equal(s.door, 'front', 'the prompt at the door: LEAVE');
  assert.equal(P.inv.current, 'fists', 'in through a door, the gun is put away');
  assert.equal(R.guards.length, 3); assert.equal(R.cameras.length, 4);
  assert.ok(R.guards.every(g => g.mind.state === 'calm'), 'nobody minds a customer in the lobby');
});

test('the bank: seen past the counter, a guard notices, searches, then raises the alarm and the stars', async () => {
  const { game, snap, R, at } = await bank();
  const g = R.guards[2]; at(Math.floor(g.ped.x / T) + 6, Math.floor(g.ped.y / T), Math.PI);   // (in the staff corridor, ahead of the guard walking it)
  const states = new Set(); until(game, () => { states.add(g.mind.state); return !!R.alarm; }, 6);
  assert.ok(R.alarm, 'the alarm'); assert.equal(R.alarm.by, 'guard');
  assert.ok(states.has('notice') && states.has('search'), 'it noticed and searched first: ' + [...states]);
  assert.ok(snap().stars >= 1, 'the police told: ' + snap().stars + ' stars');
  assert.ok(R.guards.every(q => q.mind.state === 'alert'), 'every guard alerted');
});

test('the bank: a shot in the records office is heard through the walls, and the guards come to look', async () => {
  const { game, R, P, at } = await bank();
  at(31, 5); game.advance(.1);
  assert.ok(R.guards.every(g => !g.sees), 'out of every guard\'s sight');
  P.inv.select(P.inv.list().find(id => id !== 'fists'));
  holdCode(game, 'Mouse0', 1 / 20); game.advance(.2);
  const heard = R.guards.filter(g => g.mind.state !== 'calm' && g.probe);
  assert.ok(heard.length >= 2, 'heard by ' + heard.length + ': ' + R.guards.map(g => g.mind.state));
  const d0 = heard.map(g => Math.hypot(g.ped.x - P.x, g.ped.y - P.y));
  game.advance(2);
  const d1 = heard.map(g => Math.hypot(g.ped.x - P.x, g.ped.y - P.y));
  assert.ok(d1.every((d, i) => d < d0[i] - 20), `they come: ${d0.map(Math.round)} -> ${d1.map(Math.round)} u`);
});

test('the bank: a CCTV camera that sees you in the vault raises the alarm by itself', async () => {
  const { game, snap, R, at } = await bank();
  at(19, 4, Math.PI / 2);   // (in the vault, before its camera: no guard in there)
  const t = until(game, () => !!R.alarm, 12);
  assert.ok(t >= 0, 'the alarm within 12 s'); assert.equal(R.alarm.by, 'camera');
  assert.ok(snap().stars >= 1, 'the stars');
  assert.ok(R.guards.every(g => g.mind.state === 'alert'), 'the guards alerted to it');
});

test('the bank: a takedown from behind drops a guard quietly, and it stays down', async () => {
  const { game, snap, R, P } = await bank();
  game.advance(2);
  const g = R.guards[0], f = g.ped.mover.facing; P.place(g.ped.x - Math.cos(f) * 12, g.ped.y - Math.sin(f) * 12, 0); P.mover.facing = f;
  game.advance(1 / 120);
  assert.equal(R.takedownFor(P), g, 'offered from behind');
  holdCode(game, 'Mouse0', 1 / 30);
  assert.equal(P.mover.action && P.mover.action.name, 'takedown', 'the paired action plays');
  game.advance(6);
  assert.ok(g.down && g.ped.floored, 'down'); assert.equal(R.downs, 1);
  assert.equal(R.alarm, null, 'quietly: no alarm'); assert.ok(R.guards.every(q => q.mind.state === 'calm'));
  assert.equal(snap().stars, 0);
  P.place(g.ped.x + Math.cos(g.ped.mover.facing) * 30, g.ped.y + Math.sin(g.ped.mover.facing) * 30, 0); game.advance(1 / 120);
  assert.equal(R.takedownFor(P), null, 'not from in front, and never twice');
});

test('the bank: in by the door and out again keeps the city\'s hash, as if it had stood still (a twin that never went in agrees)', async () => {
  const run = async enter => {
    const { game, gtm, snap } = await loadGame({ hash: '#play/bank-door' }); game.advance(2);
    const at = {}; gtm.BUS.on('interior', e => { at[e.enter ? 'in' : 'out'] = { t: game.time, h: game.stateHash().slice(0, CITY), clock: gtm.clock.hour }; }, 'scene');
    const t0 = game.time, h0 = snap().hero;
    if (enter) {
      assert.equal(snap().door, 'bank-door', 'the prompt at the bank\'s door');
      holdCode(game, 'KeyE', 1 / 30); game.advance(.8);
      assert.equal(snap().interior, 'bank'); assert.equal(snap().door, 'front');
      holdCode(game, 'KeyW', .8); game.advance(3);   // (a walk in the lobby; the city's clock stands meanwhile)
      holdCode(game, 'KeyS', .8); game.advance(.5);
      assert.equal(snap().door, 'front', 'back at the door');
      holdCode(game, 'KeyE', 1 / 30); game.advance(.8);
      assert.equal(snap().interior, null);
      assert.deepEqual(snap().hero, h0, 'back where it went in');
      assert.deepEqual(at.out.h, at.in.h, 'the city the same coming out as going in');
      assert.equal(at.out.clock, at.in.clock, 'the clock stood');
    }
    return { game, cityT: game.time - t0 - (at.out ? at.out.t - at.in.t : 0) };
  };
  const A = await run(true), B = await run(false);
  B.game.advance(A.cityT);
  assert.deepEqual([...A.game.stateHash()], [...B.game.stateHash()]);
});

test('the bank: out by the sewer comes up at the grate round the side', async () => {
  const { game, gtm, snap, at } = await bank();
  at(2, 27); game.advance(.1);
  assert.equal(snap().door, 'sewer');
  holdCode(game, 'KeyE', 1 / 30); game.advance(.8);
  const g = gtm.city.poi('bank-sewer'), h = snap().hero;
  assert.equal(snap().interior, null);
  assert.ok(Math.hypot(h[0] - g.x, h[1] - g.y) < 2, `at the grate: ${h} (${g.x}, ${g.y})`);
});

test('the bank: switching views mid-run and turning the camera inside leave the sim hash unchanged (a scripted walk past the counter, the alarm, the guards\' fire)', async () => {
  const seen = new Set(), run = async switches => {
    const { game, gtm } = await bank();
    const I = gtm.motor.makeIntent(); gtm.human.update = () => I;   // (a scripted Intent in world space: the views never steer it)
    const legs = [[0, -1, 2.75], [1, 0, 1.5], [0, -1, 1], [-1, 0, 2]];   // (north through the lobby and the counter's gate, east behind it, into the staff corridor)
    let t = 0;
    for (const [dx, dy, secs] of legs) for (let s = 0; s < secs; s += .25, t += .25) {
      gtm.motor.clearIntent(I); I.move[0] = dx; I.move[1] = dy;
      if (switches && Math.round(t * 4) % 8 === 4) seen.add(gtm.views.next());
      if (switches && Math.round(t * 4) % 12 === 6) gtm.stage.turn(1);
      game.advance(.25);
    }
    game.advance(3);
    return { h: [...game.stateHash()], alarm: gtm.interior() && gtm.interior().run.alarm };
  };
  const a = await run(true), b = await run(false);
  assert.ok(b.alarm, 'the walk was seen: the alarm went up');
  assert.deepEqual(a.h, b.h);
  assert.deepEqual([...seen].sort(), ['iso', 'side7', 'top'], 'every view was switched to');
});
