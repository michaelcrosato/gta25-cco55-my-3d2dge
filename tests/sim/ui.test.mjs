// The 10-foot screens in play (PLAN.md 8.18), headless: our own pause holds the simulation still and comes back on ○,
// the map button opens it on the MAP, the engine's auto-pause is routed into it, the phone's five apps, and the settings
// the player chooses reaching play: hold or toggle, difficulty, the default view, autosave.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../harness.mjs';

const top = gtm => (gtm.ui.screens.top ? gtm.ui.screens.top.id : null);

test('Esc pauses: the pause\'s tabs over a world that stands still, the hash kept; Esc again resumes', async () => {
  const { game, gtm } = await loadGame({ hash: 'play' });
  game.advance(.5);
  holdCode(game, 'Escape'); assert.equal(top(gtm), 'pause'); assert.equal(gtm.ui.screens.top.tab, 'map', 'the MAP first');
  const h0 = JSON.stringify(game.stateHash()); game.advance(2);
  assert.equal(JSON.stringify(game.stateHash()), h0, 'nothing moved under the pause');
  holdCode(game, 'KeyE'); assert.equal(gtm.ui.screens.top.tab, 'brief', 'E (R1) to the next tab');
  holdCode(game, 'Escape'); assert.equal(top(gtm), null, 'Esc (○) resumes');
  game.advance(1); assert.notEqual(JSON.stringify(game.stateHash()), h0, 'and the world goes on');
  assert.equal(game.paused, false, 'the engine\'s own pause never held the game');
  assert.equal((game.errors || []).length, 0, JSON.stringify(game.errors));
});

test('M (the touchpad) opens the pause on its MAP; the engine\'s auto-pause comes to the same screen', async () => {
  const { game, gtm } = await loadGame({ hash: 'play' });
  game.advance(.3);
  holdCode(game, 'KeyM'); assert.equal(top(gtm), 'pause'); assert.equal(gtm.ui.screens.top.tab, 'map');
  holdCode(game, 'Escape'); assert.equal(top(gtm), null);
  // (the page hidden, the window left, a controller unplugged: the engine pauses; the next frame hands it over)
  game.pause('focus'); assert.ok(game.paused);
  gtm.motor.uiFrame({ ui: gtm.ui, game, bindings: gtm.bindings }, game.scene);
  assert.equal(game.paused, false, 'the engine let go'); assert.equal(top(gtm), 'pause', 'our pause took it');
});

test('the phone (T): CONTACTS, TEXTS, JOBS, SNAP, SETTINGS; ○ hangs up', async () => {
  const { game, gtm } = await loadGame({ hash: 'play' });
  game.advance(.3);
  holdCode(game, 'KeyT'); assert.equal(top(gtm), 'phone');
  assert.deepEqual([...gtm.career.card.items].map(i => i.label), ['CONTACTS', 'TEXTS', 'JOBS', 'SNAP', 'SETTINGS']);   // (a local array: the game's lives in its own realm)
  holdCode(game, 'Enter'); assert.equal(gtm.career.card.id, 'contacts'); assert.equal(gtm.career.card.items[0].label, 'LOWTOWN CABS');
  holdCode(game, 'Escape'); assert.equal(gtm.career.card.id, 'phone', 'back to the phone');
  holdCode(game, 'Escape'); assert.equal(top(gtm), null); assert.equal(gtm.career.card, null);
});

test('ACCESS: sprint toggled latches on a press and off on the next; crouch held lasts as long as the button', async () => {
  const { game, gtm } = await loadGame({ hash: 'play' });
  game.advance(.3);
  const S = game.settings, I = () => gtm.human.intent, p = () => gtm.crew.ped;
  S.set('holdSprint', 'toggle');
  holdCode(game, 'ShiftLeft'); game.advance(.2); assert.equal(I().down.sprint, true, 'latched after the press');
  holdCode(game, 'ShiftLeft'); game.advance(.2); assert.equal(I().down.sprint, false, 'and off again');
  S.set('holdCrouch', 'hold');
  game.input.press('KeyC'); game.advance(.3); assert.equal(p().crouching, true, 'down while held');
  game.input.release('KeyC'); game.advance(.3); assert.equal(p().crouching, false, 'up when let go');
  S.set('holdCrouch', 'toggle');
  holdCode(game, 'KeyC'); game.advance(.2); assert.equal(p().crouching, true, 'the default: a press toggles it');
});

test('GAME: difficulty scales the damage the crew takes; the default view is the one play starts in; autosave can be off', async () => {
  const { game, gtm } = await loadGame({ hash: 'play' });
  game.advance(.3);
  game.settings.set('difficulty', 'hard'); game.advance(.1);
  assert.equal(gtm.crew.ped.vitals.damageTaken, 1.35);
  game.settings.set('difficulty', 'easy'); game.advance(.1); assert.equal(gtm.crew.ped.vitals.damageTaken, .7);
  const g2 = await loadGame({ hash: 'title' }); g2.game.settings.set('defaultView', 'top'); g2.game.advance(.3);
  holdCode(g2.game, 'Enter'); g2.game.advance(.5); assert.equal(g2.snap().scene, 'play'); assert.equal(g2.gtm.views.active, 'top', 'NEW GAME starts in the default view');
  // autosave off: a mission passed writes nothing
  const C = gtm.career, wrote = []; C.write = slot => { wrote.push(slot); return { ok: true }; };
  game.settings.set('autosave', false); C._ended({ passed: true, kind: 'mission', id: 'x' }); assert.deepEqual(wrote, []);
  game.settings.set('autosave', true); C._ended({ passed: true, kind: 'mission', id: 'x' }); assert.deepEqual(wrote, ['auto']);
});
