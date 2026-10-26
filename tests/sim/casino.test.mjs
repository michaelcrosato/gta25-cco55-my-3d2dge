// The Velvet Casino (EXPANSION.md 2.3, 7, X6): it validates, its front doors are the city's casino-door and its fire
// escape's the casino-back; the floor is the public's (nobody minds a guest there), the staff's rooms past it aren't
// (but for a staff pass); △ at the vault's door and at the take is told on the BUS (House Edge's crack and bag), and the
// vault, sealed till then, opens when a job cracks it: the guards find their way in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

const T = 16;
async function casino(query = {}) {
  const g = await loadGame({ hash: '#interior/velvet-casino', query: { seed: '1', time: 'night', weather: 'clear', dev: '1', district: 'glass-heights', ...query } }); g.game.advance(.3);
  const R = g.gtm.interior().run, P = g.gtm.crew.ped;
  const at = (cx, cy, facing = 0) => { P.place((cx + .5) * T, (cy + .5) * T, 0); P.mover.facing = facing; P.mover.vx = P.mover.vy = 0; };
  return { ...g, R, P, at };
}

test('the Velvet Casino validates; its doors are Glass Heights\' casino-door and casino-back; the vault sealed from both', async () => {
  const { gtm } = await loadGame(), M = gtm.motor, C = M.buildInterior('velvet-casino'), v = M.validateInterior(C);
  assert.deepEqual([...v.errors], []);
  for (const room of ['the floor', 'the entrance hall', 'the staff corridor', 'the cage', 'the roof']) assert.ok(v.reach.front.includes(room), room + ': ' + v.reach.front);
  assert.ok(!v.reach.front.includes('the vault') && !v.reach.roof.includes('the vault'), 'the vault: no way in but its door');
  const city = M.buildCity('glass-heights', 2027);
  for (const id of ['casino-door', 'casino-back']) { const p = city.poi(id); assert.ok(p && p.kind === 'door' && p.interior === 'velvet-casino', id); }
  const G = M.get('interiors', 'velvet-casino').guards; assert.ok(G.length === 3 && G.every(g => g.weapons.includes('snub38')), 'the house\'s hoods: a snub each');
});

test('the Velvet Casino: on the floor nobody minds a guest; past it a hood does; on a staff pass, nobody', async () => {
  const { game, R, at } = await casino();
  at(19, 16, -Math.PI / 2);   // (the floor's middle, among the tables)
  for (let t = 0; t < 10; t += .1) game.advance(.1);
  assert.equal(R.alarm, null, 'a guest on the floor');
  assert.ok(R.guards.every(g => g.mind.state === 'calm'), 'nobody minds: ' + R.guards.map(g => g.mind.state));
  R.pass(true); at(25, 7.5, Math.PI);   // (the staff corridor, its hood's round: on the pass)
  for (let t = 0; t < 12; t += .1) game.advance(.1);
  assert.equal(R.alarm, null, 'staff go where they like');
  R.pass(false);
  let t = 0; for (; t < 20 && !R.alarm && R.guards.every(g => g.mind.state === 'calm'); t += .1) game.advance(.1);
  assert.ok(R.alarm || R.guards.some(g => g.mind.state !== 'calm'), 'off the pass, the corridor\'s hood minds: in ' + t.toFixed(1) + ' s');
});

test('the Velvet Casino: △ at the vault\'s door and at the take is told on the BUS; cracked open, the vault lets the guards in', async () => {
  const { game, gtm, R, at } = await casino(), seen = [];
  gtm.BUS.on('spot', e => seen.push(e.spot), 'test');
  R.pass(true);
  at(11, 4, 0); game.advance(.2); holdCode(game, 'KeyE'); game.advance(.3);
  assert.deepEqual(seen, ['vault'], 'the vault\'s door');
  const take = [18.5 * T, 2.5 * T], g = R.guards[2], cell = (x, y) => Math.floor(y / T) * R.map.w + Math.floor(x / T);
  g.flow.update(take[0], take[1]); assert.ok(g.flow.d[cell(g.ped.x, g.ped.y)] >= 1e9, 'sealed: no way to the take');
  R.open('vault-door');
  g.flow.update(take[0], take[1]); assert.ok(g.flow.d[cell(g.ped.x, g.ped.y)] < 1e9, 'open: the cage\'s hood can walk in');
  at(18, 2, -Math.PI / 2); game.advance(.4); holdCode(game, 'KeyE'); game.advance(.3);
  assert.deepEqual(seen, ['vault', 'take'], 'the take');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
