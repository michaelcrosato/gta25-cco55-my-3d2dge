// FAN-OUT B (10-foot UI): REBIND accepts a button the game already uses, so one press does two things, or none.
// D23: "a button another action of the context holds is refused and said". Bindings.rebind's conflict check
// (src/motor/input/bindings.js) compares whole codes only (list.includes(code)), and the rebind screen
// (src/motor/ui/menus.js) adds nothing to it:
//   - R3 is held by CHANGE VIEW as 'Pad11^' (its release), TURN LEFT/RIGHT as 'Pad11>RSLeft/Right' and ABILITY as a
//     chord half ('Pad10+Pad11'): none is the plain 'Pad11', so GET IN / USE (or CROUCH, RELOAD...) moves onto R3
//     with "CHANGED", and every press of R3 then also changes the view;
//   - P is the engine's own pause key (MENU_KEYS.pause; play opens our pause on game.input.pressed('pause')): no
//     MOTOR action holds it, so GET IN / USE moves onto P, and P then opens the pause instead: the action is dead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, holdCode } from '../../harness.mjs';
import { pad } from '../../fixtures/pads.mjs';

const atACar = (game, gtm) => {
  const F = gtm.fleet, p = gtm.crew.ped, v = F.near(p.x, p.y, 3000).find(q => q.cls === 'car');
  const [x, y] = v.toWorld(0, -v.hw - 14); gtm.teleport(x, y); game.advance(1);
  return p;
};

test('REBIND ON FOOT on a DualSense: GET IN / USE onto R3 is refused (R3 changes the view)', async () => {
  const pads = [pad(0)];
  const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0' }, pads });
  game.advance(.5);
  const press = (b, secs = 1 / 20) => { pads[0] = pad(0, { pressed: [b] }); game.advance(secs); pads[0] = pad(0); game.advance(1 / 15); };
  const U = gtm.ui.screens, scr = gtm.motor.rebindScreen({ ui: gtm.ui, game, bindings: gtm.bindings }, 'onFoot');
  press(9); U.open(scr);   // (Options: the pad is the device in use; then SETTINGS, CONTROLS, REBIND ON FOOT)
  scr.list.sel = scr.list.items.findIndex(r => r.action === 'interact');
  press(0); assert.ok(scr.capturing, 'set-up: waiting for the button');
  press(11);   // R3
  const now = [...gtm.bindings.codes('interact', 'onFoot')], view = [...gtm.bindings.codes('view', 'onFoot')];
  U.closeAll(); game.advance(.2);
  // and in play: R3 at a parked car
  const p = atACar(game, gtm), views = [];
  gtm.BUS.on('view', e => views.push(`${e.prev} -> ${e.view}`), 'global');
  pads[0] = pad(0, { pressed: [11] }); game.advance(.2); pads[0] = pad(0); game.advance(1.2);
  const did = [p.seat || p.boarding ? 'got in' : null, views.length ? `changed the view (${views.join(', ')})` : null].filter(Boolean);
  assert.ok(!now.includes('Pad11'), `R3 was accepted for GET IN / USE (now ${JSON.stringify(now)}; CHANGE VIEW holds ${JSON.stringify(view)}): one press of R3 ${did.join(' and ')}`);
});

test('REBIND ON FOOT on the keyboard: GET IN / USE onto P is refused (P pauses)', async () => {
  const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0' } });
  game.advance(.3);
  const U = gtm.ui.screens, scr = gtm.motor.rebindScreen({ ui: gtm.ui, game, bindings: gtm.bindings }, 'onFoot');
  holdCode(game, 'Escape'); U.open(scr);
  scr.list.sel = scr.list.items.findIndex(r => r.action === 'interact');
  holdCode(game, 'Enter'); game.advance(1 / 60); assert.ok(scr.capturing, 'set-up: waiting for the key');
  holdCode(game, 'KeyP'); game.advance(1 / 60);
  const now = [...gtm.bindings.codes('interact', 'onFoot')];
  U.closeAll(); game.advance(.2);
  const p = atACar(game, gtm);
  holdCode(game, 'KeyP', 1 / 30); game.advance(1.5);
  const top = U.top ? U.top.id : null;
  assert.ok(!now.includes('KeyP'), `P was accepted for GET IN / USE (now ${JSON.stringify(now)}); pressing P at a car opened the '${top}' screen and the player ${p.seat || p.boarding ? 'got in' : 'did not get in'}`);
});
