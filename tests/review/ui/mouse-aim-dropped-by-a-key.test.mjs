// FAN-OUT B (10-foot UI): keyboard and mouse, the mouse stops aiming as soon as a key is pressed.
// PLAN.md 11: on the keyboard and mouse, WASD moves and the mouse aims (a ground cursor), right mouse holds the lock-on
// aim, left mouse fires. HumanController.update (src/motor/input/human.js) takes the mouse's ground point only while
// game.input.lastDevice === 'mouse', but the engine sets lastDevice on every press (a key makes it 'keyboard') and a
// mouse move never sets it back (it sets aimSource = 'mouse', the engine's own "what aims right now"). So a strafe
// with WASD while aiming with the mouse drops the mouse aim: the intent's aim goes null and the body keeps facing
// where it last pointed, whatever the mouse does, until the next click.
// (Headless there is no pointer: views.mouseGround, the screen-to-ground pick the browser does, is stood in for.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../../harness.mjs';

test('the mouse keeps aiming while the player strafes with WASD', async () => {
  const { game, gtm } = await loadGame({ hash: 'play', query: { time: 'day', traffic: '0' } });
  game.advance(.5);
  const I = game.input, p = gtm.crew.ped;
  p.inv.give('snub38', 48, true); p.inv.select('snub38'); game.advance(.3);
  let at = [0, -100];   // (the pointer's ground point, relative to the player: north first)
  I.mouse.active = true; I.aimSource = 'mouse'; gtm.views.mouseGround = () => [p.x + at[0], p.y + at[1], 0];
  const fmt = a => (a ? `[${a.map(v => v.toFixed(2)).join(', ')}]` : 'null');
  I.press('Mouse2'); game.advance(.2);   // right mouse: aim
  { const a = gtm.human.intent.aim; assert.ok(a && a[1] < -.9, 'set-up: the mouse aims north: ' + fmt(a)); }
  I.press('KeyD'); game.advance(.15); I.release('KeyD'); game.advance(.05);   // a strafe step to the right, still holding right mouse
  at = [100, 0]; game.advance(.3);   // the mouse swings east
  const aim = gtm.human.intent.aim, dir = p.aimer.dir;
  assert.ok(aim && aim[0] > .9, `after one tap of D the mouse no longer aims: the pointer is east of the player, intent.aim = ${fmt(aim)}, the body aims ${fmt(dir)} (lastDevice '${I.lastDevice}', aimSource '${I.aimSource}')`);
});
