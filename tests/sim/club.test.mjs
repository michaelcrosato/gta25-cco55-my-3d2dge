// Club Chrome (HANDOFF L4): in through its doors on the plaza, the dancers on the floor, and its arcade cabinet in the
// VIP lounge: E by it opens the cabinet (the controls become the arcade's), ✕ puts a coin in, E steps away.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

test('Club Chrome: its doors, its dancers, its cabinet opened, a coin in, and stepped away from', async () => {
  const { game, gtm } = await loadGame({ hash: 'play', query: { seed: '1', time: 'night', weather: 'clear', traffic: '0' } });
  game.advance(.3);
  const p = gtm.crew.ped, door = gtm.city.poi('club-chrome-door');
  assert.ok(door && door.interior === 'club-chrome', 'the club\'s door on the plaza');
  gtm.teleport(door.x, door.y); game.advance(.5);
  holdCode(game, 'KeyE'); game.advance(1);   // (a card may stand in the way: the cabinet's high score starts here)
  if (gtm.career.card) { gtm.career.close(); game.advance(.2); holdCode(game, 'KeyE'); game.advance(1); }
  const snap = game.debug.snapshot(); assert.equal(snap.interior, 'club-chrome', 'inside Club Chrome: ' + snap.interior);
  p.place((37 + .5) * 16, (5 + .5) * 16, 0); game.advance(.3);
  holdCode(game, 'KeyE'); game.advance(.2);
  assert.equal(gtm.context(), 'arcade', 'at the cabinet: the arcade\'s controls');
  holdCode(game, 'KeyZ', .1); game.advance(1);
  holdCode(game, 'KeyE'); game.advance(.2);
  assert.equal(gtm.context(), 'onFoot', 'stepped away');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});
