// FAN-OUT B (10-foot UI): EXTRAS -> PROVING GROUND was a one-way door.
// PLAN.md 8.18 puts the Proving Ground in the title's EXTRAS, and every screen must work by pad, by keyboard and by
// mouse. The title's EXTRAS -> PROVING GROUND did game.go('proving') (src/game/scenes/title.js), landing on the 'scale'
// spike, and the proving scene (src/game/scenes/proving.js) had no menu, no openPause and no back(): Options or Esc only
// toggled the engine's own pause. No button on the pad and no key led back to the title: the player who picked it from
// the menu had to reload the page.
// The fix (D29): EXTRAS opens the Proving Ground's menu (PLAN.md 8.23's eight zones); over a zone, Options, Esc, P or a
// browser back opens it again with RESUME and BACK TO TITLE, the zone standing still under it.
//   node --test tests/review/ui/proving-ground-no-way-back.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../../harness.mjs';
import { pad } from '../../fixtures/pads.mjs';

const CROSS = 0, OPTIONS = 9, DOWN = 13;

test('the Proving Ground, entered from the title by pad, can be left by pad, by keyboard and by a browser back', async () => {
  const pads = [pad(0)];
  const { game, gtm, snap } = await loadGame({ hash: 'title', pads });
  game.advance(.5);
  const U = gtm.ui.screens, press = (b, secs = 1 / 20) => { pads[0] = pad(0, { pressed: [b] }); game.advance(secs); pads[0] = pad(0); game.advance(1 / 15); };
  const focused = () => (U.top && U.top.list ? U.top.list.current && U.top.list.current.label : null);
  const to = (label, step) => { for (let i = 0; i < 16 && focused() !== label; i++) step(); return focused(); };
  // in: EXTRAS, PROVING GROUND (the zone list), the first zone
  assert.equal(to('EXTRAS', () => press(DOWN)), 'EXTRAS');
  press(CROSS); assert.equal(U.top.id, 'extras');
  assert.equal(snap().item, 'PROVING GROUND'); press(CROSS);
  assert.equal(U.top && U.top.id, 'proving', 'EXTRAS > PROVING GROUND: the zone list');
  assert.deepEqual(Array.from(U.top.list.items, q => q.label), ['HANDLING GROUND', 'TRAFFIC AND CROWD LAB', 'COMBAT RANGE', 'WANTED SANDBOX', 'VIEW LAB', 'UI GALLERY AND JUKEBOX', 'MISSION BENCH', 'STRESS PAD'], 'PLAN.md 8.23\'s eight zones');
  press(CROSS); game.advance(1);
  assert.deepEqual([snap().scene, snap().zone], ['proving', 'handling'], 'in the handling ground');
  // by pad: Options, down to BACK TO TITLE, ✕
  press(OPTIONS); assert.equal(U.top && U.top.id, 'proving', 'Options: the Proving Ground\'s menu over the zone');
  assert.equal(focused(), 'RESUME');
  assert.equal(to('BACK TO TITLE', () => press(DOWN)), 'BACK TO TITLE');
  press(CROSS); game.advance(1);
  assert.equal(snap().scene, 'title', 'BACK TO TITLE by pad');
  // by keyboard: in again (the menu's keys), Esc over the zone, ArrowDown to BACK TO TITLE, Enter
  game.go('proving', { route: ['proving', 'range'] }); game.advance(1);
  holdCode(game, 'Escape'); assert.equal(U.top && U.top.id, 'proving', 'Esc: the menu');
  holdCode(game, 'Escape'); assert.equal(U.top, null, 'Esc again: resumed');
  holdCode(game, 'KeyP'); assert.equal(U.top && U.top.id, 'proving', 'P: the menu');
  assert.equal(to('BACK TO TITLE', () => holdCode(game, 'ArrowDown')), 'BACK TO TITLE');
  holdCode(game, 'Enter'); game.advance(1);
  assert.equal(snap().scene, 'title', 'BACK TO TITLE by keyboard');
  // a browser back over a zone: the menu (whose last row is the way out)
  game.go('proving', { route: ['proving', 'views'] }); game.advance(1);
  assert.ok(game.back(), 'the scene takes the back'); game.advance(.1);
  assert.equal(U.top && U.top.id, 'proving', 'a browser back: the menu');
});
