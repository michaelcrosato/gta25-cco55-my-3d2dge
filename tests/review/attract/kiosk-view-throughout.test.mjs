// Review (kiosk, PLAN.md 8.20 "The menu button opens a small overlay: sound on/off, volume, view style, About"; D25
// "the view (the show's, or one throughout)"): the kiosk overlay's VIEW, set to one view, doesn't hold. attract.js keeps
// the choice in `viewStyle` and only its own host.view() (the director's camera plan) honours it, but the reels set the
// view themselves in their stages' setups: m.view('side7', ...) (Hot Pursuit's chase, Joyride's deck and jump, Heist
// Tease's Loop) calls game.setView directly (mission/runtime.js view()). So with VIEW: ISO the next reel still cuts
// to MODE 7.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

const STEP = 1 / 120;
test('the kiosk menu\'s VIEW set to ISO holds ISO throughout the show', async () => {
  const { game, gtm, snap } = await loadGame({ hash: 'attract/hot_pursuit', query: { kiosk: '1' } });
  game.advance(1);
  const tap = (x, y) => { gtm.ui.layer.tapAt(x, y); game.input.lastDevice = 'touch'; game.input.raw.activity = game.input.clock; game.advance(STEP * 2); };
  const b = gtm.kioskButton(); tap(b[0] + b[2] / 2, b[1] + b[3] / 2);
  assert.equal(snap().menu, 'kiosk', 'the MENU button opened the overlay');
  const view = gtm.ui.screens.top.list.items.find(i => i.key === 'view');
  view.set('iso');   // (the row's own setter: what a tap or ←/→ on it does)
  const chose = { choice: view.get(), view: snap().view };
  gtm.ui.screens.back(); game.advance(STEP);   // (BACK TO THE DEMO)
  const seen = new Map();   // view -> [first seen at, reel seed, stage]
  for (let i = 0; i < 160; i++) {
    game.advance(.5); const s = snap();
    if (!seen.has(s.view)) seen.set(s.view, `${(i / 2 + .5).toFixed(1)} s later, reel seed ${s.seed}... stage ${s.stage}`);
  }
  assert.deepEqual([...seen.keys()], ['iso'], `VIEW chosen: ${JSON.stringify(chose)}; views shown in the 80 s after: ${JSON.stringify(Object.fromEntries(seen))}; director log ${JSON.stringify(gtm.director.log)}`);
});
