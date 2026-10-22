// The gang recipe (docs/CONTENT-GUIDE.md, "A gang"): the Brickyard's own gang, its two archetypes and its HQ, in one
// new file (fixtures/gang.js). It holds its turf, its respect starts at 0, its members hang out at its HQ, and once
// it is hostile they go for the player on sight there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRecipe, specWarnings } from './kit.mjs';

test('a gang from one new file: its turf, its respect, members at its HQ; hostile, they go for the player', async () => {
  const g = await withRecipe('gang', 'gangs/riveters.js', { hash: '#play/riveters-hq', query: { seed: '1', time: 'day', weather: 'clear' } });
  const { game, gtm } = g, ids = ['riveters', 'riveter-grunt', 'riveter-enforcer', 'riveters-hall'];
  assert.equal(specWarnings(g, ids).length, 0, specWarnings(g, ids).join('; '));
  const G = gtm.life.gangs, p = gtm.crew.ped, hq = gtm.city.poi('riveters-hq');
  assert.ok(hq, 'its HQ\'s door'); assert.equal(G.turfAt(p.x, p.y), 'riveters', 'the Brickyard is its turf');
  assert.equal(G.get('riveters'), 0); assert.equal(G.stance('riveters'), 'neutral');
  game.advance(8);
  const members = () => gtm.life.crowd.members.filter(m => m.ped.gang === 'riveters');
  assert.ok(members().some(m => Math.hypot(m.ped.x - hq.x, m.ped.y - hq.y) < 160), 'members hang out at the HQ: ' + members().length);
  G.add('riveters', -50, 'test'); assert.equal(G.stance('riveters'), 'hostile');
  const m = members().find(q => Math.hypot(q.ped.x - hq.x, q.ped.y - hq.y) < 160), f = m.ped.mover.facing;
  p.place(m.ped.x + Math.cos(f) * 50, m.ped.y + Math.sin(f) * 50); game.advance(3);   // (walked up in front of one of them)
  assert.ok(G.fighters.some(f => f.gang === 'riveters' && f.target === p), 'hostile: they go for the player');
});
