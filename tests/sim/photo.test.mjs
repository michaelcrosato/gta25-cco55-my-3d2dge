// Photo mode (PLAN.md 8.22), headless: Create (B) freezes the world and frees the camera; the stick pans it (tethered to
// the player), the triggers zoom, R3 cycles the views; ○ puts the view, the camera and the controls back, the world's
// hash as it was when it froze. ✕ takes a photo that completes a photo objective, a point's or a tagged actor's; the
// phone's SNAP opens it too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

const hold = (game, code, secs) => { game.input.press(code); game.advance(secs); game.input.release(code); game.advance(1 / 120); };

test('photo mode: the world held still, the camera panned, zoomed and turned through the views, then all of it put back', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } });
  game.advance(1);
  const M = gtm.photo, B = gtm.bindings, view0 = gtm.views.active, p = gtm.crew.ped;
  holdCode(game, 'KeyB');
  assert.equal(M.active, true, 'Create (B) opens it'); assert.equal(B.context, 'photo', 'the photo controls');
  const h0 = JSON.stringify(game.stateHash()); game.advance(3);
  assert.equal(JSON.stringify(game.stateHash()), h0, 'nothing moves while it is open');
  const x0 = M.rig.x, y0 = M.rig.y; hold(game, 'KeyD', 1);
  assert.ok(Math.hypot(M.rig.x - x0, M.rig.y - y0) > 100, 'the stick pans the camera (' + Math.round(Math.hypot(M.rig.x - x0, M.rig.y - y0)) + ' u)');
  hold(game, 'KeyD', 6); assert.ok(Math.hypot(M.rig.x - p.x, M.rig.y - p.y) <= gtm.TUNE.photoReach + 1, 'tethered to the player');
  hold(game, 'KeyE', 1); assert.ok(M.rig.zoom > 1.2, 'R2 zooms in (' + M.rig.zoom.toFixed(2) + ')');
  holdCode(game, 'KeyV'); assert.notEqual(gtm.views.active, view0, 'R3 the next view');
  assert.equal(gtm.stage.rig.x, M.rig.x, 'the stage holds the camera on the rig');
  game.input.press('Escape'); game.advance(1 / 120); game.input.release('Escape');   // (one step: the one that closes it)
  assert.equal(M.active, false, '○ closes it'); assert.equal(gtm.views.active, view0, 'the view as it was');
  assert.equal(gtm.stage.rig, null, 'the camera let go'); assert.equal(B.context === 'photo', false, 'the controls back');
  assert.equal(JSON.stringify(game.stateHash()), h0, 'the world as it was when it froze');
  game.advance(1); assert.notEqual(JSON.stringify(game.stateHash()), h0, 'and it goes on');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('a photo taken in photo mode completes a photo objective: a point near the picture\'s middle, a tagged actor framed', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } });
  game.advance(1);
  const M = gtm.motor, C = gtm.career, P = gtm.crew.ped, spot = [P.x + 180, P.y]; let shots = 0;
  M.defMission('fx_photo', { title: 'Fixture: photo', stages: [{ id: 's', setup(m) { m.spawn.ped('office', [P.x - 150, P.y], { tag: 'subject' }); },
    *run(m) { yield m.photo(spot); shots++; yield m.photo('subject'); shots++; yield m.wait(600); } }] });
  C.startMission('fx_photo'); game.advance(.5);
  holdCode(game, 'KeyB'); const Ph = gtm.photo; assert.ok(Ph.active);
  holdCode(game, 'Space'); assert.equal(shots, 0, 'a photo of the street where it stands: not the spot');
  Ph.rig.x = spot[0] - 20; Ph.rig.y = spot[1]; holdCode(game, 'Space');
  holdCode(game, 'Escape'); game.advance(.2);
  assert.equal(shots, 1, 'the spot near the middle of the picture: done');
  holdCode(game, 'KeyB'); const s = C.R.actors.tagged('subject')[0]; Ph.rig.x = s.x + 30; Ph.rig.y = s.y; holdCode(game, 'Space'); holdCode(game, 'Escape'); game.advance(.2);
  assert.equal(shots, 2, 'the tagged one framed: done');
  assert.ok(Ph.shots >= 3);
});

test('the phone\'s SNAP opens photo mode', async () => {
  const { game, gtm } = await loadGame({ hash: '#play/greasy-spoke', query: { seed: '1999', time: 'day', weather: 'clear' } });
  game.advance(1);
  gtm.career.phone(); const it = gtm.career.card.items.find(q => q.label === 'SNAP');
  assert.ok(it && !it.disabled, 'SNAP on the phone'); it.act(); game.advance(.1);
  assert.equal(gtm.photo.active, true, 'photo mode');
  holdCode(game, 'Escape'); assert.equal(gtm.photo.active, false);
});
